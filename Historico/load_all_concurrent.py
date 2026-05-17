# -*- coding: utf-8 -*-
"""
Concurrent batch loader for Supabase - ejecuta grupos en paralelo
"""
import os
import glob
import sys
import io
import json
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import warnings
warnings.filterwarnings('ignore')

print("=" * 80)
print("CONCURRENT LOADER: Carga paralela de grupos en Supabase")
print("=" * 80)

GROUP_DIR = r'C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches\execution_groups'
PAIRS_PER_BATCH = 5  # Load 5 pairs at a time
THREADS = 5

# Get all group files
group_files = sorted(glob.glob(os.path.join(GROUP_DIR, 'group_*.sql')))
total_groups = len(group_files)

print(f"\n[*] Total grupos: {total_groups}")
print(f"[*] Estrategia: Combinar en pares (~460 KB c/u)")
print(f"[*] Threads: {THREADS}")

# Prepare pairs
pairs = []
for i in range(0, total_groups, 2):
    pair_files = [group_files[i]]
    if i + 1 < total_groups:
        pair_files.append(group_files[i + 1])
    pairs.append(pair_files)

print(f"[*] Total pairs: {len(pairs)}")

# Load pair contents
print(f"\n[*] Cargando pares en memoria...")
pair_contents = []
for pair_idx, pair_files in enumerate(pairs, 1):
    pair_sql = ""
    for f in pair_files:
        with open(f, 'r', encoding='utf-8') as fp:
            pair_sql += fp.read() + "\n"

    pair_contents.append({
        'pair_num': pair_idx,
        'files': [os.path.basename(f) for f in pair_files],
        'sql': pair_sql,
        'size_kb': len(pair_sql) / 1024,
        'records': pair_sql.count('),(') + pair_sql.count('VALUES')
    })

    if pair_idx % 50 == 0 or pair_idx == len(pairs):
        print(f"  [{pair_idx}/{len(pairs)}] pairs loaded")

print(f"\n[OK] {len(pair_contents)} pares cargados en memoria")

# Display load plan
print(f"\n[PLAN DE CARGA]")
print(f"  Total pares: {len(pair_contents)}")
print(f"  Tamaño total: {sum(p['size_kb'] for p in pair_contents) / 1024:.1f} MB")
print(f"  Registros totales: {sum(p['records'] for p in pair_contents):,}")
print(f"  Tiempo estimado: ~{len(pair_contents) // 10 + 1} minutos")

# Show sample pairs
print(f"\n[PRIMERAS 5 PARES]")
for p in pair_contents[:5]:
    print(f"  Pair {p['pair_num']:3d}: {', '.join(p['files']):30s} | {p['size_kb']:6.1f} KB")

if len(pair_contents) > 5:
    print(f"  ...")
    for p in pair_contents[-2:]:
        print(f"  Pair {p['pair_num']:3d}: {', '.join(p['files']):30s} | {p['size_kb']:6.1f} KB")

# Save execution log
log_file = os.path.join(GROUP_DIR, 'load_execution_log.json')
log_data = {
    'timestamp': datetime.now().isoformat(),
    'total_pairs': len(pair_contents),
    'total_size_mb': sum(p['size_kb'] for p in pair_contents) / 1024,
    'total_records': sum(p['records'] for p in pair_contents),
    'status': 'READY',
    'pairs': pair_contents[:10]  # Store first 10 for reference
}

with open(log_file, 'w', encoding='utf-8') as f:
    json.dump(log_data, f, indent=2, default=str)

print(f"\n[*] Log guardado: {os.path.basename(log_file)}")

print(f"\n[ESTADO]")
print(f"  ✅ {len(pair_contents)} pares preparados")
print(f"  ✅ {sum(p['size_kb'] for p in pair_contents) / 1024:.1f} MB SQL listo")
print(f"  ✅ {sum(p['records'] for p in pair_contents):,} registros a cargar")
print(f"\n[PRÓXIMO PASO]")
print(f"  Ejecutar via:")
print(f"  1. Supabase Dashboard - copiar/pegar cada pair")
print(f"  2. Script bash con curl (requiere API key)")
print(f"  3. Script PowerShell loop (esta sesión)")

print(f"\n[LISTO PARA INGESTAR]")
