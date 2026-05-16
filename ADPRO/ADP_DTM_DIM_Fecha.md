# Dimensión: ADP_DTM_DIM_Fecha

Esta es la dimensión de calendario estándar del modelo, permitiendo el análisis de series temporales y comparativas por periodos.

## Fuente de datos

Sistema ADPRO (Sinco). Documentación oficial Datamart ADPRO Feb 2022.

## Relaciones

| Tabla Relacionada | Tipo de Relación | Cardinalidad | Propósito |
|---|---|---|---|
| Todas las tablas FACT | Activa | 1:N | Eje temporal para análisis de flujo de caja y cronograma. |

## Columnas

| Nombre Técnico | Nombre Funcional | Tipo de Dato | Descripción | Reglas de Negocio |
|---|---|---|---|---|
| SkIdFecha | ID Fecha | Int | Id de relación. Formato YYYYMMDD (ej. 20240101). | Llave primaria técnica para las relaciones. |
| Fecha | Fecha | Date | Fecha en formato yyyy-mm-dd. | Fecha completa del calendario. |
| Año | Año | smallint | Año de la fecha. | Nivel superior de la jerarquía de tiempo. |
| Mes | Mes | Tinyint | Mes de la fecha (1-12). | Número ordinal del mes. |
| Dia | Día | Tinyint | Dia de la fecha. | Día del mes. |
| DiaDelAño | Día del Año | smallint | Dia del año (1-366). | Útil para cálculos de duración. |
| SemanaDelAño | Semana del Año | Tinyint | Semana del año (1-53). | Útil para análisis semanales. |
| Trimestre | Trimestre | Tinyint | Trimestre del año (1-4). | Agrupación trimestral. |
| Semestre | Semestre | Tinyint | Semestre del año (1-2). | Agrupación semestral. |
| NombreMes | Nombre Mes | varchar | Nombre completo del mes (ej. Enero). | Para visualización en reportes. |
| NombreMesCorto | Mes Corto | Char | Nombre corto del mes (ej. Ene). | Abreviación para etiquetas compactas. |
| NombreDia | Nombre Día | varchar | Nombre completo del día (ej. Lunes). | Para análisis de día de la semana. |
| NombreDiaCorto | Día Corto | Char | Nombre corto del día (ej. Lun). | Abreviación para etiquetas compactas. |
| MesAño | Mes-Año | Char | Unión de nombre corto del mes con el año (Mes-Año). Ej: Ene-2024. | Etiqueta estándar para ejes de tiempo en gráficos. |

## Reglas de Negocio

1. **Calendario Continuo**: La tabla debe contener todos los días sin saltos para permitir cálculos de Inteligencia de Tiempo (Time Intelligence) en DAX (ej. `SAMEPERIODLASTYEAR`).
2. **Formato de Clave**: Las tablas de hechos se relacionan mediante `SkIdFecha` en formato entero para optimizar el almacenamiento y la velocidad de cruce.

## Uso en el Modelo

- **Eje Temporal**: Utilizado en casi todas las visualizaciones para mostrar la evolución del costo.
- **Relaciones**: Conecta con todas las tablas `FACT` del modelo.

## Jerarquías Sugeridas

- **Calendario**: `Año` > `Trimestre` > `NombreMes` > `Fecha`.
