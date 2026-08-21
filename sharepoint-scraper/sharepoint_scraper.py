"""Recorre TODOS los sitios de SharePoint (+ subsitios), convierte cada
documento a Markdown con MarkItDown, y sube ese .md al mismo SharePoint del
wiki — no a Supabase. Hermano de `local_ingest.py`/`local_ocr_ingest.py`
(que hacen lo mismo mas artesanalmente, partiendo de carpetas locales u OCR):
este es el que cubre TODO el tenant vía Microsoft Graph.

Reescrito 2026-08-21 (antes escribía a `wiki_documents`/`scraping_state` en
Supabase, que dejaron de existir el 2026-08-20). VIC lee SharePoint EN VIVO
(Graph Search) — el .md subido aquí no es un índice aparte, es contenido real
en la biblioteca del wiki, así que Graph Search lo encuentra igual que
cualquier otro documento. Ya no hace falta chunking ni embeddings (eso era
para búsqueda vectorial contra Supabase); se sube el documento completo.

Destino: `sharepoint_upload.upload_markdown` — biblioteca 'AA General
Edicion', carpeta `.AI/_local-ingest/sharepoint/<sitio>/<ruta original>.md`.

Estado (delta link por drive, para no re-crawlear el tenant completo en cada
corrida): antes vivía en `scraping_state` (Supabase); ahora es un único JSON
subido al MISMO SharePoint (`.AI/_local-ingest/_state/scraping_state.json`,
ver STATE_PATH) — así el estado no depende de Supabase ni de que corra
siempre en la misma máquina/contenedor. Se descarga una vez al arrancar y se
vuelve a subir después de cada drive.

Pensado para correr LOCAL (tarea programada), como el resto de la migración
de esta semana — no en el Container App Job 'ic-scraper-job' (que quedó con
el cron pausado). Si se quiere volver a correr en la nube, este mismo código
sirve igual: el estado ya no está atado a la máquina, vive en SharePoint.

Uso:
  python sharepoint_scraper.py
  (todo por variables de entorno del .env raíz: SHAREPOINT_SITES,
  SHAREPOINT_LIBRARIES, SCRAPE_REVERSE, MAX_FILES_PER_RUN, MAX_CONCURRENCY,
  SLEEP_BETWEEN_FILES — ver abajo)
"""

import os
import sys
import json
import asyncio
import tempfile
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv
from azure.identity.aio import ClientSecretCredential
from markitdown import MarkItDown

from sharepoint_upload import upload_markdown, download_bytes, upload_bytes, TARGET_ROOT

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
# app/datamart. Por eso va con prefijo SP_ en el .env centralizado. Mismo
# registro que usa sharepoint_upload.py para subir.
CLIENT_ID = os.getenv("SP_AZURE_CLIENT_ID")
TENANT_ID = os.getenv("AZURE_TENANT_ID")
CLIENT_SECRET = os.getenv("SP_AZURE_CLIENT_SECRET")

# Dónde vive el JSON de estado (delta links por drive), en el mismo drive que
# usa sharepoint_upload.py para el contenido.
STATE_PATH = f"{TARGET_ROOT}/_state/scraping_state.json"

# Máx. archivos por corrida (0 = sin límite). Antes acotaba el gasto de
# embeddings de Azure OpenAI; ya no hay ese costo, así que por defecto corre
# sin tope y confía en el reintento con backoff ante 429 de Graph. Sigue
# disponible por si se quiere una primera corrida controlada.
MAX_FILES_PER_RUN = int(os.getenv("MAX_FILES_PER_RUN", "0"))
# Pausa (segundos) entre archivo y archivo, por cortesía con Graph. Ya no hay
# cuota de OpenAI que cuidar, así que 0 por defecto.
SLEEP_BETWEEN_FILES = float(os.getenv("SLEEP_BETWEEN_FILES", "0"))
# Archivos procesados en paralelo. Cada uno descarga, convierte y sube; el
# tiempo dominante es espera de red, así que varios a la vez suben el
# throughput sin saturar la CPU. Las partes bloqueantes (MarkItDown, subida a
# SharePoint) corren en hilos vía asyncio.to_thread.
MAX_CONCURRENCY = int(os.getenv("MAX_CONCURRENCY", "4"))

# Extensiones que MarkItDown sabe convertir a texto. El resto se omite.
SUPPORTED_EXTS = {
    ".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls",
    ".md", ".txt", ".html", ".htm", ".csv", ".json", ".xml",
}


