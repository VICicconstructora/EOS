# PowerShell script to combine and execute chunks in batches

param(
    [int]$ChunksPerBatch = 50,
    [int]$StartChunk = 1,
    [int]$EndChunk = 8930
)

$HistoricoDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico"
$OutputDir = Join-Path $HistoricoDir "batches"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "BATCH EXECUTOR: Combining chunks for Supabase execution" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

Write-Host "`n[*] Creating batch directory..."
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

Write-Host "[*] Combining chunks ($ChunksPerBatch per batch)..."

$currentBatch = ""
$currentCount = 0
$batchNum = 1
$totalBatches = [math]::Ceiling(($EndChunk - $StartChunk + 1) / $ChunksPerBatch)

for ($chunkNum = $StartChunk; $chunkNum -le $EndChunk; $chunkNum++) {
    $chunkFile = Join-Path $HistoricoDir "chunk_$($chunkNum.ToString('D3')).sql"

    if (Test-Path $chunkFile) {
        $content = Get-Content $chunkFile -Raw
        $currentBatch += $content + "`n"
        $currentCount++

        if ($currentCount -ge $ChunksPerBatch -or $chunkNum -eq $EndChunk) {
            # Save batch
            $batchFile = Join-Path $OutputDir "batch_$($batchNum.ToString('D4')).sql"
            $currentBatch | Out-File -FilePath $batchFile -Encoding UTF8 -NoNewline

            $fileSize = (Get-Item $batchFile).Length / 1KB
            Write-Host "  [Batch $($batchNum.ToString('D4'))] $currentCount chunks → $([math]::Round($fileSize, 1)) KB" -ForegroundColor Gray

            $currentBatch = ""
            $currentCount = 0
            $batchNum++
        }
    }
}

Write-Host "`n[OK] Created $($batchNum - 1) batch files in: $OutputDir"
Write-Host "`nNext step: Execute each batch_*.sql file in Supabase Dashboard SQL Editor"
