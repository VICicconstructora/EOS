# Instrucciones: Cargar Histórico en Supabase

**Tiempo estimado:** 15 minutos  
**Archivos necesarios:**
- `historico_limpio.csv` ← Datos
- `supabase_schema.sql` ← Schema

---

## 🔑 Paso 1: Preparar Credenciales Supabase

1. Ve a tu **proyecto Supabase** → **Settings** → **API**
2. Copia y guarda:
   - **Project URL:** `https://[proyecto].supabase.co`
   - **Anon Key:** `eyJ...` (pública)
   - **Service Role Key:** `eyJ...` (privada)
   - **Database Password:** (para psql)

> **Nota:** Guardar en lugar seguro (ej: `.env`)

---

## 🗄️ Paso 2: Crear Schema en Supabase

1. Abre tu proyecto Supabase
2. Ve a **SQL Editor** → **New Query**
3. Copia todo el contenido de **`supabase_schema.sql`**
4. Pega en el editor
5. Click en **Run** (o Ctrl+Enter)

✅ Debe decir "Success" sin errores

> **Qué se crea:**
> - Tabla `historico` con índices
> - 7 vistas útiles
> - Row Level Security (RLS)
> - Función de validación

---

## 📤 Paso 3: Cargar Datos

### Opción A: Via Supabase UI (Recomendado - visual)

1. **Ve a Storage:**
   - Click en **+ New bucket**
   - Nombre: `historico`
   - Habilitar "Public bucket"
   - Click **Create bucket**

2. **Sube el CSV:**
   - Click en bucket `historico`
   - Drag & drop o **Upload file**
   - Selecciona `historico_limpio.csv`
   - Espera a que termine (debe decir "✅")

3. **Copia datos a tabla:**
   - Ve a **SQL Editor** → **New Query**
   - Ejecuta:

```sql
INSERT INTO historico (proyecto, fecha_datos, fuente, pg, fecha, valor, tipo_dato)
SELECT 
    proyecto,
    fecha_datos::date,
    fuente,
    pg,
    fecha::date,
    valor,
    tipo_dato
FROM (
    SELECT * FROM read_csv('https://[TU-PROYECTO].supabase.co/storage/v1/object/public/historico/historico_limpio.csv'::text)
) AS csv_data;
```

> Reemplaza `[TU-PROYECTO]` con tu proyecto

---

### Opción B: Via pgAdmin (CLI - más rápido para datos grandes)

1. **Abre terminal PowerShell:**

```powershell
# Conectar a Supabase PostgreSQL
$host = "db.[TU-PROYECTO].supabase.co"
$user = "postgres"
$database = "postgres"
$password = "[TU-DATABASE-PASSWORD]"

# Copiar CSV
$csvPath = "C:\Users\jmacallister\OneDrive - IC CONSTRUCTORA SAS\Documentos\ICEOS\IC-EOS\historico_limpio.csv"

# Ejecutar COPY (reemplazar < con comando psql)
psql -h $host -U $user -d $database -c "\COPY historico (proyecto, fecha_datos, fuente, pg, fecha, valor, tipo_dato) FROM '$csvPath' CSV HEADER DELIMITER ','"
```

> Cuando pida contraseña, ingresa el **Database Password**

---

### Opción C: Importar directamente en pgAdmin

1. **Descargar pgAdmin:** https://www.pgadmin.org/download/
2. **Conectar a Supabase:**
   - Click **Add Server**
   - Hostname: `db.[TU-PROYECTO].supabase.co`
   - Username: `postgres`
   - Password: [TU-DATABASE-PASSWORD]
   - Guardar
3. **Importar datos:**
   - Clic derecho en tabla `historico` → **Import/Export**
   - Archivo: `historico_limpio.csv`
   - CSV, Header = true
   - Click **Import**

---

## ✅ Paso 4: Validar Carga

En **SQL Editor**, ejecuta:

```sql
-- Validación rápida
SELECT * FROM validar_historico();
```

Debe mostrar:
```
Total de registros          | 892901
Combinaciones duplicadas    | 0
Proyectos únicos            | 40
Películas únicas            | 16
Líneas P&G únicas           | 161
Datos HISTORICO             | 617659
Datos PROYECCION            | 275242
Fecha mínima                | 2019-06-01
Fecha máxima                | 2033-11-01
Película mínima             | 2025-01-01
Película máxima             | 2026-04-01
```

---

## 🔍 Paso 5: Explorar Datos

### Ver primeros registros:
```sql
SELECT * FROM historico LIMIT 10;
```

