"""
pst_export — Vuelca un buzón .pst a una CARPETA CONSOLIDADA en markdown/texto.

Independiente de Supabase/VIC: solo extrae el contenido a disco para tener un
"second brain" navegable. Cada correo y cada adjunto se convierten a .md.

Salida (espeja el árbol de carpetas del buzón):
  <out>/<carpeta>/<asunto>__<hash>.md            (cuerpo del correo)
  <out>/<carpeta>/<asunto>__<hash>/<archivo>.md   (adjunto convertido a texto)
  <out>/_INDICE.csv                               (manifiesto de todo)

Filtros: solo MailItem; se podan subárboles de ruido; se descartan imágenes y
adjuntos ocultos (firmas inline); dedup por hash (adjuntos y cuerpos).

Uso:
  python pst_export.py --pst "C:\\...\\backup.pst" --out "C:\\...\\SecondBrain-Correo"
  python pst_export.py --pst "..." --out "..." --max-items 30      # prueba
"""
import os
import re
import csv
import sys
import time
import hashlib
import argparse
import tempfile
from concurrent.futures import TimeoutError as FuturesTimeoutError
from concurrent.futures.process import BrokenProcessPool

import subprocess

import win32com.client
from markitdown import MarkItDown
from pebble import ProcessPool, ProcessExpired
import pebble.pool.process as _pebble_pool


# --- Parche a pebble: que un worker inmatable no tumbe la corrida -------------
# pebble.common.stop_process hace terminate() + join(3 s) y, si el proceso sigue
# vivo, lanza RuntimeError. En Windows eso pasa cuando TerminateProcess se queda
# atascado (adjunto enorme sobre un archivo de OneDrive, I/O en modo kernel).
# El detalle grave: se ejecuta en el HILO GESTOR del pool. Al morir ese hilo,
# nadie completa los futures y el hilo principal se bloquea para siempre en
# fut.result() — el proceso queda zombi, 0 % de CPU, sin escribir nada. Así se
# perdieron ~39 h de export (JCAICEDO 13-ago, ralvarez 14-ago).
# Reemplazo: mismo intento, pero si falla se recurre a taskkill del árbol y
# JAMÁS se propaga la excepción. Perder un worker es aceptable; perder la
# corrida entera no.
_pebble_stop_process = _pebble_pool.stop_process


def _safe_stop_process(process):
    try:
        _pebble_stop_process(process)
        return
    except RuntimeError:
        pass
    except Exception:
        pass
    try:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(process.pid)],
                       capture_output=True, timeout=30)
        process.join(5)
    except Exception:
        pass
    if process.is_alive():
        print(f"  AVISO: worker PID {process.pid} no murió; la corrida sigue.")


# El nombre se enlaza en pebble.pool.process al importarse, así que hay que
# pisarlo AHÍ (parchear pebble.common no tendría efecto).
_pebble_pool.stop_process = _safe_stop_process

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

OL_MAIL = 43
OL_STORE_UNICODE = 3
PR_ATTACHMENT_HIDDEN = "http://schemas.microsoft.com/mapi/proptag/0x7FFE000B"

DOC_EXTS = {
    ".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".xlsm",
    ".csv", ".txt", ".md", ".html", ".htm", ".xml", ".json", ".msg", ".rtf",
}
IMG_EXTS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff", ".svg",
    ".ico", ".emf", ".wmf", ".webp",
}
SKIP_FOLDERS = {
    "problemas de sincronización", "sync issues", "conflictos", "conflicts",
    "errores locales", "local failures", "errores del servidor", "server failures",
    "correo no deseado", "junk email", "papelera", "elementos eliminados",
    "deleted items", "fuentes rss", "rss feeds", "yammer", "raíz de yammer",
    "personmetadata", "recipient cache", "conversation action settings",
    "configuración de pasos rápidos", "quick step settings", "webextaddins",
    "social activity notifications", "eventcheckpoints", "outbound", "inbound",
    "feeds",
}


def slug(text, maxlen=60):
    text = (text or "").replace("\n", " ").replace("\r", " ").strip()
    text = re.sub(r"[\\/:*?\"<>|]+", "-", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:maxlen].strip() or "sin-asunto"


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def short_hash(text):
    return hashlib.sha1((text or "").encode("utf-8", "replace")).hexdigest()[:10]


