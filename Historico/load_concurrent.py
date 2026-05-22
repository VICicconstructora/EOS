#!/usr/bin/env python3
"""
Carga concurrente de 499 grupos SQL en Supabase
Ejecuta 5 grupos en paralelo utilizando ThreadPoolExecutor
"""

import os
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import json
from datetime import datetime

try:
    import psycopg2
    from psycopg2 import pool, sql
except ImportError:
    print("[ERROR] psycopg2 no está instalado")
    print("[INFO] Instala con: pip install psycopg2-binary")
    sys.exit(1)

# Configuración
GROUP_DIR = r"C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches\execution_groups"
DB_HOST = "zbjwasufengayvmutypr.db.supabase.co"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres"
# NOTA: Usa credenciales de Supabase (obtén la contraseña del dashboard)
DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")

# Validación inicial
if not os.path.exists(GROUP_DIR):
    print(f"[ERROR] Directorio no encontrado: {GROUP_DIR}")
    sys.exit(1)

if not DB_PASSWORD:
    print("[ERROR] Variable de entorno SUPABASE_DB_PASSWORD no configurada")
    print("[INFO] Establece: $env:SUPABASE_DB_PASSWORD = 'tu_password'")
    sys.exit(1)

# Configuración de conexión a base de datos
db_config = {
    'host': DB_HOST,
    'port': DB_PORT,
    'database': DB_NAME,
    'user': DB_USER,
    'password': DB_PASSWORD,
    'connect_timeout': 10,
    'options': '-c statement_timeout=300000'  # 5 minutos timeout
}

# Pool de conexiones (máximo 5 conexiones concurrentes)
try:
    connection_pool = psycopg2.pool.SimpleConnectionPool(1, 5, **db_config)
    print("[OK] Pool de conexiones creado")
except Exception as e:
    print(f"[ERROR] No se pudo conectar a Supabase: {e}")
    sys.exit(1)

# Estadísticas globales
stats = {
    'total_groups': 0,
    'completed': 0,
    'errors': 0,
    'start_time': datetime.now(),
    'results': []
}

def execute_group(group_file, group_num):
    """Ejecuta un archivo SQL en la base de datos"""
    conn = None
    try:
        # Obtener conexión del pool
        conn = connection_pool.getconn()
        cursor = conn.cursor()

        # Leer archivo SQL
        with open(group_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()

        file_size_kb = os.path.getsize(group_file) / 1024

        # Ejecutar SQL
        start = time.time()
        cursor.execute(sql_content)
        conn.commit()
        duration = time.time() - start

        # Obtener número de rows afectados
        affected_rows = cursor.rowcount if cursor.rowcount >= 0 else 0

        cursor.close()

        result = {
            'group': group_num,
            'status': 'OK',
            'file_size_kb': round(file_size_kb, 1),
            'rows': affected_rows,
            'duration_sec': round(duration, 2)
        }

        stats['completed'] += 1
        stats['results'].append(result)

        print(f"[✓] Grupo {group_num:03d}: {affected_rows:6d} rows en {duration:.2f}s ({file_size_kb:.0f}KB)")

        return result

    except Exception as e:
        stats['errors'] += 1
        error_msg = str(e)[:100]
        print(f"[✗] Grupo {group_num:03d}: ERROR - {error_msg}")
        stats['results'].append({
            'group': group_num,
            'status': 'ERROR',
            'error': str(e)[:200]
        })
        return None

    finally:
        if conn:
            connection_pool.putconn(conn)

def main():
    print("=" * 80)
    print("CARGA CONCURRENTE: 499 grupos en Supabase (5 en paralelo)")
    print("=" * 80)

    # Listar archivos
    group_files = sorted(Path(GROUP_DIR).glob("group_*.sql"))
    stats['total_groups'] = len(group_files)

    print(f"\n[*] Grupos encontrados: {stats['total_groups']}")
    print(f"[*] Conexión: {DB_USER}@{DB_HOST}")
    print(f"[*] Estrategia: ThreadPoolExecutor (5 workers concurrentes)")

    if not group_files:
        print("[ERROR] No se encontraron archivos group_*.sql")
        return 1

    print("\n[*] Iniciando ejecución...\n")

    # Ejecutar en paralelo
    with ThreadPoolExecutor(max_workers=5) as executor:
        # Enviar todas las tareas
        future_to_group = {
            executor.submit(execute_group, str(gf), i+1): i+1
            for i, gf in enumerate(group_files)
        }

        # Procesar resultados conforme se completan
        for future in as_completed(future_to_group):
            try:
                future.result()
            except Exception as e:
                print(f"[ERROR] Excepción: {e}")

    # Resumen
    duration_total = (datetime.now() - stats['start_time']).total_seconds()

    print("\n" + "=" * 80)
    print("RESUMEN DE EJECUCIÓN")
    print("=" * 80)
    print(f"Total grupos: {stats['total_groups']}")
    print(f"Completados: {stats['completed']} ✓")
    print(f"Errores: {stats['errors']} ✗")
    print(f"Tiempo total: {duration_total:.1f} segundos ({duration_total/60:.1f} minutos)")

    if stats['completed'] > 0:
        rows_total = sum(r.get('rows', 0) for r in stats['results'] if r.get('status') == 'OK')
        print(f"Registros insertados: {rows_total:,}")
        print(f"Velocidad: {rows_total/duration_total:.0f} registros/segundo")

    print("\n[PRÓXIMOS PASOS]")
    print("1. Verificar: SELECT COUNT(*) FROM flujo_historico;")
    print("   Debe retornar: ~892,901 registros")
    print("2. Si hay errores, revisar el log detallado")

    # Guardar log
    log_file = os.path.join(GROUP_DIR, "execution_log.json")
    with open(log_file, 'w') as f:
        json.dump({
            'timestamp': stats['start_time'].isoformat(),
            'duration_seconds': duration_total,
            'total_groups': stats['total_groups'],
            'completed': stats['completed'],
            'errors': stats['errors'],
            'results': stats['results']
        }, f, indent=2)

    print(f"\n[OK] Log guardado: {log_file}")

    # Cerrar pool
    connection_pool.closeall()

    return 0 if stats['errors'] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
