import json
import re

with open('c:\\Users\\jmacallister\\OneDrive\\Documentos\\Documentos\\Traccion\\discovery_output.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

hierarchy = {}
for p in data:
    m = p['MANAGER']
    if m not in hierarchy:
        hierarchy[m] = []
    hierarchy[m].append(p)

managers_to_list = [
    "MONICA ANDREA BAEZ GONZALEZ",
    "ANDRES ARANGO FUENTES",
    "JUAN JOSE LEAL TORRES",
    "DIANA ELVIRA OLAVE PARDO",
    "MARCELA ARROYABE BUSTAMANTE",
    "NATALY VINCHIRA JIMENEZ",
    "LUIS MIGUEL SERRANO SERRANO"
]

new_section = "## Estructura de Direcciones y Coordinaciones por Gerencia\n\n"

for m in managers_to_list:
    team = hierarchy.get(m, [])
    if team:
        # Get the manager's own role
        m_details = next((p for p in data if p['NOMBRE COMPLETO'] == m), None)
        cargo_name = m_details['CARGO'] if m_details else "Gerencia"
        new_section += f"### {m} ({cargo_name})\n\n"
        new_section += "| Nombre | Cargo | Área |\n"
        new_section += "|--------|-------|------|\n"
        for t in team:
            new_section += f"| {t['NOMBRE COMPLETO']} | {t['CARGO']} | {t['AREA']} |\n"
        new_section += "\n"

# Read organigrama
with open('c:\\Users\\jmacallister\\OneDrive\\Documentos\\Documentos\\Traccion\\docs\\memoria\\empresa\\organigrama.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the "## Directores de proyecto..." section
parts = content.split('## Directores de proyecto (reportan a Construcción)')
if len(parts) == 2:
    before = parts[0]
    after = parts[1]
    
    # find next section after the table
    next_section_idx = after.find('\n## ')
    if next_section_idx != -1:
        after_table = after[next_section_idx:]
    else:
        after_table = ""
        
    new_content = before + new_section + after_table
    
    with open('c:\\Users\\jmacallister\\OneDrive\\Documentos\\Documentos\\Traccion\\docs\\memoria\\empresa\\organigrama.md', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Updated organigrama.md")
else:
    print("Could not find Directores section in organigrama.md")
