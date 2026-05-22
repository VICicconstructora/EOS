#!/usr/bin/env python3
"""
Automatiza la carga de archivos SQL en Supabase SQL Editor
Usa Selenium para controlar el navegador automáticamente
"""

import os
import sys
import time
from pathlib import Path

# Intentar importar Selenium
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options
except ImportError:
    print("[!] Selenium no está instalado")
    print("[*] Instala con: pip install selenium")
    sys.exit(1)

# Configuración
GROUP_DIR = r"C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches\execution_groups"
SUPABASE_EDITOR_URL = "https://zbjwasufengayvmutypr.supabase.co/project/default/sql/editor"

print("════════════════════════════════════════════════════════════")
print("AUTO EXECUTE: Cargar archivos SQL automáticamente")
print("════════════════════════════════════════════════════════════")
print("")

# Listar archivos
sql_files = sorted(Path(GROUP_DIR).glob("PEGAR_*.sql"))
print(f"[*] Archivos encontrados: {len(sql_files)}")

if not sql_files:
    print("[ERROR] No se encontraron archivos PEGAR_*.sql")
    sys.exit(1)

print("")
print("[*] Iniciando Selenium WebDriver...")
print("[!] IMPORTANTE: Debes estar logueado en Supabase en el navegador")
print("")

# Configurar opciones de Chrome
chrome_options = Options()
# chrome_options.add_argument("--headless")  # Sin interfaz (comentado para que veas qué pasa)
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")

try:
    driver = webdriver.Chrome(options=chrome_options)
except Exception as e:
    print(f"[ERROR] No se puede iniciar Chrome: {e}")
    print("[*] Asegúrate de que chromedriver está instalado")
    print("[*] Instala con: pip install webdriver-manager")
    sys.exit(1)

try:
    print(f"[→] Abriendo Supabase SQL Editor...")
    driver.get(SUPABASE_EDITOR_URL)
    time.sleep(3)

    # Ejecutar cada archivo
    success_count = 0
    error_count = 0

    for idx, sql_file in enumerate(sql_files[:3], 1):  # Primeros 3 archivos como prueba
        print(f"\n[{idx}/{len(sql_files)}] Procesando {sql_file.name}...")

        # Leer archivo
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()

        try:
            # Esperar a que el editor esté listo
            wait = WebDriverWait(driver, 10)

            # Buscar el área de editor
            editor = wait.until(
                EC.presence_of_element_located((By.CLASS_NAME, "monaco-editor"))
            )

            print(f"  [→] Pegando contenido ({len(sql_content) // 1024} KB)...")

            # Click en el editor
            editor.click()
            time.sleep(1)

            # Limpiar editor (Ctrl+A, Delete)
            editor.send_keys(Keys.CONTROL + 'a')
            editor.send_keys(Keys.DELETE)
            time.sleep(0.5)

            # Pegar contenido
            editor.send_keys(sql_content)
            time.sleep(2)

            # Buscar botón Execute
            execute_btn = driver.find_element(By.XPATH, "//button[contains(@title, 'Execute')]")
            print(f"  [→] Ejecutando...")
            execute_btn.click()

            # Esperar resultado (máximo 5 minutos)
            print(f"  [⏳] Esperando resultado...")
            time.sleep(180)  # 3 minutos

            # Verificar si hay mensaje de éxito
            try:
                success_msg = driver.find_element(By.XPATH, "//*[contains(text(), 'Success')]")
                print(f"  [✓] Completado")
                success_count += 1
            except:
                print(f"  [?] Sin confirmación clara")
                error_count += 1

        except Exception as e:
            print(f"  [✗] Error: {str(e)[:80]}")
            error_count += 1

    # Resumen
    print("\n" + "════" * 14)
    print("RESUMEN")
    print("════" * 14)
    print(f"Exitosos: {success_count}")
    print(f"Errores: {error_count}")
    print(f"\n[*] Verifica en Supabase:")
    print(f"    SELECT COUNT(*) FROM flujo_historico;")

finally:
    print("\n[*] Cerrando navegador...")
    driver.quit()
    print("[OK] Listo")
