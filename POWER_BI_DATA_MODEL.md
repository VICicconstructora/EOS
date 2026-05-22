# Modelo de Datos: Power BI + ADPRO Supabase

**Versión:** 1.0  
**Fecha:** 16-05-2026  
**Propósito:** Especificar estructura de tablas, relaciones y medidas para Power BI  
**Responsable:** Andrés Arango (Construcción)  
**Audiencia:** Analistas de reportería, modeladores BI

---

## 1. Diagrama Relacional (Star Schema)

```
                    DIM_Fecha
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    FACT_Control    FACT_Compras  FACT_Actas
    Proyecto         │             │
         │             │             │
    DIM_Proyecto ◄─────┴─────────────┘
         │
    DIM_Empresa
         │
    DIM_CapituloPresupuesto
    DIM_ClaseOrigen
    DIM_Tercero (proveedor/contratista)
    DIM_Insumo
    DIM_Items
    DIM_TipoContrato
    DIM_EstadoPorDocumento
    DIM_Usuario
    
    Tabla Histórico (independiente)
    └─ Datos históricos de flujo de caja (películas mensuales)
```

---

## 2. Tablas Dimensión (DIM)

### 2.1 DIM_Fecha (Calendario)

**Propósito:** Análisis temporal (año, trimestre, mes, día)

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `sk_id_fecha` | INT | Clave subrogada (YYYYMMDD) | 20260516 |
| `fecha_calendario` | DATE | Fecha física | 2026-05-16 |
| `anio` | INT | Año | 2026 |
| `trimestre` | INT | Trimestre (1-4) | 2 |
| `mes` | INT | Mes (1-12) | 5 |
| `mes_nombre` | VARCHAR | Nombre mes | Mayo |
| `dia_semana` | INT | Día semana (1-7) | 5 |
| `dia_nombre` | VARCHAR | Nombre día | Viernes |
| `semana_anio` | INT | Semana del año | 20 |
| `es_feriado` | BOOLEAN | ¿Es feriado? | FALSE |
| `company_id` | VARCHAR | Tenant | ic-constructora |

**Registros esperados:** ~365-730 (1-2 años)  
**Clave primaria:** `sk_id_fecha`

**Filtros comunes en reportes:**
- Últimos 12 meses
- Año actual vs. año anterior
- Por trimestre/mes

---

### 2.2 DIM_Proyecto

**Propósito:** Catálogo de proyectos inmobiliarios

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `sk_id_proyecto` | INT | Clave subrogada | 1 |
| `codigo_proyecto` | VARCHAR(50) | Código único | `WELL` |
| `nombre_proyecto` | VARCHAR(255) | Nombre completo | Well Bogotá |
| `macroproyecto` | VARCHAR(100) | Agrupación | CBR (Conjunto Bosque Redondo) |
| `estado_proyecto` | VARCHAR(50) | Estado | Activo, Cerrado, Suspendido |
| `fecha_inicio` | DATE | Fecha inicio construcción | 2023-01-15 |
| `fecha_cierre_esperada` | DATE | Fecha cierre proyectada | 2026-12-31 |
| `sk_id_empresa` | INT | FK a DIM_Empresa | 1 |
| `ubicacion` | VARCHAR(255) | Dirección | Bogotá, Colombia |
| `gerente_proyecto` | VARCHAR(100) | Responsable | Andrés Arango |
| `presupuesto_total` | DECIMAL(18,2) | Presupuesto aprobado | 500000000.00 |
| `company_id` | VARCHAR(50) | Tenant | ic-constructora |
| `created_at` | TIMESTAMP | Fecha creación | 2025-01-01 10:00:00 |
| `updated_at` | TIMESTAMP | Última actualización | 2026-05-16 14:30:00 |

**Registros esperados:** ~20  
**Clave primaria:** `sk_id_proyecto`  
**Clave foránea:** `sk_id_empresa`

**Proyectos activos incluidos:**
- Bosque Central CBR
- Gaia CBR
- Praia Natura CBR
- Primera Este CBR
- Castilla Imperial CBR
- Castilla Living CBR
- La Hacienda Jamundí CBR
- Reserva de Oporto CBR
- Mitika Apartamentos
- Azul Celeste (E1, E2, E3)
- Azul Turquesa (E1, E2)
- Well
- Verde Vivo

