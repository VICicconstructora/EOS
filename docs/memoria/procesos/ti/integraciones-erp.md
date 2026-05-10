---
tipo: proceso
version: 1.0
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: vigente
area: TI
frecuencia: mensual
---

# Proceso: Integraciones ERP Sinco → Supabase IC

**Responsable:** [Luis Miguel Serrano](../../personas/luis-miguel-serrano.md)
**Área:** TI
**Frecuencia:** Actualización mensual del modelo analítico CBR
**Tipo:** operativo

## Objetivo

Mantener actualizado el modelo analítico CBR en Supabase IC con los datos del ERP Sinco, garantizando que los dashboards de Power BI y el asistente IA tengan información confiable y reciente.

## Entradas

- Exportación mensual del ERP Sinco (tablas: `adi_dtm_venta`, `adi_dtm_tramites`, `adi_dtm_acuerdos_pago`, `adi_dtm_relacion_pagos`, dimensiones)
- Archivo PPTOProyectos2026.xlsx actualizado (Financiero / Construcción)
- Archivo Historico.xlsx actualizado (Financiero — datos proyectos socios)

## Pasos

1. Extracción de datos del ERP Sinco (snapshot mensual)
2. Validación de integridad: conteos de filas, rangos de fechas, valores nulos inesperados
3. Transformación y carga en `sinco_ic_raw` (Supabase)
4. Actualización de `sinco_ic_targets` (PPTO desde Excel)
5. Actualización de `sinco_ic_historico` (Flujo Histórico desde Excel)
6. Ejecución de validaciones post-carga (totales de ventas, escrituraciones, etc.)
7. Notificación al equipo de que los datos están actualizados
8. Actualización del dashboard de Power BI / Fabric

## Salidas / Entregables

- Datos actualizados en Supabase IC (3 schemas: raw, targets, historico)
- Dashboard Power BI actualizado
- Log de la actualización con fecha, filas cargadas, errores

## Sistemas involucrados

- [x] ERP Sinco (fuente)
- [x] Supabase IC (destino)
- [x] Excel / SharePoint (PPTO e Histórico)
- [x] Power BI / Fabric (consumo)
- [ ] CRM Sinco (mismo sistema que ERP para ventas)

## Puntos de falla conocidos

- Cambios de estructura en la exportación de Sinco que rompen el pipeline
- Proyectos nuevos en CRM que no están en `proyectos_map` — hay que añadirlos manualmente
- Histrico.xlsx con formatos variables según quien lo edita

## Indicadores del proceso

| KPI | Meta | Frecuencia de revisión |
|-----|------|------------------------|
| Días de retraso en actualización mensual | 0 (actualizar antes del día 10) | Mensual |
| Errores de validación post-carga | 0 críticos | Mensual |
| Disponibilidad de Supabase IC (uptime) | ≥ 99.5% | Mensual |

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
