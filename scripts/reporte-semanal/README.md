# Reporte Semanal de Productividad

Correo automático de los lunes con lo que se hizo la semana pasada, en el orden
en que se revisa: **ventas → trámites → cartera → obra → flujo de caja**.

Arriba de esas cinco secciones va la **tendencia de las últimas 8 semanas** en
ventas, trámites y cartera. Sin ella una semana sola no se puede leer: 2 ventas
puede ser un desastre o lo normal del proyecto, y solo la serie lo dice. Las
cuatro tarjetas del encabezado traen además el delta contra la semana anterior.

Misma tubería que el correo de alarmas EOS (`scripts/sync-datamart`): GitHub
Actions → Node → Microsoft Graph `sendMail`. La diferencia es que este solo lee;
no escribe nada en Supabase.

## Correr localmente

```bash
cd scripts/reporte-semanal
node reporte-semanal.js --dry-run          # escribe reporte.html, no envía
node reporte-semanal.js --semana=2026-08-31 --dry-run
node reporte-semanal.js --to=alguien@icconstructora.co
```

Sin dependencias: usa el `fetch` de Node 20+ y el `.env` de la raíz del repo.

| Flag | Efecto |
|------|--------|
| `--dry-run` | Genera `reporte.html` y no envía correo. |
| `--semana=YYYY-MM-DD` | Fuerza el lunes de la semana a reportar. Por defecto es la última semana lunes–domingo completa. |
| `--to=a@b.co,c@d.co` | Sobreescribe `ALERT_TO_EMAILS`. |

En `--dry-run` se escriben los dos entregables al lado del script: `reporte.html`
y el `.xlsx` de soporte. Ambos están en el `.gitignore` de la carpeta.

## Qué mide cada sección

| Sección | "Debía" | "Hizo" | Grano |
|---------|---------|--------|-------|
| Tendencia | Meta semanal de ventas y trámites programados | Ventas, trámites y cartera de cada semana | 8 semanas, portafolio completo |
| Ventas | `excel_ic_raw.ppto_valores` líneas PyG 17.1 (unidades) y 17.2 (pesos), repartidas por semanas completas | `sinco_ic_raw.adi_dtm_venta` por `fechaventa` (`valorneto`) | Inventario + semana + año |
| Trámites | `Fecha Programada` en el año a la fecha y en la semana | `Fecha Cumplimiento` en los mismos cortes | Año + semana + represado, por categoría y por proyecto |
| Cartera | Cuotas de `adi_dtm_acuerdos_pago` con `fecha_date` en la semana (`pactado`) | `pagado` de esas cuotas | Semana + mora acumulada a hoy |
| Recaudo (tarjeta y tendencia) | Igual, pero solo conceptos iniciales | Igual | Semana + año |
| Obra | Cronograma valorizado de ADPRO (`adp_dtm_vfact_programacion`), prorrateado por días | ADPRO `clase = 'I'` por `fecha` | Semana + mes a la fecha |
| Flujo | — | Recaudo de la semana − inversión de obra de la semana | Semana + FCL del último corte mensual |

Trámites incluidos, en orden del ciclo comercial: promesas (`TRGA`), créditos
radicados (`CRAR`/`CTAR`), aprobados (`CRFA`/`CTFA`) y desembolsados
(`CRKB`/`CTMB`), subsidios radicados (`SUAR`) y aprobados (`SUEA`/`OSAR`),
escrituras firmadas (`ESEF`) y en registro (`RGAA`), entregas (`TRUE`).

## La meta semanal de ventas

El PPTO es mensual y la fuente no tiene presupuesto semanal, así que hay que
repartirlo. La regla es: **el valor del mes se divide entre las semanas
completas del mes, y cada semana lunes-a-domingo se le asigna al mes de su
domingo.**

Esa asignación por domingo es lo que hace que la cuenta cierre: parte el año en
semanas disjuntas, cada mes recibe 4 o 5, y la suma de las metas semanales del
año da exactamente el PPTO del año. Prorratear por días (`ppto × 7 / días del
mes`, que era la regla vieja) repartía el presupuesto de un mes entre dos
semanas partidas y ninguna cuadraba contra su propio mes.

Las metas de mes y de año son **devengadas**: suman solo las semanas ya
cerradas. Comparar los 6 días transcurridos de septiembre contra el presupuesto
de septiembre entero pintaba 0% en rojo en todos los proyectos cada primera
semana de mes.

## Inventario: no usar `codventa`

La sección de ventas abre con el inventario de unidades principales
(`invundppalventa = 1`, sin parqueaderos ni depósitos).

**La medida certificada en `apps/indicadores/medidas_sql.md` está rota.** Define
el inventario disponible como `codventa IS NULL` y al 2026-09-08 eso devuelve
**cero filas en toda la tabla**: las 3.378 unidades principales traen `codventa`
lleno, disponibles incluidas. Cualquier tablero que use esa definición está
reportando inventario cero.

El estado real vive en `investunidad`: `Vendida` (2.695), `Disponible` (682) y
`Reservada` (1). Una reservada no es ni vendida ni disponible, así que las tres
columnas no siempre suman el total.