---

### 2.3 DIM_Empresa

**Propósito:** Entidades legales, sucursales

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `sk_id_empresa` | SMALLINT | Clave subrogada | 1 |
| `codigo_empresa` | VARCHAR(50) | Código | `ICC` |
| `nombre_empresa` | VARCHAR(255) | Razón social | IC Constructora SAS |
| `nit` | VARCHAR(20) | NIT/RUC | 900246048-9 |
| `pais` | VARCHAR(50) | País | Colombia |
| `ciudad` | VARCHAR(100) | Ciudad | Bogotá |
| `tipo_entidad` | VARCHAR(50) | Tipo | Matriz, Sucursal |
| `es_activa` | BOOLEAN | ¿Activa? | TRUE |
| `company_id` | VARCHAR(50) | Tenant | ic-constructora |

**Registros esperados:** ~3-5  
**Clave primaria:** `sk_id_empresa`

---

### 2.4 DIM_CapituloPresupuesto

**Propósito:** Estructura presupuestal (conceptos de gasto)

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `sk_id_capitulo_presupuesto` | INT | Clave subrogada | 1 |
| `codigo_capitulo` | VARCHAR(50) | Código presupuestal | `01.01.01` |
| `nombre_capitulo` | VARCHAR(255) | Descripción | Mano de Obra Directa |
| `sk_id_proyecto` | INT | FK a DIM_Proyecto | 1 |
| `nivel_jerarquia` | INT | Nivel (1-5) | 1 |
| `capitulo_padre` | INT | FK capítulo padre | NULL |
| `porcentaje_asignado` | NUMERIC(5,2) | % del presupuesto | 35.50 |
| `company_id` | VARCHAR(50) | Tenant | ic-constructora |

**Registros esperados:** ~100-300 (por proyecto)  
**Clave primaria:** `sk_id_capitulo_presupuesto`  
**Clave foránea:** `sk_id_proyecto`

**Estructura típica:**
```
01.00 Costos Directos (100%)
  ├─ 01.01 Mano de Obra (35%)
  │   ├─ 01.01.01 MOD (Directa)
  │   ├─ 01.01.02 MO Indirecta
  │   └─ 01.01.03 Prestaciones
  ├─ 01.02 Materiales (40%)
  │   ├─ 01.02.01 Estructural
  │   ├─ 01.02.02 Acabados
  │   └─ 01.02.03 Instalaciones
  └─ 01.03 Equipos (15%)
      ├─ 01.03.01 Arrendamiento
      ├─ 01.03.02 Amortización
      └─ 01.03.03 Mantenimiento
02.00 Costos Indirectos
```

---

### 2.5 DIM_Tercero (Proveedores, Contratistas)

**Propósito:** Catálogo de partes relacionadas

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `sk_id_tercero` | INT | Clave subrogada | 100 |
| `codigo_tercero` | VARCHAR(50) | Código único | `PROV_001` |
| `nombre_tercero` | VARCHAR(255) | Razón social | Constructora XYZ SAS |
| `nit` | VARCHAR(20) | NIT/RUC | 860123456-7 |
| `tipo_tercero` | VARCHAR(50) | Tipo | Proveedor, Contratista, Cliente |
| `contacto_principal` | VARCHAR(100) | Contacto | Juan Pérez |
| `telefono` | VARCHAR(20) | Teléfono | +57 300 1234567 |
| `email` | VARCHAR(100) | Email | juan@xyzcons.com |
| `es_activo` | BOOLEAN | ¿Activo? | TRUE |
| `calificacion_provedor` | VARCHAR(50) | Calificación | A, B, C |
| `dias_credito` | INT | Días de crédito | 30 |
| `company_id` | VARCHAR(50) | Tenant | ic-constructora |

**Registros esperados:** ~500-1000  
**Clave primaria:** `sk_id_tercero`  
**Índice:** NIT (búsqueda rápida)

---

### 2.6 DIM_Insumo (Catálogo de Recursos)

