# -*- coding: utf-8 -*-
import os
import sys
import io
import glob

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import warnings
warnings.filterwarnings('ignore')

try:
    from supabase import create_client
except ImportError:
    print("[ERROR] Supabase client not installed. Install with: pip install supabase")
    sys.exit(1)

print("=" * 80)
print("EJECUCION: SQL CHUNKS EN SUPABASE")
print("=" * 80)

# Configuration
SUPABASE_URL = "https://zbjwasufengayvmutypr.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpiandhc3VmZW5nYXl2bXV0eXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTQ3MTEsImV4cCI6MjA5MTY3MDcxMX0.7OLRA7dUBwpUNUIBoLN8S5zCHVKQ8YX7eMDEKiGIjYs"
chunk_dir = r'C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico'
batch_size = 10  # Combine 10 chunks per batch

print(f"\n[*] Conectando a Supabase...")
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"[OK] Conectado")
except Exception as e:
    print(f"[ERROR] Fallo al conectar: {e}")
    sys.exit(1)

# Find all chunk files
chunk_files = sorted(glob.glob(os.path.join(chunk_dir, 'chunk_*.sql')))
total_chunks = len(chunk_files)

print(f"\n[*] Encontrados {total_chunks} archivos chunk")

if total_chunks == 0:
    print("[ERROR] No se encontraron archivos chunk_*.sql")
    sys.exit(1)

# Process in batches
successful = 0
failed = 0
current_batch_sql = ""
batch_count = 0

for i, chunk_file in enumerate(chunk_files, 1):
    with open(chunk_file, 'r', encoding='utf-8') as f:
        chunk_sql = f.read()

    current_batch_sql += chunk_sql + "\n"

    # Execute batch when we reach batch_size or end of files
    if i % batch_size == 0 or i == total_chunks:
        batch_count += 1

        try:
            # Use the RPC method if available, or raw SQL
            result = supabase.postgrest.auth.request(
                method="POST",
                path="/rest/v1/rpc/exec_sql",
                headers={"Content-Type": "application/json"},
                json={"query": current_batch_sql}
            )

            successful += batch_size if (i % batch_size) == 0 else (i % batch_size)
            print(f"[OK] Batch {batch_count} ({i}/{total_chunks} chunks): {successful % (batch_size * 100)} registros")

        except Exception as e:
            failed += batch_size if (i % batch_size) == 0 else (i % batch_size)
            print(f"[ERROR] Batch {batch_count}: {str(e)[:100]}")

        current_batch_sql = ""

    if i % 100 == 0:
        print(f"  Procesados {i}/{total_chunks} chunks...")

print(f"\n{'='*80}")
print(f"[RESUMEN]")
print(f"{'='*80}")
print(f"Total chunks: {total_chunks}")
print(f"Batches ejecutados: {batch_count}")
print(f"Registros exitosos: ~{successful * 100:,}")
print(f"Chunks fallidos: {failed}")

# Verify load
print(f"\n[*] Verificando carga en Supabase...")
try:
    result = supabase.table('flujo_historico').select('count', count='exact').execute()
    total_rows = result.count
    print(f"[OK] Total registros en flujo_historico: {total_rows:,}")
except Exception as e:
    print(f"[ERROR] No se pudo verificar: {e}")

print(f"\n{'='*80}\n")
