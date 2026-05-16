// src/lib/useProgramacionObra.js
// Hook que carga el KPI de Programación de Obra YTD desde Supabase IC y lo devuelve
// como árbol compatible con la estructura que espera KpiCard / KpiRow.
//
// Estructura del árbol (2 nodos):
//   Nodo CEO   (ceo-prog-obra)   — Juan Paulo McAllister  → child: Andrés
//   Nodo Andrés (andres-prog-obra) — Andrés Arango        → children: por proyecto (agrupados por macroproyecto)
//
// Convención de valores:
//   - ppto / real en MM$ (millones de pesos colombianos), directamente desde la vista
//   - currentValue = % de cumplimiento (0-100)
//   - targetValue  = 100
//   - Verde ≥ 90 %, Amarillo ≥ 70 %, Rojo < 70 %

import { useEffect, useState } from 'react'
import { supabaseIc, isIcConfigured } from './supabaseIc'
import { downloadCsv } from '../utils/exportCsv'

const CEO_NAME    = 'Juan Paulo McAllister'
const ANDRES_NAME = 'Andrés Arango'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const monthLabel = (isoDate) => {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  return MONTHS[d.getUTCMonth()]
}

const RULES = { type: 'higher_is_better', green: 90, yellow: 70 }

// ──────────────────────────────────────────────────────────────────────────────
// Evaluación de semáforo
// ──────────────────────────────────────────────────────────────────────────────
const evalStatus = (value, rules) => {
  if (value == null) return 'gray'
  if (!rules) return 'success'
  const v = Number(value) || 0
  if (rules.type === 'higher_is_better') {
    if (v >= rules.green)  return 'success'
    if (v >= rules.yellow) return 'warning'
    return 'danger'
  }
  if (v <= rules.green)  return 'success'
  if (v <= rules.yellow) return 'warning'
  return 'danger'
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-')

const pct = (real, ppto) =>
  ppto && ppto > 0 ? Math.round((real / ppto) * 1000) / 10 : 0  // 1 decimal

// Agrega series mensuales de % de cumplimiento a partir de las series brutas
// de un proyecto: { mes, obra_ppto, obra_real }[]  →  history[]
const buildProjectHistory = (serieRows) =>
  [...serieRows]
    .sort((a, b) => String(a.mes).localeCompare(String(b.mes)))
    .map(r => ({
      period: monthLabel(r.mes),
      target: 100,
      actual: pct(Number(r.obra_real) || 0, Number(r.obra_ppto) || 0),
    }))

// Consolida la serie mensual de múltiples proyectos sumando ppto/real y luego
// convirtiendo a %
const consolidateSerie = (rows) => {
  const byMes = new Map()
  rows.forEach(r => {
    const k = String(r.mes)
    const o = byMes.get(k) || { mes: k, ppto: 0, real: 0 }
    o.ppto += Number(r.obra_ppto) || 0
    o.real += Number(r.obra_real) || 0
    byMes.set(k, o)
  })
  return [...byMes.values()]
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map(o => ({
      period: monthLabel(o.mes),
      target: 100,
      actual: pct(o.real, o.ppto),
    }))
}

// ──────────────────────────────────────────────────────────────────────────────
// Macroproyecto: misma lógica que useKpis.js
// ──────────────────────────────────────────────────────────────────────────────
const SUFFIX_PATTERNS = [
  /\s+E\s*\d+(\s*-\s*\d+)?$/i,
  /\s+\d+[A-Z]$/,
  /\s+P$/,
  /\s+Vivienda$/i,
]
const macroProyectoOf = (name) => {
  if (!name) return name
  for (const re of SUFFIX_PATTERNS) {
    if (re.test(name)) return name.replace(re, '').trim()
  }
  return name
}

// Construye un nodo "hoja" para un proyecto individual
const buildProjectLeaf = (row, serieRows) => {
  const pptoRaw = Number(row.obra_ppto) || 0
  const realRaw = Number(row.obra_real) || 0
  const cumpl   = pct(realRaw, pptoRaw)
  return {
    id:           `andres-prog-obra-${slug(row.proyecto_ppto)}`,
    title:        row.proyecto_ppto,
    owner:        row.fuente_real || ANDRES_NAME,
    currentValue: cumpl,
    targetValue:  100,
    format:       'percentage',
    rules:        { ...RULES },
    status:       evalStatus(cumpl, RULES),
    history:      buildProjectHistory(serieRows),
    level:        3,
    children:     [],
    childrenAggregationType: 'none',
    _meta: {
      pptoRaw,
      realRaw,
      unidadLabel:     'MM$ obra',
      pctCumplimiento: cumpl,
    },
  }
}

// Construye un nodo macroproyecto a partir de sus hojas
const buildMacroNode = (macroName, leafs) => {
  if (leafs.length === 1 && leafs[0].title === macroName) return leafs[0]

  const sumPpto = leafs.reduce((a, l) => a + (Number(l._meta?.pptoRaw) || 0), 0)
  const sumReal = leafs.reduce((a, l) => a + (Number(l._meta?.realRaw) || 0), 0)
  const cumpl   = pct(sumReal, sumPpto)

  // Historia consolidada: promedio simple de % (ya que history de hojas viene en %)
  const byPeriod = new Map()
  leafs.forEach(l => {
    (l.history || []).forEach(p => {
      const o = byPeriod.get(p.period) || { period: p.period, sum: 0, n: 0 }
      o.sum += Number(p.actual) || 0
      o.n   += 1
      byPeriod.set(p.period, o)
    })
  })
  const history = [...byPeriod.values()].map(o => ({
    period: o.period,
    target: 100,
    actual: o.n > 0 ? Math.round((o.sum / o.n) * 10) / 10 : 0,
  }))

  return {
    id:           `andres-prog-obra-macro-${slug(macroName)}`,
    title:        macroName,
    owner:        ANDRES_NAME,
    currentValue: cumpl,
    targetValue:  100,
    format:       'percentage',
    rules:        { ...RULES },
    status:       evalStatus(cumpl, RULES),
    history,
    level:        3,
    children:     leafs,
    childrenAggregationType: 'none',
    _meta: {
      pptoRaw:         sumPpto,
      realRaw:         sumReal,
      unidadLabel:     'MM$ obra',
      pctCumplimiento: cumpl,
    },
  }
}

// Agrupa hojas por macroproyecto y devuelve nodos macro ordenados desc por valor
const groupByMacro = (leafs) => {
  const groups = new Map()
  leafs.forEach(leaf => {
    const macro = macroProyectoOf(leaf.title)
    if (!groups.has(macro)) groups.set(macro, [])
    groups.get(macro).push(leaf)
  })
  const macroNodes = []
  for (const [macro, ls] of groups) {
    const node = buildMacroNode(macro, ls)
    if (node) macroNodes.push(node)
  }
  macroNodes.sort((a, b) => (Number(b.currentValue) || 0) - (Number(a.currentValue) || 0))
  return macroNodes
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook principal
// ──────────────────────────────────────────────────────────────────────────────
export function useProgramacionObra() {
  const [nodes, setNodes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

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

        const [ytdRes, serieRes] = await Promise.all([
          supabaseIc
            .from('kpi_programacion_obra_ytd_proyecto')
            .select('proyecto_ppto, obra_ppto, obra_real, fuente_real'),
          supabaseIc
            .from('kpi_programacion_obra_serie_mensual')
            .select('proyecto_ppto, mes, obra_ppto, obra_real'),
        ])

        if (ytdRes.error)   throw ytdRes.error
        if (serieRes.error) throw serieRes.error

        if (!alive) return

        const ytdRows   = ytdRes.data   || []
        const serieRows = serieRes.data || []

        // Índice de series por proyecto
        const serieByProj = new Map()
        serieRows.forEach(r => {
          if (!serieByProj.has(r.proyecto_ppto)) serieByProj.set(r.proyecto_ppto, [])
          serieByProj.get(r.proyecto_ppto).push(r)
        })

        // Totales globales
        const pptoTotal = ytdRows.reduce((a, r) => a + (Number(r.obra_ppto) || 0), 0)
        const realTotal = ytdRows.reduce((a, r) => a + (Number(r.obra_real) || 0), 0)
        const cumplTotal = pct(realTotal, pptoTotal)

        // Historia consolidada global
        const historyRoot = consolidateSerie(serieRows)

        // Hojas por proyecto
        const leafs = ytdRows
          .map(row => buildProjectLeaf(row, serieByProj.get(row.proyecto_ppto) || []))
          .filter(l => l._meta.pptoRaw > 0 || l._meta.realRaw > 0)

        // Nodos macro aplanados (level 3) con cascadeParentId para KpiLevelRows
        const macroNodes = groupByMacro(leafs).map(n => ({
          ...n,
          level: 3,
          cascadeParentId: 'andres-prog-obra',
        }))

        // Nodo Andrés (level 2)
        const nodeAndres = {
          id:           'andres-prog-obra',
          title:        'Prog. de Obra YTD',
          owner:        ANDRES_NAME,
          currentValue: cumplTotal,
          targetValue:  100,
          format:       'percentage',
          rules:        { ...RULES },
          status:       evalStatus(cumplTotal, RULES),
          history:      historyRoot,
          level:        2,
          children:     macroNodes,
          childrenAggregationType: 'none',
          _meta: {
            pptoRaw:         pptoTotal,
            realRaw:         realTotal,
            unidadLabel:     'MM$ obra',
            pctCumplimiento: cumplTotal,
          },
        }

        // Nodo CEO (level 1)
        const nodeCeo = {
          id:           'ceo-prog-obra',
          title:        'Prog. de Obra YTD',
          owner:        CEO_NAME,
          currentValue: cumplTotal,
          targetValue:  100,
          format:       'percentage',
          rules:        { ...RULES },
          status:       evalStatus(cumplTotal, RULES),
          history:      historyRoot,
          level:        1,
          children:     [nodeAndres],
          childrenAggregationType: 'none',
          _meta: {
            pptoRaw:         pptoTotal,
            realRaw:         realTotal,
            unidadLabel:     'MM$ obra',
            pctCumplimiento: cumplTotal,
          },
          onExport: async () => {
            const { data: rows } = await supabaseIc
              .from('kpi_programacion_obra_ytd_proyecto')
              .select('proyecto_ppto, obra_ppto, obra_real, fuente_real')
            downloadCsv(`prog_obra_ytd_${new Date().toISOString().slice(0, 7)}.csv`, rows || [])
          },
        }

        if (alive) {
          setNodes([nodeCeo, nodeAndres, ...macroNodes])
          setLoading(false)
        }
      } catch (e) {
        console.error('useProgramacionObra error:', e)
        if (alive) {
          setError(e)
          setLoading(false)
        }
      }
    })()

    return () => { alive = false }
  }, [])

  return { nodes, loading, error, isConfigured: isIcConfigured }
}
