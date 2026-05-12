import json
import os
import re

# Load parsed data
with open('c:\\Users\\jmacallister\\OneDrive\\Documentos\\Documentos\\Traccion\\discovery_output.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Manager mapping
managers_map = {
    "JUAN PAULO MAC ALLISTER ORTIZ": "juan-paulo-mcallister.md",
    "MONICA ANDREA BAEZ GONZALEZ": "monica-baez.md",
    "ANDRES ARANGO FUENTES": "andres-arango.md",
    "JUAN JOSE LEAL TORRES": "juan-jose-leal.md",
    "DIANA ELVIRA OLAVE PARDO": "diana-olave.md",
    "MARCELA ARROYABE BUSTAMANTE": "marcela-arroyave.md",
    "NATALY VINCHIRA JIMENEZ": "nataly-vinchira.md",
    "LUIS MIGUEL SERRANO SERRANO": "luis-miguel-serrano.md"
}

# Group by MANAGER
hierarchy = {}
for p in data:
    m = p['MANAGER']
    if m not in hierarchy:
        hierarchy[m] = []
    hierarchy[m].append(p)

base_dir = r"C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\docs\memoria\personas"

for m_name, file_name in managers_map.items():
    file_path = os.path.join(base_dir, file_name)
    if not os.path.exists(file_path):
        continue
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find manager details
    m_details = next((p for p in data if p['NOMBRE COMPLETO'] == m_name), None)
    
    # Update Antigüedad and Teléfono
    if m_details:
        ant = m_details['ENTRADA']
        cel = m_details['CELULAR']
        if ant:
            content = re.sub(r'\*\*Antigüedad:\*\*.*', f'**Antigüedad:** {ant}', content)
        if cel and cel != 'nan':
            # Remove any trailing .0
            cel_str = str(cel).replace('.0', '')
            content = re.sub(r'\*\*Teléfono:\*\*.*', f'**Teléfono:** {cel_str}', content)

    # Build Team Table
    team = hierarchy.get(m_name, [])
    if team:
        table = "| Nombre | Cargo | Área |\n|--------|-------|------|\n"
        for member in team:
            table += f"| {member['NOMBRE COMPLETO']} | {member['CARGO']} | {member['AREA']} |\n"
        
        # Replace existing team table. We look for '## Equipo directo' and replace the table below it until the next '##'
        # The regex needs to capture the table. Let's just do a string split/replace
        parts = content.split('## Equipo directo\n')
        if len(parts) == 2:
            before = parts[0]
            after = parts[1]
            next_section_idx = after.find('\n## ')
            if next_section_idx != -1:
                after_table = after[next_section_idx:]
            else:
                after_table = ""
            
            content = before + "## Equipo directo\n\n" + table + after_table

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated manager persona files.")
