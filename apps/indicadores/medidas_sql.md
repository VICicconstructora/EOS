# Medidas DAX → SQL: Modelo CBR — IC Constructora

**Fuente:** Modelo semántico CBR (Power BI / Fabric, workspace InfVIC)  
**Medidas totales en modelo:** 306  
**Generado:** Mayo 2026

---

## Convenciones SQL

```sql
-- Schema obligatorio para todas las tablas
schema: sinco_ic_raw

-- Nombres de tabla: siempre minúsculas, sin espacios
sinco_ic_raw.adi_dtm_venta
sinco_ic_raw.adi_dtm_tramites
sinco_ic_raw.adi_dtm_acuerdos_pago
sinco_ic_raw.adi_dtm_relacion_pagos
sinco_ic_raw.adi_dtm_desistimientosventa
sinco_ic_raw.adi_dtm_inventarios
sinco_ic_raw.adi_dtm_proyectos
sinco_ic_raw.adi_dtm_macroproyectos
sinco_ic_raw.adi_dtm_comprador
sinco_ic_raw.adi_dtm_conceptospp
sinco_ic_raw.adi_dtm_tiposventa
```

**Reglas críticas que aplican a TODAS las medidas:**

| Regla | Aplicación |
|-------|-----------|
| Valor de venta = `valorneto` | Nunca usar `subtotal`, `escrituravalor` ni sumas de acuerdos |
| Fecha oficial de cierre = `fechaventa` | No `fechaseparacion` ni `vtafechareal` para asignación mes/año |
| Ventas activas = `adi_dtm_venta` | Ignorar desistimientos salvo que se pida Venta Bruta |
| Venta Bruta = `adi_dtm_venta` UNION `adi_dtm_desistimientosventa` | Solo si el usuario pide histórico o brutas |
| Cartera: solo conceptos que afectan = `afectaconceptopp = 1` | Al cruzar con `adi_dtm_conceptospp` |
| Filtro por proyecto: usar `prycodigoproyecto` (código numérico) | Más fiable que nombre |
| VIS (`pryvis = 'S'`): permite subsidios | Non-VIS no puede tener subsidios en cartera |

---

## 1. McCo — Comercial (≈ 25 medidas)

Ventas activas, velocidad comercial, precio promedio, inventario.

### McCoValorVentas
Valor total de ventas netas activas.
```sql
SELECT
    vtanombreproyecto,
    SUM(valorneto) AS mccovalorventas
FROM sinco_ic_raw.adi_dtm_venta
GROUP BY vtanombreproyecto;
```

### McCoValorVentasYTD
Ventas netas acumuladas en el año en curso.
```sql
SELECT
    vtanombreproyecto,
    SUM(valorneto) AS mccovalorventas_ytd
FROM sinco_ic_raw.adi_dtm_venta
WHERE EXTRACT(YEAR FROM fechaventa) = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY vtanombreproyecto;
```

### McCoValorVentasMTD
Ventas netas en el mes en curso.
```sql
SELECT
    vtanombreproyecto,
    SUM(valorneto) AS mccovalorventas_mtd
FROM sinco_ic_raw.adi_dtm_venta
WHERE DATE_TRUNC('month', fechaventa) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY vtanombreproyecto;
```

### McCoValorPromedio
Ticket promedio por negocio activo.
```sql
SELECT
    vtanombreproyecto,
    AVG(valorneto) AS mccovalorpromedio
FROM sinco_ic_raw.adi_dtm_venta
GROUP BY vtanombreproyecto;
```

### McCoUnidadesSeparadas
Conteo de negocios activos (unidades principales vendidas).
```sql
SELECT
    vtanombreproyecto,
    COUNT(DISTINCT idventa) AS mccounidadesseparadas
FROM sinco_ic_raw.adi_dtm_venta
WHERE unidadppal = 1   -- solo unidad principal, no anexos
GROUP BY vtanombreproyecto;
```

### McCoUnidadesSeparadasMes
Negocios nuevos en un mes dado.
```sql
SELECT
    TO_CHAR(fechaventa, 'YYYY-MM') AS mes,
    vtanombreproyecto,
    COUNT(DISTINCT idventa) AS mccounidadesseparadas_mes
FROM sinco_ic_raw.adi_dtm_venta
WHERE unidadppal = 1
GROUP BY 1, 2
ORDER BY 1;
```

### McCoUnidadesParaCredito
Negocios que van a crédito (tipoventa = 'Crédito' o 'Crédito Tercero').
```sql
SELECT
    v.vtanombreproyecto,
    COUNT(DISTINCT v.idventa) AS mccounidadesparacredito
FROM sinco_ic_raw.adi_dtm_venta v
JOIN sinco_ic_raw.adi_dtm_tiposventa tv ON tv.codtipovta::text = v.tipo
WHERE tv.desctipovta ILIKE '%crédito%'
GROUP BY v.vtanombreproyecto;
```

### McCoUnidadesParaFiducia
Negocios recibidos por la fiduciaria (pendientes de punto de equilibrio).
```sql
-- Unidades vendidas en proyectos que aún no han alcanzado punto de equilibrio
SELECT
    v.vtanombreproyecto,
    COUNT(DISTINCT v.idventa) AS mccounidadesparafiducia
FROM sinco_ic_raw.adi_dtm_venta v
JOIN sinco_ic_raw.adi_dtm_proyectos p ON p.prycodigoproyecto = v.idproyecto
WHERE p.pryfechapuntoequilibrioreal IS NULL   -- equilibrio no alcanzado aún
  AND v.unidadppal = 1
GROUP BY v.vtanombreproyecto;
```

### McCoUnidadesMaxParaInicio
Threshold de unidades para iniciar obra (punto de equilibrio comercial).
```sql
-- Este valor es un parámetro por proyecto, no una suma transaccional.
-- Se consulta directamente de la tabla de proyectos o del presupuesto Mc1.
-- Aproximación desde proyectos:
SELECT
    prynombreproyecto,
    pryfechapuntoequilibriofin,
    pryfechapuntoequilibrioreal
FROM sinco_ic_raw.adi_dtm_proyectos
ORDER BY prynombreproyecto;
```

### McCoM2
Área total vendida (m²).
```sql
SELECT
    vtanombreproyecto,
    SUM(area) AS mccom2
FROM sinco_ic_raw.adi_dtm_venta
WHERE unidadppal = 1
GROUP BY vtanombreproyecto;
```

### McCoValorM2Promedio
Precio promedio por m² de las unidades vendidas.
```sql
SELECT
    vtanombreproyecto,
    SUM(valorneto) / NULLIF(SUM(area), 0) AS mccovalorm2promedio
FROM sinco_ic_raw.adi_dtm_venta
WHERE unidadppal = 1 AND area > 0
GROUP BY vtanombreproyecto;
```

### McCoDesistidoNeto
Negocios caídos (desistimientos) en el período.
```sql
SELECT
    nombreproyecto,
    COUNT(DISTINCT idventa) AS mccodesistido_conteo,
    SUM(valorventa)         AS mccodesistido_valor
FROM sinco_ic_raw.adi_dtm_desistimientosventa
GROUP BY nombreproyecto;
```

