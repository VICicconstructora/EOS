# Medidas DAX → SQL: Modelo ADPRO — IC Constructora

**Fuente:** Modelo semántico `04-InfVIC-OBR.pbix` (workspace InfVIC, dataset compartido en Power BI Service)  
**Módulo:** ADPRO — Control de Proyectos de Construcción  
**Generado:** Mayo 2026

---

## Convenciones SQL

```sql
-- Schema de tablas ADPRO (confirmar nombre real con TI / Luis Miguel)
-- Convención probable, siguiendo patrón de sinco_ic_raw para CBR:
schema: adpro_ic_raw

-- Nombres de tabla: siempre minúsculas con prefijo adp_dtm_
adpro_ic_raw.adp_dtm_dim_proyecto
adpro_ic_raw.adp_dtm_dim_insumo
adpro_ic_raw.adp_dtm_dim_items
adpro_ic_raw.adp_dtm_dim_capitulo
adpro_ic_raw.adp_dtm_dim_tercero
adpro_ic_raw.adp_dtm_dim_empresa
adpro_ic_raw.adp_dtm_dim_fecha
adpro_ic_raw.adp_dtm_dim_usuario
adpro_ic_raw.adp_dtm_dim_controlclaseorigen
adpro_ic_raw.adp_dtm_dim_estadopordocumento
adpro_ic_raw.adp_dtm_dim_tipocontrato
adpro_ic_raw.adp_dtm_dim_subcapitulos
adpro_ic_raw.adp_dtm_dim_especificaciondecontratos
adpro_ic_raw.adp_dtm_fact_controlproyecto
adpro_ic_raw.adp_dtm_fact_proyeccion
adpro_ic_raw.adp_dtm_fact_contratos
adpro_ic_raw.adp_dtm_fact_acta
adpro_ic_raw.adp_dtm_fact_anticipo
adpro_ic_raw.adp_dtm_fact_pedidos
adpro_ic_raw.adp_dtm_fact_compras
adpro_ic_raw.adp_dtm_fact_entradasalmacen
adpro_ic_raw.adp_dtm_fact_salidasalmacen
adpro_ic_raw.adp_dtm_fact_devoluciones
adpro_ic_raw.adp_dtm_fact_reintegro
adpro_ic_raw.adp_dtm_fact_traslados
adpro_ic_raw.adp_dtm_fact_inventarioresumido
adpro_ic_raw.adp_dtm_fact_contratospolizas
```

**Reglas críticas que aplican a TODAS las consultas ADPRO:**

| Regla | Aplicación |
|-------|-----------|
| Métrica principal = `Valor Total` | Incluye IVA. Es el valor comprometido real del proyecto. |
| Ciclo del costo = `SkIdClaseOrigen` | Determina si un registro es Presupuesto, Proyección, Asegurado, Consumido o Invertido. |
| Filtro de proyecto = `SkIdProyecto` | Más preciso que el nombre. Cruzar con `DIM_Proyecto` para resolver. |
| Sufijo **ACC** = acumulado hasta la fecha | Sin límite de fecha o con `WHERE fecha <= :fecha_corte` |
| Sufijo **MES** = del mes seleccionado | `WHERE YEAR(fecha) = :año AND MONTH(fecha) = :mes` |
| Sufijo **R** = valor real (no porcentaje) | Distingue el monto del indicador % |
| Sufijo **MOD** = Invertido ajustado | Invertido + ajuste por diferencias de precio de almacén |
| `Valor Total` siempre con IVA | No usar `Valor Sin IVA` salvo análisis explícito de netos |
| Excluir estados anulados | Filtrar estados que impliquen anulación en `DIM_EstadoPorDocumento` |

---

## El Ciclo del Costo — Concepto Fundamental

Toda la tabla `FACT_ControlProyecto` es la misma tabla filtrada por `SkIdClaseOrigen`. Las 5 etapas son:

```
Presupuesto Inicial → Proyección → Asegurado → Consumido → Invertido
     (lo planeado)    (reformas)  (contratos) (almacén)   (actas/real)
```

```sql
-- Ver los códigos reales de SkIdClaseOrigen en tu base de datos:
SELECT DISTINCT co.SkIdClaseOrigen, co."Clase Descripcion", co."Origen Descripcion"
FROM adpro_ic_raw.adp_dtm_dim_controlclaseorigen co
ORDER BY co.SkIdClaseOrigen;
```

---

## 1. ADP_Presupuesto — Presupuesto Inicial (Página 5-2CR, 5-2CD)

El punto de partida: lo que se aprobó antes de iniciar la obra.

### ADP_Presupuestado ACC R
Valor presupuesto inicial acumulado (total del proyecto aprobado).
```sql
SELECT
    p."Nombre Proyecto"                    AS proyecto,
    cap."Capitulo Descripcion"             AS capitulo,
    SUM(f."Valor Total")                   AS adp_presupuestado_acc
FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = f.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_capitulo cap ON cap.SkIdCapitulo = f.SkIdCapitulo
JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
WHERE co."Clase Descripcion" = 'Presupuesto Inicial'
GROUP BY p."Nombre Proyecto", cap."Capitulo Descripcion";
```

### ADP_Presupuestado MES R
Presupuesto programado para un mes específico (flujo previsto).
```sql
SELECT
    p."Nombre Proyecto"                    AS proyecto,
    d."Año", d."Mes",
    SUM(f."Valor Total")                   AS adp_presupuestado_mes
FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = f.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_fecha d ON d.SkIdFecha = f.SkIdFecha
JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
WHERE co."Clase Descripcion" = 'Presupuesto Inicial'
  AND d."Año" = :año AND d."Mes" = :mes
GROUP BY p."Nombre Proyecto", d."Año", d."Mes";
```

### ADP_Presupuestado ACC %
% ejecutado vs presupuesto (requiere cruzar con Invertido — ver sección 5).
```sql
-- Ver medida ADP_Invertido ACC % MOD más adelante.
```

### ADP_Presupuestado Apto / ADP_Presupuestado M2
Presupuesto por apartamento y por m².
```sql
SELECT
    p."Nombre Proyecto",
    SUM(f."Valor Total")                                   AS presupuesto_total,
    SUM(f."Valor Total") / NULLIF(p.total_aptos, 0)       AS presupuesto_apto,
    SUM(f."Valor Total") / NULLIF(p.area_construida, 0)   AS presupuesto_m2
FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = f.SkIdProyecto
-- total_aptos y area_construida provienen de A_Proyectos (tabla de configuración externa)
JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
WHERE co."Clase Descripcion" = 'Presupuesto Inicial'
GROUP BY p."Nombre Proyecto", p.total_aptos, p.area_construida;
```

---

## 2. ADP_Proyectado — Proyección (Reformas Presupuestales) (Página 5-2CD)

El presupuesto vigente después de las reformas aprobadas. Es la base de comparación real.

### ADP_Proyectado ACC R
Valor proyectado vigente acumulado.
```sql
SELECT
    p."Nombre Proyecto",
    cap."Capitulo Descripcion",
    SUM(f."Valor Total")  AS adp_proyectado_acc
FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = f.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_capitulo cap ON cap.SkIdCapitulo = f.SkIdCapitulo
JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
WHERE co."Clase Descripcion" = 'Proyección'
GROUP BY p."Nombre Proyecto", cap."Capitulo Descripcion";
```

### ADP_Proyectado MES R
Proyección registrada en el mes seleccionado (reformas del mes).
```sql
SELECT
    p."Nombre Proyecto",
    d."Año", d."Mes", d."NombreMes",
    SUM(f."Valor Total")  AS adp_proyectado_mes
FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = f.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_fecha d ON d.SkIdFecha = f.SkIdFecha
JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
WHERE co."Clase Descripcion" = 'Proyección'
  AND d."Año" = :año AND d."Mes" = :mes
GROUP BY p."Nombre Proyecto", d."Año", d."Mes", d."NombreMes";
```

### ADP_Diferencia ACC / ADP_Diferencia MES
Diferencia entre proyectado y presupuesto inicial (sobrecosto de reforma).
```sql
WITH presupuesto AS (
    SELECT f.SkIdProyecto, f.SkIdCapitulo, SUM(f."Valor Total") AS ppto
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Presupuesto Inicial'
    GROUP BY f.SkIdProyecto, f.SkIdCapitulo
),
proyectado AS (
    SELECT f.SkIdProyecto, f.SkIdCapitulo, SUM(f."Valor Total") AS proy
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Proyección'
    GROUP BY f.SkIdProyecto, f.SkIdCapitulo
)
SELECT
    p."Nombre Proyecto",
    cap."Capitulo Descripcion",
    COALESCE(pr.proy, 0) - COALESCE(pp.ppto, 0)  AS adp_diferencia_acc,
    ROUND(100.0 * (COALESCE(pr.proy, 0) - COALESCE(pp.ppto, 0))
          / NULLIF(pp.ppto, 0), 1)                AS adp_diferencia_pct
FROM presupuesto pp
FULL OUTER JOIN proyectado pr USING (SkIdProyecto, SkIdCapitulo)
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = COALESCE(pp.SkIdProyecto, pr.SkIdProyecto)
JOIN adpro_ic_raw.adp_dtm_dim_capitulo cap ON cap.SkIdCapitulo = COALESCE(pp.SkIdCapitulo, pr.SkIdCapitulo)
ORDER BY ABS(COALESCE(pr.proy, 0) - COALESCE(pp.ppto, 0)) DESC;
```

