# setup-scheduler.ps1
# Registra una tarea en el Programador de tareas de Windows
# para ejecutar sync-datamart.js cada 8 días a las 8:00 AM.
#
# Ejecutar una sola vez como Administrador:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\setup-scheduler.ps1

$NodePath   = (Get-Command node -ErrorAction Stop).Source
$ScriptDir  = $PSScriptRoot
$ScriptFile = Join-Path $ScriptDir "sync-datamart.js"

if (-not (Test-Path $ScriptFile)) {
    Write-Error "No se encontró: $ScriptFile"
    exit 1
}

# Configura variables de entorno si el archivo no está en Downloads
# Cambia DATAMART_PATH si mueves el archivo a otra ubicación
$env_vars = [System.Collections.Generic.List[object]]::new()
$env_vars.Add((New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive))

$action = New-ScheduledTaskAction `
    -Execute $NodePath `
    -Argument "`"$ScriptFile`"" `
    -WorkingDirectory $ScriptDir

# Trigger: cada 8 días a las 8:00 AM, empezando mañana
$startAt = (Get-Date -Hour 8 -Minute 0 -Second 0).AddDays(1)
$trigger  = New-ScheduledTaskTrigger -Once -At $startAt

# Repetir cada 8 días indefinidamente
$trigger.Repetition.Interval = "P8D"
$trigger.Repetition.Duration = [string]::Empty  # indefinido

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

$task = New-ScheduledTask `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "IC Constructora: sincroniza Datamart.xlsx con docs/memoria/proyectos/ cada 8 días"

Register-ScheduledTask `
    -TaskName "IC-SyncDatamart" `
    -InputObject $task `
    -Force

Write-Host ""
Write-Host "Tarea registrada: IC-SyncDatamart"
Write-Host "Próxima ejecución: $startAt"
Write-Host "Intervalo: cada 8 días"
Write-Host ""
Write-Host "Para ejecutar ahora manualmente:"
Write-Host "  node `"$ScriptFile`""
Write-Host ""
Write-Host "Para ver el estado de la tarea:"
Write-Host "  Get-ScheduledTask -TaskName IC-SyncDatamart | Get-ScheduledTaskInfo"