### Ver proyectos:
```sql
SELECT DISTINCT proyecto FROM historico ORDER BY proyecto;
```

### Ver una película específica:
```sql
SELECT * FROM historico
WHERE proyecto = 'WELL' 
  AND fecha_datos = '2026-04-01'
LIMIT 20;
```

### Ver flujo de caja:
```sql
SELECT * FROM v_flujo_caja
WHERE proyecto = 'WELL'
ORDER BY fecha_datos DESC;
```

---

## 🌐 Paso 6: Conectar desde tu App

### JavaScript

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://[TU-PROYECTO].supabase.co',
    'YOUR_ANON_KEY'
)

// Ejemplo 1: Obtener última película
const { data: ultima } = await supabase
    .from('v_ultima_pelicula')
    .select('*')

// Ejemplo 2: Flujo de caja
const { data: fcl } = await supabase
    .from('v_flujo_caja')
    .select('*')
    .eq('proyecto', 'WELL')

// Ejemplo 3: Últimos datos históricos
const { data: historico } = await supabase
    .from('v_historico_datos')
    .select('*')
    .eq('proyecto', 'WELL')
    .order('fecha_datos', { ascending: false })
    .limit(100)
```

### Python

```python
from supabase import create_client, Client

supabase: Client = create_client(
    'https://[TU-PROYECTO].supabase.co',
    'YOUR_ANON_KEY'
)

# Obtener flujo de caja
response = supabase.table('v_flujo_caja')\
    .select('*')\
    .eq('proyecto', 'WELL')\
    .order('fecha_datos', desc=True)\
    .execute()

print(response.data)
```

### SQL (desde Supabase)

```sql
-- Query cualquier vista
SELECT * FROM v_flujo_caja
WHERE proyecto = 'WELL'
ORDER BY fecha_datos DESC
LIMIT 10;
```

---

## ⚙️ Paso 7: Configurar Automatización (Opcional)

### Cada mes, cuando tengas nuevos datos:

1. **Genera nuevo CSV** con:
   ```python
   python ingesta_historico.py
   ```

2. **Sube a Storage** el nuevo archivo

3. **Ejecuta en SQL Editor:**
   ```sql
   -- Limpiar y recargar
   TRUNCATE historico CASCADE;
   
   -- Cargar nuevos datos
   \COPY historico (proyecto, fecha_datos, fuente, pg, fecha, valor, tipo_dato) 
   FROM 'historico_limpio.csv' CSV HEADER;
   ```

---

## 🔐 Seguridad - Buenas Prácticas

1. **Nunca** compartas credenciales en código
2. **Usa environment variables:**
   ```javascript
   const supabase = createClient(
       process.env.SUPABASE_URL,
       process.env.SUPABASE_ANON_KEY
   )
   ```

3. **Para backend** (Node.js/Python):
   ```javascript
   const supabaseAdmin = createClient(
       process.env.SUPABASE_URL,
       process.env.SUPABASE_SERVICE_ROLE_KEY
   )
   ```

4. **Row Level Security (RLS)** está habilitado:
   - Tabla solo legible públicamente
   - Escritura solo para usuarios autenticados

---

## 🆘 Troubleshooting

### Error: "Relation 'historico' does not exist"
→ Ejecutar nuevamente `supabase_schema.sql`

### Error: "Duplicate key value violates unique constraint"
→ Ya hay datos. Ejecutar:
```sql
TRUNCATE historico CASCADE;
```

### Carga lenta (>1 min)
→ Desactivar temporalmente índices:
```sql
-- Antes de cargar
DROP INDEX idx_historico_proyecto;
-- ... (otros índices)

-- Después de cargar
CREATE INDEX idx_historico_proyecto ON historico(proyecto);
```

### No veo datos en vista
→ Recargar página o ejecutar:
```sql
REFRESH MATERIALIZED VIEW v_nombre_vista;
```

---

## ✅ Checklist Final

- [ ] Proyecto Supabase creado
- [ ] Credenciales guardadas seguro
- [ ] Schema creado (`supabase_schema.sql`)
- [ ] Datos cargados (892,901 registros)
- [ ] Validación ejecutada sin errores
- [ ] Vistas funcionan
- [ ] Aplicación conectada
- [ ] RLS habilitado
- [ ] Respaldo configurado (Supabase automático)

---

## 📞 Próximos Pasos

1. **Crear dashboard** con datos
2. **Generar reportes** automáticos
3. **Configurar alertas** (ej: si FCL < 0)
4. **Integrar con otras apps** (Power BI, Metabase, etc.)

---

**¡Listo! Tus datos están en Supabase 🚀**
