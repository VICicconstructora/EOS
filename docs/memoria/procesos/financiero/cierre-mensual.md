---
tipo: proceso
version: 1.0
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: vigente
area: Financiero
frecuencia: mensual
---

# Proceso: Cierre Contable Mensual

**Responsable:** [Juan José Leal](../../personas/juan-jose-leal.md)
**Área:** Financiero
**Frecuencia:** Mensual (reporte al CEO antes del día 10 del mes siguiente)
**Tipo:** operativo

## Objetivo

Consolidar el estado financiero de IC Constructora por proyecto y empresa al cierre de cada mes, con P&G real comparado contra PPTO.

## Entradas

- Actas de obra aprobadas (Construcción)
- Facturas de costos indirectos del período
- Extractos bancarios y conciliaciones
- Estado de cartera pre y post-escritura (Experiencia)
- Escrituraciones del período (Jurídico)
- Órdenes de compra procesadas (Control)

## Pasos

1. Cierre de cuentas contables al último día hábil del mes
2. Conciliación bancaria de todas las cuentas
3. Registro de actas de obra como costo de período
4. Registro de ventas escrituradas como ingreso reconocido
5. Consolidación de P&G por proyecto y empresa
6. Comparación P&G real vs PPTO (101 líneas contables)
7. Elaboración del informe ejecutivo (semáforo por proyecto)
8. Presentación al CEO antes del día 10 del mes siguiente

## Salidas / Entregables

- P&G mensual por proyecto y empresa consolidada
- Flujo de caja real vs proyectado
- Informe ejecutivo para reunión L10 gerencial
- Balance consolidado (trimestral)

## Sistemas involucrados

- [x] Excel / SharePoint (PPTOProyectos2026.xlsx, Historico.xlsx)
- [x] Power BI / Fabric (sinco_ic_targets.ppto_valores)
- [ ] CRM Sinco
- [x] Supabase IC (modelo analítico CBR)
- [x] Teams / Outlook

## Puntos de falla conocidos

- Áreas que no entregan insumos a tiempo (actas, facturas, extractos)
- Discrepancias entre el PPTO en Excel y lo registrado en el ERP
- Proyectos socios que dependen del Flujo Histórico manual (Historico.xlsx)

## Indicadores del proceso

| KPI | Meta | Frecuencia de revisión |
|-----|------|------------------------|
| Reporte entregado antes del día 10 | Sí | Mensual |
| Proyectos con desviación P&G > 10% sin explicación | 0 | Mensual |
| Conciliaciones bancarias completadas | 100% | Mensual |

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
