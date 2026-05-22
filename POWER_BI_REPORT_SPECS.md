# Especificación de Reportes: Power BI ADPRO IC Constructora

**Versión:** 1.0  
**Fecha:** 16-05-2026  
**Propósito:** Describir 3 reportes principales (sin crear aún, solo diseño)  
**Responsable:** Andrés Arango (Construcción)  
**Audiencia:** Analistas de reportería, stakeholders

---

## 1. Reporte 1: Control de Presupuesto

### 1.1 Propósito

Visualizar presupuesto vs. realizado por proyecto y capítulo presupuestario, identificar varianzas y alertar sobre desviaciones.

**Casos de uso:**
- Revisión mensual de desempeño financiero por proyecto
- Análisis de varianzas (presupuesto vs real)
- Identificación de caídas de proyectos
- Validación de compras contra presupuesto

**Audiencia:**
- Andrés Arango (Gerente de Construcción)
- Marcela Arroyave (Control)
- CEO (Juan Paulo)

---

### 1.2 Estructura (5-7 hojas)

#### Hoja 1: Dashboard Ejecutivo

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ CONTROL DE PRESUPUESTO - IC CONSTRUCTORA                   │
│ Mes: [Mayo 2026]  |  Fecha Corte: [16/05/2026]             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [KPI Card: Presupuesto Total]  [KPI: Costo Real]         │
│  $2.500M                          $1.850M                   │
│                                                              │
│  [KPI Card: Saldo]               [KPI: % Varianza]        │
│  $650M (26%)                      -26.0%                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    ESTADO POR PROYECTO                       │
│  (Tabla: Proyecto | Presupuesto | Real | Saldo | % Var)   │
│                                                              │
│  Bosque Central CBR    500M       420M   80M    -16%        │
│  Gaia CBR             450M       350M  100M    -22%        │
│  Praia Natura CBR     400M       300M  100M    -25%        │
│  ...                                                         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  [Gráfico: Línea temporal Presupuesto vs Real (últimos 6m)] │
│                                                              │
│         Presupuesto Acumulado ──────────  Real Acumulado ──│
│         /$                                                   │
│    2.5B ┤                                                    │
│    2.0B ┤            ╱╱╱╱                                   │
│    1.5B ┤      ╱╱╱╱╱╱╱╱╱                                   │
│    1.0B ┤╱╱╱╱╱╱╱                                            │
│    0.5B ┤╱                                                   │
│       0 └─────────────────────────────────────────          │
│         Nov  Dec  Jan  Feb  Mar  Apr  May                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Elementos:**

| Elemento | Tipo | Origen | Actualización |
|----------|------|--------|--------------|
| Período (Mes/Año) | Slicer | Manual | Diaria |
| Presupuesto Total | Card | SUM(FACT_ControlProyecto.valor_presupuesto) | Automática |
| Costo Real | Card | SUM(FACT_ControlProyecto.valor_invertido) | Automática |
| Saldo | Card | [Presupuesto] - [Costo Real] | DAX |
| % Varianza | Card | ([Costo Real] - [Presupuesto]) / [Presupuesto] | DAX |
| Tabla Estado | Table | Proyecto, Presupuesto, Real, Saldo, % Var | Automática |
| Línea Temporal | Line Chart | Fecha vs Presupuesto/Real | Automática |

**Filtros:**
- Proyecto (multi-select)
- Empresa (IC Constructora única)
- Período (últimos 12 meses)

**Drill-down:** Haz clic en proyecto → Hoja 2 (Desglose por Capítulo)

---

#### Hoja 2: Desglose por Capítulo

