# -*- coding: utf-8 -*-
"""
Execute all final batches in Supabase using direct HTTP requests
"""
import os
import glob
import sys
import io
import json
import time

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import warnings
warnings.filterwarnings('ignore')

print("=" * 80)
print("EXECUTE ALL BATCHES: Load final_batches into Supabase")
print("=" * 80)

batch_dir = r'C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\final_batches'

# Find all execution batch files
batch_files = sorted(glob.glob(os.path.join(batch_dir, 'exec_*.sql')))
total_batches = len(batch_files)

print(f"\n[*] Found {total_batches} execution batch files")

if total_batches == 0:
    print("[ERROR] No batch files found")
    sys.exit(1)

# Try to use requests library for HTTP execution
try:
    import requests

    PROJECT_URL = "https://zbjwasufengayvmutypr.supabase.co"
    ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpiandhc3VmZW5nYXl2bXV0eXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTQ3MTEsImV4cCI6MjA5MTY3MDcxMX0.7OLRA7dUBwpUNUIBoLN8S5zCHVKQ8YX7eMDEKiGIjYs"

    headers = {
        "Authorization": f"Bearer {ANON_KEY}",
        "Content-Type": "application/json"
    }

    print(f"\n[*] Using requests library for HTTP execution")
    print(f"[*] Target: {PROJECT_URL}")

    successful = 0
    failed = 0

    for i, batch_file in enumerate(batch_files, 1):
        with open(batch_file, 'r', encoding='utf-8') as f:
            sql = f.read()

        # Try to execute via SQL Editor RPC endpoint
        # Note: This endpoint may not exist for public/anon access
        try:
            # Method 1: Try the SQL endpoint (if available)
            response = requests.post(
                f"{PROJECT_URL}/rest/v1/rpc/sql_direct",
                json={"query": sql},
                headers=headers,
                timeout=30
            )

            if response.status_code in [200, 201]:
                successful += 1
                print(f"[OK] Batch {i:3d}/{total_batches}")
            else:
                failed += 1
                print(f"[ERROR] Batch {i:3d}: {response.status_code}")

        except Exception as e:
            failed += 1
            if "ssl" in str(e).lower() or "certificate" in str(e).lower():
                print(f"[WARNING] Batch {i:3d}: SSL error, skipping direct execution")
            else:
                print(f"[ERROR] Batch {i:3d}: {str(e)[:50]}")

        if i % 50 == 0:
            print(f"  Progress: {i}/{total_batches}")

    print(f"\n[SUMMARY]")
    print(f"  Successful: {successful}")
    print(f"  Failed: {failed}")

except ImportError:
    print(f"[INFO] requests library not installed")
    print(f"\nAlternative execution methods:")
    print(f"1. Manual: Copy each file to Supabase Dashboard > SQL Editor")
    print(f"2. CLI: supabase db execute --file final_batches/exec_0001.sql")
    print(f"3. Python: pip install psycopg2-binary requests, then re-run")

print(f"\n[INFO] Batch files ready in: {batch_dir}")
print(f"[INFO] Each batch loads ~5000 records")
print(f"[INFO] Total: {total_batches * 5000:,} records")
