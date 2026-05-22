#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Carga automatica de 40 archivos SQL en Supabase SQL Editor (v2)
Optimizado para editor Monaco
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

GROUP_DIR = r"C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches\execution_groups"
SUPABASE = "https://zbjwasufengayvmutypr.supabase.co/project/default/sql/editor"

print("=" * 60)
print("AUTO LOAD v2: 40 archivos (2.5 MB c/u)")
print("=" * 60)
print("")

sql_files = sorted(Path(GROUP_DIR).glob("CARGAR_*.sql"))
print(f"[OK] Encontrados: {len(sql_files)} archivos")

if not sql_files:
    print("[ERROR] No hay archivos CARGAR_*.sql")
    exit(1)

print(f"[*] Abriendo navegador...")
print("")

options = Options()
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=options
)

try:
    driver.get(SUPABASE)
    time.sleep(5)
    print("[>] Abierto SQL Editor")
    print("")

    stats = {'success': 0, 'error': 0}
    start_time = time.time()

    for idx, sql_file in enumerate(sql_files, 1):
        print(f"[{idx:2d}/{len(sql_files)}] {sql_file.name}...", end=' ', flush=True)

        try:
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()

            # Esperar y limpiar editor
            wait = WebDriverWait(driver, 10)

            # Buscar textarea o elemento contenteditable
            try:
                # Intentar textarea primero
                editor_elem = wait.until(
                    EC.presence_of_element_located((By.XPATH, "//textarea"))
                )
            except:
                try:
                    # Luego buscar div contenteditable (Monaco)
                    editor_elem = driver.find_element(
                        By.XPATH,
                        "//div[@contenteditable='true'] | //div[contains(@class, 'monaco')]"
                    )
                except:
                    # Última opción: cualquier textarea o contenteditable
                    editor_elem = driver.find_element(By.TAG_NAME, "textarea")

            # Click y limpiar
            editor_elem.click()
            time.sleep(1)
            editor_elem.send_keys(Keys.CONTROL + 'a')
            editor_elem.send_keys(Keys.DELETE)
            time.sleep(0.5)

            # Pegar
            editor_elem.send_keys(sql_content)
            time.sleep(2)

            # Ejecutar: buscar boton Execute
            try:
                btn = driver.find_element(
                    By.XPATH,
                    "//*[contains(@class, 'Execute') or contains(@aria-label, 'Execute')]"
                )
                btn.click()
            except:
                # Intentar con boton generico
                btns = driver.find_elements(By.TAG_NAME, "button")
                for b in btns:
                    if "execute" in b.get_attribute("aria-label").lower() if b.get_attribute("aria-label") else "":
                        b.click()
                        break

            # Esperar resultado
            time.sleep(120)  # 2 minutos

            stats['success'] += 1
            print("OK")

        except Exception as e:
            stats['error'] += 1
            print(f"ERROR")
            time.sleep(5)

        # Delay entre archivos
        if idx < len(sql_files):
            time.sleep(3)

    duration = time.time() - start_time

    print("")
    print("=" * 60)
    print(f"OK: {stats['success']} | ERROR: {stats['error']}")
    print(f"Tiempo: {int(duration / 60)} min {int(duration % 60)} seg")
    print("=" * 60)

finally:
    print("")
    print("[>] Cerrando...")
    time.sleep(2)
    driver.quit()
    print("[OK]")