### McCoDesistidoFechaDesistimiento
Desistimientos por fecha de caída (para curva mes a mes).
```sql
SELECT
    TO_CHAR(fecha, 'YYYY-MM') AS mes_desistimiento,
    nombreproyecto,
    COUNT(DISTINCT idventa)   AS desistidos
FROM sinco_ic_raw.adi_dtm_desistimientosventa
GROUP BY 1, 2
ORDER BY 1;
```

### McCoVentaNeta
Ventas brutas menos desistimientos del período (unidades).
```sql
WITH ventas AS (
    SELECT TO_CHAR(fechaventa, 'YYYY-MM') AS mes, COUNT(DISTINCT idventa) AS cnt
    FROM sinco_ic_raw.adi_dtm_venta WHERE unidadppal = 1
    GROUP BY 1
),
desistidos AS (
    SELECT TO_CHAR(fecha, 'YYYY-MM') AS mes, COUNT(DISTINCT idventa) AS cnt
    FROM sinco_ic_raw.adi_dtm_desistimientosventa
    GROUP BY 1
)
SELECT v.mes, v.cnt - COALESCE(d.cnt, 0) AS venta_neta
FROM ventas v
LEFT JOIN desistidos d USING (mes)
ORDER BY 1;
```

### McCoIndiceGini
Índice de concentración de ingresos de compradores (0 = perfecta igualdad, 1 = máxima concentración).
```sql
-- Gini sobre compradoringresosmensuales de compradores activos
WITH ingresos AS (
    SELECT c.compradoringresosmensuales AS ing
    FROM sinco_ic_raw.adi_dtm_venta v
    JOIN sinco_ic_raw.adi_dtm_comprador c ON c.idcomprador = v.idcomprador
    WHERE c.compradoringresosmensuales > 0
    ORDER BY ing
),
ranked AS (
    SELECT ing,
           ROW_NUMBER() OVER () AS rk,
           COUNT(*) OVER ()     AS n,
           SUM(ing) OVER ()     AS total
    FROM ingresos
)
SELECT
    (2.0 * SUM(rk * ing) / (n * total) - (n + 1.0) / n) AS gini
FROM ranked
GROUP BY n, total;
```

### McCoVelocidadVentas
Unidades vendidas por mes (promedio rolling últimos 3 meses).
```sql
WITH mensual AS (
    SELECT DATE_TRUNC('month', fechaventa) AS mes,
           COUNT(DISTINCT idventa) AS unidades
    FROM sinco_ic_raw.adi_dtm_venta
    WHERE unidadppal = 1
    GROUP BY 1
)
SELECT mes,
       unidades,
       AVG(unidades) OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS velocidad_3m
FROM mensual
ORDER BY mes;
```

### McCoInventarioDisponible
Unidades del inventario sin venta asignada.
```sql
SELECT
    i.invnombreproyecto,
    COUNT(*) AS inventario_disponible
FROM sinco_ic_raw.adi_dtm_inventarios i
WHERE i.codventa IS NULL
  AND i.invundppalventa = 1   -- solo unidades principales
GROUP BY i.invnombreproyecto;
```

### McCoInventarioPrecioPromedio
Precio promedio de lista del inventario disponible.
```sql
SELECT
    invnombreproyecto,
    AVG(invvalorunidadlistavigente) AS precio_promedio_lista
FROM sinco_ic_raw.adi_dtm_inventarios
WHERE codventa IS NULL AND invundppalventa = 1
GROUP BY invnombreproyecto;
```

---

## 2. McGn — General (≈ 15 medidas)

Estado del ciclo de vida de cada unidad: separación → promesa → escritura → entrega.

### McGnUnidadesSeparadas
Unidades con negocio activo (equivalente global a McCoUnidadesSeparadas sin filtro de proyecto).
```sql
SELECT COUNT(DISTINCT idventa) AS mcgnunidadesseparadas
FROM sinco_ic_raw.adi_dtm_venta
WHERE unidadppal = 1;
```

### McGnUnidadesPrometidas
Unidades con promesa de compraventa firmada.
```sql
-- La promesa se registra en trámites con código TRGA o mediante fechaseparacion no nula en venta
SELECT
    v.vtanombreproyecto,
    COUNT(DISTINCT v.idventa) AS mcgnunidadessprometidas
FROM sinco_ic_raw.adi_dtm_venta v
WHERE v.fechaseparacion IS NOT NULL
  AND v.unidadppal = 1
GROUP BY v.vtanombreproyecto;
```

### McGnUnidadesEscrituradas
Unidades con escritura firmada.
```sql
SELECT
    vtanombreproyecto,
    COUNT(DISTINCT idventa) AS mcgnunidadesescriturasdas
FROM sinco_ic_raw.adi_dtm_venta
WHERE escriturafecha IS NOT NULL
  AND unidadppal = 1
GROUP BY vtanombreproyecto;
```

### McGnUnidadesEntregadas
Unidades entregadas al comprador (trámite de entrega cumplido).
```sql
SELECT
    t.nombreproyecto,
    COUNT(DISTINCT t.idventa) AS mcgnunidadesentregadas
FROM sinco_ic_raw.adi_dtm_tramites t
WHERE t."Codigo Tramite" IN ('ENTE', 'ENTU')   -- códigos de entrega
  AND t."Fecha Cumplimiento" IS NOT NULL
GROUP BY t.nombreproyecto;
```

### McGnUnidadesDesistidas
Unidades caídas históricamente.
```sql
SELECT
    nombreproyecto,
    COUNT(DISTINCT idventa) AS mcgnunidadesdesistidas
FROM sinco_ic_raw.adi_dtm_desistimientosventa
GROUP BY nombreproyecto;
```

### McGnVentasInventario
Vista combinada: valor vendido + valor de inventario disponible (potencial total del proyecto).
```sql
WITH vendido AS (
    SELECT
        v.vtanombreproyecto AS proyecto,
        SUM(v.valorneto)    AS valor_vendido,
        COUNT(DISTINCT v.idventa) AS unidades_vendidas
    FROM sinco_ic_raw.adi_dtm_venta v
    WHERE v.unidadppal = 1
    GROUP BY 1
),
disponible AS (
    SELECT
        i.invnombreproyecto AS proyecto,
        SUM(i.invvalorunidadlistavigente) AS valor_inventario,
        COUNT(*)                          AS unidades_disponibles
    FROM sinco_ic_raw.adi_dtm_inventarios i
    WHERE i.codventa IS NULL AND i.invundppalventa = 1
    GROUP BY 1
)
SELECT
    COALESCE(v.proyecto, d.proyecto)   AS proyecto,
    COALESCE(v.valor_vendido, 0)       AS valor_vendido,
    COALESCE(d.valor_inventario, 0)    AS valor_inventario,
    COALESCE(v.unidades_vendidas, 0)   AS unidades_vendidas,
    COALESCE(d.unidades_disponibles,0) AS unidades_disponibles
FROM vendido v
FULL OUTER JOIN disponible d USING (proyecto);
```

