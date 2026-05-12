# Contexto de la Base de Datos: ERP Comercial + Targets

Esta base de datos contiene modelos semánticos obtenidos de nuestro ERP con información comercial, de trámites y de cartera; **más** los datos de gestión de PPTO y Flujo Histórico que viven en schemas paralelos.

**REGLA CRÍTICA NÚMERO 1: SCHEMAS Y NOMBRES DE TABLAS**

| Schema | Origen | Cuándo usarlo |
|---|---|---|
| `sinco_ic_raw` | ETL Sinco (ERP) | Datos transaccionales: ventas, trámites, recaudo, inventarios. Fuente de verdad para proyectos propios. |
| `sinco_ic_calc` | Vistas/cálculos derivados | KPIs, agregados, vistas materializadas que mezclan raw + targets + histórico. |
| `sinco_ic_export` | Snapshots con sufijo `_s` | Versiones congeladas para Power BI / consumo externo. |
| `sinco_ic_targets` | Excel `PPTOProyectos2026.xlsx` | Presupuesto por proyecto y línea P&G. Ver [`04_targets_ejecucion/`](04_targets_ejecucion/README.md). |
| `sinco_ic_historico` | Excel `Historico.xlsx` (SharePoint, mensual) | Ejecución "real" para proyectos socio (sin CRM). |

- Los nombres de las tablas SIEMPRE son en minúsculas y sin espacios, típicamente con el prefijo `adi_dtm_`.
- Ejemplos obligatorios: `sinco_ic_raw.adi_dtm_venta`, `sinco_ic_raw.adi_dtm_tramites`, `sinco_ic_targets.ppto_valores`, `sinco_ic_historico.flujo_historico`.
- NUNCA uses la sintaxis de comillas dobles con mayúsculas y espacios como `public."ADI_DTM VentaMc"`.

**REGLA CRÍTICA NÚMERO 2: BUSQUEDA DE PROYECTOS (IMPORTANTE)**:
Al final de este contexto se anexa automáticamente el **CATÁLOGO DE PROYECTOS** con los nombres reales que existen en la base de datos (tanto `prynombreproyecto` en `adi_dtm_proyectos` como `vtanombreproyecto` en `adi_dtm_venta`).

Flujo obligatorio al filtrar por proyecto:
1. **Busca coincidencia en el catálogo** con lo que mencionó el usuario (ej. "praia" → "Praia Residences").
2. Si encuentras una coincidencia clara, usa **igualdad exacta** con el string del catálogo: `vtanombreproyecto = 'Praia Residences'`. No uses `ILIKE` ni `%` en este caso.
3. Prefiere filtrar por `prycodigoproyecto` (código numérico) si puedes resolverlo desde el catálogo — es más preciso que cualquier nombre.
4. **Solo** si la mención del usuario es ambigua y no mapea a ningún proyecto del catálogo, cae al patrón antiguo: `vtanombreproyecto ILIKE '%fragmento%'`.

Para otros campos textuales (comprador, asesor, etc.) que no tienen catálogo, sigue usando `ILIKE '%texto%'`.

**REGLA CRÍTICA NÚMERO 3: VENTAS NETAS VS VENTAS BRUTAS (DESISTIMIENTOS)**:
Por defecto, asume que el usuario busca "Datos Netos" (Activos). Para esto, usa siempre `adi_dtm_venta` y sus anexos, IGNORANDO COMPLETAMENTE todas las tablas que digan `desistimiento`.
Sólo deberás añadir las tablas de desistimientos (ej. `adi_dtm_desistimientosventa`) si el usuario pregunta explícitamente por "Ventas brutas", "Históricos", o "Negocios caídos/desistidos". 
*Fórmula de Ventas Brutas históricas:* Suma de las ventas actuales (`adi_dtm_venta`) + ventas caídas (`adi_dtm_desistimientosventa`), usando las fechas originales de cada registro.

## Catálogo de Estructuras (estructuras md/)
La definición profunda de las columnas de cada tabla, así como la semántica de negocio y las reglas de unión (JOINs),
se encuentran anexadas dinámicamente en tiempo de ejecución leyendo la carpeta `estructuras md/`.

Ten siempre en cuenta todas las características dictadas en los archivos `.md` de dicha carpeta para armar el SQL.

**REGLA CRÍTICA NÚMERO 4: EJECUCIÓN REAL DEPENDE DEL TIPO DE PROYECTO**:

No todos los proyectos del portafolio tienen datos en CRM. Los proyectos en sociedad (donde IC participa pero NO vende) no aparecen en `adi_dtm_venta`. Para esos, la ejecución "real" se reconstruye desde el `Flujo Histórico` (Excel mensual en SharePoint, schema `sinco_ic_historico`).

Antes de calcular cualquier KPI de ejecución por proyecto:

1. Consultar `sinco_ic_targets.proyectos_map.fuente_real` para ese proyecto.
2. Si `'CRM'` → leer ejecución de `sinco_ic_raw` (ventas, trámites, pagos).
3. Si `'FlujoHistorico'` → leer del snapshot más reciente en `sinco_ic_historico.flujo_historico`.
4. **Nunca mezclar ambas fuentes en la misma fila/agregación**.

Ver detalles en [`04_targets_ejecucion/README.md`](04_targets_ejecucion/README.md).

## Ejemplo de Consulta Común
```sql
SELECT vtanombreproyecto, SUM(valorneto) AS ventas_totales
FROM sinco_ic_raw.adi_dtm_venta
GROUP BY vtanombreproyecto;
```