def sanitize(text):
    if not text:
        return text or ""
    text = text.replace("\x00", "")
    return re.sub(r"[\x01-\x08\x0b\x0c\x0e-\x1f]", "", text)


def to_iso(dt):
    if dt is None:
        return None
    try:
        from datetime import datetime
        return datetime(dt.year, dt.month, dt.day,
                        getattr(dt, "hour", 0), getattr(dt, "minute", 0),
                        getattr(dt, "second", 0)).isoformat(timespec="seconds")
    except Exception:
        try:
            return str(dt)[:19]
        except Exception:
            return None


def winlong(path):
    """Prefijo de ruta larga de Windows: evita el límite de 260 chars en árboles
    de carpetas profundos (Proyectos en Previo/Bogota/...)."""
    p = os.path.abspath(path).replace("/", "\\")
    if p.startswith("\\\\?\\"):
        return p
    if p.startswith("\\\\"):
        return "\\\\?\\UNC" + p[1:]
    return "\\\\?\\" + p


def find_store_by_path(ns, pst_path):
    """Devuelve el Store cuyo archivo es pst_path, o None.

    Más robusto que comparar Stores antes/después de AddStoreEx: si una corrida
    previa dejó el .pst ya montado (p.ej. se interrumpió sin RemoveStore), igual
    lo encuentra en vez de fallar con 'store nuevo no detectado'.
    """
    want = os.path.normcase(os.path.abspath(pst_path))
    for i in range(ns.Stores.Count):
        st = ns.Stores.Item(i + 1)
        try:
            fp = st.FilePath
        except Exception:
            fp = None
        if fp and os.path.normcase(os.path.abspath(fp)) == want:
            return st
    return None


def write_text(path, content):
    os.makedirs(winlong(os.path.dirname(path)), exist_ok=True)
    with open(winlong(path), "w", encoding="utf-8", errors="replace") as f:
        f.write(content)


_worker_md = None


def _convert_worker(path):
    """Corre en un proceso worker de pebble: SOLO convierte y devuelve el texto.

    Aislar la conversión permite matarla por timeout. Un adjunto patológico (un
    xlsx que hace spin de CPU y crece sin límite en RAM) no se puede interrumpir
    desde un hilo — el GIL queda tomado — y tumba la corrida entera. El tope por
    tamaño no basta: los tapones observados pesaban menos de 15 MB.
    """
    global _worker_md
    if _worker_md is None:
        _worker_md = MarkItDown()
    try:
        return (_worker_md.convert(path).text_content or "").strip()
    except Exception as e:
        # Pebble serializa la excepcion completa (con su cadena __cause__/
        # __context__) para devolverla al proceso principal. Si algo en esa
        # cadena trae un traceback no picklable, el pickle mismo revienta con
        # "cannot pickle 'traceback' object" y se pierde el motivo real del
        # fallo. Se relanza plana y sin cadena (`from None`) para que el
        # mensaje de verdad llegue al `except Exception as e` que lo imprime
        # en process_attachment().
        raise RuntimeError(f"{type(e).__name__}: {e}") from None


