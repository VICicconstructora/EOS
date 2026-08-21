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

TENANT_ID = os.getenv("AZURE_TENANT_ID")
CLIENT_ID = os.getenv("SP_AZURE_CLIENT_ID")
CLIENT_SECRET = os.getenv("SP_AZURE_CLIENT_SECRET")

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
    if not TENANT_ID or not CLIENT_ID or not CLIENT_SECRET:
        raise RuntimeError("Faltan AZURE_TENANT_ID / SP_AZURE_CLIENT_ID / SP_AZURE_CLIENT_SECRET.")
    cred = ClientSecretCredential(tenant_id=TENANT_ID, client_id=CLIENT_ID, client_secret=CLIENT_SECRET)
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
