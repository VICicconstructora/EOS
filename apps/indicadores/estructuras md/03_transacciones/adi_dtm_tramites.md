# `adi_dtm_tramites`

> **Power BI:** `ADI_DTM TramitesMc`  ·  **Rol:** Hecho transaccional  ·  **Filas:** 186,322  ·  **Columnas:** 27

## Propósito

Trámites legales y operativos asociados a cada venta (escrituración, hipoteca, subsidios, etc.).

## Reglas de Negocio (¡IMPORTANTE!)

*   **Generación "Árbol de Trámites":** Cuando un cliente hace una separación, adquiere un plan de pagos. Dependiendo estrechamente de la marcación de **Subsidios**, Sinco genera dinámicamente las filas de trámites a cumplir. Toma el primer hito ("**ODSE**") asociado a la fecha de separación, y desde allí desencadena un árbol cronológico. **Atención:** El `Tipo de Venta` por sí solo NO determina el árbol a utilizar, ya que no especifica si tiene subsidios o no; para que el flujo jurídico sea correcto, el requerimiento de subsidio (y la recolección de sus pasos burocráticos adicionales) es el discriminador esencial en la creación del árbol.
*   **Inmutabilidad de las Fechas:** Las fechas originales programadas ("Fecha Programada") **NUNCA** se modifican en el sistema, nacen petrificadas en la separación. (Actualidad: El negocio está ideando modelos externos para crear fechas "Reales proyectadas" ante desvíos).
*   **Validación de Éxito:** Un trámite se considera 100% COMPLETADO única y exclusivamente si `"Fecha Cumplimiento" IS NOT NULL`.
*   **El proceso de "Bloqueo" (`bloqueo = 1`):** Cuando una venta pacta sus pagos y trámites, la venta se **bloquea** para continuar su ciclo lógico validado. Si un asesor necesita modificar algo, la venta debe "desbloquearse", cambiarse y volverse a bloquear de inmediato. Al ser un proceso diario, **alertar sobre ventas "Desbloqueadas" es crítico**, ya que indica una inconsistencia humana que quedó abierta.
*   **Gestión de Desistimientos (Caídas):** Las ventas desistidas no están aquí; Sinco purga estas tablas y los trámites inyectados pasan a repositorios de "desistidostramites".

## Descripción

La tabla transaccional de pasos. Permite hacer seguimiento de cuellos de botella e informes logísticos.

## Columnas clave

- `idventa` — FK a la venta original (que define el árbol).
- `"Codigo Tramite" / "Descripcion Tramite"` — Tipo de trámite (El 'ODSE' es el disparador inicial).
- `"Fecha Programada" / "Fecha Cumplimiento"` — Meta vs Realidad (Cierre duro).
- `bloqueo` — Bandera (0/1) que indica certidumbre de aprobación.

## Relaciones

**FKs salientes (esta tabla referencia a):**

- `adi_dtm_tramites.idventa` → `adi_dtm_venta.idventa` — Venta a la que aplica el trámite.

## Preguntas típicas que responde

- ¿Cuántas ventas amanecieron hoy en estado de "Desbloqueo" (`bloqueo = 0`) siendo un riesgo operativo?
- ¿Cuáles trámites tienen `"Fecha Cumplimiento"` nula y ya pasaron su `"Fecha Programada"` original?

## Esquema completo (27 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `idempresa` | `int4` | Sí |
| 2 | `nombreempresa` | `varchar` | Sí |
| 3 | `nombreproyecto` | `varchar` | Sí |
| 4 | `nombremacroproyecto` | `varchar` | Sí |
| 5 | `idventa` | `int4` | Sí |
| 6 | `idproyecto` | `int4` | Sí |
| 7 | `Descripcion Tramite` | `varchar` | Sí |
| 8 | `Codigo Tramite` | `varchar` | Sí |
| 9 | `Fecha Cumplimiento` | `timestamp` | Sí |
| 10 | `Fecha Programada` | `timestamp` | Sí |
| 11 | `Obs Cumplimiento` | `text` | Sí |
| 12 | `Obs Programada` | `text` | Sí |
| 13 | `Usu Responsable` | `text` | Sí |
| 14 | `otrosi` | `int2` | Sí |
| 15 | `observacionseguimiento` | `varchar` | Sí |
| 16 | `usuarioseguimiento` | `varchar` | Sí |
| 17 | `fechaseguimiento` | `timestamp` | Sí |
| 18 | `usuariocumplimiento` | `varchar` | Sí |
| 19 | `fechacreacion` | `timestamp` | Sí |
| 20 | `idmacroproyecto` | `int4` | Sí |
| 21 | `compradornombre` | `varchar` | Sí |
| 22 | `compradordocumento` | `varchar` | Sí |
| 23 | `codigointerno` | `varchar` | Sí |
| 24 | `estadotramite` | `varchar` | Sí |
| 25 | `fecharealcumplimiento` | `timestamp` | Sí |
| 26 | `usurealcumplimiento` | `varchar` | Sí |
| 27 | `bloqueo` | `int2` | Sí |

---

[← Volver al índice](../README.md)