class PstExporter:
    def __init__(self, out_dir, max_items=0, include_deleted=False,
                 max_attach_mb=50, oversize_log=None, label="",
                 convert_timeout=180, timeout_log=None):
        self.out = os.path.abspath(out_dir)
        self.max_items = max_items
        self.include_deleted = include_deleted
        # La conversión vive en un proceso aparte (ver _convert_worker): así se
        # puede matar por timeout. El pool se abre en run().
        self.convert_timeout = convert_timeout or None
        self.pool = None
        self.seen_attach = set()   # hash -> ya escrito (dedup)
        self.seen_body = set()
        self.manifest = []         # filas para _INDICE.csv
        # Adjuntos por encima de este tamaño se OMITEN (cuelgan la conversión y
        # agotan la RAM) y se registran en oversize_log para revisión posterior.
        self.max_attach_bytes = int(max_attach_mb * 1024 * 1024) if max_attach_mb else 0
        self.oversize_log = oversize_log
        self.timeout_log = timeout_log
        self.label = label or os.path.basename(self.out)
        self.oversize_keys = self._load_oversize_keys()
        self.timeout_keys = self._load_timeout_keys()
        self.stats = {
            "mails": 0, "emails_written": 0, "emails_dup": 0,
            "emails_skipped_existing": 0,
            "attach_written": 0, "attach_dup": 0, "attach_skipped": 0,
            "attach_skipped_existing": 0, "attach_skipped_oversize": 0,
            "attach_skipped_timeout": 0,
            "errors": 0,
        }
        self.stop = False

    def _load_oversize_keys(self):
        """Claves ya registradas en el log de omitidos, para no duplicar filas
        entre corridas (el export es reanudable y los omitidos no dejan .md)."""
        keys = set()
        if not self.oversize_log or not os.path.exists(winlong(self.oversize_log)):
            return keys
        try:
            with open(winlong(self.oversize_log), "r", encoding="utf-8-sig",
                      newline="") as f:
                for row in csv.reader(f):
                    if len(row) >= 6:
                        keys.add("|".join([row[0], row[1], row[2], row[5], row[7]
                                           if len(row) > 7 else ""]))
        except Exception:
            pass
        return keys

    def _load_timeout_keys(self):
        """Claves ya registradas en el log de timeouts (mismo motivo que
        _load_oversize_keys: el export es reanudable y estos no dejan .md)."""
        keys = set()
        if not self.timeout_log or not os.path.exists(winlong(self.timeout_log)):
            return keys
        try:
            with open(winlong(self.timeout_log), "r", encoding="utf-8-sig",
                      newline="") as f:
                for row in csv.reader(f):
                    if len(row) >= 5:
                        keys.add("|".join([row[0], row[1], row[2], row[4]]))
        except Exception:
            pass
        return keys

    def _log_oversize(self, folder_path, subject, date_iso, fname, size_bytes):
        """Añade una fila al CSV consolidado de adjuntos omitidos por tamaño."""
        if not self.oversize_log:
            return
        key = "|".join([self.label, folder_path, subject or "", fname,
                        str(size_bytes)])
        if key in self.oversize_keys:
            return
        self.oversize_keys.add(key)
        new_file = not os.path.exists(winlong(self.oversize_log))
        try:
            os.makedirs(winlong(os.path.dirname(self.oversize_log)), exist_ok=True)
            with open(winlong(self.oversize_log), "a", encoding="utf-8-sig",
                      newline="") as f:
                w = csv.writer(f)
                if new_file:
                    w.writerow(["buzon", "carpeta", "asunto", "fecha",
                                "remitente", "adjunto", "tamano_MB",
                                "tamano_bytes"])
                w.writerow([self.label, folder_path, subject or "",
                            date_iso or "", "", fname,
                            round(size_bytes / 1024 / 1024, 1), size_bytes])
        except Exception as e:
            print(f"  No se pudo registrar omitido {fname}: {e}")

    def _log_timeout(self, folder_path, subject, date_iso, fname, size_bytes):
        """Registra un adjunto que agotó el timeout de conversión. Va a un CSV
        aparte del de tamaño: el motivo es distinto y estos sí son candidatos a
        rescatar a mano (el tamaño no los delata)."""
        if not self.timeout_log:
            return
        key = "|".join([self.label, folder_path, subject or "", fname])
        if key in self.timeout_keys:
            return
        self.timeout_keys.add(key)
        new_file = not os.path.exists(winlong(self.timeout_log))
        try:
            os.makedirs(winlong(os.path.dirname(self.timeout_log)), exist_ok=True)
            with open(winlong(self.timeout_log), "a", encoding="utf-8-sig",
                      newline="") as f:
                w = csv.writer(f)
                if new_file:
                    w.writerow(["buzon", "carpeta", "asunto", "fecha",
                                "adjunto", "tamano_MB", "timeout_s"])
                w.writerow([self.label, folder_path, subject or "",
                            date_iso or "", fname,
                            round(size_bytes / 1024 / 1024, 1) if size_bytes else "",
                            self.convert_timeout])
        except Exception as e:
            print(f"  No se pudo registrar timeout {fname}: {e}")

    def rel_dir(self, folder_path):
        return os.path.join(self.out, folder_path)

    def process_mail(self, item, folder_path):
        self.stats["mails"] += 1
        try:
            subject = str(getattr(item, "Subject", "") or "")
            sender = str(getattr(item, "SenderName", "") or "")
            sender_addr = str(getattr(item, "SenderEmailAddress", "") or "")
            to = str(getattr(item, "To", "") or "")
            cc = str(getattr(item, "CC", "") or "")
            body = str(getattr(item, "Body", "") or "")
            entry_id = str(getattr(item, "EntryID", "") or "")
        except Exception as e:
            print(f"  Error leyendo correo: {e}")
            self.stats["errors"] += 1
            return

        try:
            received = getattr(item, "ReceivedTime", None)
        except Exception:
            received = None
        try:
            sent = getattr(item, "SentOn", None)
        except Exception:
            sent = None
        date_iso = to_iso(received) or to_iso(sent)

        msgkey = f"{slug(subject)}__{short_hash(entry_id or subject + (date_iso or ''))}"
        base_dir = self.rel_dir(folder_path)
        eml_path = os.path.join(base_dir, msgkey + ".md")

        # Lista de adjuntos (nombres) para el encabezado.
        att_names = []
        try:
            for k in range(1, item.Attachments.Count + 1):
                try:
                    att_names.append(str(item.Attachments.Item(k).FileName or ""))
                except Exception:
                    pass
        except Exception:
            pass

        header = (
            f"# {subject or '(sin asunto)'}\n\n"
            f"| | |\n|---|---|\n"
            f"| De | {sender} {('<' + sender_addr + '>') if sender_addr else ''} |\n"
            f"| Para | {to} |\n"
            + (f"| CC | {cc} |\n" if cc else "")
            + f"| Fecha | {date_iso or 'desconocida'} |\n"
            f"| Carpeta | {folder_path} |\n"
            + (f"| Adjuntos | {', '.join(n for n in att_names if n)} |\n" if att_names else "")
            + "\n---\n\n"
        )
        full = sanitize(header + body)
        bhash = sha256_bytes(full.encode("utf-8", "replace"))
        if os.path.exists(winlong(eml_path)):
            # Reanudable: ya escrito en una corrida previa. No reconvertir; solo
            # registrar en el manifiesto para que el índice quede completo.
            self.stats["emails_skipped_existing"] += 1
            self.seen_body.add(bhash)
            self.manifest.append(["correo", folder_path, subject, date_iso or "",
                                  sender, "", os.path.relpath(eml_path, self.out), ""])
        elif bhash in self.seen_body:
            self.stats["emails_dup"] += 1
        else:
            try:
                write_text(eml_path, full)
                self.seen_body.add(bhash)
                self.stats["emails_written"] += 1
                self.manifest.append(["correo", folder_path, subject, date_iso or "",
                                      sender, "", os.path.relpath(eml_path, self.out), ""])
            except Exception as e:
                print(f"  Error escribiendo correo '{subject[:40]}': {e}")
                self.stats["errors"] += 1

        # Adjuntos -> markdown.
        try:
            n = item.Attachments.Count
        except Exception:
            n = 0
        for k in range(1, n + 1):
            if self.stop:
                return
            try:
                self.process_attachment(item.Attachments.Item(k),
                                        base_dir, msgkey, subject, date_iso, folder_path)
            except Exception as e:
                print(f"  Error en adjunto {k} de '{subject[:40]}': {e}")
                self.stats["errors"] += 1

    def _new_pool(self):
        # Un solo worker: el recorrido es serial (COM no es thread-safe); el pool
        # está por el timeout, no por paralelismo.
        return ProcessPool(max_workers=1)

    def _rebuild_pool(self):
        """Descarta el pool actual y abre uno nuevo.

        Segunda red, por si el gestor del pool quedara inservible pese al parche:
        se levanta uno limpio y la corrida continúa donde iba.
        """
        old, self.pool = self.pool, None
        for step in (lambda: old.stop(), lambda: old.join(5)):
            try:
                step()
            except Exception:
                pass
        self.pool = self._new_pool()

    def process_attachment(self, att, base_dir, msgkey, subject, date_iso, folder_path):
        try:
            fname = str(getattr(att, "FileName", "") or "")
        except Exception:
            fname = ""
        if not fname:
            self.stats["attach_skipped"] += 1
            return
        ext = os.path.splitext(fname)[1].lower()
        if ext in IMG_EXTS or ext not in DOC_EXTS:
            self.stats["attach_skipped"] += 1
            return
        try:
            if att.PropertyAccessor.GetProperty(PR_ATTACHMENT_HIDDEN):
                self.stats["attach_skipped"] += 1
                return
        except Exception:
            pass

        # Límite de tamaño: los adjuntos enormes (hojas de cálculo gigantes)
        # cuelgan la conversión y agotan la RAM. Se omiten SIN convertir y se
        # registran en el log de omitidos para revisión.
        if self.max_attach_bytes:
            try:
                asize = int(getattr(att, "Size", 0) or 0)
            except Exception:
                asize = 0
            if asize > self.max_attach_bytes:
                self.stats["attach_skipped_oversize"] += 1
                self._log_oversize(folder_path, subject, date_iso, fname, asize)
                print(f"  OMITIDO por tamaño ({round(asize/1024/1024,1)} MB): {fname}")
                return

        att_dir = os.path.join(base_dir, msgkey)
        att_md = os.path.join(att_dir, slug(fname, 90) + ".md")
        if os.path.exists(winlong(att_md)):
            # Reanudable: adjunto ya convertido en una corrida previa.
            self.stats["attach_skipped_existing"] += 1
            self.manifest.append(["adjunto", folder_path, subject, date_iso or "",
                                  "", fname, os.path.relpath(att_md, self.out), ""])
            return

        tmp = None
        try:
            fd, tmp = tempfile.mkstemp(suffix=ext)
            os.close(fd)
            att.SaveAsFile(tmp)
            with open(tmp, "rb") as f:
                data = f.read()
            ahash = sha256_bytes(data)
            if ahash in self.seen_attach:
                self.stats["attach_dup"] += 1
                return
            # Conversión aislada y con reloj: si el adjunto es un tapón, pebble
            # mata al worker y seguimos con el siguiente.
            fut = self.pool.schedule(_convert_worker, args=(tmp,),
                                     timeout=self.convert_timeout)
            # Tope propio además del de pebble: si el pool no hace cumplir el
            # suyo, el hilo principal NO puede quedarse esperando para siempre.
            text = fut.result(
                timeout=self.convert_timeout + 60 if self.convert_timeout else None)
        except FuturesTimeoutError:
            self.stats["attach_skipped_timeout"] += 1
            self._log_timeout(folder_path, subject, date_iso, fname, len(data))
            print(f"  TIMEOUT (>{self.convert_timeout}s) — worker reiniciado, "
                  f"omitido: {fname}")
            if not fut.done():
                # Saltó nuestro tope, no el de pebble: el pool no responde.
                print("  El pool no hizo cumplir su timeout — se reconstruye.")
                try:
                    fut.cancel()
                except Exception:
                    pass
                self._rebuild_pool()
            return
        except ProcessExpired as e:
            self.stats["attach_skipped_timeout"] += 1
            self._log_timeout(folder_path, subject, date_iso, fname, len(data))
            print(f"  Worker murió ({e}) convirtiendo adjunto: {fname}")
            return
        except BrokenProcessPool as e:
            # pebble da el pool por perdido: sin esto, TODOS los adjuntos que
            # siguieran fallarían en cascada hasta el final del buzón.
            self.stats["attach_skipped"] += 1
            print(f"  Pool roto ({e}) — se reconstruye y sigue: {fname}")
            self._rebuild_pool()
            return
        except Exception as e:
            print(f"  No se pudo convertir adjunto {fname}: {e}")
            self.stats["attach_skipped"] += 1
            return
        finally:
            if tmp and os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except Exception:
                    pass

        if not text:
            self.stats["attach_skipped"] += 1
            return

        body = (
            f"# {fname}\n\n"
            f"> Adjunto de: **{subject or '(sin asunto)'}** — {date_iso or 'fecha desconocida'} "
            f"— carpeta `{folder_path}`\n\n---\n\n"
            + sanitize(text)
        )
        try:
            write_text(att_md, body)
            self.seen_attach.add(ahash)
            self.stats["attach_written"] += 1
            self.manifest.append(["adjunto", folder_path, subject, date_iso or "",
                                  "", fname, os.path.relpath(att_md, self.out), ahash])
        except Exception as e:
            print(f"  Error escribiendo adjunto {fname}: {e}")
            self.stats["errors"] += 1

    def walk(self, folder, parts):
        if self.stop:
            return
        name = str(getattr(folder, "Name", "") or "")
        low = name.strip().lower()
        if low in SKIP_FOLDERS and not (
            self.include_deleted and low in ("elementos eliminados", "deleted items")):
            return
        folder_path = "/".join(parts + [slug(name, 50)]).strip("/")

        try:
            items = folder.Items
            count = items.Count
        except Exception:
            count = 0
        if count:
            print(f"  · {folder_path}  ({count})")
        for i in range(1, count + 1):
            if self.stop:
                break
            try:
                it = items.Item(i)
                if getattr(it, "Class", None) != OL_MAIL:
                    continue
            except Exception:
                continue
            self.process_mail(it, folder_path)
            if self.max_items and self.stats["mails"] >= self.max_items:
                print(f"\nLímite --max-items={self.max_items} alcanzado.")
                self.stop = True
                break

        try:
            sub = folder.Folders.Count
        except Exception:
            sub = 0
        for j in range(1, sub + 1):
            if self.stop:
                break
            self.walk(folder.Folders.Item(j), parts + [slug(name, 50)])

    def run(self, pst_path):
        if not os.path.exists(pst_path):
            raise SystemExit(f"No existe el .pst: {pst_path}")
        os.makedirs(winlong(self.out), exist_ok=True)
        print(f"Salida: {self.out}\n")

        outlook = win32com.client.Dispatch("Outlook.Application")
        ns = outlook.GetNamespace("MAPI")
        target = find_store_by_path(ns, pst_path)
        if target is None:
            # No estaba montado: lo montamos ahora.
            ns.AddStoreEx(pst_path, OL_STORE_UNICODE)
            target = find_store_by_path(ns, pst_path)
        if target is None:
            raise SystemExit("No se pudo montar el .pst.")
        root = target.GetRootFolder()
        print(f"Store montado: {target.DisplayName}\n")

        t0 = time.time()
        # El pool se maneja a mano (no con `with`) porque _rebuild_pool puede
        # cambiarlo a mitad de corrida: el `with` cerraría el objeto viejo.
        self.pool = self._new_pool()
        try:
            for j in range(1, root.Folders.Count + 1):
                if self.stop:
                    break
                self.walk(root.Folders.Item(j), [])
        finally:
            pool, self.pool = self.pool, None
            for step in (lambda: pool.close(), lambda: pool.join(10),
                         lambda: pool.stop()):
                try:
                    step()
                except Exception:
                    pass
            try:
                ns.RemoveStore(root)
                print("\nStore desmontado.")
            except Exception as e:
                print(f"\nNo se pudo desmontar el store: {e}")

        # Manifiesto.
        idx = os.path.join(self.out, "_INDICE.csv")
        try:
            with open(winlong(idx), "w", encoding="utf-8-sig", newline="") as f:
                w = csv.writer(f)
                w.writerow(["tipo", "carpeta", "asunto", "fecha", "remitente",
                            "archivo_adjunto", "ruta", "sha256"])
                w.writerows(self.manifest)
            print(f"Índice: {idx} ({len(self.manifest)} entradas)")
        except Exception as e:
            print(f"No se pudo escribir el índice: {e}")

        dt = time.time() - t0
        print(f"\n=== RESUMEN ({dt:.0f}s) ===")
        for k, v in self.stats.items():
            print(f"  {k}: {v}")


