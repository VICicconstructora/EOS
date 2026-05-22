# Guía de Configuración: Power BI Desktop → Supabase (Proyecto IC Constructora)

**Versión:** 1.0  
**Fecha:** 16-05-2026  
**Propósito:** Conectar Power BI Desktop al datamart ADPRO en Supabase  
**Audiencia:** Andrés Arango (Construcción), analistas de reportería  
**Prerequisitos:** Power BI Desktop (v2.133+), credenciales Supabase, acceso a la base de datos

---

## 1. Resumen de Conexión

| Parámetro | Valor |
|-----------|-------|
| **Proyecto Supabase** | zbjwasufengayvmutypr |
| **Host PostgreSQL** | `zbjwasufengayvmutypr.supabase.co` |
| **Puerto** | 6543 (conexión SSL a PostgreSQL) |
| **Base de Datos** | `postgres` |
| **Usuario** | `postgres` o `service_role` |
| **Contraseña** | Ver Supabase > Project Settings > Database > Password |
| **Tablas Principales** | ADPRO (25 tablas) + vista `adpro_vfact_control_proyecto` |
| **Histórico** | 836K registros en tabla `historico` |

**Nota:** Se recomienda usar `service_role` para Power BI (lectura de todas las tablas); para máxima seguridad, crear usuario específico en PostgreSQL con permisos SELECT únicamente.

---

## 2. Descargar e Instalar PostgreSQL Connector

### Paso 1: Verificar Conector Disponible

1. Abre **Power BI Desktop**
2. Ve a **File → Options and Settings → Options**
3. En la sección **Security**, revisa **Data Extensions**
4. Si ves opción "PostgreSQL database", continúa al Paso 3

### Paso 2: Instalar Conector (si no existe)

