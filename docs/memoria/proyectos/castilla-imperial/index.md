---
tipo: proyecto
version: 1.2
creado: 2026-05-09
ultima_actualizacion: 2026-05-13
actualizado_por: Claude
estado: construccion
---

# Castilla Imperial

**Tipo:** Propio
**Fuente de datos real:** CRM (sinco_ic_raw)
**Código PPTO:** Castilla Imperial 2A / Castilla Imperial 2B / Castilla Imperial P
**IDs ERP (idproyecto):** 196 (2A), 199 (2B), 200 (Parqueaderos)

## Identificación

| Campo | Valor |
|-------|-------|
| Ciudad | Bogotá D.C. |
| Localidad | Kennedy |
| Dirección | Calle 8 # 86-65 |
| Estrato | 3 |
| Modalidad | No VIS — Apartamento |
| Número de etapas / partes | 2A, 2B, Parqueaderos |
| Etapa(s) activa(s) | 2A, 2B, P |

## Nota crítica sobre parqueaderos

Los 120 parqueaderos del proyecto pueden asignarse a **Imperial 2B** (incluidos en el P&G de 2B) **o** venderse independientes vía **Imperial P** con su propio P&G. Los KPIs de Imperial 2B y Imperial P **no son agregables sin riesgo de doble-conteo**: se suman P&G distintos. Ver [CBR proyectos_map](../../../../CBR/04_targets_ejecucion/proyectos_map.md).

## Equipo

| Rol | Persona / Empresa |
|-----|------------------|
| Director de Proyecto | [por definir] |
| Director de Sala de Ventas | Carlos Ernesto Maldonado Hernández (también cubre Castilla Living) |
| Gerente Construcción | [Andrés Arango](../../personas/andres-arango.md) |
| Gerente Comercial | [Mónica Báez](../../personas/monica-baez.md) |
| Gerente Jurídico | [Nataly Vinchira](../../personas/nataly-vinchira.md) |
| Diseñador Arquitectónico | [por definir] |
| Diseñador Estructural | [por definir] |
| Interventoría | [por definir] |
| Fiducia | [por definir] |
| Entidad financiera | [por definir] |

## Características del producto

| Campo | Valor |
|-------|-------|
| Tipos de unidad | Apartamento + Parqueadero |
| Total ventas registradas (2A+2B+P) | 271 |
| — Etapa 2A | 124 ventas |
| — Etapa 2B | 113 ventas |
| — Parqueaderos (P) | 34 ventas |
| Tipología D1 | 53.3 m² — 2 hab, 2 baños |
| Tipología E | 66.08 m² — 3 hab, 2 baños |
| Amenidades | BBQ, squash, coworking, gimnasio, piscina, sauna |
| Precio desde | $344,000,000 |
| Fecha de entrega prevista | Q2 2026 |

## Hitos principales

| Hito | Fecha plan | Fecha real | Estado |
|------|------------|------------|--------|
| Inicio obra | | | |
| Punto de equilibrio | | | |
| Entrega 2A | | | |
| Entrega 2B | | | |

## KPIs actuales (snapshot — mayo 2026)

- Ventas acumuladas: **271** (2A: 124 + 2B: 113 + P: 34)
- Escrituraciones YTD: [por definir]
- Avance físico: [por definir]%

## Documentos del proyecto

- [Cronograma de obra](./cronograma-obra.md)
- [Cronograma de programación intermedia](./cronograma-intermedia.md)
- [Cronograma del director](./cronograma-director.md)
- [Inventario de unidades](./unidades.md)
- [Casos legales](./casos-legales.md)

## Notas de contexto

Proyecto No VIS en Kennedy, estrato 3. Comparte lote con Castilla Living (VIS, misma dirección Calle 8 #86-65). Los parqueaderos del proyecto tienen su propio código ERP (200) y P&G independiente — ver nota crítica sobre doble-conteo.

## Datos Operativos (Datamart)

_Fuente: Datamart.xlsx — actualizado 2026-05-10_

**Director de Proyecto:** ALIDA RUIZ

### Etapas

| Etapa | Estado | Fiducia | Crédito | Monto | Venc. Crédito | Ventas Proy. |
|-------|--------|---------|---------|-------|---------------|-------------|
| E2A | INACTIVO | — | DAVIVIENDA | — |  | $32.4B |
| E2B | ACTIVO | DAVIVIENDA | DAVIVIENDA | $22.0B | 2026-04-29 🔴 | $36.4B |
| EPARQUEADEROS | ACTIVO | — | No Aplica | — |  | $3.6B |

### Pólizas

| Etapa | Entidad TR | Venc. TR | Entidad RC | Venc. RC |
|-------|------------|----------|------------|----------|
| E2A | AXA COLPATRIA SEGUROS S.A |  | — |  |
| E2B | SBS Seguros Colombia | 2023-08-01 🔴 | SBS Seguros Colombia | 2026-07-30 |
| EPARQUEADEROS | — |  | — |  |

### Licencias

| Etapa | Lic. Urbanismo | Lic. Construcción | Venc. Lic. Const. | Próx. Trámite |
|-------|----------------|-------------------|-------------------|---------------|
| E2A | 11001-3-21-0405 | 11001-3-19-1440 | 2022-06-26 🔴 | — |
| E2B | 11001-3-21-0405 | 11001-3-19-1440 | 2022-06-26 🔴 | — |
| EPARQUEADEROS | 11001-3-21-0405 | 16-3-0062 | 2018-05-03 🔴 | — |

### Alarmas

- 🔴 **Crédito VENCIDA:** E2B: DAVIVIENDA, vence 2026-04-29 (-11 días)
- 🔴 **Póliza TR VENCIDA:** E2B: SBS Seguros Colombia, vence 2023-08-01 (-1013 días)
- 🔴 **Licencia Construcción VENCIDA:** E2A: venció 2022-06-26 (-1414 días)
- 🔴 **Licencia Construcción VENCIDA:** E2B: venció 2022-06-26 (-1414 días)
- 🔴 **Licencia Construcción VENCIDA:** EPARQUEADEROS: venció 2018-05-03 (-2929 días)
## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
| 1.1 | 2026-05-09 | Datos reales: dirección, estrato, tipologías, precio, entrega, amenidades | JPM |
| 1.2 | 2026-05-13 | Director de Sala: Carlos Ernesto Maldonado Hernández | Claude |