### McGnInventarioUnidadesPrincipales
Conteo de unidades principales (sin anexos) en el inventario total.
```sql
SELECT
    invnombreproyecto,
    COUNT(*) FILTER (WHERE codventa IS NULL)     AS disponibles,
    COUNT(*) FILTER (WHERE codventa IS NOT NULL) AS vendidas,
    COUNT(*)                                     AS total
FROM sinco_ic_raw.adi_dtm_inventarios
WHERE invundppalventa = 1
GROUP BY invnombreproyecto;
```

### McGnValorTotalProyecto
Valor total de cada proyecto (vendido + inventario disponible).
```sql
SELECT
    i.invnombreproyecto                                                AS proyecto,
    SUM(CASE WHEN i.codventa IS NOT NULL THEN i.invvalorunidad
             ELSE i.invvalorunidadlistavigente END)                    AS valor_total_proyecto
FROM sinco_ic_raw.adi_dtm_inventarios i
WHERE i.invundppalventa = 1
GROUP BY i.invnombreproyecto;
```

### McGnPorcentajeVendido
Porcentaje de unidades vendidas sobre total del proyecto.
```sql
SELECT
    invnombreproyecto,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE codventa IS NOT NULL) / NULLIF(COUNT(*), 0),
    1) AS pct_vendido
FROM sinco_ic_raw.adi_dtm_inventarios
WHERE invundppalventa = 1
GROUP BY invnombreproyecto;
```

---

## 3. McCa — Cartera (≈ 27 medidas)

Análisis de aging, mora, recaudo pactado vs pagado.

> **Método "Foto" (simple):** usa `mora_dias` / `mora_saldo` de `adi_dtm_acuerdos_pago` directamente.  
> **Método "Película" (preciso):** cruza `adi_dtm_acuerdos_pago` con `adi_dtm_relacion_pagos` por fecha.  
> Las consultas siguientes usan el método "Foto" salvo indicación. Para producción usar método "Película".

### McCaIngresosPactados
Total pactado en planes de pago (solo conceptos que afectan balance).
```sql
SELECT
    ap.vtanombreproyecto,
    SUM(ap.pactado) AS mcca_pactado
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1
GROUP BY ap.vtanombreproyecto;
```

### McCaIngresosPagados
Total efectivamente pagado (fuente: `relacion_pagos`, la caja real).
```sql
SELECT
    rp.nombreproyecto,
    SUM(rp.neto) AS mcca_pagado
FROM sinco_ic_raw.adi_dtm_relacion_pagos rp
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = rp.idconcepto
WHERE c.afectaconceptopp = 1
GROUP BY rp.nombreproyecto;
```

### McCaSaldo
Saldo pendiente (pactado - pagado por concepto).
```sql
SELECT
    ap.vtanombreproyecto,
    SUM(ap.saldo) AS mcca_saldo
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1
GROUP BY ap.vtanombreproyecto;
```

### McCaCartera1a30
Saldo en mora entre 1 y 30 días.
```sql
SELECT
    ap.vtanombreproyecto,
    SUM(ap.mora_saldo) AS cartera_1a30
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1
  AND ap.mora_dias BETWEEN 1 AND 30
GROUP BY ap.vtanombreproyecto;
```

### McCaCartera31a60
```sql
SELECT vtanombreproyecto, SUM(mora_saldo) AS cartera_31a60
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1 AND ap.mora_dias BETWEEN 31 AND 60
GROUP BY vtanombreproyecto;
```

### McCaCartera61a90
```sql
SELECT vtanombreproyecto, SUM(mora_saldo) AS cartera_61a90
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1 AND ap.mora_dias BETWEEN 61 AND 90
GROUP BY vtanombreproyecto;
```

### McCaCartera91a120
```sql
SELECT vtanombreproyecto, SUM(mora_saldo) AS cartera_91a120
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1 AND ap.mora_dias BETWEEN 91 AND 120
GROUP BY vtanombreproyecto;
```

### McCaCarteraMas120
```sql
SELECT vtanombreproyecto, SUM(mora_saldo) AS cartera_mas120
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1 AND ap.mora_dias > 120
GROUP BY vtanombreproyecto;
```

### McCaResumenAging
Vista completa de aging en una sola consulta.
```sql
SELECT
    ap.vtanombreproyecto,
    SUM(CASE WHEN ap.mora_dias BETWEEN 1  AND 30  THEN ap.mora_saldo ELSE 0 END) AS c_1a30,
    SUM(CASE WHEN ap.mora_dias BETWEEN 31 AND 60  THEN ap.mora_saldo ELSE 0 END) AS c_31a60,
    SUM(CASE WHEN ap.mora_dias BETWEEN 61 AND 90  THEN ap.mora_saldo ELSE 0 END) AS c_61a90,
    SUM(CASE WHEN ap.mora_dias BETWEEN 91 AND 120 THEN ap.mora_saldo ELSE 0 END) AS c_91a120,
    SUM(CASE WHEN ap.mora_dias > 120              THEN ap.mora_saldo ELSE 0 END) AS c_mas120,
    SUM(ap.mora_saldo)                                                            AS mora_total
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1
  AND ap.mora_dias > 0
GROUP BY ap.vtanombreproyecto;
```

### McCaCuotasEnMora
Número de cuotas vencidas sin pagar.
```sql
SELECT
    ap.vtanombreproyecto,
    COUNT(*) AS cuotas_en_mora
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1
  AND ap.mora_dias > 0
  AND ap.saldo > 0
GROUP BY ap.vtanombreproyecto;
```

### McCaGnClientesEnCartera
Clientes con al menos una cuota en mora.
```sql
SELECT
    ap.vtanombreproyecto,
    COUNT(DISTINCT ap.idventa) AS clientes_en_cartera
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1
  AND ap.mora_dias > 0
  AND ap.saldo > 0
GROUP BY ap.vtanombreproyecto;
```

### McCaGnCarteraXIndividuo
Saldo de mora por cliente (detalle).
```sql
SELECT
    ap.vtanombreproyecto,
    ap.compradornombre,
    ap.compradordocumento,
    SUM(ap.mora_saldo)    AS mora_total,
    MAX(ap.mora_dias)     AS mora_max_dias
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1
  AND ap.mora_dias > 0
GROUP BY ap.vtanombreproyecto, ap.compradornombre, ap.compradordocumento
ORDER BY mora_total DESC;
```

### McCaCarteraPeliculaPorMes
Método "Película": recaudo real cruzado contra plan de pagos por mes.
```sql
-- Para cada cuota de acuerdos_pago, verificar cuánto se pagó en relacion_pagos
-- antes o en la fecha de vencimiento vs. después
WITH cuotas AS (
    SELECT
        ap.idventa,
        ap.vtanombreproyecto,
        ap.fecha      AS fecha_venc,
        ap.pactado,
        ap.idconcepto
    FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
    JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
    WHERE c.afectaconceptopp = 1 AND ap.pactado > 0
),
pagos AS (
    SELECT
        rp.idventa,
        rp.fechaconsignacion,
        rp.neto,
        rp.idconcepto
    FROM sinco_ic_raw.adi_dtm_relacion_pagos rp
    JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = rp.idconcepto
    WHERE c.afectaconceptopp = 1
)
SELECT
    c.vtanombreproyecto,
    DATE_TRUNC('month', c.fecha_venc) AS mes_vencimiento,
    SUM(c.pactado)                     AS pactado,
    SUM(p.neto)                        AS pagado_hasta_fecha,
    SUM(c.pactado) - SUM(COALESCE(p.neto, 0)) AS saldo_real
FROM cuotas c
LEFT JOIN pagos p
    ON p.idventa = c.idventa
   AND p.idconcepto = c.idconcepto
   AND p.fechaconsignacion <= CURRENT_DATE
GROUP BY 1, 2
ORDER BY 1, 2;
```

