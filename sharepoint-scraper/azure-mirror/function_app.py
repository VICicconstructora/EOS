"""Azure Function — espejo diario de Supabase -> SharePoint/OneDrive vía Graph.

Lee las filas de wiki_documents con prefijo 'sharepoint/', reconstruye un .md por
documento (juntando chunks en orden), y los sube a la biblioteca de SharePoint
'AA General Edicion' bajo .AI/_sharepoint/ usando Microsoft Graph.

A diferencia del export local, NO escribe a disco: sube cada .md vía Graph PUT.
Así corre 100% en la nube sin depender del PC del usuario. El cliente de OneDrive
del PC sincroniza esos .md a disco cuando esté encendido, para leerlos en Obsidian.

Trigger: timer diario a la 1:00 AM hora Colombia (06:00 UTC).
"""

import os
import re
import json
import logging
import datetime
import concurrent.futures

import azure.functions as func
import httpx
from azure.identity import ClientSecretCredential
from supabase import create_client

app = func.FunctionApp()

# Sube en paralelo para caber en la ventana de tiempo del plan.
UPLOAD_WORKERS = int(os.getenv("UPLOAD_WORKERS", "12"))
# Nombre del blob de estado (qué file_path subimos y con qué updated_at).
STATE_CONTAINER = "mirror-state"
STATE_BLOB = "uploaded.json"

# --- Config desde Application Settings (env vars de la Function) --------------
PREFIX = "sharepoint/"
# Drive de la biblioteca 'AA General Edicion' (sitio AAGENERALEDICION), drive
# principal "Documentos". Verificado vía Graph.
TARGET_DRIVE_ID = os.getenv(
    "TARGET_DRIVE_ID",
    "b!bROTReHG9UOp8Z59fHTFzvv44lRutSlCmcSSNCZTpxSr0fyjYmv5S5mNTbeBMQVB",
)
# Carpeta destino dentro del drive (sin barra inicial).
TARGET_FOLDER = os.getenv("TARGET_FOLDER", ".AI/_sharepoint")

GRAPH = "https://graph.microsoft.com/v1.0"


def fix_mojibake(s):
    """Repara texto UTF-8 mal decodificado como latin-1 (FACTURACI -> FACTURACIÓN)."""
    if not s:
        return s
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def safe_rel_path(file_path):
    """file_path lógico -> ruta relativa válida para Graph (con / como separador).

    Sanea cada segmento, repara mojibake, recorta segmentos larguísimos, y
    garantiza extensión .md. Graph acepta rutas largas, no aplica el tope de 260.
    """
    rel = file_path[len(PREFIX):] if file_path.startswith(PREFIX) else file_path
    parts = []
    for seg in rel.split("/"):
        seg = fix_mojibake(seg)
        seg = re.sub(r'[<>:"|?*\\]', "_", seg).strip().rstrip(".")
        if len(seg) > 120:
            seg = seg[:120].strip()
        if seg:
            parts.append(seg)
    if not parts:
        parts = ["sin_nombre"]
    if not parts[-1].lower().endswith(".md"):
        parts[-1] += ".md"
    return "/".join(parts)


def get_graph_token():
    cred = ClientSecretCredential(
        tenant_id=os.environ["AZURE_TENANT_ID"],
        client_id=os.environ["AZURE_CLIENT_ID"],
        client_secret=os.environ["AZURE_CLIENT_SECRET"],
    )
    return cred.get_token("https://graph.microsoft.com/.default").token


def upload_md(client, token, rel_path, text):
    """Sube/reemplaza un .md en TARGET_FOLDER/rel_path vía Graph PUT.

    Reintenta ante 429 (throttling) y 5xx, respetando Retry-After. Devuelve el
    último status_code (200/201 = ok).
    """
    import time
    full = f"{TARGET_FOLDER}/{rel_path}"
    url = f"{GRAPH}/drives/{TARGET_DRIVE_ID}/root:/{full}:/content"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "text/markdown"}
    data = text.encode("utf-8")
    status = 0
    for attempt in range(5):
        r = client.put(url, headers=headers, content=data, timeout=120)
        status = r.status_code
        if status in (200, 201):
            return status
        if status == 429 or status >= 500:
            wait = int(r.headers.get("Retry-After", "0") or "0") or (2 ** attempt)
            time.sleep(min(wait, 30))
            continue
        return status  # 4xx no reintentables
    return status


# --- Estado incremental: blob en la Storage de la Function -------------------

