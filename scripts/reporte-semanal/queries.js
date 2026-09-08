/**
 * queries.js — SQL del Reporte Semanal de Productividad.
 *
 * Fuente única de las consultas. El script las ejecuta vía el RPC
 * `public.vic_query_db` (SECURITY DEFINER, solo lectura: un único SELECT/WITH,
 * transaction_read_only, statement_timeout 15s, límite de filas). No se creó
 * una función dedicada en la BD porque el reporte no escribe nada y así el SQL
 * queda versionado en el repo, no en una migración que hay que aplicar a mano.
 *
 * Convenciones que respetan todas las consultas:
 *   - Semana = lunes a domingo COMPLETO anterior a hoy (ini, fin). Como
 *     vic_query_db no acepta parámetros, las fechas se interpolan como
 *     literales DATE desde JS (validadas antes con /^\d{4}-\d{2}-\d{2}$/).
 *   - Portafolio = proyectos activos con fuente_real = 'CRM' en
 *     excel_ic_raw.proyectos_map (los 14 CBR). Son los únicos con dato vivo en
 *     SINCO; los 17 de fuente_real = 'FlujoHistorico' (Azul Celeste/Turquesa,
 *     Mitika, Verde Vivo, Well) solo existen en el corte mensual de Excel.
 *   - Obra se agrupa por "MacroProyecto Descripcion" de ADPRO, que es otro
 *     universo de nombres (mayúsculas, sin etapa).
 *   - Valores monetarios en millones de pesos (MM) redondeados.
 */

'use strict';

const PORTAFOLIO_CRM = `
  select pm.proyecto_ppto, pme.idproyecto
  from excel_ic_raw.proyectos_map pm
  join excel_ic_raw.proyectos_map_erp pme using (proyecto_ppto)
  where pm.fuente = 'Proyectos' and pm.activo and pm.fuente_real = 'CRM'`;

const MACROS_OBRA = `'BOSQUE CENTRAL','GAIA','PRAIA NATURA','PRIMERA ESTE',
                     'CASTILLA IMPERIAL','CASTILLA LIVING','LA HACIENDA JAMUNDI',
                     'RESERVA DE OPORTO'`;

// Recaudo de "conceptos iniciales": la plata que el comprador pone de su
// bolsillo antes del desembolso. Verificado contra el catálogo de conceptos de
// SINCO el 2026-09-08: 0 = Separación, 1 = Cuota inicial (Cuota-1..Cuota-60),
// 5 = Cesantías. Deja fuera crédito (3,4) y subsidio (6,313), que no dependen
// de la gestión de cartera sino del banco y de la caja de compensación.
// Quedan fuera también los vehículos de ahorro del comprador (7 Ahorro
// Programado, 90/250 AFC, 140 CDT, 271 Bono cuota inicial, 314 Prima): son
// conceptos iniciales por naturaleza, pero el CEO nombró tres y solo esos van.
const CONCEPTOS_INICIALES = '(0, 1, 5)';

// Ventas con escritura firmada (ESEF cumplido). Es la llave de la regla de
// exigibilidad de cartera: mientras la escritura no esté firmada, el banco no
// desembolsa el crédito y la caja no gira el subsidio, así que esa plata NO es
// cobrable por más vencida que figure en el plan de pagos. Una vez escriturada
// la unidad, sí se exige.
//
// Es la razón por la que La Hacienda E1 aparecía con 12.743 MM en mora cuando
// su mora realmente gestionable son 432 MM: 12.311 MM eran crédito y subsidio
// de unidades que todavía no se han podido escriturar. Reclamarle esa cifra a
// Cartera es reclamarle algo que no depende de Cartera.
const VENTAS_ESCRITURADAS = `
  select distinct tr.idventa
  from sinco_ic_raw.adi_dtm_tramites tr
  where tr."Codigo Tramite" = 'ESEF'
    and tr."Fecha Cumplimiento" is not null`;

// Conceptos que dependen de la escritura: crédito propio y de tercero (3, 4),
// subsidio y subsidio concurrente (6, 313).
const CONCEPTOS_POST_ESCRITURA = '(3, 4, 6, 313)';

// Trámites que sigue la gerencia. El orden es el del ciclo comercial, no
// alfabético: promesa -> crédito -> subsidio -> escritura -> entrega.
// Los códigos replican la taxonomía ya certificada en
// ic_kpi.kpi_francisco_tramites_mes y la amplían con desembolsos y entregas.
const CATEGORIAS_TRAMITE = `
  select * from (values
    (1, 'Promesas firmadas',      'Promesas',   array['TRGA']),
    (2, 'Créditos radicados',     'Créditos',   array['CRAR','CTAR']),
    (3, 'Créditos aprobados',     'Créditos',   array['CRFA','CTFA']),
    (4, 'Créditos desembolsados', 'Créditos',   array['CRKB','CTMB']),
    (5, 'Subsidios radicados',    'Subsidios',  array['SUAR']),
    (6, 'Subsidios aprobados',    'Subsidios',  array['SUEA','OSAR']),
    (7, 'Escrituras firmadas',    'Escrituras', array['ESEF']),
    (8, 'Escrituras en registro', 'Escrituras', array['RGAA']),
    (9, 'Entregas a cliente',     'Entregas',   array['TRUE'])
  ) as x(orden, categoria, grupo, codigos)`;

// Meta semanal de ventas. El PPTO es mensual (línea PyG 17.2) y no existe
// presupuesto semanal en la fuente, así que hay que repartirlo. Regla acordada
// con el CEO: el valor del mes se divide entre las semanas COMPLETAS del mes,
// y cada semana lunes-a-domingo se le asigna al mes de su DOMINGO.
//
// Esa asignación por domingo importa: parte el año en semanas disjuntas, cada
// mes recibe 4 o 5, y la suma de las metas semanales del año da exactamente el
// PPTO del año. Prorratear por días (7/30) repartía el presupuesto de un mes
// entre dos semanas partidas y ninguna cuadraba contra su mes.
//
// SEMANAS_POR_MES es solo el calendario — qué domingos tiene el año y cuántas
// semanas le tocan a cada mes. Va aparte porque la sección de ventas necesita
// el mismo reparto abierto por proyecto, no agregado.
const SEMANAS_POR_MES = `
  domingos as (
    select d::date as domingo
    from p, generate_series(date_trunc('year', p.ini)::date,
                            (date_trunc('year', p.fin) + interval '1 year - 1 day')::date,
                            interval '1 day') d
    where extract(isodow from d) = 7
  ), sem_x_mes as (
    select date_trunc('month', domingo)::date as mes, count(*) as n_sem
    from domingos group by 1
  )`;