### ADP_Pro Valor Mes R (desde FACT_Proyeccion)
Valor de las reformas por mes con causa y descripción.
```sql
SELECT
    p."Nombre Proyecto",
    d."Año", d."Mes", d."NombreMes",
    pr."Descripcion Causa",
    SUM(pr."Valor Total")  AS adp_pro_valor_mes
FROM adpro_ic_raw.adp_dtm_fact_proyeccion pr
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = pr.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_fecha d ON d.SkIdFecha = pr.SkIdFecha
WHERE d."Año" = :año AND d."Mes" = :mes
GROUP BY p."Nombre Proyecto", d."Año", d."Mes", d."NombreMes", pr."Descripcion Causa"
ORDER BY adp_pro_valor_mes DESC;
```

---

## 3. ADP_Asegurado — Comprometido via Contratos (Página 5-2CR)

Lo que ya tiene respaldo contractual firmado. Es el costo comprometido.

### ADP_Asegurado ACC R
Valor total bajo contrato acumulado.
```sql
SELECT
    p."Nombre Proyecto",
    cap."Capitulo Descripcion",
    SUM(f."Valor Total")   AS adp_asegurado_acc
FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = f.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_capitulo cap ON cap.SkIdCapitulo = f.SkIdCapitulo
JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
WHERE co."Clase Descripcion" = 'Asegurado'
GROUP BY p."Nombre Proyecto", cap."Capitulo Descripcion";
```

### ADP_Por Asegurar ACC R
Saldo sin contratar = Proyectado - Asegurado.
```sql
WITH asegurado AS (
    SELECT f.SkIdProyecto, f.SkIdCapitulo, SUM(f."Valor Total") AS aseg
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Asegurado' GROUP BY f.SkIdProyecto, f.SkIdCapitulo
),
proyectado AS (
    SELECT f.SkIdProyecto, f.SkIdCapitulo, SUM(f."Valor Total") AS proy
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Proyección' GROUP BY f.SkIdProyecto, f.SkIdCapitulo
)
SELECT
    p."Nombre Proyecto",
    cap."Capitulo Descripcion",
    COALESCE(pr.proy, 0) - COALESCE(a.aseg, 0)  AS adp_por_asegurar_acc,
    ROUND(100.0 * COALESCE(a.aseg, 0) / NULLIF(pr.proy, 0), 1) AS adp_asegurado_pct
FROM proyectado pr
LEFT JOIN asegurado a USING (SkIdProyecto, SkIdCapitulo)
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = pr.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_capitulo cap ON cap.SkIdCapitulo = pr.SkIdCapitulo;
```

---

## 4. ADP_Consumido — Salidas de Almacén (Página 5-2CR, 5-2CI)

Materiales e insumos que salieron del almacén hacia la obra. Estado "Consumido".

### ADP_Consumido ACC R
Valor total de salidas de almacén acumuladas.
```sql
SELECT
    p."Nombre Proyecto",
    cap."Capitulo Descripcion",
    i."Tipo Descripcion"   AS tipo_insumo,
    SUM(f."Valor Total")   AS adp_consumido_acc
FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = f.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_capitulo cap ON cap.SkIdCapitulo = f.SkIdCapitulo
JOIN adpro_ic_raw.adp_dtm_dim_insumo i ON i.SkIdInsumo = f.SkIdInsumo
JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
WHERE co."Clase Descripcion" = 'Consumido'
GROUP BY p."Nombre Proyecto", cap."Capitulo Descripcion", i."Tipo Descripcion";
```

### ADP_Por Consumir ACC R
Saldo en almacén no despachado = Asegurado - Consumido.
```sql
WITH aseg AS (
    SELECT f.SkIdProyecto, SUM(f."Valor Total") AS v FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Asegurado' GROUP BY f.SkIdProyecto
),
cons AS (
    SELECT f.SkIdProyecto, SUM(f."Valor Total") AS v FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Consumido' GROUP BY f.SkIdProyecto
)
SELECT
    p."Nombre Proyecto",
    COALESCE(a.v, 0) - COALESCE(c.v, 0)  AS adp_por_consumir_acc
FROM aseg a
LEFT JOIN cons c USING (SkIdProyecto)
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = a.SkIdProyecto;
```

---

## 5. ADP_Invertido — Costo Real Causado (Página 5-2CR, 5-2CF)

Lo que se ha causado contablemente: actas aprobadas + salidas de almacén. Es el costo real de la obra.

### ADP_Invertido ACC MOD R
Costo real invertido acumulado (con ajuste MOD = incluye traslados y notas en valor).
```sql
SELECT
    p."Nombre Proyecto",
    cap."Capitulo Descripcion",
    d."Año", d."Mes",
    SUM(f."Valor Total")  AS adp_invertido_acc
FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = f.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_capitulo cap ON cap.SkIdCapitulo = f.SkIdCapitulo
JOIN adpro_ic_raw.adp_dtm_dim_fecha d ON d.SkIdFecha = f.SkIdFecha
JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
WHERE co."Clase Descripcion" = 'Invertido'
GROUP BY p."Nombre Proyecto", cap."Capitulo Descripcion", d."Año", d."Mes"
ORDER BY d."Año", d."Mes";
```

### ADP_Invertido ACC % MOD
Porcentaje de ejecución real vs presupuesto.
```sql
WITH invertido AS (
    SELECT f.SkIdProyecto, f.SkIdCapitulo, SUM(f."Valor Total") AS inv
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Invertido' GROUP BY f.SkIdProyecto, f.SkIdCapitulo
),
presupuesto AS (
    SELECT f.SkIdProyecto, f.SkIdCapitulo, SUM(f."Valor Total") AS ppto
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Presupuesto Inicial' GROUP BY f.SkIdProyecto, f.SkIdCapitulo
)
SELECT
    p."Nombre Proyecto",
    cap."Capitulo Descripcion",
    COALESCE(inv.inv, 0)                              AS invertido_acc,
    COALESCE(pp.ppto, 0)                             AS presupuesto_acc,
    ROUND(100.0 * COALESCE(inv.inv, 0)
          / NULLIF(pp.ppto, 0), 1)                   AS adp_invertido_pct
FROM presupuesto pp
LEFT JOIN invertido inv USING (SkIdProyecto, SkIdCapitulo)
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = pp.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_capitulo cap ON cap.SkIdCapitulo = pp.SkIdCapitulo;
```

### ADP_Por Invertir ACC R
Saldo por ejecutar = Proyectado - Invertido.
```sql
WITH proyectado AS (
    SELECT f.SkIdProyecto, SUM(f."Valor Total") AS proy
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Proyección' GROUP BY f.SkIdProyecto
),
invertido AS (
    SELECT f.SkIdProyecto, SUM(f."Valor Total") AS inv
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Invertido' GROUP BY f.SkIdProyecto
)
SELECT
    p."Nombre Proyecto",
    COALESCE(pr.proy, 0) - COALESCE(i.inv, 0)  AS adp_por_invertir_acc
FROM proyectado pr
LEFT JOIN invertido i USING (SkIdProyecto)
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = pr.SkIdProyecto;
```

### Cuadro Resumen del Ciclo Completo (para dashboard)
```sql
SELECT
    p."Nombre Proyecto",
    cap."Capitulo Descripcion",
    SUM(CASE WHEN co."Clase Descripcion" = 'Presupuesto Inicial' THEN f."Valor Total" ELSE 0 END) AS presupuesto,
    SUM(CASE WHEN co."Clase Descripcion" = 'Proyección'          THEN f."Valor Total" ELSE 0 END) AS proyectado,
    SUM(CASE WHEN co."Clase Descripcion" = 'Asegurado'           THEN f."Valor Total" ELSE 0 END) AS asegurado,
    SUM(CASE WHEN co."Clase Descripcion" = 'Consumido'           THEN f."Valor Total" ELSE 0 END) AS consumido,
    SUM(CASE WHEN co."Clase Descripcion" = 'Invertido'           THEN f."Valor Total" ELSE 0 END) AS invertido,
    -- Diferencias
    SUM(CASE WHEN co."Clase Descripcion" = 'Proyección'          THEN f."Valor Total" ELSE 0 END)
    - SUM(CASE WHEN co."Clase Descripcion" = 'Presupuesto Inicial' THEN f."Valor Total" ELSE 0 END) AS diferencia_ppto_proy,
    ROUND(100.0 *
      SUM(CASE WHEN co."Clase Descripcion" = 'Invertido' THEN f."Valor Total" ELSE 0 END) /
      NULLIF(SUM(CASE WHEN co."Clase Descripcion" = 'Proyección' THEN f."Valor Total" ELSE 0 END), 0)
    , 1) AS pct_ejecucion
FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = f.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_capitulo cap ON cap.SkIdCapitulo = f.SkIdCapitulo
JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
GROUP BY p."Nombre Proyecto", cap."Capitulo Descripcion"
ORDER BY p."Nombre Proyecto", cap."Capitulo Descripcion";
```

---

## 6. ADP_Contratos — Control de Contratos (Página 5-2CO)

### ADP_Contratos (total)
```sql
SELECT
    p."Nombre Proyecto",
    COUNT(DISTINCT c."No. Contrato")  AS adp_contratos_total
FROM adpro_ic_raw.adp_dtm_fact_contratos c
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = c.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_estadopordocumento e ON e.SkIdEstado = c.SKIdEstado
WHERE e."Descripcion Estado" NOT ILIKE '%anulado%'
GROUP BY p."Nombre Proyecto";
```

### ADP_Contratos_Cerrados
Contratos marcados como cerrados en `DIM_EspecificacionDeContratos`.
```sql
SELECT
    p."Nombre Proyecto",
    COUNT(DISTINCT ec.SkIdContrato)  AS adp_contratos_cerrados
FROM adpro_ic_raw.adp_dtm_dim_especificaciondecontratos ec
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = ec.SkIdProyecto
WHERE ec.Estado ILIKE '%cerrado%'
GROUP BY p."Nombre Proyecto";
```

