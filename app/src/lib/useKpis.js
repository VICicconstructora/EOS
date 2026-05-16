// src/lib/useKpis.js
// Hook que carga los KPIs reales desde Supabase IC y los devuelve como árbol
// compatible con la estructura que espera KpiCard / KpiRow.
//
// Estructura del árbol:
//   Root: 5 cards (2 CEO + 3 Mónica)
//     - Ventas YTD          (Juan Paulo McAllister)  → children: por proyecto
//     - Escrituración YTD   (Juan Paulo McAllister)  → children: por proyecto
//     - Trámites YTD        (Mónica Báez)            → children: por proyecto (CRM)
//     - Cartera Pre-escr.   (Mónica Báez)            → children: por proyecto (CRM)
//     - Cartera Post-escr.  (Mónica Báez)            → children: por proyecto (CRM)
//
// Convención de valores:
//   - Plata: dividida por 1e6 (millones de pesos colombianos) para legibilidad
//   - Porcentajes: 0-100
//   - Reglas default: verde ≥ 90% cumplimiento, amarillo ≥ 70%, rojo < 70%
//     Para KPIs en $: thresholds absolutos = ppto * 0.9 / 0.7
//     Para KPIs en %: thresholds = 90 / 70

import { useEffect, useState } from 'react'
import { supabaseIc, isIcConfigured } from './supabaseIc'
import { downloadCsv } from '../utils/exportCsv'

const CEO_NAME = 'Juan Paulo McAllister'
const MONICA_NAME = 'Mónica Báez'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const monthLabel = (isoDate) => {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  return MONTHS[d.getUTCMonth()]
}

// Reglas por tipo de KPI (ajustables después en runtime via KpiSettingsModal)
const ruleForCurrency = (pptoMM) => ({
  type: 'higher_is_better',
  green: Math.round((pptoMM ?? 0) * 0.9),
  yellow: Math.round((pptoMM ?? 0) * 0.7),
})

const rulePercentage = {
  type: 'higher_is_better',
  green: 90,
  yellow: 70,
}