### McCaPreEscritura
Cartera de cuota inicial (idgrupoconceptopp = 1).
```sql
SELECT
    ap.vtanombreproyecto,
    SUM(ap.pactado) AS pre_pactado,
    SUM(ap.pagado)  AS pre_pagado,
    SUM(ap.saldo)   AS pre_saldo
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.idgrupoconceptopp = 1   -- Cuota inicial
GROUP BY ap.vtanombreproyecto;
```

### McCaPostEscritura
Cartera hipotecaria / crédito / subsidio (idgrupoconceptopp IN (2, 3, 6)).
```sql
SELECT
    ap.vtanombreproyecto,
    SUM(ap.pactado) AS post_pactado,
    SUM(ap.pagado)  AS post_pagado,
    SUM(ap.saldo)   AS post_saldo
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.idgrupoconceptopp IN (2, 3, 6)
GROUP BY ap.vtanombreproyecto;
```

### McCaEstadoCliente
Segmentación de cartera por estado declarado en el plan de pagos.
```sql
SELECT
    ap.vtanombreproyecto,
    ap.estadocartera,
    COUNT(DISTINCT ap.idventa) AS clientes,
    SUM(ap.saldo)              AS saldo
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1
GROUP BY ap.vtanombreproyecto, ap.estadocartera;
```

---

## 4. McCl — Cláusulas / Pagos (≈ 5 medidas)

Seguimiento de pagos por cláusula contractual (promesa, escritura, desembolso).

### McClPagosPactados
Total pactado en plan de pagos (sin filtro de grupo de concepto).
```sql
SELECT
    ap.vtanombreproyecto,
    ap.concepto,
    SUM(ap.pactado) AS pactado
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
GROUP BY ap.vtanombreproyecto, ap.concepto;
```

### McClPagosPagados
Total pagado por concepto de plan de pagos.
```sql
SELECT
    rp.nombreproyecto,
    c.descconceptopp AS concepto,
    SUM(rp.neto) AS pagado
FROM sinco_ic_raw.adi_dtm_relacion_pagos rp
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = rp.idconcepto
GROUP BY rp.nombreproyecto, c.descconceptopp;
```

### McClCumplimientoPlanPago
Porcentaje de cumplimiento del plan de pagos por negocio.
```sql
SELECT
    ap.idventa,
    ap.vtanombreproyecto,
    ap.compradornombre,
    SUM(ap.pactado)                                           AS total_pactado,
    SUM(ap.pagado)                                            AS total_pagado,
    ROUND(100.0 * SUM(ap.pagado) / NULLIF(SUM(ap.pactado),0), 1) AS pct_cumplimiento
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1
GROUP BY ap.idventa, ap.vtanombreproyecto, ap.compradornombre;
```

---

## 5. McIs — Informe Semanal (≈ 15 medidas)

KPIs del informe gerencial semanal.

### McIsUnidadesReales
Unidades vendidas en la semana actual (lunes a hoy).
```sql
SELECT
    vtanombreproyecto,
    COUNT(DISTINCT idventa) AS mcis_unidades_reales
FROM sinco_ic_raw.adi_dtm_venta
WHERE unidadppal = 1
  AND fechaventa >= DATE_TRUNC('week', CURRENT_DATE)
  AND fechaventa <  DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
GROUP BY vtanombreproyecto;
```

### McIsUnidadesRealesSemanaCorriente
Equivalente a la anterior, alias explícito.
```sql
-- Idéntico a McIsUnidadesReales —
-- En DAX se diferencia por contexto de filtro de tiempo (McGGAcumularTiempo)
```

### McIsVentasNetas
Valor de ventas netas en la semana actual.
```sql
SELECT
    vtanombreproyecto,
    SUM(valorneto) AS mcis_ventas_netas_semana
FROM sinco_ic_raw.adi_dtm_venta
WHERE unidadppal = 1
  AND fechaventa >= DATE_TRUNC('week', CURRENT_DATE)
  AND fechaventa <  DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
GROUP BY vtanombreproyecto;
```

### McIsVentasNetasMes
Ventas netas en el mes en curso.
```sql
SELECT
    vtanombreproyecto,
    SUM(valorneto) AS mcis_ventas_netas_mes
FROM sinco_ic_raw.adi_dtm_venta
WHERE DATE_TRUNC('month', fechaventa) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY vtanombreproyecto;
```

### McIsInventario
Inventario disponible en el momento del informe.
```sql
SELECT
    invnombreproyecto,
    COUNT(*) AS mcis_inventario
FROM sinco_ic_raw.adi_dtm_inventarios
WHERE codventa IS NULL AND invundppalventa = 1
GROUP BY invnombreproyecto;
```

### McIsUnidadesPresupuestoMesCorriente
Unidades presupuestadas para el mes (requiere tabla de presupuesto Mc1_Presupuesto; si no está disponible en sinco_ic_raw, usar vista o valor manual).
```sql
-- Requiere Mc1_Presupuesto (tabla del DataMart Power BI, no de sinco_ic_raw)
-- Si el presupuesto está en sinco_ic_raw con otra tabla:
-- SELECT SUM(unidades_ppto) FROM sinco_ic_raw.<tabla_presupuesto>
-- WHERE DATE_TRUNC('month', fecha_ppto) = DATE_TRUNC('month', CURRENT_DATE)
-- AND nombre_proyecto = :proyecto
-- NOTA: coordinar con TI para confirmar tabla de destino del presupuesto
```

### McIsEvolucionSemanal
Series semanales de ventas vs. semana anterior.
```sql
WITH semanas AS (
    SELECT
        DATE_TRUNC('week', fechaventa)  AS semana_inicio,
        vtanombreproyecto,
        COUNT(DISTINCT idventa)          AS unidades,
        SUM(valorneto)                   AS valor
    FROM sinco_ic_raw.adi_dtm_venta
    WHERE unidadppal = 1
    GROUP BY 1, 2
)
SELECT
    semana_inicio,
    vtanombreproyecto,
    unidades,
    valor,
    LAG(unidades) OVER (PARTITION BY vtanombreproyecto ORDER BY semana_inicio) AS unidades_semana_anterior,
    unidades - LAG(unidades) OVER (PARTITION BY vtanombreproyecto ORDER BY semana_inicio) AS variacion_unidades
FROM semanas
ORDER BY semana_inicio DESC, vtanombreproyecto;
```

---

## 6. McP&G — Estado de Resultados (≈ 12 medidas)

P&G financiero del proyecto. La línea de ingresos viene de `adi_dtm_venta`; costos y flujos provienen de `Mc1_FlujosdeCaja` (DataMart interno de Power BI — requiere extracción separada o vista en sinco_ic_raw).

