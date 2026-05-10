---
tipo: proceso
version: 1.0
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: vigente
area: Juridico
frecuencia: continuo
---

# Proceso: Escrituración

**Responsable:** [Nataly Vinchira](../../personas/nataly-vinchira.md)
**Área:** Jurídico
**Frecuencia:** Continuo; reporte mensual de escrituraciones completadas
**Tipo:** operativo

## Objetivo

Formalizar la transferencia de dominio de cada unidad vendida mediante escritura pública, coordinando notarías, entidades financieras, cajas de compensación y el comprador.

## Entradas

- Promesa de compraventa firmada (Experiencia)
- Aprobación de crédito hipotecario (banco)
- Resolución de subsidio (Fonvivienda / caja de compensación, si aplica)
- Permiso de ocupación del proyecto (Construcción)
- Paz y salvo de cuota inicial (Experiencia — cartera pre-escritura)
- Documentos del comprador vigentes

## Pasos

1. Verificación de requisitos previos (crédito aprobado, subsidio listo, cuota inicial al día)
2. Coordinación con notaría para agendamiento
3. Liquidación de impuestos de transferencia y gastos notariales
4. Envío de minutas a notaría y banco
5. Firma de escritura pública (comprador, IC, banco)
6. Registro en Oficina de Registro de Instrumentos Públicos (ORIP)
7. Registro del cierre en CRM Sinco (`adi_dtm_tramites`)
8. Notificación a Financiero para activar desembolso hipotecario

## Salidas / Entregables

- Escritura pública protocolizada
- Certificado de tradición y libertad actualizado
- Notificación a banco para desembolso
- Actualización en CRM Sinco

## Sistemas involucrados

- [x] CRM Sinco (`adi_dtm_tramites`, `adi_dtm_venta`)
- [x] Power BI / Fabric
- [x] Excel / SharePoint (documentos)
- [ ] Supabase IC
- [x] Teams / Outlook

## Puntos de falla conocidos

- Clientes que no están disponibles en la fecha de escritura
- Bancos que no envían instrucciones a tiempo
- ORIP con tiempos de registro variables (afecta el desembolso hipotecario)
- Subsidios con resoluciones vencidas que deben renovarse

## Indicadores del proceso

| KPI | Meta | Frecuencia de revisión |
|-----|------|------------------------|
| Escrituraciones completadas YTD vs PPTO | 100% | Mensual |
| Días promedio desde aprobación crédito → escritura | ≤ [por definir] días | Mensual |
| Escrituraciones represadas > 30 días con crédito aprobado | 0 | Mensual |

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
