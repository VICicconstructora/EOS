import pandas as pd

# Load data
xl = pd.ExcelFile(r'C:\Users\jmacallister\Downloads\Personal.xlsx')
personas = xl.parse('PERSONAS')
cargos = xl.parse('CARGOS')

# Clean column names
personas.columns = personas.columns.str.strip()
cargos.columns = cargos.columns.str.strip()

# Print specific info for the managers
managers = [
    "Juan Paulo McAllister", "Mónica Báez", "Andrés Arango",
    "Juan José Leal", "Diana Olave", "Marcela Arroyave",
    "Nataly Vinchira", "Luis Miguel Serrano"
]

print("--- Manager Details ---")
for m in managers:
    # Use str.contains to find them, case insensitive
    matches = personas[personas['NOMBRE COMPLETO'].str.contains(m, case=False, na=False)]
    if not matches.empty:
        p = matches.iloc[0]
        print(f"Name: {p['NOMBRE COMPLETO']}")
        print(f"Entrada: {p['ENTRADA']}")
        print(f"Celular: {p['CELULAR']}")
    else:
        print(f"Name: {m} (NOT FOUND IN PERSONAS)")

print("\n--- Direct Reports (Hierarchy) ---")
# Merge personas and cargos
# We need to know which cargo belongs to which persona. 
# Wait, how are personas linked to cargos? Is there a CODIGO CARGO in PERSONAS?
print("Personas Columns:", personas.columns.tolist())
print("Cargos Columns:", cargos.columns.tolist())
