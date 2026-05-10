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

# Proceso: Avance Físico y Cortes de Obra

**Responsable:** [Andrés Arango](../../personas/andres-arango.md)
**Área:** Construcción
**Frecuencia:** Corte mensual; programación intermedia semanal
**Tipo:** operativo

## Objetivo

Medir y reportar el avance físico real de cada proyecto, validar contra el cronograma y gestionar los cortes de obra que habilitan desembolsos de la fiducia.

## Entradas

- Cronograma maestro de obra (por director de proyecto)
- Programación intermedia semanal (look-ahead 3–6 semanas)
- Visita técnica de interventoría
- Acta de corte firmada por interventor y director de proyecto

## Pasos

1. Actualización del cronograma de programación intermedia (semanal, director de proyecto)
2. Visita de avance mensual (interventoría + Andrés Arango)
3. Medición de avance físico % por actividad
4. Elaboración del acta de corte mensual
5. Firma de acta por director, interventoría y Andrés Arango
6. Envío a fiducia para solicitud de desembolso (si corresponde)
7. Actualización del cronograma maestro
8. Reporte de avance en L10 gerencial (semáforo: verde / amarillo / rojo)

## Salidas / Entregables

- Acta de corte mensual firmada
- % de avance físico actualizado por proyecto
- Informe de desviación cronograma (días de adelanto / atraso)
- Solicitud de desembolso a fiducia (si hay corte aprobado)

## Sistemas involucrados

- [x] Excel / SharePoint (cronogramas de obra)
- [x] Power BI / Fabric
- [ ] CRM Sinco
- [ ] Supabase IC
- [x] Teams / Outlook

## Puntos de falla conocidos

- Interventorías que demoran la aprobación del acta
- Condiciones climáticas que afectan avance y no están en cronograma base
- Falta de materiales o personal que no se reporta oportunamente en la programación intermedia

## Indicadores del proceso

| KPI | Meta | Frecuencia de revisión |
|-----|------|------------------------|
| Avance físico real vs programado (%) | Diferencia < 5% | Mensual |
| Actas de corte aprobadas en plazo | 100% antes del día 10 | Mensual |
| Proyectos con atraso en ruta crítica > 15 días | 0 sin plan de acción | Mensual |

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
