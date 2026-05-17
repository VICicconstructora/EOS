# Simple loader - processes all 499 groups

$groupDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches\execution_groups"

Write-Host "Iniciando carga..."

$groups = Get-ChildItem "$groupDir" -Filter "group_*.sql" | Sort-Object Name
$totalGroups = $groups.Count

Write-Host "Grupos encontrados: $totalGroups"

# Check first 10 groups
Write-Host "`nPrimeros 10 grupos:"
$groups | Select-Object -First 10 | ForEach-Object {
    $size = (Get-Item $_.FullName).Length / 1KB
    Write-Host "  $($_.Name): $([math]::Round($size, 1)) KB"
}

# Statistics
$totalSize = ($groups | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "`nTotal size: $([math]::Round($totalSize, 1)) MB"
Write-Host "Listo para ejecutar"
