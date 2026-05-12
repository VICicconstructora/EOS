import os
import requests
from sharepoint_client import authenticate

if __name__ == "__main__":
    token = authenticate()
    if token:
        headers = {"Authorization": f"Bearer {token}"}
        query = "Cronograma Hitos Proyectos 27 feb-25.xlsx"
        url = f"https://graph.microsoft.com/v1.0/search/query"
        payload = {
            "requests": [
                {
                    "entityTypes": ["driveItem"],
                    "query": {"queryString": query}
                }
            ]
        }
        res = requests.post(url, headers=headers, json=payload)
        if res.status_code == 200:
            hits = res.json().get("value", [{}])[0].get("hitsContainers", [{}])[0].get("hits", [])
            for h in hits:
                resource = h.get("resource", {})
                print(f"File: {resource.get('name')} | ID: {resource.get('id')} | Site: {resource.get('parentReference', {}).get('siteId')}")
