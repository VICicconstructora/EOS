import os
import requests
import pandas as pd
from sharepoint_client import authenticate

def audit_subsites(access_token):
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Projects to audit
    projects = [
        {"name": "Reserva de Oporto", "url": "/Ca-ROporto"},
        {"name": "Bosque Central", "url": "/Bu-BOS-CENTRAL"},
        {"name": "Azul Celeste", "url": "/MA-AZULCELESTE"},
        {"name": "Gaia", "url": "/PE-GAIA"},
        {"name": "La Hacienda", "url": "/JAHacienda"},
        {"name": "Mitika", "url": "/ZI-MITIKA"},
        {"name": "Primera Este", "url": "/BoPrimEste"},
        {"name": "Praia", "url": "/SmBRI"},
        {"name": "Castilla Imperial", "url": "/BOCASTIMP"},
        {"name": "Castilla Imperial VIS", "url": "/BOCASTVIS"},
        {"name": "Azul Turquesa", "url": "/MA-AZULTURQUESA"},
        {"name": "Verde Vivo", "url": "/MA-VERDEVIVO"},
        {"name": "Well Calle 100", "url": "/BO-WELL"}
    ]
    
    std_deps = [
        "CARTERA", "COMERCIAL", "COMPRAS", "CONTROL DE COSTOS", 
        "COORDINACION", "PROYECTOS", "DISEÑO", "ESTRUCTURACION", 
        "OBRA", "ORIGINACION", "PRESUPUESTO", "PUBLICIDAD", 
        "SERVICIO AL CLIENTE", "TRAMITES"
    ]
    
    matrix = []
    
    for p in projects:
        print(f"Auditing {p['name']}...")
        search_url = f"https://graph.microsoft.com/v1.0/sites?search={p['name']}"
        res = requests.get(search_url, headers=headers)
        if res.status_code == 200:
            sites = res.json().get("value", [])
            # Search for main site more carefully
            main_site = next((s for s in sites if s.get("webUrl").endswith(p['url'])), None)
            
            if main_site:
                sub_url = f"https://graph.microsoft.com/v1.0/sites/{main_site.get('id')}/sites"
                s_res = requests.get(sub_url, headers=headers)
                if s_res.status_code == 200:
                    subsites = [s.get("displayName").upper() for s in s_res.json().get("value", [])]
                    
                    row = {"Proyecto": p['name']}
                    for dep in std_deps:
                        # Fuzzy match
                        exists = any(dep in s or s in dep for s in subsites)
                        row[dep] = "YES" if exists else "NO"
                    matrix.append(row)
            else:
                matrix.append({"Proyecto": f"{p['name']} (NOT FOUND)", **{d: "MISSING" for d in std_deps}})
                
    df = pd.DataFrame(matrix)
    print("\n--- Subsite Audit Matrix ---")
    print(df.to_string(index=False))
    df.to_csv("sharepoint_audit_matrix.csv", index=False)
    
if __name__ == "__main__":
    token = authenticate()
    if token:
        audit_subsites(token)
