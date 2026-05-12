---
tipo: proyecto
version: 1.1
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: construccion
---

# Reserva de Oporto

**Tipo:** Propio
**Fuente de datos real:** CRM (sinco_ic_raw)
**Código PPTO:** Reserva de Oporto E 1-2 / Reserva de Oporto E3
**IDs ERP (idproyecto):** 113 (E1), 114 (E2), 115 (E3), 339 (E4 Torres 4 y 5)

## Identificación

| Campo | Valor |
|-------|-------|
| Ciudad | Cali |
| Departamento | Valle del Cauca |
| Sector | Evaristo García |
| Estrato | 3 |
| Modalidad | VIS — Apartamento |
| Número de etapas | 4 (E1, E2, E3, E4) |
| Etapa(s) activa(s) | E1, E2, E3, E4 |

## Nota sobre E3/E4

En el PPTO, E3 consolida los IDs ERP 115 y 339 ("RESERVA DE OPORTO ETAPA 3 + ETAPA 4 TORRES 4 Y 5", Torres 3, 4, 5). Son 193 ventas bajo este bloque.

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
| Total ventas (E1+E2+E3+E4) | 742 |
| — E1+E2 | 549 ventas |
| — E3+E4 (Torres 3-5) | 193 ventas |
| Total unidades | ~840 apartamentos |
| Torres | 9 torres de 12 pisos c/u |
| Tipología 1 | 45.73 m² |
| Tipología 2 | 48.56 m² |
| Tipología 3 | 52.18 m² |
| Tipología 4 | 55.67 m² |
| Precio desde | $220,000,000 |
| Administración | ~$130,000/mes |
| Certificación | EDGE (edificio sostenible) |
| Entrega E1–E2 | Diciembre 2025 |
| Entrega E3–E4 | Diciembre 2026 |

## KPIs actuales (snapshot — mayo 2026)

- Ventas acumuladas: **742** (el proyecto propio con mayor volumen total)
- Escrituraciones YTD: [por definir]
- Avance físico: [por definir]%

## Documentos del proyecto

- [Cronograma de obra](./cronograma-obra.md)
- [Cronograma de programación intermedia](./cronograma-intermedia.md)
- [Cronograma del director](./cronograma-director.md)
- [Inventario de unidades](./unidades.md)
- [Casos legales](./casos-legales.md)

## Notas de contexto

Proyecto propio más grande de IC: 840 apartamentos, 9 torres, 4 etapas en Evaristo García, Cali. Certificación EDGE. Con 742 ventas acumuladas está prácticamente vendido. Las E1-E2 entran en entrega diciembre 2025; E3-E4 en diciembre 2026. El esquema PPTO consolida E3+E4 en un solo código.

## Datos Operativos (Datamart)

_Fuente: Datamart.xlsx — actualizado 2026-05-10_

**Director de Proyecto:** JHON MANOSALVA

### Etapas

| Etapa | Estado | Fiducia | Crédito | Monto | Venc. Crédito | Ventas Proy. |
|-------|--------|---------|---------|-------|---------------|-------------|
| E1 | ACTIVO | ALIANZA FIDUCIARIA | DAVIVIENDA | $48.4B | 2026-05-08 🔴 | $42.5B |
| E2 | ACTIVO | ALIANZA FIDUCIARIA | DAVIVIENDA | — | 2026-05-08 🔴 | $46.3B |
| E3 | ACTIVO | ALIANZA FIDUCIARIA | DAVIVIENDA | $27.0B | 2026-12-31 | $17.1B |
| E4 | ACTIVO | ALIANZA FIDUCIARIA | DAVIVIENDA | — | 2026-12-31 | $39.1B |

### Pólizas

| Etapa | Entidad TR | Venc. TR | Entidad RC | Venc. RC |
|-------|------------|----------|------------|----------|
| E1 | SURA | 2022-12-21 🔴 | SURA | 2022-03-20 🔴 |
| E2 | SURA | 2022-12-21 🔴 | SURA | 2022-03-20 🔴 |
| E3 | SURA | 2024-11-15 🔴 | SURA | 2024-11-15 🔴 |
| E4 | SURA | 2024-11-15 🔴 | SURA | 2024-11-15 🔴 |

### Licencias

| Etapa | Lic. Urbanismo | Lic. Construcción | Venc. Lic. Const. | Próx. Trámite |
|-------|----------------|-------------------|-------------------|---------------|
| E1 | U-76001-2-19-0868 | U-76001-2-19-0868 | 2022-09-07 🔴 | — |
| E2 | U-76001-2-19-0868 | U-76001-2-19-0868 | 2022-09-07 🔴 | — |
| E3 | U-76001-2-19-0868 | U-76001-2-19-0868 | 2022-09-07 🔴 | — |
| E4 | U-76001-2-19-0868 | U-76001-2-19-0868 | 2022-09-07 🔴 | — |

### Alarmas

- 🔴 **Crédito VENCIDA:** E1: DAVIVIENDA, vence 2026-05-08 (-2 días)
- 🔴 **Crédito VENCIDA:** E2: DAVIVIENDA, vence 2026-05-08 (-2 días)
- 🔴 **Póliza TR VENCIDA:** E1: SURA, vence 2022-12-21 (-1236 días)
- 🔴 **Póliza RC VENCIDA:** E1: SURA, vence 2022-03-20 (-1512 días)
- 🔴 **Póliza TR VENCIDA:** E2: SURA, vence 2022-12-21 (-1236 días)
- 🔴 **Póliza RC VENCIDA:** E2: SURA, vence 2022-03-20 (-1512 días)
- 🔴 **Póliza TR VENCIDA:** E3: SURA, vence 2024-11-15 (-541 días)
- 🔴 **Póliza RC VENCIDA:** E3: SURA, vence 2024-11-15 (-541 días)
- 🔴 **Póliza TR VENCIDA:** E4: SURA, vence 2024-11-15 (-541 días)
- 🔴 **Póliza RC VENCIDA:** E4: SURA, vence 2024-11-15 (-541 días)
- 🔴 **Licencia Construcción VENCIDA:** E1: venció 2022-09-07 (-1341 días)
- 🔴 **Licencia Construcción VENCIDA:** E2: venció 2022-09-07 (-1341 días)
- 🔴 **Licencia Construcción VENCIDA:** E3: venció 2022-09-07 (-1341 días)
- 🔴 **Licencia Construcción VENCIDA:** E4: venció 2022-09-07 (-1341 días)
## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
| 1.1 | 2026-05-09 | Datos reales: Cali Evaristo García, estrato 3, VIS, 840 apts, 9 torres, 4 tipologías, precio $220M, EDGE, fechas entrega | JPM |
