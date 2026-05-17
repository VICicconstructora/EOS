# -*- coding: utf-8 -*-
import pandas as pd
import os
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import warnings
warnings.filterwarnings('ignore')

print("=" * 80)
print("CONVERSION: CSV A SQL INSERTS PARA SUPABASE")
print("=" * 80)

csv_file = r'C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\historico_limpio.csv'
output_dir = r'C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico'

print(f"\n[*] Leyendo CSV: {csv_file}")
df = pd.read_csv(csv_file)

print(f"[*] Registros cargados: {len(df):,}")
print(f"[*] Columnas: {list(df.columns)}")

# Renombrar columnas para mapear a tabla flujo_historico
# CSV: Proyecto, Fecha_Datos, Fuente, P&G, Fecha, Valor, tipo_dato
# DB:  company_id, proyecto, fecha_datos, fuente, linea_contable, fecha_periodo, valor, tipo_linea

# Preparar dataframe
df['company_id'] = 'ic-constructora'
df['proyecto'] = df['Proyecto']
df['fecha_datos'] = df['Fecha_Datos']
df['fuente'] = df['Fuente']
df['linea_contable'] = df['P&G']
df['fecha_periodo'] = df['Fecha']
df['valor'] = df['Valor'].fillna(0).astype(int)
df['tipo_linea'] = df['P&G'].str.extract(r'(FCL|Ventas|Costo)')[0].fillna('Otro').replace('Costo', 'Costos')

df_sql = df[['company_id', 'proyecto', 'fecha_datos', 'fuente', 'linea_contable', 'fecha_periodo', 'valor', 'tipo_linea']]

print(f"\n[*] Generando sentencias INSERT...")

# Dividir en lotes para evitar sentencias muy grandes
batch_size = 100
total_rows = len(df_sql)
batch_num = 1
sql_files = []

for i in range(0, total_rows, batch_size):
    batch = df_sql.iloc[i:i+batch_size]

    sql = "INSERT INTO public.flujo_historico (company_id, proyecto, fecha_datos, fuente, linea_contable, fecha_periodo, valor, tipo_linea) VALUES\n"

    values = []
    for _, row in batch.iterrows():
        value_str = f"('{row['company_id']}', '{row['proyecto'].replace(chr(39), chr(39)*2)}', '{row['fecha_datos']}', '{row['fuente'].replace(chr(39), chr(39)*2)}', '{row['linea_contable'].replace(chr(39), chr(39)*2)}', '{row['fecha_periodo']}', {row['valor']}, '{row['tipo_linea']}')"
        values.append(value_str)

    sql += ",\n".join(values)
    sql += ";"

    output_file = os.path.join(output_dir, f'chunk_{batch_num:03d}.sql')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(sql)

    sql_files.append(output_file)
    print(f"  [Chunk {batch_num}] {len(batch)} registros → {os.path.getsize(output_file) / 1024:.1f} KB")

    batch_num += 1

print(f"\n[OK] Generadas {len(sql_files)} archivos SQL")
print(f"[*] Archivos generados en: {output_dir}")
print(f"\nPasos siguientes:")
print(f"1. Ejecutar cada archivo SQL en Supabase Dashboard SQL Editor")
print(f"2. O utilizar esta linea de Python para ejecutar automaticamente:")
print(f"   python csv_to_supabase_execute.py")
