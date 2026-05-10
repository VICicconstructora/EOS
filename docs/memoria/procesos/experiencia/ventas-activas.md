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

# Proceso: Ventas Activas

**Responsable:** [Mónica Báez](../../personas/monica-baez.md)
**Área:** Experiencia
**Frecuencia:** Seguimiento diario en CRM; reporte mensual al CEO
**Tipo:** operativo

## Objetivo

Gestionar el ciclo completo de venta de unidades residenciales — desde el primer contacto hasta la firma de promesa de compraventa — y mantener actualizados los KPIs comerciales en CRM Sinco.

## Entradas

- Leads de mercadeo (sala de ventas, portal web, referidos)
- Lista de precios vigente por proyecto
- Inventario de unidades disponibles (CRM Sinco)
- Capacidad de crédito del cliente (estudio)

## Pasos

1. Registro del lead en CRM Sinco
2. Asignación a asesor comercial
3. Visita a sala de ventas / proyecto
4. Estudio de crédito y preaprobación
5. Selección de unidad y negociación de precio / forma de pago
6. Firma de promesa de compraventa
7. Registro en CRM Sinco como venta activa (`adi_dtm_venta`)
8. Inicio del plan de pagos (`adi_dtm_acuerdos_pago`)

## Salidas / Entregables

- Promesa de compraventa firmada (copia digital en SharePoint)
- Registro en CRM Sinco con `idventa`, `valorneto`, `fechaventa`
- Notificación a Jurídico para inicio del trámite
- Actualización del scorecard de ventas YTD

## Sistemas involucrados

- [x] CRM Sinco
- [x] Power BI / Fabric (dashboard de ventas)
- [x] Excel / SharePoint (documentos del cliente)
- [ ] Supabase IC
- [x] Teams / Outlook (comunicación interna)

## Puntos de falla conocidos

- Demoras en estudios de crédito (dependen de entidades bancarias externas)
- Inconsistencias entre lista de precios en CRM y Excel cuando hay actualizaciones
- Unidades en estado ambiguo (reservadas pero no prometidas formalmente)

## Indicadores del proceso

| KPI | Meta | Frecuencia de revisión |
|-----|------|------------------------|
| Ventas nuevas del mes (unidades) | PPTO mensual por proyecto | Mensual |
| Ventas YTD vs PPTO (valor neto $) | 100% del PPTO | Mensual |
| Tasa de conversión leads → promesa | [por definir] % | Mensual |
| Desistimientos del período | < [por definir] | Mensual |

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