def main():
    ap = argparse.ArgumentParser(description="Exporta un .pst a carpeta markdown.")
    ap.add_argument("--pst", required=True)
    ap.add_argument("--out", required=True, help="Carpeta consolidada de salida")
    ap.add_argument("--max-items", type=int, default=0)
    ap.add_argument("--include-deleted", action="store_true")
    ap.add_argument("--max-attach-mb", type=int, default=50,
                    help="Omitir adjuntos mayores a N MB (0 = sin límite)")
    ap.add_argument("--oversize-log", default=None,
                    help="CSV consolidado de adjuntos omitidos por tamaño")
    ap.add_argument("--convert-timeout", type=int, default=180,
                    help="Matar la conversión de un adjunto tras N segundos "
                         "(0 = sin límite)")
    ap.add_argument("--timeout-log", default=None,
                    help="CSV consolidado de adjuntos omitidos por timeout")
    ap.add_argument("--label", default="",
                    help="Etiqueta del buzón para el log de omitidos")
    args = ap.parse_args()
    PstExporter(args.out, max_items=args.max_items,
                include_deleted=args.include_deleted,
                max_attach_mb=args.max_attach_mb,
                oversize_log=args.oversize_log,
                convert_timeout=args.convert_timeout,
                timeout_log=args.timeout_log,
                label=args.label).run(args.pst)


if __name__ == "__main__":
    main()
