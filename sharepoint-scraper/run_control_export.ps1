# Wrapper reanudable para el scrape de Control de Costos (modo mirror-only, sin Supabase).
# Lo invoca la tarea programada al iniciar sesion. Guardia: no arranca si ya hay una instancia.
$ErrorActionPreference = "Continue"
$py     = "C:\Users\jmacallister\AppData\Local\ic-sharepoint-scraper\venv\Scripts\python.exe"
$sdir   = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\sharepoint-scraper"
$script = "$sdir\local_ingest.py"
$log    = "$sdir\local-ingest-control.log"

# Guardia anti-duplicado: si ya corre un local_ingest sobre control-costos, salir.
$dup = Get-CimInstance Win32_Process -Filter "Name='python.exe'" -EA SilentlyContinue |
       Where-Object { $_.CommandLine -match 'local_ingest\.py' -and $_.CommandLine -match 'control-costos' -and $_.ProcessId -ne $PID }
if ($dup) { "$(Get-Date -Format o) YA CORRIENDO (PID $($dup.ProcessId)), no relanzo." | Out-File $log -Append -Encoding utf8; exit 0 }

"===== ARRANQUE control $(Get-Date -Format o) =====" | Out-File $log -Append -Encoding utf8
& $py -u $script --src "C:\Users\jmacallister\IC CONSTRUCTORA SAS\AA CONTROL - GENERAL CONTROL DE COSTOS" --prefix local/control-costos --mirror C:\scraping2\control-costos --workers 5 --mirror-only *>> $log
"===== FIN control $(Get-Date -Format o) (exit $LASTEXITCODE) =====" | Out-File $log -Append -Encoding utf8
