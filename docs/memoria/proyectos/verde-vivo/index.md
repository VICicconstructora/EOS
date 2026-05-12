---
tipo: proyecto
version: 1.1
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: construccion
---

# Verde Vivo

**Tipo:** Socio
**Fuente de datos real:** Flujo Histórico (Historico.xlsx — no existe en CRM Sinco)
**Código PPTO:** Verde Vivo E1, E2, E3, E4
**IDs ERP:** N/A (proyecto socio)

## Identificación

| Campo | Valor |
|-------|-------|
| Ciudad | Madrid |
| Departamento | Cundinamarca |
| Urbanización | Ciudadela La Prosperidad |
| Estrato | [confirmar] |
| Modalidad | VIS — Apartamento (precio tope 150 SMMLV) |
| Número de etapas | 4 (E1–E4) |
| Etapa(s) activa(s) | [confirmar con Histórico] |
| Socio | Once Constructora |

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
| Tipos de unidad | Apartamento VIS |
| Área desde (m²) | 53 |
| Precio tope | 150 SMMLV (~$220M a valores 2026) |

## Documentos del proyecto

- [Cronograma de obra](./cronograma-obra.md)
- [Cronograma de programación intermedia](./cronograma-intermedia.md)
- [Cronograma del director](./cronograma-director.md)
- [Inventario de unidades](./unidades.md)
- [Casos legales](./casos-legales.md)

## Notas de contexto

Proyecto VIS con Once Constructora en Madrid Cundinamarca, mismo urbanismo que Azul Celeste y Azul Turquesa (Ciudadela La Prosperidad). Es el único proyecto VIS de la alianza IC-Once en esta ciudadela. Datos de ejecución en Historico.xlsx.

## Datos Operativos (Datamart)

_Fuente: Datamart.xlsx — actualizado 2026-05-10_

**Director de Proyecto:** DIEGO BENAVIDES

### Etapas

| Etapa | Estado | Fiducia | Crédito | Monto | Venc. Crédito | Ventas Proy. |
|-------|--------|---------|---------|-------|---------------|-------------|
| E1 | INACTIVO | Colmena Fiduciaria | BANCOLOMBIA | $15.9B | 2023-08-08 🔴 | $30.2B |
| E2 | ACTIVO | Colmena Fiduciaria | BANCOLOMBIA | $16.0B | 2026-07-01 🟡 | $34.2B |
| E3 | ACTIVO | Colmena Fiduciaria | BANCOLOMBIA | $16.2B | 2026-09-01 | $35.9B |
| E4 | INACTIVO | Colmena Fiduciaria | Pendiente | — |  | $23.0B |

### Pólizas

| Etapa | Entidad TR | Venc. TR | Entidad RC | Venc. RC |
|-------|------------|----------|------------|----------|
| E1 | SBS Seguros Colombia | 2022-01-01 🔴 | SBS Seguros Colombia | 2022-01-01 🔴 |
| E2 | SBS Seguros Colombia | 2022-04-01 🔴 | SBS Seguros Colombia | 2022-04-01 🔴 |
| E3 | SBS Seguros Colombia | 2026-03-01 🔴 | SBS Seguros Colombia | 2026-03-01 🔴 |
| E4 | — |  | — |  |

### Licencias

| Etapa | Lic. Urbanismo | Lic. Construcción | Venc. Lic. Const. | Próx. Trámite |
|-------|----------------|-------------------|-------------------|---------------|
| E1 | RES 247 | RES 247 | 2022-05-11 🔴 | — |
| E2 | RES 247 | RES 247 | 2022-05-11 🔴 | — |
| E3 | RES 247 | RES 247 | 2022-05-11 🔴 | — |
| E4 | RES 247 | RES 247 | 2022-05-11 🔴 | — |

### Alarmas

- 🔴 **Crédito VENCIDA:** E1: BANCOLOMBIA, vence 2023-08-08 (-1006 días)
- 🟡 **Crédito POR VENCER:** E2: BANCOLOMBIA, vence 2026-07-01 (52 días)
- 🔴 **Póliza TR VENCIDA:** E1: SBS Seguros Colombia, vence 2022-01-01 (-1590 días)
- 🔴 **Póliza RC VENCIDA:** E1: SBS Seguros Colombia, vence 2022-01-01 (-1590 días)
- 🔴 **Póliza TR VENCIDA:** E2: SBS Seguros Colombia, vence 2022-04-01 (-1500 días)
- 🔴 **Póliza RC VENCIDA:** E2: SBS Seguros Colombia, vence 2022-04-01 (-1500 días)
- 🔴 **Póliza TR VENCIDA:** E3: SBS Seguros Colombia, vence 2026-03-01 (-70 días)
- 🔴 **Póliza RC VENCIDA:** E3: SBS Seguros Colombia, vence 2026-03-01 (-70 días)
- 🔴 **Licencia Construcción VENCIDA:** E1: venció 2022-05-11 (-1460 días)
- 🔴 **Licencia Construcción VENCIDA:** E2: venció 2022-05-11 (-1460 días)
- 🔴 **Licencia Construcción VENCIDA:** E3: venció 2022-05-11 (-1460 días)
- 🔴 **Licencia Construcción VENCIDA:** E4: venció 2022-05-11 (-1460 días)
## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
| 1.1 | 2026-05-09 | Datos reales: Madrid Cundinamarca Ciudadela La Prosperidad, Once Constructora, VIS 150 SMMLV, 53m² | JPM |
