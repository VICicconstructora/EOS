import os
import sys
import asyncio
import tempfile
from datetime import datetime, timezone

import httpx
import tiktoken
from dotenv import load_dotenv
from azure.identity.aio import ClientSecretCredential
from supabase import create_client, Client
from markitdown import MarkItDown
from openai import AzureOpenAI

# En Windows la consola/redirección usa cp1252 y revienta al imprimir nombres
# de archivo con tildes (UnicodeEncodeError -> mata toda la corrida). Forzamos
# UTF-8 en la salida para que un nombre acentuado nunca tumbe el scraper.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# .env centralizado en la raíz del repo. override=False (default) para que las
# variables que inyecta el .cmd del cron inverso (SCRAPE_REVERSE, SHAREPOINT_SITES)
# no sean pisadas por el archivo.
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Registro Azure propio del scraper ('Claude-SharePoint-Actas'), distinto al de
# app/datamart. Por eso va con prefijo SP_ en el .env centralizado.
CLIENT_ID = os.getenv("SP_AZURE_CLIENT_ID")
TENANT_ID = os.getenv("AZURE_TENANT_ID")
CLIENT_SECRET = os.getenv("SP_AZURE_CLIENT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "text-embedding-3-small")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-21")
EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS", "512"))

# Tamaño objetivo de cada chunk en tokens y solape entre chunks contiguos.
CHUNK_TOKENS = 500
CHUNK_OVERLAP = 50

# Control de ritmo para no saturar la cuota de Azure OpenAI ni el costo.
# Máximo de archivos a procesar por corrida (0 = sin límite). El delta hace que
# la siguiente corrida continúe donde quedó.
MAX_FILES_PER_RUN = int(os.getenv("MAX_FILES_PER_RUN", "50"))
# Pausa (segundos) entre cada archivo procesado, para espaciar las llamadas.
SLEEP_BETWEEN_FILES = float(os.getenv("SLEEP_BETWEEN_FILES", "1.5"))

# Extensiones que MarkItDown sabe convertir a texto. El resto se omite.
SUPPORTED_EXTS = {
    ".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls",
    ".md", ".txt", ".html", ".htm", ".csv", ".json", ".xml",
}


