# Estado: Carga de Histórico en Supabase

**Fecha:** 2026-05-16  
**Objetivo:** Cargar 892,901 registros de `Histórico.xlsx` a tabla `flujo_historico` en Supabase

---

## ✅ Completado

### 1. Conversión CSV → SQL
- ✅ Extraídos 892,901 registros de `historico_limpio.csv`
- ✅ Generados 8,930 archivos SQL chunk (100 registros c/u)

### 2. Organización en Batches
- ✅ 8,930 chunks → 179 batches (50 chunks c/u)
- ✅ 179 batches → 2,493 sub-batches (50KB c/u)
- ✅ 2,493 sub-batches → 250 execution batches (433KB c/u)
- ✅ 250 execution batches → **499 execution groups** (5 batches c/u)

### 3. Tabla Supabase
- ✅ Tabla `flujo_historico` creada con schema correcto
- ✅ RLS policies configuradas
- ✅ Índices creados: (company_id, proyecto), (fecha_periodo), (linea_contable)
- ✅ Actualmente: **35 registros** (pruebas + inserts de muestra)

### 4. Validación
- ✅ SQL sintácticamente correcto
- ✅ Datos limpios (sin NaN, valores validados)
- ✅ Encodings UTF-8 correctos

---

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| **Total Registros** | 892,901 |
| **Tamaño SQL Total** | ~105.8 MB |
| **Archivos chunk** | 8,930 |
| **Execution batches** | 250 |
| **Execution groups** | 499 |
| **Tamaño promedio por group** | ~214 KB |
| **Proyectos** | Múltiples (Azul Celeste E1, WELL, etc.) |
| **Rango fechas** | 2019-09-01 a 2025-07-01 |
| **Tipos línea** | Ingresos, Costos, Ventas, etc. |

---

## 🚀 Opciones de Ejecución

### Opción A: Manual via Supabase Dashboard (Rápida, No automatizada)
1. Ir a: `https://zbjwasufengayvmutypr.supabase.co/project/default/sql/editor`
2. Copiar contenido de cada archivo `execution_groups/group_XXXX.sql`
3. Ejecutar en el SQL Editor
4. **Tiempo:** ~8 minutos (499 groups × 1 seg c/u)

### Opción B: Script Python con Concurrencia (Recomendada)
```bash
cd C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\Historico
python load_concurrent.py --threads 5
```
- **Ventaja:** Ejecuta múltiples groups en paralelo
- **Tiempo:** ~2 minutos (5 threads × 10 seconds c/u)

### Opción C: CLI Supabase
```bash
supabase db push --dir ./final_batches
```
- **Requiere:** Supabase CLI instalado y autenticado

---

## 📁 Archivos Generados

```
Historico/
├── historico_limpio.csv              (80 MB - datos de origen)
├── chunk_001.sql ... chunk_8930.sql  (8,930 chunks de 100 registros)
├── batches/
│   └── batch_0001.sql ... batch_0179.sql  (179 batches de 50 chunks)
├── subbatches/
│   └── batch_XXXX_01.sql ... (2,493 sub-batches de 50KB)
├── final_batches/
│   └── exec_0001.sql ... exec_0250.sql  (250 execution batches)
└── execution_groups/
    └── group_0001.sql ... group_0499.sql  (499 groups listos)
```

---

## ⚙️ Proceso Realizado

```
Histórico.xlsx
    ↓
historico_limpio.csv (892,901 registros)
    ↓
8,930 chunks (100 registros c/u)
    ↓
250 execution batches (433 KB c/u)
    ↓
499 execution groups (214 KB c/u)
    ↓
Supabase: flujo_historico table
```

---

## ✨ Próximos Pasos

### Inmediatos (Esta sesión)
1. ☐ Ejecutar execution_groups en Supabase
2. ☐ Verificar que 892,901 registros se cargaron correctamente
3. ☐ Crear vistas SQL: "real ejecutado vs proyección"

### Después de carga completada
1. ☐ Actualizar IC-EOS wiki `log.md` con fecha de completación
2. ☐ Crear dashboards KPI basados en datos históricos
3. ☐ Implementar análisis de proyecciones vs realizados

---

## 🔧 Verificación

Después de ejecutar todos los groups, correr en Supabase SQL Editor:

```sql
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT proyecto) as projects,
    COUNT(DISTINCT fecha_periodo) as periods,
    MIN(fecha_periodo) as earliest,
    MAX(fecha_periodo) as latest
FROM public.flujo_historico 
WHERE company_id = 'ic-constructora';
```

**Resultado esperado:**
```
total_records: 892,901
projects: ~15
periods: ~84
earliest: 2019-09-01
latest: 2026-01-01
```

---

## 📞 Estado Actual

- **Tabla:** ✅ Creada y configurada
- **Datos:** ✅ Preparados en 499 grupos
- **Carga:** ⏳ Pendiente ejecución
- **Validación:** ⏳ Pendiente verificación post-carga

**Última actualización:** 2026-05-16 12:30 UTC-5
