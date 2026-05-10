---
tipo: proceso
version: 1.0
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: vigente
area: Control
frecuencia: continuo
---

# Proceso: Posventas y Garantías

**Responsable:** [Marcela Arroyave](../../personas/marcela-arroyave.md)
**Área:** Control
**Frecuencia:** Continuo; reporte mensual
**Tipo:** operativo

## Objetivo

Gestionar y resolver las reclamaciones de clientes post-entrega dentro de los plazos de garantía establecidos por ley (Ley 1480 y NSR-10), preservando la reputación de IC Constructora.

## Entradas

- Solicitud de posventa del propietario (correo, Teams, formulario)
- Protocolo de entrega de la unidad (acta de entrega con puntos de garantía pendientes)
- Dictamen técnico del inspector de calidad
- Disponibilidad de cuadrilla o contratista de garantías

## Pasos

1. Recepción y registro de la solicitud en sistema [por definir — app Tracción módulo posventas]
2. Clasificación: garantía de IC / defecto de uso / daño por tercero
3. Visita técnica e inspección en un plazo de [por definir] días
4. Dictamen y plan de reparación
5. Programación de la intervención
6. Ejecución de la reparación
7. Cierre con firma del propietario confirmando conformidad
8. Registro del caso cerrado

## Salidas / Entregables

- Ticket de posventa registrado y cerrado
- Acta de conformidad firmada por el propietario
- Reporte mensual de posventas por proyecto (cantidad, tipo, costo)

## Sistemas involucrados

- [ ] CRM Sinco
- [x] Supabase IC (módulo posventas en app Tracción — pendiente de verificar)
- [x] Excel / SharePoint
- [x] Teams / Outlook

## Puntos de falla conocidos

- Propietarios que reportan problemas que no son garantía de IC
- Cuadrillas de garantías sin disponibilidad inmediata
- Casos que escalan a SIC o proceso legal sin gestión previa de IC

## Indicadores del proceso

| KPI | Meta | Frecuencia de revisión |
|-----|------|------------------------|
| Tiempo promedio de cierre (días) | ≤ [por definir] días | Mensual |
| Solicitudes cerradas vs abiertas (%) | ≥ 80% | Mensual |
| Casos que escalan a queja SIC | 0 | Mensual |

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