const SEMANAS_DEL_MES = `${SEMANAS_POR_MES}
  , ppto_mes as (
    select date_trunc('month', pv.fecha_periodo)::date as mes,
           sum(pv.valor) filter (where pv.pyg_codigo = '17.2') as pesos,
           sum(pv.valor) filter (where pv.pyg_codigo = '17.1') as unidades
    from excel_ic_raw.ppto_valores pv
    cross join p
    where pv.fecha_snapshot = p.snap
      and pv.pyg_codigo in ('17.1','17.2')
      and exists (select 1 from erp e where e.proyecto_ppto = pv.proyecto_ppto)
    group by 1
  ), meta_sem as (
    select sm.mes, pm.pesos / nullif(sm.n_sem, 0) as meta_pesos,
           pm.unidades / nullif(sm.n_sem, 0) as meta_un
    from sem_x_mes sm left join ppto_mes pm on pm.mes = sm.mes
  )`;

// ─── 0. Tendencia semana a semana ─────────────────────────────────────────────
// Las demás consultas miran una sola semana contra su meta. Esta mira la serie:
// una fila por semana de la ventana, para leer el ritmo y no solo el cumplimiento.
// Un pico o una caída aislada dicen poco; la serie dice si la semana fue normal.
//
// Las semanas se bucketean con date_trunc('week', ...), que en Postgres cae en
// lunes — la misma convención lunes-a-domingo del resto del reporte, así que la
// última fila coincide exactamente con la semana reportada.
//
// Obra viene incluida aunque no se tabule: alimenta el delta de la cuarta
// tarjeta del encabezado, que ya existía en el correo.

const SEMANAS_TENDENCIA = 8;

const TENDENCIA = (ini, fin) => `
with p as (
  select date '${ini}' as ini, date '${fin}' as fin,
         (select snap_ppto from ic_calc.v_kpi_params) as snap
), sem as (
  select generate_series(date '${ini}', date '${fin}', interval '7 days')::date as lunes
), erp as (${PORTAFOLIO_CRM}
), cat as (${CATEGORIAS_TRAMITE}
), ${SEMANAS_DEL_MES}
, ventas as (
  select date_trunc('week', v.fechaventa::date)::date as lunes,
         count(*) as un, sum(v.valorneto) as pesos
  from erp e
  join sinco_ic_raw.adi_dtm_venta v on v.idproyecto = e.idproyecto
  cross join p
  where v.fechaventa::date between p.ini and p.fin
  group by 1
), desist as (
  select date_trunc('week', d.fecha::date)::date as lunes, count(*) as un
  from erp e
  join sinco_ic_raw.adi_dtm_desistimientosventa d on d.codproyecto = e.idproyecto
  cross join p
  where d.fecha::date between p.ini and p.fin
  group by 1
), t as (
  select tr."Fecha Programada"::date   as fp,
         tr."Fecha Cumplimiento"::date as fc
  from sinco_ic_raw.adi_dtm_tramites tr
  where exists (select 1 from erp e where e.idproyecto = tr.idproyecto)
    and exists (select 1 from cat c where tr."Codigo Tramite" = any(c.codigos))
), tram_prog as (
  select date_trunc('week', t.fp)::date as lunes, count(*) as debian
  from t cross join p
  where t.fp between p.ini and p.fin
  group by 1
), tram_cump as (
  select date_trunc('week', t.fc)::date as lunes, count(*) as hicieron
  from t cross join p
  where t.fc between p.ini and p.fin
  group by 1
), backlog as (
  -- Trámites vencidos al CIERRE de cada semana: programados antes del domingo y
  -- sin cumplir en ese momento (fc nula o posterior). Reconstruye el represado
  -- histórico semana por semana, que es lo que dice si la bola de nieve crece.
  select s.lunes, count(*) as vencidos
  from sem s
  join t on t.fp <= s.lunes + 6 and (t.fc is null or t.fc > s.lunes + 6)
  group by 1
), cartera as (
  select date_trunc('week', a.fecha_date)::date as lunes,
         sum(a.pactado) as pactado, sum(a.pagado) as pagado
  from sinco_ic_raw.adi_dtm_acuerdos_pago a
  join erp e on e.idproyecto = a.vtaidproyecto
  cross join p
  where a.fecha_date between p.ini and p.fin
    and a.idconcepto in ${CONCEPTOS_INICIALES}
  group by 1
), ventas_dia as (
  select v.fechaventa::date as f, v.valorneto as pesos
  from erp e
  join sinco_ic_raw.adi_dtm_venta v on v.idproyecto = e.idproyecto
  cross join p
  where v.fechaventa::date >= date_trunc('year', p.ini)::date
    and v.fechaventa::date <= p.fin
), ventas_ytd as (
  -- Acumulado del año al cierre de cada semana. El corte de año se toma del
  -- domingo de cada semana, no del final de la ventana: si la ventana cruza el
  -- 1 de enero, cada fila acumula sobre su propio año y no sobre el anterior.
  select s.lunes, coalesce(sum(vd.pesos), 0) as pesos
  from sem s
  left join ventas_dia vd on vd.f <= s.lunes + 6
                         and vd.f >= date_trunc('year', s.lunes + 6)::date
  group by s.lunes
), meta_ytd_sem as (
  select s.lunes, coalesce(sum(ms.meta_pesos), 0) as pesos
  from sem s
  left join domingos d on d.domingo <= s.lunes + 6
                      and d.domingo >= date_trunc('year', s.lunes + 6)::date
  left join meta_sem ms on ms.mes = date_trunc('month', d.domingo)::date
  group by s.lunes
), obra as (
  select date_trunc('week', cp.fecha)::date as lunes,
         sum(cp."Valor Total") as pesos
  from sinco_ic_raw.adp_dtm_vfact_controlproyecto cp
  cross join p
  where cp.clase = 'I'
    and cp.fecha between p.ini and p.fin
    and cp."MacroProyecto Descripcion" in (${MACROS_OBRA})
  group by 1
)
select s.lunes                                as lunes,
       (s.lunes + 6)                          as domingo,
       coalesce(v.un, 0)                      as un_sem,
       round(coalesce(v.pesos, 0) / 1e6)      as mm_sem,
       coalesce(ds.un, 0)                     as desist_un_sem,
       round(coalesce(ms.meta_pesos, 0) / 1e6) as mm_meta_sem,
       round(coalesce(vy.pesos, 0) / 1e6)      as mm_ytd,
       round(coalesce(my.pesos, 0) / 1e6)      as mm_meta_ytd,
       coalesce(tp.debian, 0)                 as debian,
       coalesce(tc.hicieron, 0)               as hicieron,
       coalesce(bl.vencidos, 0)               as vencidos_acum,
       round(coalesce(ca.pactado, 0) / 1e6)   as pactado_mm,
       round(coalesce(ca.pagado, 0) / 1e6)    as pagado_mm,
       round(coalesce(o.pesos, 0) / 1e6)      as obra_mm
from sem s
left join ventas    v  on v.lunes  = s.lunes
left join desist    ds on ds.lunes = s.lunes
left join tram_prog tp on tp.lunes = s.lunes
left join tram_cump tc on tc.lunes = s.lunes
left join backlog   bl on bl.lunes = s.lunes
left join cartera   ca on ca.lunes = s.lunes
left join obra      o  on o.lunes  = s.lunes
left join meta_sem  ms on ms.mes   = date_trunc('month', s.lunes + 6)::date
left join ventas_ytd   vy on vy.lunes = s.lunes
left join meta_ytd_sem my on my.lunes = s.lunes
order by s.lunes`;

