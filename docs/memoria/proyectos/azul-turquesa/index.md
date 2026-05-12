---
tipo: proyecto
version: 1.1
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: construccion
---

# Azul Turquesa

**Tipo:** Socio
**Fuente de datos real:** Flujo Histórico (Historico.xlsx — no existe en CRM Sinco)
**Código PPTO:** Azul Turquesa E1, E2, E3, E4
**IDs ERP:** N/A (proyecto socio)

## Identificación

| Campo | Valor |
|-------|-------|
| Ciudad | Madrid |
| Departamento | Cundinamarca |
| Dirección | Calle 7 No 25-95, Ciudadela La Prosperidad |
| Estrato | [confirmar] |
| Modalidad | No VIS — Apartamento |
| Número de etapas | 3 activas (de 4 previstas) |
| Etapa(s) activa(s) | E1, E2, E3 |
| Socio | Once Constructora |
| Fiduciaria | Colmena Fiduciaria |

## Equipo de IC en el proyecto

| Rol | Persona / Empresa |
|-----|------------------|
| Contacto IC | [por definir] |
| Gerente Financiero | [Juan José Leal](../../personas/juan-jose-leal.md) |
| Gerente Jurídico | [Nataly Vinchira](../../personas/nataly-vinchira.md) |
| Socio desarrollador | Once Constructora |
| Fiduciaria | Colmena Fiduciaria |

## Características del producto

| Campo | Valor |
|-------|-------|
| Total unidades (E1-E3) | 545 |
| Torres | 7 torres de 12 pisos c/u |
| Tipos de unidad | Apartamento |
| Precio desde | $298,000,000 |

## Documentos del proyecto

- [Cronograma de obra](./cronograma-obra.md)
- [Cronograma de programación intermedia](./cronograma-intermedia.md)
- [Cronograma del director](./cronograma-director.md)
- [Inventario de unidades](./unidades.md)
- [Casos legales](./casos-legales.md)

## Notas de contexto

Proyecto con Once Constructora en Madrid Cundinamarca, Ciudadela La Prosperidad (mismo urbanismo que Azul Celeste y Verde Vivo). 545 unidades, 7 torres de 12 pisos, 3 etapas activas. Fiduciaria: Colmena. Datos de ejecución en Historico.xlsx.

## Datos Operativos (Datamart)

_Fuente: Datamart.xlsx — actualizado 2026-05-10_

**Director de Proyecto:** DIEGO BENAVIDES

### Etapas

| Etapa | Estado | Fiducia | Crédito | Monto | Venc. Crédito | Ventas Proy. |
|-------|--------|---------|---------|-------|---------------|-------------|
| E1 | INACTIVO | Colmena Fiduciaria | DAVIVIENDA | $18.5B | 2021-06-17 🔴 | $34.2B |
| E2 | ACTIVO | Colmena Fiduciaria | DAVIVIENDA | $19.4B | 2026-12-15 | $38.7B |
| E3 | INACTIVO | Colmena Fiduciaria | DAVIVIENDA | — |  | $25.2B |
| E4 | INACTIVO | Colmena Fiduciaria | Pendiente | — |  | $59.7B |

### Pólizas

| Etapa | Entidad TR | Venc. TR | Entidad RC | Venc. RC |
|-------|------------|----------|------------|----------|
| E1 | SBS Seguros Colombia |  | SBS Seguros Colombia |  |
| E2 | SBS Seguros Colombia | 2024-03-05 🔴 | SBS Seguros Colombia | 2024-03-05 🔴 |
| E3 | — |  | — |  |
| E4 | — |  | — |  |

### Licencias

| Etapa | Lic. Urbanismo | Lic. Construcción | Venc. Lic. Const. | Próx. Trámite |
|-------|----------------|-------------------|-------------------|---------------|
| E1 | RES 244 | RES 244 | 2021-02-02 🔴 | — |
| E2 | RES 244 | RES 244 | 2021-02-02 🔴 | — |
| E3 | RES 244 | RES 244 | 2021-02-02 🔴 | — |
| E4 | RES 244 | RES 244 | 2021-02-02 🔴 | — |

### Alarmas

- 🔴 **Crédito VENCIDA:** E1: DAVIVIENDA, vence 2021-06-17 (-1788 días)
- 🔴 **Póliza TR VENCIDA:** E2: SBS Seguros Colombia, vence 2024-03-05 (-796 días)
- 🔴 **Póliza RC VENCIDA:** E2: SBS Seguros Colombia, vence 2024-03-05 (-796 días)
- 🔴 **Licencia Construcción VENCIDA:** E1: venció 2021-02-02 (-1923 días)
- 🔴 **Licencia Construcción VENCIDA:** E2: venció 2021-02-02 (-1923 días)
- 🔴 **Licencia Construcción VENCIDA:** E3: venció 2021-02-02 (-1923 días)
- 🔴 **Licencia Construcción VENCIDA:** E4: venció 2021-02-02 (-1923 días)
## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
| 1.1 | 2026-05-09 | Datos reales: Madrid Cundinamarca Calle 7 No 25-95, Once Constructora, Colmena Fiduciaria, 545 units, 7 torres, $298M | JPM |