class SharePointScraper:
    def __init__(self):
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.credential = ClientSecretCredential(
            tenant_id=TENANT_ID,
            client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET,
        )
        self.md = MarkItDown()
        self.base_url = "https://graph.microsoft.com/v1.0"
        self.openai = AzureOpenAI(
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            api_key=AZURE_OPENAI_API_KEY,
            api_version=AZURE_OPENAI_API_VERSION,
        )
        self.encoder = tiktoken.get_encoding("cl100k_base")
        self.files_processed = 0
        self.limit_reached = False

    async def get_token(self):
        token = await self.credential.get_token("https://graph.microsoft.com/.default")
        return token.token

    # ----- Estado incremental (delta link) ------------------------------------

    def get_saved_delta_link(self, drive_id):
        try:
            response = (
                self.supabase.table("scraping_state")
                .select("next_link")
                .eq("resource_id", drive_id)
                .execute()
            )
            if response.data and response.data[0].get("next_link"):
                return response.data[0]["next_link"]
        except Exception as e:
            print(f"No se pudo obtener el estado guardado para {drive_id}: {e}")
        return None

    def save_delta_link(self, drive_id, delta_link):
        try:
            self.supabase.table("scraping_state").upsert(
                {
                    "resource_type": "drive",
                    "resource_id": drive_id,
                    "status": "completed",
                    "next_link": delta_link,
                    "last_processed_at": datetime.now(timezone.utc).isoformat(),
                },
                on_conflict="resource_id",
            ).execute()
        except Exception as e:
            print(f"Error al guardar delta link para {drive_id}: {e}")

    # ----- Texto -> chunks -> embeddings --------------------------------------

    def chunk_text(self, text):
        """Trocea el texto en fragmentos de ~CHUNK_TOKENS tokens con solape."""
        tokens = self.encoder.encode(text)
        if not tokens:
            return []
        chunks = []
        step = CHUNK_TOKENS - CHUNK_OVERLAP
        for start in range(0, len(tokens), step):
            window = tokens[start : start + CHUNK_TOKENS]
            if not window:
                break
            chunk = self.encoder.decode(window).strip()
            if chunk:
                chunks.append(chunk)
            if start + CHUNK_TOKENS >= len(tokens):
                break
        return chunks

    def embed(self, texts):
        """Genera embeddings de EMBEDDING_DIMENSIONS para una lista de textos.

        Procesa en lotes que respetan el máximo de 300.000 tokens por request
        de Azure OpenAI, y reintenta ante rate limit (429).
        """
        max_tokens_per_request = 280000  # margen bajo el límite de 300.000
        results = []
        batch = []
        batch_tokens = 0
        for text in texts:
            t = len(self.encoder.encode(text))
            if batch and batch_tokens + t > max_tokens_per_request:
                results.extend(self._embed_batch(batch))
                batch = []
                batch_tokens = 0
            batch.append(text)
            batch_tokens += t
        if batch:
            results.extend(self._embed_batch(batch))
        return results

    def _embed_batch(self, texts):
        """Una sola llamada de embeddings con reintento ante rate limit."""
        import time
        from openai import RateLimitError

        max_retries = 6
        for attempt in range(max_retries):
            try:
                response = self.openai.embeddings.create(
                    model=AZURE_OPENAI_DEPLOYMENT,
                    input=texts,
                    dimensions=EMBEDDING_DIMENSIONS,
                )
                return [item.embedding for item in response.data]
            except RateLimitError as e:
                wait = 60
                retry_after = getattr(e, "response", None)
                if retry_after is not None:
                    hdr = e.response.headers.get("retry-after")
                    if hdr and hdr.isdigit():
                        wait = int(hdr)
                if attempt == max_retries - 1:
                    raise
                print(f"  Rate limit; esperando {wait}s (intento {attempt + 1}/{max_retries})...")
                time.sleep(wait)

    # ----- file_path estable y consistente con la convención wiki/ ------------

    def build_file_path(self, site_name, item):
        """Construye 'sharepoint/<sitio>/<ruta relativa del archivo>'.

        Prefijo 'sharepoint/' para mantener este volcado crudo separado de la
        wiki curada (que vive bajo 'wiki/') y nunca pisarla.
        """
        parent = item.get("parentReference", {}) or {}
        # parentReference.path es algo como '/drive/root:/Documentos/Subcarpeta'
        raw_path = parent.get("path", "") or ""
        if ":" in raw_path:
            raw_path = raw_path.split(":", 1)[1]
        raw_path = raw_path.strip("/")
        name = item.get("name", "")
        rel = f"{raw_path}/{name}" if raw_path else name
        site_slug = (site_name or "sitio").strip().strip("/")
        return f"sharepoint/{site_slug}/{rel}".replace("//", "/")

    # ----- Procesamiento de un archivo ----------------------------------------

    def already_up_to_date(self, file_path, last_modified):
        """True si ya tenemos este archivo con la misma fecha de modificación."""
        if not last_modified:
            return False
        try:
            response = (
                self.supabase.table("wiki_documents")
                .select("updated_at")
                .eq("file_path", file_path)
                .order("updated_at", desc=True)
                .limit(1)
                .execute()
            )
            if response.data:
                stored = response.data[0].get("updated_at")
                # Guardamos updated_at = lastModifiedDateTime del archivo, así que
                # si coinciden, no hay nada que reprocesar.
                if stored and stored[:19] == last_modified[:19]:
                    return True
        except Exception as e:
            print(f"Error revisando estado de {file_path}: {e}")
        return False

    def delete_existing_chunks(self, file_path):
        try:
            self.supabase.table("wiki_documents").delete().eq(
                "file_path", file_path
            ).execute()
        except Exception as e:
            print(f"Error borrando chunks previos de {file_path}: {e}")

    async def process_file(self, site_name, item, download_url):
        name = item.get("name", "")
        ext = os.path.splitext(name)[1].lower()
        if ext not in SUPPORTED_EXTS:
            return
        if not download_url:
            return

        file_path = self.build_file_path(site_name, item)
        last_modified = item.get("lastModifiedDateTime")

        if self.already_up_to_date(file_path, last_modified):
            print(f"Sin cambios, omitido: {file_path}")
            return

        print(f"Procesando: {file_path}")

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(download_url, timeout=120)
            if resp.status_code != 200:
                print(f"  Descarga fallida ({resp.status_code}) para {name}")
                return
            content = resp.content
        except Exception as e:
            print(f"  Error descargando {name}: {e}")
            return

        suffix = ext or ""
        tmp_file_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                tmp_file.write(content)
                tmp_file_path = tmp_file.name

            result = self.md.convert(tmp_file_path)
            markdown_text = (result.text_content or "").strip()
        except Exception as e:
            print(f"  Error convirtiendo {name} a Markdown: {e}")
            return
        finally:
            if tmp_file_path and os.path.exists(tmp_file_path):
                os.remove(tmp_file_path)

        if not markdown_text:
            print(f"  Documento vacío tras conversión: {name}")
            return

        chunks = self.chunk_text(markdown_text)
        if not chunks:
            return

        try:
            embeddings = self.embed(chunks)
        except Exception as e:
            print(f"  Error generando embeddings para {name}: {e}")
            return

        # Reemplazo limpio: borrar los chunks antiguos y reinsertar.
        self.delete_existing_chunks(file_path)

        title = item.get("title") or name
        rows = []
        for idx, (chunk, vector) in enumerate(zip(chunks, embeddings)):
            rows.append(
                {
                    "file_path": file_path,
                    "title": title,
                    "content": chunk,
                    "chunk_index": idx,
                    "embedding": vector,
                    "updated_at": last_modified,
                }
            )

        try:
            self.supabase.table("wiki_documents").upsert(
                rows, on_conflict="file_path,chunk_index"
            ).execute()
            print(f"  Guardado: {len(rows)} chunks de {name}")
            return True
        except Exception as e:
            print(f"  Error guardando chunks de {name}: {e}")
            return False

    # ----- Recorrido de drives -------------------------------------------------

    async def fetch_download_url(self, client, drive_id, item_id, headers):
        """El endpoint delta no incluye downloadUrl; se pide por item."""
        if not item_id:
            return None
        try:
            r = await client.get(
                f"{self.base_url}/drives/{drive_id}/items/{item_id}"
                "?$select=@microsoft.graph.downloadUrl",
                headers=headers,
                timeout=60,
            )
            r.raise_for_status()
            return r.json().get("@microsoft.graph.downloadUrl")
        except Exception as e:
            print(f"  No se pudo obtener downloadUrl de {item_id}: {e}")
            return None

    async def process_drive(self, drive_id, site_name):
        print(f"Procesando Drive {drive_id} ({site_name})...")
        delta_link = self.get_saved_delta_link(drive_id)
        token = await self.get_token()
        headers = {"Authorization": f"Bearer {token}"}

        url = delta_link if delta_link else f"{self.base_url}/drives/{drive_id}/root/delta"

        async with httpx.AsyncClient() as client:
            while url:
                try:
                    response = await client.get(url, headers=headers, timeout=120)
                    response.raise_for_status()
                    data = response.json()
                except Exception as e:
                    print(f"Error procesando drive {drive_id}: {e}")
                    return

                for item in data.get("value", []):
                    if self.limit_reached:
                        break
                    if "file" in item and not item.get("deleted"):
                        download_url = item.get("@microsoft.graph.downloadUrl")
                        if not download_url:
                            download_url = await self.fetch_download_url(
                                client, drive_id, item.get("id"), headers
                            )
                        processed = await self.process_file(
                            site_name, item, download_url
                        )
                        if processed:
                            self.files_processed += 1
                            if (
                                MAX_FILES_PER_RUN
                                and self.files_processed >= MAX_FILES_PER_RUN
                            ):
                                print(
                                    f"Límite de {MAX_FILES_PER_RUN} archivos por "
                                    "corrida alcanzado; se continuará en la próxima."
                                )
                                self.limit_reached = True
                                break
                            if SLEEP_BETWEEN_FILES:
                                await asyncio.sleep(SLEEP_BETWEEN_FILES)

                if self.limit_reached:
                    # Corte parcial: NO guardamos deltaLink para no saltar lo
                    # que aún no procesamos. La próxima corrida reanuda este
                    # mismo punto con el delta_link previo (o desde cero).
                    return

                next_page = data.get("@odata.nextLink")
                delta = data.get("@odata.deltaLink")
                if next_page:
                    url = next_page
                else:
                    if delta:
                        self.save_delta_link(drive_id, delta)
                    url = None

    async def discover_subsites(self, client, headers, site_id, found):
        """Agrega recursivamente los subsitios anidados de un sitio.

        Pagina la respuesta de /sites/{id}/sites siguiendo @odata.nextLink: sin
        esto solo se veía la primera página de subsitios y se perdían los demás
        (p.ej. GND tiene 39 subsitios — ORIGI, ESTRU, etc. — repartidos en varias
        páginas, así que sin paginar se omitían sitios enteros de negocio).
        """
        url = f"{self.base_url}/sites/{site_id}/sites"
        try:
            while url:
                r = await client.get(url, headers=headers, timeout=60)
                if r.status_code != 200:
                    return
                data = r.json()
                for sub in data.get("value", []):
                    sid = sub.get("id")
                    if sid and sid not in found:
                        found[sid] = sub
                        await self.discover_subsites(client, headers, sid, found)
                url = data.get("@odata.nextLink")
        except Exception as e:
            print(f"  No se pudieron leer subsitios de {site_id}: {e}")

    async def discover_all_sites(self):
        """Descubre automáticamente todos los sitios del tenant + subsitios.

        Si SHAREPOINT_SITES está definido, se limita a esos sitios (y sus
        subsitios). Si está vacío, recorre TODO el tenant vía getAllSites,
        así los sitios creados en el futuro entran solos.
        """
        token = await self.get_token()
        headers = {"Authorization": f"Bearer {token}"}
        found = {}  # id -> site
        raw = os.getenv("SHAREPOINT_SITES", "").strip()

        async with httpx.AsyncClient() as client:
            if raw:
                roots = [e.strip() for e in raw.split(",") if e.strip()]
                for entry in roots:
                    try:
                        r = await client.get(
                            f"{self.base_url}/sites/{entry}", headers=headers, timeout=60
                        )
                        r.raise_for_status()
                        site = r.json()
                        found[site["id"]] = site
                    except Exception as e:
                        print(f"No se pudo resolver el sitio '{entry}': {e}")
            else:
                print("Descubriendo todos los sitios del tenant...")
                url = f"{self.base_url}/sites/getAllSites?$select=id,name,displayName,webUrl,isPersonalSite"
                while url:
                    try:
                        r = await client.get(url, headers=headers, timeout=120)
                        r.raise_for_status()
                        data = r.json()
                    except Exception as e:
                        print(f"Error en getAllSites: {e}")
                        break
                    for site in data.get("value", []):
                        if site.get("isPersonalSite"):
                            continue
                        found[site["id"]] = site
                    url = data.get("@odata.nextLink")

            # Subsitios recursivos de cada sitio raíz encontrado.
            for sid in list(found.keys()):
                await self.discover_subsites(client, headers, sid, found)

        result = list(found.values())

        # Orden inverso opcional: permite correr un segundo proceso (cron local)
        # que barre los sitios de atrás hacia adelante mientras el job de Azure
        # los barre de adelante hacia atrás. Comparten el estado por-drive en
        # `scraping_state`, así que se cruzan en el medio y no se repisan.
        if os.getenv("SCRAPE_REVERSE", "").strip().lower() in ("1", "true", "yes", "si"):
            result.reverse()
            print("Orden INVERSO activado (SCRAPE_REVERSE=1).")

        print(f"Sitios a procesar (incl. subsitios): {len(result)}")
        return result

    async def run(self):
        print("Iniciando scraper...")
        sites = await self.discover_all_sites()
        token = await self.get_token()
        headers = {"Authorization": f"Bearer {token}"}

        async with httpx.AsyncClient() as client:
            for site in sites:
                if self.limit_reached:
                    break
                site_name = site.get("name") or site.get("displayName") or "sitio"
                print(f"\n--- Sitio: {site_name} ({site.get('id')}) ---")
                try:
                    resp = await client.get(
                        f"{self.base_url}/sites/{site.get('id')}/drives",
                        headers=headers,
                        timeout=60,
                    )
                    resp.raise_for_status()
                    drives = resp.json().get("value", [])
                except Exception as e:
                    print(f"No se pudieron leer las unidades del sitio {site_name}: {e}")
                    continue

                allowed = os.getenv("SHAREPOINT_LIBRARIES", "").strip()
                allowed_set = {a.strip().lower() for a in allowed.split(",") if a.strip()}

                for drive in drives:
                    if self.limit_reached:
                        break
                    if allowed_set and (drive.get("name") or "").lower() not in allowed_set:
                        continue
                    await self.process_drive(drive.get("id"), site_name)

        await self.credential.close()
        print(f"\nCorrida terminada. Archivos procesados: {self.files_processed}")
        if self.limit_reached:
            print("Se alcanzó el límite de esta corrida; quedan archivos pendientes.")
        else:
            # Recorrió todo sin cortar por límite. Si no hubo archivos nuevos,
            # el indexado está al día → avisar una sola vez.
            self.maybe_notify_completion()

    def maybe_notify_completion(self):
        """Avisa por VIC (Teams) cuando el indexado queda al día. Una sola vez."""
        notify_url = os.getenv("VIC_PUSH_URL", "").strip()
        notify_secret = os.getenv("VIC_PUSH_SECRET", "").strip()
        notify_email = os.getenv("NOTIFY_EMAIL", "").strip()
        if not (notify_url and notify_secret and notify_email):
            return

        # Estado de la última notificación, guardado en scraping_state.
        try:
            resp = (
                self.supabase.table("scraping_state")
                .select("status")
                .eq("resource_id", "__notify__")
                .execute()
            )
            already_notified = bool(resp.data and resp.data[0].get("status") == "notified")
        except Exception:
            already_notified = False

        if self.files_processed > 0:
            # Hubo trabajo: rearmar el aviso para la próxima vez que quede al día.
            if already_notified:
                self._set_notify_state("pending")
            return

        if already_notified:
            return  # ya avisamos y sigue al día; no repetir

        total = 0
        try:
            r = (
                self.supabase.table("wiki_documents")
                .select("file_path", count="exact")
                .like("file_path", "sharepoint/%")
                .limit(1)
                .execute()
            )
            total = r.count or 0
        except Exception:
            pass

        text = (
            "✅ Indexado de SharePoint al día. "
            f"No hay archivos nuevos por procesar. Documentos indexados: {total}."
        )
        try:
            r = httpx.post(
                notify_url,
                headers={"x-vic-push-secret": notify_secret},
                json={"to_email": notify_email, "text": text},
                timeout=30,
            )
            if r.status_code == 200:
                print(f"Aviso enviado a VIC para {notify_email}.")
                self._set_notify_state("notified")
            else:
                print(f"VIC push respondió {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"No se pudo enviar aviso a VIC: {e}")

    def _set_notify_state(self, status):
        try:
            self.supabase.table("scraping_state").upsert(
                {
                    "resource_type": "notify",
                    "resource_id": "__notify__",
                    "status": status,
                    "last_processed_at": datetime.now(timezone.utc).isoformat(),
                },
                on_conflict="resource_id",
            ).execute()
        except Exception as e:
            print(f"No se pudo guardar estado de notificación: {e}")


async def main():
    scraper = SharePointScraper()
    await scraper.run()


if __name__ == "__main__":
    asyncio.run(main())
