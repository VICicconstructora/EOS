@echo off
REM Corre el espejo de Supabase -> OneDrive. Lo invoca el Programador de Tareas
REM una vez al dia. Registra la salida en mirror.log (sobrescribe cada corrida).
REM PORTABLE: usa un venv local a la maquina (fuera de OneDrive), igual que
REM run_scraper.cmd, para servir en cualquier usuario sin rutas absolutas.
setlocal
cd /d "%~dp0"

set "VENV=%LOCALAPPDATA%\ic-sharepoint-scraper\venv"
set "VPY=%VENV%\Scripts\python.exe"

if not exist "%VPY%" (
  py -3.12 -m venv "%VENV%" 2>nul || py -3 -m venv "%VENV%" 2>nul || python -m venv "%VENV%"
  "%VPY%" -m pip install --upgrade pip
  "%VPY%" -m pip install -r "%~dp0requirements.txt"
)

"%VPY%" "%~dp0export_mirror.py" > "%~dp0mirror.log" 2>&1
endlocal