> **Nota:** Las medidas McP&G.2 a McP&G.7 dependen de `Mc1_FlujosdeCaja`, tabla que acumula registros contables de costos del proyecto. Las consultas SQL se expresan asumiendo que esa tabla existe en sinco_ic_raw como `mc1_flujoscaja` o similar.

### McP&G.1-Ventas
Ingresos reconocidos por ventas netas activas.
```sql
SELECT
    vtanombreproyecto,
    SUM(valorneto) AS pgventas
FROM sinco_ic_raw.adi_dtm_venta
GROUP BY vtanombreproyecto;
```

### McP&G.2-Lote
Costo del terreno (registrado como línea en flujos de caja).
```sql
-- Reemplazar mc1_flujoscaja por el nombre real en sinco_ic_raw
SELECT
    nombre_proyecto,
    SUM(valor) AS pg_lote
FROM sinco_ic_raw.mc1_flujoscaja
WHERE pg_numero = 2   -- línea P&G #2: Lote
GROUP BY nombre_proyecto;
```

### McP&G.3-CostoDirecto
Costos directos de construcción.
```sql
SELECT nombre_proyecto, SUM(valor) AS pg_costo_directo
FROM sinco_ic_raw.mc1_flujoscaja WHERE pg_numero = 3
GROUP BY nombre_proyecto;
```

### McP&G.4-CostoIndirecto
Costos indirectos (administración de obra, interventoría, etc.).
```sql
SELECT nombre_proyecto, SUM(valor) AS pg_costo_indirecto
FROM sinco_ic_raw.mc1_flujoscaja WHERE pg_numero = 4
GROUP BY nombre_proyecto;
```

### McP&G.5-Honorarios
Honorarios profesionales y de gerencia.
```sql
SELECT nombre_proyecto, SUM(valor) AS pg_honorarios
FROM sinco_ic_raw.mc1_flujoscaja WHERE pg_numero = 5
GROUP BY nombre_proyecto;
```

### McP&G.6-Financieros
Costos financieros (intereses crédito constructor, fiducia).
```sql
SELECT nombre_proyecto, SUM(valor) AS pg_financieros
FROM sinco_ic_raw.mc1_flujoscaja WHERE pg_numero = 6
GROUP BY nombre_proyecto;
```

### McP&G.7-DevolucionIva
IVA en la construcción recuperable.
```sql
SELECT nombre_proyecto, SUM(valor) AS pg_iva
FROM sinco_ic_raw.mc1_flujoscaja WHERE pg_numero = 7
GROUP BY nombre_proyecto;
```

### McP&G.9-CostosTotales
Suma de todas las líneas de costo (2 a 7).
```sql
SELECT nombre_proyecto, SUM(valor) AS pg_costos_totales
FROM sinco_ic_raw.mc1_flujoscaja
WHERE pg_numero BETWEEN 2 AND 7
GROUP BY nombre_proyecto;
```

### McP&G.A-Utilidad
Utilidad del proyecto = Ventas − Costos Totales.
```sql
WITH ventas AS (
    SELECT vtanombreproyecto AS proyecto, SUM(valorneto) AS pgventas
    FROM sinco_ic_raw.adi_dtm_venta GROUP BY 1
),
costos AS (
    SELECT nombre_proyecto AS proyecto, SUM(valor) AS pg_costos
    FROM sinco_ic_raw.mc1_flujoscaja WHERE pg_numero BETWEEN 2 AND 7
    GROUP BY 1
)
SELECT
    v.proyecto,
    v.pgventas,
    COALESCE(c.pg_costos, 0)          AS costos_totales,
    v.pgventas - COALESCE(c.pg_costos, 0) AS utilidad
FROM ventas v
LEFT JOIN costos c USING (proyecto);
```

### McP&G.B-MargenBruto
Margen bruto = Utilidad / Ventas.
```sql
-- Extender la consulta de McP&G.A-Utilidad:
-- ROUND(100.0 * utilidad / NULLIF(pgventas, 0), 1) AS margen_bruto_pct
```

---

## 7. McPr — Proyecciones (≈ 20 medidas)

Proyección de ventas futuras e ingresos basada en velocidades comerciales. Depende de tablas `Mc4_DATAMART_Proyeccion_*` que son internas del DataMart de Power BI.

> **Nota:** Estas medidas requieren `Mc4_DATAMART_Proyeccion_Datos` y `Mc4_DATAMART_Proyeccion_Caja`. Si esas tablas existen en sinco_ic_raw bajo otro nombre, coordinar con TI.

### McPrFlujodePagosReales
Flujos de caja reales recibidos (aproximación con `relacion_pagos`).
```sql
SELECT
    rp.nombreproyecto,
    DATE_TRUNC('month', rp.fechaconsignacion) AS mes,
    SUM(rp.neto) AS flujo_real
FROM sinco_ic_raw.adi_dtm_relacion_pagos rp
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = rp.idconcepto
WHERE c.afectaconceptopp = 1
GROUP BY 1, 2
ORDER BY 1, 2;
```

### McPrFlujodePagosProgramados
Flujos pactados por mes (plan de pagos).
```sql
SELECT
    ap.vtanombreproyecto,
    DATE_TRUNC('month', ap.fecha) AS mes,
    SUM(ap.pactado) AS flujo_programado,
    SUM(ap.pagado)  AS flujo_recaudado
FROM sinco_ic_raw.adi_dtm_acuerdos_pago ap
JOIN sinco_ic_raw.adi_dtm_conceptospp c ON c.codconceptopp = ap.idconcepto
WHERE c.afectaconceptopp = 1
GROUP BY 1, 2
ORDER BY 1, 2;
```

### McPrPrecioPromedioInventario
Precio promedio del inventario aún no vendido.
```sql
SELECT
    invnombreproyecto,
    AVG(invvalorunidadlistavigente) AS precio_prom_inventario
FROM sinco_ic_raw.adi_dtm_inventarios
WHERE codventa IS NULL AND invundppalventa = 1
GROUP BY invnombreproyecto;
```

### McPrUnidadesSeparadasProyectadas
Unidades vendidas + proyección por velocidad de ventas (últimos 3 meses).
```sql
WITH hist AS (
    SELECT
        vtanombreproyecto,
        DATE_TRUNC('month', fechaventa) AS mes,
        COUNT(DISTINCT idventa) AS unidades
    FROM sinco_ic_raw.adi_dtm_venta
    WHERE unidadppal = 1
      AND fechaventa >= CURRENT_DATE - INTERVAL '3 months'
    GROUP BY 1, 2
),
velocidad AS (
    SELECT vtanombreproyecto, AVG(unidades) AS vel_mensual
    FROM hist GROUP BY 1
),
inventario AS (
    SELECT invnombreproyecto, COUNT(*) AS inv_disponible
    FROM sinco_ic_raw.adi_dtm_inventarios
    WHERE codventa IS NULL AND invundppalventa = 1
    GROUP BY 1
)
SELECT
    i.invnombreproyecto                              AS proyecto,
    i.inv_disponible,
    v.vel_mensual,
    ROUND(i.inv_disponible / NULLIF(v.vel_mensual,0), 1) AS meses_para_agotar
FROM inventario i
LEFT JOIN velocidad v ON v.vtanombreproyecto = i.invnombreproyecto;
```

