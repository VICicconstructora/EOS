# -*- coding: utf-8 -*-
import pandas as pd
import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import warnings
warnings.filterwarnings('ignore')

excel_file = r'C:\Users\jmacallister\Downloads\Historico.xlsx'

print("=" * 80)
print("ANALISIS FINAL - TOTAL por Proyecto")
print("=" * 80)

xls = pd.ExcelFile(excel_file)
sheet_names = xls.sheet_names

all_data = {}
print(f"\n[INICIO] Leyendo {len(sheet_names)} hojas...\n")

for sheet_name in sheet_names:
    df = pd.read_excel(excel_file, sheet_name=sheet_name)

    # Conversion de fechas si es necesario
    if df['Fecha Datos'].dtype == 'object':
        df['Fecha_Datos_dt'] = pd.to_datetime(df['Fecha Datos'], unit='D', origin=pd.Timestamp("1899-12-30"))
    else:
        df['Fecha_Datos_dt'] = pd.to_datetime(df['Fecha Datos'])

    if df['Fecha'].dtype == 'object':
        df['Fecha_dt'] = pd.to_datetime(df['Fecha'], unit='D', origin=pd.Timestamp("1899-12-30"))
    else:
        df['Fecha_dt'] = pd.to_datetime(df['Fecha'])

    all_data[sheet_name] = df
    print(f"[HOJA] {sheet_name:<25} | Registros: {len(df):>8,}", end="")

    # Buscar duplicados en (Fecha Datos, Fecha, P&G, Proyecto)
    duplicados_en_hoja = df.groupby(['Fecha Datos', 'Fecha', 'P&G', 'Proyecto'])['Valor'].agg(['count', 'nunique'])
    duplicados_en_hoja = duplicados_en_hoja[duplicados_en_hoja['count'] > 1]

    if len(duplicados_en_hoja) > 0:
        print(f" | ADVERTENCIA: {len(duplicados_en_hoja)} DUPLICADOS")
    else:
        print(f" | OK")

# Consolidar
print(f"\n{'='*80}")
print("[CONSOLIDANDO] Datos...")
todos_df = pd.concat(all_data.values(), ignore_index=True)

print(f"\n[RESUMEN GENERAL]")
print(f"   Total de registros: {len(todos_df):,}")
print(f"   Total de proyectos: {todos_df['Proyecto'].nunique()}")
print(f"   Total de lineas P&G: {todos_df['P&G'].nunique()}")
print(f"   Total de peliculas: {todos_df['Fecha Datos'].nunique()}")

# VALIDACION 1: Clave (Fecha Datos, Fecha, P&G, Proyecto) debe ser unica
print(f"\n{'='*80}")
print("[VALIDACION 1] Clave Unica: (Fecha Datos, Fecha, P&G, Proyecto)")
print(f"{'='*80}")

duplicados = todos_df.groupby(['Fecha Datos', 'Fecha', 'P&G', 'Proyecto'])['Valor'].agg(['count'])
duplicados = duplicados[duplicados['count'] > 1]

print(f"\nRegistros duplicados (misma clave aparece mas de una vez): {len(duplicados)}")
if len(duplicados) > 0:
    print(f"[ADVERTENCIA] Encontrados {len(duplicados)} combinaciones duplicadas")
else:
    print(f"[OK] Clave es unica")

# VALIDACION 2: TOTAL = SUM(Valor) para cada (Fecha Datos, P&G, Proyecto)
print(f"\n{'='*80}")
print("[VALIDACION 2] TOTAL = SUM(Valor) por (Fecha Datos, P&G, Proyecto)")
print(f"{'='*80}")

total_mismatch = []
for (fecha_datos, pg, proyecto), grupo in todos_df.groupby(['Fecha Datos', 'P&G', 'Proyecto']):
    suma_valores = grupo['Valor'].sum()
    total = grupo['TOTAL'].iloc[0]

    if pd.notna(total) and abs(total - suma_valores) > 0.01:
        total_mismatch.append({
            'fecha_datos': fecha_datos,
            'pg': pg,
            'proyecto': proyecto,
            'total': total,
            'suma': suma_valores,
            'diferencia': abs(total - suma_valores),
            'num_fechas': grupo['Fecha'].nunique()
        })

if total_mismatch:
    print(f"\n[ADVERTENCIA] ENCONTRADOS {len(total_mismatch)} TOTAL MISMATCH:\n")
    for item in total_mismatch[:20]:
        print(f"  Fecha Datos: {item['fecha_datos']} | P&G: {item['pg']}")
        print(f"  Proyecto: {item['proyecto']}")
        print(f"  Num Fechas diferentes: {item['num_fechas']}")
        print(f"  TOTAL: {item['total']:>15,.0f} | SUM(Valor): {item['suma']:>15,.0f} | Diferencia: {item['diferencia']:>12,.0f}\n")

    if len(total_mismatch) > 20:
        print(f"  ... y {len(total_mismatch) - 20} mas")
else:
    print(f"\n[OK] Todos los TOTAL coinciden con SUM(Valor)")

# Resumen final
print(f"\n{'='*80}")
print("[RESUMEN FINAL]")
print(f"{'='*80}")

print(f"\nTotal de registros: {len(todos_df):,}")
print(f"Registros duplicados: {len(duplicados)}")
print(f"TOTAL Mismatch: {len(total_mismatch)}")

if len(duplicados) == 0 and len(total_mismatch) == 0:
    print(f"\n[EXCELENTE] Datos sin inconsistencias!")
    print("Listo para ingestar")
else:
    print(f"\n[CRITICO] Se encontraron inconsistencias")
    if len(duplicados) > 0:
        print(f"  - {len(duplicados)} registros duplicados")
    if len(total_mismatch) > 0:
        print(f"  - {len(total_mismatch)} TOTAL mismatch")

print(f"\n{'='*80}\n")
