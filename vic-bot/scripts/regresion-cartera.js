// Regresión de las cifras de cartera vencida.
//
// Contrasta las vistas certificadas de sinco_ic_calc contra las cifras que
// Cartera confirmó con Nicolás (corte 2026-08-28, registradas en VIC.pptx), y
// contra los errores concretos que VIC cometió ese día.
//
//   node scripts/regresion-cartera.js
//
// Dos clases de comprobación:
//   ANCLA    — debe cuadrar al peso. Son categorías que no reciben recaudo
//              diario, así que no se mueven entre cortes.
//   TENDENCIA — solo se verifica el orden de magnitud (tolerancia %), porque
//              adi_dtm_acuerdos_pago es un espejo vivo sin histórico y el
//              recaudo mueve los saldos cada día.
//
// Si una ANCLA falla, la definición de la vista cambió: no publiques.

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const { queryDb } = require('../src/tools/sinco')

const V_PROY = 'sinco_ic_calc.v_cartera_vencida_proyecto'
const V_RES = 'sinco_ic_calc.v_cartera_vencida_resumen'
const CASTILLA_LIVING = '(158, 159)'

const CASOS = [
  {
    tipo: 'ancla',
    nombre: 'Castilla Living — crédito vencido',
    esperado: 1184945900,
    sql: `SELECT sum(vencido_credito) AS v FROM ${V_PROY} WHERE id_proyecto IN ${CASTILLA_LIVING}`
  },
  {
    tipo: 'ancla',
    nombre: 'Castilla Living — subsidio vencido',
    esperado: 1178305800,
    sql: `SELECT sum(vencido_subsidio) AS v FROM ${V_PROY} WHERE id_proyecto IN ${CASTILLA_LIVING}`
  },
  {
    tipo: 'tendencia',
    nombre: 'Castilla Living — vencido total',
    esperado: 3778658904,
    tolerancia: 0.05,
    sql: `SELECT sum(vencido_total) AS v FROM ${V_PROY} WHERE id_proyecto IN ${CASTILLA_LIVING}`
  },
  {
    tipo: 'tendencia',
    nombre: 'Todos los proyectos — cuota inicial vencida (C.I.)',
    esperado: 14673206975,
    tolerancia: 0.08,
    sql: `SELECT sum(vencido_cuota_inicial) AS v FROM ${V_PROY}`
  },
  {
    tipo: 'tendencia',
    nombre: 'Todos los proyectos — vencido total (todos los conceptos)',
    esperado: 40045039654,
    tolerancia: 0.08,
    sql: `SELECT sum(vencido_total) AS v FROM ${V_PROY}`
  },
  {
    // El 2026-08-28 VIC respondió $326.254.505.344 leyendo adi_dtm_venta.
    tipo: 'techo',
    nombre: 'Vencido total NO puede acercarse al error de adi_dtm_venta',
    maximo: 100000000000,
    sql: `SELECT sum(vencido_total) AS v FROM ${V_PROY}`
  },
  {
    // El 2026-08-28 VIC respondió $25.000.000 por hacer concepto ILIKE
    // '%cuota inicial%', que solo matchea 'Bono cuota inicial-1'.
    tipo: 'piso',
    nombre: 'C.I. vencida NO puede colapsar al monto del bono ($25M)',
    minimo: 1000000000,
    sql: `SELECT sum(vencido_cuota_inicial) AS v FROM ${V_PROY}`
  },
  {
    // El 2026-08-28 VIC reportó $0 de mora para Praia usando adi_dtm_venta.
    tipo: 'no_vacio',
    nombre: 'Praia Natura tiene cartera vencida (no todo en cero)',
    sql: `SELECT sum(vencido) AS v FROM ${V_RES} WHERE proyecto ILIKE '%PRAIA%'`
  },
  {
    tipo: 'no_vacio',
    nombre: 'Los 4 rangos de mora están poblados',
    sql: `SELECT count(DISTINCT rango_mora) AS v FROM ${V_RES}`,
    minimo: 4
  }
]

const cop = n => Number(n).toLocaleString('es-CO')

async function valor(sql) {
  const r = await queryDb({ sql, limit: 5 })
  if (typeof r === 'string') throw new Error(r)
  return Number(r.filas[0].v)
}

async function main() {
  let fallas = 0
  let avisos = 0

  for (const c of CASOS) {
    let v
    try {
      v = await valor(c.sql)
    } catch (err) {
      console.log(`FALLA    ${c.nombre}\n         ${err.message}`)
      fallas++
      continue
    }

    if (c.tipo === 'ancla') {
      const ok = v === c.esperado
      console.log(`${ok ? 'OK      ' : 'FALLA   '} ${c.nombre}: ${cop(v)}${ok ? '' : ` (esperado ${cop(c.esperado)})`}`)
      if (!ok) fallas++
    } else if (c.tipo === 'tendencia') {
      const desv = Math.abs(v - c.esperado) / c.esperado
      const ok = desv <= c.tolerancia
      console.log(`${ok ? 'OK      ' : 'AVISO   '} ${c.nombre}: ${cop(v)} vs ${cop(c.esperado)} (${(desv * 100).toFixed(1)}% de deriva, tolerancia ${(c.tolerancia * 100).toFixed(0)}%)`)
      if (!ok) avisos++
    } else if (c.tipo === 'techo') {
      const ok = v < c.maximo
      console.log(`${ok ? 'OK      ' : 'FALLA   '} ${c.nombre}: ${cop(v)}`)
      if (!ok) fallas++
    } else if (c.tipo === 'piso' || c.tipo === 'no_vacio') {
      const min = c.minimo || 1
      const ok = v >= min
      console.log(`${ok ? 'OK      ' : 'FALLA   '} ${c.nombre}: ${cop(v)}`)
      if (!ok) fallas++
    }
  }

  console.log(`\n${fallas} fallas, ${avisos} avisos de deriva.`)
  if (avisos && !fallas) {
    console.log('La deriva es esperable: la fuente es un espejo vivo. Si crece, re-baseliza con Cartera.')
  }
  process.exit(fallas ? 1 : 0)
}

main().catch(err => {
  console.error('Error ejecutando la regresión:', err.message)
  process.exit(1)
})
