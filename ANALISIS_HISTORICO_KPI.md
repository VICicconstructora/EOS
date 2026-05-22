# Análisis del Histórico de Proyectos — KPI TIR K y TIR Operativa

**Fecha análisis:** 2026-05-16  
**Datos:** historico_limpio.csv (892,901 registros)  
**Período cubierto:** 2019-06-01 → 2033-11-01 (5,267 días)  
**Películas (snapshots):** 16 (2025-01-01 → 2026-04-01)

---

## 1. Resumen Ejecutivo

Se cargaron **892,901 registros** de 40 proyectos inmobiliarios de IC Constructora, consolidando 16 películas (cortes mensuales) desde enero 2025 hasta abril 2026.

Los datos permiten calcular dos métricas de retorno clave:

| Métrica | Definición | Líneas P&G clave |
|---------|-----------|------------------|
| **TIR K** | Tasa Interna de Retorno del capital (aportes vs reintegros de socios) | 13.2, 13.4, 14.2, 14.4 |
| **TIR Operativa** | Tasa Interna de Retorno de flujos operacionales (ingresos - costos) | 10.0, 1.0, 3.0-6.0, 9.0 |

---

## 2. Estructura de Datos

### 2.1 Dimensiones

| Dimensión | Cantidad | Notas |
|-----------|----------|-------|
| **Proyectos** | 40 únicos | Incluye 5 proyectos activos consolidados (Mitika tiene 8 sub-proyectos) |
| **Líneas P&G** | 161 únicas | Códigos + descripciones de presupuesto y gestión |
| **Películas** | 16 snapshots | Cortes mensuales 2025-01-01 → 2026-04-01 |
| **Fechas** | 2019-06-01 → 2033-11-01 | Histórico real + proyecciones futuras |
| **Registros** | 892,901 filas | Limpios, sin duplicados |

### 2.2 Proyectos por tipo

**Proyectos ACTIVOS cargados en Supabase (5 consolidados):**

| Proyecto | Etapas | Registros | Películas |
|----------|--------|-----------|-----------|
| **Well** | Única | 27,149 | 16 |
| **Verde Vivo** | E1, E2, E3, E4 | 101,922 | 16 |
| **Azul Celeste** | E1, E2, E3, E4 | 74,670 | 16 |
| **Azul Turquesa** | E1, E2, E3, E4 | 82,805 | 16 |
| **Mitika** | E1, E2, E3, E4 (8 sub-proy consolidados) | 124,708 | 16 |
| **Subtotal (FlujoHistorico)** | | **411,254** | |

**Proyectos CRM (en Sinco, NO cargados en Supabase):**

| Proyecto | Etapas | Registros | Películas |
|----------|--------|-----------|-----------|
| Bosque Central | Vivienda, Comercio, Institucional | 96,617 | 15 |
| Castilla Imperial | 2A, 2B, P | 56,127 | 15 |
| Castilla Living | Única | 32,183 | 15 |
| Gaia | Única | 37,460 | 15 |
| La Hacienda | E1 | 41,800 | 15 |
| Praia | E1, E2, E3 | 88,894 | 15 |
| Primera Este | E1-2, E3 | 55,555 | 11 |
| Reserva de Oporto | E1-2, E3 | 57,240 | 9 |
| **Subtotal (CRM)** | | **465,876** | |

---

## 3. Líneas P&G para KPI

### 3.1 TIR K — Aportes y Reintegros

Líneas que representan flujos de capital (endeudamiento/inversión de socios):

```
Aportes IC (IC Constructora):
├─ 13.0 Flujo Aportes IC              (Línea consolidada, negativa = desembolso)
├─ 13.2 Aportes IC                    (Detalle: aportes netos, -12,530 registros)
└─ 13.4 Reintegros IC                 (Detalle: retornos, +3,145 registros)

Aportes Socio (Socios):
├─ 14.0 Flujo Aportes Socio           (+5,678 registros)
├─ 14.2 Aportes Socio                 (+4,133 registros, pero puede ser negativo)
└─ 14.4 Reintegros Socio              (+1,556 registros)

Otros flujos de capital:
├─ 12.1 Flujo Aportes IC              (-39 registros, versión antigua)
├─ 12.11 Aportes IC                   (-21 registros)
├─ 12.12 Reintegros IC                (+18 registros)
├─ 12.21 Aportes Socio                (-18 registros)
├─ 12.22 Reintegros Socio             (+18 registros)
├─ 12.31 Aporte Prestamos entre etapas (-12 registros)
└─ 12.32 Reintegros prestamo entre etapas (+12 registros)
```

**REGLA DE CÁLCULO TIR K:**

```
Flujo de Capital (mes) = Reintegros IC + Reintegros Socio + Desembolsos Credito
                         - Aportes IC - Aportes Socio

TIR K = tasa que hace VPN = 0 en serie de flujos mensuales desde inicio hasta hoy
```

