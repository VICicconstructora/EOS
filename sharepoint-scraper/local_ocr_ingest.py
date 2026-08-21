"""OCR de PDFs escaneados → SharePoint (sin embeddings).

Complemento de `local_ingest.py`. Aquel ingesta lo que MarkItDown sabe leer;
los PDFs escaneados (imagen sin capa de texto) quedan vacíos y NO entran. Este
script los rescata con OCR (Tesseract-español) y los sube a SharePoint con
Graph, al mismo destino que `local_ingest.py` (`.AI/_local-ingest/<prefix>/`),
para que VIC los encuentre con su búsqueda en vivo igual que el resto.

Motor: PyMuPDF (render de páginas, sin poppler/ghostscript) + Tesseract 5 vía
pytesseract. El idioma `spa` vive en un tessdata de usuario (no en Program
Files, que requiere admin) apuntado por TESSDATA_PREFIX.

Selección de candidatos: recorre --src y, para cada PDF, si YA existe un .md
no vacío en el espejo de `local_ingest.py` (--text-mirror) bajo su ruta
relativa, lo omite (ya tiene texto, no necesita OCR). Si no, es candidato.
Ya no consulta ninguna tabla remota (antes: wiki_documents en Supabase, que
dejó de existir — VIC lee SharePoint en vivo).

Uso:
  python local_ocr_ingest.py --src "C:\\...\\2. REQUERIMIENTOS ADMINISTRATIVOS" \
      --prefix "juridico/2. REQUERIMIENTOS ADMINISTRATIVOS" \
      --mirror "C:\\scraping2\\juridico-ocr\\2. REQUERIMIENTOS ADMINISTRATIVOS" --workers 4
"""

import os
import io
import sys
import csv
import argparse
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import logging

from dotenv import load_dotenv

import fitz  # PyMuPDF
from PIL import Image
import pytesseract

from sharepoint_upload import upload_markdown

