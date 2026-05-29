# Instalar/actualizar la tarea programada VIC-SyncWiki
# Ejecutar con: clic derecho -> "Ejecutar con PowerShell" (como Administrador)
#
# Corre la sincronizacion diaria del wiki -> Supabase (texto + embeddings).
# NO requiere redeploy del bot: el bot en Azure lee Supabase en vivo, asi que
# ve los datos nuevos apenas termina esta sincronizacion.

$botDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\vic-bot"
$nodeExe = (Get-Command node).Source

$action = New-ScheduledTaskAction `
  -Execute $nodeExe `
  -Argument "indexer\dailySync.js" `
  -WorkingDirectory $botDir

# Corre a las 5am todos los dias.
$trigger = New-ScheduledTaskTrigger -Daily -At "05:00AM"

# StartWhenAvailable: si el equipo estaba apagado a las 5am, corre en cuanto
# vuelva a estar disponible (no al iniciar sesion, para no molestar).
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -RunOnlyIfNetworkAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
  -MultipleInstances IgnoreNew

# Correr con la sesion del usuario (necesita acceso al OneDrive local).
$principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Limited

$task = Register-ScheduledTask `
  -TaskName "VIC-SyncWiki" `
  -TaskPath "\IC Constructora\" `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description "Sincroniza el wiki de IC Constructora con Supabase (texto + embeddings) para el bot VIC. Corre a las 5am diario; si el equipo estaba apagado, corre al volver a estar disponible." `
  -Force

# Limpieza: borrar la tarea vieja (VIC-IndexarWiki) si existe.
$old = Get-ScheduledTask -TaskPath "\IC Constructora\" -TaskName "VIC-IndexarWiki" -ErrorAction SilentlyContinue
if ($old) {
  Unregister-ScheduledTask -TaskPath "\IC Constructora\" -TaskName "VIC-IndexarWiki" -Confirm:$false
  Write-Host "Tarea vieja 'VIC-IndexarWiki' eliminada." -ForegroundColor Yellow
}

if ($task) {
  Write-Host ""
  Write-Host "Tarea instalada correctamente:" -ForegroundColor Green
  Write-Host "  Nombre:  VIC-SyncWiki"
  Write-Host "  Horario: 5:00am diario (texto + embeddings)"
  Write-Host "  Log:     vic-bot\indexer\logs\sync-YYYY-MM-DD.log"
  Write-Host ""
  Write-Host "Para correrla manualmente ahora:"
  Write-Host "  Start-ScheduledTask -TaskPath '\IC Constructora\' -TaskName 'VIC-SyncWiki'"
} else {
  Write-Host "Error al instalar la tarea." -ForegroundColor Red
}