**Propósito:** Análisis granular de varianzas por capítulo presupuestario

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│ CONTROL POR CAPÍTULO - [Proyecto Seleccionado]          │
│ Filtro: Proyecto = Bosque Central CBR                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  [Tabla Jerárquica: Capítulos]                           │
│                                                           │
│  Capítulo          Presup.    Real    Saldo   %Var  Alerta
│  ─────────────────────────────────────────────────────   │
│  01.00 Costos Directos                                   │
│    01.01 MOD           150M    140M     10M   -6.7%  OK  │
│    01.02 Materiales    200M    185M     15M   -7.5%  OK  │
│    01.03 Equipos        50M     45M      5M   -10%   !   │
│  02.00 Costos Indirectos                                 │
│    02.01 Administrativos 100M    50M     50M   -50%  !!  │
│    ...                                                    │
│                                                           │
│  [Gráfico: Barras horizontales Presupuesto vs Real]     │
│                                                           │
│     Costos Directos ████████│████   (85%)                │
│     MOD              ████│████      (93%)                │
│     Materiales       █████│████    (92%)                │
│     Equipos          ████│███      (90%)                │
│     Costos Indir.    ██████│       (50%)  ← ALERTA      │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Elementos:**

| Elemento | Tipo | Origen | Objetivo |
|----------|------|--------|----------|
| Capítulo Presupuestario | Table (jerárquica) | DIM_CapituloPresupuesto | Expandible |
| Presupuesto | SUM | FACT_ControlProyecto | Por capítulo |
| Real | SUM | FACT_ControlProyecto | Por capítulo |
| Saldo | Calculated | [Presupuesto] - [Real] | Varianza |
| % Varianza | Calculated | Porcentaje desviación | Condicionado |
| Indicador Alerta | Conditional | IF(%Var > 10%, "!!", IF(%Var > 5%, "!", "OK")) | Visual |
| Gráfico Barras | Bar Chart | Capítulo vs Presupuesto/Real | Comparación |

**Drill-through:** Haz clic en capítulo → Hoja 3 (Ítems detallados)

---

#### Hoja 3: Ítems Presupuestales

**Propósito:** Máxima granularidad — cada ítem del presupuesto

**Elementos:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Código Ítem | Text | 01.01.01.001 |
| Descripción | Text | Excavación manual, profundidad >2m |
| Capítulo | Text | 01.01 MOD |
| Cantidad Presup. | Numeric | 1500.00 |
| Unidad | Text | m3 |
| Precio Unitario | Currency | 150,000 |
| Presupuesto Total | Currency | 225,000,000 |
| Cantidad Real | Numeric | 1200.00 |
| Precio Unitario Real | Currency | 152,000 |
| Real Total | Currency | 182,400,000 |
| Saldo | Currency | 42,600,000 |
| % Avance Físico | Percentage | 80% |

**Filtros:**
- Capítulo (cascada desde Hoja 2)
- Proyecto (cascada desde Hoja 1)
- Estado (Presupuestado, No Presupuestado, Reforma)

**Sorting:** Saldo descendente (ítems con mayor desviación primero)

---

#### Hoja 4: Comparativo Período a Período

**Propósito:** Tendencia: ¿está mejorando o empeorando?

**Layout:**

```
PRESUPUESTO vs REAL - ÚLTIMOS 12 MESES

Proyecto: Bosque Central CBR

Mes       Presupuesto  Real     Saldo   % Var   Trend
─────────────────────────────────────────────────────
May 2026    500M       420M      80M    -16%    ↘
Apr 2026    480M       400M      80M    -17%    ↘
Mar 2026    460M       370M      90M    -20%    ↘
Feb 2026    440M       320M     120M    -27%    ↗
Jan 2026    420M       280M     140M    -33%    ↗
...
```

**Gráfico:** Línea con puntos (Presupuesto, Real, Saldo) — permite ver convergencia/divergencia

---

#### Hoja 5: Matriz de Proyectos

**Propósito:** Vista de todas las intersecciones proyecto × capítulo (requiere agrupación)

**Tipo:** Tabla de matriz (Row: Proyecto, Column: Capítulo, Value: % Varianza)

