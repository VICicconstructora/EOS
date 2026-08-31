"""Scraping 2 — ingesta de una carpeta LOCAL a SharePoint.

Independiente del scraper de SharePoint (`sharepoint_scraper.py`), que se deja
intacto. Aquí:

  1. Recorre una carpeta local (recursivo).
  2. Convierte cada archivo soportado a Markdown con MarkItDown.
  3. Escribe un espejo .md en una carpeta local aparte (no sincronizada a la nube).
  4. Sube ese .md a SharePoint (biblioteca 'AA General Edicion', carpeta
     `.AI/_local-ingest/<prefix>/...`) vía Microsoft Graph, para que VIC lo
     encuentre con su búsqueda en vivo (Graph Search) igual que cualquier otro
     documento del wiki.

Antes escribía a la tabla `wiki_documents` de Supabase — esa tabla ya no
existe (VIC dejó de indexar el wiki en Supabase, lee SharePoint en vivo).
Ver `sharepoint_upload.py` para el detalle de la subida.

Uso:
  python local_ingest.py --src "C:\\...\\Juridico - Documentos" \
      --prefix juridico --mirror C:\\scraping2\\juridico --workers 5
"""

import os
import sys
import csv
import argparse
import threading
from datetime import datetime, timezone
from concurrent.futures import as_completed
from concurrent.futures import TimeoutError as FuturesTimeoutError

from pebble import ProcessPool, ProcessExpired

import logging

from dotenv import load_dotenv
from markitdown import MarkItDown

from sharepoint_upload import upload_markdown

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

# Mismas extensiones que el scraper primario: lo que MarkItDown sabe convertir.
SUPPORTED_EXTS = {
    ".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls",
    ".md", ".txt", ".html", ".htm", ".csv", ".json", ".xml",
}

# MarkItDown por hilo (evita compartir estado entre conversiones concurrentes).
_tl = threading.local()


def get_md():
    if not hasattr(_tl, "md"):
        _tl.md = MarkItDown()
    return _tl.md


def _convert_worker(full_path):
    """Corre en un proceso worker de pebble: SOLO convierte y devuelve el texto
    (o '' si vacío/escaneado). Aislar la conversión en un proceso aparte permite
    matarla por timeout — un archivo patológico que hace *spin* de CPU no se puede
    interrumpir desde un hilo (el GIL queda tomado). El resto (espejo, subida a
    SharePoint) se maneja en el proceso principal, donde vive el estado compartido."""
    try:
        text = (get_md().convert(full_path).text_content or "").strip()
    except Exception as e:
        # Pebble serializa la excepcion completa (con su cadena __cause__/
        # __context__) para devolverla al proceso principal. Si algo en esa
        # cadena trae un traceback no picklable, el pickle mismo revienta con
        # "cannot pickle 'traceback' object" y se pierde el motivo real del
        # fallo. Se relanza plana y sin cadena (`from None`) para que el
        # mensaje de verdad llegue al `except Exception as e` que lo imprime
        # en el bucle principal.
        raise RuntimeError(f"{type(e).__name__}: {e}") from None
    # Postgres/Graph rechazan el byte nulo; MarkItDown lo deja en algunos PDFs.
    return text.replace("\x00", "")


def build_file_path(prefix, src_root, full_path):
    """prefix + ruta relativa del archivo, con separadores POSIX."""
    rel = os.path.relpath(full_path, src_root).replace("\\", "/")
    return f"{prefix.rstrip('/')}/{rel}"


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
    return dest


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


def precheck(src_root, mirror_root, full_path):
    """Decide si el archivo se omite (ya-hecho) antes de gastar un worker en él.

    Idempotencia por el espejo LOCAL: si ya existe el .md y su fecha de
    modificación es >= a la del origen, no hay nada que reprocesar. (Ya no hay
    tabla remota que consultar; el espejo local ES el caché.)
    Devuelve (skip, file_path, mtime).
    """
    file_path = build_file_path("", src_root, full_path)
    try:
        src_mtime = os.path.getmtime(full_path)
    except Exception:
        src_mtime = 0

    dest = os.path.join(mirror_root, os.path.relpath(full_path, src_root)) + ".md"
    if os.path.exists(dest) and os.path.getmtime(dest) >= src_mtime:
        with _lock:
            _stats["skip"] += 1
        record("omitido", full_path, file_path, "", "")
        return True, file_path

    return False, file_path