### ADP_Contratos_Liquidados
Contratos en estado liquidado.
```sql
SELECT
    p."Nombre Proyecto",
    COUNT(DISTINCT ec.SkIdContrato)  AS adp_contratos_liquidados
FROM adpro_ic_raw.adp_dtm_dim_especificaciondecontratos ec
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = ec.SkIdProyecto
WHERE ec.Estado ILIKE '%liquidado%'
GROUP BY p."Nombre Proyecto";
```

### ADP_Contratos_Terminados
Contratos con fecha fin anterior a hoy, sin importar estado de cierre formal.
```sql
SELECT
    p."Nombre Proyecto",
    COUNT(DISTINCT ec.SkIdContrato)  AS adp_contratos_terminados
FROM adpro_ic_raw.adp_dtm_dim_especificaciondecontratos ec
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = ec.SkIdProyecto
WHERE ec."Fecha fin" < CURRENT_DATE
  AND ec.Estado NOT ILIKE '%anulado%'
GROUP BY p."Nombre Proyecto";
```

### ADP_Contratos_A_Cerrar / ADP_Contratos_A_Liquidar
Contratos activos con fecha fin próxima (por vencer en los próximos N días).
```sql
-- Por vencer en próximos 30 días:
SELECT
    p."Nombre Proyecto",
    t.Nombre AS contratista,
    ec."No. Contrato",
    ec."Fecha inicio",
    ec."Fecha fin",
    EXTRACT(DAY FROM ec."Fecha fin" - CURRENT_DATE)  AS dias_para_vencer
FROM adpro_ic_raw.adp_dtm_dim_especificaciondecontratos ec
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = ec.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_tercero t ON t.SkIdTercero = ec.SkIdTercero
WHERE ec."Fecha fin" BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND ec.Estado NOT ILIKE '%cerrado%'
  AND ec.Estado NOT ILIKE '%liquidado%'
  AND ec.Estado NOT ILIKE '%anulado%'
ORDER BY ec."Fecha fin";
```

### ADP_ContratoR_Valor Contrato R
Valor total de contratos vigentes.
```sql
SELECT
    p."Nombre Proyecto",
    t.Nombre AS contratista,
    ec."No. Contrato",
    ec."Fecha inicio",
    ec."Fecha fin",
    ec.Estado,
    SUM(c."Valor Total")   AS adp_valor_contrato
FROM adpro_ic_raw.adp_dtm_fact_contratos c
JOIN adpro_ic_raw.adp_dtm_dim_especificaciondecontratos ec ON ec."No. Contrato" = c."No. Contrato"
    AND ec.SkIdProyecto = c.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = c.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_tercero t ON t.SkIdTercero = c.SkIdTercero
GROUP BY p."Nombre Proyecto", t.Nombre, ec."No. Contrato", ec."Fecha inicio", ec."Fecha fin", ec.Estado
ORDER BY adp_valor_contrato DESC;
```

### ADP_ContratoR_Saldo Contrato
Saldo del contrato sin ejecutar = Valor Contrato - Valor Actas.
```sql
WITH valor_contratos AS (
    SELECT c.SkIdProyecto, c."No. Contrato", SUM(c."Valor Total") AS valor_contrato
    FROM adpro_ic_raw.adp_dtm_fact_contratos c
    GROUP BY c.SkIdProyecto, c."No. Contrato"
),
valor_actas AS (
    SELECT a.SkIdProyecto, a."No Contrato", SUM(a."Valor Total Acta") AS valor_actas
    FROM adpro_ic_raw.adp_dtm_fact_acta a
    WHERE a."Tipo Acta" NOT ILIKE '%devolucion%'
    GROUP BY a.SkIdProyecto, a."No Contrato"
)
SELECT
    p."Nombre Proyecto",
    t.Nombre AS contratista,
    vc."No. Contrato",
    vc.valor_contrato,
    COALESCE(va.valor_actas, 0)                             AS valor_actas_acc,
    vc.valor_contrato - COALESCE(va.valor_actas, 0)         AS adp_saldo_contrato,
    ROUND(100.0 * COALESCE(va.valor_actas, 0) / NULLIF(vc.valor_contrato, 0), 1) AS pct_ejecutado
FROM valor_contratos vc
LEFT JOIN valor_actas va ON va.SkIdProyecto = vc.SkIdProyecto
    AND va."No Contrato" = vc."No. Contrato"
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = vc.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_fact_contratos c ON c.SkIdProyecto = vc.SkIdProyecto
    AND c."No. Contrato" = vc."No. Contrato"
JOIN adpro_ic_raw.adp_dtm_dim_tercero t ON t.SkIdTercero = c.SkIdTercero
GROUP BY p."Nombre Proyecto", t.Nombre, vc."No. Contrato", vc.valor_contrato, va.valor_actas
ORDER BY adp_saldo_contrato DESC;
```

### ADP_Contratos_Promedio_de_Dias_Fin-Cierre
Días promedio que tarda un contrato entre su fecha de fin y su fecha de cierre/liquidación.
```sql
SELECT
    p."Nombre Proyecto",
    AVG(EXTRACT(DAY FROM ec."Fecha cierre" - ec."Fecha fin"))  AS adp_prom_dias_fin_cierre,
    MAX(EXTRACT(DAY FROM ec."Fecha cierre" - ec."Fecha fin"))  AS adp_max_dias_fin_cierre,
    COUNT(*)                                                    AS contratos_cerrados
FROM adpro_ic_raw.adp_dtm_dim_especificaciondecontratos ec
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = ec.SkIdProyecto
WHERE ec."Fecha cierre" IS NOT NULL
  AND ec."Fecha fin" IS NOT NULL
  AND ec."Fecha cierre" >= ec."Fecha fin"   -- cierre posterior al fin = normal
GROUP BY p."Nombre Proyecto";
```

---

## 7. ADP_Actas — Actas de Cobro de Contratistas (Páginas 5-2CO, Auditoría, TT-15)

### ADP_Acta_Valor Actas ACC R
Total cobrado por contratistas (actas aprobadas).
```sql
SELECT
    p."Nombre Proyecto",
    t.Nombre AS contratista,
    a."No Contrato",
    SUM(a."Valor Total Acta")   AS adp_acta_valor_acc,
    SUM(a."Valor Total Neto")   AS adp_acta_neto_acc
FROM adpro_ic_raw.adp_dtm_fact_acta a
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = a.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_tercero t ON t.SkIdTercero = a.SkIdTercero
JOIN adpro_ic_raw.adp_dtm_dim_estadopordocumento e ON e.SkIdEstado = a.SkIdEstado
WHERE e."Descripcion Estado" NOT ILIKE '%anulado%'
GROUP BY p."Nombre Proyecto", t.Nombre, a."No Contrato";
```

### ADP_ContratoR_ Actas Contrato %
% ejecutado del contrato en actas.
```sql
WITH contratos AS (
    SELECT c.SkIdProyecto, c."No. Contrato", SUM(c."Valor Total") AS valor_contrato
    FROM adpro_ic_raw.adp_dtm_fact_contratos c GROUP BY c.SkIdProyecto, c."No. Contrato"
),
actas AS (
    SELECT a.SkIdProyecto, a."No Contrato", SUM(a."Valor Total Acta") AS valor_actas
    FROM adpro_ic_raw.adp_dtm_fact_acta a
    JOIN adpro_ic_raw.adp_dtm_dim_estadopordocumento e ON e.SkIdEstado = a.SkIdEstado
    WHERE e."Descripcion Estado" NOT ILIKE '%anulado%'
    GROUP BY a.SkIdProyecto, a."No Contrato"
)
SELECT
    p."Nombre Proyecto",
    c."No. Contrato",
    c.valor_contrato,
    COALESCE(a.valor_actas, 0)  AS valor_actas_acc,
    ROUND(100.0 * COALESCE(a.valor_actas, 0) / NULLIF(c.valor_contrato, 0), 1) AS pct_actas_contrato
FROM contratos c
LEFT JOIN actas a ON a.SkIdProyecto = c.SkIdProyecto AND a."No Contrato" = c."No. Contrato"
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = c.SkIdProyecto;
```

### ADP_Acta_Valor Retegarantias ACC R
Retenciones de garantía acumuladas retenidas al contratista.
```sql
SELECT
    p."Nombre Proyecto",
    a."No Contrato",
    SUM(a."Valor Retencion Garantias")  AS adp_retegarantias_acc
FROM adpro_ic_raw.adp_dtm_fact_acta a
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = a.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_estadopordocumento e ON e.SkIdEstado = a.SkIdEstado
WHERE e."Descripcion Estado" NOT ILIKE '%anulado%'
GROUP BY p."Nombre Proyecto", a."No Contrato"
HAVING SUM(a."Valor Retencion Garantias") > 0;
```

### ADP_Acta_Valor Anticipo ACC R / ADP_Acta_Amortizacion Anticipo ACC R / ADP_Acta_Saldo Anticipo ACC R
Anticipos otorgados, amortizados y saldo pendiente de recuperar (desde FACT_Acta).
```sql
SELECT
    p."Nombre Proyecto",
    a."No Contrato",
    SUM(a."Valor Anticipo")                            AS anticipo_otorgado_acc,
    SUM(a."Valor Anticipo" * a."Porcentaje Anticipo")  AS amortizacion_acc,
    SUM(a."Valor Anticipo") -
      SUM(a."Valor Anticipo" * a."Porcentaje Anticipo") AS saldo_anticipo_acc
FROM adpro_ic_raw.adp_dtm_fact_acta a
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = a.SkIdProyecto
WHERE a."Valor Anticipo" > 0
GROUP BY p."Nombre Proyecto", a."No Contrato";
```

