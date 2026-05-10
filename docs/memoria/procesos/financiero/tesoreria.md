---
tipo: proceso
version: 1.0
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: vigente
area: Financiero
frecuencia: semanal
---

# Proceso: Gestión de Tesorería

**Responsable:** [Juan José Leal](../../personas/juan-jose-leal.md)
**Área:** Financiero
**Frecuencia:** Proyección semanal; pagos según calendario
**Tipo:** operativo

## Objetivo

Mantener el flujo de caja positivo en todas las cuentas de IC Constructora, programar pagos a contratistas y proveedores, y coordinar los desembolsos de las fiducias.

## Entradas

- Actas de obra aprobadas (para pago a contratistas)
- Órdenes de pago de proveedores (Control)
- Programación de nómina (RRHH)
- Desembolsos de fiducia (según cortes de obra)
- Desembolsos hipotecarios y subsidios (Experiencia / Jurídico)
- Cuotas iniciales recibidas de clientes (cartera pre-escritura)

## Pasos

1. Proyección de flujo de caja semanal (entradas vs salidas de los próximos 30 días)
2. Programación del calendario de pagos (contratistas, proveedores, nómina)
3. Solicitud de liberación de recursos a fiducias (con acta de corte aprobada)
4. Seguimiento a desembolsos hipotecarios pendientes (coordinado con Experiencia)
5. Ejecución de transferencias y pagos
6. Actualización de saldos por cuenta y por proyecto
7. Alerta al CEO si alguna cuenta cae por debajo del umbral de seguridad

## Salidas / Entregables

- Flujo de caja proyectado a 30 días (Excel / Power BI)
- Calendario de pagos de la semana
- Confirmación de desembolsos recibidos

## Sistemas involucrados

- [x] Excel / SharePoint
- [x] Power BI / Fabric
- [ ] CRM Sinco
- [ ] Supabase IC
- [x] Teams / Outlook (coordinación con bancos y fiducias)

## Puntos de falla conocidos

- Fiducias que demoran la liberación de recursos aunque el acta esté aprobada
- Bancos con tiempos de procesamiento variables para desembolsos hipotecarios
- Subsidiosa veces demoran semanas en acreditar

## Indicadores del proceso

| KPI | Meta | Frecuencia de revisión |
|-----|------|------------------------|
| Días de cobertura de caja disponible | ≥ 30 días | Semanal |
| Pagos a contratistas en fecha comprometida | 100% | Mensual |
| Desembolsos hipotecarios gestionados vs pendientes | 0 represados | Mensual |

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
