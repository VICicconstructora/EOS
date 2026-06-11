@echo off
REM ---------------------------------------------------------------------------
REM Launcher PORTABLE del scraper de SharePoint.
REM Funciona en cualquier equipo/usuario (Administrador, jmacallister, etc.)
REM sin depender de un venv sincronizado por OneDrive.
REM
REM Clave: el venv vive en %LOCALAPPDATA% (local a cada maquina, NUNCA en
REM OneDrive). Si no existe, se crea e instala solo. Python se ubica con el
REM lanzador 'py' (independiente de la ruta de instalacion del usuario).
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"

set "VENV=%LOCALAPPDATA%\ic-sharepoint-scraper\venv"
set "VPY=%VENV%\Scripts\python.exe"

if not exist "%VPY%" (
  echo [setup] Creando entorno local en "%VENV%" ...
  py -3.12 -m venv "%VENV%" 2>nul || py -3 -m venv "%VENV%" 2>nul || python -m venv "%VENV%"
  if not exist "%VPY%" (
    echo [ERROR] No se pudo crear el venv. Instala Python 3.12 ^(winget install Python.Python.3.12^).
    exit /b 1
  )
  "%VPY%" -m pip install --upgrade pip
  "%VPY%" -m pip install -r "%~dp0requirements.txt"
)

"%VPY%" "%~dp0sharepoint_scraper.py"
endlocal
