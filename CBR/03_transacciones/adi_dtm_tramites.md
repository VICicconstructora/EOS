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
*   **CR vs CT — Dos tracks de crédito:** Una venta puede ser financiada vía **CR (Banco Constructor)** — el banco del constructor gestiona el crédito — o vía **CT (Tercero)** — el comprador gestiona su crédito con su propio banco. Ambos tienen sus propios códigos de radicación y aprobación. Nunca coexisten en la misma venta.

## Descripción

La tabla transaccional de pasos. Permite hacer seguimiento de cuellos de botella e informes logísticos.

## Columnas clave

- `idventa` — FK a la venta original (que define el árbol).
- `"Codigo Tramite" / "Descripcion Tramite"` — Tipo de trámite (El 'ODSE' es el disparador inicial).
- `"Fecha Programada" / "Fecha Cumplimiento"` — Meta vs Realidad (Cierre duro).
- `bloqueo` — Bandera (0/1) que indica certidumbre de aprobación.

## Catálogo de Códigos Relevantes

### Hitos de Francisco (Trámites) — pipeline principal

| Código | Descripción | Filas aprox. | Nota |
|--------|-------------|--------------|------|
| `ODSE` | *ORDEN DE SEPARACION | 2,682 | Disparador del árbol; fecha = separación |
| `TRGA` | *FIRMA PROMESA CLIENTE | 2,677 | KPI #1 Francisco |
| `TRGB` | FIRMA PROMESA RPL | 2,657 | Firma interna (Representante Legal) |
| `TREE` | ENVIO PROMESA PARA FIRMA DIGITAL | 2,657 | Paso previo a firma cliente |
| `TRCE` | *FECHA ESCRITURA PROGRAMADA EN PROMESA | 2,677 | Hito de fecha comprometida, no de ejecución |
| `TRFE` | *FECHA ENTREGA PROGRAMADA EN PROMESA | 2,676 | Hito de fecha de entrega comprometida |
| `ESEF` | *FIRMA ESCRITURA CLIENTE | 2,677 | KPI #6 Francisco — cierre del pipeline |
| `ESAN` | *ENVIO ORDEN ESCRITURA A NOTARIA | 2,677 | Paso previo a firma escritura |

### Crédito track CR — Banco Constructor

| Código | Descripción | Filas aprox. | Responsable |
|--------|-------------|--------------|-------------|
| `CRAR` | *CR RADICACION BANCO CONSTRUCTOR | 1,529 | Francisco — KPI #2 |
| `CRFA` | *CR APROBACION BANCO CONSTRUCTOR | 1,519 | Francisco — KPI #3 (carta de aprobación) |
| `CRDN` | *CR NEGACION CREDITO CONSTRUCTOR | 1,494 | Alerta: crédito negado |
| `CRVE` | *FECHA DE VENCIMIENTO CREDITO | 2,069 | Hito de fecha límite del crédito |
| `CRKA` | *CR SOLICITUD DESEMBOLSO CONSTRUCTOR | 1,479 | Nicolás (Cartera) |
| `CRKB` | *CR DESEMBOLSO CONSTRUCTOR | 1,480 | Nicolás (Cartera) |
| `CRIB` | *CR LEGALIZACION CONSTRUCTOR | 1,481 | Notaría |

### Crédito track CT — Tercero (banco del comprador)

| Código | Descripción | Filas aprox. | Responsable |
|--------|-------------|--------------|-------------|
| `CTAR` | *CT RADICACION TERCERO | 858 | Francisco — KPI #2 alternativo |
| `CTFA` | *CT APROBACION TERCERO | 891 | Francisco — KPI #3 alternativo (carta) |
| `CTKB` | *CT CARTA DE COMPROMISO | 801 | Paso intermedio pre-escritura |
| `CTDN` | *CT NEGACION TERCERO | 814 | Alerta: crédito negado |
| `CTMA` | *CT SOLICITUD DESEMBOLSO TERCERO | 798 | Nicolás (Cartera) |
| `CTMB` | *CT DESEMBOLSO TERCERO | 798 | Nicolás (Cartera) |
| `CTIB` | *CT LEGALIZACION TERCERO | 807 | Notaría |

> **Regla:** Una venta usa CR **o** CT, nunca los dos. Para KPIs de Francisco se debe combinar ambos tracks con `IN ('CRAR','CTAR')` y `IN ('CRFA','CTFA')`.

### Subsidios