---

## 8. ADP_Anticipos — Anticipos de Almacén (Página 5-2CI)

### ADP_Anticipos ACC R
Total de anticipos entregados a proveedores de materiales.
```sql
SELECT
    p."Nombre Proyecto",
    t.Nombre AS proveedor,
    SUM(ant."Valor Anticipo")             AS adp_anticipos_acc,
    SUM(ant."Valor Anticipo"
        * ant."Porcentaje Amortizado"/100) AS amortizado_acc,
    SUM(ant."Valor Anticipo")
    - SUM(ant."Valor Anticipo"
        * ant."Porcentaje Amortizado"/100)  AS saldo_anticipo_acc
FROM adpro_ic_raw.adp_dtm_fact_anticipo ant
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = ant.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_tercero t ON t.SkIdTercero = ant.SkIdTercero
JOIN adpro_ic_raw.adp_dtm_dim_estadopordocumento e ON e.SkIdEstado = ant.SkIdEstado
WHERE e."Descripcion Estado" NOT ILIKE '%anulado%'
GROUP BY p."Nombre Proyecto", t.Nombre
ORDER BY saldo_anticipo_acc DESC;
```

---

## 9. ADP_Inventarios — Almacén (Páginas 5-2CI, TT-03)

### ADP_Inventarios ACC / ADP_Inv_Valor ACC
Valor actual del inventario en bodegas del proyecto.
```sql
-- Saldo neto = Entradas - Salidas - Devoluciones + Reintegros + Traslados Entrada - Traslados Salida
SELECT
    p."Nombre Proyecto",
    i."Insumo Descripcion",
    i."Tipo Descripcion"    AS tipo_insumo,
    ir."Bodega"             AS bodega,
    SUM(ir."Cantidad")      AS cantidad_neta,          -- positivo = entrada, negativo = salida
    SUM(ir."Total")         AS adp_inventario_valor_acc
FROM adpro_ic_raw.adp_dtm_fact_inventarioresumido ir
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = ir.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_insumo i ON i.SkIdInsumo = ir.SkIdInsumo
GROUP BY p."Nombre Proyecto", i."Insumo Descripcion", i."Tipo Descripcion", ir."Bodega"
HAVING SUM(ir."Cantidad") > 0   -- solo lo que aún está en stock
ORDER BY adp_inventario_valor_acc DESC;
```

### ADP_Inventarios ACC % (Indicador 5-1RR: ADP_Inventarios ACC %)
Inventario como % del presupuesto total (mide eficiencia de almacén).
```sql
WITH inventario AS (
    SELECT ir.SkIdProyecto, SUM(ir."Total") AS inv
    FROM adpro_ic_raw.adp_dtm_fact_inventarioresumido ir GROUP BY ir.SkIdProyecto
),
presupuesto AS (
    SELECT f.SkIdProyecto, SUM(f."Valor Total") AS ppto
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Presupuesto Inicial' GROUP BY f.SkIdProyecto
)
SELECT
    p."Nombre Proyecto",
    COALESCE(inv.inv, 0)                           AS inventario_acc,
    COALESCE(pp.ppto, 0)                           AS presupuesto_acc,
    ROUND(100.0 * COALESCE(inv.inv, 0) / NULLIF(pp.ppto, 0), 1) AS adp_inventario_pct
FROM presupuesto pp
LEFT JOIN inventario inv USING (SkIdProyecto)
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = pp.SkIdProyecto;
```

---

## 10. Pólizas de Contratos (Página 5-2CO)

Vencimientos de pólizas TR (Todo Riesgo) y RC (Responsabilidad Civil) por contrato.

### Semáforo de pólizas por vencer
```sql
SELECT
    p."Nombre Proyecto",
    t.Nombre AS contratista,
    ec."No. Contrato",
    pol."TipoPoliza",
    pol."PolizaNumero",
    pol."FechaVigenciaHasta",
    EXTRACT(DAY FROM pol."FechaVigenciaHasta" - CURRENT_DATE) AS dias_vigencia,
    CASE
        WHEN pol."FechaVigenciaHasta" < CURRENT_DATE         THEN 'Vencida'
        WHEN pol."FechaVigenciaHasta" < CURRENT_DATE + 30    THEN 'Por vencer < 30 días'
        WHEN pol."FechaVigenciaHasta" < CURRENT_DATE + 60    THEN 'Por vencer < 60 días'
        ELSE 'Vigente'
    END AS estado_poliza
FROM adpro_ic_raw.adp_dtm_fact_contratospolizas pol
JOIN adpro_ic_raw.adp_dtm_dim_especificaciondecontratos ec ON ec.SkIdContrato = pol.SkIdContrato
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = ec.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_tercero t ON t.SkIdTercero = ec.SkIdTercero
ORDER BY dias_vigencia;
```

---

## 11. Earned Value Management — CVG (Página 5-2CF)

El EVM cruza el avance físico de obra con el costo. Requiere:
- `BAC` = Presupuesto total (de ControlProyecto)
- `AC` = Costo real invertido (de ControlProyecto, Invertido)
- `EV` = BAC × % avance físico (el % viene de `TO_Tiempos` o `CF_Costos_SNC2`)
- `PV` = BAC × % avance teórico (según cronograma)

```sql
-- Aproximación sin la curva S (solo costo):
WITH base AS (
    SELECT
        f.SkIdProyecto,
        SUM(CASE WHEN co."Clase Descripcion" = 'Presupuesto Inicial' THEN f."Valor Total" ELSE 0 END) AS bac,
        SUM(CASE WHEN co."Clase Descripcion" = 'Invertido'           THEN f."Valor Total" ELSE 0 END) AS ac
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    GROUP BY f.SkIdProyecto
)
SELECT
    p."Nombre Proyecto",
    b.bac,
    b.ac,
    -- EV requiere % avance físico: b.bac * :pct_avance_fisico
    -- CPI = EV / AC
    -- SPI = EV / PV
    -- EAC = BAC / CPI  o  EAC = AC + (BAC - EV) / CPI
    ROUND(100.0 * b.ac / NULLIF(b.bac, 0), 1)  AS pct_costo_ejecutado
FROM base b
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = b.SkIdProyecto;
-- NOTA: CPI y SPI completos requieren integrar la curva S de CF_Costos_SNC2 o TO_Tiempos.
```

---

## 12. Proceso de Compras — SGD (Página 5-3DC)

Tiempos de ciclo del proceso de compras (desde solicitud hasta entrega).

### Compras_Duracion_Promedio_Actividad
Duración promedio de cada actividad del flujo de compras.
```sql
SELECT
    sgd."Proceso Tipo Flujo",
    sgd."Actividad Nombre",
    sgd."Area responsable flujo compras",
    COUNT(*)                                             AS procesos_evaluados,
    AVG(sgd."Actividad Duracion Real")                   AS duracion_real_promedio,
    AVG(sgd."Actividad Duracion Teorica")                AS duracion_teorica_promedio,
    AVG(sgd."Actividad Duracion Real")
      - AVG(sgd."Actividad Duracion Teorica")            AS gap_duracion,
    SUM(CASE WHEN sgd."Actividad Oportuno" = 'SI' THEN 1 ELSE 0 END) AS oportuno,
    ROUND(100.0 * SUM(CASE WHEN sgd."Actividad Oportuno" = 'SI' THEN 1 ELSE 0 END)
          / NULLIF(COUNT(*), 0), 1)                      AS pct_oportuno
FROM adpro_ic_raw.sgd_dtm_lm_compras sgd
WHERE sgd."Actividad Estado" = 'Completada'
GROUP BY sgd."Proceso Tipo Flujo", sgd."Actividad Nombre", sgd."Area responsable flujo compras"
ORDER BY gap_duracion DESC;
```

---

## 13. Posventa (Página 5-5PR)

Control de costos de posventa usando ControlProyecto con filtro por año posventa.

### Costo de posventa acumulado por proyecto
```sql
SELECT
    p."Nombre Proyecto",
    i."Insumo Descripcion",
    co."Clase Descripcion",
    SUM(f."Valor Total")  AS costo_posventa_acc
FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = f.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_insumo i ON i.SkIdInsumo = f.SkIdInsumo
JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
WHERE p."YearPosventa" IS NOT NULL   -- flag de año posventa en DIM_Proyecto
  AND co."Clase Descripcion" = 'Invertido'
GROUP BY p."Nombre Proyecto", i."Insumo Descripcion", co."Clase Descripcion"
ORDER BY costo_posventa_acc DESC;
```

---

## 14. KPI de Cumplimiento de Programa por Período — Andrés Arango / Marcela Arroyave

Este es el KPI central para las reuniones cada 15 días. Mide si cada proyecto avanzó en el ciclo del costo lo que tenía programado en ese período, y pondera el resultado por el tamaño (Proyectado) de cada proyecto.

### Concepto

```
Para cada proyecto i y cada etapa (Asegurado, Consumido, Invertido):

  Programado_periodo_i = SUM(ControlProyecto) WHERE ClaseOrigen='Presupuesto Inicial'
                         AND fecha IN [inicio_periodo, fin_periodo] AND proyecto = i

  Realizado_periodo_i  = SUM(ControlProyecto) WHERE ClaseOrigen='<etapa>'
                         AND fecha IN [inicio_periodo, fin_periodo] AND proyecto = i

  Proyectado_total_i   = SUM(ControlProyecto) WHERE ClaseOrigen='Proyección' AND proyecto = i

  % Programado_i = Programado_periodo_i / Proyectado_total_i
  % Realizado_i  = Realizado_periodo_i  / Proyectado_total_i
  Cumplimiento_i = % Realizado_i / % Programado_i

KPI_portafolio = Σ(Proyectado_total_i × Cumplimiento_i) / Σ(Proyectado_total_i)
```

