---
tipo: proyecto
version: 1.1
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: construccion
---

# Azul Celeste

**Tipo:** Socio
**Fuente de datos real:** Flujo Histórico (Historico.xlsx — no existe en CRM Sinco)
**Código PPTO:** Azul Celeste E1, E2, E3, E4
**IDs ERP:** N/A (proyecto socio, sin datos en adi_dtm_venta)

## Identificación

| Campo | Valor |
|-------|-------|
| Ciudad | Madrid |
| Departamento | Cundinamarca |
| Urbanización | Ciudadela La Prosperidad |
| Estrato | [confirmar] |
| Modalidad | No VIS — Apartamento |
| Número de etapas | 4 (E1–E4) |
| Etapa(s) activa(s) | E1, E2 activas (E3-E4 por confirmar) |
| Socio | Once Constructora |

## Nota sobre datos

Al ser un proyecto socio, **los KPIs de ejecución no vienen del CRM Sinco** sino de los snapshots mensuales en `Historico.xlsx`. Las etapas E3/E4 posiblemente no han arrancado (pocas filas en PPTO).

## Equipo de IC en el proyecto

| Rol | Persona / Empresa |
|-----|------------------|
| Contacto IC | [por definir] |
| Gerente Financiero | [Juan José Leal](../../personas/juan-jose-leal.md) |
| Gerente Jurídico | [Nataly Vinchira](../../personas/nataly-vinchira.md) |
| Socio desarrollador | Once Constructora |

## Características del producto

| Campo | Valor |
|-------|-------|
| Total unidades (E1-E4) | [confirmar con Histórico.xlsx] |
| Tipos de unidad | Apartamento |
| Área mínima (m²) | 55 |
| Área máxima (m²) | 72 |
| Precio desde | $292,300,000 |

## KPIs actuales (snapshot — mayo 2026)

- Ejecución: consultable en Power BI (fuente: Historico.xlsx)
- Escrituraciones: [por definir]

## Documentos del proyecto

- [Cronograma de obra](./cronograma-obra.md)
- [Cronograma de programación intermedia](./cronograma-intermedia.md)
- [Cronograma del director](./cronograma-director.md)
- [Inventario de unidades](./unidades.md)
- [Casos legales](./casos-legales.md)

## Notas de contexto

Proyecto con Once Constructora en Madrid Cundinamarca, Ciudadela La Prosperidad. Mismo urbanismo que Azul Turquesa y Verde Vivo (los tres son proyectos IC-Once en esa ciudadela). Datos de ventas y ejecución en Historico.xlsx.

## Datos Operativos (Datamart)

_Fuente: Datamart.xlsx — actualizado 2026-05-10_

**Director de Proyecto:** DIEGO BENAVIDES

### Etapas

| Etapa | Estado | Fiducia | Crédito | Monto | Venc. Crédito | Ventas Proy. |
|-------|--------|---------|---------|-------|---------------|-------------|
| E1 | INACTIVO | Colmena Fiduciaria | DAVIVIENDA | $19.8B | 2021-12-16 🔴 | $38.0B |
| E2 | ACTIVO | Colmena Fiduciaria | DAVIVIENDA | $9.3B | 2026-06-30 🟡 | $18.5B |
| E3 | INACTIVO | Colmena Fiduciaria | DAVIVIENDA | $5.2B | 2026-02-01 🔴 | $9.9B |
| E4 | INACTIVO | Colmena Fiduciaria | Pendiente | — |  | $28.0B |

### Pólizas

| Etapa | Entidad TR | Venc. TR | Entidad RC | Venc. RC |
|-------|------------|----------|------------|----------|
| E1 | SBS Seguros Colombia | 2022-01-06 🔴 | SBS Seguros Colombia |  |
| E2 | SBS Seguros Colombia | 2024-02-22 🔴 | SBS Seguros Colombia | 2024-02-28 🔴 |
| E3 | Suramericana | 2025-04-29 🔴 | Suramericana | 2025-04-29 🔴 |
| E4 | — |  | — |  |

### Licencias

| Etapa | Lic. Urbanismo | Lic. Construcción | Venc. Lic. Const. | Próx. Trámite |
|-------|----------------|-------------------|-------------------|---------------|
| E1 | 160-287 | 160-287 | 2022-02-20 🔴 | — |
| E2 | 160-287 | 160-287 | 2022-02-20 🔴 | — |
| E3 | 160-287 | 160-287 | 2022-02-20 🔴 | — |
| E4 | 160-287 | 160-287 | 2022-02-20 🔴 | — |

### Alarmas

- 🔴 **Crédito VENCIDA:** E1: DAVIVIENDA, vence 2021-12-16 (-1606 días)
- 🟡 **Crédito POR VENCER:** E2: DAVIVIENDA, vence 2026-06-30 (51 días)
- 🔴 **Crédito VENCIDA:** E3: DAVIVIENDA, vence 2026-02-01 (-98 días)
- 🔴 **Póliza TR VENCIDA:** E1: SBS Seguros Colombia, vence 2022-01-06 (-1585 días)
- 🔴 **Póliza TR VENCIDA:** E2: SBS Seguros Colombia, vence 2024-02-22 (-808 días)
- 🔴 **Póliza RC VENCIDA:** E2: SBS Seguros Colombia, vence 2024-02-28 (-802 días)
- 🔴 **Póliza TR VENCIDA:** E3: Suramericana, vence 2025-04-29 (-376 días)
- 🔴 **Póliza RC VENCIDA:** E3: Suramericana, vence 2025-04-29 (-376 días)
- 🔴 **Licencia Construcción VENCIDA:** E1: venció 2022-02-20 (-1540 días)
- 🔴 **Licencia Construcción VENCIDA:** E2: venció 2022-02-20 (-1540 días)
- 🔴 **Licencia Construcción VENCIDA:** E3: venció 2022-02-20 (-1540 días)
- 🔴 **Licencia Construcción VENCIDA:** E4: venció 2022-02-20 (-1540 días)
## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
| 1.1 | 2026-05-09 | Datos reales: Madrid Cundinamarca, Ciudadela La Prosperidad, Once Constructora, áreas 55-72m², precio $292.3M | JPM |