class SharePointScraper:
    def __init__(self):
        self.credential = ClientSecretCredential(
            tenant_id=TENANT_ID,
            client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET,
        )
        self.md = MarkItDown()
        self.base_url = "https://graph.microsoft.com/v1.0"
        self.files_processed = 0
        self.limit_reached = False
        # {"drives": {drive_id: {"delta_link": ..., "last_processed_at": ...}},
        #  "notify": {"status": "notified" | "pending"}}
        # Cargado de SharePoint en run(), persistido ahí mismo tras cada drive.
        self.state = {"drives": {}, "notify": {}}
        # Se crea dentro del event loop, en run().
        self.semaphore = None

    async def get_token(self):
        token = await self.credential.get_token("https://graph.microsoft.com/.default")
        return token.token

    # ----- Estado (delta links), persistido como JSON en SharePoint -----------

    async def load_state(self):
        try:
            raw = await asyncio.to_thread(download_bytes, STATE_PATH)
        except Exception as e:
            print(f"No se pudo leer el estado ({STATE_PATH}): {e}. Se arranca de cero.")
            return
        if not raw:
            print("Sin estado previo en SharePoint; primera corrida (o tabula rasa).")
            return
        try:
            self.state = json.loads(raw.decode("utf-8"))
            self.state.setdefault("drives", {})
            self.state.setdefault("notify", {})
            print(f"Estado cargado: {len(self.state['drives'])} drives con progreso previo.")
        except Exception as e:
            print(f"Estado en SharePoint corrupto, se ignora: {e}")

    async def save_state(self):
        try:
            data = json.dumps(self.state, ensure_ascii=False, indent=2).encode("utf-8")
            ok, detail = await asyncio.to_thread(upload_bytes, STATE_PATH, data, "application/json")
            if not ok:
                print(f"No se pudo guardar el estado: {detail}")
        except Exception as e:
            print(f"Error guardando estado: {e}")

    def get_saved_delta_link(self, drive_id):
        return self.state.get("drives", {}).get(drive_id, {}).get("delta_link")

    async def save_delta_link(self, drive_id, delta_link):
        self.state.setdefault("drives", {})[drive_id] = {
            "delta_link": delta_link,
            "last_processed_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.save_state()

    # ----- file_path estable y consistente con la convención wiki/ ------------

    def build_rel_path(self, item):
        """Ruta relativa DENTRO del sitio: '<carpeta>/<archivo>'."""
        parent = item.get("parentReference", {}) or {}
        # parentReference.path es algo como '/drive/root:/Documentos/Subcarpeta'
        raw_path = parent.get("path", "") or ""
        if ":" in raw_path:
            raw_path = raw_path.split(":", 1)[1]
        raw_path = raw_path.strip("/")
        name = item.get("name", "")
        rel = f"{raw_path}/{name}" if raw_path else name
        return rel

    # ----- Procesamiento de un archivo ----------------------------------------

    async def process_file(self, site_name, item, download_url):
        name = item.get("name", "")
        ext = os.path.splitext(name)[1].lower()
        if ext not in SUPPORTED_EXTS:
            return False
        if not download_url:
            return False

        site_slug = (site_name or "sitio").strip().strip("/")
        prefix = f"sharepoint/{site_slug}"
        rel = self.build_rel_path(item)
        display_path = f"{prefix}/{rel}"

        print(f"Procesando: {display_path}")

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(download_url, timeout=120)
            if resp.status_code != 200:
                print(f"  Descarga fallida ({resp.status_code}) para {name}")
                return False
            content = resp.content
        except Exception as e:
            print(f"  Error descargando {name}: {e}")
            return False

        suffix = ext or ""
        tmp_file_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
                tmp_file.write(content)
                tmp_file_path = tmp_file.name

            result = await asyncio.to_thread(self.md.convert, tmp_file_path)
            markdown_text = (result.text_content or "").strip()
        except Exception as e:
            print(f"  Error convirtiendo {name} a Markdown: {e}")
            return False
        finally:
            if tmp_file_path and os.path.exists(tmp_file_path):
                os.remove(tmp_file_path)

        if not markdown_text:
            print(f"  Documento vacío tras conversión: {name}")
            return False

        title = item.get("title") or name
        body = f"# {title}\n\n{markdown_text}"

        try:
            ok, detail = await asyncio.to_thread(upload_markdown, prefix, rel, body)
        except Exception as e:
            print(f"  Error subiendo {name} a SharePoint: {e}")
            return False

        if ok:
            print(f"  Subido ← {detail}")
            return True
        print(f"  Error subiendo {name} a SharePoint: {detail}")
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

    async def _handle_item(self, client, drive_id, site_name, item, headers):
        """Procesa un archivo del delta, acotado por el semáforo de concurrencia.

        El descarte de extensiones no soportadas se hace ANTES de tomar el
        semáforo y ANTES de pedir el downloadUrl. El delta ya trae solo lo
        nuevo/cambiado desde la última corrida (o todo, en la primera), así
        que no hace falta un chequeo de "ya está" aparte.
        """
        if self.limit_reached:
            return
        name = item.get("name", "")
        ext = os.path.splitext(name)[1].lower()
        if ext not in SUPPORTED_EXTS:
            return

        async with self.semaphore:
            if self.limit_reached:
                return
            download_url = item.get("@microsoft.graph.downloadUrl")
            if not download_url:
                download_url = await self.fetch_download_url(
                    client, drive_id, item.get("id"), headers
                )
            processed = await self.process_file(site_name, item, download_url)
            if processed:
                self.files_processed += 1
                if MAX_FILES_PER_RUN and self.files_processed >= MAX_FILES_PER_RUN:
                    if not self.limit_reached:
                        print(
                            f"Límite de {MAX_FILES_PER_RUN} archivos por corrida "
                            "alcanzado; se continuará en la próxima."
                        )
                    self.limit_reached = True
                elif SLEEP_BETWEEN_FILES:
                    await asyncio.sleep(SLEEP_BETWEEN_FILES)

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

                tasks = [
                    asyncio.create_task(
                        self._handle_item(client, drive_id, site_name, item, headers)
                    )
                    for item in data.get("value", [])
                    if "file" in item and not item.get("deleted")
                ]
                if tasks:
                    await asyncio.gather(*tasks)

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
                        await self.save_delta_link(drive_id, delta)
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
        # que barre los sitios de atrás hacia adelante mientras el otro los
        # barre de adelante hacia atrás. Comparten el estado por-drive en
        # SharePoint (STATE_PATH), así que se cruzan en el medio y no se repisan
        # siempre que no corran los dos a la vez (el JSON no tiene locking).
        if os.getenv("SCRAPE_REVERSE", "").strip().lower() in ("1", "true", "yes", "si"):
            result.reverse()
            print("Orden INVERSO activado (SCRAPE_REVERSE=1).")

        print(f"Sitios a procesar (incl. subsitios): {len(result)}")
        return result

    async def run(self):
        print("Iniciando scraper...")
        self.semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
        print(f"Concurrencia: {MAX_CONCURRENCY} archivos en paralelo.")
        await self.load_state()
        sites = await self.discover_all_sites()

        async with httpx.AsyncClient() as client:
            for site in sites:
                if self.limit_reached:
                    break
                site_name = site.get("name") or site.get("displayName") or "sitio"
                print(f"\n--- Sitio: {site_name} ({site.get('id')}) ---")
                try:
                    # Token fresco por sitio: una corrida larga (cientos de sitios)
                    # cruza el vencimiento (~60-75 min) del token de Graph. get_token()
                    # cachea y solo renueva cerca de expirar, así que esto es barato y
                    # evita los 401 en bloque que sufrían los sitios del final.
                    token = await self.get_token()
                    headers = {"Authorization": f"Bearer {token}"}
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
            await self.maybe_notify_completion()

    async def maybe_notify_completion(self):
        """Avisa por VIC (Teams) cuando el indexado queda al día. Una sola vez."""
        notify_url = os.getenv("VIC_PUSH_URL", "").strip()
        notify_secret = os.getenv("VIC_PUSH_SECRET", "").strip()
        notify_email = os.getenv("NOTIFY_EMAIL", "").strip()
        if not (notify_url and notify_secret and notify_email):
            return

        already_notified = self.state.get("notify", {}).get("status") == "notified"

        if self.files_processed > 0:
            # Hubo trabajo: rearmar el aviso para la próxima vez que quede al día.
            if already_notified:
                await self._set_notify_state("pending")
            return

        if already_notified:
            return  # ya avisamos y sigue al día; no repetir

        text = "✅ Indexado de SharePoint al día. No hay archivos nuevos por procesar."
        try:
            r = httpx.post(
                notify_url,
                headers={"x-vic-push-secret": notify_secret},
                json={"to_email": notify_email, "text": text},
                timeout=30,
            )
            if r.status_code == 200:
                print(f"Aviso enviado a VIC para {notify_email}.")
                await self._set_notify_state("notified")
            else:
                print(f"VIC push respondió {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"No se pudo enviar aviso a VIC: {e}")

    async def _set_notify_state(self, status):
        self.state.setdefault("notify", {})["status"] = status
        self.state["notify"]["last_processed_at"] = datetime.now(timezone.utc).isoformat()
        await self.save_state()


async def main():
    scraper = SharePointScraper()
    await scraper.run()


if __name__ == "__main__":
    asyncio.run(main())