### McPrAreasProyectadas
Área total de unidades proyectadas a venderse.
```sql
SELECT
    invnombreproyecto,
    SUM(invarprivada) AS area_proyectada
FROM sinco_ic_raw.adi_dtm_inventarios
WHERE codventa IS NULL AND invundppalventa = 1
GROUP BY invnombreproyecto;
```

### McPrDuracionVenta
Días promedio entre separación y escrituración.
```sql
SELECT
    vtanombreproyecto,
    AVG(EXTRACT(DAY FROM (escriturafecha - fechaseparacion))) AS dias_prom_venta_escritura
FROM sinco_ic_raw.adi_dtm_venta
WHERE fechaseparacion IS NOT NULL AND escriturafecha IS NOT NULL
GROUP BY vtanombreproyecto;
```

---

## 8. McPy — Detalle de Proyectos (≈ 30 medidas)

Fechas de hitos legales, pólizas, crédito constructor e indexación ICOCED. Provienen de `adi_dtm_proyectos` y tablas Mc2_*.

### McPyA.FechaAprobacion
Fecha de aprobación del proyecto.
```sql
SELECT prycodigoproyecto, prynombreproyecto, pryfechaaprobacioncredito AS fecha_aprobacion
FROM sinco_ic_raw.adi_dtm_proyectos;
```

### McPyBA1.FechaEjecutoriaLUrbanismo
Fecha ejecutoria de la licencia de urbanismo.
```sql
-- Esta fecha puede estar en una tabla de licencias (Mc2_TablaLicencias).
-- Desde adi_dtm_proyectos, la columna más cercana es pryfechapermiso.
SELECT prycodigoproyecto, prynombreproyecto,
       pryfechapermiso AS fecha_lic_urbanismo
FROM sinco_ic_raw.adi_dtm_proyectos;
```

### McPyBB1.FechaEjecutoriaLConstruccion
Fecha ejecutoria de la licencia de construcción.
```sql
SELECT prycodigoproyecto, prynombreproyecto,
       pryfechalicencia AS fecha_lic_construccion
FROM sinco_ic_raw.adi_dtm_proyectos;
```

### McPyCA.FechaVencimientoTodoRiesgo
Fecha de vencimiento de póliza Todo Riesgo Construcción.
```sql
-- Tabla: Mc2_* (no en sinco_ic_raw directamente).
-- Aproximación: pryfechavencimientoentrega se usa como proxy del fin de obra.
SELECT prycodigoproyecto, prynombreproyecto,
       pryfechavencimientoentrega AS fecha_venc_entrega
FROM sinco_ic_raw.adi_dtm_proyectos;
```

### McPyFechasHitos
Vista unificada de hitos principales por proyecto.
```sql
SELECT
    prycodigoproyecto                              AS cod_proyecto,
    prynombreproyecto                              AS proyecto,
    pryfechainicialventa                           AS inicio_ventas,
    pryfechapermisoventa                           AS permiso_ventas,
    pryfechalicencia                               AS licencia_construccion,
    pryfechapuntoequilibrioini                     AS pe_inicio,
    pryfechapuntoequilibriofin                     AS pe_fin,
    pryfechapuntoequilibrioreal                    AS pe_real,
    pryfechainicialobra                            AS inicio_obra,
    pryfechaescrituracion                          AS inicio_escrituracion,
    pryfechapropiedadhorizontal                    AS propiedad_horizontal,
    pryfechaentrega                                AS fecha_entrega,
    pryfechafinaliza                               AS fecha_finaliza
FROM sinco_ic_raw.adi_dtm_proyectos
ORDER BY prynombreproyecto;
```

### McPyICZ.SobreCosto%
Porcentaje de sobrecosto respecto al presupuesto ICOCED indexado.
```sql
-- Requiere Mc2_TablaICOCED (índice de costos por ciudad).
-- Lógica: sobrecosto% = (costo_real - costo_ppto_indexado) / costo_ppto_indexado * 100
-- Sin la tabla ICOCED en sinco_ic_raw no puede calcularse directamente.
-- Coordinar con TI para exponer mc2_tablaicoced en sinco_ic_raw.
```

### McPyEstadoPuntodeEquilibrio
Semáforo: ¿el proyecto ha alcanzado punto de equilibrio?
```sql
SELECT
    prycodigoproyecto,
    prynombreproyecto,
    CASE
        WHEN pryfechapuntoequilibrioreal IS NOT NULL THEN 'Alcanzado'
        WHEN pryfechapuntoequilibriofin < CURRENT_DATE THEN 'Vencido sin alcanzar'
        ELSE 'Pendiente'
    END AS estado_pe
FROM sinco_ic_raw.adi_dtm_proyectos;
```

---

## 9. McTr — Trámites (≈ 80 medidas)

Ciclo completo de trámites postventa: promesa, crédito, subsidio, Mi Casa Ya, escritura, entrega. Es el grupo más numeroso del modelo.

### Patrón general
```sql
-- Trámite CUMPLIDO: "Fecha Cumplimiento" IS NOT NULL
-- Trámite PENDIENTE: "Fecha Cumplimiento" IS NULL
-- Trámite ATRASADO: "Fecha Programada" < NOW() AND "Fecha Cumplimiento" IS NULL
-- Código de trámite: "Codigo Tramite"
```

### McTrGn0.TotalesTramites
Conteo total de trámites por estado.
```sql
SELECT
    t.nombreproyecto,
    t."Codigo Tramite",
    t."Descripcion Tramite",
    COUNT(*) FILTER (WHERE t."Fecha Cumplimiento" IS NOT NULL)         AS cumplidos,
    COUNT(*) FILTER (WHERE t."Fecha Cumplimiento" IS NULL)             AS pendientes,
    COUNT(*) FILTER (WHERE t."Fecha Programada" < NOW()
                       AND t."Fecha Cumplimiento" IS NULL)             AS atrasados,
    COUNT(*)                                                            AS total
FROM sinco_ic_raw.adi_dtm_tramites t
GROUP BY t.nombreproyecto, t."Codigo Tramite", t."Descripcion Tramite"
ORDER BY t.nombreproyecto, t."Codigo Tramite";
```

### McTrGn1TramitesAtrasados
Total de trámites con fecha programada vencida sin cumplir.
```sql
SELECT
    nombreproyecto,
    COUNT(*) AS tramites_atrasados
FROM sinco_ic_raw.adi_dtm_tramites
WHERE "Fecha Programada" < NOW()
  AND "Fecha Cumplimiento" IS NULL
GROUP BY nombreproyecto;
```

### McTrGnClientesAtrasados
Clientes con al menos un trámite atrasado.
```sql
SELECT
    nombreproyecto,
    COUNT(DISTINCT idventa) AS clientes_atrasados
FROM sinco_ic_raw.adi_dtm_tramites
WHERE "Fecha Programada" < NOW()
  AND "Fecha Cumplimiento" IS NULL
GROUP BY nombreproyecto;
```

