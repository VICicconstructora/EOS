"""Subida de contenido ingerido LOCALMENTE a SharePoint (reemplaza el índice
propio en Supabase, que dejó de existir el 2026-08-20).

VIC lee el wiki EN VIVO desde SharePoint (Graph Search), ya no hay tabla
`wiki_documents`. Para que lo que ingesta `local_ingest.py`/`local_ocr_ingest.py`
(carpetas que aún no están en SharePoint) sea visible para VIC, tiene que
aterrizar como archivo real en SharePoint — no en Supabase.

Reusa el mismo registro de Azure del scraper (SP_AZURE_CLIENT_ID/SECRET,
'Claude-SharePoint-Actas'): confirmado con una escritura de prueba que
también tiene permiso de escritura (Sites.ReadWrite.All), no solo lectura.

Mismo drive destino que usaba el espejo `azure-mirror` (retirado): biblioteca
'AA General Edicion' (subsitio de GND), carpeta `.AI/_local-ingest/<prefix>/`
— separada de `.AI/_sharepoint/` (esa era del espejo retirado, no reusar).
"""

import os
import re
import time

import httpx
from azure.identity import ClientSecretCredential

# Leídas en _get_token(), no acá arriba: los módulos que importan este
# archivo (local_ingest.py, sharepoint_scraper.py) llaman a load_dotenv()
# DESPUÉS del import, así que una lectura a nivel de módulo siempre capturaba
# vacío. Nunca se disparó en producción porque el único caller que ya corrió
# de verdad (local_ingest.py --mirror-only) no llega a pedir un token.

# Drive de 'AA General Edicion', verificado vía Graph (mismo que usaba
# azure-mirror para el espejo, ahora retirado).
TARGET_DRIVE_ID = os.getenv(
    "LOCAL_INGEST_DRIVE_ID",
    "b!bROTReHG9UOp8Z59fHTFzvv44lRutSlCmcSSNCZTpxSr0fyjYmv5S5mNTbeBMQVB",
)
TARGET_ROOT = os.getenv("LOCAL_INGEST_TARGET_ROOT", ".AI/_local-ingest")

GRAPH = "https://graph.microsoft.com/v1.0"

# Límite de subida simple de Graph. Un .md convertido rara vez lo pasa; si
# pasa, se omite con aviso en vez de fallar (subida por sesión no implementada).
SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024

_token_cache = {"value": None, "exp": 0}


def _get_token():
    now = time.time()
    if _token_cache["value"] and now < _token_cache["exp"] - 60:
        return _token_cache["value"]
    tenant_id = os.getenv("AZURE_TENANT_ID")
    client_id = os.getenv("SP_AZURE_CLIENT_ID")
    client_secret = os.getenv("SP_AZURE_CLIENT_SECRET")
    if not tenant_id or not client_id or not client_secret:
        raise RuntimeError("Faltan AZURE_TENANT_ID / SP_AZURE_CLIENT_ID / SP_AZURE_CLIENT_SECRET.")
    cred = ClientSecretCredential(tenant_id=tenant_id, client_id=client_id, client_secret=client_secret)
    token = cred.get_token("https://graph.microsoft.com/.default")
    _token_cache["value"] = token.token
    _token_cache["exp"] = now + (token.expires_on - time.time())
    return token.token


def safe_rel_path(rel_path):
    """Sanea cada segmento de la ruta para que sea válido como item de Graph."""
    parts = []
    for seg in rel_path.replace("\\", "/").split("/"):
        seg = re.sub(r'[<>:"|?*]', "_", seg).strip().rstrip(".")
        if len(seg) > 120:
            seg = seg[:120].strip()
        if seg:
            parts.append(seg)
    return "/".join(parts) if parts else "sin_nombre"


def download_bytes(full_path):
    """Descarga un archivo del drive destino vía Graph. None si no existe (404)."""
    full_path = safe_rel_path(full_path)
    url = f"{GRAPH}/drives/{TARGET_DRIVE_ID}/root:/{full_path}:/content"
    token = _get_token()
    with httpx.Client() as client:
        r = client.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=60)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.content


def upload_bytes(full_path, data, content_type="application/octet-stream"):
    """Sube/reemplaza un archivo en <full_path> (ya bajo TARGET_ROOT si aplica)
    vía Graph PUT. Reintenta ante 429/5xx. Devuelve (ok: bool, detail: str).

    A diferencia de upload_markdown, no fuerza extensión ni antepone un
    prefijo de contenido: se usa para archivos de estado/metadata (JSON), no
    para los documentos ingeridos.
    """
    full_path = safe_rel_path(full_path)
    if len(data) > SIMPLE_UPLOAD_LIMIT:
        return False, f"archivo > 4MB ({len(data)} bytes), subida simple no alcanza"
    url = f"{GRAPH}/drives/{TARGET_DRIVE_ID}/root:/{full_path}:/content"
    with httpx.Client() as client:
        for attempt in range(5):
            token = _get_token()
            r = client.put(
                url,
                headers={"Authorization": f"Bearer {token}", "Content-Type": content_type},
                content=data,
                timeout=120,
            )
            if r.status_code in (200, 201):
                return True, full_path
            if r.status_code == 429 or r.status_code >= 500:
                wait = int(r.headers.get("Retry-After", "0") or "0") or (2 ** attempt)
                time.sleep(min(wait, 30))
                continue
            return False, f"{r.status_code}: {r.text[:200]}"
        return False, "reintentos agotados"


def upload_markdown(prefix, rel_path, markdown_text, client=None):
    """Sube/reemplaza un .md en TARGET_ROOT/<prefix>/<rel_path> vía Graph PUT.

    Reintenta ante 429/5xx respetando Retry-After. Devuelve (ok: bool, detail: str).
    """
    data = markdown_text.encode("utf-8")
    if len(data) > SIMPLE_UPLOAD_LIMIT:
        return False, f"archivo > 4MB tras convertir ({len(data)} bytes), subida simple no alcanza"

    full_path = safe_rel_path(f"{TARGET_ROOT}/{prefix}/{rel_path}")
    if not full_path.lower().endswith(".md"):
        full_path += ".md"
    url = f"{GRAPH}/drives/{TARGET_DRIVE_ID}/root:/{full_path}:/content"

    own_client = client is None
    if own_client:
        client = httpx.Client()
    try:
        for attempt in range(5):
            token = _get_token()
            r = client.put(
                url,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "text/markdown"},
                content=data,
                timeout=120,
            )
            if r.status_code in (200, 201):
                return True, full_path
            if r.status_code == 429 or r.status_code >= 500:
                wait = int(r.headers.get("Retry-After", "0") or "0") or (2 ** attempt)
                time.sleep(min(wait, 30))
                continue
            return False, f"{r.status_code}: {r.text[:200]}"
        return False, "reintentos agotados"
    finally:
        if own_client:
            client.close()