## Trámites: el represado sin cota

La sección abre con el acumulado del año — cuántos debía haber cerrado a la
fecha y cuántos lleva — y solo después muestra la semana. Una semana sola no
dice si el año se está perdiendo.

"Atrasados" es el represado **completo** al corte: programados antes del domingo
y sin cumplir en ese momento, sin la cota de 90 días que traía antes. Va
acompañado de la fecha del más antiguo y del atraso promedio de la categoría,
que es lo que distingue una bola de nieve de un rezago de días. El promedio del
total se pondera por represado: promediar los nueve promedios le daría el mismo
peso a una categoría con 75 atrasados que a otra con 1.142.

Al corte del 2026-09-06 el embudo se lee solo: promesas, radicación y aprobación
de crédito van sobre meta (109%, 149%, 145%), y el año se cae en desembolsos
(28%), escrituras firmadas (28%), escrituras en registro (35%) y entregas (35%).
El represado se concentra en esas mismas cuatro etapas, con atrasos promedio de
776 a 1.028 días.

## Recaudo: solo conceptos iniciales

La tarjeta y la tendencia miden el recaudo de los **conceptos iniciales** —
separación (`idconcepto` 0), cuota inicial (1) y cesantías (5). Es la plata que
depende de la gestión de Cartera. Crédito (3, 4) y subsidio (6, 313) dependen
del banco y de la caja de compensación, y meterlos en el mismo porcentaje
escondía el desempeño del área detrás de desembolsos que nadie en IC controla.

Quedan fuera también los vehículos de ahorro del comprador (Ahorro Programado,
AFC, CDT, bono de cuota inicial, prima). Son iniciales por naturaleza; se
excluyeron porque la definición acordada nombró tres conceptos.

La **sección 3** del correo sigue mirando la cartera completa, con la definición
de mora certificada con el área. Las dos lecturas conviven a propósito.

## Semáforo

Las celdas de % del encabezado, la tendencia y la sección de ventas llevan fondo
de color: **verde** al cumplir (≥ 100%), **amarillo** entre 90% y 100%, **rojo**
por debajo. Es más estricto que el color de texto del resto del correo (que
perdona hasta el 70%) porque el fondo es lo primero que se ve al abrir.

## Los mini-gráficos

Cada tarjeta lleva ocho columnas con el acumulado de la ventana y la meta
acumulada encima como línea escalonada. Están hechos con **celdas de tabla, no
con SVG**: Outlook de escritorio usa el motor de render de Word, que ignora
`<svg>` y la posición absoluta de CSS. Lo único que dibuja de forma confiable es
una tabla con fondos y bordes, así que cada columna es una tablita apilada de
dos o tres segmentos y la línea de meta es el borde superior del segmento que
arranca a la altura de la meta.

## Peso del correo

Gmail recorta los correos a partir de ~102 KB. Con las columnas nuevas el
mensaje llegó a **113 KB**, y el 72% de eso (82 KB) eran atributos `style`
idénticos repetidos en las ~980 celdas de tabla.

Las celdas llevan ahora **clase**, no estilo inline, con un bloque `<style>` al
principio del mensaje: el correo bajó a **53 KB** sin quitar una sola tabla.
Word —el motor con el que Outlook de escritorio renderiza— soporta selectores
de clase simples, y Gmail respeta el bloque. Si algún cliente llegara a
descartarlo, las tablas pierden formato pero el contenido se sigue leyendo.

Sigue inline lo que es genuinamente dinámico y no se puede enumerar: el color de
las barras de los mini-gráficos, que se arman en una tabla anidada por columna
donde una clase no ahorraría nada.

Al agregar columnas, revisar el tamaño con `wc -c reporte.html` después de un
`--dry-run`.

## El adjunto .xlsx

Cada correo lleva `Soporte productividad <ini> a <fin>.xlsx`, que es la revisión
completa: se puede leer sin abrir el correo. Quince hojas en dos bloques.

**Resumen** — las mismas tablas del correo, en millones: `Año` (cierre del año a
la fecha), `Tendencia` (las 8 semanas), `Ventas resumen`, `Trámites resumen`,
`Trámites x proyecto`, `Cartera resumen`, `Obra` y `Flujo`.

**Detalle** — la lista nominal detrás de cada cifra, en pesos exactos: `Ventas`,
`Desistimientos`, `Trámites semana`, `Trámites atrasados` (el represado
completo, ~6.300 filas), `Cartera semana` y `Cartera mora`.

La hoja `Léame` explica cada una y el alcance del corte.

Lo escribe `xlsx.js`, un generador propio de ~250 líneas que usa solo `zlib` y
`Buffer`. No se usó exceljs porque el workflow corre `node reporte-semanal.js` a
secas, sin `npm install`, y agregar una dependencia obligaba a meter un paso de
instalación en CI para un archivo que no necesita fórmulas ni gráficos.

`vic_query_db` devuelve máximo **1.000 filas por llamada** sin importar el
`row_limit` que se le pida, así que las hojas largas se paginan con `offset`.
El adjunto pesa ~530 KB; el tope de `sendMail` en línea es 3 MB. Si algún día se
pasa, hay que subirlo con una upload session en vez de meterlo en el cuerpo.