### McTrGnVentasBloqueadas
Ventas actualmente en estado desbloqueado (requieren atención urgente).
```sql
SELECT
    nombreproyecto,
    COUNT(DISTINCT idventa) AS ventas_desbloqueadas
FROM sinco_ic_raw.adi_dtm_tramites
WHERE bloqueo = 0
GROUP BY nombreproyecto;
```

### McTrTr1FirmaPromesa
Trámite: Promesas de compraventa firmadas (código TRGA).
```sql
SELECT
    nombreproyecto,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NOT NULL) AS promesas_firmadas,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NULL)     AS promesas_pendientes
FROM sinco_ic_raw.adi_dtm_tramites
WHERE "Codigo Tramite" = 'TRGA'
GROUP BY nombreproyecto;
```

### McTrTr2FirmaEscritura
Trámite: Escrituras firmadas (código ESEF).
```sql
SELECT
    nombreproyecto,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NOT NULL) AS escrituras_firmadas,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NULL)     AS escrituras_pendientes
FROM sinco_ic_raw.adi_dtm_tramites
WHERE "Codigo Tramite" = 'ESEF'
GROUP BY nombreproyecto;
```

### McTrCr1CreditoSolicitado
Trámite: Créditos hipotecarios radicados ante banco (CRAR = banco del proyecto, CTAR = banco tercero).
```sql
SELECT
    nombreproyecto,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NOT NULL) AS creditos_radicados,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NULL)     AS creditos_pendientes_radicacion
FROM sinco_ic_raw.adi_dtm_tramites
WHERE "Codigo Tramite" IN ('CRAR', 'CTAR')
GROUP BY nombreproyecto;
```

### McTrCr2CreditoAprobado
Trámite: Créditos aprobados por el banco (CRFA = banco propio, CTFA = banco tercero).
```sql
SELECT
    nombreproyecto,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NOT NULL) AS creditos_aprobados,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NULL)     AS creditos_pendientes_aprobacion
FROM sinco_ic_raw.adi_dtm_tramites
WHERE "Codigo Tramite" IN ('CRFA', 'CTFA')
GROUP BY nombreproyecto;
```

### McTrCrBacklog
Créditos radicados pero aún no aprobados (backlog bancario).
```sql
WITH radicados AS (
    SELECT idventa
    FROM sinco_ic_raw.adi_dtm_tramites
    WHERE "Codigo Tramite" IN ('CRAR', 'CTAR')
      AND "Fecha Cumplimiento" IS NOT NULL
),
aprobados AS (
    SELECT idventa
    FROM sinco_ic_raw.adi_dtm_tramites
    WHERE "Codigo Tramite" IN ('CRFA', 'CTFA')
      AND "Fecha Cumplimiento" IS NOT NULL
)
SELECT
    t.nombreproyecto,
    COUNT(DISTINCT r.idventa) AS creditos_backlog
FROM radicados r
JOIN sinco_ic_raw.adi_dtm_tramites t ON t.idventa = r.idventa
  AND t."Codigo Tramite" IN ('CRAR', 'CTAR')
WHERE r.idventa NOT IN (SELECT idventa FROM aprobados)
GROUP BY t.nombreproyecto;
```

### McTrSu1SubsidioSolicitado
Trámite: Subsidios CCF radicados (SUAR).
```sql
SELECT
    nombreproyecto,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NOT NULL) AS subsidios_radicados,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NULL)     AS subsidios_pendientes_radicacion
FROM sinco_ic_raw.adi_dtm_tramites
WHERE "Codigo Tramite" = 'SUAR'
GROUP BY nombreproyecto;
```

### McTrSu2SubsidioAprobado
Trámite: Subsidios aprobados (SUEA = especie, OSAR = otras fuentes).
```sql
SELECT
    nombreproyecto,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NOT NULL) AS subsidios_aprobados,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NULL)     AS subsidios_pendientes_aprobacion
FROM sinco_ic_raw.adi_dtm_tramites
WHERE "Codigo Tramite" IN ('SUEA', 'OSAR')
GROUP BY nombreproyecto;
```

### McTrSuBacklog
Subsidios radicados sin aprobar.
```sql
WITH rad AS (
    SELECT DISTINCT idventa FROM sinco_ic_raw.adi_dtm_tramites
    WHERE "Codigo Tramite" = 'SUAR' AND "Fecha Cumplimiento" IS NOT NULL
),
apr AS (
    SELECT DISTINCT idventa FROM sinco_ic_raw.adi_dtm_tramites
    WHERE "Codigo Tramite" IN ('SUEA','OSAR') AND "Fecha Cumplimiento" IS NOT NULL
)
SELECT
    t.nombreproyecto,
    COUNT(DISTINCT r.idventa) AS subsidios_backlog
FROM rad r
JOIN sinco_ic_raw.adi_dtm_tramites t ON t.idventa = r.idventa
  AND t."Codigo Tramite" = 'SUAR'
WHERE r.idventa NOT IN (SELECT idventa FROM apr)
GROUP BY t.nombreproyecto;
```

### McTrMy1MiCasaYaInteresado
Mi Casa Ya: comprador interesado / solicitud inicial.
```sql
SELECT nombreproyecto,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NOT NULL) AS mcy_interesados
FROM sinco_ic_raw.adi_dtm_tramites
WHERE "Codigo Tramite" = 'MCYI'   -- confirmar código real en sistema
GROUP BY nombreproyecto;
```

### McTrMy4Resolucion
Mi Casa Ya: resolución de asignación obtenida.
```sql
SELECT nombreproyecto,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NOT NULL) AS mcy_resoluciones
FROM sinco_ic_raw.adi_dtm_tramites
WHERE "Codigo Tramite" = 'MCYR'   -- confirmar código real en sistema
GROUP BY nombreproyecto;
```

### McTrMy6Desembolso
Mi Casa Ya: subsidio desembolsado.
```sql
SELECT nombreproyecto,
    COUNT(*) FILTER (WHERE "Fecha Cumplimiento" IS NOT NULL) AS mcy_desembolsos
FROM sinco_ic_raw.adi_dtm_tramites
WHERE "Codigo Tramite" = 'MCYD'   -- confirmar código real en sistema
GROUP BY nombreproyecto;
```

### McTrCA0.CalificacionPromedio
Calificación promedio de compradores (score crediticio o SISBEN).
```sql
SELECT
    v.vtanombreproyecto,
    AVG(c.compradoringresosmensuales) AS ingreso_prom,
    AVG(EXTRACT(YEAR FROM AGE(c.compradorfechanacimiento))) AS edad_prom,
    COUNT(*) AS total_compradores
FROM sinco_ic_raw.adi_dtm_venta v
JOIN sinco_ic_raw.adi_dtm_comprador c ON c.idcomprador = v.idcomprador
WHERE v.unidadppal = 1
GROUP BY v.vtanombreproyecto;
```

