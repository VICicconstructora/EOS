---
tipo: proceso
version: 1.0
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: vigente
area: Experiencia
frecuencia: continuo
---

# Proceso: Gestión de Trámites

**Responsable:** [Mónica Báez](../../personas/monica-baez.md)
**Área:** Experiencia
**Frecuencia:** Seguimiento continuo por analista; reporte mensual en L10
**Tipo:** operativo

## Objetivo

Acompañar a cada comprador desde la firma de promesa hasta la escritura pública, gestionando activamente los hitos del pipeline: crédito hipotecario, subsidio y escrituración.

## Entradas

- Promesa de compraventa firmada
- Documentación financiera del cliente
- Estado de crédito hipotecario (banco)
- Estado de subsidio (Fonvivienda / caja de compensación)
- Permiso de ocupación del proyecto (entregado por Construcción)

## Pasos

1. Apertura del expediente de trámite en CRM Sinco (`adi_dtm_tramites`)
2. Solicitud de crédito hipotecario al banco elegido por el cliente
3. Seguimiento al estudio y aprobación del crédito
4. Radicación de solicitud de subsidio (si aplica: SFV, Mi Casa Ya)
5. Coordinación con Jurídico para programar fecha de escritura
6. Confirmación de disponibilidad del cliente y del notario
7. Cierre en CRM Sinco una vez escriturado

## Salidas / Entregables

- Registro de trámite completado en CRM (`adi_dtm_tramites`)
- Escritura pública protocolizada
- Notificación a Financiero para activar desembolso hipotecario
- Actualización del KPI de Trámites Cumplidos / Programados

## Sistemas involucrados

- [x] CRM Sinco (`adi_dtm_tramites`, `adi_dtm_venta`)
- [x] Power BI / Fabric
- [x] Excel / SharePoint (documentos soporte)
- [ ] Supabase IC
- [x] Teams / Outlook

## Puntos de falla conocidos

- Aprobaciones bancarias fuera del control de IC (15–45 días típicos)
- Clientes que pierden documentación o no responden a tiempo
- Subsidios con cupos limitados por vigencia presupuestal (Mi Casa Ya)
- Coordinación difícil entre notaría, banco y cliente para cuadrar fecha

## Indicadores del proceso

| KPI | Meta | Frecuencia de revisión |
|-----|------|------------------------|
| Trámites cumplidos / programados (%) | ≥ 90% | Mensual |
| Escrituraciones mes vs PPTO | 100% del PPTO | Mensual |
| Tiempo promedio promesa → escritura (días) | [por definir] | Mensual |
| Trámites represados (+90 días sin avance) | 0 | Mensual |

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
