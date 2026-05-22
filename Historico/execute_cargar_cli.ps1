#!/usr/bin/env pwsh
# Ejecuta los 40 archivos CARGAR_*.sql via Supabase CLI

$EXEC_DIR = "$env:USERPROFILE\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches\execution_groups"
$SUPABASE_EXE = "$env:USERPROFILE\scoop\apps\supabase\current\supabase.exe"

Write-Host "============================================================"
Write-Host "EJECUTAR 40 archivos CARGAR_*.sql via Supabase CLI"
Write-Host "============================================================"
Write-Host ""

# Listar archivos
$files = Get-ChildItem -Path $EXEC_DIR -Filter "CARGAR_*.sql" | Sort-Object Name
Write-Host "[OK] Encontrados: $($files.Count) archivos"
Write-Host ""

if ($files.Count -eq 0) {
    Write-Host "[ERROR] No hay archivos CARGAR_*.sql"
    exit 1
}

$stats = @{
    success = 0
    error = 0
}
$start_time = Get-Date

# Procesar cada archivo
foreach ($idx in 0..($files.Count - 1)) {
    $file = $files[$idx]
    $num = $idx + 1
    $percent = [Math]::Round(($num / $files.Count) * 100)

    Write-Host "[$num/$($files.Count)] ($percent%) $($file.Name)... " -NoNewline

    try {
        # Ejecutar via CLI
        & $SUPABASE_EXE db execute --file $file.FullName

        Write-Host "OK"
        $stats.success += 1
    }
    catch {
        Write-Host "ERROR: $($_.Exception.Message)"
        $stats.error += 1
    }
}

# Resumen
$duration = (Get-Date) - $start_time
Write-Host ""
Write-Host "============================================================"
Write-Host "RESUMEN"
Write-Host "============================================================"
Write-Host "OK: $($stats.success) | ERROR: $($stats.error)"
Write-Host "Tiempo: $([Math]::Floor($duration.TotalMinutes)) min $($duration.Seconds) seg"
Write-Host ""
Write-Host "[*] Verifica con:"
Write-Host "    SELECT COUNT(*) FROM flujo_historico;"
Write-Host "    Debe retornar: ~892,945"
Write-Host ""
