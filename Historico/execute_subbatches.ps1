# PowerShell script to execute sub-batches via Supabase MCP tool
# This script is called from Claude Code after sub-batches are created

param(
    [string]$SubBatchDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches",
    [int]$StartFile = 1,
    [int]$EndFile = 9999
)

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "EXECUTE SUB-BATCHES: Loading into Supabase" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

if (-not (Test-Path $SubBatchDir)) {
    Write-Host "[ERROR] Sub-batch directory not found: $SubBatchDir" -ForegroundColor Red
    exit 1
}

$subbatch_files = Get-ChildItem "$SubBatchDir" -Filter "*.sql" | Sort-Object Name

Write-Host "`n[*] Found $($subbatch_files.Count) sub-batch files"

if ($subbatch_files.Count -eq 0) {
    Write-Host "[ERROR] No sub-batch files found"
    exit 1
}

# Create a manifest of files to execute
Write-Host "`n[*] First sub-batch files:"
$subbatch_files | Select-Object -First 5 | ForEach-Object {
    Write-Host "  $($_.Name) - $([math]::Round($_.Length / 1KB, 1)) KB"
}

if ($subbatch_files.Count -gt 5) {
    Write-Host "  ... and $($subbatch_files.Count - 5) more"
}

Write-Host "`n[*] Sub-batches ready for execution via Claude Code"
Write-Host "`nTo execute:"
Write-Host "  1. Each sub-batch will be read and executed via Supabase MCP tool"
Write-Host "  2. Expected execution time: ~$([math]::Ceiling($subbatch_files.Count / 10)) minutes"
Write-Host "  3. Monitor progress in Claude Code output"