```
Capítulo         01.01 MOD  01.02 Mat  01.03 Eq  02.01 Admin
──────────────────────────────────────────────────────────
Bosque Central   -6%        -8%        -10%      -50%  ⚠
Gaia             -5%        -7%        -9%       -25%
Praia Natura     -4%        -6%        -8%       -15%
...
```

**Color:** Condicionado (verde → rojo según % varianza)

**Drill-down:** Haz clic en celda → Hoja 3 (ítems específicos)

---

#### Hoja 6: Análisis ABC (Pareto)

**Propósito:** ¿Cuáles ítems representen el 80% del gasto?

**Layout:**

```
ANÁLISIS ABC - ÍTEMS POR IMPORTANCIA

Rango    Descripción                        Valor     % Total  % Acum
─────────────────────────────────────────────────────────────────────
A        Excavación                        150M      6.0%     6.0%
A        Estructura (acero)                120M      4.8%     10.8%
A        Concreto premezclado             110M      4.4%     15.2%
...
A        [Top 50 ítems]                  2.000M     80%      80%   ← A
B        [Ítems 51-200]                    400M     16%      96%   ← B
C        [Ítems 201-1500]                  100M      4%     100%   ← C
```

**Gráfico:** 80-20 (Pareto) — identifica dónde enfocar control

---

#### Hoja 7: Notas y Comentarios

**Propósito:** Análisis cualitativo

**Elementos:**
- Causas principales de desviaciones
- Acciones correctivas en curso
- Proyecciones (si hay reforma presupuestaria)
- Contacto responsable por proyecto

**Tipo:** Tabla con campos:
- Proyecto
- Capítulo/Ítem
- Desviación Detectada
- Causa
- Acción
- Responsable
- Fecha Esperada Cierre

---

### 1.3 Refresh y Distribución

**Frecuencia:** Diaria (4 AM)  
**Tiempo estimado:** 20-30 segundos (datos FACT_ControlProyecto)  
**Distribución:** Power BI Service (link en Teams) o exportar a Excel

---

## 2. Reporte 2: Flujo de Caja

### 2.1 Propósito

Analizar flujos de efectivo históricos y proyecciones futuras (24 meses) por proyecto usando tabla Histórico + KPI proyecciones.

**Casos de uso:**
- Proyección de liquidez (CFO)
- Identificación de periodos críticos de caja
- Análisis de fuentes y usos
- Forecast vs. actual por proyecto

**Audiencia:**
- Juan José Leal (Financiero)
- Juan Paulo (CEO)
- Andrés Arango (Construcción)

---

### 2.2 Estructura (4-5 hojas)

#### Hoja 1: Dashboard Ejecutivo - Flujo de Caja Consolidado

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ FLUJO DE CAJA - IC CONSTRUCTORA                     │
│ Proyección: 24 meses (Actual + Forecast)            │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [KPI: Saldo Inicial]    [KPI: Saldo Final]        │
│  $500M                   $850M                      │
│                                                      │
│  [KPI: Ingreso Total]    [KPI: Egreso Total]       │
│  $1.500M                 $1.150M                    │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Gráfico Waterfall: FCL por mes]                  │
│                                                      │
│   Saldo Inicial     Ingresos   Egresos  Saldo Final│
│   500M              1.500M    -1.150M    850M      │
│   ├────────────────────────────────────────┤      │
│   │                                         │      │
│   ░                 ░░░░░░░░░░░░░░░░░░░░░░ │      │
│                         ─────────────────── │      │
│                                  ███░░░░░  │      │
│                                  └────────→ 850M  │
│                                                      │
├─────────────────────────────────────────────────────┤
│                    ÚLTIMOS 12 MESES (REAL)          │
│                                                      │
│  Mes     Ingresos    Egresos    FCL Neto Saldo    │
│  May 26  250M        200M       50M      850M     │
│  Apr 26  240M        190M       50M      800M     │
│  Mar 26  230M        185M       45M      750M     │
│  ...                                               │
│                                                      │
├─────────────────────────────────────────────────────┤
│                  PRÓXIMOS 12 MESES (PROYECCIÓN)     │
│  (con intervalo de confianza: -10% a +10%)         │
│                                                      │
│  Mes     Ingresos    Egresos    FCL Neto Saldo    │
│  Jun 26  260M        210M       50M      900M     │
│  Jul 26  270M        215M       55M      955M     │
│  ...                                               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Elementos:**

