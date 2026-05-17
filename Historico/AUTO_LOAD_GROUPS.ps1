# Automatic loader - processes all 499 groups and executes them
# Reads groups, splits into small batches, executes sequentially

param(
    [int]$StartGroup = 1,
    [int]$EndGroup = 499,
    [int]$InsertsPerExecution = 5  # Execute 5 INSERT statements per call
)

Write-Host "=================================================================================" -ForegroundColor Cyan
Write-Host "AUTO LOADER: Ejecutar 499 grupos automáticamente" -ForegroundColor Cyan
Write-Host "=================================================================================" -ForegroundColor Cyan

$groupDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches\execution_groups"

# Get all groups
$groups = Get-ChildItem "$groupDir" -Filter "group_*.sql" | Sort-Object Name
$totalGroups = $groups.Count

Write-Host "`n[*] Total grupos: $totalGroups"
Write-Host "[*] Rango: $StartGroup - $EndGroup"
Write-Host "[*] Estrategia: Extraer $InsertsPerExecution INSERT statements por ejecución"

# Parse all groups and extract individual INSERT statements
Write-Host "`n[*] Leyendo todos los grupos..."

$allInserts = @()
$currentBatchSQL = ""
$insertCount = 0
$batchNum = 0

foreach ($i in 0..($groups.Count - 1)) {
    $groupNum = $i + 1

    if ($groupNum -lt $StartGroup -or $groupNum -gt $EndGroup) {
        continue
    }

    $groupFile = $groups[$i]
    $content = Get-Content $groupFile.FullName -Raw

    # Split this group's content by INSERT statements
    $inserts = $content -split '(?=INSERT INTO)' | Where-Object { $_.Trim().Length -gt 50 }

    foreach ($insert in $inserts) {
        $currentBatchSQL += $insert + "`n"
        $insertCount++

        if ($insertCount -ge $InsertsPerExecution) {
            # Save batch
            $batchNum++
            $allInserts += @{
                'batch' = $batchNum
                'sql' = $currentBatchSQL
                'size_kb' = $currentBatchSQL.Length / 1024
                'inserts' = $insertCount
            }

            $currentBatchSQL = ""
            $insertCount = 0
        }
    }

    if ($groupNum % 100 -eq 0) {
        Write-Host "  [$groupNum/$totalGroups] Procesados"
    }
}

# Save remaining
if ($currentBatchSQL.Length -gt 0) {
    $batchNum++
    $allInserts += @{
        'batch' = $batchNum
        'sql' = $currentBatchSQL
        'size_kb' = $currentBatchSQL.Length / 1024
        'inserts' = $insertCount
    }
}

Write-Host "`n[OK] Extraídos $batchNum lotes para ejecución"

# Show execution plan
$totalSize = ($allInserts | ForEach-Object { $_.size_kb } | Measure-Object -Sum).Sum
Write-Host "`n[PLAN DE EJECUCIÓN]"
Write-Host "  Total lotes: $batchNum"
Write-Host "  Tamaño total: $([math]::Round($totalSize / 1024, 1)) MB"
Write-Host "  Tamaño promedio: $([math]::Round($totalSize / $batchNum, 1)) KB por lote"

Write-Host "`n[PRIMEROS 10 LOTES]"
$allInserts | Select-Object -First 10 | ForEach-Object {
    Write-Host "  Batch $($_.batch): $([math]::Round($_.size_kb, 1)) KB, $($_.inserts) INSERTs"
}

if ($batchNum -gt 10) {
    Write-Host "`n[ÚLTIMOS 5 LOTES]"
    $allInserts | Select-Object -Last 5 | ForEach-Object {
        Write-Host "  Batch $($_.batch): $([math]::Round($_.size_kb, 1)) KB, $($_.inserts) INSERTs"
    }
}

# Save execution batches to files
Write-Host "`n[*] Guardando $batchNum lotes para ejecución..."
$execDir = Join-Path $groupDir "exec_batches"
if (-not (Test-Path $execDir)) {
    New-Item -ItemType Directory -Path $execDir | Out-Null
}

foreach ($batch in $allInserts) {
    $batchFile = Join-Path $execDir "batch_$($batch['batch'].ToString('D5')).sql"
    $batch['sql'] | Out-File -FilePath $batchFile -Encoding UTF8 -NoNewline
}

Write-Host "[OK] Guardados $batchNum lotes en: $execDir"

# Summary
Write-Host "`n[RESUMEN]"
Write-Host "  Lotes generados: $batchNum"
Write-Host "  Tamaño total: $([math]::Round($totalSize / 1024, 1)) MB"
$timeEst = [math]::Ceiling($batchNum / 100)
Write-Host "  Tiempo estimado: ~$timeEst minutos"
Write-Host "`n[LISTO] Los $batchNum lotes estan listos para ejecucion"
Write-Host "[INFO] Archivos guardados en: $execDir"