// ─── 0b. Acumulado del año ────────────────────────────────────────────────────
// Lo que llevamos en el año contra lo que debíamos llevar, para las cuatro
// tarjetas del encabezado. Una semana sola no dice si el año se está perdiendo.
//
// La meta de ventas del año se acumula sumando las metas semanales (misma regla
// de SEMANAS_DEL_MES) de todas las semanas ya cerradas, no el PPTO de los meses
// completos: a comienzos de mes eso compararía 3 semanas de venta contra el
// presupuesto de un mes entero.
//
// Obra no lleva meta acumulada: el cronograma de ADPRO solo está vigente en
// Bosque Central y Primera Este, así que un "programado del año" del portafolio
// sería una cifra inventada. Se reporta el avance sobre el presupuesto de obra,
// que sí es dato completo.
const ACUMULADO = (fin) => `
with p as (
  select date_trunc('year', date '${fin}')::date as ini,
         date '${fin}' as fin,
         (select snap_ppto from ic_calc.v_kpi_params) as snap
), erp as (${PORTAFOLIO_CRM}
), cat as (${CATEGORIAS_TRAMITE}
), ${SEMANAS_DEL_MES}
, meta_ytd as (
  select coalesce(sum(ms.meta_pesos), 0) as pesos,
         coalesce(sum(ms.meta_un), 0)    as un
  from domingos d
  join meta_sem ms on ms.mes = date_trunc('month', d.domingo)::date
  cross join p
  where d.domingo >= p.ini and d.domingo <= p.fin
), ventas_ytd as (
  select count(*) as un, coalesce(sum(v.valorneto), 0) as pesos
  from erp e
  join sinco_ic_raw.adi_dtm_venta v on v.idproyecto = e.idproyecto
  cross join p
  where v.fechaventa::date between p.ini and p.fin
), cartera_ytd as (
  select coalesce(sum(a.pactado), 0) as pactado, coalesce(sum(a.pagado), 0) as pagado
  from sinco_ic_raw.adi_dtm_acuerdos_pago a
  join erp e on e.idproyecto = a.vtaidproyecto
  cross join p
  where a.fecha_date between p.ini and p.fin
    and a.idconcepto in ${CONCEPTOS_INICIALES}
), obra_ytd as (
  select coalesce(sum(cp."Valor Total"), 0) as pesos
  from sinco_ic_raw.adp_dtm_vfact_controlproyecto cp
  cross join p
  where cp.clase = 'I' and cp.fecha between p.ini and p.fin
    and cp."MacroProyecto Descripcion" in (${MACROS_OBRA})
), obra_vida as (
  select coalesce(sum(obra_real), 0) as real_mm, coalesce(sum(obra_ppto), 0) as ppto_mm
  from public.kpi_programacion_obra_ytd_proyecto
), tram as (
  select tr."Fecha Programada"::date   as fp,
         tr."Fecha Cumplimiento"::date as fc
  from sinco_ic_raw.adi_dtm_tramites tr
  where exists (select 1 from erp e where e.idproyecto = tr.idproyecto)
    and exists (select 1 from cat c where tr."Codigo Tramite" = any(c.codigos))
), tram_ytd as (
  select count(*) filter (where t.fp between p.ini and p.fin)                as debian,
         count(*) filter (where t.fc between p.ini and p.fin)                as hicieron,
         count(*) filter (where t.fp <= p.fin
                            and (t.fc is null or t.fc > p.fin))              as vencidos,
         count(*) filter (where t.fp <= p.fin and t.fp > p.fin - 90
                            and (t.fc is null or t.fc > p.fin))              as vencidos_90d
  from tram t cross join p
)
select round((select pesos from ventas_ytd) / 1e6)   as ventas_mm,
       (select un from ventas_ytd)                   as ventas_un,
       round((select pesos from meta_ytd) / 1e6)     as ventas_meta_mm,
       round((select un from meta_ytd))              as ventas_meta_un,
       round((select pactado from cartera_ytd) / 1e6) as cartera_pactado_mm,
       round((select pagado from cartera_ytd) / 1e6)  as cartera_pagado_mm,
       round((select pesos from obra_ytd) / 1e6)      as obra_mm,
       (select real_mm from obra_vida)                as obra_vida_real_mm,
       (select ppto_mm from obra_vida)                as obra_vida_ppto_mm,
       (select debian from tram_ytd)                  as tram_debian,
       (select hicieron from tram_ytd)                as tram_hicieron,
       (select vencidos from tram_ytd)                as tram_vencidos,
       (select vencidos_90d from tram_ytd)            as tram_vencidos_90d`;

// ─── 7. Detalle cliente a cliente (soporte .xlsx) ─────────────────────────────
// El correo resume; el adjunto sustenta. Cada hoja es la lista nominal detrás
// de una sección, para que el gerente que discuta una cifra pueda ir al cliente
// concreto sin pedirle nada a TI.
//
// vic_query_db devuelve máximo 1.000 filas por llamada (tope propio del RPC),
// así que cada consulta recibe un `off` y el script las pagina hasta agotar.

