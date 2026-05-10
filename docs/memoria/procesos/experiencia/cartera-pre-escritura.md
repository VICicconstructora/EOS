---
tipo: proceso
version: 1.0
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: vigente
area: Experiencia
frecuencia: mensual
---

# Proceso: Cartera Pre-escritura

**Responsable:** [Mónica Báez](../../personas/monica-baez.md)
**Área:** Experiencia
**Frecuencia:** Seguimiento mensual; gestión de cobro semanal
**Tipo:** operativo

## Objetivo

Asegurar el recaudo de las cuotas iniciales pactadas en el plan de pagos de cada comprador, desde la firma de promesa hasta la escrituración.

## Entradas

- Planes de pago firmados (`adi_dtm_acuerdos_pago` en CRM)
- Fechas de vencimiento de cuotas
- Depósitos recibidos (`adi_dtm_relacion_pagos`)
- Saldo pendiente por cliente

## Pasos

1. Consulta mensual de cuotas vencidas en CRM Sinco
2. Envío de recordatorios y estados de cuenta a clientes
3. Registro de pagos recibidos en CRM (`adi_dtm_relacion_pagos`)
4. Gestión de mora: llamada → carta → acuerdo de pago
5. Reporte mensual de cartera al CEO y Financiero
6. En caso de mora grave: notificación a Jurídico para proceso de desistimiento

## Salidas / Entregables

- Estado de cartera pre-escritura por proyecto (Excel / Power BI)
- Lista de clientes en mora +30 / +60 / +90 días
- Reporte de recaudo mensual vs programado

## Sistemas involucrados

- [x] CRM Sinco (`adi_dtm_acuerdos_pago`, `adi_dtm_relacion_pagos`)
- [x] Power BI / Fabric
- [x] Excel / SharePoint
- [ ] Supabase IC
- [x] Teams / Outlook

## Puntos de falla conocidos

- Clientes que no responden a recordatorios de pago
- Planes de pago mal estructurados desde la promesa
- Discrepancias entre lo pactado en promesa y lo registrado en CRM

## Indicadores del proceso

| KPI | Meta | Frecuencia de revisión |
|-----|------|------------------------|
| Recaudo cuotas iniciales (% del PPTO) | ≥ 95% | Mensual |
| Mora > 30 días (% del total cartera) | < [por definir]% | Mensual |
| Mora > 90 días (valor $) | $0 sin gestión activa | Mensual |

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