def _state_container():
    """Devuelve un ContainerClient sobre la cuenta de storage de la Function."""
    from azure.storage.blob import BlobServiceClient
    conn = os.environ["AzureWebJobsStorage"]
    svc = BlobServiceClient.from_connection_string(conn)
    try:
        svc.create_container(STATE_CONTAINER)
    except Exception:
        pass  # ya existe
    return svc.get_container_client(STATE_CONTAINER)


def load_state():
    """{file_path: updated_at} de lo ya subido. {} si es la primera vez."""
    try:
        blob = _state_container().get_blob_client(STATE_BLOB)
        return json.loads(blob.download_blob().readall())
    except Exception:
        return {}


def save_state(state):
    try:
        blob = _state_container().get_blob_client(STATE_BLOB)
        blob.upload_blob(json.dumps(state).encode("utf-8"), overwrite=True)
    except Exception as e:
        logging.warning("No se pudo guardar estado: %s", e)


def run_mirror(force_all=False):
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

    # 1. Traer file_path + updated_at máximo por documento (para detectar cambios).
    #    Tomamos el updated_at de cualquier chunk; el scraper los escribe iguales.
    latest = {}  # file_path -> updated_at
    off = 0
    while True:
        r = (
            sb.table("wiki_documents")
            .select("file_path,updated_at")
            .like("file_path", PREFIX + "%")
            .range(off, off + 999)
            .execute()
        )
        if not r.data:
            break
        for row in r.data:
            fp = row["file_path"]
            up = row.get("updated_at") or ""
            if fp not in latest or up > latest[fp]:
                latest[fp] = up
        if len(r.data) < 1000:
            break
        off += 1000

    state = {} if force_all else load_state()

    # 2. Solo los documentos nuevos o con updated_at distinto al ya subido.
    pending = [fp for fp, up in latest.items() if state.get(fp) != up]
    logging.info("Total docs=%d  pendientes (nuevos/cambiados)=%d", len(latest), len(pending))

    if not pending:
        logging.info("Espejo ya al día. Nada que subir.")
        return 0, 0

    token = get_graph_token()

    def build_and_upload(client, fp):
        rows = (
            sb.table("wiki_documents")
            .select("content,chunk_index,title")
            .eq("file_path", fp)
            .order("chunk_index")
            .execute()
        ).data
        if not rows:
            return fp, None
        title = fix_mojibake(rows[0].get("title") or fp.rsplit("/", 1)[-1])
        body = "\n\n".join(fix_mojibake(row.get("content") or "") for row in rows)
        text = f"# {title}\n\n> Fuente: `{fp}` — espejo de Supabase (volcado crudo).\n\n{body}\n"
        status = upload_md(client, token, safe_rel_path(fp), text)
        return fp, status

    ok = 0
    failed = 0
    with httpx.Client() as client:
        with concurrent.futures.ThreadPoolExecutor(max_workers=UPLOAD_WORKERS) as ex:
            futures = {ex.submit(build_and_upload, client, fp): fp for fp in pending}
            for i, fut in enumerate(concurrent.futures.as_completed(futures), 1):
                fp = futures[fut]
                try:
                    _, status = fut.result()
                    if status in (200, 201):
                        ok += 1
                        state[fp] = latest[fp]  # marcar como subido con su fecha
                    else:
                        failed += 1
                        logging.warning("PUT %s -> %s", fp, status)
                except Exception as e:
                    failed += 1
                    logging.warning("Error subiendo %s: %s", fp, e)
                if i % 200 == 0:
                    logging.info("  %d/%d (ok=%d fail=%d)", i, len(pending), ok, failed)

    save_state(state)
    logging.info("Espejo terminado. Subidos=%d fallidos=%d pendientes=%d", ok, failed, len(pending))
    return ok, failed


# Timer: 06:00 UTC = 01:00 hora Colombia (UTC-5). Formato NCRONTAB: s m h d M dow.
@app.timer_trigger(schedule="0 0 6 * * *", arg_name="timer", run_on_startup=False,
                   use_monitor=True)
def daily_mirror(timer: func.TimerRequest) -> None:
    logging.info("Inicio espejo diario %s", datetime.datetime.utcnow().isoformat())
    if timer.past_due:
        logging.info("Timer atrasado; corriendo ahora.")
    run_mirror()


# Endpoint HTTP para disparar el espejo a demanda (prueba/manual).
# ?force=1 ignora el estado y resube todo.
@app.route(route="run", auth_level=func.AuthLevel.FUNCTION)
def run_now(req: func.HttpRequest) -> func.HttpResponse:
    force = req.params.get("force") in ("1", "true", "yes")
    ok, failed = run_mirror(force_all=force)
    return func.HttpResponse(f"Espejo OK. subidos={ok} fallidos={failed}", status_code=200)