const DET_VENTAS = (ini, fin, off) => `
with p as (
  select date '${ini}' as ini, date '${fin}' as fin
), erp as (${PORTAFOLIO_CRM}
)
select e.proyecto_ppto           as proyecto,
       v.codigointerno           as unidad,
       v.nombrecomprador         as comprador,
       v.compradordocumento      as documento,
       v.fechaventa::date        as fecha_venta,
       v.nombrevendedor          as vendedor,
       v.valorneto               as valor_neto,
       v.area                    as area_m2,
       v.estadoventa             as estado,
       v.vtaentidadcredito       as entidad_credito,
       v.vtaestadoplanpago       as estado_plan_pago
from erp e
join sinco_ic_raw.adi_dtm_venta v on v.idproyecto = e.idproyecto
cross join p
where v.fechaventa::date between p.ini and p.fin
order by e.proyecto_ppto, v.fechaventa, v.codigointerno
limit 1000 offset ${off}`;

const DET_DESISTIMIENTOS = (ini, fin, off) => `
with p as (
  select date '${ini}' as ini, date '${fin}' as fin
), erp as (${PORTAFOLIO_CRM}
)
select e.proyecto_ppto        as proyecto,
       d.codigointerno        as unidad,
       d.nombrecomprador      as comprador,
       d.doccomprador         as documento,
       d.fecha::date          as fecha_desistimiento,
       d.fechaventa::date     as fecha_venta_original,
       d.nombrevendedor       as vendedor,
       d.valorventa           as valor_venta,
       d.valorarras           as valor_arras,
       d.valordevolver        as valor_a_devolver,
       d.motivo               as motivo,
       d.observacionesdesiste as observaciones
from erp e
join sinco_ic_raw.adi_dtm_desistimientosventa d on d.codproyecto = e.idproyecto
cross join p
where d.fecha::date between p.ini and p.fin
order by e.proyecto_ppto, d.fecha
limit 1000 offset ${off}`;

// Trámites que tocaron la semana: los programados en ella y los cumplidos en
// ella, que no son el mismo conjunto — parte de lo cumplido son atrasos viejos,
// y por eso el % del correo puede pasar de 100.
const DET_TRAMITES_SEMANA = (ini, fin, off) => `
with p as (
  select date '${ini}' as ini, date '${fin}' as fin
), erp as (${PORTAFOLIO_CRM}
), cat as (${CATEGORIAS_TRAMITE}
)
select e.proyecto_ppto                as proyecto,
       c.categoria                    as categoria,
       tr.codigointerno               as unidad,
       tr.compradornombre             as comprador,
       tr.compradordocumento          as documento,
       tr."Descripcion Tramite"       as tramite,
       tr."Codigo Tramite"            as codigo,
       tr.estadotramite               as estado,
       tr."Fecha Programada"::date    as fecha_programada,
       tr."Fecha Cumplimiento"::date  as fecha_cumplimiento,
       case when tr."Fecha Cumplimiento" is null then null
            else (tr."Fecha Cumplimiento"::date - tr."Fecha Programada"::date)
       end                            as dias_desfase,
       tr."Usu Responsable"           as responsable,
       tr.usuariocumplimiento         as cumplido_por
from sinco_ic_raw.adi_dtm_tramites tr
join erp e on e.idproyecto = tr.idproyecto
join cat c on tr."Codigo Tramite" = any(c.codigos)
cross join p
where tr."Fecha Programada"::date between p.ini and p.fin
   or tr."Fecha Cumplimiento"::date between p.ini and p.fin
order by c.orden, e.proyecto_ppto, tr."Fecha Programada"
limit 1000 offset ${off}`;

// El represado completo al corte: programado antes del domingo y sin cumplir en
// ese momento. Es la hoja más larga del libro y la razón por la que el adjunto
// se pagina.
const DET_TRAMITES_ATRASADOS = (fin, off) => `
with p as (
  select date '${fin}' as fin
), erp as (${PORTAFOLIO_CRM}
), cat as (${CATEGORIAS_TRAMITE}
)
select e.proyecto_ppto             as proyecto,
       c.categoria                 as categoria,
       tr.codigointerno            as unidad,
       tr.compradornombre          as comprador,
       tr.compradordocumento       as documento,
       tr."Descripcion Tramite"    as tramite,
       tr."Codigo Tramite"         as codigo,
       tr."Fecha Programada"::date as fecha_programada,
       (p.fin - tr."Fecha Programada"::date) as dias_atraso,
       tr."Usu Responsable"        as responsable,
       tr.estadotramite            as estado
from sinco_ic_raw.adi_dtm_tramites tr
join erp e on e.idproyecto = tr.idproyecto
join cat c on tr."Codigo Tramite" = any(c.codigos)
cross join p
where tr."Fecha Programada"::date <= p.fin
  and (tr."Fecha Cumplimiento" is null or tr."Fecha Cumplimiento"::date > p.fin)
order by (p.fin - tr."Fecha Programada"::date) desc, e.proyecto_ppto
limit 1000 offset ${off}`;

// Cuotas con vencimiento dentro de la semana, solo conceptos iniciales: es el
// detalle exacto que sustenta el % de recaudo de la tarjeta y de la tendencia.
const DET_CARTERA_SEMANA = (ini, fin, off) => `
with p as (
  select date '${ini}' as ini, date '${fin}' as fin
), erp as (${PORTAFOLIO_CRM}
)
select e.proyecto_ppto        as proyecto,
       a.codigointerno        as unidad,
       a.compradornombre      as comprador,
       a.compradordocumento   as documento,
       a.concepto             as concepto,
       a.fecha_date           as fecha_vencimiento,
       a.pactado              as pactado,
       a.pagado               as pagado,
       (a.pactado - a.pagado) as diferencia,
       a.saldo                as saldo,
       a.mora_dias            as dias_mora,
       a.mora_saldo           as saldo_en_mora,
       a.estadocartera        as estado_cartera,
       a.entidad              as entidad
from sinco_ic_raw.adi_dtm_acuerdos_pago a
join erp e on e.idproyecto = a.vtaidproyecto
cross join p
where a.fecha_date between p.ini and p.fin
  and a.idconcepto in ${CONCEPTOS_INICIALES}
order by (a.pactado - a.pagado) desc, e.proyecto_ppto
limit 1000 offset ${off}`;