**Ejemplo del usuario:**
- Proyecto A: Proyectado 100 MM → programó 2%, logró 2% → cumplimiento 100%
- Proyecto B: Proyectado 50 MM → programó 3%, logró 2% → cumplimiento 66.7%
- KPI portafolio = (100 × 100% + 50 × 66.7%) / 150 = **88.9%**

---

### SQL Base: Acumulados del Período para las 5 Etapas

```sql
-- Parámetros:
--   :fecha_inicio  → primer día del período (ej: '2026-05-01')
--   :fecha_fin     → último día del período  (ej: '2026-05-15')

WITH proyectado_total AS (
    -- Base de ponderación: valor proyectado vigente total de cada proyecto
    SELECT
        f.SkIdProyecto,
        SUM(f."Valor Total") AS proyectado_total
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Proyección'
    GROUP BY f.SkIdProyecto
),
movimiento_periodo AS (
    -- Movimiento real por etapa dentro del período
    SELECT
        f.SkIdProyecto,
        co."Clase Descripcion"  AS etapa,
        SUM(f."Valor Total")    AS valor_periodo
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_fecha d ON d.SkIdFecha = f.SkIdFecha
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE d.Fecha BETWEEN :fecha_inicio AND :fecha_fin
      AND co."Clase Descripcion" IN (
          'Presupuesto Inicial',  -- lo programado para ese período
          'Proyección',           -- reformas del período
          'Asegurado',            -- contratos firmados en el período
          'Consumido',            -- salidas de almacén en el período
          'Invertido'             -- actas causadas en el período
      )
    GROUP BY f.SkIdProyecto, co."Clase Descripcion"
)
SELECT
    p."Nombre Proyecto",
    pt.proyectado_total,
    -- Programado del período (distribución del presupuesto)
    MAX(CASE WHEN mp.etapa = 'Presupuesto Inicial' THEN mp.valor_periodo ELSE 0 END) AS programado_periodo,
    -- Realizados del período
    MAX(CASE WHEN mp.etapa = 'Proyección'          THEN mp.valor_periodo ELSE 0 END) AS reformas_periodo,
    MAX(CASE WHEN mp.etapa = 'Asegurado'           THEN mp.valor_periodo ELSE 0 END) AS asegurado_periodo,
    MAX(CASE WHEN mp.etapa = 'Consumido'           THEN mp.valor_periodo ELSE 0 END) AS consumido_periodo,
    MAX(CASE WHEN mp.etapa = 'Invertido'           THEN mp.valor_periodo ELSE 0 END) AS invertido_periodo,
    -- % sobre proyectado total (normaliza por tamaño del proyecto)
    ROUND(100.0 * MAX(CASE WHEN mp.etapa = 'Presupuesto Inicial' THEN mp.valor_periodo ELSE 0 END)
          / NULLIF(pt.proyectado_total, 0), 2) AS pct_programado,
    ROUND(100.0 * MAX(CASE WHEN mp.etapa = 'Asegurado' THEN mp.valor_periodo ELSE 0 END)
          / NULLIF(pt.proyectado_total, 0), 2) AS pct_asegurado,
    ROUND(100.0 * MAX(CASE WHEN mp.etapa = 'Consumido' THEN mp.valor_periodo ELSE 0 END)
          / NULLIF(pt.proyectado_total, 0), 2) AS pct_consumido,
    ROUND(100.0 * MAX(CASE WHEN mp.etapa = 'Invertido' THEN mp.valor_periodo ELSE 0 END)
          / NULLIF(pt.proyectado_total, 0), 2) AS pct_invertido
FROM proyectado_total pt
LEFT JOIN movimiento_periodo mp ON mp.SkIdProyecto = pt.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = pt.SkIdProyecto
WHERE p.Estado = 'En ejecucion'    -- solo proyectos activos
GROUP BY p."Nombre Proyecto", pt.proyectado_total
ORDER BY pt.proyectado_total DESC;
```

---

### SQL KPI de Cumplimiento de Asegurado (Andrés — el más crítico)

```sql
-- KPI: ¿Cuánto del plan de contratación se ejecutó en el período?
-- Parámetros: :fecha_inicio, :fecha_fin

WITH proyectado_total AS (
    SELECT f.SkIdProyecto, SUM(f."Valor Total") AS v
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Proyección'
    GROUP BY f.SkIdProyecto
),
programado AS (
    SELECT f.SkIdProyecto, SUM(f."Valor Total") AS v
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_fecha d ON d.SkIdFecha = f.SkIdFecha
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Presupuesto Inicial'
      AND d.Fecha BETWEEN :fecha_inicio AND :fecha_fin
    GROUP BY f.SkIdProyecto
),
asegurado AS (
    SELECT f.SkIdProyecto, SUM(f."Valor Total") AS v
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_fecha d ON d.SkIdFecha = f.SkIdFecha
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Asegurado'
      AND d.Fecha BETWEEN :fecha_inicio AND :fecha_fin
    GROUP BY f.SkIdProyecto
),
por_proyecto AS (
    SELECT
        pt.SkIdProyecto,
        pt.v                                                   AS proyectado_total,
        COALESCE(pg.v, 0)                                      AS programado_periodo,
        COALESCE(a.v, 0)                                       AS asegurado_periodo,
        -- Cumplimiento individual: realizado / programado (cap 200% para outliers)
        LEAST(
            COALESCE(a.v, 0) / NULLIF(COALESCE(pg.v, 0), 0),
            2.0
        )                                                      AS cumplimiento
    FROM proyectado_total pt
    LEFT JOIN programado pg ON pg.SkIdProyecto = pt.SkIdProyecto
    LEFT JOIN asegurado a ON a.SkIdProyecto = pt.SkIdProyecto
)
SELECT
    -- Detalle por proyecto
    p."Nombre Proyecto",
    pp.proyectado_total,
    pp.programado_periodo,
    pp.asegurado_periodo,
    ROUND(100.0 * pp.programado_periodo / NULLIF(pp.proyectado_total, 0), 2) AS pct_programado,
    ROUND(100.0 * pp.asegurado_periodo  / NULLIF(pp.proyectado_total, 0), 2) AS pct_asegurado,
    ROUND(100.0 * pp.cumplimiento, 1)                                        AS cumplimiento_pct,
    -- Contribución ponderada al KPI portafolio
    pp.proyectado_total * pp.cumplimiento                                     AS contribucion_ponderada
FROM por_proyecto pp
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = pp.SkIdProyecto
WHERE p.Estado = 'En ejecucion'

UNION ALL

-- Fila de totales: KPI ponderado del portafolio
SELECT
    'PORTAFOLIO'                                              AS "Nombre Proyecto",
    SUM(pp.proyectado_total),
    SUM(pp.programado_periodo),
    SUM(pp.asegurado_periodo),
    ROUND(100.0 * SUM(pp.programado_periodo) / NULLIF(SUM(pp.proyectado_total), 0), 2),
    ROUND(100.0 * SUM(pp.asegurado_periodo)  / NULLIF(SUM(pp.proyectado_total), 0), 2),
    -- KPI ponderado = Σ(Proyectado_i × Cumplimiento_i) / Σ(Proyectado_i)
    ROUND(100.0 * SUM(pp.proyectado_total * pp.cumplimiento)
          / NULLIF(SUM(pp.proyectado_total), 0), 1)          AS cumplimiento_pct,
    SUM(pp.proyectado_total * pp.cumplimiento)
FROM por_proyecto pp
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = pp.SkIdProyecto
WHERE p.Estado = 'En ejecucion'

ORDER BY proyectado_total DESC NULLS LAST;
```

---

### SQL KPI Completo: Las 3 Etapas Operativas en una sola consulta

Para el tablero de Andrés y Marcela: Asegurado, Consumido e Invertido en el mismo resultado.

