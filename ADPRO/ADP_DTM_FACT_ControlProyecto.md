# ADP_DTM_FACT_ControlProyecto

## Objetivo

Es la tabla de hechos principal para el control financiero y operativo de los proyectos. Registra la trazabilidad completa del ciclo de vida del costo, desde el presupuesto inicial hasta el costo invertido (real), pasando por proyecciones y compromisos (asegurado/consumido). Permite realizar el análisis de desviaciones y control presupuestal a nivel de ítem e insumo.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| ADP_DTM_DIM_Proyecto | Activa | N:1 | Ubicación geográfica y operativa del costo. |
| ADP_DTM_DIM_Insumo | Activa | N:1 | Identificación del recurso (material, mano de obra, equipo). |
| ADP_DTM_DIM_Items | Activa | N:1 | Identificación de la actividad o unidad de obra. |
| ADP_DTM_DIM_CapituloPresupuesto | Activa | N:1 | Agrupación jerárquica de actividades de construcción. |
| ADP_DTM_DIM_Fecha | Activa | N:1 | Dimensión temporal para análisis de flujo de caja y cronograma. |
| ADP_DTM_DIM_Empresa | Activa | N:1 | Identificación de la entidad legal. |
| ADP_DTM_DIM_ControlClaseOrigen | Activa | N:1 | Clasificación del tipo y origen de la transacción. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdEmpresa | ID Empresa | smallint | Id de relación para Empresa. | Llave foránea a DIM_Empresa. |
| Empresa | Empresa | varchar | Nombre de la empresa. | Informativo. |
| SkIdProyecto | ID Proyecto | int | Id de relación para Proyecto. | Llave foránea a DIM_Proyecto. |
| SkIdFecha | ID Fecha | int | Id de relación para Fecha. | Llave foránea a la dimensión de tiempo (YYYYMMDD). |
| SkIdClaseOrigen | ID Clase Origen | smallint | Id de relación para ControlClaseOrigen. | Determina si es Presupuesto, Invertido, Proyección, etc. |
| SkIdInsumo | ID Insumo | int | Id de relación para Insumo. | Llave foránea a la dimensión de Insumos. |
| SkIdCapitulo | ID Capítulo | int | Id de relación para CapituloPresupuesto. | Llave foránea a la dimensión de Capítulos. |
| SkIdItems | ID Ítem | int | Id de relación para Items. | Llave foránea a la dimensión de Ítems. |
| Cantidad | Cantidad | numeric | Cantidad del control por proyecto. | Cantidad transada del insumo. |
| Valor Total | Valor Total (Con IVA) | money | Valor total del control. | **Métrica principal** para reportes oficiales. |
| Origen Documento | ID ADPRO | bigint | Código origen del documento. | Llave de auditoría para rastrear en ADPRO. |
| Origen Documento Detalle | ID ADPRO Detalle | int | Código origen del documento detallado. | Llave de auditoría a nivel de línea de documento. |
| Valor Sin IVA | Valor Neto | money | Valor sin IVA del control. | Importe de la transacción antes de impuestos. Informativo. |

## Reglas de Negocio

- **Estados del Costo**: La columna `SkIdClaseOrigen` segmenta la naturaleza de los datos. Los estados documentados son:
  1. **Presupuesto Inicial**: La base planeada original.
  2. **Proyección**: Estimaciones de costo futuro.
  3. **Asegurado**: Costos bajo contrato o compromiso firme.
  4. **Consumido**: Recursos ya asignados o retirados de almacén.
  5. **Invertido**: Costo real causado o pagado.
- **IVA**: El control de costos de la constructora se realiza sobre el **Valor Total**, considerando el IVA como parte integral del costo del proyecto.
- **Granularidad**: La información está detallada al nivel más bajo posible: **Insumo** dentro de un **Documento** específico.

## Medidas DAX Sugeridas

- **Costo Invertido (Real)**:
  `Costo Invertido = CALCULATE(SUM('ADP_DTM_FACT_ControlProyecto'[Valor Total]), 'ADP_DTM_FACT_ControlProyecto'[SkIdClaseOrigen] = [Código de Invertido])`

- **Presupuesto Vigente**:
  `Presupuesto Inicial = CALCULATE(SUM('ADP_DTM_FACT_ControlProyecto'[Valor Total]), 'ADP_DTM_FACT_ControlProyecto'[SkIdClaseOrigen] = [Código de Presupuesto])`

- **Variación de Costo**:
  `Variación = [Presupuesto Inicial] - [Costo Invertido]`

## Validaciones

- La suma de `Valor Total` debe coincidir con los auxiliares contables y de costos de ADPRO por proyecto.
- No deben existir `SkIdProyecto` o `SkIdInsumo` con valor 0 o huérfanos que no crucen con sus respectivas dimensiones.

## Casos de Uso

- Comparativo Presupuesto vs. Real por Capítulo y Proyecto.
- Análisis de explosión de insumos (cuántos materiales se han invertido vs. lo planeado).
- Seguimiento de proyecciones financieras para cierre de obra.

## Riesgos y consideraciones

- **Volumen de Datos**: Con ~1 millón de filas, es vital utilizar tipos de datos eficientes (Enteros para las llaves) y evitar columnas calculadas innecesarias.
- **Mapeo de Clases**: Es crítico validar la actualización de los códigos de `SkIdClaseOrigen` si ADPRO añade nuevas etapas al ciclo del costo.

## Recomendaciones

- **Star Schema**: Mantener esta tabla estrictamente relacionada con dimensiones para garantizar que los filtros de `Proyecto` e `Insumo` se propaguen correctamente.
- **Ocultar Valor Unitario**: Dado que el negocio se enfoca en los totales, se recomienda ocultar la columna `Valor Unitario` para evitar confusiones de redondeo en agregaciones masivas.