// Mora acumulada a hoy, todos los conceptos (no solo los iniciales): esta hoja
// sustenta la sección 3 del correo, que sí mira la cartera completa.
const DET_CARTERA_MORA = (off) => `
with erp as (${PORTAFOLIO_CRM}
), esc as (${VENTAS_ESCRITURADAS}
)
select e.proyecto_ppto      as proyecto,
       a.codigointerno      as unidad,
       a.compradornombre    as comprador,
       a.compradordocumento as documento,
       a.concepto           as concepto,
       a.fecha_date         as fecha_vencimiento,
       a.pactado            as pactado,
       a.pagado             as pagado,
       a.mora_dias          as dias_mora,
       a.mora_saldo         as saldo_en_mora,
       case when exists (select 1 from esc where esc.idventa = a.idventa)
            then 'Sí' else 'No' end                                as escriturado,
       case when a.idconcepto not in ${CONCEPTOS_POST_ESCRITURA}
                 or exists (select 1 from esc where esc.idventa = a.idventa)
            then 'Exigible' else 'Bloqueado sin escritura' end     as exigibilidad,
       a.estadocartera      as estado_cartera,
       a.entidad            as entidad
from sinco_ic_raw.adi_dtm_acuerdos_pago a
join erp e on e.idproyecto = a.vtaidproyecto
where a.mora_saldo > 0
order by a.mora_saldo desc
limit 1000 offset ${off}`;

// ─── 1. Ventas ────────────────────────────────────────────────────────────────
// Real: adi_dtm_venta por fecha de venta (regla de negocio: valorneto).
// Debía: ppto_valores línea PyG 17.2 (valor) y 17.1 (unidades) del snapshot
// vigente, prorrateado a 7 días sobre los días del mes. El PPTO es mensual;
// no existe presupuesto semanal en la fuente.
const VENTAS = (ini, fin) => `
with p as (
  select date '${ini}' as ini, date '${fin}' as fin,
         (select snap_ppto from ic_calc.v_kpi_params) as snap
), erp as (${PORTAFOLIO_CRM}
), proy as (
  select distinct proyecto_ppto from erp
), ${SEMANAS_POR_MES}
, inv_base as (
  -- Inventario por unidad, leído de adi_dtm_inventarios (no de ventas).
  --
  -- Dos columnas de esta tabla se parecen y NO son lo mismo:
  --   invundppalventa      = la unidad es el ítem principal de SU VENTA. Un
  --                          garaje vendido junto a un apartamento va en 0, y
  --                          un apartamento todavía sin vender también puede
  --                          ir en 0.
  --   invundppaltipounidad = la unidad es de un TIPO principal (apartamento,
  --                          casa, local) frente a los anexos.
  --
  -- Para contar inventario la buena es la segunda. Con la primera, Castilla
  -- Living daba 534 unidades en vez de 615: se perdían 81 apartamentos
  -- disponibles marcados con invundppalventa = 0.
  --
  -- La medida certificada en apps/indicadores/medidas_sql.md usa la primera y
  -- además define el disponible como codventa is null, que hoy devuelve CERO
  -- filas en toda la tabla: codventa viene lleno en las 3.378 unidades,
  -- disponibles incluidas. El estado real vive en investunidad ('Vendida',
  -- 'Disponible', 'Reservada'). Una reservada no es ni lo uno ni lo otro, así
  -- que las tres columnas no siempre suman el total.
  select e.proyecto_ppto,
         i.investunidad,
         i.invundppaltipounidad,
         max(i.invundppaltipounidad) over (partition by e.proyecto_ppto) as tiene_ppal
  from sinco_ic_raw.adi_dtm_inventarios i
  join erp e on e.idproyecto = i.invcodproyecto
), inventario as (
  -- Se cuentan las unidades de tipo principal, salvo en los proyectos que no
  -- tienen ninguna: ahí el producto son los anexos y se cuentan todas. Es el
  -- caso de Castilla Imperial Parqueaderos, cuyas 65 unidades son garajes y que
  -- con el filtro a secas desaparecía del inventario teniendo meta de ventas.
  select proyecto_ppto,
         count(*)                                            as total,
         count(*) filter (where investunidad = 'Vendida')    as vendidas,
         count(*) filter (where investunidad = 'Disponible') as disponibles
  from inv_base
  where invundppaltipounidad = 1 or coalesce(tiene_ppal, 0) = 0
  group by 1
), ppto_proy as (
  select pv.proyecto_ppto,
         date_trunc('month', pv.fecha_periodo)::date as mes,
         sum(pv.valor) filter (where pv.pyg_codigo = '17.2') as pesos,
         sum(pv.valor) filter (where pv.pyg_codigo = '17.1') as unidades
  from excel_ic_raw.ppto_valores pv
  join proy using (proyecto_ppto)
  cross join p
  where pv.fecha_snapshot = p.snap
    and pv.pyg_codigo in ('17.1','17.2')
  group by 1, 2
), meta_proy as (
  -- Mismo reparto que usan las tarjetas y la tendencia: el PPTO del mes entre
  -- las semanas completas del mes. Antes esta sección prorrateaba por días
  -- (7/30) y daba una meta distinta para la misma semana.
  select pp.proyecto_ppto, pp.mes,
         pp.pesos    / nullif(sm.n_sem, 0) as meta_sem,
         pp.unidades / nullif(sm.n_sem, 0) as meta_sem_un
  from ppto_proy pp
  join sem_x_mes sm on sm.mes = pp.mes
), meta_ytd as (
  select mp.proyecto_ppto, sum(mp.meta_sem) as pesos
  from meta_proy mp
  join domingos d on date_trunc('month', d.domingo)::date = mp.mes
  cross join p
  where d.domingo >= date_trunc('year', p.fin)::date
    and d.domingo <= p.fin
  group by 1
), real_ytd as (
  select e.proyecto_ppto, count(*) as un, sum(v.valorneto) as pesos
  from erp e
  join sinco_ic_raw.adi_dtm_venta v on v.idproyecto = e.idproyecto
  cross join p
  where v.fechaventa::date >= date_trunc('year', p.fin)::date
    and v.fechaventa::date <= p.fin
  group by 1
), real_sem as (
  select e.proyecto_ppto, count(*) as un, sum(v.valorneto) as pesos
  from erp e
  join sinco_ic_raw.adi_dtm_venta v on v.idproyecto = e.idproyecto
  cross join p
  where v.fechaventa::date between p.ini and p.fin
  group by 1
), desist_sem as (
  select e.proyecto_ppto, count(*) as un, sum(d.valorventa) as pesos
  from erp e
  join sinco_ic_raw.adi_dtm_desistimientosventa d on d.codproyecto = e.idproyecto
  cross join p
  where d.fecha::date between p.ini and p.fin
  group by 1
)
select proy.proyecto_ppto                       as proyecto,
       coalesce(iv.total, 0)                    as inv_total,
       coalesce(iv.vendidas, 0)                 as inv_vendidas,
       coalesce(iv.disponibles, 0)              as inv_disponibles,
       coalesce(rs.un, 0)                       as un_sem,
       round(coalesce(rs.pesos, 0) / 1e6)       as mm_sem,
       round(coalesce(mp.meta_sem_un, 0), 1)    as un_ppto_sem,
       round(coalesce(mp.meta_sem, 0) / 1e6)    as mm_ppto_sem,
       coalesce(ds.un, 0)                       as desist_un_sem,
       round(coalesce(ds.pesos, 0) / 1e6)       as desist_mm_sem,
       coalesce(ry.un, 0)                       as un_ytd,
       round(coalesce(ry.pesos, 0) / 1e6)       as mm_ytd,
       round(coalesce(my.pesos, 0) / 1e6)       as mm_ppto_ytd
from proy
cross join p
left join inventario iv on iv.proyecto_ppto = proy.proyecto_ppto
left join real_sem   rs on rs.proyecto_ppto = proy.proyecto_ppto
left join real_ytd   ry on ry.proyecto_ppto = proy.proyecto_ppto
left join desist_sem ds on ds.proyecto_ppto = proy.proyecto_ppto
left join meta_ytd   my on my.proyecto_ppto = proy.proyecto_ppto
left join meta_proy  mp on mp.proyecto_ppto = proy.proyecto_ppto
                       and mp.mes = date_trunc('month', p.fin)::date
order by inv_disponibles desc, mm_ytd desc, proyecto`;

