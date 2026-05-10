---
tipo: proceso
version: 1.0
creado: 2026-05-09
ultima_actualizacion: 2026-05-09
actualizado_por: JPM
estado: vigente
area: Juridico
frecuencia: por-evento
---

# Proceso: Gestión de Litigios

**Responsable:** [Nataly Vinchira](../../personas/nataly-vinchira.md)
**Área:** Jurídico
**Frecuencia:** Por evento (apertura de cada caso); reporte mensual al CEO
**Tipo:** operativo

## Objetivo

Gestionar los casos legales activos de IC Constructora (demandas, quejas SIC, conciliaciones) minimizando el riesgo económico y reputacional de la empresa.

## Entradas

- Notificación de demanda, queja o proceso (notaría, SIC, juzgado)
- Documentación del caso (contrato, actas, promesas)
- Dictamen técnico si hay daños (Control)
- Historial del cliente (CRM Sinco)

## Pasos

1. Recepción y registro del caso en [casos-legales.md del proyecto correspondiente]
2. Clasificación: demanda judicial / queja SIC / conciliación / proceso escrituración bloqueada
3. Asignación a abogado responsable (interno o externo)
4. Revisión de documentación y estrategia de defensa
5. Notificación al CEO y al área involucrada
6. Seguimiento a fechas procesales y vencimientos
7. Gestión de conciliación si es viable (coordinado con CEO)
8. Cierre del caso: favorable / desfavorable / conciliado
9. Actualización del archivo de casos legales

## Salidas / Entregables

- Registro actualizado en el archivo de casos legales del proyecto
- Reporte mensual al CEO (número de casos, valor de pretensiones, estado)
- Acuerdo de conciliación firmado (si aplica)
- Sentencia o resolución (si el caso llega a fallo)

## Sistemas involucrados

- [x] Excel / SharePoint (expedientes)
- [ ] Supabase IC (módulo Jurídico en app Tracción)
- [x] Teams / Outlook
- [ ] CRM Sinco

## Puntos de falla conocidos

- Notificaciones que llegan tarde o a dirección incorrecta
- Casos de posventas que escalan a SIC sin pasar por Control primero
- Falta de documentación del caso original (contratos no encontrados)

## Indicadores del proceso

| KPI | Meta | Frecuencia de revisión |
|-----|------|------------------------|
| Casos activos (número) | Tendencia decreciente | Mensual |
| Valor de pretensiones activas ($) | < [por definir] | Mensual |
| Casos resueltos favorablemente (%) | [por definir] | Mensual |
| Vencimientos procesales perdidos | 0 | Mensual |

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-05-09 | Creación inicial | JPM |
