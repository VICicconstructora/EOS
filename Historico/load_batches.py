# -*- coding: utf-8 -*-
"""
Load batches into Supabase using direct PostgreSQL connection via psycopg2
"""
import os
import sys
import io
import glob

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import warnings
warnings.filterwarnings('ignore')

print("=" * 80)
print("LOAD BATCHES: Ejecutando batches en Supabase")
print("=" * 80)

batch_dir = r'C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\batches'

# Find all batch files
batch_files = sorted(glob.glob(os.path.join(batch_dir, 'batch_*.sql')))
total_batches = len(batch_files)

print(f"\n[*] Encontrados {total_batches} archivos batch")

if total_batches == 0:
    print("[ERROR] No se encontraron archivos batch_*.sql")
    sys.exit(1)

# Try to connect to Supabase using psycopg2
try:
    import psycopg2
    from psycopg2 import sql

    # Connection string (using Supabase)
    # postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

    conn_string = "postgresql://postgres:YOUR_PASSWORD@zbjwasufengayvmutypr.supabase.co:5432/postgres"

    print(f"\n[*] Conectando a Supabase PostgreSQL...")
    # NOTE: This requires the actual database password, which we don't have
    print(f"[ERROR] Necesitamos credenciales PostgreSQL directas - No disponibles")
    print(f"\nAlternativa: Ejecutar manualmente cada batch en Supabase Dashboard > SQL Editor")

except ImportError:
    print(f"[INFO] psycopg2 no instalado. Instrucciones de carga manual:")
    print(f"\n1. Ir a: https://zbjwasufengayvmutypr.supabase.co/project/default/sql/new")
    print(f"2. Copiar contenido de cada archivo batch_XXXX.sql")
    print(f"3. Ejecutar en el SQL Editor")
    print(f"\nO usar: supabase db push --dir ./Historico/batches")

print(f"\n{'='*80}")
print(f"ARCHIVOS GENERADOS: {total_batches} batches en {batch_dir}")
print(f"{'='*80}\n")

# Show batch info
print(f"Información de batches:")
for i, batch_file in enumerate(batch_files[:3], 1):
    size_kb = os.path.getsize(batch_file) / 1024
    print(f"  {os.path.basename(batch_file)}: {size_kb:.1f} KB")

if total_batches > 3:
    print(f"  ...")
    for batch_file in batch_files[-1:]:
        size_kb = os.path.getsize(batch_file) / 1024
        print(f"  {os.path.basename(batch_file)}: {size_kb:.1f} KB")

print(f"\nTotal: {sum(os.path.getsize(f) for f in batch_files) / (1024*1024):.1f} MB")