### 3.2 TIR Operativa — Flujo de Caja Operativo

Línea directa disponible:

```
10.0 FCO (Flujo de Caja Operativo)
    ├─ Definición: Ingresos - Costos directos - Costos indirectos - Otros gastos
    ├─ 40,052 registros
    └─ Metodología: (1.0) - (3.0) - (4.0) - (5.0-6.0) + (otros)
```

**O construir manualmente:**

```
Ingresos:
  1.0 Ingresos                  (+28,112 registros)

Menos: Costos
  3.0 Costo Directo Total       (+18,414 registros)
  4.0 Costo Indirecto           (+33,139 registros)
  5.0 Honorarios                (+6,570 registros)
  6.0 Financieros               (+16,409 registros)
  9.0 TOTAL COSTOS              (+36,286 registros)

Equals: FCO = 1.0 - 9.0

Acumulado:
  16.1 FCL ACUMULADO            (+39,105 registros)
```

---

## 4. Distribución de Datos por Película

| Película | Registros | Crecimiento | Notas |
|----------|-----------|-------------|-------|
| 2025-01-01 | 39,946 | — | Inicio |
| 2025-02-01 | 40,392 | +1.1% | Estable |
| 2025-03-01 | 40,460 | +0.2% | Estable |
| 2025-04-01 | 40,159 | -0.7% | Estable |
| 2025-05-01 | 45,190 | +12.5% | Nuevo proyecto |
| 2025-06-01 | 47,628 | +5.4% | Expansión |
| 2025-07-01 | 53,912 | +13.2% | Expansión |
| 2025-08-01 | 53,829 | -0.2% | Estable |
| 2025-09-01 | 54,940 | +2.1% | Estable |
| 2025-10-01 | 124,872 | **+127.4%** | ⚠️ Spike (posible consolidación histórica) |
| 2025-11-01 | 63,661 | -49.0% | Corrección |
| 2025-12-01 | 63,880 | +0.3% | Estable |
| 2026-01-01 | 64,625 | +1.2% | Estable |
| 2026-02-01 | 65,164 | +0.8% | Estable |
| 2026-03-01 | 63,338 | -2.8% | Estable |
| 2026-04-01 | 30,905 | -51.2% | ⚠️ Corte más reciente (abril incompleto) |

**Observación:** La película 2025-10-01 tiene un aumento anómalo de 127%. Posible que sea un consolidado histórico adicional o corrección masiva. Validar con Andrés Arango.

---

## 5. Clasificación de Líneas P&G por Flujo

### 5.1 Ingresos (Líneas 1.x)

```
Concepto                          Signo   Registros
─────────────────────────────────────────────────
1.0 Ingresos (total)               +     28,112
  1.1 Recaudo Fiducia             +     22,990
  1.2 Ingreso Vendido             +     22,468
  1.24 Cuota Inicial Vendido      +     21,898
  1.28 Credito Vendido            +      4,800
  1.3 Ventas                       +     17,930
  1.4 Ingreso No Vendido          +      8,153
  1.8 Otros Ingresos              +     10,995
```

**Análisis:** Diversas fuentes de ingreso (fiducia, cuotas iniciales, créditos, ventas). La línea 1.0 es agregada; usar para validar suma de sub-líneas.

### 5.2 Costos Directos (Líneas 2.x, 3.x)

```
Concepto                           Signo   Registros
──────────────────────────────────────────────────
2.0 Lote                            +      2,955
  2.2 Lote Bruto                  +      2,073
  2.4 Urbanismo Externo           +        969
3.0 Costo Directo Total            +     18,414
  3.2 Costo Directo               +     18,043
  3.22  Costo Construccion        +     17,949
  3.24  Urbanismo Interno         0         94
  3.4 CD Posventas                +      1,152
  3.6 CD Imprevistos              +      2,902
  3.8 CD Incrementos              +      2,917
```

### 5.3 Costos Indirectos y Otros (Líneas 4.x, 5.x, 6.x)

```
Concepto                          Signo   Registros
─────────────────────────────────────────────────
4.0 Costo Indirecto                +     33,139
5.0 Honorarios                     +      6,570
  5.2 H. Construccion             +      5,970
  5.4 H. Comercializacion         +      3,892
  5.6 H. Gerencia                 +      4,458
  5.8 H. Estructuracion           +        783
6.0 Financieros                    +     16,409
  6.2 F. Constructor              +     14,926
  6.4 F. Capital de Trabajo       +      2,240
9.0 TOTAL COSTOS                   +     36,286
```

### 5.4 Flujos de Capital (Líneas 12.x, 13.x, 14.x)