1. Ve a **Get Data → Database → PostgreSQL database**
2. Si aparece error "Extension not found":
   - Descarga desde: [PostgreSQL driver para Power BI](https://www.postgresql.org/download/)
   - O usa: **Get Data → More → Database → PostgreSQL**
   - Power BI buscará automáticamente el conector

**Alternativa:** Descargar driver ODBC de PostgreSQL:
- Descarga: [PostgreSQL ODBC Driver](https://www.postgresql.org/ftp/odbc/)
- Instala: `psqlODBC_14_00_0000-x64.exe` (o versión más reciente)
- Reinicia Power BI Desktop

### Paso 3: Validar Instalación

1. Ve a **Get Data**
2. Busca "PostgreSQL"
3. Deberías ver opción **PostgreSQL database**

---

## 3. Crear Conexión a Supabase

### Paso 1: Get Data → PostgreSQL

1. Abre Power BI Desktop
2. **Home → Get Data → PostgreSQL database**

### Paso 2: Ingresar Credenciales

Verás diálogo con dos campos:

| Campo | Valor |
|-------|-------|
| **Server** | `zbjwasufengayvmutypr.supabase.co` |
| **Database** | `postgres` |

Deja vacíos (se ingresan en siguientes pasos):
- Port (usa default 6543)
- User (ingresar después)
- Password (ingresar después)

**Haz clic:** Import (o Get Data)

### Paso 3: Seleccionar Autenticación

Aparecerá diálogo **SQL Server/PostgreSQL Connection**:

**Opción A: Autenticación Usuario/Contraseña (Recomendado)**

1. Pestaña: **Database**
2. User name: `postgres`
3. Password: [Obtén de Supabase Dashboard]
4. ✅ Marca: **Encrypt connection**
5. Haz clic: **Connect**

**Opción B: Autenticación por Token (Service Role)**

1. Pestaña: **Database**
2. User name: `postgres`
3. Password: [Token de service_role key de Supabase]
4. ✅ Marca: **Encrypt connection**
5. Haz clic: **Connect**

### Paso 4: Obtener Credenciales desde Supabase

Si no tienes la contraseña:

1. Abre [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona proyecto: **IC Constructora** (zbjwasufengayvmutypr)
3. Ve a: **Project Settings → Database → Connection Info**
4. Copia:
   - **Host:** `zbjwasufengayvmutypr.supabase.co`
   - **Port:** `6543`
   - **Database:** `postgres`
   - **User:** `postgres`
   - **Password:** [Ver Password en la misma sección o regenerar]

**Alternativa - Service Role Key:**
1. Ve a: **Project Settings → API**
2. Copia: **Service role** (largo token `eyJ...`)
3. Úsalo como password en lugar de la contraseña de postgres

---

## 4. Seleccionar Tablas y Vistas

### Paso 1: Navigator - Seleccionar Tablas

Después de conectar, aparecerá diálogo **Navigator** con todas las tablas:

**Tablas CORE a cargar:**

| Tabla | Descripción | Registros | Propósito |
|-------|-------------|-----------|-----------|
| `adpro_fact_control_proyecto` | Principal: presupuesto vs realizado | 100K+ | Control de proyectos |
| `adpro_dim_proyecto` | Dimensión: datos del proyecto | ~20 | Filtro proyecto |
| `adpro_dim_fecha` | Dimensión: calendario (YYYYMMDD) | ~365 | Análisis temporal |
| `adpro_dim_capitulo_presupuesto` | Dimensión: capítulos presupuestales | ~100 | Desglose por concepto |
| `adpro_dim_empresa` | Dimensión: empresas/sucursales | ~5 | Filtro entidad legal |
| `adpro_dim_tercero` | Dimensión: proveedores, contratistas | ~500 | Análisis por proveedor |
| `adpro_fact_compras` | Hechos: órdenes de compra | 50K+ | Análisis de compras |
| `adpro_fact_actas` | Hechos: actas de cobro | 30K+ | Flujo de caja |
| `historico` | Histórico proyectos (836K) | 836K | Series temporales |

**Tablas OPCIONALES:**
- `adpro_fact_contratos` — si necesitas análisis de contratos
- `adpro_fact_anticipo` — anticipos entregados
- `adpro_fact_inventario_resumido` — movimientos de almacén

### Paso 2: Crear Vista Desnormalizada (Recomendado)

**Para simplificar modelo en Power BI,** usa la vista plana:
- `adpro_vfact_control_proyecto` — Ya contiene todas las dimensiones denormalizadas

**Ventajas:**
- Una tabla, no múltiples joins
- Performance mejor en Power BI
- Datos listos para reportes

**Desventajas:**
- Más datos redundantes
- Menos flexibilidad si necesitas granularidad extrema

### Paso 3: Cargar Tablas

1. En Navigator, marca las tablas/vistas que necesitas
2. **Load** (carga inmediata) o **Transform Data** (editor Power Query)
3. Si es la primera vez: **Load** es suficiente
4. Power BI descargará datos y creará modelos automáticos

**Tiempo estimado:**
- Tablas dimensión: <5 segundos
- FACT_ControlProyecto (100K): ~15 segundos
- Histórico (836K): ~30-60 segundos

---

## 5. Configurar Modelo de Datos

### Paso 1: Verificar Relaciones Automáticas

1. Después de cargar, ve a: **Model** (esquema)
2. Power BI intentará crear relaciones automáticamente
3. Verifica:
   - **FACT_ControlProyecto** → **DIM_Proyecto** (por `sk_id_proyecto`)
   - **FACT_ControlProyecto** → **DIM_Fecha** (por `sk_id_fecha`)
   - **FACT_ControlProyecto** → **DIM_CapituloPresupuesto** (por `sk_id_capitulo`)

### Paso 2: Crear Relaciones Manualmente (si falta)

Si Power BI no detectó relaciones:

1. Ve a **Model**
2. **New Relationship** (botón en ribbon)
3. Arrastra FK desde FACT a DIM:

   | Desde (FACT) | Hacia (DIM) | Campo FK | Campo PK |
   |--------------|-------------|----------|----------|
   | `adpro_fact_control_proyecto` | `adpro_dim_proyecto` | `sk_id_proyecto` | `sk_id_proyecto` |
   | `adpro_fact_control_proyecto` | `adpro_dim_fecha` | `sk_id_fecha` | `sk_id_fecha` |
   | `adpro_fact_control_proyecto` | `adpro_dim_capitulo_presupuesto` | `sk_id_capitulo_presupuesto` | `sk_id_capitulo_presupuesto` |
   | `adpro_fact_compras` | `adpro_dim_proyecto` | `sk_id_proyecto` | `sk_id_proyecto` |
   | `adpro_fact_actas` | `adpro_dim_tercero` | `sk_id_tercero` | `sk_id_tercero` |

4. Haz clic: **OK**

### Paso 3: Marcar Columnas como Medidas (Recomendado)

1. Ve a **Model**
2. Selecciona tabla FACT
3. Para cada columna numérica (valor, cantidad), haz clic derecho:
   - **Mark as measure** (si aún no está marcada)

**Ejemplos:**
- `adpro_fact_control_proyecto.valor_total_presupuesto` → SUM
- `adpro_fact_control_proyecto.valor_total_realizado` → SUM
- `adpro_fact_compras.valor_total` → SUM

---

## 6. Test de Conexión y Carga

### Paso 1: Crear Visual Simple

1. Ve a: **Report** tab
2. **Insert → Table** (tabla simple)
3. Arrastra campos desde FACT_ControlProyecto:
   - `codigo_proyecto`
   - `valor_total_presupuesto`
   - `valor_total_realizado`

### Paso 2: Validar Datos

Verifica:
- ✅ Datos visibles (no vacíos)
- ✅ Valores numéricos correctos (no NULL masivos)
- ✅ Sin errores de conexión

### Paso 3: Guardar

**File → Save As:**
- Nombre: `IC_CONSTRUCTORA_ADPRO_DATA_MODEL.pbix`
- Ubicación: `c:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\`

---

## 7. Configurar Refresh (Actualización de Datos)

### Opción A: Refresh Manual (Desarrollo)

1. **Home → Refresh** (o Ctrl + Shift + R)
2. Los datos se actualizarán desde Supabase

### Opción B: Refresh Automático (Power BI Service)

Si publicas a Power BI Service (Online):

1. **Publish** (Cloud icon)
2. Ve a [Power BI Service](https://app.powerbi.com/)
3. Abre dataset: **IC_CONSTRUCTORA_ADPRO_DATA_MODEL**
4. **Settings → Scheduled refresh**
5. Configura:
   - **Frequency:** Daily
   - **Time:** 4:00 AM (UTC-5)
   - **Time zone:** Bogotá

**Para Histórico (actualización mensual):**
- **Frequency:** Monthly
- **Day:** Primer día del mes
- **Time:** 5:00 AM

### Opción C: Incremental Refresh (Datos 1M+)

Para tablas con 1M+ registros (como Histórico), configura:

1. Ve a **Transform Data** (Power Query Editor)
2. Selecciona tabla histórico
3. **Home → Incremental Refresh**
4. Marca:
   - **Apply incremental refresh**
   - **Store DATE/TIME:** Última columna de fecha (ej: `fecha_datos`)
5. Configura ventanas:
   - **Incremental:** Últimos 3 meses
   - **Full:** Últimos 12 meses

---

## 8. Seguridad y RLS en Power BI

### Opción A: Lectura Directa (Sin RLS en PBI)

Si todos los usuarios tienen acceso a todos los datos (transparente a nivel Supabase):
- No es necesario configurar RLS en Power BI
- Power BI hereda filtro `company_id = 'ic-constructora'` de Supabase automáticamente

### Opción B: RLS por Área (Control de Acceso)

Si necesitas que:
- **Construcción (Andrés Arango)** → vea solo proyectos asignados
- **Control (Marcela Arroyave)** → vea solo compras/actas
- **CEO (Juan Paulo)** → vea todo

**Pasos:**

1. Ve a **Model**
2. Selecciona tabla DIM_Proyecto
3. **New role** (botón en ribbon)
4. Nombre: `Construccion`
5. **Haz clic en tabla** DIM_Proyecto
6. **Add filter:** `codigo_proyecto IN ('Bosque Central CBR', 'Gaia CBR', ...)`
7. Repite para otros roles

**Para publicar:** Ve a Power BI Service > Settings > Row-level security > Assign roles

---

## 9. Troubleshooting

| Problema | Causa Probable | Solución |
|----------|----------------|----------|
| **"PostgreSQL database driver not found"** | Conector no instalado | Instalar PostgreSQL ODBC Driver (paso 2.2) |
| **"Connection timeout"** | Host/puerto incorrecto | Verifica host (`zbjwasufengayvmutypr.supabase.co`) y puerto (6543) |
| **"Authentication failed"** | Usuario/contraseña incorrecta | Regenera contraseña en Supabase > Settings > Database |
| **"SSL certificate problem"** | Certificado SSL vencido | Haz clic **Encrypt connection** deshabilitado (solo desarrollo) |
| **Datos vacíos / NULL** | Filtro `company_id` no coincide | Verifica: ¿Están los datos con `company_id = 'ic-constructora'`? |
| **Tabla muy lenta (>60s)** | Histórico sin índices | Usa vista `adpro_vfact_control_proyecto` en lugar de tabla directa |

---

## 10. Checklist de Validación

Antes de entregar a Andrés Arango:

- [ ] Conexión a Supabase activa (no errores)
- [ ] Tablas cargan en <60 segundos
- [ ] Relaciones correctas entre DIM y FACT
- [ ] Valores presupuesto vs realizado visibles
- [ ] Histórico cargado (836K registros)
- [ ] Refresh automático configurado
- [ ] RLS configurado (si aplica)
- [ ] Archivo `.pbix` guardado en ubicación estándar
- [ ] Documentación compartida con Andrés

---

## 11. Próximos Pasos

1. **Crear reportes** (ver `POWER_BI_REPORT_SPECS.md`)
2. **Agregar medidas** (ver `POWER_BI_DATA_MODEL.md`)
3. **Publicar a Power BI Service**
4. **Entrenar usuarios** (Andrés Arango, equipo Control)
5. **Automatizar refresh** diario/mensual

---

**Documento Preparado Por:** Claude Code  
**Para:** Andrés Arango (Construcción) — IC Constructora  
**Próximo Hito:** Crear reportes de Control Presupuesto + Flujo de Caja
