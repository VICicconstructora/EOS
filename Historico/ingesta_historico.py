# -*- coding: utf-8 -*-
import pandas as pd
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import warnings
warnings.filterwarnings('ignore')

print("=" * 80)
print("INGESTA DE HISTORICO - LIMPIEZA Y TRANSFORMACION")
print("=" * 80)

excel_file = r'C:\Users\jmacallister\Downloads\Historico.xlsx'
output_file = r'C:\Users\jmacallister\OneDrive - IC CONSTRUCTORA SAS\Documentos\ICEOS\IC-EOS\historico_limpio.csv'

xls = pd.ExcelFile(excel_file)
sheet_names = xls.sheet_names

print(f"\n[INICIO] Leyendo {len(sheet_names)} hojas...")

all_data = []
for sheet_name in sheet_names:
    df = pd.read_excel(excel_file, sheet_name=sheet_name)
    print(f"[HOJA] {sheet_name:<25} | Registros: {len(df):>8,}", end="")

    # Conversion de fechas
    if df['Fecha Datos'].dtype == 'object':
        df['Fecha_Datos'] = pd.to_datetime(df['Fecha Datos'], unit='D', origin=pd.Timestamp("1899-12-30"))
    else:
        df['Fecha_Datos'] = pd.to_datetime(df['Fecha Datos'])

    if df['Fecha'].dtype == 'object':
        df['Fecha'] = pd.to_datetime(df['Fecha'], unit='D', origin=pd.Timestamp("1899-12-30"))
    else:
        df['Fecha'] = pd.to_datetime(df['Fecha'])

    # Agregar tipo de dato (historico vs proyeccion)
    df['tipo_dato'] = df.apply(
        lambda row: 'HISTORICO' if row['Fecha'] < row['Fecha_Datos'] else 'PROYECCION',
        axis=1
    )

    # Seleccionar columnas necesarias
    df = df[['Proyecto', 'Fecha_Datos', 'Fuente', 'P&G', 'Fecha', 'Valor', 'tipo_dato']]

    # Remover duplicados: quedarse con el primero de cada (Fecha Datos, Fecha, P&G, Proyecto)
    df_dedup = df.drop_duplicates(subset=['Fecha_Datos', 'Fecha', 'P&G', 'Proyecto'], keep='first')

    print(f" | Despues dedup: {len(df_dedup):>8,} | Removidos: {len(df) - len(df_dedup):>6,}")

    all_data.append(df_dedup)

# Consolidar
print(f"\n{'='*80}")
print("[CONSOLIDANDO] Todas las hojas...")
todos_df = pd.concat(all_data, ignore_index=True)

print(f"\nRegistros consolidados: {len(todos_df):,}")

# Ordenar por Proyecto, Fecha Datos, P&G, Fecha
todos_df = todos_df.sort_values(['Proyecto', 'Fecha_Datos', 'P&G', 'Fecha']).reset_index(drop=True)

# Convertir fechas a string ISO 8601
todos_df['Fecha_Datos'] = todos_df['Fecha_Datos'].dt.strftime('%Y-%m-%d')
todos_df['Fecha'] = todos_df['Fecha'].dt.strftime('%Y-%m-%d')

# Guardar a CSV
print(f"\n[GUARDANDO] {output_file}...")
todos_df.to_csv(output_file, index=False, encoding='utf-8')

print(f"[OK] Archivo guardado exitosamente")

# Resumen estadistico
print(f"\n{'='*80}")
print("[RESUMEN ESTADISTICO]")
print(f"{'='*80}")

print(f"\nTotal de registros (sin duplicados): {len(todos_df):,}")
print(f"Proyectos unicos: {todos_df['Proyecto'].nunique()}")
print(f"Lineas P&G unicas: {todos_df['P&G'].nunique()}")
print(f"Peliculas (Fecha_Datos unicas): {todos_df['Fecha_Datos'].nunique()}")
print(f"Rango de fechas:")
print(f"  Fecha Datos minima: {todos_df['Fecha_Datos'].min()}")
print(f"  Fecha Datos maxima: {todos_df['Fecha_Datos'].max()}")
print(f"  Fecha minima: {todos_df['Fecha'].min()}")
print(f"  Fecha maxima: {todos_df['Fecha'].max()}")

print(f"\nDistribucion de tipos:")
print(f"  Datos HISTORICOS: {(todos_df['tipo_dato'] == 'HISTORICO').sum():,}")
print(f"  Datos PROYECCION: {(todos_df['tipo_dato'] == 'PROYECCION').sum():,}")

print(f"\nPrimeras 10 filas:")
print(todos_df.head(10).to_string())

print(f"\n{'='*80}")
print("[INGESTA COMPLETADA]")
print(f"{'='*80}\n")
