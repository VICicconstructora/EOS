#!/usr/bin/env python3
"""
Ejecuta chunks SQL via HTTP REST API de Supabase
Sin necesidad de conexión directa a PostgreSQL
"""

import os
import requests
import json
from pathlib import Path
import time
from datetime import datetime

# Configuración
GROUP_DIR = r"C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches\execution_groups"
SUPABASE_URL = "https://zbjwasufengayvmutypr.supabase.co"
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# Obtener el anon key si no hay service key
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpiandhc3VmZW5nYXl2bXV0eXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTQ3MTEsImV4cCI6MjA5MTY3MDcxMX0.7OLRA7dUBwpUNUIBoLN8S5zCHVKQ8YX7eMDEKiGIjYs"

API_KEY = SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY

print("════════════════════════════════════════════════════════════")
print("EJECUTAR CHUNKS VIA HTTP REST API")
print("════════════════════════════════════════════════════════════")
print("")

# Leer SQL completo
print("[*] Leyendo SQL completo...")
sql_file = os.path.join(GROUP_DIR, "CARGA_COMPLETA.sql")
with open(sql_file, 'r', encoding='utf-8') as f:
    sql_completo = f.read()

# Dividir por INSERTs
inserts = [s for s in sql_completo.split("INSERT INTO") if s.strip()]

print(f"[✓] Total sentencias: {len(inserts)}")
print("")

# Dividir en chunks de 10 INSERTs
chunk_size = 10
chunks = []

for i in range(0, len(inserts), chunk_size):
    chunk_inserts = inserts[i:i+chunk_size]
    chunk_sql = "INSERT INTO" + "INSERT INTO".join(chunk_inserts)
    chunks.append(chunk_sql)

print(f"[✓] Chunks creados: {len(chunks)}")
print(f"[*] Tamaño promedio: {sum(len(c) for c in chunks) // len(chunks) // 1024} KB")
print("")

# Headers para requests
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Ejecutar chunks
print("════════════════════════════════════════════════════════════")
print("EJECUTANDO CHUNKS")
print("════════════════════════════════════════════════════════════")
print("")

stats = {
    'total': len(chunks),
    'success': 0,
    'error': 0,
    'start_time': datetime.now(),
    'total_rows': 0
}

for i, chunk in enumerate(chunks, 1):
    try:
        # Endpoint de RPC para ejecutar SQL
        # Nota: Supabase no tiene un endpoint directo para SQL
        # Por eso intentamos via HTTP pero sin respuesta

        # Fallback: preparar para ejecución manual
        if i == 1:
            print("[!] Supabase HTTP API no permite ejecutar SQL directo")
            print("[!] Los chunks están preparados para ejecutar manualmente")
            break

    except Exception as e:
        print(f"[✗] Chunk {i}: {str(e)[:80]}")
        stats['error'] += 1

print("")
print("════════════════════════════════════════════════════════════")
print("RESUMEN")
print("════════════════════════════════════════════════════════════")
print("")
print("[!] Supabase REST API no permite ejecutar SQL arbitrario")
print("[!] Alternativas:")
print("    1. Crear Edge Function (Deno)")
print("    2. Usar psycopg2 directamente (si hay conectividad)")
print("    3. Ejecutar manualmente en SQL Editor")
print("")
print("[*] Preparando archivos para opción 3 (manual)...")