def finish_file(prefix, src_root, mirror_root, full_path, file_path, markdown_text):
    """Maneja el resultado de la conversión (ya hecha en un worker): escribe el
    espejo local y sube el .md a SharePoint. Corre en el proceso principal."""
    if not markdown_text:
        with _lock:
            _stats["empty"] += 1
        record("vacio_escaneado", full_path, file_path, 0, 0)
        print(f"  Vacío (¿escaneado?), omitido: {file_path}")
        return

    title = os.path.basename(full_path)
    content = f"# {title}\n\n{markdown_text}"
    rel = os.path.relpath(full_path, src_root).replace("\\", "/")

    ok, detail = upload_markdown(prefix, rel, content)
    if not ok:
        with _lock:
            _stats["error"] += 1
        record("error", full_path, file_path, len(markdown_text), 0)
        print(f"  ERROR subiendo a SharePoint {file_path}: {detail[:150]}")
        return

    # El espejo se escribe SOLO si la subida tuvo éxito: precheck() usa su
    # existencia + mtime como caché de "ya hecho". Escribirlo antes dejaría un
    # .md en disco con mtime fresco aunque un 429/5xx transitorio tumbara la
    # subida — la próxima corrida lo saltaría para siempre y el documento
    # desaparecería en silencio del índice de VIC (el _index.csv no rescata
    # esto: main() lo trunca en cada arranque).
    try:
        write_mirror(mirror_root, src_root, full_path, markdown_text)
    except Exception as e:
        print(f"  Aviso: no se pudo escribir espejo de {file_path}: {str(e)[:80]}")

    with _lock:
        _stats["ok"] += 1
        n = _stats["ok"]
    record("convertido", full_path, file_path, len(markdown_text), 1)
    print(f"  [{n}] SharePoint: {detail} ← {file_path}")


def main():
    ap = argparse.ArgumentParser(description="Ingesta local → SharePoint (biblioteca AA General Edicion).")
    ap.add_argument("--src", required=True, help="Carpeta local a ingestar (recursivo).")
    ap.add_argument("--prefix", default="juridico", help="Subcarpeta destino en SharePoint bajo .AI/_local-ingest/.")
    ap.add_argument("--mirror", default=r"C:\scraping2\juridico", help="Carpeta del espejo .md local.")
    ap.add_argument("--workers", type=int, default=5, help="Procesos worker en paralelo.")
    ap.add_argument("--limit", type=int, default=0, help="Máx. archivos (0 = sin límite).")
    ap.add_argument("--convert-timeout", type=int, default=180,
                    help="Segundos máx. por archivo; si se pasa, se mata el worker "
                         "colgado, se marca 'timeout' y se sigue (0 = sin límite).")
    ap.add_argument("--mirror-only", action="store_true",
                    help="Solo escribe el espejo .md en disco; NO sube nada a SharePoint.")
    args = ap.parse_args()

    if not os.path.isdir(args.src):
        print(f"No existe la carpeta: {args.src}")
        sys.exit(1)

    print(f"Origen: {args.src}")
    print(f"Modo: {'MIRROR-ONLY (sin SharePoint)' if args.mirror_only else 'ingesta a SharePoint (.AI/_local-ingest/' + args.prefix + '/)'}")
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

    timeout = args.convert_timeout or None
    with ProcessPool(max_workers=args.workers) as pool:
        fmap = {}
        for p in files:
            skip, fp = precheck(args.src, args.mirror, p)
            if skip:
                continue
            fut = pool.schedule(_convert_worker, args=(p,), timeout=timeout)
            fmap[fut] = (p, fp)

        for fut in as_completed(fmap):
            full_path, file_path = fmap[fut]
            try:
                text = fut.result()
            except FuturesTimeoutError:
                with _lock:
                    _stats["error"] += 1
                record("timeout", full_path, file_path, "", "")
                print(f"  TIMEOUT (>{args.convert_timeout}s) — worker reiniciado, "
                      f"omitido: {file_path}")
                continue
            except ProcessExpired as e:
                with _lock:
                    _stats["error"] += 1
                record("error", full_path, file_path, "", "")
                print(f"  Worker murió ({e}) convirtiendo: {file_path}")
                continue
            except Exception as e:
                with _lock:
                    _stats["error"] += 1
                record("error", full_path, file_path, "", "")
                print(f"  ERROR convirtiendo {file_path}: {str(e)[:120]}")
                continue

            if args.mirror_only:
                if not text:
                    with _lock:
                        _stats["empty"] += 1
                    record("vacio_escaneado", full_path, file_path, 0, 0)
                    continue
                try:
                    write_mirror(args.mirror, args.src, full_path, text)
                    with _lock:
                        _stats["ok"] += 1
                        n = _stats["ok"]
                    record("convertido", full_path, file_path, len(text), 1)
                    print(f"  [{n}] (.md local) ← {file_path}")
                except Exception as e:
                    with _lock:
                        _stats["error"] += 1
                    print(f"  ERROR escribiendo espejo de {file_path}: {str(e)[:120]}")
                continue

            finish_file(args.prefix, args.src, args.mirror, full_path, file_path, text)

    if _manifest_fh is not None:
        _manifest_fh.close()

    print(
        f"\nHecho. Guardados: {_stats['ok']} | Omitidos: {_stats['skip']} | "
        f"Vacíos/escaneados: {_stats['empty']} | Errores: {_stats['error']}"
    )
    print(f"Índice escrito en: {os.path.join(args.mirror, '_index.csv')}")


if __name__ == "__main__":
    main()
