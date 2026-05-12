import pandas as pd
import json
import os
import re
import unicodedata

def slugify(text):
    text = str(text).lower()
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^a-z0-9\-]+', '-', text)
    return text.strip('-')

xl = pd.ExcelFile(r'C:\Users\jmacallister\Downloads\Personal.xlsx')
personas = xl.parse('PERSONAS')
cargos = xl.parse('CARGOS')
sueldos = xl.parse('SUELDOS')

personas.columns = personas.columns.str.strip()
cargos.columns = cargos.columns.str.strip()
sueldos.columns = sueldos.columns.str.strip()

# Filter active only
# Active if SALIDA is null or after today, but let's just use CHECK == 1 or SALIDA is null
# Using pd.isnull(SALIDA) as primary indicator of active.
active_personas = personas[pd.isnull(personas['SALIDA']) | (personas['SALIDA'] > pd.Timestamp.today())]

current_sueldos = sueldos.dropna(subset=['CODIGO PERSONA', 'CODIGO CARGO']).drop_duplicates(subset='CODIGO PERSONA', keep='last')

p_info = pd.merge(current_sueldos[['CODIGO PERSONA', 'CODIGO CARGO']], active_personas, on='CODIGO PERSONA', how='inner')
full_data = pd.merge(p_info, cargos, on='CODIGO CARGO', how='inner')

cargo_to_person = dict(zip(full_data['CODIGO CARGO'], full_data['NOMBRE COMPLETO']))
cargo_to_desc = dict(zip(cargos['CODIGO CARGO'], cargos['DESCRIPCION']))

full_data['MANAGER_NAME'] = full_data['CARGO DEPENDE'].map(cargo_to_person)
full_data['MANAGER_CARGO_DESC'] = full_data['CARGO DEPENDE'].map(cargo_to_desc)

output = []
for _, row in full_data.iterrows():
    mgr = row['MANAGER_NAME'] if pd.notnull(row['MANAGER_NAME']) else (row['MANAGER_CARGO_DESC'] if pd.notnull(row['MANAGER_CARGO_DESC']) else "N/A")
    
    # REMAP rule: Ignore Juan David Vergara, assign to Monica Baez
    if mgr == "JUAN DAVID VERGARA ROMERO":
        mgr = "MONICA ANDREA BAEZ GONZALEZ"

    output.append({
        'NOMBRE COMPLETO': str(row['NOMBRE COMPLETO']).strip(),
        'CARGO': str(row['DESCRIPCION']).strip(),
        'AREA': str(row['AREA']).strip(),
        'ENTRADA': str(row['ENTRADA'])[:10] if pd.notnull(row['ENTRADA']) else "",
        'CELULAR': str(row['CELULAR']).replace('.0', '') if pd.notnull(row['CELULAR']) else "No registrado",
        'MANAGER': mgr.strip(),
        'CODIGO_CARGO': row['CODIGO CARGO'],
        'CARGO_DEPENDE': row['CARGO DEPENDE']
    })

# Write updated JSON
out_json_path = r'c:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\discovery_output_active.json'
with open(out_json_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

# Now, generate markdown files
base_dir = r"C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\docs\memoria\personas"
os.makedirs(base_dir, exist_ok=True)

# Build a lookup for team size
hierarchy = {}
for p in output:
    m = p['MANAGER']
    if m not in hierarchy:
        hierarchy[m] = []
    hierarchy[m].append(p)

# We have 8 special manager files that we shouldn't overwrite blindly
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

count_created = 0
for person in output:
    slug = slugify(person['NOMBRE COMPLETO'])
    file_name = f"{slug}.md"
    file_path = os.path.join(base_dir, file_name)
    
    # If it's a special manager file, skip generation (it will be updated by another script)
    if file_name in special_managers:
        continue
    
    # Generate team table if they have direct reports
    team = hierarchy.get(person['NOMBRE COMPLETO'], [])
    team_md = "No tiene personal a cargo."
    if team:
        team_md = "| Nombre | Cargo | Área |\n|--------|-------|------|\n"
        for t in team:
            team_md += f"| {t['NOMBRE COMPLETO']} | {t['CARGO']} | {t['AREA']} |\n"

    # Only create if it doesn't exist, to avoid overwriting future edits
    if not os.path.exists(file_path):
        content = f"""---
tipo: persona
version: 1.0
creado: 2026-05-11
estado: vigente
---

# {person['NOMBRE COMPLETO']}

**Cargo:** {person['CARGO']}
**Área:** {person['AREA']}
**Reporta a:** {person['MANAGER']}
**Antigüedad:** {person['ENTRADA']}
**Celular:** {person['CELULAR']}

## Notas de la Entrevista / Contexto

[Pendiente de documentar tras las entrevistas]

## Responsabilidades y Procesos

[Pendiente de documentar]

## Equipo directo

{team_md}
"""
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        count_created += 1

print(f"Active employees processed. Created {count_created} new profile files.")
