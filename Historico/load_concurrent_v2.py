#!/usr/bin/env python3
"""
Carga concurrente de 499 grupos SQL en Supabase — Versión 2
Pide la contraseña de forma interactiva si no está configurada
"""

import os
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import json
from datetime import datetime
import getpass

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

# Obtener contraseña
DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")

if not DB_PASSWORD:
    print("=" * 80)
    print("CARGA CONCURRENTE DE HISTÓRICO — Configuración de credenciales")
    print("=" * 80)
    print(f"\nHost: {DB_HOST}")
    print(f"Usuario: {DB_USER}")
    print(f"BD: {DB_NAME}")
    print("\n[!] Necesitas la contraseña de PostgreSQL de Supabase")
    print("[!] Obtenerla de:")
    print("    1. Ve a: https://zbjwasufengayvmutypr.supabase.co/")
    print("    2. Proyecto default → Settings → Database")
    print("    3. Busca 'Database password' o 'Connection string'")
    print("    4. La contraseña está entre los '**' o en la cadena de conexión")
    print("\n[*] Ingresa la contraseña (no se mostrará mientras escribes):")
    DB_PASSWORD = getpass.getpass("Contraseña: ")

if not DB_PASSWORD.strip():
    print("[ERROR] Contraseña vacía")
    sys.exit(1)

# Validación inicial
if not os.path.exists(GROUP_DIR):
    print(f"[ERROR] Directorio no encontrado: {GROUP_DIR}")
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

# Pool de conexiones
print("\n[*] Conectando a Supabase PostgreSQL...")
try:
    test_conn = psycopg2.connect(**db_config)
    test_conn.close()
    print("[✓] Conexión exitosa")
    connection_pool = psycopg2.pool.SimpleConnectionPool(1, 5, **db_config)
    print("[✓] Pool de conexiones creado (5 workers)")
except Exception as e:
    print(f"[ERROR] Conexión fallida: {e}")
    sys.exit(1)

# Estadísticas globales
stats = {
    'total_groups': 0,
    'completed': 0,
    'errors': 0,
    'total_rows': 0,
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
        stats['total_rows'] += affected_rows
        stats['results'].append(result)

        return result

    except Exception as e:
        stats['errors'] += 1
        error_msg = str(e)[:100]
        result = {
            'group': group_num,
            'status': 'ERROR',
            'error': error_msg
        }
        stats['results'].append(result)
        return result

    finally:
        if conn:
            connection_pool.putconn(conn)

def main():
    print("\n" + "=" * 80)
    print("EJECUCIÓN CONCURRENTE: 499 grupos (5 en paralelo)")
    print("=" * 80)

    # Listar archivos
    group_files = sorted(Path(GROUP_DIR).glob("group_*.sql"))
    stats['total_groups'] = len(group_files)

    print(f"\n[*] Grupos encontrados: {stats['total_groups']}")
    print(f"[*] Directorio: {GROUP_DIR}")

    if not group_files:
        print("[ERROR] No se encontraron archivos group_*.sql")
        return 1

    print(f"\n[*] Iniciando ejecución con 5 workers concurrentes...\n")

    # Ejecutar en paralelo
    completed = 0
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_group = {
            executor.submit(execute_group, str(gf), i+1): i+1
            for i, gf in enumerate(group_files)
        }

        for future in as_completed(future_to_group):
            result = future.result()
            completed += 1
            if result and result['status'] == 'OK':
                print(f"[✓] {completed:3d}/{stats['total_groups']} - Grupo {result['group']:03d}: "
                      f"{result['rows']:6d} rows en {result['duration_sec']:5.2f}s")
            else:
                print(f"[✗] {completed:3d}/{stats['total_groups']} - Grupo {result['group']:03d}: ERROR")

    # Resumen
    duration_total = (datetime.now() - stats['start_time']).total_seconds()

    print("\n" + "=" * 80)
    print("RESUMEN FINAL")
    print("=" * 80)
    print(f"Total grupos procesados: {stats['total_groups']}")
    print(f"Exitosos: {stats['completed']}")
    print(f"Errores: {stats['errors']}")
    print(f"Total registros cargados: {stats['total_rows']:,}")
    print(f"Tiempo total: {duration_total:.1f} segundos ({duration_total/60:.1f} minutos)")

    if stats['total_rows'] > 0:
        print(f"Velocidad: {stats['total_rows']/duration_total:.0f} registros/segundo")

    print("\n[VERIFICACIÓN]")
    print("Ejecuta en Supabase SQL Editor:")
    print("  SELECT COUNT(*) FROM flujo_historico;")
    print("  Debe retornar: ~892,945 (892,901 + 45 de pruebas anteriores)")

    # Guardar log detallado
    log_file = os.path.join(GROUP_DIR, "execution_log_concurrent.json")
    with open(log_file, 'w') as f:
        json.dump({
            'timestamp': stats['start_time'].isoformat(),
            'duration_seconds': duration_total,
            'total_groups': stats['total_groups'],
            'completed': stats['completed'],
            'errors': stats['errors'],
            'total_rows': stats['total_rows'],
            'results': stats['results'][:10] + ['... (más en la ejecución)'] if len(stats['results']) > 10 else stats['results']
        }, f, indent=2)

    print(f"[OK] Log guardado: {log_file}")

    # Cerrar pool
    connection_pool.closeall()

    return 0 if stats['errors'] == 0 else 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n[CANCELADO] Ejecución interrumpida por usuario")
        sys.exit(1)