**Propósito:** Materiales, mano de obra, equipos

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `sk_id_insumo` | INT | Clave subrogada | 5000 |
| `codigo_insumo` | VARCHAR(50) | Código único | `AC_1_4_20` |
| `descripcion_insumo` | VARCHAR(500) | Descripción larga | Acero de refuerzo fy=4200 kg/cm2 |
| `tipo_insumo` | VARCHAR(50) | Tipo | Material, MO, Equipo, Transporte |
| `unidad_medida` | VARCHAR(20) | Unidad | kg, m3, hora, día |
| `categoria` | VARCHAR(100) | Categoría | Acero, Concreto, Pintura |
| `valor_unitario_promedio` | DECIMAL(18,4) | Costo promedio | 2500.00 |
| `proveedor_preferido` | INT | FK a DIM_Tercero | 100 |
| `es_activo` | BOOLEAN | ¿En uso? | TRUE |
| `company_id` | VARCHAR(50) | Tenant | ic-constructora |

**Registros esperados:** ~5000-10000  
**Clave primaria:** `sk_id_insumo`  
**Clave foránea:** `proveedor_preferido`

---

### 2.7 DIM_Items (Ítems/Actividades Presupuestales)

**Propósito:** Desglose detallado del presupuesto (32K+ registros)

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `sk_id_item` | INT | Clave subrogada | 10000 |
| `codigo_item` | VARCHAR(50) | Código item | `01.01.01.001` |
| `descripcion_item` | VARCHAR(500) | Descripción | Excavación manual, profundidad >2m |
| `sk_id_proyecto` | INT | FK a DIM_Proyecto | 1 |
| `sk_id_capitulo` | INT | FK a DIM_CapituloPresupuesto | 1 |
| `sk_id_insumo` | INT | FK a DIM_Insumo | 5000 |
| `cantidad_presupuestada` | NUMERIC(18,4) | Cantidad budgetada | 1500.00 |
| `unidad_medida` | VARCHAR(20) | Unidad | m3 |
| `valor_unitario_presupuesto` | DECIMAL(18,2) | Precio unitario | 150000.00 |
| `valor_total_presupuesto` | DECIMAL(18,2) | Total item | 225000000.00 |
| `porcentaje_avance_fisico` | NUMERIC(5,2) | % avance | 75.50 |
| `company_id` | VARCHAR(50) | Tenant | ic-constructora |

**Registros esperados:** ~32000  
**Clave primaria:** `sk_id_item`  
**Claves foráneas:** `sk_id_proyecto`, `sk_id_capitulo`, `sk_id_insumo`

---

## 3. Tablas de Hechos (FACT)

### 3.1 FACT_ControlProyecto (Principal)

**Propósito:** Presupuesto vs. realizado, ciclo de costo por fecha

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `sk_id_fact_control` | BIGINT | Clave única | 1 |
| `sk_id_proyecto` | INT | FK a DIM_Proyecto | 1 |
| `sk_id_fecha` | INT | FK a DIM_Fecha (YYYYMMDD) | 20260516 |
| `sk_id_capitulo_presupuesto` | INT | FK a DIM_CapituloPresupuesto | 1 |
| `sk_id_insumo` | INT | FK a DIM_Insumo | 5000 |
| `sk_id_empresa` | SMALLINT | FK a DIM_Empresa | 1 |
| `sk_id_clase_origen` | SMALLINT | FK a DIM_ClaseOrigen | 1 |
| `valor_total_presupuesto` | DECIMAL(18,2) | Presupuesto (con IVA) | 500000.00 |
| `valor_total_invertido` | DECIMAL(18,2) | Realizado (con IVA) | 450000.00 |
| `valor_total_disponible` | DECIMAL(18,2) | Saldo presupuestal | 50000.00 |
| `desviacion_valor` | DECIMAL(18,2) | Varianza | -50000.00 |
| `desviacion_porcentaje` | NUMERIC(5,2) | % desviación | -10.00 |
| `cantidad_presupuestada` | NUMERIC(18,4) | Cant. budgetada | 100.00 |
| `cantidad_invertida` | NUMERIC(18,4) | Cant. realizada | 85.00 |
| `porcentaje_avance_fisico` | NUMERIC(5,2) | % avance | 85.00 |
| `es_presupuesto_base` | BOOLEAN | ¿Es presupuesto original? | TRUE |
| `es_proyeccion` | BOOLEAN | ¿Es proyección? | FALSE |
| `es_reforma` | BOOLEAN | ¿Incluye reforma? | FALSE |
| `company_id` | VARCHAR(50) | Tenant | ic-constructora |
| `created_at` | TIMESTAMP | Fecha creación | 2026-05-16 10:00:00 |
| `updated_at` | TIMESTAMP | Última actualización | 2026-05-16 14:30:00 |

