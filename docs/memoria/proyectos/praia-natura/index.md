---
tipo: proyecto
version: 1.1
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: construccion
---

# Praia Natura

**Tipo:** Propio
**Fuente de datos real:** CRM (sinco_ic_raw)
**Código PPTO:** Praia E1 / Praia E2 / Praia E3
**IDs ERP (idproyecto):** 104 (E1), 107 (E2), 110 (E3 — reclasificado a Proyectos desde Estructuración)

## Identificación

| Campo | Valor |
|-------|-------|
| Ciudad | Santa Marta |
| Departamento | Magdalena |
| Sector | Pozos Colorados — Lagos del Dulcino |
| Estrato | [confirmar — zona alta de Santa Marta] |
| Modalidad | No VIS — Apartamento (amenidades hoteleras) |
| Número de etapas | 3 (E1, E2, E3) |
| Etapa(s) activa(s) | E1, E2, E3 |

## Nota sobre E3

La Etapa 3 fue reclasificada de `Estructuracion` a `Proyectos` en el catálogo PPTO, indicando que comenzó ejecución. Solo tiene 2 ventas registradas en CRM (inicio reciente de preventa).

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
| Total ventas (E1+E2+E3) | 265 |
| — E1 | 119 ventas |
| — E2 | 144 ventas |
| — E3 | 2 ventas (inicio preventa) |
| Área mínima (m²) | 47 |
| Área máxima (m²) | 132 |
| Amenidades | Piscina, playa, restaurante, zonas húmedas — concepto hotelero |
| Precio desde | $331,800,000 |

## KPIs actuales (snapshot — mayo 2026)

- Ventas acumuladas: **265** (E1: 119, E2: 144, E3: 2)
- Escrituraciones YTD: [por definir]
- Avance físico E1: [por definir]%
- Avance físico E2: [por definir]%

## Documentos del proyecto

- [Cronograma de obra](./cronograma-obra.md)
- [Cronograma de programación intermedia](./cronograma-intermedia.md)
- [Cronograma del director](./cronograma-director.md)
- [Inventario de unidades](./unidades.md)
- [Casos legales](./casos-legales.md)

## Notas de contexto

Único proyecto de IC en Santa Marta. Concepto hotelero con amenidades de playa. E3 apenas inicia preventa (2 ventas). La escala de áreas (47–132m²) sugiere una oferta diversificada: estudios/un cuarto para inversión hasta penthouse para uso familiar o vacacional.

## Datos Operativos (Datamart)

_Fuente: Datamart.xlsx — actualizado 2026-05-10_

**Director de Proyecto:** ALIDA RUIZ

### Etapas

| Etapa | Estado | Fiducia | Crédito | Monto | Venc. Crédito | Ventas Proy. |
|-------|--------|---------|---------|-------|---------------|-------------|
| E1 | ACTIVO | — | DAVIVIENDA | $32.0B | 2026-08-11 | $70.2B |
| E2 | ACTIVO | — | DAVIVIENDA | $38.0B | 2027-07-15 | $66.8B |
| E3 | ACTIVO | — | Pendiente | — |  | $79.8B |

### Pólizas

| Etapa | Entidad TR | Venc. TR | Entidad RC | Venc. RC |
|-------|------------|----------|------------|----------|
| E1 | SURA | 2026-01-27 🔴 | SURA | 2027-06-01 |
| E2 | SURA | 2026-05-27 🟡 | SURA | 2027-06-01 |
| E3 | SURA | 2027-06-01 | SURA | 2027-06-01 |

### Licencias

| Etapa | Lic. Urbanismo | Lic. Construcción | Venc. Lic. Const. | Próx. Trámite |
|-------|----------------|-------------------|-------------------|---------------|
| E1 | 47001-2-22-0050 | 47001-2-22-0050 | 2024-06-10 🔴 | 2026-04-16 |
| E2 | 47001-2-22-0050 | RES 0266 | 2027-10-31 | 2027-06-01 |
| E3 | 47001-2-22-0050 | POR TRAMITAR |  | — |

### Alarmas

- 🔴 **Póliza TR VENCIDA:** E1: SURA, vence 2026-01-27 (-103 días)
- 🟡 **Póliza TR POR VENCER:** E2: SURA, vence 2026-05-27 (17 días)
- 🔴 **Licencia Construcción VENCIDA:** E1: venció 2024-06-10 (-699 días)
## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
| 1.1 | 2026-05-09 | Datos reales: ciudad Santa Marta, sector Pozos Colorados, áreas 47-132m², precio $331.8M, amenidades hoteleras | JPM |
