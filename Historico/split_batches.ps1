# PowerShell script to further split batches into smaller sub-batches

param(
    [int]$MaxSizeKB = 50,
    [string]$InputDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\batches",
    [string]$OutputDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches"
)

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "SPLIT BATCHES: Breaking large batches into $($MaxSizeKB)KB sub-batches" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

Write-Host "`n[*] Processing batch files..."

$batch_files = Get-ChildItem "$InputDir" -Filter "batch_*.sql" | Sort-Object Name
$total_batches = $batch_files.Count
$total_subbatches = 0

foreach ($batch_file in $batch_files) {
    $batch_content = Get-Content $batch_file.FullName -Raw

    # Split by INSERT statements
    $statements = $batch_content -split '(?=INSERT INTO)' | Where-Object { $_.Trim().Length -gt 20 }

    $current_subbatch = ""
    $subbatch_count = 0

    foreach ($stmt in $statements) {
        $test_size = ($current_subbatch + $stmt).Length / 1KB

        if ($test_size -gt $MaxSizeKB -and $current_subbatch.Length -gt 0) {
            # Save current subbatch
            $subbatch_count++
            $subbatch_file = Join-Path $OutputDir "$($batch_file.BaseName)_$($subbatch_count.ToString('D2')).sql"
            $current_subbatch | Out-File -FilePath $subbatch_file -Encoding UTF8 -NoNewline

            $total_subbatches++
            $current_subbatch = $stmt
        } else {
            $current_subbatch += $stmt
        }
    }

    # Save remaining
    if ($current_subbatch.Length -gt 0) {
        $subbatch_count++
        $subbatch_file = Join-Path $OutputDir "$($batch_file.BaseName)_$($subbatch_count.ToString('D2')).sql"
        $current_subbatch | Out-File -FilePath $subbatch_file -Encoding UTF8 -NoNewline

        $total_subbatches++
    }

    $batch_num = [int]($batch_file.BaseName -replace 'batch_', '')
    if ($batch_num % 10 -eq 0) {
        Write-Host "  Batch $batch_num/$total_batches → $subbatch_count sub-batches"
    }
}

Write-Host "`n[OK] Created $total_subbatches sub-batch files"
Write-Host "[*] Location: $OutputDir"

# Show stats
$subbatch_files = Get-ChildItem "$OutputDir" -Filter "*.sql"
$avg_size = ($subbatch_files | Measure-Object -Property Length -Average).Average / 1KB

Write-Host "`nStatistics:"
Write-Host "  Total sub-batches: $($subbatch_files.Count)"
Write-Host "  Average size: $([math]::Round($avg_size, 1)) KB"
Write-Host "  Total size: $([math]::Round(($subbatch_files | Measure-Object -Property Length -Sum).Sum / 1MB, 1)) MB"
