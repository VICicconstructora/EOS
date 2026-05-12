# `adi_dtm_proyectos`

> **Power BI:** `ADI_DTM Proyectos`  ·  **Rol:** Dimensión  ·  **Filas:** 28  ·  **Columnas:** 48

## Propósito

Catálogo de proyectos / etapas inmobiliarias.

## Reglas de Negocio (¡IMPORTANTE!)

*   **Estado del Proyecto (`prycodigoestadoproyecto`):** A nivel de la dimensión "Proyecto", el estado **no es una variable crítica de filtro**. Para analizar cartera, ventas o estados, el negocio prefiere realizar los cortes a nivel de detalle (cliente / venta) en lugar de filtrar todo un proyecto.
*   **Vivienda de Interés Social - VIS (`pryvis`):** Esta bandera es **muy importante**. Los proyectos categorizados como **No VIS** NUNCA deberían permitir tener ingresos asociados a "Subsidios" en las tablas de pagos/conceptos. Los proyectos **VIS** sí lo permiten. Esta es una regla de validación de negocio clave para cruzar con `adi_dtm_conceptospp` y `adi_dtm_relacion_pagos`.
*   **Fechas Críticas de Etapa:** Aunque hay muchas fechas, las indispensables para entender en qué punto se encuentra una etapa son:
    *   **Licencia (`pryfechalicencia`):** Sin esta fecha registrada, no se puede iniciar la construcción.
    *   **Permiso de Ventas (`pryfechapermisoventa`):** Habilita la comercialización.
    *   **Punto de Equilibrio (`pryfechapuntoequilibrio...`):** Es de vital importancia financiera. Hasta que no se logre el punto de equilibrio, la empresa no puede tocar (usar) la plata ingresada por los clientes (se queda en encargo fiduciario).
*   **Entidad Fiduciaria (`pryentidadfiduciaria`):** Se tiene el dato informativo, pero a nivel de proyecto es muy general y casi no se usa como filtro. Lo que sí se revisa minuciosamente es en la tabla de consignaciones reales (`adi_dtm_relacion_pagos`), donde se verifica de qué banco entró el dinero y bajo qué concepto.

## Descripción

Cada fila es una etapa (proyecto Sinco). Lleva nombre, ubicación, estado, código y atributos comerciales. Es la dimensión principal después de Venta para segmentar reportes.  Como vimos en macroproyectos, el `adi_dtm_proyectos` aloja las "Subetapas" o "Etapas" de una ubicación.

## Columnas clave

- `prycodigoproyecto` — PK del proyecto (Codigo Etapa Sinco).
- `prynombreproyecto` — Nombre comercial.
- `prycodmacroproy` — FK al macroproyecto al que pertenece.
- `pryvis` — Bandera (S/N) de Vivienda de Interés Social.

## Relaciones

**FKs salientes (esta tabla referencia a):**

- `adi_dtm_proyectos.prycodmacroproy` → `adi_dtm_macroproyectos.maccodigomacro` — Macroproyecto al que pertenece.

**Referenciada por (FKs entrantes):**

- `adi_dtm_venta.idproyecto` → `adi_dtm_proyectos` — Cada venta se hace en un proyecto.
- `adi_dtm_inventarios.invcodproyecto` → `adi_dtm_proyectos` — Cada unidad de inventario pertenece a un proyecto.
- `adi_dtm_listadeprecios_detalle.codproyecto` → `adi_dtm_proyectos` — Cada renglón de lista de precios aplica a un proyecto.

## Preguntas típicas que responde

- ¿Qué proyectos (etapas) están asociados al macroproyecto XYZ?
- ¿Cuáles proyectos (No VIS) tienen reportados pagos anómalos de subsidios?
- ¿Qué proyectos ya lograron el punto de equilibrio (y por lo tanto se pueden usar sus fondos)?

## Esquema completo (48 columnas)

| # | columna | tipo | nullable |
|---|---|---|---|
| 1 | `pryempresa` | `int4` | Sí |
| 2 | `prynombreempresa` | `varchar` | Sí |
| 3 | `prycodigoproyecto` | `int4` | No |
| 4 | `prynombreproyecto` | `varchar` | Sí |
| 5 | `prycodigocentrocosto` | `varchar` | Sí |
| 6 | `prynombrecentrocosto` | `varchar` | Sí |
| 7 | `prycodigoclaseproyecto` | `int4` | Sí |
| 8 | `prynombreclaseproyecto` | `varchar` | Sí |
| 9 | `prycodigoestadoproyecto` | `int4` | Sí |
| 10 | `prynombreestadoproyecto` | `varchar` | Sí |
| 11 | `prycodmacroproy` | `int4` | Sí |
| 12 | `prydescmacroproy` | `varchar` | Sí |
| 13 | `prynaturaleza` | `int4` | Sí |
| 14 | `prynombreciudad` | `varchar` | Sí |
| 15 | `pryetapa` | `varchar` | Sí |
| 16 | `pryestrato` | `varchar` | Sí |
| 17 | `pryinterior` | `varchar` | Sí |
| 18 | `pryfechaentrega` | `timestamp` | Sí |
| 19 | `pryfechafinaliza` | `timestamp` | Sí |
| 20 | `pryentidadcredito` | `varchar` | Sí |
| 21 | `prynitentidadcredito` | `varchar` | Sí |
| 22 | `pryentidadfiduciaria` | `varchar` | Sí |
| 23 | `prynitentidadfiduciaria` | `varchar` | Sí |
| 24 | `pryvis` | `varchar` | Sí |
| 25 | `prydireccion` | `varchar` | Sí |
| 26 | `pryfechainicialventa` | `timestamp` | Sí |
| 27 | `pryfechacortecuotas` | `timestamp` | Sí |
| 28 | `pryfechapermiso` | `timestamp` | Sí |
| 29 | `pryfechaaprobacioncredito` | `timestamp` | Sí |
| 30 | `pryfechapermisoventa` | `timestamp` | Sí |
| 31 | `pryfechapromesacompraventa` | `timestamp` | Sí |
| 32 | `pryfechaescrituracion` | `timestamp` | Sí |
| 33 | `pryfecharevision` | `timestamp` | Sí |
| 34 | `pryfechalicencia` | `timestamp` | Sí |
| 35 | `pryfechapropiedadhorizontal` | `timestamp` | Sí |
| 36 | `pryfechapuntoequilibrioini` | `timestamp` | Sí |
| 37 | `pryfechapuntoequilibriofin` | `timestamp` | Sí |
| 38 | `pryfechapuntoequilibrioreal` | `timestamp` | Sí |
| 39 | `pryfechainicialobra` | `timestamp` | Sí |
| 40 | `pryfechavencimientoentrega` | `timestamp` | Sí |
| 41 | `prynombreapoderado` | `varchar` | Sí |
| 42 | `prynumerocedulaapoderado` | `varchar` | Sí |
| 43 | `prylugarexpedicionapoderado` | `varchar` | Sí |
| 44 | `prytorre` | `varchar` | Sí |
| 45 | `prynumero` | `varchar` | Sí |
| 46 | `prycreditono` | `varchar` | Sí |
| 47 | `prycuentadesembolso` | `varchar` | Sí |
| 48 | `pryvalorseparacionproyecto` | `numeric` | Sí |

---

[← Volver al índice](../README.md)