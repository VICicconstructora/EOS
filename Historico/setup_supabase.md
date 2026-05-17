# Setup Histórico en Supabase

## Paso 1: Crear Tabla en Supabase

Ve a tu proyecto Supabase → SQL Editor y ejecuta:

```sql
-- Crear tabla historico
CREATE TABLE historico (
    id BIGSERIAL PRIMARY KEY,
    proyecto VARCHAR(255) NOT NULL,
    fecha_datos DATE NOT NULL,
    fuente VARCHAR(100),
    pg VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    valor DECIMAL(18, 2),
    tipo_dato VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Clave única
    CONSTRAINT uk_historico UNIQUE (fecha_datos, fecha, pg, proyecto)
);

-- Crear índices para performance
CREATE INDEX idx_historico_proyecto ON historico(proyecto);
CREATE INDEX idx_historico_fecha_datos ON historico(fecha_datos);
CREATE INDEX idx_historico_pg ON historico(pg);
CREATE INDEX idx_historico_fecha ON historico(fecha);
CREATE INDEX idx_historico_tipo_dato ON historico(tipo_dato);

-- Crear índice compuesto para búsquedas frecuentes
CREATE INDEX idx_historico_proyecto_fecha_datos ON historico(proyecto, fecha_datos);
```

---

## Paso 2: Habilitar RLS (Seguridad)

```sql
-- Habilitar Row Level Security
ALTER TABLE historico ENABLE ROW LEVEL SECURITY;

-- Crear política pública (leer solo)
CREATE POLICY "Allow public read" ON historico
    FOR SELECT
    USING (true);

-- Si solo ciertos usuarios pueden escribir:
CREATE POLICY "Allow authenticated write" ON historico
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
```

---

## Paso 3: Cargar Datos

### Opción A: Supabase UI (más fácil)

1. Ve a **Storage** → Crear bucket `historico`
2. Sube `historico_limpio.csv`
3. Ve a **SQL Editor**
4. Ejecuta:

```sql
-- Copiar desde archivo CSV en Storage
SELECT * FROM csv_import(
    'https://[tu-proyecto].supabase.co/storage/v1/object/public/historico/historico_limpio.csv',
    csv_options => '{"header": true, "delimiter": ","}'
);
```

### Opción B: psql CLI (más rápido para 892K registros)

```bash
# Descargar archivo de datos
cd C:\Users\jmacallister\OneDrive - IC CONSTRUCTORA SAS\Documentos\ICEOS\IC-EOS

# Conectar a Supabase y copiar
psql -h db.PROYECTO.supabase.co \
     -U postgres \
     -d postgres \
     -c "\COPY historico (proyecto, fecha_datos, fuente, pg, fecha, valor, tipo_dato) FROM 'historico_limpio.csv' WITH (FORMAT csv, HEADER true, DELIMITER ',');"
```

### Opción C: pgAdmin (interfaz gráfica)

1. Conectar a Supabase vía pgAdmin
2. Clic derecho en tabla → Import
3. Seleccionar `historico_limpio.csv`

---

## Paso 4: Validar Carga

```sql
-- Verificar total de registros
SELECT COUNT(*) as total FROM historico;

-- Verificar distribución
SELECT 
    COUNT(*) as total,
    COUNT(DISTINCT proyecto) as proyectos,
    COUNT(DISTINCT fecha_datos) as peliculas,
    COUNT(DISTINCT pg) as lineas_pg,
    SUM(CASE WHEN tipo_dato = 'HISTORICO' THEN 1 ELSE 0 END) as datos_historicos,
    SUM(CASE WHEN tipo_dato = 'PROYECCION' THEN 1 ELSE 0 END) as proyecciones
FROM historico;

-- Verificar integridad
SELECT 
    MIN(fecha) as fecha_minima,
    MAX(fecha) as fecha_maxima,
    MIN(fecha_datos) as pelicula_minima,
    MAX(fecha_datos) as pelicula_maxima
FROM historico;

-- Verificar sin duplicados
SELECT 
    fecha_datos, fecha, pg, proyecto, COUNT(*) as num
FROM historico
GROUP BY fecha_datos, fecha, pg, proyecto
HAVING COUNT(*) > 1;
```

---

## Paso 5: Crear Vistas Útiles

