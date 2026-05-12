---
tipo: proyecto
version: 1.1
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: construccion
---

# Primera Este

**Tipo:** Propio
**Fuente de datos real:** CRM (sinco_ic_raw)
**Código PPTO:** Primera Este E 1-2 / Primera Este E3
**IDs ERP (idproyecto):** 122 (E1 Central), 123 (E2 Sur), 124 (E3 Norte)
**ERP nombres:** PRIMERA ESTE - CENTRAL / SUR / NORTE

## Identificación

| Campo | Valor |
|-------|-------|
| Ciudad | Bogotá D.C. |
| Localidad | Chapinero |
| Sector | Chapinero Alto |
| Estrato | [confirmar — zona alta de Chapinero] |
| Modalidad | No VIS — Apartamento |
| Número de etapas | 3 (E1 Central, E2 Sur, E3 Norte) |
| Etapa(s) activa(s) | E1, E2, E3 |

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
| Tipos de unidad | Apartamento |
| Total ventas (E1+E2+E3) | 170 |
| — E1 (Central) | 152 ventas (combinado con E2 en PPTO) |
| — E2 (Sur) | — |
| — E3 (Norte) | 18 ventas |
| Área mínima (m²) | 34 |
| Área máxima (m²) | 118 |
| Precio desde | $411,000,000 (Torre Norte) |

## KPIs actuales (snapshot — mayo 2026)

- Ventas acumuladas: **170** (E1+E2: 152, E3: 18)
- Escrituraciones YTD: [por definir]
- Avance físico: [por definir]%

## Documentos del proyecto

- [Cronograma de obra](./cronograma-obra.md)
- [Cronograma de programación intermedia](./cronograma-intermedia.md)
- [Cronograma del director](./cronograma-director.md)
- [Inventario de unidades](./unidades.md)
- [Casos legales](./casos-legales.md)

## Notas de contexto

Proyecto No VIS en Chapinero Alto, Bogotá. Producto premium con 3 torres (Central, Sur, Norte). E1 y E2 se consolidan en PPTO ("Primera Este E 1-2"). E3 Norte tiene su propio código PPTO y 18 ventas (inicio de preventa). La escala de áreas (34–118m²) cubre desde estudios hasta apartamentos grandes.

## Datos Operativos (Datamart)

_Fuente: Datamart.xlsx — actualizado 2026-05-10_

**Director de Proyecto:** JHON MANOSALVA

### Etapas

| Etapa | Estado | Fiducia | Crédito | Monto | Venc. Crédito | Ventas Proy. |
|-------|--------|---------|---------|-------|---------------|-------------|
| ECENTRO | ACTIVO | FIDUCIARIA DAVIVIENDA S.A. | ITAU | $48.0B | 2026-10-31 | $99.7B |
| ESUR | ACTIVO | FIDUCIARIA DAVIVIENDA S.A. | ITAU | — | 2026-10-31 | $99.7B |
| ENORTE | ACTIVO | FIDUCIARIA DAVIVIENDA S.A. | Pendiente | — |  | $78.6B |

### Pólizas

| Etapa | Entidad TR | Venc. TR | Entidad RC | Venc. RC |
|-------|------------|----------|------------|----------|
| ECENTRO | SURA | 2025-02-28 🔴 | SURA | 2026-02-28 🔴 |
| ESUR | SURA | 2025-02-28 🔴 | SURA | 2026-02-28 🔴 |
| ENORTE | — |  | — |  |

### Licencias

| Etapa | Lic. Urbanismo | Lic. Construcción | Venc. Lic. Const. | Próx. Trámite |
|-------|----------------|-------------------|-------------------|---------------|
| ECENTRO | 11001-5-24-2726 | 11001-4-21-1547 | 2024-04-04 🔴 | 2026-04-05 |
| ESUR | 11001-5-24-2726 | 11001-4-21-1547 | 2024-04-04 🔴 | 2026-04-05 |
| ENORTE | 11001-5-24-2726 | POR TRAMITAR |  | — |

### Alarmas

- 🔴 **Póliza TR VENCIDA:** ECENTRO: SURA, vence 2025-02-28 (-436 días)
- 🔴 **Póliza RC VENCIDA:** ECENTRO: SURA, vence 2026-02-28 (-71 días)
- 🔴 **Póliza TR VENCIDA:** ESUR: SURA, vence 2025-02-28 (-436 días)
- 🔴 **Póliza RC VENCIDA:** ESUR: SURA, vence 2026-02-28 (-71 días)
- 🔴 **Licencia Construcción VENCIDA:** ECENTRO: venció 2024-04-04 (-766 días)
- 🔴 **Licencia Construcción VENCIDA:** ESUR: venció 2024-04-04 (-766 días)
## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
| 1.1 | 2026-05-09 | Datos reales: localidad Chapinero Alto, No VIS, áreas 34-118m², precio $411M Torre Norte | JPM |