| Código | Descripción | Filas aprox. | Track | Responsable |
|--------|-------------|--------------|-------|-------------|
| `SUAR` | *CCF RADICACION SUBSIDIO | 1,103 | CCF (cajas) | Francisco — KPI #4a |
| `SUEA` | *CCF APROBACION SUBSIDIO | 1,097 | CCF (cajas) | Francisco — KPI #5a (carta) |
| `SUCN` | *CCF NEGACION SUBSIDIO | 1,096 | CCF | Alerta |
| `SUVE` | *CCF VENCIMIENTO SUBSIDIO | 1,097 | CCF | Alerta de caducidad |
| `SUIB` | *CCF DESEMBOLSO SUBSIDIO | 1,096 | CCF | Nicolás (Cartera) |
| `OSAR` | *OS RECIBO RESOLUCION OTROS SUBSIDIOS | 1,094 | Fonvivienda/otros | Francisco — KPI #5b (resolución = carta) |
| `OSCA` | *OS SOLICITUD DESEMBOLSO OTROS SUBSIDIOS | 857 | Fonvivienda/otros | Nicolás (Cartera) |
| `OSCB` | *OS DESEMBOLSO OTROS SUBSIDIOS | 857 | Fonvivienda/otros | Nicolás (Cartera) |

> No toda venta tiene subsidio. El árbol SU*/OS* solo se genera si la venta fue marcada con subsidio en la separación.

### Alertas operativas

| Código | Descripción | Filas aprox. | Uso |
|--------|-------------|--------------|-----|
| `bloqueo = 0` | Venta desbloqueada (cualquier tramite) | Variable | Alerta crítica diaria — inconsistencia humana |
| `ODJA` | ENTREGA DE NEGOCIO POR COMERCIAL A TRAMITES | 2,645 | Marca el traspaso de Ventas a Francisco |
| `TRAA` | AUDITORIA NEGOCIOS TRAMITES | 2,532 | Auditoría interna de trámites |
| `ODAR` | *VALIDACION COMPLIANCE | 2,589 | Compliance/SARLAFT |

---

## KPIs de Francisco — Scorecard Semanal (SQL)

> **Schema:** `sinco_ic_raw`  ·  **Período:** ajustar `date_trunc` según la vista deseada

```sql
-- ============================================================
-- SCORECARD FRANCISCO — TRAMITES (semanal / mensual)
-- Completados = "Fecha Cumplimiento" IS NOT NULL
-- ============================================================

WITH periodo AS (
  -- Cambiar a date_trunc('week',...) para vista semanal
  SELECT date_trunc('month', CURRENT_DATE) AS inicio,
         CURRENT_DATE AS fin
),
base AS (
  SELECT
    t.idventa,
    t."Codigo Tramite",
    t."Descripcion Tramite",
    t."Fecha Cumplimiento",
    t."Fecha Programada",
    t.bloqueo,
    v.vtanombreproyecto,
    v.vtanombremacro
  FROM sinco_ic_raw.adi_dtm_tramites t
  JOIN sinco_ic_raw.adi_dtm_venta v ON v.idventa = t.idventa
)

SELECT
  -- 1. Promesas firmadas en el período
  COUNT(DISTINCT CASE
    WHEN "Codigo Tramite" = 'TRGA'
     AND "Fecha Cumplimiento" >= (SELECT inicio FROM periodo)
    THEN idventa END
  ) AS promesas_firmadas,

  -- 2. Radicaciones de crédito (CR + CT) en el período
  COUNT(DISTINCT CASE
    WHEN "Codigo Tramite" IN ('CRAR','CTAR')
     AND "Fecha Cumplimiento" >= (SELECT inicio FROM periodo)
    THEN idventa END
  ) AS creditos_radicados,

  -- 3. Aprobaciones de crédito (CR + CT) = cartas de aprobación
  COUNT(DISTINCT CASE
    WHEN "Codigo Tramite" IN ('CRFA','CTFA')
     AND "Fecha Cumplimiento" >= (SELECT inicio FROM periodo)
    THEN idventa END
  ) AS creditos_aprobados,

  -- 4. Radicaciones subsidio CCF en el período
  COUNT(DISTINCT CASE
    WHEN "Codigo Tramite" = 'SUAR'
     AND "Fecha Cumplimiento" >= (SELECT inicio FROM periodo)
    THEN idventa END
  ) AS subsidios_radicados_ccf,

  -- 5. Aprobaciones subsidio (CCF + Fonvivienda/otros) = cartas
  COUNT(DISTINCT CASE
    WHEN "Codigo Tramite" IN ('SUEA','OSAR')
     AND "Fecha Cumplimiento" >= (SELECT inicio FROM periodo)
    THEN idventa END
  ) AS subsidios_aprobados,

  -- 6. Escrituras firmadas por cliente en el período
  COUNT(DISTINCT CASE
    WHEN "Codigo Tramite" = 'ESEF'
     AND "Fecha Cumplimiento" >= (SELECT inicio FROM periodo)
    THEN idventa END
  ) AS escrituras_firmadas,

  -- ALERTA: brecha crédito (radicados sin aprobación, todos los tiempos)
  COUNT(DISTINCT CASE
    WHEN "Codigo Tramite" IN ('CRAR','CTAR')
     AND "Fecha Cumplimiento" IS NOT NULL
    THEN idventa END
  ) - COUNT(DISTINCT CASE
    WHEN "Codigo Tramite" IN ('CRFA','CTFA')
     AND "Fecha Cumplimiento" IS NOT NULL
    THEN idventa END
  ) AS creditos_pendientes_respuesta,

  -- ALERTA: brecha subsidio CCF (radicados sin aprobación, todos los tiempos)
  COUNT(DISTINCT CASE
    WHEN "Codigo Tramite" = 'SUAR'
     AND "Fecha Cumplimiento" IS NOT NULL
    THEN idventa END
  ) - COUNT(DISTINCT CASE
    WHEN "Codigo Tramite" = 'SUEA'
     AND "Fecha Cumplimiento" IS NOT NULL
    THEN idventa END
  ) AS subsidios_ccf_pendientes_respuesta,

  -- ALERTA: ventas desbloqueadas hoy (riesgo operativo)
  COUNT(DISTINCT CASE
    WHEN bloqueo = 0 THEN idventa END
  ) AS ventas_desbloqueadas

FROM base;
```

