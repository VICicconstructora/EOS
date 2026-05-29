# Instalar tarea programada VIC-IndexarWiki
# Ejecutar con: clic derecho → "Ejecutar con PowerShell" (como Administrador)

$botDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\vic-bot"
$nodeExe = (Get-Command node).Source

$action = New-ScheduledTaskAction `
  -Execute $nodeExe `
  -Argument "indexer\indexWiki.js" `
  -WorkingDirectory $botDir

# Corre a las 5am todos los días
$trigger1 = New-ScheduledTaskTrigger -Daily -At "05:00AM"

# Si el equipo estaba apagado a las 5am, corre al iniciar sesión
$trigger2 = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -RunOnlyIfNetworkAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
  -MultipleInstances IgnoreNew

$task = Register-ScheduledTask `
  -TaskName "VIC-IndexarWiki" `
  -TaskPath "\IC Constructora\" `
  -Action $action `
  -Trigger $trigger1, $trigger2 `
  -Settings $settings `
  -RunLevel Highest `
  -Description "Indexa el wiki de IC Constructora en Supabase para el bot VIC. Corre a las 5am diario y al iniciar sesion si se perdio." `
  -Force

if ($task) {
  Write-Host ""
  Write-Host "Tarea instalada correctamente:" -ForegroundColor Green
  Write-Host "  Nombre: VIC-IndexarWiki"
  Write-Host "  Horario: 5:00am diario"
  Write-Host "  Fallback: al iniciar sesion si se perdio"
  Write-Host ""
  Write-Host "Para correrla manualmente:"
  Write-Host "  Start-ScheduledTask -TaskPath '\IC Constructora\' -TaskName 'VIC-IndexarWiki'"
} else {
  Write-Host "Error al instalar la tarea." -ForegroundColor Red
}
