# PowerShell loop to execute all sub-batches via Supabase

param(
    [int]$SubBatchesPerExecution = 10,
    [string]$SubBatchDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches",
    [int]$StartBatch = 1,
    [int]$EndBatch = 2493
)

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "LOAD ALL DATA: Ejecutar sub-batches en Supabase" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# Get all sub-batch files
$allSubBatches = Get-ChildItem "$SubBatchDir" -Filter "*.sql" | Sort-Object Name
$totalSubBatches = $allSubBatches.Count

Write-Host "`n[*] Sub-batches encontrados: $totalSubBatches"
Write-Host "[*] Procesando de $StartBatch a $EndBatch"
Write-Host "[*] Sub-batches por ejecución: $SubBatchesPerExecution"

# Calculate execution batches needed
$executionBatchesNeeded = [math]::Ceiling(($EndBatch - $StartBatch + 1) / $SubBatchesPerExecution)
Write-Host "[*] Total ejecuciones necesarias: $executionBatchesNeeded"

# Create SQL execution file that contains commands for Claude Code execution
$executionScript = @"
# Script de ejecución - Copiar y pegar cada bloque en Supabase Dashboard > SQL Editor

Write-Host "Iniciando carga de datos..."
`$successCount = 0
`$batchNum = 0

"@

# Create execution commands
$sqlCommands = @()
$currentSql = ""
$currentBatchSize = 0

for ($i = $StartBatch - 1; $i -lt [Math]::Min($EndBatch, $totalSubBatches); $i++) {
    $subBatchFile = $allSubBatches[$i].FullName
    $subBatchContent = Get-Content $subBatchFile -Raw

    $currentSql += $subBatchContent + "`n"
    $currentBatchSize++

    if ($currentBatchSize -ge $SubBatchesPerExecution -or $i -eq [Math]::Min($EndBatch, $totalSubBatches) - 1) {
        # Save as SQL command for execution
        $sqlCommands += $currentSql

        Write-Host "  Batch $($sqlCommands.Count): $($currentSql.Length / 1KB) KB"

        $currentSql = ""
        $currentBatchSize = 0
    }
}

Write-Host "`n[OK] Preparados $($sqlCommands.Count) bloques SQL para ejecución"

# Save SQL commands to files that can be executed
$outputDir = "$SubBatchDir\execution_commands"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

for ($i = 0; $i -lt $sqlCommands.Count; $i++) {
    $cmdFile = Join-Path $outputDir "cmd_$($($i+1).ToString('D4')).sql"
    $sqlCommands[$i] | Out-File -FilePath $cmdFile -Encoding UTF8 -NoNewline
    Write-Host "  Comando $($i+1): $(([math]::Round(($sqlCommands[$i].Length / 1KB), 1))) KB"
}

Write-Host "`n[*] Archivos SQL guardados en: $outputDir"
Write-Host "[INFO] Ahora necesitas ejecutar cada archivo en Supabase Dashboard"
Write-Host "[INFO] O crear un script que ejecute los comandos via API"

# Summary
Write-Host "`n[RESUMEN]"
Write-Host "  Total sub-batches: $totalSubBatches"
Write-Host "  Bloques a ejecutar: $($sqlCommands.Count)"
Write-Host "  Tamaño promedio por bloque: $([math]::Round(($sqlCommands | ForEach-Object { $_.Length } | Measure-Object -Average).Average / 1KB, 1)) KB"
Write-Host "  Total datos: $(($sqlCommands | ForEach-Object { $_.Length } | Measure-Object -Sum).Sum / 1MB) MB"
