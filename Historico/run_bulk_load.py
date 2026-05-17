# -*- coding: utf-8 -*-
"""
Bulk load all sub-batches into Supabase using PostgreSQL connection
"""
import os
import glob
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import warnings
warnings.filterwarnings('ignore')

print("=" * 80)
print("BULK LOAD: Cargar todos los datos en Supabase")
print("=" * 80)

SUB_BATCH_DIR = r'C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches'

# Get all sub-batch files
sub_batches = sorted(glob.glob(os.path.join(SUB_BATCH_DIR, '*.sql')))
total = len(sub_batches)

print(f"\n[*] Sub-batches encontrados: {total}")

if total == 0:
    print("[ERROR] No sub-batch files found")
    sys.exit(1)

# Combine sub-batches into execution units
print(f"\n[*] Combinando sub-batches en unidades de 10...")

execution_units = []
current_sql = ""
current_count = 0
unit_num = 1

for i, sb_file in enumerate(sub_batches, 1):
    with open(sb_file, 'r', encoding='utf-8') as f:
        sql = f.read()

    current_sql += sql + "\n"
    current_count += 1

    if current_count >= 10 or i == total:
        execution_units.append({
            'num': unit_num,
            'sql': current_sql,
            'size_kb': len(current_sql) / 1024,
            'records': current_sql.count("),(") + 1
        })

        if unit_num % 20 == 0 or unit_num == 1 or i == total:
            print(f"  Unit {unit_num}: {len(current_sql) / 1024:.1f} KB, ~{current_sql.count('),(') + 1} registros")

        current_sql = ""
        current_count = 0
        unit_num += 1

print(f"\n[OK] Total units created: {len(execution_units)}")

# Calculate statistics
total_size = sum(u['size_kb'] for u in execution_units)
total_records = sum(u['records'] for u in execution_units)

print(f"\n[ESTADÍSTICAS]")
print(f"  Total units: {len(execution_units)}")
print(f"  Total size: {total_size / 1024:.1f} MB")
print(f"  Total records: ~{total_records:,}")
print(f"  Avg unit size: {(total_size / len(execution_units)):.1f} KB")

# Try to execute using psycopg2 if available
try:
    import psycopg2
    print(f"\n[INFO] psycopg2 disponible - intentando conexión directa...")

    # Would need actual DB credentials
    print(f"[ERROR] Se requieren credenciales de PostgreSQL")

except ImportError:
    print(f"\n[INFO] psycopg2 no disponible")

# Save execution plan
import json

exec_plan = {
    'total_units': len(execution_units),
    'total_size_mb': total_size / 1024,
    'total_records': total_records,
    'units': [
        {
            'num': u['num'],
            'size_kb': round(u['size_kb'], 1),
            'records': u['records']
        } for u in execution_units
    ]
}

plan_file = os.path.join(SUB_BATCH_DIR, 'execution_plan.json')
with open(plan_file, 'w', encoding='utf-8') as f:
    json.dump(exec_plan, f, indent=2)

print(f"\n[*] Execution plan guardado: {plan_file}")

print(f"\n[PRÓXIMOS PASOS]")
print(f"1. Opción A: Ejecutar manualmente en Supabase Dashboard > SQL Editor")
print(f"   - Tiempo estimado: ~{len(execution_units)} minutos (1 unit/min)")
print(f"2. Opción B: Usar API de Supabase con cliente autorizado")
print(f"3. Opción C: Usar psycopg2 con credenciales PostgreSQL directas")

print(f"\n[OK] Datos listos para ingestar")