### Desglose por proyecto (agregar si se necesita por macroproyecto)

```sql
-- Misma lógica pero agrupada por proyecto
WITH periodo AS (
  SELECT date_trunc('month', CURRENT_DATE) AS inicio
),
base AS (
  SELECT t.idventa, t."Codigo Tramite", t."Fecha Cumplimiento", v.vtanombremacro, v.vtanombreproyecto
  FROM sinco_ic_raw.adi_dtm_tramites t
  JOIN sinco_ic_raw.adi_dtm_venta v ON v.idventa = t.idventa
)
SELECT
  vtanombremacro,
  vtanombreproyecto,
  COUNT(DISTINCT CASE WHEN "Codigo Tramite" = 'TRGA'             AND "Fecha Cumplimiento" >= (SELECT inicio FROM periodo) THEN idventa END) AS promesas,
  COUNT(DISTINCT CASE WHEN "Codigo Tramite" IN ('CRAR','CTAR')   AND "Fecha Cumplimiento" >= (SELECT inicio FROM periodo) THEN idventa END) AS cred_radicados,
  COUNT(DISTINCT CASE WHEN "Codigo Tramite" IN ('CRFA','CTFA')   AND "Fecha Cumplimiento" >= (SELECT inicio FROM periodo) THEN idventa END) AS cred_aprobados,
  COUNT(DISTINCT CASE WHEN "Codigo Tramite" IN ('SUEA','OSAR')   AND "Fecha Cumplimiento" >= (SELECT inicio FROM periodo) THEN idventa END) AS subsidios_aprobados,
  COUNT(DISTINCT CASE WHEN "Codigo Tramite" = 'ESEF'             AND "Fecha Cumplimiento" >= (SELECT inicio FROM periodo) THEN idventa END) AS escrituras
FROM base
GROUP BY 1, 2
ORDER BY 1, 2;
```

---

## Relaciones

**FKs salientes (esta tabla referencia a):**

- `adi_dtm_tramites.idventa` → `adi_dtm_venta.idventa` — Venta a la que aplica el trámite.

## Preguntas típicas que responde

- ¿Cuántas ventas amanecieron hoy en estado de "Desbloqueo" (`bloqueo = 0`) siendo un riesgo operativo?
- ¿Cuáles trámites tienen `"Fecha Cumplimiento"` nula y ya pasaron su `"Fecha Programada"` original?
- ¿Cuántas escrituras firmó el cliente este mes?
- ¿Cuántos créditos radicados no tienen aún aprobación (presión al banco)?

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
