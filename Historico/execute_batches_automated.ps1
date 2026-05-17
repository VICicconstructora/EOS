# Execute all batches automatically
# This script reads batch files and outputs them for execution via Supabase tool

param(
    [string]$BatchDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches\execution_groups\exec_batches",
    [int]$MaxBatches = 9999
)

Write-Host "=================================================================================" -ForegroundColor Cyan
Write-Host "EXECUTE BATCHES: Ejecutar lotes en Supabase" -ForegroundColor Cyan
Write-Host "=================================================================================" -ForegroundColor Cyan

# Check if batch directory exists
if (-not (Test-Path $BatchDir)) {
    Write-Host "[ERROR] Batch directory not found: $BatchDir" -ForegroundColor Red
    Write-Host "[INFO] Run AUTO_LOAD_GROUPS.ps1 first to generate batches"
    exit 1
}

# Get all batch files
$batches = Get-ChildItem "$BatchDir" -Filter "batch_*.sql" | Sort-Object Name
$totalBatches = [Math]::Min($batches.Count, $MaxBatches)

Write-Host "`n[*] Batches found: $totalBatches"

if ($totalBatches -eq 0) {
    Write-Host "[ERROR] No batch files found"
    exit 1
}

# Prepare execution
Write-Host "[*] Leyendo batches para ejecución..."

$executionLog = @()
$successCount = 0
$errorCount = 0

for ($i = 0; $i -lt $totalBatches; $i++) {
    $batchFile = $batches[$i]
    $batchNum = [int]($batchFile.BaseName -replace 'batch_', '')
    $sql = Get-Content $batchFile.FullName -Raw

    $executionLog += @{
        'batch' = $batchNum
        'file' = $batchFile.Name
        'size_kb' = $sql.Length / 1024
        'status' = 'ready'
        'sql_length' = $sql.Length
    }

    if (($i + 1) % 100 -eq 0 -or $i -eq 0) {
        Write-Host "  [$($i+1)/$totalBatches] Batch $batchNum preparado"
    }
}

Write-Host "`n[OK] $totalBatches batches preparados para ejecución"

# Display execution info
$totalSize = ($executionLog | ForEach-Object { $_['size_kb'] } | Measure-Object -Sum).Sum
Write-Host "`n[ESTADÍSTICAS]"
Write-Host "  Total batches: $totalBatches"
Write-Host "  Tamaño total: $([math]::Round($totalSize / 1024, 1)) MB"
Write-Host "  Tamaño promedio: $([math]::Round($totalSize / $totalBatches, 1)) KB"
Write-Host "  Tiempo estimado: ~$([math]::Ceiling($totalBatches / 60)) minutos (60 batches/min)"

# Show sample batches
Write-Host "`n[MUESTRA DE BATCHES]"
$executionLog | Select-Object -First 5 | ForEach-Object {
    Write-Host "  Batch $($_.batch): $([math]::Round($_.size_kb, 1)) KB"
}

Write-Host "`n[PRÓXIMO PASO]"
Write-Host "1. Estos $totalBatches batches están listos para ejecución"
Write-Host "2. Opción A: Ejecutar vía Supabase Dashboard (manual)"
Write-Host "3. Opción B: Ejecutar vía loop PowerShell/Claude Code"
Write-Host "4. Opción C: Usar API de Supabase con credenciales"

Write-Host "`n[STATUS] ✅ LISTO PARA EJECUTAR"