```sql
-- Parámetros: :fecha_inicio, :fecha_fin
-- Muestra cumplimiento de las 3 etapas clave por proyecto + KPI ponderado portafolio

WITH proyectado_total AS (
    SELECT f.SkIdProyecto, SUM(f."Valor Total") AS v
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Proyección'
    GROUP BY f.SkIdProyecto
),
programado AS (
    SELECT f.SkIdProyecto, SUM(f."Valor Total") AS v
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_fecha d ON d.SkIdFecha = f.SkIdFecha
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Presupuesto Inicial'
      AND d.Fecha BETWEEN :fecha_inicio AND :fecha_fin
    GROUP BY f.SkIdProyecto
),
etapas AS (
    SELECT
        f.SkIdProyecto,
        co."Clase Descripcion" AS etapa,
        SUM(f."Valor Total")   AS v
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_fecha d ON d.SkIdFecha = f.SkIdFecha
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" IN ('Asegurado', 'Consumido', 'Invertido')
      AND d.Fecha BETWEEN :fecha_inicio AND :fecha_fin
    GROUP BY f.SkIdProyecto, co."Clase Descripcion"
)
SELECT
    p."Nombre Proyecto",
    ROUND(pt.v / 1e6, 1)                                    AS proyectado_mm,
    -- Programado
    ROUND(100.0 * COALESCE(pg.v, 0) / NULLIF(pt.v, 0), 2)  AS pct_programado,
    -- Asegurado
    ROUND(100.0 * COALESCE(a.v, 0) / NULLIF(pt.v, 0), 2)   AS pct_asegurado_real,
    ROUND(100.0 * LEAST(COALESCE(a.v,0)/NULLIF(COALESCE(pg.v,0),0), 2), 1) AS cumpl_asegurado_pct,
    -- Consumido
    ROUND(100.0 * COALESCE(c.v, 0) / NULLIF(pt.v, 0), 2)   AS pct_consumido_real,
    ROUND(100.0 * LEAST(COALESCE(c.v,0)/NULLIF(COALESCE(pg.v,0),0), 2), 1) AS cumpl_consumido_pct,
    -- Invertido
    ROUND(100.0 * COALESCE(i.v, 0) / NULLIF(pt.v, 0), 2)   AS pct_invertido_real,
    ROUND(100.0 * LEAST(COALESCE(i.v,0)/NULLIF(COALESCE(pg.v,0),0), 2), 1) AS cumpl_invertido_pct,
    -- Semáforo simple
    CASE
        WHEN COALESCE(a.v,0) >= COALESCE(pg.v,0) * 0.90 THEN 'Verde'
        WHEN COALESCE(a.v,0) >= COALESCE(pg.v,0) * 0.70 THEN 'Amarillo'
        ELSE 'Rojo'
    END AS semaforo_asegurado
FROM proyectado_total pt
LEFT JOIN programado pg ON pg.SkIdProyecto = pt.SkIdProyecto
LEFT JOIN etapas a ON a.SkIdProyecto = pt.SkIdProyecto AND a.etapa = 'Asegurado'
LEFT JOIN etapas c ON c.SkIdProyecto = pt.SkIdProyecto AND c.etapa = 'Consumido'
LEFT JOIN etapas i ON i.SkIdProyecto = pt.SkIdProyecto AND i.etapa = 'Invertido'
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = pt.SkIdProyecto
WHERE p.Estado = 'En ejecucion'
ORDER BY pt.v DESC;
```

---

### SQL Comparativo entre Dos Períodos (variación L10 vs L10 anterior)

Para decir en reunión: "el período pasado aseguramos X%, este período Y%, variación Z%".

```sql
-- Período actual:   :p1_inicio, :p1_fin   (ej: últimos 15 días)
-- Período anterior: :p0_inicio, :p0_fin   (ej: los 15 días anteriores)

WITH proyectado_total AS (
    SELECT f.SkIdProyecto, SUM(f."Valor Total") AS v
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Proyección'
    GROUP BY f.SkIdProyecto
),
periodo AS (
    SELECT
        f.SkIdProyecto,
        co."Clase Descripcion" AS etapa,
        CASE
            WHEN d.Fecha BETWEEN :p0_inicio AND :p0_fin THEN 'anterior'
            WHEN d.Fecha BETWEEN :p1_inicio AND :p1_fin THEN 'actual'
        END AS periodo,
        SUM(f."Valor Total") AS v
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_fecha d ON d.SkIdFecha = f.SkIdFecha
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" IN ('Presupuesto Inicial', 'Asegurado', 'Consumido', 'Invertido')
      AND d.Fecha BETWEEN :p0_inicio AND :p1_fin
    GROUP BY f.SkIdProyecto, co."Clase Descripcion",
             CASE WHEN d.Fecha BETWEEN :p0_inicio AND :p0_fin THEN 'anterior'
                  WHEN d.Fecha BETWEEN :p1_inicio AND :p1_fin THEN 'actual' END
)
SELECT
    p."Nombre Proyecto",
    ROUND(pt.v / 1e6, 1)  AS proyectado_mm,
    -- Período anterior
    ROUND(100.0 * MAX(CASE WHEN per.etapa='Presupuesto Inicial' AND per.periodo='anterior' THEN per.v ELSE 0 END) / NULLIF(pt.v,0), 2) AS pct_prog_anterior,
    ROUND(100.0 * MAX(CASE WHEN per.etapa='Asegurado'           AND per.periodo='anterior' THEN per.v ELSE 0 END) / NULLIF(pt.v,0), 2) AS pct_aseg_anterior,
    ROUND(100.0 * MAX(CASE WHEN per.etapa='Invertido'           AND per.periodo='anterior' THEN per.v ELSE 0 END) / NULLIF(pt.v,0), 2) AS pct_inv_anterior,
    -- Período actual
    ROUND(100.0 * MAX(CASE WHEN per.etapa='Presupuesto Inicial' AND per.periodo='actual'   THEN per.v ELSE 0 END) / NULLIF(pt.v,0), 2) AS pct_prog_actual,
    ROUND(100.0 * MAX(CASE WHEN per.etapa='Asegurado'           AND per.periodo='actual'   THEN per.v ELSE 0 END) / NULLIF(pt.v,0), 2) AS pct_aseg_actual,
    ROUND(100.0 * MAX(CASE WHEN per.etapa='Invertido'           AND per.periodo='actual'   THEN per.v ELSE 0 END) / NULLIF(pt.v,0), 2) AS pct_inv_actual,
    -- Variación (actual - anterior)
    ROUND(100.0 * (
        MAX(CASE WHEN per.etapa='Asegurado' AND per.periodo='actual'   THEN per.v ELSE 0 END) -
        MAX(CASE WHEN per.etapa='Asegurado' AND per.periodo='anterior' THEN per.v ELSE 0 END)
    ) / NULLIF(pt.v, 0), 2) AS variacion_asegurado_pp
FROM proyectado_total pt
LEFT JOIN periodo per ON per.SkIdProyecto = pt.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = pt.SkIdProyecto
WHERE p.Estado = 'En ejecucion'
GROUP BY p."Nombre Proyecto", pt.v
ORDER BY pt.v DESC;
```

---

### Corrección: KPI de Asegurado — Snapshot, no Flujo

Para Asegurado la pregunta no es "¿cuánto se aseguró en este período?"
sino "¿cuánto aumentó el acumulado de Asegurado en este período?".
Es una comparación de dos fotos del acumulado.

```
Delta_Asegurado = Asegurado_ACC_hoy - Asegurado_ACC_hace_15_días
% Delta vs Proyectado = Delta / Proyectado_total × 100
```

```sql
-- Foto del Asegurado acumulado en dos fechas distintas
-- :fecha_anterior = hace 15 días  |  :fecha_actual = hoy

WITH proyectado_total AS (
    SELECT f.SkIdProyecto, SUM(f."Valor Total") AS v
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Proyección'
    GROUP BY f.SkIdProyecto
),
asegurado_foto AS (
    -- Dos fotos del acumulado de Asegurado: una por cada fecha
    SELECT
        f.SkIdProyecto,
        SUM(CASE WHEN d.Fecha <= :fecha_anterior THEN f."Valor Total" ELSE 0 END) AS aseg_anterior,
        SUM(CASE WHEN d.Fecha <= :fecha_actual   THEN f."Valor Total" ELSE 0 END) AS aseg_actual
    FROM adpro_ic_raw.adp_dtm_fact_controlproyecto f
    JOIN adpro_ic_raw.adp_dtm_dim_fecha d ON d.SkIdFecha = f.SkIdFecha
    JOIN adpro_ic_raw.adp_dtm_dim_controlclaseorigen co ON co.SkIdClaseOrigen = f.SkIdClaseOrigen
    WHERE co."Clase Descripcion" = 'Asegurado'
    GROUP BY f.SkIdProyecto
)
SELECT
    p."Nombre Proyecto",
    ROUND(pt.v / 1e6, 1)                                                           AS proyectado_mm,
    -- Foto anterior
    ROUND(100.0 * af.aseg_anterior / NULLIF(pt.v, 0), 2)                          AS pct_asegurado_anterior,
    -- Foto actual
    ROUND(100.0 * af.aseg_actual   / NULLIF(pt.v, 0), 2)                          AS pct_asegurado_actual,
    -- Delta del período (el avance real en los últimos 15 días)
    ROUND(100.0 * (af.aseg_actual - af.aseg_anterior) / NULLIF(pt.v, 0), 2)       AS delta_asegurado_pp,
    -- Valor absoluto del delta
    ROUND((af.aseg_actual - af.aseg_anterior) / 1e6, 2)                           AS delta_asegurado_mm,
    -- Semáforo vs meta manual de período (:meta_pct = % esperado de avance, ej: 2.0)
    CASE
        WHEN (af.aseg_actual - af.aseg_anterior) / NULLIF(pt.v, 0) >= :meta_pct / 100.0 * 0.90 THEN 'Verde'
        WHEN (af.aseg_actual - af.aseg_anterior) / NULLIF(pt.v, 0) >= :meta_pct / 100.0 * 0.70 THEN 'Amarillo'
        ELSE 'Rojo'
    END AS semaforo
FROM proyectado_total pt
JOIN asegurado_foto af ON af.SkIdProyecto = pt.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = pt.SkIdProyecto
WHERE p.Estado = 'En ejecucion'
ORDER BY pt.v DESC;
```

---

### Nota sobre el "Programado del período"

El Presupuesto Inicial en ControlProyecto tiene fechas que representan cuándo estaba planeado ejecutar ese gasto. Esto funciona como el "plan" del período. Si en tu base de datos las fechas del Presupuesto Inicial no están distribuidas en el tiempo (sino todas en la fecha de aprobación), el "programado del período" debería venir de:
- `ADP_DTM_FACT_LM_Flujo` — tabla de flujo semanal para la Curva S (confirmar con Luis Miguel)
- O bien definir el programa manualmente como: `proyectado_total / meses_de_obra × (días_período / 30)`

