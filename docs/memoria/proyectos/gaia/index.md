---
tipo: proyecto
version: 1.1
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: construccion
---

# Gaia

**Tipo:** Propio
**Fuente de datos real:** CRM (sinco_ic_raw)
**Código PPTO:** Gaia
**IDs ERP (idproyecto):** 163 (E1), 164 (E2)

## Identificación

| Campo | Valor |
|-------|-------|
| Ciudad | Pereira |
| Departamento | Risaralda |
| Sector | Cerritos (vía a Cartago) |
| Estrato | 5 |
| Modalidad | No VIS — Condominio campestre unifamiliar |
| Área del lote | ~37,800 m² |
| Número de etapas | 2 |
| Etapa(s) activa(s) | E1, E2 |

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
| Tipos de unidad | Casa unifamiliar (condominio campestre) |
| Área privada desde (m²) | [confirmar — producto premium] |
| Precio desde | [confirmar — No VIS estrato 5] |

## KPIs actuales (snapshot — mayo 2026)

- Ventas acumuladas: **24** (proyecto con menor volumen de ventas — posiblemente etapa temprana o producto premium)
- Escrituraciones YTD: [por definir]
- Avance físico: [por definir]%

## Documentos del proyecto

- [Cronograma de obra](./cronograma-obra.md)
- [Cronograma de programación intermedia](./cronograma-intermedia.md)
- [Cronograma del director](./cronograma-director.md)
- [Inventario de unidades](./unidades.md)
- [Casos legales](./casos-legales.md)

## Notas de contexto

Condominio campestre en Cerritos, Pereira, estrato 5. Producto premium (casas unifamiliares) que explica la baja velocidad de ventas (24 unidades). La naturaleza del producto (menor # de unidades, ticket alto, comprador más exigente) hace que las métricas no sean comparables directamente con proyectos de apartamentos masivos.

## Datos Operativos (Datamart)

_Fuente: Datamart.xlsx — actualizado 2026-05-09_

**Director de Proyecto:** ALIDA RUIZ

### Etapas

| Etapa | Estado | Fiducia | Crédito | Monto | Venc. Crédito | Ventas Proy. |
|-------|--------|---------|---------|-------|---------------|-------------|
| E1 | ACTIVO | ALIANZA FIDUCIARIA | DAVIVIENDA | $13.5B | 2026-06-30 🟡 | $12.3B |
| E2 | ACTIVO | ALIANZA FIDUCIARIA | DAVIVIENDA | — | 2026-06-30 🟡 | $13.4B |

### Pólizas

| Etapa | Entidad TR | Venc. TR | Entidad RC | Venc. RC |
|-------|------------|----------|------------|----------|
| E1 | ALLIANZ | 2024-02-10 🔴 | ALLIANZ | 2024-02-10 🔴 |
| E2 | ALLIANZ | 2024-02-10 🔴 | ALLIANZ | 2024-02-10 🔴 |

### Licencias

| Etapa | Lic. Urbanismo | Lic. Construcción | Venc. Lic. Const. | Próx. Trámite |
|-------|----------------|-------------------|-------------------|---------------|
| E1 | 66001-1-23-2785 | 66001-1-22-2035 | 2023-04-12 🔴 | 2026-04-20 |
| E2 | 66001-1-23-2785 | 66001-1-22-2035 | 2023-04-12 🔴 | 2026-04-20 |

### Alarmas

- 🟡 **Crédito POR VENCER:** E1: DAVIVIENDA, vence 2026-06-30 (52 días)
- 🟡 **Crédito POR VENCER:** E2: DAVIVIENDA, vence 2026-06-30 (52 días)
- 🔴 **Póliza TR VENCIDA:** E1: ALLIANZ, vence 2024-02-10 (-819 días)
- 🔴 **Póliza RC VENCIDA:** E1: ALLIANZ, vence 2024-02-10 (-819 días)
- 🔴 **Póliza TR VENCIDA:** E2: ALLIANZ, vence 2024-02-10 (-819 días)
- 🔴 **Póliza RC VENCIDA:** E2: ALLIANZ, vence 2024-02-10 (-819 días)
- 🔴 **Licencia Construcción VENCIDA:** E1: venció 2023-04-12 (-1123 días)
- 🔴 **Licencia Construcción VENCIDA:** E2: venció 2023-04-12 (-1123 días)
## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
| 1.1 | 2026-05-09 | Datos reales: ciudad Pereira Cerritos, estrato 5, tipo de producto campestre, área lote | JPM |