**Registros esperados:** ~100K-500K  
**Clave primaria:** `sk_id_fact_control`  
**Claves foráneas:** `sk_id_proyecto`, `sk_id_fecha`, `sk_id_capitulo_presupuesto`, etc.

**Medidas recomendadas:**
```
SUM(valor_total_presupuesto) → Presupuesto Total
SUM(valor_total_invertido) → Costo Real
SUM(valor_total_disponible) → Saldo
AVERAGE(porcentaje_avance_fisico) → % Avance Promedio
SUM(desviacion_valor) → Varianza Total
```

---

### 3.2 FACT_Compras

**Propósito:** Órdenes de compra a proveedores

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `sk_id_fact_compras` | BIGINT | Clave única | 1 |
| `codigo_oc` | VARCHAR(50) | Código OC | `OC-2026-00001` |
| `sk_id_proyecto` | INT | FK a DIM_Proyecto | 1 |
| `sk_id_tercero` | INT | FK a DIM_Tercero (proveedor) | 100 |
| `sk_id_insumo` | INT | FK a DIM_Insumo | 5000 |
| `sk_id_fecha` | INT | FK a DIM_Fecha (fecha OC) | 20260516 |
| `cantidad` | NUMERIC(18,4) | Cantidad ordenada | 1000.00 |
| `unidad_medida` | VARCHAR(20) | Unidad | kg |
| `valor_unitario` | DECIMAL(18,2) | Precio unitario | 2500.00 |
| `valor_total_neto` | DECIMAL(18,2) | Total sin IVA | 2500000.00 |
| `porcentaje_iva` | NUMERIC(5,2) | % IVA | 19.00 |
| `valor_iva` | DECIMAL(18,2) | Monto IVA | 475000.00 |
| `valor_total_con_iva` | DECIMAL(18,2) | Total con IVA | 2975000.00 |
| `estado_oc` | VARCHAR(50) | Estado | Abierta, Parcial, Cerrada, Anulada |
| `descuento_aplicado` | DECIMAL(18,2) | Descuento | 0.00 |
| `es_presupuestada` | BOOLEAN | ¿Estaba presupuestada? | TRUE |
| `company_id` | VARCHAR(50) | Tenant | ic-constructora |
| `created_at` | TIMESTAMP | Fecha creación | 2026-05-16 10:00:00 |

**Registros esperados:** ~50K-100K  
**Clave primaria:** `sk_id_fact_compras`  
**Claves foráneas:** `sk_id_proyecto`, `sk_id_tercero`, `sk_id_insumo`, `sk_id_fecha`

---

### 3.3 FACT_Actas

**Propósito:** Actas de cobro de contratistas (retenciones, anticipos)

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `sk_id_fact_actas` | BIGINT | Clave única | 1 |
| `codigo_acta` | VARCHAR(50) | Código acta | `ACT-2026-00001` |
| `sk_id_proyecto` | INT | FK a DIM_Proyecto | 1 |
| `sk_id_tercero` | INT | FK a DIM_Tercero (contratista) | 200 |
| `sk_id_fecha` | INT | FK a DIM_Fecha (fecha acta) | 20260516 |
| `fecha_radicado` | DATE | Fecha radicado | 2026-05-16 |
| `periodo_inicio` | DATE | Período inicio | 2026-05-01 |
| `periodo_fin` | DATE | Período fin | 2026-05-31 |
| `valor_total_acta` | DECIMAL(18,2) | Total acta | 5000000.00 |
| `valor_anticipos` | DECIMAL(18,2) | Anticipos a descontar | 1000000.00 |
| `porcentaje_retencion` | NUMERIC(5,2) | % retención | 2.50 |
| `valor_retencion` | DECIMAL(18,2) | Monto retención | 125000.00 |
| `valor_neto_a_pagar` | DECIMAL(18,2) | Neto cobrable | 3875000.00 |
| `estado_acta` | VARCHAR(50) | Estado | Enviada, Aprobada, Pagada, Rechazada |
| `numero_pago` | VARCHAR(50) | Número de pago | `CHQ-2026-005` |
| `es_adicional` | BOOLEAN | ¿Es adicional? | FALSE |
| `company_id` | VARCHAR(50) | Tenant | ic-constructora |
| `created_at` | TIMESTAMP | Fecha creación | 2026-05-16 10:00:00 |

