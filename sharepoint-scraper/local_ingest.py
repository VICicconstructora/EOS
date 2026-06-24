"""Scraping 2 — ingesta de una carpeta LOCAL a wiki_documents.

Independiente del scraper de SharePoint (`sharepoint_scraper.py`), que se deja
intacto. Aquí:

  1. Recorre una carpeta local (recursivo).
  2. Convierte cada archivo soportado a Markdown con MarkItDown.
  3. Escribe un espejo .md en una carpeta local aparte (no sincronizada a la nube).
  4. "Empata" con el proceso primario: inserta los chunks en la MISMA tabla
     `wiki_documents` de Supabase, con un prefijo propio (`local/<algo>/...`)
     para quedar identificable y separado de `sharepoint/` y `wiki/`.

SIN embeddings (solo texto): la columna `search_vector` se genera sola en
Postgres, así que la búsqueda léxica de VIC funciona de inmediato sin pasar por
la cuota de ninguna API. Lo semántico se puede añadir después con un modelo local.

Uso:
  python local_ingest.py --src "C:\\...\\Juridico - Documentos" \
      --prefix local/juridico --mirror C:\\scraping2\\juridico --workers 5
"""

import os
import sys
import csv
import argparse
import threading
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

import logging

import tiktoken
from dotenv import load_dotenv
from supabase import create_client
from markitdown import MarkItDown

# pdfminer escupe miles de "Could not get FontBBox" al parsear PDFs; ruido puro.
logging.getLogger("pdfminer").setLevel(logging.ERROR)

# UTF-8 en salida: nombres con tildes no deben tumbar la corrida en Windows.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# .env centralizado en la raíz del repo (mismo que el scraper primario).
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

CHUNK_TOKENS = 500
CHUNK_OVERLAP = 50

# Mismas extensiones que el scraper primario: lo que MarkItDown sabe convertir.
SUPPORTED_EXTS = {
    ".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls",
    ".md", ".txt", ".html", ".htm", ".csv", ".json", ".xml",
}

encoder = tiktoken.get_encoding("cl100k_base")

# MarkItDown por hilo (evita compartir estado entre conversiones concurrentes).
_tl = threading.local()


def get_md():
    if not hasattr(_tl, "md"):
        _tl.md = MarkItDown()
    return _tl.md


def chunk_text(text):
    """Trocea en fragmentos de ~CHUNK_TOKENS tokens con solape (igual al primario)."""
    tokens = encoder.encode(text)
    if not tokens:
        return []
    chunks = []
    step = CHUNK_TOKENS - CHUNK_OVERLAP
    for start in range(0, len(tokens), step):
        window = tokens[start : start + CHUNK_TOKENS]
        if not window:
            break
        chunk = encoder.decode(window).strip()
        if chunk:
            chunks.append(chunk)
        if start + CHUNK_TOKENS >= len(tokens):
            break
    return chunks


def build_file_path(prefix, src_root, full_path):
    """prefix + ruta relativa del archivo, con separadores POSIX."""
    rel = os.path.relpath(full_path, src_root).replace("\\", "/")
    return f"{prefix.rstrip('/')}/{rel}"


def load_index_cache(supabase, prefix):
    """file_path -> updated_at[:19] de lo ya ingestado bajo este prefijo."""
    cache = {}
    page, size = 0, 1000
    like = f"{prefix.rstrip('/')}/%"
    while True:
        try:
            resp = (
                supabase.table("wiki_documents")
                .select("file_path,updated_at")
                .eq("chunk_index", 0)
                .like("file_path", like)
                .range(page * size, page * size + size - 1)
                .execute()
            )
        except Exception as e:
            print(f"No se pudo cargar el caché (pág {page}): {e}")
            break
        rows = resp.data or []
        for r in rows:
            fp = r.get("file_path")
            if fp:
                cache[fp] = (r.get("updated_at") or "")[:19]
        if len(rows) < size:
            break
        page += 1
    print(f"Caché de ya-ingestado bajo '{prefix}': {len(cache)} archivos.")
    return cache


def write_mirror(mirror_root, src_root, full_path, markdown_text):
    r"""Escribe el .md espejo manteniendo la estructura de carpetas.

    Rutas normales (sin prefijo \\?\): ese prefijo saltea el filtro de OneDrive
    y rompe la hidratación de los archivos 'solo en la nube'. Las rutas >260 se
    resuelven habilitando LongPathsEnabled en Windows, no en el código.
    """
    rel = os.path.relpath(full_path, src_root)
    dest = os.path.join(mirror_root, rel) + ".md"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        f.write(markdown_text)


# Contadores globales protegidos por lock.
_lock = threading.Lock()
_stats = {"ok": 0, "skip": 0, "empty": 0, "error": 0}

# Manifiesto (índice CSV): una fila por archivo con su resultado, para saber qué
# se convirtió y qué quedó vacío/escaneado (candidato a OCR después).
_manifest = None          # csv.writer
_manifest_fh = None       # handle del archivo
_manifest_lock = threading.Lock()


def record(status, src_path, file_path, chars, chunks):
    """Escribe una fila en el índice. status: convertido | vacio_escaneado | error | omitido."""
    if _manifest is None:
        return
    with _manifest_lock:
        _manifest.writerow([status, chars, chunks, file_path, src_path])
        _manifest_fh.flush()


