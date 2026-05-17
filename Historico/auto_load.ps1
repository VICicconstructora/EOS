# Automatic loader - combines and saves execution units for batch processing

param(
    [int]$UnitsPerGroup = 5,  # Combine 5 units (each ~430KB) = ~2.1MB per group
    [string]$SubBatchDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches"
)

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "AUTO LOADER: Crear grupos de ejecución" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# Get all sub-batches
$allSubBatches = Get-ChildItem "$SubBatchDir" -Filter "*.sql" | Sort-Object Name
$totalSubBatches = $allSubBatches.Count

Write-Host "`n[*] Sub-batches: $totalSubBatches"

# Create execution groups
$groupDir = Join-Path $SubBatchDir "execution_groups"
if (-not (Test-Path $groupDir)) {
    New-Item -ItemType Directory -Path $groupDir | Out-Null
}

Write-Host "[*] Creando grupos de ejecución ($UnitsPerGroup units por grupo)..."

$currentGroup = ""
$currentCount = 0
$groupNum = 1
$totalGroups = [math]::Ceiling($totalSubBatches / $UnitsPerGroup)

foreach ($i in 0..($totalSubBatches - 1)) {
    $content = Get-Content $allSubBatches[$i].FullName -Raw
    $currentGroup += $content + "`n"
    $currentCount++

    if ($currentCount -ge $UnitsPerGroup -or $i -eq ($totalSubBatches - 1)) {
        # Save group
        $groupFile = Join-Path $groupDir "group_$($groupNum.ToString('D4')).sql"
        $currentGroup | Out-File -FilePath $groupFile -Encoding UTF8 -NoNewline

        $groupSize = (Get-Item $groupFile).Length / 1KB
        if ($groupNum % 10 -eq 0 -or $groupNum -eq 1) {
            Write-Host "  Group $groupNum/$totalGroups : $([math]::Round($groupSize, 1)) KB"
        }

        $currentGroup = ""
        $currentCount = 0
        $groupNum++
    }
}

Write-Host "`n[OK] Created $totalGroups execution groups"

# Show info
$groups = @(Get-ChildItem "$groupDir" -Filter "*.sql")
$avgSize = ($groups | Measure-Object -Property Length -Average).Average / 1KB

Write-Host "`n[ESTADÍSTICAS]"
Write-Host "  Total grupos: $($groups.Count)"
Write-Host "  Tamaño promedio: $([math]::Round($avgSize, 1)) KB"
Write-Host "  Total tamaño: $([math]::Round(($groups | Measure-Object -Property Length -Sum).Sum / 1MB, 1)) MB"

Write-Host "`n[*] Archivos listos en: $groupDir"
Write-Host "[INFO] Cada grupo contiene $UnitsPerGroup sub-batches (~$([math]::Round(5 * 48, 0)) KB)"
Write-Host "`n[PROXIMOS PASOS]"
Write-Host "1. Ejecutar grupos secuencialmente via Supabase SQL Editor"
Write-Host "2. O usar un script Python o curl para automatizar"
$estimatedTime = [math]::Ceiling($groups.Count / 20)
Write-Host ("3. Tiempo estimado: " + $estimatedTime + " minutos")
