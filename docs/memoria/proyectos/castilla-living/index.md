---
tipo: proyecto
version: 1.1
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: construccion
---

# Castilla Living

**Tipo:** Propio
**Fuente de datos real:** CRM (sinco_ic_raw)
**Código PPTO:** Castilla Living
**IDs ERP (idproyecto):** 158 (E1B), 159 (E2A)

## Identificación

| Campo | Valor |
|-------|-------|
| Ciudad | Bogotá D.C. |
| Localidad | Kennedy |
| Dirección | Calle 8 # 86-65 |
| Estrato | 3 |
| Modalidad | VIS — Apartamento |
| Número de etapas | 2 (E1B, E2A) |
| Etapa(s) activa(s) | E1B, E2A |

## Equipo

| Rol | Persona / Empresa |
|-----|------------------|
| Director de Proyecto | [por definir] |
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
| Total unidades | [confirmar] |
| Torres | 2 torres de 22 pisos c/u |
| Tipos de unidad | Apartamento VIS |
| Área desde (m²) | 38.48 |
| Precio desde | $217,000,000 |
| Fecha de entrega prevista | 2do semestre 2026 |

## KPIs actuales (snapshot — mayo 2026)

- Ventas acumuladas: **503**
- Escrituraciones YTD: [por definir]
- Avance físico: [por definir]%

## Documentos del proyecto

- [Cronograma de obra](./cronograma-obra.md)
- [Cronograma de programación intermedia](./cronograma-intermedia.md)
- [Cronograma del director](./cronograma-director.md)
- [Inventario de unidades](./unidades.md)
- [Casos legales](./casos-legales.md)

## Notas de contexto

Proyecto VIS que comparte lote con Castilla Imperial (No VIS) en Kennedy. Dos torres de 22 pisos con 503 ventas acumuladas — alta velocidad de ventas para VIS en Bogotá.

## Datos Operativos (Datamart)

_Fuente: Datamart.xlsx — actualizado 2026-05-10_

**Director de Proyecto:** ALIDA RUIZ

### Etapas

| Etapa | Estado | Fiducia | Crédito | Monto | Venc. Crédito | Ventas Proy. |
|-------|--------|---------|---------|-------|---------------|-------------|
| E1B | ACTIVO | — | DAVIVIENDA | $65.0B | 2026-09-30 | $64.1B |
| E2A | ACTIVO | — | DAVIVIENDA | — | 2026-09-30 | $62.7B |

### Pólizas

| Etapa | Entidad TR | Venc. TR | Entidad RC | Venc. RC |
|-------|------------|----------|------------|----------|
| E1B | SURA | 2026-05-20 🟡 | SURA | 2027-05-20 |
| E2A | SURA | 2026-05-20 🟡 | SURA | 2027-05-20 |

### Licencias

| Etapa | Lic. Urbanismo | Lic. Construcción | Venc. Lic. Const. | Próx. Trámite |
|-------|----------------|-------------------|-------------------|---------------|
| E1B | 11001-3-21-0405 | 11001-5-23-1808 | 2023-02-15 🔴 | — |
| E2A | 11001-3-21-0405 | 11001-5-23-1808 | 2023-02-15 🔴 | — |

### Alarmas

- 🟡 **Póliza TR POR VENCER:** E1B: SURA, vence 2026-05-20 (10 días)
- 🟡 **Póliza TR POR VENCER:** E2A: SURA, vence 2026-05-20 (10 días)
- 🔴 **Licencia Construcción VENCIDA:** E1B: venció 2023-02-15 (-1180 días)
- 🔴 **Licencia Construcción VENCIDA:** E2A: venció 2023-02-15 (-1180 días)
## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
| 1.1 | 2026-05-09 | Datos reales: dirección, estrato, torres, área, precio, entrega | JPM |