// ─── 2. Trámites ──────────────────────────────────────────────────────────────
// "Debían" = trámites con Fecha Programada dentro de la semana.
// "Hicieron" = trámites con Fecha Cumplimiento dentro de la semana. No son
// necesariamente los mismos: parte de lo cumplido son atrasos de semanas
// anteriores, y por eso las dos columnas se muestran juntas pero sin restarlas.
// "Atrasados 90d" acota el represado a lo accionable; el acumulado histórico
// arrastra negocios muertos de 2021-2023 y no dice nada de la semana.
const TRAMITES = (ini, fin) => `
with p as (
  select date '${ini}' as ini, date '${fin}' as fin
), erp as (${PORTAFOLIO_CRM}
), cat as (${CATEGORIAS_TRAMITE}
), t as (
  select tr."Codigo Tramite"           as cod,
         tr."Fecha Programada"::date   as fp,
         tr."Fecha Cumplimiento"::date as fc
  from sinco_ic_raw.adi_dtm_tramites tr
  where exists (select 1 from erp e where e.idproyecto = tr.idproyecto)
)
select c.orden, c.categoria, c.grupo,
  -- Acumulado del año: cuántos debía haber cerrado a estas alturas y cuántos
  -- lleva. Es la lectura que ordena la conversación. La semana sola no dice si
  -- el año se está perdiendo.
  count(*) filter (where t.fp >= date_trunc('year', p.fin)::date
                     and t.fp <= p.fin)                                        as debian_ytd,
  count(*) filter (where t.fc >= date_trunc('year', p.fin)::date
                     and t.fc <= p.fin)                                        as hicieron_ytd,
  count(*) filter (where t.fp between p.ini and p.fin)                         as debian,
  count(*) filter (where t.fc between p.ini and p.fin)                         as hicieron,
  count(*) filter (where t.fp between p.ini and p.fin and t.fc is null)        as pend_semana,
  -- Represado al corte, sin cota de tiempo: programado antes del domingo y sin
  -- cumplir en ese momento. Con la fecha del más viejo y el atraso promedio,
  -- que es lo que distingue una bola de nieve de un rezago de días.
  count(*) filter (where t.fp <= p.fin
                     and (t.fc is null or t.fc > p.fin))                       as atrasados,
  min(t.fp) filter (where t.fp <= p.fin
                      and (t.fc is null or t.fc > p.fin))                      as mas_antiguo,
  -- Sin redondear: el promedio del total se pondera con estos valores y
  -- redondear antes hacía que la tabla por categoría y la de por proyecto
  -- dieran 855 y 851 días para la misma población. Se redondea al imprimir.
  avg(p.fin - t.fp) filter (where t.fp <= p.fin
                              and (t.fc is null or t.fc > p.fin))              as atraso_promedio,
  count(*) filter (where t.fp > p.fin and t.fp <= p.fin + 7 and t.fc is null)  as prox_semana
from cat c
join t on t.cod = any(c.codigos)
cross join p
group by c.orden, c.categoria, c.grupo
order by c.orden`;

// Mismo corte de trámites abierto por proyecto, solo para los que tienen
// movimiento o atraso: es la tabla que dice a quién reclamarle.
const TRAMITES_PROYECTO = (ini, fin) => `
with p as (
  select date '${ini}' as ini, date '${fin}' as fin
), erp as (${PORTAFOLIO_CRM}
), cat as (${CATEGORIAS_TRAMITE}
), t as (
  select e.proyecto_ppto,
         tr."Codigo Tramite"           as cod,
         tr."Fecha Programada"::date   as fp,
         tr."Fecha Cumplimiento"::date as fc
  from sinco_ic_raw.adi_dtm_tramites tr
  join erp e on e.idproyecto = tr.idproyecto
)
select t.proyecto_ppto as proyecto,
  count(*) filter (where t.fp >= date_trunc('year', p.fin)::date
                     and t.fp <= p.fin)                                  as debian_ytd,
  count(*) filter (where t.fc >= date_trunc('year', p.fin)::date
                     and t.fc <= p.fin)                                  as hicieron_ytd,
  count(*) filter (where t.fp between p.ini and p.fin)                   as debian,
  count(*) filter (where t.fc between p.ini and p.fin)                   as hicieron,
  count(*) filter (where t.fp <= p.fin
                     and (t.fc is null or t.fc > p.fin))                 as atrasados,
  min(t.fp) filter (where t.fp <= p.fin
                      and (t.fc is null or t.fc > p.fin))                as mas_antiguo,
  avg(p.fin - t.fp) filter (where t.fp <= p.fin
                              and (t.fc is null or t.fc > p.fin))       as atraso_promedio
from t
join cat c on t.cod = any(c.codigos)
cross join p
group by t.proyecto_ppto
having count(*) filter (where t.fp between p.ini and p.fin) > 0
    or count(*) filter (where t.fc between p.ini and p.fin) > 0
    or count(*) filter (where t.fp <= p.fin and (t.fc is null or t.fc > p.fin)) > 0
order by atrasados desc, proyecto`;