def process_file(supabase, prefix, src_root, mirror_root, cache, full_path):
    file_path = build_file_path(prefix, src_root, full_path)
    try:
        mtime = datetime.fromtimestamp(
            os.path.getmtime(full_path), tz=timezone.utc
        ).isoformat()
    except Exception:
        mtime = datetime.now(timezone.utc).isoformat()

    # Omitir si ya está y no cambió.
    if cache.get(file_path) == mtime[:19]:
        with _lock:
            _stats["skip"] += 1
        record("omitido", full_path, file_path, "", "")
        return

    try:
        result = get_md().convert(full_path)
        markdown_text = (result.text_content or "").strip()
    except Exception as e:
        with _lock:
            _stats["error"] += 1
        record("error", full_path, file_path, "", "")
        print(f"  ERROR convirtiendo {file_path}: {str(e)[:120]}")
        return

    if not markdown_text:
        with _lock:
            _stats["empty"] += 1
        record("vacio_escaneado", full_path, file_path, 0, 0)
        print(f"  Vacío (¿escaneado?), omitido: {file_path}")
        return

    # Espejo local del .md.
    try:
        write_mirror(mirror_root, src_root, full_path, markdown_text)
    except Exception as e:
        print(f"  Aviso: no se pudo escribir espejo de {file_path}: {str(e)[:80]}")

    chunks = chunk_text(markdown_text)
    if not chunks:
        with _lock:
            _stats["empty"] += 1
        record("vacio_escaneado", full_path, file_path, len(markdown_text), 0)
        return

    title = os.path.basename(full_path)
    rows = [
        {
            "file_path": file_path,
            "title": title,
            "content": chunk,
            "chunk_index": idx,
            "updated_at": mtime,  # SIN embedding: solo texto.
        }
        for idx, chunk in enumerate(chunks)
    ]

    try:
        # Reemplazo limpio: borrar chunks previos y reinsertar.
        supabase.table("wiki_documents").delete().eq("file_path", file_path).execute()
        supabase.table("wiki_documents").upsert(
            rows, on_conflict="file_path,chunk_index"
        ).execute()
        with _lock:
            _stats["ok"] += 1
            n = _stats["ok"]
        cache[file_path] = mtime[:19]
        record("convertido", full_path, file_path, len(markdown_text), len(rows))
        print(f"  [{n}] {len(rows)} chunks ← {file_path}")
    except Exception as e:
        with _lock:
            _stats["error"] += 1
        record("error", full_path, file_path, len(markdown_text), 0)
        print(f"  ERROR guardando {file_path}: {str(e)[:120]}")


def main():
    ap = argparse.ArgumentParser(description="Ingesta local → wiki_documents (sin embeddings).")
    ap.add_argument("--src", required=True, help="Carpeta local a ingestar (recursivo).")
    ap.add_argument("--prefix", default="local/juridico", help="Prefijo de file_path en la tabla.")
    ap.add_argument("--mirror", default=r"C:\scraping2\juridico", help="Carpeta del espejo .md.")
    ap.add_argument("--workers", type=int, default=5, help="Hilos en paralelo.")
    ap.add_argument("--limit", type=int, default=0, help="Máx. archivos (0 = sin límite).")
    args = ap.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Faltan SUPABASE_URL / SUPABASE_KEY en el .env raíz.")
        sys.exit(1)
    if not os.path.isdir(args.src):
        print(f"No existe la carpeta: {args.src}")
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    print(f"Origen: {args.src}")
    print(f"Prefijo en tabla: {args.prefix}/")
    print(f"Espejo .md: {args.mirror}")
    print(f"Hilos: {args.workers}")

    # Recolectar archivos soportados.
    files = []
    for dp, _, fn in os.walk(args.src):
        for f in fn:
            if os.path.splitext(f)[1].lower() in SUPPORTED_EXTS:
                files.append(os.path.join(dp, f))
    if args.limit:
        files = files[: args.limit]
    print(f"Archivos soportados a procesar: {len(files)}")

    # Índice CSV: convive con el espejo .md. Útil para luego pasar OCR a los
    # 'vacio_escaneado'. Modo 'w': se reconstruye en cada corrida completa.
    global _manifest, _manifest_fh
    os.makedirs(args.mirror, exist_ok=True)
    index_path = os.path.join(args.mirror, "_index.csv")
    _manifest_fh = open(index_path, "w", newline="", encoding="utf-8-sig")
    _manifest = csv.writer(_manifest_fh)
    _manifest.writerow(["status", "chars", "chunks", "file_path", "src_path"])
    print(f"Índice: {index_path}")

    cache = load_index_cache(supabase, args.prefix)

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [
            ex.submit(process_file, supabase, args.prefix, args.src, args.mirror, cache, p)
            for p in files
        ]
        for _ in as_completed(futs):
            pass

    if _manifest_fh is not None:
        _manifest_fh.close()

    print(
        f"\nHecho. Guardados: {_stats['ok']} | Omitidos: {_stats['skip']} | "
        f"Vacíos/escaneados: {_stats['empty']} | Errores: {_stats['error']}"
    )
    print(f"Índice escrito en: {os.path.join(args.mirror, '_index.csv')}")


if __name__ == "__main__":
    main()
