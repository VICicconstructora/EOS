# `adi_dtm_desistimientosventa`

> **Power BI:** `ADI_DTM DesistimientosVentas`  ·  **Rol:** Hecho transaccional  ·  **Filas:** 811  ·  **Columnas:** 28

## Propósito

Registro histórico de ventas que fracasaron o fueron canceladas (Desistimientos) antes de la escrituración final.

## Reglas de Negocio (¡IMPORTANTE!)

*   **Borrón Físico de Tabla de Venta:** Cuando una venta se desiste en Sinco, el sistema **borra físicamente la fila hermana de la tabla `adi_dtm_venta`** y traslada toda esa estructura y montos a esta tabla (por ello la llave foránea se declara "NOT VALID" al generar la migración, la venta inicial "desapareció"). Nota: Si existieren ambas a la vez, se trata de una inconsistencia o "solapamiento fantasma" sujeto a análisis técnico.
*   **Balance de Saldos por Devolver vs Multas:**
    *   Saber cuánta plata tiene un proyecto guardada que debe retornarle a clientes desistidos (`valordevolver`) es vital para tesorería.
    *   **Arras y Penalizaciones (`valorarras`):** Este campo registra si la compañía se quedó con parte de la cuota inicial como penalización.
    *   **Casuística Motivos vs Arras:** El campo `motivo` debe cruzarse analíticamente con `valorarras`. Comercialmente, si el desistimiento se debió a fuerza mayor ("Rechazo de crédito bancario"), no se acostumbra cobrar multas porque el hecho es ajeno al comprador. Un cruce de "Motivo de retiro vs Cobro de arras" es altamente valorado por la dirección comercial.

## Descripción

Una fila por venta que fracasó a mitad de camino. Muestra cuándo, por qué y cuánto dinero quedó penalizado/devuelto.

## Columnas clave

- `idventa` — ID de la agrupación / venta (ahora borrada del maestro principal).
- `fechadesistimiento` — Cuándo se formalizó el tropiezo.
- `motivo` / `observacionesdesiste` — Causa principal por la que se cayó el negocio.
- `pagosinmueble` — Cuánto dinero había alcanzado a pagar.
- `valordevolver` / `valorarras` — Cuánto retornó al cliente y cuánto quedó como multa constructora.

## Relaciones

_Sin FKs funcionales salientes limpias._ (Intenta referenciar `adi_dtm_venta` pero es NOT VALID).

## Preguntas típicas que responde

- ¿Cuántos ingresos se detuvieron por un "Rechazo de crédito" en el Macroproyecto X?
- ¿A cuánto asciende el monto de `valordevolver` a clientes que han desistido en el último trimestre?
- ¿Qué porcentaje de las ventas caídas tienen un `valorarras` mayor a 0?

## Esquema completo (28 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `idempresa` | `int4` | Sí |
| 2 | `nombreempresa` | `varchar` | Sí |
| 3 | `codigointerno` | `varchar` | Sí |
| 4 | `codproyecto` | `int4` | Sí |
| 5 | `nombreproyecto` | `varchar` | Sí |
| 6 | `codmacroproyecto` | `int4` | Sí |
| 7 | `nombremacroproyecto` | `varchar` | Sí |
| 8 | `nombrecomprador` | `varchar` | Sí |
| 9 | `fecha` | `timestamp` | Sí |
| 10 | `tipoventa` | `varchar` | Sí |
| 11 | `noencargo` | `varchar` | Sí |
| 12 | `norefbancaria` | `varchar` | Sí |
| 13 | `valorventa` | `numeric` | Sí |
| 14 | `valorarras` | `numeric` | Sí |
| 15 | `motivo` | `varchar` | Sí |
| 16 | `idventa` | `int4` | Sí |
| 17 | `usuariodesiste` | `varchar` | Sí |
| 18 | `coddesiste` | `int4` | Sí |
| 19 | `fechaventa` | `timestamp` | Sí |
| 20 | `idvendedor` | `int4` | Sí |
| 21 | `nombrevendedor` | `varchar` | Sí |
| 22 | `doccomprador` | `varchar` | Sí |
| 23 | `idcomprador` | `int4` | Sí |
| 24 | `loghisplanpago` | `int4` | Sí |
| 25 | `observacionesdesiste` | `varchar` | Sí |
| 26 | `motivoresciliacion` | `varchar` | Sí |
| 27 | `pagosinmueble` | `numeric` | Sí |
| 28 | `valordevolver` | `numeric` | Sí |

---

[← Volver al índice](../README.md)