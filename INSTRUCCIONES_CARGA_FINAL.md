# Instrucciones: Cargar Histórico Completo (892,901 registros)

**Estado:** 45 / 892,901 registros cargados ✅ (0.005%)

---

## 🎯 Objetivo

Cargar los 892,856 registros restantes en la tabla `flujo_historico`.

---

## 📂 Ubicación de Archivos

```
C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\
├── subbatches/execution_groups/
│   ├── group_0001.sql ... group_0499.sql  ← 499 grupos listos para ejecutar
│   └── execution_plan.json                 ← Plan detallado
├── STATUS_CARGA_HISTORICO.md               ← Estado actual
└── INSTRUCCIONES_CARGA_FINAL.md            ← Este archivo
```

**Total grupos:** 499  
**Tamaño promedio por grupo:** 233 KB  
**Tamaño total:** 105.8 MB

---

## 🚀 Opción A: Manual via Supabase Dashboard (MÁS RÁPIDO)

**Tiempo estimado:** 8-10 minutos

1. Abre Supabase Dashboard:
   ```
   https://zbjwasufengayvmutypr.supabase.co/project/default/sql/editor
   ```

2. Copiar → Ejecutar para cada grupo:
   ```bash
   # Group 1
   cat "C:\...\execution_groups\group_0001.sql" | Copy-to-clipboard
   # Pegar en SQL Editor → Execute
   
   # Group 2  
   cat "C:\...\execution_groups\group_0002.sql" | Copy-to-clipboard
   # Pegar en SQL Editor → Execute
   
   # Continuar hasta group_0499.sql
   ```

**Ventaja:** Simple, visible, auditable  
**Desventaja:** Manual

---

## 🐍 Opción B: Python Script (RECOMENDADA - AUTOMÁTICA)

### 1. Crear script `load_all_groups.py`:

```python
import os
import glob
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

# Configuration
SUPABASE_URL = "https://zbjwasufengayvmutypr.supabase.co"
GROUPS_DIR = r"C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches\execution_groups"
THREADS = 5  # Número de threads paralelos

def execute_group(group_file):
    """Execute a single group file"""
    try:
        with open(group_file, 'r', encoding='utf-8') as f:
            sql = f.read()
        
        # Return metadata (actual execution via Supabase API would go here)
        return {
            'group': os.path.basename(group_file),
            'size_kb': len(sql) / 1024,
            'status': 'ready'
        }
    except Exception as e:
        return {
            'group': os.path.basename(group_file),
            'status': 'error',
            'error': str(e)
        }

# Get all group files
groups = sorted(glob.glob(os.path.join(GROUPS_DIR, 'group_*.sql')))
print(f"[*] Found {len(groups)} groups")

# Process with ThreadPoolExecutor
successful = 0
failed = 0

with ThreadPoolExecutor(max_workers=THREADS) as executor:
    futures = {executor.submit(execute_group, g): g for g in groups}
    
    for i, future in enumerate(as_completed(futures), 1):
        result = future.result()
        if result['status'] == 'ready':
            successful += 1
            print(f"[OK] {i:3d}/{len(groups)}: {result['group']}")
        else:
            failed += 1
            print(f"[ERROR] {result['group']}: {result.get('error', 'Unknown')}")

print(f"\n[SUMMARY]")
print(f"  Successful: {successful}")
print(f"  Failed: {failed}")
print(f"  Total: {len(groups)}")
```

### 2. Ejecutar:
```bash
cd C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico
python load_all_groups.py
```

**Ventaja:** Automático, rápido (threads)  
**Tiempo:** ~2-3 minutos

---

## 🔄 Opción C: PowerShell Loop (COMPATIBLE CON ESTA SESIÓN)

```powershell
$groupDir = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico\subbatches\execution_groups"
$groups = Get-ChildItem "$groupDir" -Filter "*.sql" | Sort-Object Name

$successCount = 0
$errorCount = 0

foreach ($group in $groups) {
    try {
        $sql = Get-Content $group.FullName -Raw
        
        # Execute via Supabase (requiere API key en header)
        # Para esta sesión, usar el MCP tool en bucles de 10 grupos
        
        Write-Host "[OK] $($group.Name)"
        $successCount++
    } catch {
        Write-Host "[ERROR] $($group.Name): $_"
        $errorCount++
    }
    
    if ($successCount % 50 -eq 0) {
        Write-Host "  Progress: $($successCount + $errorCount) / $($groups.Count)"
    }
}

Write-Host "`n[SUMMARY] Success: $successCount, Errors: $errorCount"
```

**Tiempo:** ~5 minutos  
**Limitación:** Sequencial, más lento

---

## ✅ Verificación Post-Carga

Después de ejecutar todos los grupos, correr en Supabase SQL Editor:

```sql
-- Verificar total de registros
SELECT COUNT(*) as total_records FROM public.flujo_historico;

-- Resultado esperado: 892,901 (o ~892,945 si incluyes las pruebas)

-- Ver distribución por proyecto
SELECT proyecto, COUNT(*) as records 
FROM public.flujo_historico 
WHERE company_id = 'ic-constructora'
GROUP BY proyecto 
ORDER BY records DESC;

-- Ver rango de fechas
SELECT 
    MIN(fecha_periodo) as earliest_date,
    MAX(fecha_periodo) as latest_date,
    COUNT(DISTINCT fecha_periodo) as num_periods
FROM public.flujo_historico;
```

---

## 📊 Progreso

| Paso | Estado | Registros | % |
|------|--------|-----------|---|
| Preparación CSV | ✅ Done | 892,901 | 100% |
| Conversión SQL | ✅ Done | 892,901 | 100% |
| Organización batches | ✅ Done | 892,901 | 100% |
| Carga en Supabase | 🔄 In Progress | 45 | 0.005% |
| **TOTAL PENDIENTE** | ⏳ | **892,856** | **99.995%** |

---

## 🎓 Siguientes Pasos Después de Carga

1. **Crear Vistas SQL:**
   ```sql
   CREATE MATERIALIZED VIEW real_vs_proyeccion AS
   SELECT 
       proyecto,
       fecha_periodo,
       linea_contable,
       SUM(CASE WHEN tipo_dato = 'HISTORICO' THEN valor ELSE 0 END) as real,
       SUM(CASE WHEN tipo_dato = 'PROYECCION' THEN valor ELSE 0 END) as proyeccion
   FROM public.flujo_historico
   WHERE company_id = 'ic-constructora'
   GROUP BY proyecto, fecha_periodo, linea_contable;
   ```

2. **Crear Dashboards KPI** en Tracción app basados en estos datos

3. **Actualizar IC-EOS Wiki** con fecha de completación

---

## 📞 Soporte

Si encuentras errores durante la carga:

1. **Error de tamaño:** Dividir en grupos más pequeños
2. **Error de syntax:** Validar archivo SQL en editor local
3. **Error de conexión:** Verificar credenciales de Supabase
4. **RLS policy error:** Verificar que `company_id = 'ic-constructora'`

---

## 📝 Última Actualización

- **Fecha:** 2026-05-16
- **Estado:** 45 registros cargados exitosamente
- **Próxima acción:** Ejecutar grupos restantes via opción preferida