```sql
-- Programado estimado si no hay distribución temporal en Presupuesto Inicial:
-- programado_periodo = proyectado_total / duracion_total_dias * dias_en_periodo

SELECT
    p."Nombre Proyecto",
    pt.v AS proyectado_total,
    EXTRACT(DAY FROM p."Fecha De Finalizacion" - p."Fecha De Inicio")  AS duracion_total_dias,
    EXTRACT(DAY FROM CAST(:fecha_fin AS DATE) - CAST(:fecha_inicio AS DATE)) + 1 AS dias_periodo,
    pt.v / NULLIF(
        EXTRACT(DAY FROM p."Fecha De Finalizacion" - p."Fecha De Inicio"), 0
    ) * (EXTRACT(DAY FROM CAST(:fecha_fin AS DATE) - CAST(:fecha_inicio AS DATE)) + 1)
    AS programado_estimado_periodo
FROM proyectado_total pt
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = pt.SkIdProyecto
WHERE p.Estado = 'En ejecucion';
```

---

## 15. Programación Intermedia y Programación Obra — KPIs de Avance Físico (Página 5-3TI / 5-3TO)

Estas dos medidas NO vienen de ADPRO. Son el avance físico de la obra medido por cronograma, y alimentan los indicadores del dashboard 5-1RR de cada proyecto.

| Indicador | Fuente | Qué mide |
|-----------|--------|---------|
| **Programación Intermedia** | `TI_TiemposV8` / `TI_TiemposRV8` | Avance físico según el programa de la **Interventoría** (3° independiente) |
| **Programación Obra** | `TO_Tiempos_v2` / `TO_TiemposR` | Avance físico según el programa propio de **IC Constructora** |

En la visual (gauges del screenshot):
- **Naranja** = ejecutado real (`D CurvaS`)
- **Gris** = programado según cronograma a la fecha de corte (`P CurvaS`)
- **Atraso %** = programado − ejecutado = `Z Diff % CurvaS`
- **Atraso (d)** = días de desfase = `Z Diff Dias HOY`
- **Variación FIN** = días de corrimiento en la fecha de terminación = `Z VariacionFin`

---

### SQL: Avance Físico — Programación Obra (TO_Tiempos)

La Curva S de obra se calcula como el porcentaje de avance ponderado por duración o peso de cada actividad.

```sql
-- % avance planificado y ejecutado a una fecha de corte
-- :fecha_corte = fecha de la reunión (ej: CURRENT_DATE)

SELECT
    p."Nombre Proyecto",
    tr.ETAPA,
    tr.CAPITULO,
    tr.ACTIVIDAD,
    tr.TORRE,
    -- Fechas del cronograma
    tv.TO_Tiempos_P_Start   AS inicio_programado,
    tv.TO_Tiempos_P_Finish  AS fin_programado,
    tv.TO_Tiempos_D_Finish  AS fin_ejecutado,
    -- Avance teórico a la fecha de corte (% que debería estar hecho)
    CASE
        WHEN :fecha_corte <= tv.TO_Tiempos_P_Start THEN 0.0
        WHEN :fecha_corte >= tv.TO_Tiempos_P_Finish THEN 1.0
        ELSE EXTRACT(DAY FROM CAST(:fecha_corte AS DATE) - tv.TO_Tiempos_P_Start)
             / NULLIF(EXTRACT(DAY FROM tv.TO_Tiempos_P_Finish - tv.TO_Tiempos_P_Start), 0)
    END AS pct_planificado_actividad,
    -- Avance real (viene del campo ejecutado)
    tv.TO_Tiempos_P_HOY     AS pct_ejecutado_actividad
FROM adpro_ic_raw.to_tiemposr tr   -- tabla de actividades del cronograma de obra
JOIN adpro_ic_raw.to_tiempos_v2 tv ON tv.SkIdActividad = tr.SkIdActividad
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = tr.SkIdProyecto
WHERE p.Estado = 'En ejecucion';
```

### SQL: Curva S Agregada — Programación Obra (% portafolio)

```sql
-- Avance físico ponderado por duración de actividad (equivalente a la Curva S del gauge)
-- :fecha_corte = hoy o fecha de la reunión

WITH actividades AS (
    SELECT
        tr.SkIdProyecto,
        -- Peso de la actividad: duración programada en días
        GREATEST(
            EXTRACT(DAY FROM tv.TO_Tiempos_P_Finish - tv.TO_Tiempos_P_Start),
            1
        ) AS duracion_dias,
        -- % planificado a la fecha de corte
        CASE
            WHEN :fecha_corte <= tv.TO_Tiempos_P_Start  THEN 0.0
            WHEN :fecha_corte >= tv.TO_Tiempos_P_Finish THEN 1.0
            ELSE EXTRACT(DAY FROM CAST(:fecha_corte AS DATE) - tv.TO_Tiempos_P_Start)
                 / NULLIF(EXTRACT(DAY FROM tv.TO_Tiempos_P_Finish - tv.TO_Tiempos_P_Start), 0)
        END AS pct_planificado,
        -- % ejecutado real reportado
        COALESCE(tv.TO_Tiempos_P_HOY, 0) AS pct_ejecutado
    FROM adpro_ic_raw.to_tiemposr tr
    JOIN adpro_ic_raw.to_tiempos_v2 tv ON tv.SkIdActividad = tr.SkIdActividad
)
SELECT
    p."Nombre Proyecto",
    -- Curva S Planificada (lo naranja del gauge = "94.1%")
    ROUND(100.0 * SUM(a.duracion_dias * a.pct_planificado)
          / NULLIF(SUM(a.duracion_dias), 0), 1)   AS curvas_planificado_pct,
    -- Curva S Ejecutada (lo verde/gris del gauge = "92.2%")
    ROUND(100.0 * SUM(a.duracion_dias * a.pct_ejecutado)
          / NULLIF(SUM(a.duracion_dias), 0), 1)   AS curvas_ejecutado_pct,
    -- Atraso = diferencia
    ROUND(100.0 * SUM(a.duracion_dias * (a.pct_planificado - a.pct_ejecutado))
          / NULLIF(SUM(a.duracion_dias), 0), 1)   AS atraso_pp
FROM actividades a
JOIN adpro_ic_raw.to_tiemposr tr ON tr.SkIdProyecto = a.SkIdProyecto
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = a.SkIdProyecto
WHERE p.Estado = 'En ejecucion'
GROUP BY p."Nombre Proyecto"
ORDER BY atraso_pp DESC;
```

### SQL: KPI Comparativo Período — Programación Obra

Para la reunión cada 15 días: ¿cuánto avanzó la Curva S respecto al período anterior?

```sql
-- :p0_fecha = fecha de la reunión anterior (hace 15 días)
-- :p1_fecha = fecha de hoy

WITH curva_en_fecha AS (
    SELECT
        tr.SkIdProyecto,
        -- Curva S a fecha anterior
        SUM(
            GREATEST(EXTRACT(DAY FROM tv.TO_Tiempos_P_Finish - tv.TO_Tiempos_P_Start), 1)
            * CASE
                WHEN :p0_fecha <= tv.TO_Tiempos_P_Start  THEN 0.0
                WHEN :p0_fecha >= tv.TO_Tiempos_P_Finish THEN 1.0
                ELSE EXTRACT(DAY FROM CAST(:p0_fecha AS DATE) - tv.TO_Tiempos_P_Start)
                     / NULLIF(EXTRACT(DAY FROM tv.TO_Tiempos_P_Finish - tv.TO_Tiempos_P_Start), 0)
              END
        ) / NULLIF(SUM(GREATEST(EXTRACT(DAY FROM tv.TO_Tiempos_P_Finish - tv.TO_Tiempos_P_Start), 1)), 0)
            AS pct_planificado_anterior,

        -- Curva S a fecha actual
        SUM(
            GREATEST(EXTRACT(DAY FROM tv.TO_Tiempos_P_Finish - tv.TO_Tiempos_P_Start), 1)
            * CASE
                WHEN :p1_fecha <= tv.TO_Tiempos_P_Start  THEN 0.0
                WHEN :p1_fecha >= tv.TO_Tiempos_P_Finish THEN 1.0
                ELSE EXTRACT(DAY FROM CAST(:p1_fecha AS DATE) - tv.TO_Tiempos_P_Start)
                     / NULLIF(EXTRACT(DAY FROM tv.TO_Tiempos_P_Finish - tv.TO_Tiempos_P_Start), 0)
              END
        ) / NULLIF(SUM(GREATEST(EXTRACT(DAY FROM tv.TO_Tiempos_P_Finish - tv.TO_Tiempos_P_Start), 1)), 0)
            AS pct_planificado_actual,

        -- Ejecutado real a fecha actual (lo que reporta el equipo de obra)
        SUM(
            GREATEST(EXTRACT(DAY FROM tv.TO_Tiempos_P_Finish - tv.TO_Tiempos_P_Start), 1)
            * COALESCE(tv.TO_Tiempos_P_HOY, 0)
        ) / NULLIF(SUM(GREATEST(EXTRACT(DAY FROM tv.TO_Tiempos_P_Finish - tv.TO_Tiempos_P_Start), 1)), 0)
            AS pct_ejecutado_actual

    FROM adpro_ic_raw.to_tiemposr tr
    JOIN adpro_ic_raw.to_tiempos_v2 tv ON tv.SkIdActividad = tr.SkIdActividad
    GROUP BY tr.SkIdProyecto
)
SELECT
    p."Nombre Proyecto",
    ROUND(100.0 * cf.pct_planificado_anterior, 1) AS curva_prog_anterior_pct,
    ROUND(100.0 * cf.pct_planificado_actual,   1) AS curva_prog_actual_pct,
    ROUND(100.0 * cf.pct_ejecutado_actual,     1) AS curva_ejec_actual_pct,
    -- Avance programado en el período (lo que DEBÍA avanzar)
    ROUND(100.0 * (cf.pct_planificado_actual - cf.pct_planificado_anterior), 2) AS avance_prog_periodo_pp,
    -- Atraso actual
    ROUND(100.0 * (cf.pct_planificado_actual - cf.pct_ejecutado_actual), 1)     AS atraso_actual_pp,
    -- Semáforo
    CASE
        WHEN cf.pct_ejecutado_actual >= cf.pct_planificado_actual * 0.98 THEN 'Verde'
        WHEN cf.pct_ejecutado_actual >= cf.pct_planificado_actual * 0.90 THEN 'Amarillo'
        ELSE 'Rojo'
    END AS semaforo_obra
FROM curva_en_fecha cf
JOIN adpro_ic_raw.adp_dtm_dim_proyecto p ON p.SkIdProyecto = cf.SkIdProyecto
WHERE p.Estado = 'En ejecucion'
ORDER BY atraso_actual_pp DESC;
```

