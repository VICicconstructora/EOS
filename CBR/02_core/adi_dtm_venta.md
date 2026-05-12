# `adi_dtm_venta`

> **Power BI:** `ADI_DTM VentaMc`  ·  **Rol:** Hecho central (fact)  ·  **Filas:** 2,682  ·  **Columnas:** 59

## Propósito

Tabla central de ventas / negocios. Es el corazón del modelo y la base de los cruces de todas las transacciones financieras.

## Reglas de Negocio (¡IMPORTANTE!)

*   **Valores Monetarios (El P&G):** Existen múltiples columnas sobre dinero (descuentos, subtotales, adicionales). A la hora de calcular **"Cuánto se vendió"** para indicadores gerenciales y para el P&G, la variable indiscutible que debe utilizarse es **`valorneto`**.
*   **La Fecha Oficial de Cierre:** Para asignar una venta a un mes/año y medir el rendimiento comercial, la regla es emplear **`fechaventa`**, ya que determina el momento de la transacción comercial. Las alternativas como `fechaseparacion` o fechas legales, aunque útiles para saber cuándo sacaron la unidad de vitrina, no definen el cierre comercial.
*   **Locatarios:** Si el tipo de venta es "Leasing", el comprador registrado en papeles puede ser el Banco, y el cliente final es anotado bajo el bloque de `locatario...` sin embargo, es un dato de **uso escaso** en la analítica del día a día, por lo que el peso analítico recae en `idcomprador`.

## Descripción

Cada fila es una venta (o *Agrupación*, como lo conoce Sinco) de una unidad inmobiliaria. Conecta transversalmente proyecto, comprador, tipo de venta, lista de precios y es referenciada por todas las tablas de transacción del flujo monetario (acuerdos, consignaciones, trámites, desistimientos).

## Columnas clave

- `idventa` — PK lógica de la Venta / Agrupación.
- `idcomprador` — FK principal para saber quién cerró el negocio comercial.
- `idproyecto` — FK al bloque físico donde se compró.
- `valorneto` — El dinero pactado como total transaccional limpio para el P.G.
- `fechaventa` — La fecha de corte comercial.

## Relaciones

**FKs salientes (esta tabla referencia a):**

- `adi_dtm_venta.idcomprador` → `adi_dtm_comprador.idcomprador` — Quién compra.
- `adi_dtm_venta.idproyecto` → `adi_dtm_proyectos.prycodigoproyecto` — En qué etapa (proyecto).
- `adi_dtm_venta.tipo` → `adi_dtm_tiposventa.desctipovta` — Modalidad de financiación/venta.

**Referenciada por (FKs entrantes):**

- `adi_dtm_acuerdos_pago.idventa` → `adi_dtm_venta` — Plan de cuotas pactadas.
- `adi_dtm_relacion_pagos.idventa` → `adi_dtm_venta` — Recaudos / consignaciones recibidas.
- `adi_dtm_tramites.idventa` → `adi_dtm_venta` — Trámites y escrituración de este negocio.
- `adi_dtm_desistimientosventa.idventa` → `adi_dtm_venta` — Registro histórico en caso de caída del negocio.

## Preguntas típicas que responde

- ¿Cuál fue la suma del `valorneto` vendido en el último trimestre (`fechaventa`)?
- ¿Cuántas ventas ha realizado cada asesor comercial (`idvendedor`)?
- ¿Cuál es el promedio de valor neto de ventas en proyectos Vivienda de Interés Social (cruzando con proyectos)?

## Esquema completo (59 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `idempresa` | `int4` | Sí |
| 2 | `nombreempresa` | `varchar` | Sí |
| 3 | `idventa` | `int4` | No |
| 4 | `idmacro` | `int4` | Sí |
| 5 | `vtanombremacro` | `varchar` | Sí |
| 6 | `idproyecto` | `int4` | Sí |
| 7 | `vtanombreproyecto` | `varchar` | Sí |
| 8 | `idcomprador` | `int4` | Sí |
| 9 | `nombrecomprador` | `varchar` | Sí |
| 10 | `area` | `float8` | Sí |
| 11 | `tipo` | `varchar` | Sí |
| 12 | `unidadppal` | `int4` | Sí |
| 13 | `codigointerno` | `varchar` | Sí |
| 14 | `fechaventa` | `timestamp` | Sí |
| 15 | `subtotal` | `numeric` | Sí |
| 16 | `dtofinanciero` | `numeric` | Sí |
| 17 | `dtocomercial` | `numeric` | Sí |
| 18 | `valoradicionales` | `numeric` | Sí |
| 19 | `valosexclusiones` | `numeric` | Sí |
| 20 | `vrsobrecostos` | `numeric` | Sí |
| 21 | `valorneto` | `numeric` | Sí |
| 22 | `estadoventa` | `varchar` | Sí |
| 23 | `idvendedor` | `int4` | Sí |
| 24 | `nombrevendedor` | `varchar` | Sí |
| 25 | `idmediopub` | `int4` | Sí |
| 26 | `nombremediopub` | `varchar` | Sí |
| 27 | `compradoppalporc` | `float8` | Sí |
| 28 | `visitacrm` | `int4` | Sí |
| 29 | `visitantecrm` | `int4` | Sí |
| 30 | `encargono` | `varchar` | Sí |
| 31 | `referenciabancariano` | `varchar` | Sí |
| 32 | `observaciones` | `text` | Sí |
| 33 | `escriturano` | `varchar` | Sí |
| 34 | `escriturafecha` | `timestamp` | Sí |
| 35 | `creditono` | `varchar` | Sí |
| 36 | `etapa` | `varchar` | Sí |
| 37 | `exterior` | `varchar` | Sí |
| 38 | `locatarionombre` | `varchar` | Sí |
| 39 | `locatariocedula` | `varchar` | Sí |
| 40 | `locatarioemail` | `varchar` | Sí |
| 41 | `locatariotel` | `varchar` | Sí |
| 42 | `locatariodir` | `varchar` | Sí |
| 43 | `fechaseparacion` | `timestamp` | Sí |
| 44 | `vtaentidadcredito` | `varchar` | Sí |
| 45 | `escrituravalor` | `numeric` | Sí |
| 46 | `vtanotarianombre` | `varchar` | Sí |
| 47 | `vtanotariaciudad` | `varchar` | Sí |
| 48 | `vtamotivocompra` | `varchar` | Sí |
| 49 | `vtafechareal` | `timestamp` | Sí |
| 50 | `vtamodalidadcredito` | `varchar` | Sí |
| 51 | `vtaplazocredito` | `varchar` | Sí |
| 52 | `vtatipocreditodescripcion` | `varchar` | Sí |
| 53 | `vtaestadoplanpago` | `varchar` | Sí |
| 54 | `dtocomercial2` | `numeric` | Sí |
| 55 | `compradordocumento` | `varchar` | Sí |
| 56 | `vtaidhubspot` | `varchar` | Sí |
| 57 | `vtatipoprecio` | `varchar` | Sí |
| 58 | `vtanombreregistro` | `varchar` | Sí |
| 59 | `vtanombrebeneficencia` | `varchar` | Sí |

---

[← Volver al índice](../README.md)