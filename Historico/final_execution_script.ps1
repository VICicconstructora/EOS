# Final execution script - combines sub-batches and prepares for execution

param(
    [int]$SubBatchesPerExecution = 10,
    [string]$SubBatchDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches",
    [string]$FinalBatchDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\final_batches"
)

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "FINAL EXECUTION: Prepare execution batches (10 sub-batches per execution)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# Create final batch directory
if (-not (Test-Path $FinalBatchDir)) {
    New-Item -ItemType Directory -Path $FinalBatchDir | Out-Null
}

# Get sub-batch files
$subbatches = Get-ChildItem "$SubBatchDir" -Filter "*.sql" | Sort-Object Name
$total = $subbatches.Count

Write-Host "`n[*] Sub-batches found: $total"

# Combine into execution batches
$currentExecBatch = ""
$currentExecCount = 0
$execBatchNum = 1

foreach ($subbatch in $subbatches) {
    $content = Get-Content $subbatch.FullName -Raw
    $currentExecBatch += $content + "`n"
    $currentExecCount++

    if ($currentExecCount -ge $SubBatchesPerExecution) {
        # Save execution batch
        $execBatchFile = Join-Path $FinalBatchDir "exec_$($execBatchNum.ToString('D4')).sql"
        $currentExecBatch | Out-File -FilePath $execBatchFile -Encoding UTF8 -NoNewline

        $fileSize = (Get-Item $execBatchFile).Length / 1KB
        if ($execBatchNum % 10 -eq 0 -or $execBatchNum -eq 1) {
            Write-Host "  Exec batch $execBatchNum : $fileSize KB"
        }

        $currentExecBatch = ""
        $currentExecCount = 0
        $execBatchNum++
    }
}

# Save remaining
if ($currentExecBatch.Length -gt 0) {
    $execBatchFile = Join-Path $FinalBatchDir "exec_$($execBatchNum.ToString('D4')).sql"
    $currentExecBatch | Out-File -FilePath $execBatchFile -Encoding UTF8 -NoNewline
}

$execBatches = @(Get-ChildItem "$FinalBatchDir" -Filter "*.sql")
Write-Host "`n[OK] Created $($execBatches.Count) execution batches"

# Calculate total size
$totalSize = ($execBatches | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "[*] Total size: $([math]::Round($totalSize, 1)) MB"

# Show info
Write-Host "`nExecution batches ready:"
$execBatches | Select-Object -First 3 | ForEach-Object {
    Write-Host "  $($_.Name) - $([math]::Round($_.Length / 1KB, 1)) KB"
}
if ($execBatches.Count -gt 3) {
    Write-Host "  ... and $($execBatches.Count - 3) more"
}

Write-Host "`n[INFO] Estimated execution time: ~$([math]::Ceiling($execBatches.Count / 60)) minutes at 60 batches/min"
Write-Host "`nNext: Copy each file to Supabase Dashboard SQL Editor and execute"