```sql
-- Vista: Datos históricos
CREATE VIEW v_historico_datos AS
SELECT * FROM historico 
WHERE tipo_dato = 'HISTORICO'
ORDER BY proyecto, fecha_datos, pg, fecha;

-- Vista: Proyecciones
CREATE VIEW v_proyecciones_datos AS
SELECT * FROM historico 
WHERE tipo_dato = 'PROYECCION'
ORDER BY proyecto, fecha_datos, pg, fecha;

-- Vista: Última película por proyecto
CREATE VIEW v_ultima_pelicula AS
SELECT 
    proyecto,
    MAX(fecha_datos) as fecha_ultima_pelicula,
    COUNT(*) as num_registros
FROM historico
GROUP BY proyecto;

-- Vista: Flujo de Caja por Proyecto y Película
CREATE VIEW v_flujo_caja AS
SELECT 
    proyecto,
    fecha_datos,
    SUM(CASE WHEN pg LIKE '16.0%' THEN valor ELSE 0 END) as fcl,
    SUM(CASE WHEN pg LIKE '16.1%' THEN valor ELSE 0 END) as fcl_acumulado,
    SUM(CASE WHEN pg LIKE '1.0%' THEN valor ELSE 0 END) as ingresos,
    SUM(CASE WHEN pg LIKE '9.0%' THEN valor ELSE 0 END) as costos
FROM historico
WHERE tipo_dato = 'HISTORICO'
GROUP BY proyecto, fecha_datos
ORDER BY proyecto, fecha_datos DESC;
```

---

## Paso 6: Conectar desde Aplicación

### JavaScript/Node.js

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://[proyecto].supabase.co',
    'YOUR_ANON_KEY'
)

// Obtener datos
const { data, error } = await supabase
    .from('historico')
    .select('*')
    .eq('proyecto', 'WELL')
    .order('fecha_datos', { ascending: false })

// Obtener última película
const { data: ultima } = await supabase
    .from('v_ultima_pelicula')
    .select('*')
```

### Python

```python
from supabase import create_client, Client

url = "https://[proyecto].supabase.co"
key = "YOUR_ANON_KEY"
supabase: Client = create_client(url, key)

# Obtener datos
response = supabase.table('historico')\
    .select('*')\
    .eq('proyecto', 'WELL')\
    .order('fecha_datos', desc=True)\
    .execute()

# Obtener flujo de caja
response = supabase.table('v_flujo_caja')\
    .select('*')\
    .execute()
```

### SQL (desde Supabase SQL Editor)

```sql
-- Query simple
SELECT * FROM historico
WHERE proyecto = 'WELL'
ORDER BY fecha_datos DESC, fecha DESC
LIMIT 100;

-- Flujo de caja por película
SELECT 
    proyecto,
    fecha_datos,
    fecha,
    pg,
    valor,
    tipo_dato
FROM historico
WHERE proyecto = 'WELL'
  AND fecha_datos = '2026-04-01'
  AND pg IN ('16.0 FCL', '16.1 FCL ACUMULADO', '1.0 Ingresos')
ORDER BY pg, fecha;
```

---

## Paso 7: Configurar Realtime (Opcional)

```sql
-- Habilitar Realtime para cambios en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE historico;
```

Ahora desde tu app puedes escuchar cambios:

```javascript
const subscription = supabase
    .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'historico' },
        payload => console.log('Cambio:', payload)
    )
    .subscribe()
```

---

## Paso 8: Automatizar Ingesta Mensual (Opcional)

Crear trigger en Supabase que ejecute cada mes:

```sql
-- Crear tabla temporal para nuevas películas
CREATE TABLE historico_nuevas_peliculas (
    id BIGSERIAL PRIMARY KEY,
    proyecto VARCHAR(255),
    fecha_datos DATE,
    fuente VARCHAR(100),
    pg VARCHAR(255),
    fecha DATE,
    valor DECIMAL(18, 2),
    tipo_dato VARCHAR(20)
);

-- Crear función para sincronizar
CREATE OR REPLACE FUNCTION sincronizar_historico()
RETURNS void AS $$
BEGIN
    -- Insertar nuevas películas desde tabla temporal
    INSERT INTO historico 
    SELECT * FROM historico_nuevas_peliculas
    ON CONFLICT (fecha_datos, fecha, pg, proyecto) 
    DO UPDATE SET valor = EXCLUDED.valor;
    
    -- Limpiar tabla temporal
    DELETE FROM historico_nuevas_peliculas;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar manualmente cuando tengas nuevas películas
SELECT sincronizar_historico();
```

---

## 🔐 Credenciales Supabase

Necesitarás:
- **Project URL:** https://[proyecto].supabase.co
- **Anon Key:** `eyJ...` (pública, para clientes)
- **Service Role Key:** `eyJ...` (privada, solo servidor)
- **DB Password:** Para conexiones psql

Obtén estos en Settings → API en tu proyecto Supabase.

---

## ✅ Checklist

- [ ] Tabla `historico` creada en Supabase
- [ ] Índices creados
- [ ] RLS habilitado
- [ ] Archivo `historico_limpio.csv` cargado
- [ ] Validación ejecutada (892,901 registros)
- [ ] Vistas creadas
- [ ] Conexión desde app testeada
- [ ] Realtime habilitado (opcional)
- [ ] Job mensual configurado (opcional)

---

**Listo para usar! 🚀**
