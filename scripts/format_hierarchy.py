import json

with open('c:\\Users\\jmacallister\\OneDrive\\Documentos\\Documentos\\Traccion\\discovery_output.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Group by MANAGER to see who reports to whom
hierarchy = {}
for p in data:
    manager = p['MANAGER']
    if manager not in hierarchy:
        hierarchy[manager] = []
    hierarchy[manager].append(p)

with open('c:\\Users\\jmacallister\\OneDrive\\Documentos\\Documentos\\Traccion\\discovery_output.txt', 'w', encoding='utf-8') as out:
    for manager, reports in hierarchy.items():
        out.write(f"\nMANAGER: {manager}\n")
        for r in reports:
            out.write(f"  - {r['NOMBRE COMPLETO']} ({r['CARGO']})\n")

print("Created discovery_output.txt")
