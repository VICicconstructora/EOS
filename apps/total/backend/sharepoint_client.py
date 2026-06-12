import os
import json
import msal
import requests
import pandas as pd
from io import BytesIO
from dotenv import load_dotenv

# Load configuration from the centralized root .env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'))

CLIENT_ID = os.getenv("SHAREPOINT_CLIENT_ID")
TENANT_ID = os.getenv("SHAREPOINT_TENANT_ID", "common")
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES = [
    "https://graph.microsoft.com/Sites.Read.All",
    "https://graph.microsoft.com/Files.Read.All",
]

def authenticate():
    """Authenticates using MSAL Interactive Flow."""
    if not CLIENT_ID or CLIENT_ID == "00000000-0000-0000-0000-000000000000":
        print("Error: SHAREPOINT_CLIENT_ID not set in .env")
        return None

    app = msal.PublicClientApplication(CLIENT_ID, authority=AUTHORITY)

    # Try to find a token in cache first
    accounts = app.get_accounts()
    result = None
    if accounts:
        result = app.acquire_token_silent(SCOPES, account=accounts[0])

    if not result:
        print("\n" + "="*50)
        print("ACTION REQUIRED: A browser window will open for SharePoint login.")
        print("Please log in with your Microsoft credentials.")
        print("="*50 + "\n")
        result = app.acquire_token_interactive(SCOPES)

    if "access_token" in result:
        return result["access_token"]
    else:
        print(f"Authentication failed: {result.get('error_description')}")
        return None


def get_site_id(access_token, site_url):
    """Resolves a SharePoint site URL to its Graph API site ID."""
    headers = {"Authorization": f"Bearer {access_token}"}

    if "/sites/" not in site_url:
        print(f"Invalid Site URL: {site_url}")
        return None

    site_host = site_url.split("/sites/")[0].replace("https://", "")
    site_relative_path = "/sites/" + site_url.split("/sites/")[1]

    api_url = f"https://graph.microsoft.com/v1.0/sites/{site_host}:{site_relative_path}"
    response = requests.get(api_url, headers=headers)

    if response.status_code == 200:
        return response.json()["id"]
    else:
        print(f"Failed to resolve site (HTTP {response.status_code}):")
        print(response.text)
        return None


def list_folder_files(access_token, site_id, folder_path):
    """Lists all files in a SharePoint folder."""
    headers = {"Authorization": f"Bearer {access_token}"}
    api_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/root:/{folder_path}:/children"
    response = requests.get(api_url, headers=headers)

    if response.status_code == 200:
        items = response.json().get("value", [])
        # Return only files (not sub-folders)
        return [item for item in items if "file" in item]
    else:
        print(f"Failed to list folder '{folder_path}' (HTTP {response.status_code}):")
        print(response.text)
        return []


def download_excel(access_token, site_id, file_path):
    """Downloads an Excel file from SharePoint and returns a DataFrame."""
    headers = {"Authorization": f"Bearer {access_token}"}
    api_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/root:/{file_path}:/content"
    response = requests.get(api_url, headers=headers)

    if response.status_code == 200:
        try:
            df = pd.read_excel(BytesIO(response.content))
            return df
        except Exception as e:
            print(f"  Could not parse as Excel: {e}")
            return None
    else:
        print(f"  Failed to download (HTTP {response.status_code}): {response.text}")
        return None


def export_to_json(df, output_path):
    """Exports a DataFrame to a JSON file for the dashboard."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    # Convert dates/timestamps to strings for JSON serialisation
    df = df.astype(str)
    json_data = df.to_dict(orient="records")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, indent=2, ensure_ascii=False)
    print(f"  Exported → {output_path}")


if __name__ == "__main__":
    print("--- SharePoint DataMart Fetcher ---\n")

    # ── Configuration ────────────────────────────────────────────────────────
    GND_SITE_URL = os.getenv("SITE_2_URL", "https://icconstructora.sharepoint.com/sites/GND")
    DATAMART_FOLDER = "DataMart"
    OUTPUT_DIR = "frontend/public/datamart"
    # ─────────────────────────────────────────────────────────────────────────

    token = authenticate()
    if not token:
        print("Authentication failed. Exiting.")
        exit(1)

    print(f"Resolving site: {GND_SITE_URL}")
    site_id = get_site_id(token, GND_SITE_URL)
    if not site_id:
        print("Could not resolve site ID. Exiting.")
        exit(1)

    print(f"Site ID: {site_id}")
    print(f"\nListing files in '{DATAMART_FOLDER}' folder...")
    files = list_folder_files(token, site_id, DATAMART_FOLDER)

    if not files:
        print("No files found in the DataMart folder.")
        exit(0)

    print(f"Found {len(files)} file(s):\n")
    success_count = 0

    for item in files:
        name = item["name"]
        file_path = f"{DATAMART_FOLDER}/{name}"
        print(f"  [{name}]")

        # Only process Excel files
        if not name.lower().endswith((".xlsx", ".xls")):
            print("  Skipping (not an Excel file)")
            continue

        df = download_excel(token, site_id, file_path)
        if df is not None:
            print(f"  Rows: {len(df)}  Columns: {list(df.columns)}")
            safe_name = name.lower().replace(" ", "_").replace(".xlsx", "").replace(".xls", "")
            output_path = f"{OUTPUT_DIR}/{safe_name}.json"
            export_to_json(df, output_path)
            success_count += 1
        print()

    print(f"Done. {success_count}/{len(files)} Excel file(s) exported to '{OUTPUT_DIR}/'")