### McTrResumenCicloCompleto
Vista del ciclo trámites completo: promesa → crédito → subsidio → escritura → entrega.
```sql
SELECT
    t.nombreproyecto,
    t.idventa,
    MAX(CASE WHEN t."Codigo Tramite" = 'TRGA' THEN t."Fecha Cumplimiento" END) AS promesa,
    MAX(CASE WHEN t."Codigo Tramite" IN ('CRAR','CTAR') THEN t."Fecha Cumplimiento" END) AS cred_radicado,
    MAX(CASE WHEN t."Codigo Tramite" IN ('CRFA','CTFA') THEN t."Fecha Cumplimiento" END) AS cred_aprobado,
    MAX(CASE WHEN t."Codigo Tramite" = 'SUAR' THEN t."Fecha Cumplimiento" END) AS subsidio_radicado,
    MAX(CASE WHEN t."Codigo Tramite" IN ('SUEA','OSAR') THEN t."Fecha Cumplimiento" END) AS subsidio_aprobado,
    MAX(CASE WHEN t."Codigo Tramite" = 'ESEF' THEN t."Fecha Cumplimiento" END) AS escritura,
    COUNT(*) FILTER (WHERE t."Fecha Programada" < NOW()
                       AND t."Fecha Cumplimiento" IS NULL)                        AS tramites_atrasados
FROM sinco_ic_raw.adi_dtm_tramites t
GROUP BY t.nombreproyecto, t.idventa;
```

---

## 10. McVG — Variables Globales (2 medidas)

### McVGUltimaActualizacion
Timestamp de la última carga de datos al modelo.
```sql
-- Si existe tabla de control:
SELECT MAX(timestamp_actualizacion) AS ultima_actualizacion
FROM sinco_ic_raw.z_mc_ultima_actualizacion;

-- Aproximación usando la fecha más reciente en ventas:
SELECT MAX(fechaventa) AS ultima_transaccion_venta
FROM sinco_ic_raw.adi_dtm_venta;
```

### McVGUsuario
Usuario conectado. No aplica en SQL (es contexto de sesión Power BI).
```sql
-- Equivalente en SQL: SESSION_USER o CURRENT_USER
SELECT SESSION_USER AS usuario_actual;
```

---

## 11. Mc3D — Visualización 3D (4 medidas)

Tooltips para la visualización 3D con Revit/Speckle. Son medidas de presentación, no de análisis.

### Mc3DTooltipVenta
Texto descriptivo del estado comercial de una unidad para el tooltip 3D.
```sql
SELECT
    i.invcodunidad,
    i.invdescunidad,
    CASE
        WHEN i.codventa IS NOT NULL THEN 'Vendida'
        ELSE 'Disponible'
    END                          AS estado_comercial,
    v.nombrecomprador,
    v.valorneto,
    v.fechaventa
FROM sinco_ic_raw.adi_dtm_inventarios i
LEFT JOIN sinco_ic_raw.adi_dtm_venta v ON v.idventa = i.codventa
WHERE i.invnombreproyecto = :proyecto;
```

### Mc3DTooltipCartera
Estado de cartera de la unidad en la visualización 3D.
```sql
SELECT
    i.invcodunidad,
    i.invdescunidad,
    SUM(ap.mora_saldo)    AS mora_saldo,
    MAX(ap.mora_dias)     AS mora_dias,
    ap.estadocartera
FROM sinco_ic_raw.adi_dtm_inventarios i
JOIN sinco_ic_raw.adi_dtm_venta v ON v.idventa = i.codventa
JOIN sinco_ic_raw.adi_dtm_acuerdos_pago ap ON ap.idventa = v.idventa
WHERE i.invnombreproyecto = :proyecto
GROUP BY i.invcodunidad, i.invdescunidad, ap.estadocartera;
```

### Mc3DTooltipEstado
Estado general de la unidad (comercial + trámites + cartera combinado).
```sql
SELECT
    i.invcodunidad,
    CASE WHEN i.codventa IS NULL THEN 'Disponible'
         WHEN v.escriturafecha IS NOT NULL THEN 'Escriturada'
         WHEN v.fechaseparacion IS NOT NULL THEN 'Prometida'
         ELSE 'Separada'
    END AS estado_unidad
FROM sinco_ic_raw.adi_dtm_inventarios i
LEFT JOIN sinco_ic_raw.adi_dtm_venta v ON v.idventa = i.codventa
WHERE i.invnombreproyecto = :proyecto;
```

### Mc3DTooltipUnidad
Ficha técnica de la unidad.
```sql
SELECT
    invcodunidad,
    invdescunidad,
    invtipounidad,
    invpiso,
    invtorre,
    invarconstruida,
    invarprivada,
    invalcobas,
    invvalorunidadlistavigente AS precio_lista
FROM sinco_ic_raw.adi_dtm_inventarios
WHERE invnombreproyecto = :proyecto
ORDER BY invpiso, invcodunidad;
```

---

## Apéndice: Grupos de Cálculo (Calculation Groups)

Los 7 `McGG` no son medidas sino modificadores de contexto. En SQL se implementan como parámetros de filtro o CTEs.

| Grupo | Equivalente SQL |
|-------|----------------|
| `McGGAcumularTiempo` — YTD / MTD | `WHERE EXTRACT(YEAR FROM fecha) = :año` / `WHERE DATE_TRUNC('month', fecha) = :mes` |
| `McGGCaCartera` — Aging buckets | `CASE WHEN mora_dias BETWEEN 1 AND 30 THEN ...` (ver sección McCa) |
| `McGGCaEstadoCliente` | `WHERE estadocartera = :estado` |
| `McGGCalculoTramites` | `WHERE "Fecha Cumplimiento" IS [NOT] NULL` |
| `McGGTipoVenta` | `JOIN adi_dtm_tiposventa ON ...` + `WHERE desctipovta = :tipo` |
| `McGGTrIEMiCasaYaEstado` | `WHERE "Codigo Tramite" IN ('MCYI','MCYR','MCYD') AND "Fecha Cumplimiento" IS [NOT] NULL` |
| `McGGTrIESubsidioEstado` | `WHERE "Codigo Tramite" IN ('SUAR','SUEA','OSAR') AND "Fecha Cumplimiento" IS [NOT] NULL` |

---

## Apéndice: Tablas de DataMart no disponibles en sinco_ic_raw

Estas medidas dependen de tablas calculadas dentro del modelo Power BI que no tienen equivalente directo en la base operacional:

| Tabla Power BI | Propósito | Alternativa SQL |
|----------------|-----------|-----------------|
| `Mc1_FlujosdeCaja` | P&G financiero por proyecto | Requiere tabla contable de costos |
| `Mc1_DATAMART` | Presupuesto consolidado | Requiere tabla de presupuesto de ventas |
| `Mc1_Presupuesto` | Presupuesto de unidades/períodos | Coordinar con TI para exportar |
| `Mc2_TablaICOCED` | Índice de costos de construcción | Tabla pública DANE — insertar en sinco_ic_raw |
| `Mc2_TablaSMMLV` | Salario mínimo por año | Tabla pública — insertar en sinco_ic_raw |
| `Mc2_TablaLicencias` | Fechas de licencias por proyecto | Posible en sistema de licencias de planeación |
| `Mc4_DATAMART_Proyeccion_*` | Proyección de caja por unidad | Requiere modelo de proyección externo |
| `_McCalendar` | Tabla de fechas | `GENERATE_SERIES` en PostgreSQL |

---

*Documento generado con base en `Analisis_ModeloSemantico_CBR.docx` + schemas CBR `estructuras md/` — IC Constructora — Mayo 2026*