// Construye un nodo "leaf" para un proyecto en una métrica
const projectLeaf = (idPrefix, kpiKey, projectRow, format, options = {}) => {
  const { ppto, real, includeUn = false, sparkData = [], unidadLabel = 'MM$' } = options

  let currentValue, targetValue, rules
  if (format === 'currency') {
    currentValue = real ?? 0
    targetValue = ppto ?? 0
    rules = ruleForCurrency(ppto)
  } else if (format === 'percentage') {
    const pct = (ppto && ppto > 0) ? (real / ppto) * 100 : 0
    currentValue = Math.round(pct * 10) / 10
    targetValue = 100
    rules = rulePercentage
  } else {
    currentValue = real ?? 0
    targetValue = ppto ?? 0
    rules = ruleForCurrency(ppto)
  }

  const history = sparkData.map(p => ({
    period: monthLabel(p.mes),
    target: format === 'percentage' ? 100 : (p.ppto ?? 0),
    actual: format === 'percentage'
      ? (p.ppto && p.ppto > 0 ? Math.round(((p.real / p.ppto) * 100) * 10) / 10 : 0)
      : (p.real ?? 0),
  }))

  return {
    id: `${idPrefix}-${kpiKey}-${slug(projectRow.proyecto_ppto)}`,
    title: projectRow.proyecto_ppto,
    owner: projectRow.fuente_real || '',
    currentValue,
    targetValue,
    format,
    rules,
    childrenAggregationType: 'none',
    children: [],
    history,
    // metadata extra para tooltip enriquecido
    _meta: {
      pptoRaw: ppto,
      realRaw: real,
      unidadLabel,
      includeUn,
      pctCumplimiento: ppto && ppto > 0 ? (real / ppto) * 100 : null,
    }
  }
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-')

const sumNonNull = (arr, key) => arr.reduce((a, r) => a + (Number(r[key]) || 0), 0)

const div = (n, d) => (d ? n / d : 0)

const div1M = (n) => Math.round(((Number(n) || 0) / 1e6) * 10) / 10

// Deriva el macroproyecto desde el nombre PPTO. Ej:
//   "Azul Celeste E2"             → "Azul Celeste"
//   "Castilla Imperial 2B"        → "Castilla Imperial"
//   "Castilla Imperial P"         → "Castilla Imperial"
//   "Bosque Central Vivienda"     → "Bosque Central"
//   "Primera Este E 1-2"          → "Primera Este"
//   "Reserva De Oporto E3"        → "Reserva De Oporto"
//   "Gaia" / "Well" / "Castilla Living" → sin cambio
const SUFFIX_PATTERNS = [
  /\s+E\s*\d+(\s*-\s*\d+)?$/i,  // E1, E 1-2, E3
  /\s+\d+[A-Z]$/,                // 2A, 2B
  /\s+P$/,                       // P
  /\s+Vivienda$/i,               // Vivienda
]
const macroProyectoOf = (name) => {
  if (!name) return name
  for (const re of SUFFIX_PATTERNS) {
    if (re.test(name)) return name.replace(re, '').trim()
  }
  return name
}

// Construye un nodo macroproyecto a partir de sus hojas (proyectos PPTO).
// Si el macro tiene una sola hoja con el mismo nombre, devuelve la hoja directa.
const buildMacroNode = (idPrefix, macroName, leafs, format, owner, unidadLabel) => {
  if (leafs.length === 1 && leafs[0].title === macroName) return leafs[0]

  if (format === 'currency') {
    const currentValue = leafs.reduce((a, l) => a + (Number(l.currentValue) || 0), 0)
    const targetValue = leafs.reduce((a, l) => a + (Number(l.targetValue) || 0), 0)
    const pptoRaw = leafs.reduce((a, l) => a + (Number(l._meta?.pptoRaw) || 0), 0)
    const realRaw = leafs.reduce((a, l) => a + (Number(l._meta?.realRaw) || 0), 0)
    const unitsPpto = leafs.reduce((a, l) => a + (Number(l._meta?.unitsPpto) || 0), 0)
    const unitsReal = leafs.reduce((a, l) => a + (Number(l._meta?.unitsReal) || 0), 0)
    return {
      id: `${idPrefix}-macro-${slug(macroName)}`,
      title: macroName,
      owner: owner || '',
      currentValue: Math.round(currentValue * 10) / 10,
      targetValue: Math.round(targetValue * 10) / 10,
      format: 'currency',
      rules: ruleForCurrency(targetValue),
      childrenAggregationType: 'sum',
      children: leafs,
      history: aggregateHistory(leafs),
      _meta: {
        pptoRaw,
        realRaw,
        unidadLabel,
        unitsPpto,
        unitsReal,
        pctCumplimiento: targetValue > 0 ? (currentValue / targetValue) * 100 : null,
      },
    }
  }

  if (format === 'percentage') {
    // Para % agregamos numerador/denominador, no promediamos %
    const sumPpto = leafs.reduce((a, l) => a + (Number(l._meta?.pptoRaw) || 0), 0)
    const sumReal = leafs.reduce((a, l) => a + (Number(l._meta?.realRaw) || 0), 0)
    const pct = sumPpto > 0 ? (sumReal / sumPpto) * 100 : 0
    return {
      id: `${idPrefix}-macro-${slug(macroName)}`,
      title: macroName,
      owner: owner || '',
      currentValue: Math.round(pct * 10) / 10,
      targetValue: 100,
      format: 'percentage',
      rules: { ...rulePercentage },
      childrenAggregationType: 'none',
      children: leafs,
      history: aggregateHistoryPct(leafs),
      _meta: {
        pptoRaw: sumPpto,
        realRaw: sumReal,
        unidadLabel,
        pctCumplimiento: pct,
      },
    }
  }

  return null
}

// Agrega series mensuales sumando target / actual de las hojas
const aggregateHistory = (leafs) => {
  const byPeriod = new Map()
  leafs.forEach(l => {
    (l.history || []).forEach(p => {
      const o = byPeriod.get(p.period) || { period: p.period, target: 0, actual: 0 }
      o.target += Number(p.target) || 0
      o.actual += Number(p.actual) || 0
      byPeriod.set(p.period, o)
    })
  })
  return [...byPeriod.values()].map(o => ({
    period: o.period,
    target: Math.round(o.target * 10) / 10,
    actual: Math.round(o.actual * 10) / 10,
  }))
}

// Para % la serie agregada es % por periodo: usa raw mensual si está, si no
// promedia los % (degraded). Aquí el history de las hojas % ya viene en %, así que
// no podemos reconstruir el numerador/denominador por mes; degradamos a promedio simple.
const aggregateHistoryPct = (leafs) => {
  const byPeriod = new Map()
  leafs.forEach(l => {
    (l.history || []).forEach(p => {
      const o = byPeriod.get(p.period) || { period: p.period, sum: 0, n: 0 }
      o.sum += Number(p.actual) || 0
      o.n += 1
      byPeriod.set(p.period, o)
    })
  })
  return [...byPeriod.values()].map(o => ({
    period: o.period,
    target: 100,
    actual: o.n > 0 ? Math.round((o.sum / o.n) * 10) / 10 : 0,
  }))
}

// Agrupa hojas por macroproyecto
const groupByMacro = (leafs, idPrefix, format, owner, unidadLabel) => {
  const groups = new Map()
  leafs.forEach(leaf => {
    const macro = macroProyectoOf(leaf.title)
    if (!groups.has(macro)) groups.set(macro, [])
    groups.get(macro).push(leaf)
  })
  const macroNodes = []
  for (const [macro, ls] of groups) {
    const node = buildMacroNode(idPrefix, macro, ls, format, owner, unidadLabel)
    if (node) macroNodes.push(node)
  }
  // Ordenar por currentValue descendente para que los más relevantes salgan primero
  macroNodes.sort((a, b) => (Number(b.currentValue) || 0) - (Number(a.currentValue) || 0))
  return macroNodes
}

export function useKpis(scope = 'total') {
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isIcConfigured) {
      setError(new Error('Supabase IC no configurado'))
      setLoading(false)
      return
    }
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        // Una sola tanda paralela de consultas
        const [
          ventasYtd, escrYtd, tramitesYtd, carteraYtd,
          ventasSerie, escrSerie, tramitesSerie, carteraSerie,
          ceoCons, monicaCons,
        ] = await Promise.all([
          supabaseIc.from('kpi_ventas_ytd_proyecto').select('*'),
          supabaseIc.from('kpi_escrituracion_ytd_proyecto').select('*'),
          supabaseIc.from('kpi_tramites_ytd_proyecto').select('*'),
          supabaseIc.from('kpi_cartera_ytd_proyecto').select('*'),
          supabaseIc.from('kpi_ventas_serie_mensual').select('*'),
          supabaseIc.from('kpi_escrituracion_serie_mensual').select('*'),
          supabaseIc.from('kpi_tramites_serie_mensual').select('*'),
          supabaseIc.from('kpi_cartera_serie_mensual').select('*'),
          supabaseIc.from(scope === 'crm' ? 'kpi_ceo_consolidado_crm' : 'kpi_ceo_consolidado_total').select('*').single(),
          supabaseIc.from(scope === 'crm' ? 'kpi_monica_consolidado_crm' : 'kpi_monica_consolidado_total').select('*').single(),
        ])

        const errs = [ventasYtd, escrYtd, tramitesYtd, carteraYtd, ventasSerie, escrSerie, tramitesSerie, carteraSerie, ceoCons, monicaCons]
          .map(r => r.error).filter(Boolean)
        if (errs.length) throw errs[0]

        if (!alive) return

        // Index series por proyecto
        const byProj = (arr) => {
          const m = new Map()
          arr.forEach(r => {
            if (!m.has(r.proyecto_ppto)) m.set(r.proyecto_ppto, [])
            m.get(r.proyecto_ppto).push(r)
          })
          return m
        }
        const ventasSerieMap = byProj(ventasSerie.data)
        const escrSerieMap = byProj(escrSerie.data)
        const tramitesSerieMap = byProj(tramitesSerie.data)
        const carteraSerieMap = byProj(carteraSerie.data)

        // Sparkline consolidado (sumando proyectos por mes)
        const consolidatedSpark = (serieAll, getReal, getPpto) => {
          const byMes = new Map()
          serieAll.forEach(r => {
            const k = r.mes
            const o = byMes.get(k) || { mes: k, real: 0, ppto: 0 }
            o.real += Number(getReal(r) || 0)
            o.ppto += Number(getPpto(r) || 0)
            byMes.set(k, o)
          })
          return [...byMes.values()].sort((a,b) => a.mes.localeCompare(b.mes))
        }

        // -- Nivel 1: nodos raíz (CEO + Mónica) --
        const ventasSparkRoot = consolidatedSpark(ventasSerie.data,
          r => r.ventas_pesos_real, r => r.ventas_pesos_ppto
        ).map(p => ({ mes: p.mes, real: div1M(p.real), ppto: div1M(p.ppto) }))

        const escrSparkRoot = consolidatedSpark(escrSerie.data,
          r => r.escr_pesos_real, r => r.escr_pesos_ppto
        ).map(p => ({ mes: p.mes, real: div1M(p.real), ppto: div1M(p.ppto) }))

        const tramitesSparkRoot = consolidatedSpark(tramitesSerie.data,
          r => r.cumplidos, r => r.programados
        )

        const carteraPreSparkRoot = consolidatedSpark(carteraSerie.data,
          r => r.pre_recaudado, r => r.pre_programado
        ).map(p => ({ mes: p.mes, real: div1M(p.real), ppto: div1M(p.ppto) }))

        const carteraPostSparkRoot = consolidatedSpark(carteraSerie.data,
          r => r.post_recaudado, r => r.post_programado
        ).map(p => ({ mes: p.mes, real: div1M(p.real), ppto: div1M(p.ppto) }))

        // ============ Card 1: Ventas YTD (CEO) ============
        const ventasPptoMM = div1M(ceoCons.data?.ventas_pesos_ppto)
        const ventasRealMM = div1M(ceoCons.data?.ventas_pesos_real)
        const cardVentas = {
          id: 'ceo-ventas',
          title: 'Ventas YTD',
          owner: CEO_NAME,
          currentValue: ventasRealMM,
          targetValue: ventasPptoMM,
          format: 'currency',
          rules: ruleForCurrency(ventasPptoMM),
          childrenAggregationType: 'sum',
          history: ventasSparkRoot.map(p => ({ period: monthLabel(p.mes), target: p.ppto, actual: p.real })),
          _meta: {
            pptoRaw: Number(ceoCons.data?.ventas_pesos_ppto || 0),
            realRaw: Number(ceoCons.data?.ventas_pesos_real || 0),
            unidadLabel: 'MM$',
            unitsPpto: Number(ceoCons.data?.ventas_un_ppto || 0),
            unitsReal: Number(ceoCons.data?.ventas_un_real || 0),
            pctCumplimiento: ceoCons.data?.ventas_cumplimiento_pesos != null ? Number(ceoCons.data.ventas_cumplimiento_pesos) * 100 : null,
          },
          children: groupByMacro(
            ventasYtd.data.map(row => projectLeaf('ventas', 'p', row, 'currency', {
              ppto: div1M(row.ventas_pesos_ppto),
              real: div1M(row.ventas_pesos_real),
              includeUn: true,
              unidadLabel: 'MM$',
              sparkData: (ventasSerieMap.get(row.proyecto_ppto) || [])
                .map(s => ({ mes: s.mes, real: div1M(s.ventas_pesos_real), ppto: div1M(s.ventas_pesos_ppto) }))
            })).filter(c => c.targetValue > 0 || c.currentValue > 0),
            'ventas', 'currency', '', 'MM$'
          ),
        }

        // ============ Card 2: Escrituración YTD (CEO) ============
        const escrPptoMM = div1M(ceoCons.data?.escr_pesos_ppto)
        const escrRealMM = div1M(ceoCons.data?.escr_pesos_real)
        const cardEscr = {
          id: 'ceo-escrituracion',
          title: 'Escrituración YTD',
          owner: CEO_NAME,
          currentValue: escrRealMM,
          targetValue: escrPptoMM,
          format: 'currency',
          rules: ruleForCurrency(escrPptoMM),
          childrenAggregationType: 'sum',
          history: escrSparkRoot.map(p => ({ period: monthLabel(p.mes), target: p.ppto, actual: p.real })),
          _meta: {
            pptoRaw: Number(ceoCons.data?.escr_pesos_ppto || 0),
            realRaw: Number(ceoCons.data?.escr_pesos_real || 0),
            unidadLabel: 'MM$',
            unitsPpto: Number(ceoCons.data?.escr_un_ppto || 0),
            unitsReal: Number(ceoCons.data?.escr_un_real || 0),
            pctCumplimiento: ceoCons.data?.escr_cumplimiento_pesos != null ? Number(ceoCons.data.escr_cumplimiento_pesos) * 100 : null,
          },
          children: groupByMacro(
            escrYtd.data.map(row => projectLeaf('escr', 'p', row, 'currency', {
              ppto: div1M(row.escr_pesos_ppto),
              real: div1M(row.escr_pesos_real),
              includeUn: true,
              unidadLabel: 'MM$',
              sparkData: (escrSerieMap.get(row.proyecto_ppto) || [])
                .map(s => ({ mes: s.mes, real: div1M(s.escr_pesos_real), ppto: div1M(s.escr_pesos_ppto) }))
            })).filter(c => c.targetValue > 0 || c.currentValue > 0),
            'escr', 'currency', '', 'MM$'
          ),
        }

        // ============ Card 3: Trámites YTD (Mónica) ============
        const tramPct = monicaCons.data?.tramites_cumplimiento != null
          ? Math.round(Number(monicaCons.data.tramites_cumplimiento) * 1000) / 10
          : 0
        const cardTram = {
          id: 'monica-tramites',
          title: 'Trámites Cumplidos / Programados',
          owner: MONICA_NAME,
          currentValue: tramPct,
          targetValue: 100,
          format: 'percentage',
          rules: { ...rulePercentage },
          childrenAggregationType: 'none',
          history: tramitesSparkRoot.map(p => ({
            period: monthLabel(p.mes),
            target: 100,
            actual: p.ppto && p.ppto > 0 ? Math.round((p.real / p.ppto * 100) * 10) / 10 : 0,
          })),
          _meta: {
            cumplidosTotal: Number(monicaCons.data?.tramites_cumplidos || 0),
            programadosTotal: Number(monicaCons.data?.tramites_programados || 0),
            unidadLabel: 'trámites',
          },
          children: groupByMacro(
            tramitesYtd.data
              .map(row => projectLeaf('tram', 'p', row, 'percentage', {
                ppto: Number(row.programados),
                real: Number(row.cumplidos),
                unidadLabel: 'trámites',
                sparkData: (tramitesSerieMap.get(row.proyecto_ppto) || [])
                  .map(s => ({ mes: s.mes, real: Number(s.cumplidos), ppto: Number(s.programados) }))
              }))
              .filter(c => c.targetValue > 0 || c.currentValue > 0),
            'tram', 'percentage', MONICA_NAME, 'trámites'
          ),
        }

        // ============ Card 4: Cartera Pre-escritura (Mónica) ============
        const carteraPrePptoMM = div1M(monicaCons.data?.cartera_pre_programado)
        const carteraPreRealMM = div1M(monicaCons.data?.cartera_pre_recaudado)
        const cardCarteraPre = {
          id: 'monica-cartera-pre',
          title: 'Cartera Pre-escritura',
          owner: MONICA_NAME,
          currentValue: carteraPreRealMM,
          targetValue: carteraPrePptoMM,
          format: 'currency',
          rules: ruleForCurrency(carteraPrePptoMM),
          childrenAggregationType: 'sum',
          history: carteraPreSparkRoot.map(p => ({ period: monthLabel(p.mes), target: p.ppto, actual: p.real })),
          _meta: {
            pptoRaw: Number(monicaCons.data?.cartera_pre_programado || 0),
            realRaw: Number(monicaCons.data?.cartera_pre_recaudado || 0),
            unidadLabel: 'MM$',
            descripcion: 'Cuota inicial pactada vs recaudada (idgrupoconceptopp = 1)',
            pctCumplimiento: monicaCons.data?.cartera_pre_cumplimiento != null ? Number(monicaCons.data.cartera_pre_cumplimiento) * 100 : null,
          },
          children: groupByMacro(
            carteraYtd.data.map(row => projectLeaf('carpre', 'p', row, 'currency', {
              ppto: div1M(row.pre_programado),
              real: div1M(row.pre_recaudado),
              unidadLabel: 'MM$',
              sparkData: (carteraSerieMap.get(row.proyecto_ppto) || [])
                .map(s => ({ mes: s.mes, real: div1M(s.pre_recaudado), ppto: div1M(s.pre_programado) }))
            })).filter(c => c.targetValue > 0 || c.currentValue > 0),
            'carpre', 'currency', MONICA_NAME, 'MM$'
          ),
        }

        // ============ Card 5: Cartera Post-escritura (Mónica) ============
        const carteraPostPptoMM = div1M(monicaCons.data?.cartera_post_programado)
        const carteraPostRealMM = div1M(monicaCons.data?.cartera_post_recaudado)
        const cardCarteraPost = {
          id: 'monica-cartera-post',
          title: 'Cartera Post-escritura',
          owner: MONICA_NAME,
          currentValue: carteraPostRealMM,
          targetValue: carteraPostPptoMM,
          format: 'currency',
          rules: ruleForCurrency(carteraPostPptoMM),
          childrenAggregationType: 'sum',
          history: carteraPostSparkRoot.map(p => ({ period: monthLabel(p.mes), target: p.ppto, actual: p.real })),
          _meta: {
            pptoRaw: Number(monicaCons.data?.cartera_post_programado || 0),
            realRaw: Number(monicaCons.data?.cartera_post_recaudado || 0),
            unidadLabel: 'MM$',
            descripcion: 'Crédito + subsidio pactado vs recaudado (idgrupoconceptopp ∈ {2,3,6})',
            pctCumplimiento: monicaCons.data?.cartera_post_cumplimiento != null ? Number(monicaCons.data.cartera_post_cumplimiento) * 100 : null,
          },
          children: groupByMacro(
            carteraYtd.data.map(row => projectLeaf('carpost', 'p', row, 'currency', {
              ppto: div1M(row.post_programado),
              real: div1M(row.post_recaudado),
              unidadLabel: 'MM$',
              sparkData: (carteraSerieMap.get(row.proyecto_ppto) || [])
                .map(s => ({ mes: s.mes, real: div1M(s.post_recaudado), ppto: div1M(s.post_programado) }))
            })).filter(c => c.targetValue > 0 || c.currentValue > 0),
            'carpost', 'currency', MONICA_NAME, 'MM$'
          ),
        }

        // Aplicar status (semáforo) a todos los nodos
        const applyStatus = (node) => {
          node.status = node.currentValue == null ? 'gray' : evalStatus(node.currentValue, node.rules)
          if (node.children) node.children = node.children.map(applyStatus)
          return node
        }

        // Ventas: CEO (1) → Mónica (2) → Luisa Dir. Ventas (3) → Director de Sala por proyecto (4)
        cardVentas.level = [1, 2, 3]
        cardVentas.levelOwners = { 1: CEO_NAME, 2: MONICA_NAME, 3: 'Luisa Moreno' }
        // En nivel 3, cardVentas aparece bajo la expansión del nodo ceo-ventas (nivel 2)
        cardVentas.cascadeParentIds = { 3: 'ceo-ventas' }
        cardVentas.onExport = async () => {
          const { data: rows } = await supabaseIc.from('kpi_ventas_ytd_proyecto').select('*')
          downloadCsv(`ventas_ytd_${new Date().toISOString().slice(0, 7)}.csv`, rows || [])
        }

        cardEscr.level = [1, 2]
        cardEscr.levelOwners = { 1: CEO_NAME, 2: MONICA_NAME }
        cardEscr.onExport = async () => {
          const { data: rows } = await supabaseIc.from('kpi_escrituracion_ytd_proyecto').select('*')
          downloadCsv(`escrituracion_ytd_${new Date().toISOString().slice(0, 7)}.csv`, rows || [])
        }

        // Trámites: Mónica (2) → Luisa Dir. Ventas (3) [bajo expansión de Ventas]
        cardTram.level = [2, 3]
        cardTram.levelOwners = { 2: MONICA_NAME, 3: 'Luisa Moreno' }
        // En nivel 3, cardTram (Luisa) aparece bajo la expansión de Ventas (junto con Luisa Ventas)
        cardTram.cascadeParentIds = { 3: 'ceo-ventas' }
        cardTram.onExport = async () => {
          const { data: rows } = await supabaseIc.from('kpi_tramites_ytd_proyecto').select('*')
          downloadCsv(`tramites_ytd_${new Date().toISOString().slice(0, 7)}.csv`, rows || [])
        }

        cardCarteraPre.level = 2
        cardCarteraPre.onExport = async () => {
          const { data: rows } = await supabaseIc.from('kpi_cartera_ytd_proyecto').select('proyecto_ppto,pre_programado,pre_recaudado')
          downloadCsv(`cartera_pre_ytd_${new Date().toISOString().slice(0, 7)}.csv`, rows || [])
        }

        cardCarteraPost.level = 2
        cardCarteraPost.onExport = async () => {
          const { data: rows } = await supabaseIc.from('kpi_cartera_ytd_proyecto').select('proyecto_ppto,post_programado,post_recaudado')
          downloadCsv(`cartera_post_ytd_${new Date().toISOString().slice(0, 7)}.csv`, rows || [])
        }

        // Mapeo macroproyecto → Director de Sala (IC vende directamente)
        // Gaia se excluye del cascade (broker externo Claudia Jaramillo) pero
        // permanece en .children de Ventas y Trámites para el modal / promedio ponderado.
        // Proyectos sin venta IC (Mitika, Azul, Well, Verde Vivo) no aparecen en el YTD.
        const DIRECTOR_SALA = {
          'Praia Natura':      'Catalina Herrera',
          'Primera Este':      'Jeimy Pineda',
          'Castilla Imperial': 'Carlos Ernesto Maldonado',
          'Castilla Living':   'Carlos Ernesto Maldonado',
          'Reserva De Oporto': 'Juan Carlos Gil',
          'La Hacienda':       '(Sin jefe de sala)',
          'Bosque Central':    '(Vacante)',
        }

        const toSalaNode = (prefix, macroNode, cascadeParentId) => ({
          ...macroNode,
          id:    `${prefix}-${macroNode.id}`,
          owner: DIRECTOR_SALA[macroNode.title] ?? 'Por definir',
          level: 4,
          cascadeParentId,
        })

        // Nivel 4 Ventas: excluye Gaia (permanece en modal para promedio ponderado)
        const dirSalaVentasNodes = cardVentas.children
          .filter(n => n.title !== 'Gaia')
          .map(n => toSalaNode('dir-vta', n, 'ceo-ventas'))

        // Nivel 4 Trámites: mismo patrón, excluye Gaia
        const dirSalaTramNodes = cardTram.children
          .filter(n => n.title !== 'Gaia')
          .map(n => toSalaNode('dir-tram', n, 'monica-tramites'))

        const built = [
          cardVentas, cardEscr, cardTram, cardCarteraPre, cardCarteraPost,
          ...dirSalaVentasNodes,
          ...dirSalaTramNodes,
        ].map(applyStatus)

        if (alive) {
          setTree(built)
          setLoading(false)
        }
      } catch (e) {
        console.error('useKpis error:', e)
        if (alive) {
          setError(e)
          setLoading(false)
        }
      }
    })()
    return () => { alive = false }
  }, [scope])

  return { tree, loading, error, isConfigured: isIcConfigured }
}

const evalStatus = (value, rules) => {
  if (!rules) return 'success'
  const v = Number(value) || 0
  if (rules.type === 'higher_is_better') {
    if (v >= rules.green) return 'success'
    if (v >= rules.yellow) return 'warning'
    return 'danger'
  }
  if (v <= rules.green) return 'success'
  if (v <= rules.yellow) return 'warning'
  return 'danger'
}