## Limitaciones reales de la fuente

Están escritas también en el pie del correo para que nadie las descubra tarde.

1. **Solo los 14 proyectos CBR.** Ventas, trámites y cartera vienen de SINCO, que
   únicamente cubre los proyectos con `fuente_real = 'CRM'` en
   `excel_ic_raw.proyectos_map`. Azul Celeste, Azul Turquesa, Mitika, Verde Vivo
   y Well solo existen en el corte mensual de Excel y no aparecen en las
   secciones semanales.
2. **El cronograma de obra solo sirve en dos proyectos hoy.** La meta semanal en
   pesos sale de `sinco_ic_raw.adp_dtm_vfact_programacion`, no del presupuesto de
   ADPRO (`clase = 'P'`), que tiene todas sus filas en `fecha = 1900-01-01` y por
   tanto no está distribuido en el tiempo. El cronograma sí tiene fechas y valor,
   pero su estado al 2026-09-07 es:

   | Proyecto | Cobertura sobre el ppto | Horizonte | ¿Sirve como meta? |
   |---|---|---|---|
   | Primera Este | 50% | 2027-04-03 | Sí |
   | Bosque Central | 45% | 2027-07-31 | Sí |
   | Castilla Living | 52% | 2024-12-31 | Vencido |
   | Reserva de Oporto | 44% | 2025-10-31 | Vencido |
   | Gaia | 36% | 2026-04-07 | Vencido |
   | Praia Natura | 11% | 2028-01-25 | Cobertura muy baja |
   | Castilla Imperial | — | — | Sin cronograma |
   | La Hacienda Jamundí | — | — | Sin cronograma |

   El correo no calcula cumplimiento cuando el cronograma está vencido, no existe
   o cubre menos del 25% del presupuesto (`COBERTURA_MINIMA`); en su lugar imprime
   el estado. Arreglar esto es trabajo de Obra sobre ADPRO, no del script.

   Detalle del grano, por si hay que tocar la consulta: cada fila de
   `adp_dtm_vfact_programacion` es una actividad × ventana de fechas.
   `Valor Programado` es el valor **total del grupo de actividad**, repetido en
   cada ventana, y `Porcentaje Asignado` la fracción que le corresponde a esa
   ventana (los porcentajes suman exactamente 1 por grupo). El valor con fecha es
   `Valor Programado × Porcentaje Asignado`, prorrateado por días entre
   `Fecha Inicial` y `Fecha Final`. Sumar `Valor Programado` a secas infla el
   total 5x.
3. **El flujo de caja formal va atrasado.** `public.v_flujo_caja` sale del Excel
   PyG y su último corte al 2026-09-07 es abril de 2026. El correo muestra la
   fecha del corte y la marca en rojo si tiene más de 60 días. El proxy semanal
   (recaudo − obra) sí es dato vivo.
4. **`% cumplido` de trámites puede pasar de 100.** Parte de lo cerrado en la
   semana son atrasos de semanas anteriores; las dos columnas se muestran juntas
   pero no se restan.
5. **La tendencia mide volumen, no cumplimiento contra meta.** La meta de
   ventas es mensual (`ppto_valores`) y la de obra depende del cronograma de
   ADPRO; ninguna de las dos se puede prorratear semana a semana hacia atrás sin
   inventar. La serie muestra lo que pasó cada semana y el % de trámites, que sí
   tiene meta semanal propia. Los deltas del encabezado salen de esa misma
   consulta, no de los totales de cada sección, para que numerador y denominador
   vengan de la misma fuente.
6. **Atrasados se acota a 90 días.** El represado histórico completo pasa de mil
   trámites y arrastra negocios muertos de 2021-2023 que no dicen nada de la
   semana.

## Cómo se ejecuta el SQL

Las consultas viven en `queries.js` y se ejecutan con el RPC
`public.vic_query_db`, que es de solo lectura por construcción: acepta un único
`SELECT`/`WITH`, fija `transaction_read_only`, corta a los 15 s y limita las
filas.

**Van en serie, no en paralelo.** Ninguna consulta pasa de 3 s por sí sola, pero
lanzando las nueve a la vez el pool se satura y alguna muere con
`57014 statement timeout`. En serie el reporte completo tarda ~9 s. `sql()`
además reintenta una vez ante un 57014, porque esto corre desatendido.

No se creó una función dedicada en la base porque el reporte no escribe y
así el SQL queda versionado en el repo en vez de en una migración aplicada a
mano. Si algún día cambian esas guardas, hay que mover `queries.js` a una función
`SECURITY DEFINER` propia.

## Secrets de GitHub

Los mismos del workflow `datamart-sync`, sin agregar ninguno nuevo:
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`,
`AZURE_CLIENT_SECRET`, `ALERT_FROM_EMAIL`, `ALERT_TO_EMAILS`.

El envío necesita permiso de aplicación **Mail.Send** en el app registration de
Azure. Es el mismo registro que ya usa `sync-datamart-cloud.js` para enviar el
correo de alarmas, así que si ese correo llega, este también.