**Registros esperados:** ~30K-50K  
**Clave primaria:** `sk_id_fact_actas`

---

## 4. Tabla Histórico (Datos de Flujo de Caja)

**Propósito:** Películas mensuales históricas de proyectos (836K registros)

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `id` | BIGINT | Clave única | 1 |
| `proyecto` | VARCHAR(255) | Nombre proyecto | WELL |
| `fecha_datos` | TIMESTAMP | Fecha película (snapshot) | 2026-04-30 |
| `fuente` | VARCHAR(100) | Origen | Proyectos |
| `pg` | VARCHAR(100) | Línea P&G | 1.0 Ingresos |
| `total` | DECIMAL(18,2) | Total línea | 500000000.00 |
| `fecha` | TIMESTAMP | Fecha referencia mes | 2026-04-01 |
| `valor` | DECIMAL(18,2) | Valor concepto | 100000000.00 |
| `company_id` | VARCHAR(50) | Tenant | ic-constructora |

**Registros:** 836K  
**Clave primaria:** `id`

**Líneas P&G típicas:**
- `1.0 Ingresos` — flujo de clientes
- `16.0 FCL` — flujo de caja libre
- `16.1 FCL ACUMULADO` — acumulado

---

## 5. Relaciones en Power BI

### Configuración Automática (Recomendado)

Power BI detecta automáticamente:

```
FACT_ControlProyecto → DIM_Proyecto (sk_id_proyecto)
FACT_ControlProyecto → DIM_Fecha (sk_id_fecha)
FACT_ControlProyecto → DIM_CapituloPresupuesto (sk_id_capitulo_presupuesto)
FACT_ControlProyecto → DIM_Insumo (sk_id_insumo)
FACT_Compras → DIM_Proyecto (sk_id_proyecto)
FACT_Compras → DIM_Tercero (sk_id_tercero)
FACT_Compras → DIM_Insumo (sk_id_insumo)
FACT_Actas → DIM_Proyecto (sk_id_proyecto)
FACT_Actas → DIM_Tercero (sk_id_tercero)
```

### Cardinality (Multiplicidad)

| Relación | Tipo | Filtro Cruzado |
|----------|------|-----------------|
| FACT → DIM | Many-to-One | Bidireccional (recommended) |
| DIM → DIM | One-to-Many | Unidireccional |

---

## 6. Medidas Clave (DAX)

### 6.1 Control Presupuestario

```dax
// Total Presupuesto
Presupuesto Total = SUM(FACT_ControlProyecto[valor_total_presupuesto])

// Total Realizado
Costo Real = SUM(FACT_ControlProyecto[valor_total_invertido])

// Saldo Presupuestal
Saldo = [Presupuesto Total] - [Costo Real]

// Varianza %
Varianza % = IF([Presupuesto Total] = 0, 0, 
               DIVIDE([Costo Real] - [Presupuesto Total], [Presupuesto Total]) * 100)

// Promedio Avance Físico
Avance Físico Promedio = AVERAGE(FACT_ControlProyecto[porcentaje_avance_fisico])

// Estado de Desviación
Estado = IF([Varianza %] > 5, "ALERTA", IF([Varianza %] > 2, "CUIDADO", "OK"))
```

### 6.2 Compras

```dax
// Total Compras
Total Compras = SUM(FACT_Compras[valor_total_con_iva])

// Compras por Proveedor
Compras por Proveedor = SUMMARIZECOLUMNS(
    DIM_Tercero[nombre_tercero],
    "Total", SUM(FACT_Compras[valor_total_con_iva])
)

// Compras No Presupuestadas
Compras No Presupuestadas = CALCULATE(
    SUM(FACT_Compras[valor_total_con_iva]),
    FACT_Compras[es_presupuestada] = FALSE
)
```

### 6.3 Actas y Flujo de Caja

