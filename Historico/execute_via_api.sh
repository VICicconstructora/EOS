#!/bin/bash

# Execute batches via Supabase REST API using curl

PROJECT_URL="https://zbjwasufengayvmutypr.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpiandhc3VmZW5nYXl2bXV0eXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTQ3MTEsImV4cCI6MjA5MTY3MDcxMX0.7OLRA7dUBwpUNUIBoLN8S5zCHVKQ8YX7eMDEKiGIjYs"
BATCH_DIR="/c/Users/jmacallister/OneDrive/Documentos/Documentos/Traccion/Historico/batches"

echo "=============================================================================="
echo "EXECUTE BATCHES: Via Supabase API"
echo "=============================================================================="

# Count batch files
batch_count=$(ls -1 "$BATCH_DIR"/batch_*.sql 2>/dev/null | wc -l)
echo "[*] Found $batch_count batch files"

if [ $batch_count -eq 0 ]; then
    echo "[ERROR] No batch files found"
    exit 1
fi

# Execute batches
success=0
failed=0

for batch_file in "$BATCH_DIR"/batch_*.sql; do
    batch_name=$(basename "$batch_file")
    batch_num=$(echo "$batch_name" | sed 's/batch_\([0-9]*\)\.sql/\1/')

    # Read batch SQL
    batch_sql=$(cat "$batch_file")

    # Create JSON payload
    json_payload=$(jq -n --arg query "$batch_sql" '{query: $query}')

    # Execute via API
    response=$(curl -s -X POST \
        "$PROJECT_URL/rest/v1/rpc/exec_sql" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "$json_payload")

    # Check response
    if echo "$response" | grep -q "error"; then
        echo "[ERROR] Batch $batch_num failed"
        failed=$((failed + 1))
    else
        echo "[OK] Batch $batch_num executed"
        success=$((success + 1))
    fi

    if [ $((batch_num % 10)) -eq 0 ]; then
        echo "  ... Processed $batch_num batches"
    fi
done

echo ""
echo "=============================================================================="
echo "[SUMMARY]"
echo "=============================================================================="
echo "Total batches: $batch_count"
echo "Successful: $success"
echo "Failed: $failed"
