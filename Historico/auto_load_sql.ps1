# Script para ejecutar automáticamente todos los archivos PEGAR_X.sql
# Usando REST API de Supabase

param(
    [int]$StartFile = 1,
    [int]$EndFile = 20,
    [int]$DelaySeconds = 30  # Esperar entre ejecuciones
)

$groupDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches\execution_groups"
$supabaseUrl = "https://zbjwasufengayvmutypr.supabase.co"
$projectRef = "zbjwasufengayvmutypr"
$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpiandhc3VmZW5nYXl2bXV0eXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTQ3MTEsImV4cCI6MjA5MTY3MDcxMX0.7OLRA7dUBwpUNUIBoLN8S5zCHVKQ8YX7eMDEKiGIjYs"

Write-Host "════════════════════════════════════════════════════════════"
Write-Host "AUTO LOAD SQL: Ejecutar 20 archivos PEGAR_X.sql"
Write-Host "════════════════════════════════════════════════════════════"
Write-Host ""
Write-Host "Archivos: PEGAR_$StartFile.sql ... PEGAR_$EndFile.sql"
Write-Host "Espera entre archivos: $DelaySeconds segundos"
Write-Host ""

# Función para ejecutar SQL via API
function Invoke-SqlViaApi {
    param(
        [string]$SqlContent,
        [int]$FileNumber
    )

    try {
        $headers = @{
            "Authorization" = "Bearer $apiKey"
            "Content-Type" = "application/json"
            "Prefer" = "return=minimal"
        }

        # Intentar ejecutar via RPC endpoint
        $endpoint = "$supabaseUrl/rest/v1/rpc/exec_sql"

        $body = @{
            sql = $SqlContent
        } | ConvertTo-Json

        Write-Host "[→] Archivo $FileNumber: Enviando ($([math]::Round($SqlContent.Length/1MB, 1)) MB)..."

        $response = Invoke-WebRequest -Uri $endpoint `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -TimeoutSec 300 `
            -ErrorAction Stop

        Write-Host "[✓] Archivo $FileNumber: Completado"
        return $true

    } catch {
        Write-Host "[✗] Archivo $FileNumber: Error - $($_.Exception.Message -split "`n" | Select-Object -First 1)"
        return $false
    }
}

# Ejecutar archivos
$successCount = 0
$errorCount = 0
$startTime = Get-Date

for ($i = $StartFile; $i -le $EndFile; $i++) {
    $filePath = "$groupDir\PEGAR_$i.sql"

    if (-not (Test-Path $filePath)) {
        Write-Host "[!] Archivo no encontrado: PEGAR_$i.sql"
        $errorCount++
        continue
    }

    # Leer archivo
    $sqlContent = Get-Content $filePath -Raw

    # Ejecutar
    if (Invoke-SqlViaApi -SqlContent $sqlContent -FileNumber $i) {
        $successCount++
    } else {
        $errorCount++
    }

    # Esperar antes del siguiente (excepto el último)
    if ($i -lt $EndFile) {
        Write-Host "[⏳] Esperando $DelaySeconds segundos..."
        Start-Sleep -Seconds $DelaySeconds
    }
}

# Resumen
$duration = ((Get-Date) - $startTime).TotalSeconds

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════"
Write-Host "RESUMEN"
Write-Host "════════════════════════════════════════════════════════════"
Write-Host "Exitosos: $successCount"
Write-Host "Errores: $errorCount"
Write-Host "Tiempo total: $([math]::Round($duration, 0)) segundos"
Write-Host ""
Write-Host "[*] Verifica en Supabase:"
Write-Host "    SELECT COUNT(*) FROM flujo_historico;"
Write-Host "    Debe retornar: ~892,945"