```dax
// Total Actas Emitidas
Total Actas = SUM(FACT_Actas[valor_total_acta])

// Actas Pagadas
Actas Pagadas = CALCULATE(
    SUM(FACT_Actas[valor_neto_a_pagar]),
    FACT_Actas[estado_acta] = "Pagada"
)

// Retenciones Pendientes
Retenciones Pendientes = CALCULATE(
    SUM(FACT_Actas[valor_retencion]),
    FACT_Actas[estado_acta] <> "Pagada"
)
```

---

## 7. Transformaciones Power Query

### 7.1 Limpieza de DIM_Fecha

```m
= Table.AddColumn(#"Previous", "Año", each Date.Year([fecha_calendario]))
= Table.AddColumn(#"Previous", "Mes", each Date.Month([fecha_calendario]))
= Table.AddColumn(#"Previous", "Trimestre", each Roundup(Date.Month([fecha_calendario])/3, 0))
= Table.AddColumn(#"Previous", "sk_id_fecha", each 
    Number.From(Date.ToText([fecha_calendario], "YYYYMMDD")))
```

### 7.2 Crear Jerarquía Temporal

```m
= Table.AddColumn(#"Previous", "Año_Mes", each 
    Date.ToText([fecha_calendario], "YYYY-MM"))
= Table.AddColumn(#"Previous", "Trimestre_Año", each 
    Date.ToText([fecha_calendario], "YYYY") & "-Q" & 
    Text.From(Roundup(Date.Month([fecha_calendario])/3, 0)))
```

### 7.3 Validación de FK (FACT_ControlProyecto)

```m
// Verificar que no hay sk_id_proyecto = 0 o NULL
= Table.SelectRows(#"Previous", each [sk_id_proyecto] <> null 
    and [sk_id_proyecto] <> 0)
```

---

## 8. Optimizaciones de Performance

### 8.1 Índices en Supabase (DDL)

```sql
-- Ya creados en schema ADPRO
CREATE INDEX idx_fact_control_proyecto 
  ON adpro_fact_control_proyecto(sk_id_proyecto, sk_id_fecha, sk_id_clase_origen);

CREATE INDEX idx_fact_compras_proyecto 
  ON adpro_fact_compras(sk_id_proyecto, sk_id_tercero);
```

### 8.2 Agregaciones en Power BI

Para tablas con 500K+ registros (Histórico):
- Usar **Aggregations** en Power BI (Premium feature)
- O crear tabla resumida: `historico_monthly_summary`

### 8.3 Reducir Granularidad

En lugar de cargar **Histórico** completo:
1. Crear vista en Supabase: `kpi_project_monthly_summary`
2. Cargar solo últimos 24 meses
3. Usar filtro `WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '24 months')`

---

## 9. Diccionario de Campos Clave

| Campo | Tabla | Definición de Negocio | Ejemplos Válidos |
|-------|-------|----------------------|------------------|
| `valor_total_presupuesto` | FACT_ControlProyecto | Presupuesto aprobado (incluye IVA) | > 0 |
| `valor_total_invertido` | FACT_ControlProyecto | Costo real incurrido (incluye IVA) | > 0 |
| `desviacion_valor` | FACT_ControlProyecto | = Invertido - Presupuesto | puede ser negativo |
| `porcentaje_avance_fisico` | FACT_ControlProyecto | % de obra ejecutada | 0-100 |
| `valor_total_con_iva` | FACT_Compras | Total OC con IVA incluido | > 0 |
| `estado_acta` | FACT_Actas | Ciclo de vida: Enviada → Pagada | "Enviada", "Pagada" |
| `valor_neto_a_pagar` | FACT_Actas | Valor cobrable (acta - anticipos - retenciones) | > 0 |

---

## 10. Checklist de Validación

- [ ] Todas las FK en FACT apuntan a registros válidos en DIM
- [ ] No hay NULL masivos en columnas clave (sk_id_proyecto, valor_*)
- [ ] Sumas: Presupuesto > 0, Realizado > 0, Saldo = Presupuesto - Realizado
- [ ] Histórico: 836K registros cargados
- [ ] Relaciones Power BI: sin errores de cardinalidad
- [ ] Medidas DAX: calculadas sin error
- [ ] Performance: refresh < 60 segundos para todos excepto Histórico

---

**Documento Preparado Por:** Claude Code  
**Para:** Andrés Arango (Construcción) — IC Constructora  
**Próximo Paso:** Crear reportes (Control Presupuesto, Flujo de Caja)