| Elemento | Tipo | Origen | Descripción |
|----------|------|--------|-------------|
| Saldo Inicial | KPI Card | Histórico (primer mes) | Caja inicial |
| Saldo Final | KPI Card | Histórico (último mes) + Forecast | Caja proyectada |
| Ingreso Total | KPI Card | SUM(Histórico.valor) WHERE pg LIKE '1.0%' | Flujo cliente |
| Egreso Total | KPI Card | SUM(FACT_Compras, FACT_Actas) | Flujo proveedores |
| Gráfico Waterfall | Waterfall | Saldo + Ingresos - Egresos | Cascada FCL |
| Tabla Histórico Real | Table | Histórico (últimos 12 meses) | Series real |
| Tabla Proyección | Table | KPI + forecast | Series futura |

**Filtros:**
- Proyecto (multi)
- Período (mes/año)
- Ver: Real, Proyección o Ambas

---

#### Hoja 2: Flujo por Proyecto

**Propósito:** Desglose individual de FCL por proyecto

**Tipo:** Matriz 2D
- Filas: Proyecto
- Columnas: Mes (últimos 24)
- Valor: FCL neto

**Ejemplo:**

```
Proyecto          Jun 26  Jul 26  Ago 26  ... May 27
────────────────────────────────────────────────────
Bosque Central     50M     55M     60M    ...  45M
Gaia               40M     42M     45M    ...  38M
Praia Natura       35M     38M     40M    ...  32M
...
─────────────────────────────────────────────────
TOTAL            125M    135M    145M    ... 115M
```

**Formato condicional:** Rojo si FCL < 0 (cash burn)

---

#### Hoja 3: Análisis de Fuentes y Usos

**Propósito:** ¿De dónde viene el dinero? ¿A dónde va?

**Layout:**

```
FUENTES Y USOS DE EFECTIVO

FUENTES (Ingresos)                    USOS (Egresos)
────────────────────────────          ───────────────
Ingresos Cliente      1.500M (75%)     Compras Mater. 650M (57%)
Venta de Terrenos       300M (15%)     Contratistas   300M (26%)
Otros                   200M (10%)     Gastos Admin.  200M (17%)
────────────────────────────          ───────────────
TOTAL FUENTES         2.000M           TOTAL USOS     1.150M
                                      
Diferencia (Exceso de Caja):            850M
```

**Gráficos:**
- Pie de Fuentes (% por tipo)
- Pie de Usos (% por tipo)

---

#### Hoja 4: Alertas de Liquidez

**Propósito:** Identificar meses críticos (bajo saldo, alto burn)

**Tabla:**

```
Mes        Saldo    Límite  Estado    Acción Recomendada
           Prev.    Mín.
────────────────────────────────────────────────────────
Oct 26     120M     150M    ⚠ BAJO    Acelerar ingresos
Nov 26      85M     150M    🔴 CRÍTICO Inyección capital
Dic 26     200M     150M    ✓ OK      Seguimiento
...
```

**Filtro:** Mostrar solo alertas (dropdown: Todas, Crítico, Bajo, OK)

---

#### Hoja 5: Sensibilidad de Escenarios

**Propósito:** ¿Qué pasa si...?

**Elementos:**
- Slider: % variación ingresos (-20% a +20%)
- Slider: % variación egresos (-10% a +10%)
- Impacto en saldo final

**Tabla dinámica:**

