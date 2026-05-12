import os
import re
import unicodedata

def slugify(text):
    text = str(text).lower()
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^a-z0-9\-]+', '-', text)
    return text.strip('-')

organigrama_path = r'c:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\docs\memoria\empresa\organigrama.md'
personas_dir = r'C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\docs\memoria\personas'

with open(organigrama_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

allowed_slugs = set()
for line in lines:
    if line.startswith('|') and not line.startswith('|-') and not ' Nombre ' in line and not ' Versión ' in line and not ' Cargo ' in line:
        parts = line.split('|')
        if len(parts) > 2:
            name = parts[1].strip()
            if name:
                allowed_slugs.add(slugify(name))

special_managers = [
    "juan-paulo-mcallister.md",
    "monica-baez.md",
    "andres-arango.md",
    "juan-jose-leal.md",
    "diana-olave.md",
    "marcela-arroyave.md",
    "nataly-vinchira.md",
    "luis-miguel-serrano.md"
]

for mgr in special_managers:
    allowed_slugs.add(mgr.replace('.md', ''))

deleted_count = 0
kept_count = 0

for filename in os.listdir(personas_dir):
    if filename.endswith('.md'):
        slug = filename.replace('.md', '')
        if slug not in allowed_slugs:
            filepath = os.path.join(personas_dir, filename)
            os.remove(filepath)
            deleted_count += 1
        else:
            kept_count += 1

print(f"Cleanup complete. Deleted {deleted_count} files, kept {kept_count} files.")
