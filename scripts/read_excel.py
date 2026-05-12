import os
import requests
import pandas as pd
from sharepoint_client import authenticate
from io import BytesIO

def download_and_analyze(access_token, site_id, file_name):
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # Search in site drive
    search_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/root/search(q='{file_name}')"
    res = requests.get(search_url, headers=headers)
    if res.status_code == 200:
        items = res.json().get("value", [])
        target = next((it for it in items if it.get("name") == file_name), None)
        if target:
            d_url = target.get("@microsoft.graph.downloadUrl")
            if d_url:
                print(f"Downloading {file_name} from {site_id}...")
                r = requests.get(d_url)
                df = pd.read_excel(BytesIO(r.content))
                print("\n--- Columns ---")
                print(df.columns.tolist())
                print("\n--- Top 20 Rows ---")
                print(df.dropna(how='all').head(20).to_string())
            else:
                print("No download URL.")
        else:
            print("File not found in search results.")
    else:
        print(f"Search failed: {res.status_code}")

if __name__ == "__main__":
    token = authenticate()
    if token:
        # Mitika Proyectos Site ID
        mitika_proy_id = "icconstructora.sharepoint.com,4593136d-c6e1-43f5-a9f1-9e7d7c74c5ce,d9d68032-d87a-4fa5-8072-57afb9b2530b"
        download_and_analyze(token, mitika_proy_id, "Cronograma Hitos Proyectos 27 feb-25.xlsx")