```
ESCENARIO 1: Base (sin cambios)
Saldo Final: 850M, Período Crítico: Oct

ESCENARIO 2: Ingresos -10% | Egresos +5%
Saldo Final: 750M, Período Crítico: Sep-Oct-Nov

ESCENARIO 3: Ingresos +10% | Egresos -5%
Saldo Final: 950M, Período Crítico: Ninguno
```

---

### 2.3 Refresh y Distribución

**Frecuencia:** Mensual (primer día del mes, 6 AM)  
**Tiempo estimado:** 60-90 segundos (836K registros Histórico)  
**Distribución:** Power BI Service + Excel export para reunión financiera

---

## 3. Reporte 3: Compras y Actas

### 3.1 Propósito

Monitoreo de órdenes de compra y actas de cobro (ciclo proveedor). Identificar atrasos, rechazos, retenciones pendientes.

**Casos de uso:**
- Validación de OC contra presupuesto
- Seguimiento de estado de actas (Enviada → Pagada)
- Control de retenciones IVA, desviaciones
- Análisis de proveedores (frecuencia, montos, plazo)

**Audiencia:**
- Marcela Arroyave (Control)
- Nataly Vinchira (Jurídico)
- Tesorería (para pagos)

---

### 3.2 Estructura (3-4 hojas)

#### Hoja 1: Dashboard Compras

**Elementos:**

```
COMPRAS - ESTADO Y CONTROL

[KPI: OC Activas]     [KPI: OC Cerradas]    [KPI: No Presup]
 125                    85                    15

[KPI: Monto OC Activas] [KPI: Presupuesto]  [KPI: % Gasto]
 $450M                   $500M               90%

[Tabla: OC por Estado]
Estado           Cantidad  Monto Total  % Avance
─────────────────────────────────────────────
Abierta           50       250M         0%
Parcial           60       180M         65%
Cerrada           85       420M        100%
Anulada            5        20M          -
────────────────────────────────────────────
TOTAL            200       870M         87%

[Gráfico: Línea OC acumuladas vs límite presupuestario]
```

---

#### Hoja 2: Detalle de Órdenes de Compra

**Tabla principal:**

| Código OC | Proveedor | Proyecto | Insumo | Cant. | Unidad | Val. Unit | Total Neto | IVA | Total c/IVA | Estado | Fecha | Días |
|-----------|-----------|----------|--------|-------|--------|-----------|-----------|-----|------------|--------|-------|------|
| OC-26-001 | PROV_001  | Bosque Central | Acero 1/2" | 10.000 | kg | 2.500 | 25M | 4.75M | 29.75M | Parcial | 01/04 | 45 |
| OC-26-002 | PROV_002  | Gaia | Concreto 210 | 500 | m3 | 300.000 | 150M | 28.5M | 178.5M | Abierta | 15/04 | 31 |

**Filtros:**
- Proyecto
- Proveedor
- Estado (Abierta, Parcial, Cerrada, Anulada)
- Rango de fechas

**Columnas adicionales:**
- Desviación (Real vs Presupuesto)
- % Recepción (cantidad recibida / cantidad pedida)
- Días en proceso

---

#### Hoja 3: Seguimiento de Actas y Pagos

**Propósito:** Ciclo de cobro de contratistas

**Tabla:**

| Código Acta | Contratista | Período | Valor Acta | Anticipos | Retención | Neto Pagar | Estado | Fecha Envío | Fecha Pago | Días |
|-------------|-------------|---------|-----------|-----------|-----------|-----------|--------|-----------|-----------|------|
| ACT-26-001  | CONT_001    | May 01-31 | 5M       | 1M        | 125K      | 3.875M    | Pagada | 05/06 | 12/06 | 7 |
| ACT-26-002  | CONT_002    | May 01-31 | 3.5M     | 500K      | 87.5K     | 2.9125M   | Aprobada | 07/06 | Pendiente | 9 |

**Columnas de control:**
- Retención en 10% (validar)
- Anticipos descontados (validar)
- Neto calculado (validar)
- SLA de pago (días hasta límite contractual)

