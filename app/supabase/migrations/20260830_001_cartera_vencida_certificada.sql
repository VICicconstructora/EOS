-- Cartera vencida (CBR): capa semántica certificada.
--
-- Motivo
-- ------
-- VIC generaba el SQL de cartera por su cuenta y cada pregunta devolvía una
-- cifra distinta. En las pruebas del 2026-08-28 respondió:
--   * $326.254.505.344 de "cartera vencida" — usó adi_dtm_venta (ventas
--     históricas), no cartera. 8x el valor real.
--   * $0 de mora para Praia — misma pregunta, otra tabla.
--   * $25.000.000 de "cuota inicial vencida" — hizo
--     concepto ILIKE '%cuota inicial%', que SOLO matchea el concepto marginal
--     'Bono cuota inicial-1'. Las cuotas reales se llaman 'Cuota-N'.
-- La definición deja de vivir en el criterio del modelo y pasa a estas vistas.
--
-- Definición certificada
-- ----------------------
-- Fuente única: sinco_ic_raw.adi_dtm_acuerdos_pago (módulo CBR).
-- Vencido  := mora_saldo > 0. Equivale exactamente a estadocartera = 'Vencido'
--             (verificado: las 1.202 filas con mora_saldo > 0 tienen ese estado,
--             mora_dias entre 1 y 1763, sin nulos).
-- Categoría por idconcepto, NO por texto del concepto:
--     3, 4    -> credito       (C:Credito-1, C:CreditoTer-1)
--     6, 313  -> subsidio      (Subsidio-N, Subsidio Concurrente-1)
--     resto   -> cuota_inicial (Cuota-N, Separación, Cesantías, Ahorro Prog.,
--                               CDT, AFC, Bono cuota inicial — todo lo que
--                               aporta el comprador de su bolsillo)
--
-- Validación contra las cifras que Cartera confirmó con Nicolás (corte
-- 2026-08-28), medidas el 2026-08-30:
--     Castilla Living credito   1.184.945.900  vs  1.184.945.900  EXACTO
--     Castilla Living subsidio  1.178.305.800  vs  1.178.305.800  EXACTO
--     Castilla Living cuota_ini 1.370.853.274  vs  1.415.407.204  -44,5M (*)
--     Total cuota_inicial      14.182.325.685  vs 14.673.206.975  -490M  (*)
-- (*) adi_dtm_acuerdos_pago es un espejo VIVO sin histórico: no hay columna de
--     corte, así que dos días de recaudo mueven los saldos. Las dos categorías
--     que no reciben pagos diarios cuadran al peso, que es lo que certifica la
--     taxonomía. Para comparar contra un corte pasado hay que congelar snapshot.

create schema if not exists sinco_ic_calc;

-- Grano: una fila por cuota vencida. Es el detalle auditable.
create or replace view sinco_ic_calc.v_cartera_vencida as
select
  ap.vtaidproyecto                          as id_proyecto,
  ap.vtanombreproyecto                      as proyecto,
  ap.vtaidmacro                             as id_macroproyecto,
  ap.vtanombremacro                         as macroproyecto,
  ap.idventa,
  ap.compradornombre                        as comprador,
  ap.compradordocumento                     as documento,
  ap.concepto,
  ap.idconcepto,
  case
    when ap.idconcepto in (3, 4)   then 'credito'
    when ap.idconcepto in (6, 313) then 'subsidio'
    else 'cuota_inicial'
  end                                       as categoria,
  case
    when ap.mora_dias <= 30 then '01_hasta_30'
    when ap.mora_dias <= 60 then '02_31_a_60'
    when ap.mora_dias <= 90 then '03_61_a_90'
    else                         '04_mas_de_90'
  end                                       as rango_mora,
  ap.mora_dias,
  ap.mora_saldo                             as vencido,
  ap.pactado,
  ap.pagado,
  ap.saldo,
  ap.entidad,
  ap.estadoplanpago,
  ap.fecha_date                             as fecha_cuota
from sinco_ic_raw.adi_dtm_acuerdos_pago ap
where ap.mora_saldo > 0;

comment on view sinco_ic_calc.v_cartera_vencida is
  'CERTIFICADA. Detalle de cartera vencida CBR (una fila por cuota en mora). '
  'Vencido = mora_saldo > 0. Categoría por idconcepto: 3,4=credito; 6,313=subsidio; resto=cuota_inicial. '
  'Fuente viva sin histórico: refleja el saldo de hoy, no un corte pasado.';

-- Agregado por proyecto x categoría x rango de mora. Es el que responde
-- "informe de cartera por proyecto con mora de 30 / 60 / más de 90".
create or replace view sinco_ic_calc.v_cartera_vencida_resumen as
select
  id_proyecto,
  proyecto,
  categoria,
  rango_mora,
  count(*)                as n_cuotas,
  count(distinct idventa) as n_ventas,
  sum(vencido)            as vencido
from sinco_ic_calc.v_cartera_vencida
group by 1, 2, 3, 4;

comment on view sinco_ic_calc.v_cartera_vencida_resumen is
  'CERTIFICADA. Cartera vencida agregada por proyecto, categoría y rango de mora. '
  'Úsala en vez de sumar el detalle: nunca se trunca.';

-- Una fila por proyecto, con las tres categorías abiertas y el total.
-- Reproduce el desglose que pidió Cartera: créditos, subsidios y saldo propio.
create or replace view sinco_ic_calc.v_cartera_vencida_proyecto as
select
  id_proyecto,
  proyecto,
  sum(vencido) filter (where categoria = 'cuota_inicial') as vencido_cuota_inicial,
  sum(vencido) filter (where categoria = 'credito')       as vencido_credito,
  sum(vencido) filter (where categoria = 'subsidio')      as vencido_subsidio,
  sum(vencido)                                            as vencido_total,
  count(distinct idventa)                                 as n_ventas,
  max(mora_dias)                                          as mora_dias_max
from sinco_ic_calc.v_cartera_vencida
group by 1, 2;

comment on view sinco_ic_calc.v_cartera_vencida_proyecto is
  'CERTIFICADA. Una fila por proyecto: cartera vencida abierta en cuota_inicial / credito / subsidio y el total. '
  'vencido_total = suma de las tres; no las sumes aparte.';

-- Acceso de VIC (rol vic_readonly, ver migración vic_acceso_total_lectura).
grant usage on schema sinco_ic_calc to vic_readonly;
grant select on sinco_ic_calc.v_cartera_vencida          to vic_readonly;
grant select on sinco_ic_calc.v_cartera_vencida_resumen  to vic_readonly;
grant select on sinco_ic_calc.v_cartera_vencida_proyecto to vic_readonly;
