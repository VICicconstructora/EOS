#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automatiza carga de 20 archivos SQL en Supabase
Controla el navegador Chrome via Selenium
"""

import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# Configuracion
GROUP_DIR = r"C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches\execution_groups"
SUPABASE_EDITOR = "https://zbjwasufengayvmutypr.supabase.co/project/default/sql/editor"

print("=" * 60)
print("AUTO LOAD: Ejecutar 20 archivos SQL automaticamente")
print("=" * 60)
print("")

# Listar archivos
sql_files = sorted(Path(GROUP_DIR).glob("PEGAR_*.sql"))
print(f"[OK] Archivos encontrados: {len(sql_files)}")

if not sql_files:
    print("[ERROR] No hay archivos PEGAR_*.sql")
    exit(1)

print(f"[*] Abriendo navegador Chrome...")
print(f"[!] Asegurate de estar logueado en Supabase")
print("")

# Configurar Chrome
options = Options()
# options.add_argument("--headless")  # Descomentar para modo sin interfaz
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--disable-blink-features=AutomationControlled")

# Iniciar driver
driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=options
)

try:
    # Abrir SQL Editor
    driver.get(SUPABASE_EDITOR)
    time.sleep(5)

    print("[>] SQL Editor abierto")
    print("")

    stats = {'success': 0, 'error': 0}
    start_time = time.time()

    # Procesar cada archivo
    for idx, sql_file in enumerate(sql_files, 1):
        print(f"[{idx:2d}/{len(sql_files)}] {sql_file.name}...", end=' ', flush=True)

        try:
            # Leer archivo
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()

            file_size_kb = len(sql_content) // 1024

            # Esperar al editor
            wait = WebDriverWait(driver, 30)

            # Encontrar editor (puede tener diferentes clases)
            try:
                textarea = wait.until(
                    EC.presence_of_element_located((By.TAG_NAME, "textarea"))
                )
            except:
                # Intentar encontrar el editor de Monaco
                editor = driver.find_element(By.CLASS_NAME, "monaco-editor")
                textarea = editor

            # Hacer click en el editor
            textarea.click()
            time.sleep(1)

            # Limpiar contenido anterior
            textarea.send_keys(Keys.CONTROL + 'a')
            time.sleep(0.2)
            textarea.send_keys(Keys.DELETE)
            time.sleep(0.5)

            # Pegar SQL
            textarea.send_keys(sql_content)
            time.sleep(2)

            # Click en Execute
            execute_buttons = driver.find_elements(By.XPATH,
                "//*[contains(@class, 'Execute') or contains(text(), 'Execute') or contains(@title, 'Execute')]")

            if execute_buttons:
                execute_buttons[0].click()
            else:
                # Intentar encontrar por icono de play
                play_btn = driver.find_element(By.XPATH, "//button[contains(@aria-label, 'Execute')]")
                play_btn.click()

            # Esperar resultado (maximo 3 minutos)
            time.sleep(180)

            stats['success'] += 1
            print(f"OK ({file_size_kb}KB)")

        except Exception as e:
            stats['error'] += 1
            print(f"ERROR {str(e)[:40]}")
            time.sleep(5)  # Esperar un poco antes de continuar

        # Pequeno delay entre archivos
        if idx < len(sql_files):
            time.sleep(5)

    # Resumen
    duration = time.time() - start_time

    print("")
    print("=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"OK Exitosos: {stats['success']}")
    print(f"ERROR Errores: {stats['error']}")
    print(f"Tiempo: {int(duration / 60)} minutos {int(duration % 60)} segundos")
    print("")
    print("[*] Verifica con:")
    print("    SELECT COUNT(*) FROM flujo_historico;")
    print("    Debe retornar: ~892,945")

finally:
    print("")
    print("[>] Cerrando navegador...")
    time.sleep(3)
    driver.quit()
    print("[OK] Listo")
