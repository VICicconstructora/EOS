import os
import requests
from sharepoint_client import authenticate

def list_deep(access_token, drive_id, parent_id, path_so_far):
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/items/{parent_id}/children"
    res = requests.get(url, headers=headers)
    if res.status_code == 200:
        items = res.json().get("value", [])
        for it in items:
            name = it.get("name")
            full_path = f"{path_so_far}/{name}"
            if "folder" in it:
                print(f"[DIR] {full_path}")
                list_deep(access_token, drive_id, it.get("id"), full_path)
            else:
                print(f"[FILE] {full_path}")

if __name__ == "__main__":
    token = authenticate()
    if token:
        headers = {"Authorization": f"Bearer {token}"}
        # Praia Proyectos Correct ID
        site_id = "icconstructora.sharepoint.com,4593136d-c6e1-43f5-a9f1-9e7d7c74c5ce,d9d68032-d87a-4fa5-8072-57afb9b2530b"
        d_res = requests.get(f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives", headers=headers)
        if d_res.status_code == 200:
            drives = d_res.json().get("value", [])
            # Search for the library. In this subsite, it might be named "Documentos" or "PROY PRAIA"
            drive = next((d for d in drives if d.get("name") == "PROY PRAIA"), None)
            if not drive:
                drive = next((d for d in drives if d.get("name") == "Documentos"), None)
                
            if drive:
                d_id = drive.get("id")
                print(f"Using Library: {drive.get('name')} (ID: {d_id})")
                r_res = requests.get(f"https://graph.microsoft.com/v1.0/drives/{d_id}/root/children", headers=headers)
                cron = next((it for it in r_res.json().get("value", []) if it.get("name") == "CRONOGRAMAS"), None)
                if cron:
                    print(f"Recursively listing CRONOGRAMAS...")
                    list_deep(token, d_id, cron.get("id"), "CRONOGRAMAS")
                else:
                    print("CRONOGRAMAS folder not found in root.")
            else:
                print(f"No suitable library found. Available: {[d.get('name') for d in drives]}")