logging.getLogger("pdfminer").setLevel(logging.ERROR)

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# --- Tesseract: binario en Program Files, idiomas en tessdata de usuario ---
TESSERACT_CMD = os.getenv(
    "TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)
TESSDATA_DIR = os.getenv(
    "TESSDATA_PREFIX", os.path.join(os.getenv("LOCALAPPDATA", ""), "tessdata")
)
if os.path.isdir(TESSDATA_DIR):
    os.environ["TESSDATA_PREFIX"] = TESSDATA_DIR
pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


def build_file_path(prefix, src_root, full_path):
    rel = os.path.relpath(full_path, src_root).replace("\\", "/")
    return f"{prefix.rstrip('/')}/{rel}"


def load_done_set(text_mirror, src_root, pdfs):
    """PDFs que YA tienen un .md no vacío en el espejo de local_ingest.py.

    Reemplaza la vieja consulta a Supabase: la fuente de verdad de "ya tiene
    texto" es el espejo local que deja local_ingest.py (mismo árbol de carpetas).
    """
    done = set()
    if not text_mirror or not os.path.isdir(text_mirror):
        return done
    for p in pdfs:
        rel = os.path.relpath(p, src_root)
        md_path = os.path.join(text_mirror, rel) + ".md"
        if os.path.isfile(md_path) and os.path.getsize(md_path) > 0:
            done.add(p)
    print(f"Ya con texto (espejo de local_ingest): {len(done)} archivos (se omiten).")
    return done


def ocr_pdf(full_path, dpi, lang, cfg, max_pages):
    """Devuelve (texto, n_paginas_ocr). Render + Tesseract por página."""
    parts = []
    doc = fitz.open(full_path)
    n = min(doc.page_count, max_pages) if max_pages else doc.page_count
    for i in range(n):
        pix = doc[i].get_pixmap(dpi=dpi)
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        txt = pytesseract.image_to_string(img, lang=lang, config=cfg)
        if txt and txt.strip():
            parts.append(txt.strip())
    doc.close()
    return "\n\n".join(parts).strip(), n


def write_mirror(mirror_root, src_root, full_path, markdown_text):
    rel = os.path.relpath(full_path, src_root)
    dest = os.path.join(mirror_root, rel) + ".ocr.md"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        f.write(markdown_text)


_lock = threading.Lock()
_stats = {"ocr_ok": 0, "skip": 0, "vacio": 0, "error": 0}

_manifest = None
_manifest_fh = None
_manifest_lock = threading.Lock()


def record(status, src_path, file_path, pages, chars, chunks):
    if _manifest is None:
        return
    with _manifest_lock:
        _manifest.writerow([status, pages, chars, chunks, file_path, src_path])
        _manifest_fh.flush()


def process_pdf(prefix, src_root, mirror_root, done, args, full_path):
    file_path = build_file_path(prefix, src_root, full_path)

    # Resumable: si ya existe el .ocr.md, no reprocesar (vale en ambos modos).
    ocr_md = os.path.join(mirror_root, os.path.relpath(full_path, src_root)) + ".ocr.md"
    if os.path.exists(ocr_md):
        with _lock:
            _stats["skip"] += 1
        record("omitido", full_path, file_path, "", "", "")
        return

    if full_path in done:
        with _lock:
            _stats["skip"] += 1
        record("omitido", full_path, file_path, "", "", "")
        return

    try:
        text, pages = ocr_pdf(full_path, args.dpi, args.lang, args.cfg, args.max_pages)
    except Exception as e:
        with _lock:
            _stats["error"] += 1
        record("error", full_path, file_path, "", "", "")
        print(f"  ERROR OCR {file_path}: {str(e)[:120]}")
        return

    if not text:
        with _lock:
            _stats["vacio"] += 1
        record("vacio_tras_ocr", full_path, file_path, pages, 0, 0)
        print(f"  Vacío tras OCR ({pages} pág): {file_path}")
        return

    try:
        write_mirror(mirror_root, src_root, full_path, text)
    except Exception as e:
        print(f"  Aviso: no se pudo escribir espejo de {file_path}: {str(e)[:80]}")

    if args.mirror_only:
        # Modo mirror-only: el .ocr.md ya quedó en disco; no se sube a SharePoint.
        with _lock:
            _stats["ocr_ok"] += 1
            k = _stats["ocr_ok"]
        record("ocr_ok", full_path, file_path, pages, len(text), 1)
        print(f"  [{k}] OCR {pages} pág (.ocr.md) ← {file_path}")
        return

    title = os.path.basename(full_path)
    rel = os.path.relpath(full_path, src_root).replace("\\", "/")
    content = f"# {title}\n\n{text}"

    ok, detail = upload_markdown(prefix, rel, content)
    if ok:
        with _lock:
            _stats["ocr_ok"] += 1
            k = _stats["ocr_ok"]
        record("ocr_ok", full_path, file_path, pages, len(text), 1)
        print(f"  [{k}] OCR {pages} pág → SharePoint: {detail} ← {file_path}")
    else:
        with _lock:
            _stats["error"] += 1
        record("error", full_path, file_path, pages, len(text), 0)
        print(f"  ERROR subiendo a SharePoint {file_path}: {detail[:150]}")


def main():
    ap = argparse.ArgumentParser(description="OCR de PDFs escaneados → SharePoint.")
    ap.add_argument("--src", required=True, help="Carpeta local a recorrer (recursivo).")
    ap.add_argument("--prefix", required=True, help="Subcarpeta destino en SharePoint (igual a local_ingest).")
    ap.add_argument("--mirror", default=r"C:\scraping2\juridico-ocr", help="Carpeta del espejo .ocr.md e índice.")
    ap.add_argument("--workers", type=int, default=4, help="Hilos en paralelo.")
    ap.add_argument("--limit", type=int, default=0, help="Máx. PDFs (0 = sin límite).")
    ap.add_argument("--dpi", type=int, default=300, help="DPI de render (300 recomendado).")
    ap.add_argument("--lang", default="spa", help="Idioma(s) Tesseract, ej 'spa' o 'spa+eng'.")
    ap.add_argument("--max-pages", type=int, default=50, help="Tope de páginas por PDF (0 = todas).")
    ap.add_argument("--mirror-only", action="store_true",
                    help="Solo escribe .ocr.md en disco; NO sube nada a SharePoint.")
    ap.add_argument("--text-mirror", default=None,
                    help="Espejo de local_ingest.py (con los .md ya convertidos). Los PDFs que ya "
                         "tengan .md no vacío ahí se omiten (no necesitan OCR). Default: --mirror.")
    args = ap.parse_args()
    args.cfg = "--oem 1 --psm 3"

    if not os.path.isfile(TESSERACT_CMD):
        print(f"No existe tesseract en: {TESSERACT_CMD}. Ajusta TESSERACT_CMD.")
        sys.exit(1)
    if not os.path.isdir(args.src):
        print(f"No existe la carpeta: {args.src}")
        sys.exit(1)

    print(f"Origen: {args.src}")
    print(f"Modo: {'MIRROR-ONLY (sin SharePoint)' if args.mirror_only else 'ingesta a SharePoint (.AI/_local-ingest/' + args.prefix + '/)'}")
    print(f"Tesseract: {TESSERACT_CMD} | lang={args.lang} | dpi={args.dpi}")
    print(f"tessdata: {os.environ.get('TESSDATA_PREFIX', '(default)')}")
    print(f"Espejo OCR: {args.mirror} | Hilos: {args.workers}")

    pdfs = []
    for dp, _, fn in os.walk(args.src):
        for f in fn:
            if f.lower().endswith(".pdf"):
                pdfs.append(os.path.join(dp, f))
    print(f"PDFs encontrados: {len(pdfs)}")

    text_mirror = args.text_mirror or args.mirror
    done = load_done_set(text_mirror, args.src, pdfs)
    candidates = [p for p in pdfs if p not in done]
    if args.limit:
        candidates = candidates[: args.limit]
    print(f"Candidatos a OCR: {len(candidates)}")

    global _manifest, _manifest_fh
    os.makedirs(args.mirror, exist_ok=True)
    index_path = os.path.join(args.mirror, "_ocr_index.csv")
    _manifest_fh = open(index_path, "w", newline="", encoding="utf-8-sig")
    _manifest = csv.writer(_manifest_fh)
    _manifest.writerow(["status", "pages", "chars", "chunks", "file_path", "src_path"])
    print(f"Índice OCR: {index_path}")

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = [
            ex.submit(process_pdf, args.prefix, args.src, args.mirror, done, args, p)
            for p in candidates
        ]
        for _ in as_completed(futs):
            pass

    if _manifest_fh is not None:
        _manifest_fh.close()

    print(
        f"\nHecho. OCR guardados: {_stats['ocr_ok']} | Omitidos (ya tenían texto): {_stats['skip']} | "
        f"Vacíos tras OCR: {_stats['vacio']} | Errores: {_stats['error']}"
    )
    print(f"Índice: {index_path}")


if __name__ == "__main__":
    main()
