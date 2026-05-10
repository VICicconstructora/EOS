---
tipo: proceso
version: 1.0
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: vigente
area: Construccion
frecuencia: mensual
---

# Proceso: Control Presupuesto de Obra

**Responsable:** [Andrés Arango](../../personas/andres-arango.md)
**Área:** Construcción
**Frecuencia:** Mensual (corte al último día hábil del mes)
**Tipo:** operativo

## Objetivo

Comparar el presupuesto de obra planificado (PPTO) contra la ejecución real por proyecto y actividad, identificando desviaciones y tomando acciones correctivas.

## Entradas

- Presupuesto de obra aprobado por proyecto (PPTOProyectos2026.xlsx)
- Actas de obra ejecutada en el período (contratistas)
- Órdenes de compra procesadas (Control — Marcela Arroyave)
- Facturas de costos indirectos del período

## Pasos

1. Cierre de actas con cada contratista (último día hábil del mes)
2. Registro de avance físico y valorización económica por actividad
3. Consolidación en PPTO vs Real en Excel (o ERP)
4. Identificación de partidas con desviación > [umbral %]
5. Análisis de causa: cambio de diseño, variación de precios, retrasos
6. Reporte mensual a CEO con semáforo por proyecto (verde / amarillo / rojo)
7. Actualización del cronograma del director si hay impacto en hitos

## Salidas / Entregables

- Informe PPTO vs Real por proyecto (Excel / Power BI)
- Semáforo presupuestal para L10 gerencial
- Actas de obra aprobadas para pago

## Sistemas involucrados

- [x] Excel / SharePoint (PPTOProyectos2026.xlsx)
- [x] Power BI / Fabric
- [ ] CRM Sinco
- [ ] Supabase IC (sinco_ic_targets.ppto_valores)
- [x] Teams / Outlook

## Puntos de falla conocidos

- Contratistas que no entregan actas a tiempo
- Cambios de diseño no reflejados en el PPTO actualizado
- Compras de materiales no reportadas a Construcción por Control

## Indicadores del proceso

| KPI | Meta | Frecuencia de revisión |
|-----|------|------------------------|
| Desviación PPTO vs Real (%) | < 5% por proyecto | Mensual |
| Actas cerradas en plazo | 100% antes del día 5 del siguiente mes | Mensual |
| Partidas con alerta roja | 0 sin plan de acción | Mensual |

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
