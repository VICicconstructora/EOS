"""Exporta el volcado crudo de SharePoint (filas de wiki_documents con prefijo
'sharepoint/') a archivos .md en disco, reconstruyendo la estructura de carpetas.

El destino es la bóveda Obsidian en OneDrive. Para no mezclar el volcado crudo con
la wiki curada hecha a mano, todo se escribe bajo DEST_ROOT/_sharepoint/, de modo
que 'sobreescribir' solo afecta a corridas previas de este mismo espejo.

Reconstruye cada documento juntando sus chunks en orden (chunk_index).
"""

import os
import re
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Destino portable: cada equipo/usuario tiene la biblioteca de SharePoint
# sincronizada bajo su propio perfil. Se deriva de %USERPROFILE% para no clavar
# un usuario concreto; se puede sobrescribir con la variable de entorno DEST_ROOT.
DEST_ROOT = os.getenv("DEST_ROOT") or os.path.join(
    os.environ["USERPROFILE"], "IC CONSTRUCTORA SAS", "AA General Edicion - .AI"
)
PREFIX = "sharepoint/"          # qué exportar
SUBFOLDER = "_sharepoint"       # subcarpeta destino, separada de la wiki curada

c = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))


def fix_mojibake(s):
    """Repara texto UTF-8 mal decodificado como latin-1 (FACTURACI�N -> FACTURACIÓN)."""
    if not s:
        return s
    try:
        return s.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s


def safe_path(file_path):
    """Convierte el file_path lógico en una ruta de archivo válida en Windows.

    Mantiene las subcarpetas, sanea cada segmento, repara mojibake, recorta
    segmentos muy largos, y usa el prefijo \\?\ para superar el límite de 260.
    """
    rel = file_path[len(PREFIX):] if file_path.startswith(PREFIX) else file_path
    parts = []
    for seg in rel.split("/"):
        seg = fix_mojibake(seg)
        seg = re.sub(r'[<>:"|?*]', "_", seg).strip().rstrip(".")
        if len(seg) > 120:           # recorta nombres de carpeta/archivo larguísimos
            seg = seg[:120].strip()
        if seg:
            parts.append(seg)
    if not parts:
        parts = ["sin_nombre"]
    if not parts[-1].lower().endswith(".md"):
        parts[-1] += ".md"
    full = os.path.join(DEST_ROOT, SUBFOLDER, *parts)
    # Prefijo de ruta larga de Windows: evita el tope de 260 caracteres (MAX_PATH).
    if not full.startswith("\\\\?\\"):
        full = "\\\\?\\" + full
    return full


def main():
    # 1. Reunir todos los file_path con el prefijo objetivo.
    paths = set()
    off = 0
    while True:
        r = (
            c.table("wiki_documents")
            .select("file_path")
            .like("file_path", PREFIX + "%")
            .range(off, off + 999)
            .execute()
        )
        if not r.data:
            break
        for row in r.data:
            paths.add(row["file_path"])
        if len(r.data) < 1000:
            break
        off += 1000

    print(f"Documentos a exportar: {len(paths)}")

    written = 0
    for i, fp in enumerate(sorted(paths), 1):
        # 2. Traer los chunks de este documento en orden.
        rows = (
            c.table("wiki_documents")
            .select("content,chunk_index,title")
            .eq("file_path", fp)
            .order("chunk_index")
            .execute()
        ).data
        if not rows:
            continue
        title = fix_mojibake(rows[0].get("title") or os.path.basename(fp))
        body = "\n\n".join(fix_mojibake(row.get("content") or "") for row in rows)
        text = f"# {title}\n\n> Fuente: `{fp}` — espejo de Supabase (volcado crudo).\n\n{body}\n"

        dest = safe_path(fp)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8") as f:
            f.write(text)
        written += 1
        if i % 100 == 0:
            print(f"  {i}/{len(paths)}...")

    print(f"\nListo. {written} archivos .md escritos en:")
    print(os.path.join(DEST_ROOT, SUBFOLDER))


if __name__ == "__main__":
    main()
