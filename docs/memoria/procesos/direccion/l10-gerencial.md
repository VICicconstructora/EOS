---
tipo: proceso
version: 1.0
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: vigente
area: Direccion
frecuencia: semanal
---

# Proceso: Reunión L10 Gerencial

**Responsable:** [Juan Paulo McAllister](../../personas/juan-paulo-mcallister.md)
**Área:** Dirección General
**Frecuencia:** Semanal (90 minutos fijos, mismo día y hora)
**Tipo:** estratégico

## Objetivo

Revisar los KPIs del scorecard, identificar y resolver los issues más críticos del equipo gerencial, y mantener el pulso de avance de las ROCAs trimestrales, siguiendo el formato EOS L10.

## Entradas

- Scorecard actualizado (cada gerente actualiza sus métricas antes de la reunión)
- Lista de ROCAs del trimestre con estado de avance
- Lista de Issues acumulada desde la reunión anterior
- Agenda L10 estándar

## Agenda L10 (90 minutos)

| Minutos | Segmento |
|---------|---------|
| 0–5 | Check-in: buenas noticias personales y de negocios |
| 5–10 | Scorecard: revisar KPIs en rojo (sin debatir causas) |
| 10–20 | ROCAs: cada gerente reporta estado (en curso / en riesgo / completada) |
| 20–25 | Headlines de clientes y empleados (noticias buenas/malas) |
| 25–65 | IDS (Identificar, Discutir, Solucionar): top 3–5 issues más importantes |
| 65–85 | To-Dos: compromisos de la semana con dueño y fecha |
| 85–90 | Conclusión: calificación de la reunión (1–10) |

## Salidas / Entregables

- Lista de To-Dos actualizada (quién, qué, para cuándo)
- Issues resueltos o bajados al parking lot
- Scorecard con comentarios en los rojos
- Compromisos que se revisan en la siguiente L10

## Sistemas involucrados

- [x] Supabase IC (app Tracción: módulos Scorecard, Rocks, Issues, Meetings L10)
- [x] Teams (videoconferencia si hay gerentes remotos)
- [x] Outlook (convocatoria semanal fija)

## Puntos de falla conocidos

- Gerentes que llegan sin el scorecard actualizado
- Reuniones que se extienden por debatir causas en lugar de soluciones
- Issues que se repiten semana tras semana sin resolverse
- Cancelaciones frecuentes que rompen el ritmo

## Indicadores del proceso

| KPI | Meta | Frecuencia de revisión |
|-----|------|------------------------|
| Reuniones realizadas vs programadas | 100% (no cancelar) | Semanal |
| To-Dos completados a tiempo (%) | ≥ 80% | Semanal |
| Calificación promedio de la reunión | ≥ 8/10 | Semanal |
| Issues resueltos vs arrastrados | Tendencia creciente | Mensual |

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