**Colores:**
- 🟢 Pagada
- 🟡 Aprobada (pendiente pago)
- 🔴 Rechazada / Observada

---

#### Hoja 4: Análisis de Proveedores

**Propósito:** Performance de proveedores

**Tabla:**

```
Proveedor          Compras  Monto Total  Plazo Prom  Calif  OC Rechazadas
────────────────────────────────────────────────────────────────────
PROV_001          20       450M         3 días     A      0
PROV_002          15       320M         5 días     B      2
PROV_003          10       180M         7 días     B      1
PROV_004          8        150M        14 días     C      4 ← ALERTA

[Gráfico: Comparativa Monto vs Calificación]
[Gráfico: Evolución de plazo de pago]
```

---

### 3.3 Refresh y Distribución

**Frecuencia:** 2x diaria (4 AM, 2 PM)  
**Tiempo estimado:** 15-20 segundos  
**Distribución:** Power BI Service (link Teams) + alertas automáticas (si OC vence SLA)

---

## 4. Matriz de Resumen (Tres Reportes)

| Reporte | Frecuencia | Tiempo Refresh | Tablas | Audiencia | Acción Clave |
|---------|-----------|--------|--------|-----------|-------------|
| **Control Presupuesto** | Diario | 20-30s | FACT_CP, DIM_* | Andrés, Marcela, CEO | Identificar varianzas > 10% |
| **Flujo de Caja** | Mensual | 60-90s | Histórico, KPI | CFO, CEO, Construcción | Detectar períodos críticos |
| **Compras y Actas** | 2x diario | 15-20s | FACT_Compras, FACT_Actas | Control, Jurídico, Tesorería | Validar pagos y retenciones |

---

## 5. Checklist de Implementación

### Fase 1: Diseño Funcional
- [ ] Validar estructura con Andrés Arango (Construcción)
- [ ] Validar estructura con Marcela Arroyave (Control)
- [ ] Validar estructura con Juan José Leal (Financiero)
- [ ] Definir prioridades (¿comenzar por Control Presupuesto primero?)

### Fase 2: Desarrollo
- [ ] Crear modelo de datos en Power BI (ver POWER_BI_DATA_MODEL.md)
- [ ] Crear Reporte 1: Control Presupuesto (5-7 hojas)
- [ ] Crear Reporte 2: Flujo de Caja (4-5 hojas)
- [ ] Crear Reporte 3: Compras y Actas (3-4 hojas)
- [ ] Crear medidas DAX (ver sección 6 en DATA_MODEL.md)

### Fase 3: Testing
- [ ] Validar datos vs. Supabase (no vacíos, FK correctas)
- [ ] Validar cálculos (presupuesto = realizado + saldo)
- [ ] Performance < 60 segundos
- [ ] Refresh automático funciona

### Fase 4: Entrega
- [ ] Documentar estructura para analistas
- [ ] Compartir archivos .pbix con stakeholders
- [ ] Publicar a Power BI Service
- [ ] Entrenar usuarios finales
- [ ] Crear guías de uso por rol

---

## 6. Notas y Consideraciones

### 6.1 Limitaciones Actuales

- **Histórico:** Solo 12 proyectos (quedan 8 por incluir)
- **Granularidad:** Nivel proyecto + capítulo (no item diario)
- **Proyecciones:** Manual (forecast no automático aún)

### 6.2 Extensiones Futuras

- [ ] Agregar análisis de desempeño por cuadrilla
- [ ] Integrar KPI de eficiencia (metros construidos/inversión)
- [ ] Automatizar alertas por Slack/Teams
- [ ] Crear scorecard de proyectos (green/amber/red)
- [ ] Análisis predictivo (machine learning para forecast)

---

**Documento Preparado Por:** Claude Code  
**Para:** Equipo de Construcción y Control — IC Constructora  
**Próximo Paso:** Validar especificación con stakeholders, comenzar implementación Fase 2
