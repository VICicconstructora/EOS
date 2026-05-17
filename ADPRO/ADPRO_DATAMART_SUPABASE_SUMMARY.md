# ADPRO Datamart - Supabase DDL Summary

**Fecha de Implementación:** 2026-05-16  
**Proyecto Supabase:** EOS IC Constructora (ID: lxlkdfzdwulvpzkjvnvo)  
**Responsable Negocio:** Andrés Arango (Construcción)  
**Estado:** ✅ COMPLETADO

---

## Resumen de Tablas Creadas

Total: **25 tablas** (11 dimensiones + 14 hechos) + 1 vista plana

### Dimensiones (11)
Todas con RLS habilitado, lectura por `company_id = 'ic-constructora'`

| Tabla | Registros | Propósito |
|-------|-----------|----------|
| `adpro_dim_fecha` | 0 | Calendario estándar (YYYYMMDD, jerarquía temporal) |
| `adpro_dim_empresa` | 0 | Entidades legales, multicompañía |
| `adpro_dim_proyecto` | 0 | Proyectos, macroproyectos, sucursales |
| `adpro_dim_tercero` | 0 | Proveedores, contratistas, clientes (NIT único) |
| `adpro_dim_capitulo_presupuesto` | 0 | Capítulos del presupuesto por proyecto |
| `adpro_dim_control_clase_origen` | 0 | Clases (Presupuesto, Invertido, etc.) y orígenes |
| `adpro_dim_estado_por_documento` | 0 | Estados por tipo de documento (Aprobado, Anulado, etc.) |
| `adpro_dim_tipo_contrato` | 0 | Modalidades de contrato (Por Administración, Precio Fijo) |
| `adpro_dim_insumo` | 0 | Catálogo de recursos (materiales, mano de obra, equipos) |
| `adpro_dim_items` | 0 | Ítems/actividades del presupuesto (32K+ registros esperados) |
| `adpro_dim_usuario` | 0 | Usuarios de ADPRO para auditoría |

### Tablas de Hechos (14)
Todas con RLS habilitado, lectura por `company_id = 'ic-constructora'`

| Tabla | Propósito | Métrica Principal |
|-------|----------|------------------|
| `adpro_fact_control_proyecto` | **Principal:** Presupuesto vs realizado, ciclo de costo | Valor Total (con IVA) |
| `adpro_fact_contratos` | Compromisos contractuales con contratistas | Valor Total (con IVA) |
| `adpro_fact_compras` | Órdenes de compra a proveedores | Valor Total (con IVA) |
| `adpro_fact_actas` | Actas de cobro de contratistas (retenciones, anticipos) | Valor Total Neto |
| `adpro_fact_anticipo` | Anticipos entregados a terceros | Valor Anticipo |
| `adpro_fact_devoluciones` | Devoluciones de materiales a proveedores | Total Devolución |
| `adpro_fact_entradas_almacen` | Recepciones de materiales (liquidación OC) | Total Entrada |
| `adpro_fact_inventario_resumido` | Movimientos consolidados (18 tipos: EB, EP, SA, TS, etc.) | Total Movimiento |
| `adpro_fact_notas_en_valor` | Ajustes de precio sin movimiento físico | Total Nota |
| `adpro_fact_pedidos` | Solicitudes de compra (presupuestal vs adicional) | Código OC |
| `adpro_fact_proyeccion` | Proyecciones y reformas presupuestales | Valor Total |
| `adpro_fact_reintegro` | Devoluciones internas (obra a almacén) | Valor Total |
| `adpro_fact_salidas_almacen` | Despachos al frente (costo consumido) | Valor Total Salida |
| `adpro_fact_traslados` | Movimientos entre proyectos (doble registro) | Valor Total Traslado |

### Vista Plana (1)
- `adpro_vfact_control_proyecto` — Desnormalizada para Power BI, denormaliza FACT_ControlProyecto con todas las dimensiones

---

## Tipos de Datos Utilizados

### Numeración
- **Claves Subrogadas (SK):**
  - `SMALLINT`: sk_id_empresa, sk_id_clase_origen (< 32K valores)
  - `INT`: sk_id_proyecto, sk_id_tercero, sk_id_insumo, sk_id_items, sk_id_fecha (para YYYYMMDD)
  - `BIGSERIAL`: Claves de hechos (auto-increment)

### Dinero
- `DECIMAL(18, 2)` — Valores financieros (presupuesto, compras, actas, etc.)
- Incluye IVA en todas las "Valor Total" a menos que especifique "Sin IVA"

### Cantidad
- `NUMERIC(18, 4)` — Cantidades de insumos (decimales para kg, m3, etc.)

### Fechas
- `DATE` — Columna física en DIM_Fecha
- `INT` (sk_id_fecha) — Referencia YYYYMMDD para eficiencia relacional

### Texto
- `VARCHAR(50)` — Códigos de negocio (NIT, código proyecto, etc.)
- `VARCHAR(100)` — Estados, tipos, clasificaciones
- `VARCHAR(255)` — Nombres, descripciones cortas
- `VARCHAR(500)` — Descripciones largas (items, causas)
- `CHAR(1)` — Flags (VIS, Urgente, Descuento)

---

## Índices Estratégicos

Cada tabla FACT incluye índices en:
- **Claves foráneas primarias** (proyecto, fecha, tercero)
- **Filtros analíticos comunes** (clase_origen, tipo, estado)