// ─── 3. Cartera ───────────────────────────────────────────────────────────────
// Recaudo de la semana = cuotas con fecha_date en la semana (pactado vs pagado).
// Vencido = mora_saldo > 0 — definición certificada con Cartera el 2026-08-30
// (ver app/supabase/migrations/20260830_001_cartera_vencida_certificada.sql).
// Categoría por idconcepto, nunca por el texto del concepto: 3,4 = crédito;
// 6,313 = subsidio; el resto es plata del bolsillo del comprador.
const CARTERA = (ini, fin) => `
with p as (
  select date '${ini}' as ini, date '${fin}' as fin
), erp as (${PORTAFOLIO_CRM}
), esc as (${VENTAS_ESCRITURADAS}
), ap as (
  select e.proyecto_ppto, a.pactado, a.pagado, a.mora_saldo, a.mora_dias,
         a.idventa, a.idconcepto, a.fecha_date,
         -- Exigible = o no depende de la escritura, o la unidad ya se escrituró.
         (a.idconcepto not in ${CONCEPTOS_POST_ESCRITURA}
          or exists (select 1 from esc where esc.idventa = a.idventa)) as exigible
  from sinco_ic_raw.adi_dtm_acuerdos_pago a
  join erp e on e.idproyecto = a.vtaidproyecto
)
select ap.proyecto_ppto as proyecto,
  -- Productividad de recaudo: SOLO conceptos iniciales, igual que la tarjeta y
  -- la tendencia. Antes esta sección los sumaba todos y el correo mostraba dos
  -- "recaudo de la semana" distintos: 1.081 de 6.541 aquí, 267 de 1.529 arriba.
  -- La diferencia era crédito y subsidio, que dependen del banco y de la caja,
  -- no de la gestión de Cartera.
  round(coalesce(sum(ap.pactado) filter (where ap.fecha_date >= date_trunc('year', p.fin)::date
        and ap.fecha_date <= p.fin and ap.idconcepto in ${CONCEPTOS_INICIALES}), 0) / 1e6)   as pactado_ytd_mm,
  round(coalesce(sum(ap.pagado)  filter (where ap.fecha_date >= date_trunc('year', p.fin)::date
        and ap.fecha_date <= p.fin and ap.idconcepto in ${CONCEPTOS_INICIALES}), 0) / 1e6)   as pagado_ytd_mm,
  round(coalesce(sum(ap.pactado) filter (where ap.fecha_date between p.ini and p.fin
        and ap.idconcepto in ${CONCEPTOS_INICIALES}), 0) / 1e6)                              as pactado_sem_mm,
  round(coalesce(sum(ap.pagado)  filter (where ap.fecha_date between p.ini and p.fin
        and ap.idconcepto in ${CONCEPTOS_INICIALES}), 0) / 1e6)                              as pagado_sem_mm,
  -- Mora EXIGIBLE: todos los conceptos, con la definición de saldo certificada
  -- con el área (20260830_001_cartera_vencida_certificada.sql), pero excluyendo
  -- crédito y subsidio de unidades sin escriturar. Esa plata no la puede cobrar
  -- nadie hasta que se firme la escritura, y mezclarla con la mora gestionable
  -- le atribuía a Cartera un problema que es de escrituración.
  round(coalesce(sum(ap.mora_saldo) filter (where ap.mora_saldo > 0 and ap.exigible), 0) / 1e6)  as vencido_mm,
  round(coalesce(sum(ap.mora_saldo) filter (where ap.mora_saldo > 0 and ap.exigible
        and ap.mora_dias > 90), 0) / 1e6)                                                        as vencido_90_mm,
  -- Lo bloqueado se muestra aparte, no se esconde: es el tamaño de lo que
  -- destraba la escrituración.
  round(coalesce(sum(ap.mora_saldo) filter (where ap.mora_saldo > 0 and not ap.exigible), 0) / 1e6) as bloqueado_mm,
  count(distinct ap.idventa) filter (where ap.mora_saldo > 0 and not ap.exigible)                as clientes_bloqueo,
  round(coalesce(sum(ap.mora_saldo) filter (where ap.mora_saldo > 0 and ap.exigible
        and ap.idconcepto in (3,4)), 0) / 1e6)                                                   as vencido_credito_mm,
  round(coalesce(sum(ap.mora_saldo) filter (where ap.mora_saldo > 0 and ap.exigible
        and ap.idconcepto in (6,313)), 0) / 1e6)                                                 as vencido_subsidio_mm,
  count(distinct ap.idventa) filter (where ap.mora_saldo > 0 and ap.exigible)                    as clientes_mora,
  min(ap.fecha_date) filter (where ap.mora_saldo > 0 and ap.exigible)                            as mora_mas_antigua,
  -- Promedio ponderado por saldo, no por cuota: 900 días sobre 2 millones no
  -- pesa lo mismo que 30 días sobre 400. Sin redondear, para que el total del
  -- portafolio no discrepe del de las filas.
  sum(ap.mora_dias * ap.mora_saldo) filter (where ap.mora_saldo > 0 and ap.exigible)
    / nullif(sum(ap.mora_saldo) filter (where ap.mora_saldo > 0 and ap.exigible), 0)             as mora_dias_prom
from ap
cross join p
group by ap.proyecto_ppto
order by vencido_mm desc nulls last`;