```
Concepto                           Signo   Registros
──────────────────────────────────────────────────
13.0 Flujo Aportes IC              -     12,530
  13.2 Aportes IC                 +      9,437   (nota: valores positivos registrados)
  13.4 Reintegros IC              +      3,145
14.0 Flujo Aportes Socio           +      5,678
  14.2 Aportes Socio              +      4,133
  14.4 Reintegros Socio           +      1,556
```

### 5.5 Créditos (Líneas 11.x, 12.x)

```
Concepto                           Signo   Registros
──────────────────────────────────────────────────
11.0 Saldo Credito                 -     14,428
  11.2 Desembolsos                +      7,081
  11.4 Amortizaciones             +      4,780
  11.5 Amort (+) correccion Mon.  +      4,850
11.7 Cupo                          +     16,181
12.0 Saldo Otros Creditos          +      4,042
  12.2 Desembolsos OC             +        592
  12.4 Amortizaciones OC          +        573
  12.5 Amort (+) correccion Mon.  +        550
```

---

## 6. Recomendaciones para Cálculo de KPI

### 6.1 TIR K (Capital)

**Metodología:**

1. **Por proyecto + película**, agrupar:
   - `13.4 Reintegros IC` (entrada de IC)
   - `14.4 Reintegros Socio` (entrada de socios)
   - `13.2 Aportes IC` con signo invertido (salida de IC)
   - `14.2 Aportes Socio` con signo invertido (salida de socios)

2. **Construir serie de flujos mensuales:**
   ```
   Mes      | Flujo Neto
   ─────────┼────────────
   2019-06  | -100M      (aporte inicial IC)
   2019-07  | -50M       (aporte IC)
   2019-08  | +20M       (reintegro parcial)
   ...
   ```

3. **Aplicar fórmula TIR:**
   ```
   0 = Σ(Flujo_t) / (1 + TIR)^t
   TIR = tasa que anula VPN
   ```

4. **Almacenar por:** `(proyecto, etapa, película, metrica='TIR_K', valor, fecha_calculo)`

### 6.2 TIR Operativa

**Metodología:**

1. **Opción A (Recomendada):** Usar línea consolidada `10.0 FCO` si es confiable

2. **Opción B (Verificación):** Construir manualmente:
   ```
   FCO = 1.0 Ingresos - 9.0 Total Costos
   ```

3. **Generar serie de flujos operacionales mensuales:**
   ```
   Mes      | FCO (Operacional)
   ─────────┼──────────────────
   2019-06  | +50M
   2019-07  | +45M
   2019-08  | +60M
   ...
   ```

4. **Aplicar fórmula TIR** a la serie operacional

5. **Notar:** `16.1 FCL ACUMULADO` es acumulado; usar diferencias para obtener flujo período a período.

### 6.3 Validaciones críticas

- [ ] La película 2025-10-01 con spike de 127% — confirmar normalidad
- [ ] Verificar si `13.2 Aportes IC` es realmente positivo o hay invertido signo
- [ ] Comparar `10.0 FCO` con suma manual de (1.0 - 9.0) en muestras
- [ ] Verificar que cada proyecto tenga todas las 16 películas (algunos pueden tener menos)
- [ ] Proyectos CRM (Bosque Central, etc.) tienen solo 15 películas; revisar cutoff

---

## 7. Proyectos Activos para KPI

**Recomendación:** Calcular TIR K y TIR Operativa para los **5 proyectos FlujoHistorico activos** (tienen datos completos en Supabase):

1. **Well** — 27,149 registros, 16 películas completas
2. **Verde Vivo** (E1-E4) — 101,922 registros, 16 películas completas
3. **Azul Celeste** (E1-E4) — 74,670 registros, 16 películas completas
4. **Azul Turquesa** (E1-E4) — 82,805 registros, 16 películas completas
5. **Mitika** (E1-E4 consolidado) — 124,708 registros, 16 películas completas

**Total para KPI:** 411,254 registros, 80 cálculos (5 proyectos × 16 películas)

---

## 8. Próximos pasos

1. **Crear hook React:** `useKpisProyectos.js` que:
   - Cargue datos de Supabase con líneas P&G seleccionadas
   - Implemente función `calcularTirK(flujos)` y `calcularTirOperativa(flujos)`
   - Retorne TIR K y TIR Operativa por proyecto/película

2. **Crear componente:** `KpisProyectosChart` para visualizar TIR K vs TIR Operativa por proyecto

3. **Agregar columnas a `metrics`:** Crear métricas `TIR_K` y `TIR_OPERATIVA` por proyecto

4. **Validar con Andrés Arango:** Confirmar si interpretación de líneas P&G es correcta

5. **Documentar en app Tracción:** Explicar definición y fórmula de cada TIR en UI

---

**Análisis completado:** 2026-05-16  
**Listo para implementación KPI:** ✅