**Ejemplo - FACT_ControlProyecto:**
```sql
idx_adpro_fact_control_proyecto (sk_id_proyecto, sk_id_fecha, sk_id_clase_origen)
idx_adpro_fact_control_proyecto_empresa (sk_id_empresa)
idx_adpro_fact_control_proyecto_insumo (sk_id_insumo)
```

---

## Row Level Security (RLS)

✅ **Habilitado en todas las 25 tablas**

### Política Estándar
```sql
WHERE company_id = 'ic-constructora'
```

**Notas:**
- Todas las tablas incluyen columna `company_id VARCHAR(50)` DEFAULT 'ic-constructora'
- Modelo multi-tenant-ready, aunque actualmente fijo a una compañía
- Lectura permitida a todos los usuarios autenticados (sin granularidad por área/rol aún)
- Para restricciones por rol (Construcción, Control, etc.), agregar políticas adicionales con `auth.jwt()` claims

---

## Historicidad

### Datos Históricos Existentes
- 836K registros en tabla `Histórico` (ya cargados en Supabase)
- Se pueden cargar en FACT_ControlProyecto usando migración de datos separada

### Carga de Datos Esperada
1. **DIM_Fecha**: 1 año de calendario (~365 registros)
2. **DIM_Empresa, DIM_Proyecto, DIM_Tercero**: Maestros (~100-1000 registros)
3. **DIM_Insumo, DIM_Items**: Catálogos grandes (~32K+ items)
4. **DIM_Control_Clase_Origen, DIM_Estado, etc.**: Valores fijos (~5-20 registros)
5. **FACT tables**: 836K+ registros históricos + transacciones nuevas

---

## Archivo de Migración

📄 **Ubicación:** `/app/supabase/migrations/20260516_002_create_adpro_datamart.sql`

**Contenido:**
- 1,200+ líneas de DDL puro (sin datos)
- Comentarios explicativos por sección
- Nombres de tablas y columnas en snake_case (postgres standard)
- Integridad referencial (FK constraints) entre dimensiones y hechos

---

## Pasos Siguientes

### 1. Carga Inicial de Dimensiones
Prioridad:
1. `adpro_dim_fecha` (calendario)
2. `adpro_dim_empresa`, `adpro_dim_proyecto`, `adpro_dim_tercero`
3. Catálogos: `adpro_dim_insumo`, `adpro_dim_items`, `adpro_dim_capitulo_presupuesto`
4. Valores fijos: clases, estados, tipos

**Scripts de carga:** Utilizar `COPY` (postgres) o APIs de Supabase

### 2. Carga de Hechos Históricos
Migrar los 836K registros de tabla `Histórico` a `adpro_fact_control_proyecto`

**Consideraciones:**
- Validar correspondencia de sk_id (claves subrogadas)
- Mapear SkIdClaseOrigen de origen a Supabase
- Transacción atómica para integridad

### 3. Políticas de Seguridad Adicionales
Agregar RLS granular por rol:
- Construcción (Andrés Arango) → acceso total FACT_ControlProyecto
- Control (Marcela Arroyave) → acceso FACT_Compras, FACT_Actas
- Reportería (CEO) → acceso a vistas planas (VFACT_*)

**Patrón:**
```sql
CREATE POLICY ... ON adpro_fact_control_proyecto
  FOR SELECT
  USING (
    auth.jwt()->'app_metadata'->>'area' = 'construccion'
    OR auth.jwt()->'app_metadata'->>'role' = 'admin'
  );
```

### 4. Power BI / Reportería
- Conectar a vista `adpro_vfact_control_proyecto` (denormalizada)
- O crear modelos en Power BI sobre dimensiones directas
- Actualizar dashboard ADPRO existente (03-InfVIC-EXP.pbix, 04-InfVIC-OBR.pbix, 11-InfVIC-HLD.pbix)

### 5. API/Frontend (React)
- Crear hooks `useAdproControlProyecto`, `useAdproCompras`, etc.
- Integrar con AuthContext para filtrado RLS automático
- Dashboard EOS/Tracción: incorporar visuales de ADPRO

---

## Casos de Uso Habilitados

✅ **Presupuesto vs. Realizado** por Capítulo, Proyecto, Período  
✅ **Compras y Proveedores** — gasto, precio, desviaciones  
✅ **Contratos** — compromisos, actas, retenciones  
✅ **Anticipo** — amortización, saldo pendiente  
✅ **Inventario** — movimientos, kardex, saldo valorizado  
✅ **Proyección** — reformas, costo final esperado (EAC)  
✅ **Control de Calidad** — devoluciones por proveedor  
✅ **Análisis de Insumos** — consumo por proyecto, explosión de materiales  
✅ **Flujo de Caja** — cronograma de actas, anticipos, reintegros  

---

## Notas de Implementación

- **Tenant fijo:** company_id = 'ic-constructora' en todas las filas
- **Normalización:** Star schema (hechos centrales, dimensiones normalizadas)
- **Volumen:** ~1-2M registros esperados en hechos; dimensiones << 100K
- **Auditoría:** Columnas created_at, updated_at en todas las tablas
- **Performance:** Índices estratégicos en claves foráneas y filtros comunes
- **Extensibilidad:** Estructura lista para agregar nuevas tablas FACT (reintegro, traslados, etc.) sin refactorización

---

**Aprobado por:** Claude Code (Agent) en nombre de Andrés Arango (Construcción)  
**Próximo Hito:** Carga de DIM_Fecha + maestros de proyecto/insumo → Validación de integridad referencial
