import pandas as pd
import json

xl = pd.ExcelFile(r'C:\Users\jmacallister\Downloads\Personal.xlsx')
personas = xl.parse('PERSONAS')
cargos = xl.parse('CARGOS')
sueldos = xl.parse('SUELDOS')

# Clean columns
personas.columns = personas.columns.str.strip()
cargos.columns = cargos.columns.str.strip()
sueldos.columns = sueldos.columns.str.strip()

# Build mapping from sueldos
# We want the most recent 'SUELDOS' row for each person, or just assume 1-to-1 for simplicity right now.
# Let's drop duplicates on CODIGO PERSONA to get the current cargo
current_sueldos = sueldos.dropna(subset=['CODIGO PERSONA', 'CODIGO CARGO']).drop_duplicates(subset='CODIGO PERSONA', keep='last')

# Merge to create a comprehensive flat table
# 1. person_info
p_info = pd.merge(current_sueldos[['CODIGO PERSONA', 'CODIGO CARGO']], personas, on='CODIGO PERSONA', how='inner')

# 2. Add cargo info
full_data = pd.merge(p_info, cargos, on='CODIGO CARGO', how='inner')

# We need to map CARGO DEPENDE to the manager's NOMBRE COMPLETO
# First, create a dictionary of CODIGO CARGO -> NOMBRE COMPLETO (Manager)
cargo_to_person = dict(zip(full_data['CODIGO CARGO'], full_data['NOMBRE COMPLETO']))
cargo_to_desc = dict(zip(cargos['CODIGO CARGO'], cargos['DESCRIPCION']))

full_data['MANAGER_NAME'] = full_data['CARGO DEPENDE'].map(cargo_to_person)
full_data['MANAGER_CARGO_DESC'] = full_data['CARGO DEPENDE'].map(cargo_to_desc)

output = []
for _, row in full_data.iterrows():
    output.append({
        'NOMBRE COMPLETO': row['NOMBRE COMPLETO'],
        'CARGO': row['DESCRIPCION'],
        'AREA': row['AREA'],
        'ENTRADA': str(row['ENTRADA'])[:10] if pd.notnull(row['ENTRADA']) else "",
        'CELULAR': str(row['CELULAR']) if pd.notnull(row['CELULAR']) else "",
        'MANAGER': row['MANAGER_NAME'] if pd.notnull(row['MANAGER_NAME']) else (row['MANAGER_CARGO_DESC'] if pd.notnull(row['MANAGER_CARGO_DESC']) else "N/A"),
        'CODIGO_CARGO': row['CODIGO CARGO'],
        'CARGO_DEPENDE': row['CARGO DEPENDE']
    })

with open('c:\\Users\\jmacallister\\OneDrive\\Documentos\\Documentos\\Traccion\\discovery_output.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print("Data exported to discovery_output.json")
