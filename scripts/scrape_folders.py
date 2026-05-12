import os
import requests
from sharepoint_client import authenticate

def list_drive_items(access_token, site_id, list_name):
    headers = {"Authorization": f"Bearer {access_token}"}
    api_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists"
    res = requests.get(api_url, headers=headers)
    if res.status_code == 200:
        lists = res.json().get("value", [])
        target_list = next((l for l in lists if l.get("displayName") == list_name), None)
        if target_list:
            drive_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/lists/{target_list.get('id')}/drive"
            d_res = requests.get(drive_url, headers=headers)
            if d_res.status_code == 200:
                drive_id = d_res.json().get("id")
                children_url = f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children"
                c_res = requests.get(children_url, headers=headers)
                if c_res.status_code == 200:
                    items = c_res.json().get("value", [])
                    print(f"\nItems in '{list_name}':")
                    for item in items:
                        kind = "FOLDER" if "folder" in item else "FILE"
                        print(f"- [{kind}] {item.get('name')}")
    else:
        print(f"Failed (HTTP {res.status_code})")

if __name__ == "__main__":
    token = authenticate()
    if token:
        # Mitika - PROYECTOS site ID
        site_id = "icconstructora.sharepoint.com,4593136d-c6e1-43f5-a9f1-9e7d7c74c5ce,c6eb5324-f131-4a16-8321-4f114c0000a6"
        # I'll search for it again to be safe
        headers = {"Authorization": f"Bearer {token}"}
        query = "ZI MITIKA"
        search_url = f"https://graph.microsoft.com/v1.0/sites?search={query}"
        res = requests.get(search_url, headers=headers)
        if res.status_code == 200:
            sites = res.json().get("value", [])
            target = next((s for s in sites if s.get("webUrl").endswith("/PROY")), None)
            if target:
                list_drive_items(token, target.get("id"), "ProyMit")