// ─── 4. Ejecución de obra ─────────────────────────────────────────────────────
// "Debía invertir" sale del cronograma de obra de ADPRO
// (adp_dtm_vfact_programacion), medido en pesos. El grano de esa tabla es
// actividad × ventana de fechas: "Valor Programado" es el valor TOTAL del grupo
// de actividad y "Porcentaje Asignado" la fracción que le toca a esa ventana
// (verificado: los porcentajes suman exactamente 1 por grupo). El valor con
// fecha es entonces Valor Programado × Porcentaje Asignado, prorrateado por días
// entre Fecha Inicial y Fecha Final para repartirlo dentro de la semana.
//
// NO se usa el presupuesto de ADPRO (clase 'P') como meta semanal: sus filas
// tienen fecha 1900-01-01, no está fasado en el tiempo.
//
// El cronograma no cubre todo: por eso la consulta devuelve `cobertura_pct`
// (cronograma total / presupuesto) y `horizonte` (última fecha programada). El
// correo usa esas dos columnas para no mostrar un cumplimiento contra un
// cronograma vencido o inexistente. Al 2026-09-07 solo Bosque Central, Primera
// Este y Praia Natura tienen cronograma vigente; Castilla Imperial y La Hacienda
// Jamundí no tienen ninguno.
//
// El acumulado invertido viene de la matview ic_kpi (vía su vista de compat en
// public): sumarlo aquí sobre adp_dtm_vfact_controlproyecto sin cota de fecha
// revienta el statement_timeout de 15 s.
const OBRA = (ini, fin) => `
with p as (
  select date '${ini}' as ini, date '${fin}' as fin
), crono as (
  select pr."MacroProyecto Descripcion"                   as macro,
         pr."Fecha Inicial"                               as f_ini,
         greatest(pr."Fecha Final", pr."Fecha Inicial")   as f_fin,
         pr."Valor Programado" * pr."Porcentaje Asignado" as valor
  from sinco_ic_raw.adp_dtm_vfact_programacion pr
  where pr."Porcentaje Asignado" > 0
    and pr."Fecha Inicial" is not null
    and pr."Fecha Final"   is not null
), crono_agg as (
  select c.macro,
    sum(c.valor / ((c.f_fin - c.f_ini) + 1)
        * greatest(least(c.f_fin, p.fin) - greatest(c.f_ini, p.ini) + 1, 0))      as prog_sem,
    sum(c.valor / ((c.f_fin - c.f_ini) + 1)
        * greatest(least(c.f_fin, p.fin)
                   - greatest(c.f_ini, date_trunc('month', p.fin)::date) + 1, 0)) as prog_mtd,
    sum(c.valor)                                                                  as prog_total,
    max(c.f_fin)                                                                  as horizonte
  from crono c cross join p
  group by c.macro
), mov as (
  select cp."MacroProyecto Descripcion" as macro, cp.fecha, cp."Valor Total" as valor
  from sinco_ic_raw.adp_dtm_vfact_controlproyecto cp
  cross join p
  where cp.clase = 'I'
    and cp.fecha >= date_trunc('month', p.fin)::date - 56
    and cp.fecha <= p.fin
    and cp."MacroProyecto Descripcion" in (${MACROS_OBRA})
), real_agg as (
  select mov.macro,
    sum(valor) filter (where fecha between p.ini and p.fin)      as inv_sem,
    sum(valor) filter (where fecha >= date_trunc('month', p.fin)::date
                         and fecha <= p.fin)                     as inv_mtd
  from mov cross join p
  group by mov.macro
)
select k.proyecto_ppto                                        as proyecto,
       round(coalesce(ca.prog_sem, 0) / 1e6)                  as prog_sem_mm,
       round(coalesce(ra.inv_sem, 0) / 1e6)                   as inv_sem_mm,
       round(coalesce(ca.prog_mtd, 0) / 1e6)                  as prog_mtd_mm,
       round(coalesce(ra.inv_mtd, 0) / 1e6)                   as inv_mtd_mm,
       k.obra_real                                            as acum_mm,
       k.obra_ppto                                            as ppto_mm,
       round(100.0 * k.obra_real / nullif(k.obra_ppto, 0), 1) as avance_pct,
       round(100.0 * coalesce(ca.prog_total, 0)
             / nullif(k.obra_ppto, 0) / 1e6)                  as cobertura_pct,
       ca.horizonte                                           as horizonte
from public.kpi_programacion_obra_ytd_proyecto k
left join crono_agg ca on ca.macro = k.proyecto_ppto
left join real_agg  ra on ra.macro = k.proyecto_ppto
order by inv_sem_mm desc`;

// ─── 5. Flujo de caja ─────────────────────────────────────────────────────────
// Dos lecturas deliberadamente separadas:
//   (a) Proxy semanal de caja del portafolio CRM: recaudo cobrado en la semana
//       menos inversión de obra ejecutada en la semana. Es dato vivo.
//   (b) FCL formal por proyecto del último corte de Excel/PyG. Es mensual y
//       puede estar meses atrasado; el correo muestra la fecha del corte.
const FLUJO_PROXY = (ini, fin) => `
with p as (
  select date '${ini}' as ini, date '${fin}' as fin
), erp as (${PORTAFOLIO_CRM}
), recaudo as (
  select coalesce(sum(a.pagado), 0) as pesos
  from sinco_ic_raw.adi_dtm_acuerdos_pago a
  join erp e on e.idproyecto = a.vtaidproyecto
  cross join p
  where a.fecha_date between p.ini and p.fin
), obra as (
  select coalesce(sum(cp."Valor Total"), 0) as pesos
  from sinco_ic_raw.adp_dtm_vfact_controlproyecto cp
  cross join p
  where cp.clase = 'I'
    and cp.fecha between p.ini and p.fin
    and cp."MacroProyecto Descripcion" in (${MACROS_OBRA})
)
select round((select pesos from recaudo) / 1e6)                              as recaudo_mm,
       round((select pesos from obra) / 1e6)                                 as obra_mm,
       round(((select pesos from recaudo) - (select pesos from obra)) / 1e6) as neto_mm`;

const FLUJO_CORTE = () => `
select f.proyecto,
       f.fecha_datos                as corte,
       round(f.fcl / 1e6)           as fcl_mm,
       round(f.fcl_acumulado / 1e6) as fcl_acum_mm,
       round(f.ingresos / 1e6)      as ingresos_mm,
       round(f.costos / 1e6)        as costos_mm
from public.v_flujo_caja f
where f.fecha_datos = (select max(fecha_datos) from public.v_flujo_caja)
  and (f.ingresos <> 0 or f.costos <> 0)
order by f.fcl asc`;

// ─── 6. Frescura de las fuentes ───────────────────────────────────────────────
// Va al pie del correo. Sin esto, una cifra en cero puede leerse como "no pasó
// nada" cuando en realidad es "el sync no corrió".
const FRESCURA = () => `
select 'Ventas / trámites / cartera (SINCO CBR)' as fuente,
       (select max(fechacreacion)::date from sinco_ic_raw.adi_dtm_tramites) as ultimo_dato
union all
select 'Obra (ADPRO)',
       (select max(fecha) from sinco_ic_raw.adp_dtm_vfact_controlproyecto where clase = 'I')
union all
select 'Flujo de caja (Excel PyG)',
       (select max(fecha_datos) from public.v_flujo_caja)
union all
select 'Presupuesto de ventas (snapshot)',
       (select snap_ppto from ic_calc.v_kpi_params)`;

module.exports = {
  SEMANAS_TENDENCIA, TENDENCIA, ACUMULADO,
  VENTAS, TRAMITES, TRAMITES_PROYECTO, CARTERA, OBRA,
  FLUJO_PROXY, FLUJO_CORTE, FRESCURA,
  DET_VENTAS, DET_DESISTIMIENTOS, DET_TRAMITES_SEMANA, DET_TRAMITES_ATRASADOS,
  DET_CARTERA_SEMANA, DET_CARTERA_MORA,
};
