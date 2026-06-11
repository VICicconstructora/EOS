@echo off
REM ---------------------------------------------------------------------------
REM Cron LOCAL del scraper en ORDEN INVERSO.
REM
REM Barre los sitios de SharePoint de atras hacia adelante, mientras el job de
REM Azure (ic-scraper-job) los barre de adelante hacia atras. Comparten el
REM estado por-drive en Supabase (scraping_state), asi que se cruzan en el medio
REM sin repisarse. "A ver cuando se cruzan."
REM
REM Reusa el mismo venv local y el .env (para los secretos), pero sobrescribe el
REM comportamiento con variables de entorno (load_dotenv NO pisa lo ya definido):
REM   - SCRAPE_REVERSE=1     -> orden inverso
REM   - SHAREPOINT_SITES=" " -> existe-pero-vacio => TODOS los sitios (ignora el
REM                             GND del .env; el espacio evita que .env lo pise)
REM   - MAX_FILES_PER_RUN    -> 2000
REM   - SLEEP_BETWEEN_FILES  -> 0.3 (a 2000 archivos, 1.5s seria una eternidad)
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"

set "VENV=%LOCALAPPDATA%\ic-sharepoint-scraper\venv"
set "VPY=%VENV%\Scripts\python.exe"

if not exist "%VPY%" (
  echo [setup] Creando entorno local en "%VENV%" ...
  py -3.12 -m venv "%VENV%" 2>nul || py -3 -m venv "%VENV%" 2>nul || python -m venv "%VENV%"
  "%VPY%" -m pip install --upgrade pip
  "%VPY%" -m pip install -r "%~dp0requirements.txt"
)

set "SCRAPE_REVERSE=1"
set "SHAREPOINT_SITES= "
set "MAX_FILES_PER_RUN=2000"
set "SLEEP_BETWEEN_FILES=0.3"

"%VPY%" -u "%~dp0sharepoint_scraper.py" >> "%~dp0scraper-reverse.log" 2>&1
endlocal
