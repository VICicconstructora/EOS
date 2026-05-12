import os
import requests
import json
from sharepoint_client import authenticate

def list_drive_folders(access_token, site_id):
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives"
    res = requests.get(url, headers=headers)
    if res.status_code != 200: return []
    
    drives = res.json().get("value", [])
    structure = {}
    for d in drives:
        lib_name = d.get("name")
        if lib_name == "Páginas": continue
        
        items_url = f"https://graph.microsoft.com/v1.0/drives/{d.get('id')}/root/children"
        i_res = requests.get(items_url, headers=headers)
        if i_res.status_code == 200:
            folders = [it.get("name") for it in i_res.json().get("value", []) if "folder" in it]
            structure[lib_name] = folders
    return structure

if __name__ == "__main__":
    token = authenticate()
    if token:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Targets
        projects = [
            {"name": "Primera Este", "url": "/BoPrimEste", "file": "primeraeste_deep_scan.json"},
            {"name": "Mitika", "url": "/ZI-MITIKA", "file": "mitika_deep_scan.json"}
        ]
        
        for p in projects:
            print(f"\n--- Searching for {p['name']} ---")
            search_url = f"https://graph.microsoft.com/v1.0/sites?search={p['name']}"
            res = requests.get(search_url, headers=headers)
            if res.status_code == 200:
                sites = res.json().get("value", [])
                main_site = next((s for s in sites if s.get("webUrl").endswith(p['url'])), None)
                if main_site:
                    main_site_id = main_site.get("id")
                    print(f"Found {p['name']} ID: {main_site_id}")
                    
                    sub_url = f"https://graph.microsoft.com/v1.0/sites/{main_site_id}/sites"
                    s_res = requests.get(sub_url, headers=headers)
                    if s_res.status_code == 200:
                        subsites = s_res.json().get("value", [])
                        print(f"Analyzing {len(subsites)} subsites...")
                        
                        results = {}
                        for sub in subsites:
                            sn = sub.get("displayName")
                            print(f"  -> {sn}...")
                            folders = list_drive_folders(token, sub.get("id"))
                            results[sn] = folders
                            
                        with open(p['file'], "w", encoding="utf-8") as f:
                            json.dump(results, f, indent=2, ensure_ascii=False)
                        print(f"Done. Saved to {p['file']}")
                else:
                    print(f"Could not find main site for {p['name']}")