> **Nota:** Los nombres exactos de columnas en `to_tiempos_v2` y `to_tiemposr` deben confirmarse con Luis Miguel — son tablas externas a ADPRO (origen: MS Project u OBR exportado). Los nombres `TO_Tiempos_P_Start`, `TO_Tiempos_P_Finish`, `TO_Tiempos_P_HOY` son los que aparecen en el modelo Power BI.

---

### Resumen: KPIs de Andrés Arango y Marcela Arroyave por reunión cada 15 días

| KPI | Etapa | Cómo medir | Tabla fuente |
|-----|-------|------------|--------------|
| % Programa Obra ejecutado | Tiempo | Curva S ejecutada vs planificada | `TO_Tiempos_v2` |
| % Programa Intermedia ejecutado | Tiempo | Curva S interventoría | `TI_TiemposV8` |
| Delta Asegurado período | Costo | Snapshot ACC hoy − ACC hace 15d | `FACT_ControlProyecto` (Asegurado) |
| Delta Consumido período | Costo | Snapshot ACC hoy − ACC hace 15d | `FACT_ControlProyecto` (Consumido) |
| Delta Invertido vs Programado | Costo | Flujo período real / flujo período ppto | `FACT_ControlProyecto` (Invertido vs Presupuesto Inicial) |
| KPI ponderado portafolio | Costo | Σ(Proyectado_i × Cumplimiento_i) / Σ(Proyectado_i) | Ver Sección 14 |
| Contratos por vencer | Contratos | Fecha fin − hoy ≤ 30/60 días | `DIM_EspecificacionDeContratos` |
| Anticipos sin amortizar | Contratos | Saldo anticipo ACC | `FACT_Anticipo` + `FACT_Acta` |

---

## Apéndice A: Tablas documentadas en .md vs usadas en el reporte

| Tabla Power BI | Documentada en .md | Tabla SQL probable |
|---|---|---|
| `ADP_DTM_DIM_Proyecto` | ✅ | `adp_dtm_dim_proyecto` |
| `ADP_DTM_DIM_Insumo` | ✅ | `adp_dtm_dim_insumo` |
| `ADP_DTM_DIM_Items` | ✅ | `adp_dtm_dim_items` |
| `ADP_DTM_DIM_CapituloPresupuesto` | ✅ | `adp_dtm_dim_capitulo` |
| `ADP_DTM_DIM_Tercero` | ✅ | `adp_dtm_dim_tercero` |
| `ADP_DTM_DIM_Empresa` | ✅ | `adp_dtm_dim_empresa` |
| `ADP_DTM_DIM_Fecha` | ✅ | `adp_dtm_dim_fecha` |
| `ADP_DTM_DIM_Usuario` | ✅ | `adp_dtm_dim_usuario` |
| `ADP_DTM_DIM_ControlClaseOrigen` | ✅ | `adp_dtm_dim_controlclaseorigen` |
| `ADP_DTM_DIM_EstadoPorDocumento` | ✅ | `adp_dtm_dim_estadopordocumento` |
| `ADP_DTM_DIM_TipoContrato` | ✅ | `adp_dtm_dim_tipocontrato` |
| `ADP_DTM_FACT_ControlProyecto` | ✅ | `adp_dtm_fact_controlproyecto` |
| `ADP_DTM_FACT_Proyeccion` | ✅ | `adp_dtm_fact_proyeccion` |
| `ADP_DTM_FACT_Contratos` | ✅ | `adp_dtm_fact_contratos` |
| `ADP_DTM_FACT_Acta` | ✅ | `adp_dtm_fact_acta` |
| `ADP_DTM_FACT_Anticipo` | ✅ | `adp_dtm_fact_anticipo` |
| `ADP_DTM_FACT_Pedidos` | ✅ | `adp_dtm_fact_pedidos` |
| `ADP_DTM_FACT_Compras` | ✅ | `adp_dtm_fact_compras` |
| `ADP_DTM_FACT_EntradasAlmacen` | ✅ | `adp_dtm_fact_entradasalmacen` |
| `ADP_DTM_FACT_SalidasAlmacen` | ✅ | `adp_dtm_fact_salidasalmacen` |
| `ADP_DTM_FACT_Devoluciones` | ✅ | `adp_dtm_fact_devoluciones` |
| `ADP_DTM_FACT_Reintegro` | ✅ | `adp_dtm_fact_reintegro` |
| `ADP_DTM_FACT_Traslados` | ✅ | `adp_dtm_fact_traslados` |
| `ADP_DTM_FACT_InventarioResumido` | ✅ | `adp_dtm_fact_inventarioresumido` |
| `ADP_DTM_DIM_EspecificacionDeContratos` | ⚠️ NO | Pendiente documentar |
| `ADP_DTM_FACT_ContratosPolizas` | ⚠️ NO | Pendiente documentar |
| `ADP_DTM_DIM_SubCapitulos` | ⚠️ NO | Pendiente documentar |
| `ADP_DTM_FACT_LM_Flujo` | ⚠️ NO | Tabla de flujo semanal para Curva S |
| `CF_Costos_SNC2` | ⚠️ NO | Curva S de costos (origen externo a ADPRO) |
| `CVG_EarnedValueManagement` | ⚠️ NO | EVM calculado (probablemente tabla calculada PBI) |
| `SGD_DTM_LM_Compras` | ⚠️ NO | Sistema de Gestión Documental — flujo compras |

---

## Apéndice B: Glosario de términos del reporte

| Término en reporte | Significado | Fuente |
|---|---|---|
| **Presupuestado** | Presupuesto inicial aprobado antes de iniciar obra | `ControlProyecto` donde ClaseOrigen = Presupuesto Inicial |
| **Proyectado** | Presupuesto vigente tras reformas (puede subir o bajar) | `ControlProyecto` donde ClaseOrigen = Proyección |
| **Diferencia** | Proyectado − Presupuesto (reforma neta) | Cálculo: Proyectado − Presupuesto |
| **Asegurado** | Valor bajo contrato firmado con contratista | `ControlProyecto` donde ClaseOrigen = Asegurado |
| **Por Asegurar** | Proyectado − Asegurado (aún sin contratar) | Cálculo |
| **Consumido** | Materiales despachados del almacén a la obra | `ControlProyecto` donde ClaseOrigen = Consumido |
| **Por Consumir** | Asegurado − Consumido (en almacén o en tránsito) | Cálculo |
| **Invertido** | Costo real causado (actas aprobadas + ajustes) | `ControlProyecto` donde ClaseOrigen = Invertido |
| **Por Invertir** | Proyectado − Invertido (saldo por causar hasta cierre) | Cálculo |
| **Contrato Cerrado** | Contrato firmado que ya tiene fecha de cierre | `DIM_EspecificacionDeContratos.Estado` |
| **Contrato Liquidado** | Contrato cerrado con acta de liquidación firmada | `DIM_EspecificacionDeContratos.Estado` |
| **Contrato Terminado** | Contrato cuya fecha fin ya pasó (sin cierre formal) | `"Fecha fin" < CURRENT_DATE` |
| **Saldo Anticipo** | Anticipo entregado que aún no se ha amortizado | `Valor Anticipo × (1 − Porcentaje Amortizado)` |
| **Retegarantías** | Retención del % de garantía en actas (fondo de garantía) | `Valor Retencion Garantias` en `FACT_Acta` |
| **Acta** | Cobro parcial del contratista contra su contrato | `FACT_Acta.Valor Total Acta` |
| **Inventario** | Stock valorizado en bodegas del proyecto | `FACT_InventarioResumido` (saldo neto entradas/salidas) |
| **ACC** (sufijo) | Acumulado hasta la fecha de corte | Sin filtro de período o `<= fecha_corte` |
| **MES** (sufijo) | Del mes seleccionado en el filtro del reporte | `YEAR=:año AND MES=:mes` |
| **R** (sufijo) | Valor real en pesos (no porcentaje) | Distingue del indicador `%` |
| **MOD** (sufijo) | Invertido ajustado (incluye notas en valor y traslados) | Ajuste en ControlProyecto |
| **Curva S** | Distribución acumulada del costo/avance en el tiempo | `CF_Costos_SNC2` / `TO_Tiempos` |
| **CPI** | Cost Performance Index = EV / AC (> 1 es eficiente) | `CVG_EarnedValueManagement` |
| **SPI** | Schedule Performance Index = EV / PV (> 1 es adelantado) | `CVG_EarnedValueManagement` |
| **EAC** | Estimate At Completion = costo proyectado a terminar | BAC / CPI |

---

*Documento generado a partir de `04-InfVIC-OBR.pbix` + schemas `ADPRO/*.md` — IC Constructora — Mayo 2026*
