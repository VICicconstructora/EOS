// src/lib/useKpiProyectos.js
// Calcula KPIs de Utilidad y TIR por proyecto desde los flujos de
// aportes/reintegros IC en el histórico.
//
// Jerarquía (cascade):
//   Nivel 1+2 CEO / Gerente Desarrollo (Vacante)
//   Nivel 3    Director de Proyecto (Alida | Jhon Manosalva | Diego Benavides)
//   Nivel 4    Coordinador (Juan David | Belén | Luciana) o proyecto directo
//   Nivel 5    Macro-proyecto (bajo coordinador)
//
// Ponderación en agregados: por capital invertido (total aporte_ic).

import { useEffect, useState } from 'react'
import { supabaseIc, isIcConfigured } from './supabaseIc'

const CEO_NAME          = 'Juan Paulo McAllister'
const GERENTE_DESARROLLO = 'Gerente Desarrollo (Vacante)'

// ─────────────────────────────────────────────────────────────────────────────
// IRR mensual por Newton-Raphson → anualizado
// ─────────────────────────────────────────────────────────────────────────────
function calcMonthlyIRR(cashFlows) {
  if (!cashFlows || cashFlows.length < 2) return null
  if (!cashFlows.some(v => v < 0) || !cashFlows.some(v => v > 0)) return null

  let rate = 0.01
  for (let i = 0; i < 300; i++) {
    let npv = 0, dnpv = 0
    cashFlows.forEach((cf, t) => {
      const f = Math.pow(1 + rate, t)
      npv  += cf / f
      dnpv -= t * cf / (f * (1 + rate))
    })
    if (Math.abs(dnpv) < 1e-12) break
    const next = rate - npv / dnpv
    if (!isFinite(next) || next < -0.999 || next > 100) return null
    if (Math.abs(next - rate) < 1e-9) return next
    rate = next
  }
  return null
}

const tirAnualizado = (cashFlows) => {
  const r = calcMonthlyIRR(cashFlows)
  if (r === null) return null
  return Math.round((Math.pow(1 + r, 12) - 1) * 10000) / 100  // % con 2 dec
}

// ─────────────────────────────────────────────────────────────────────────────
// Construye serie mensual densa (rellena meses sin flujo con 0)
// ─────────────────────────────────────────────────────────────────────────────
const buildSeries = (flowMap) => {
  if (!flowMap || flowMap.size === 0) return []
  const keys = [...flowMap.keys()].sort()
  const [y0, m0] = keys[0].split('-').map(Number)
  const [y1, m1] = keys[keys.length - 1].split('-').map(Number)
  const result = []
  let y = y0, m = m0
  while (y < y1 || (y === y1 && m <= m1)) {
    result.push(flowMap.get(`${y}-${String(m).padStart(2, '0')}`) || 0)
    if (++m > 12) { m = 1; y++ }
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Normaliza nombres del histórico → macro-proyecto
// ─────────────────────────────────────────────────────────────────────────────
const macroFromHistorico = (name) => {
  if (!name) return name
  let n = name.trim().replace(/\s+/g, ' ')
  if (n.toUpperCase() === 'WELL') return 'Well'
  const patterns = [
    /\s+(Vivienda|Comercio|Institucional)$/i,
    /\s+\d+\.\d+(T\d+)?$/i,
    /\s+E\s*\d+(\s*-\s*\d+)?$/i,
    /\s+\d+[A-Z]$/,
    /\s+P$/,
  ]
  for (const re of patterns) {
    if (re.test(n)) { n = n.replace(re, '').trim(); break }
  }
  return n
}

// ─────────────────────────────────────────────────────────────────────────────
// Config: Director de Proyecto + Coordinador por macro-proyecto
// Confirmado 2026-05-25 — todos pertenecen a Gerencia de Desarrollo
// ─────────────────────────────────────────────────────────────────────────────
const EQUIPO = {
  'Azul Celeste':       { director: 'Diego Benavides', coordinador: null },
  'Azul Turquesa':      { director: 'Diego Benavides', coordinador: null },
  'Bosque Central':     { director: 'Jhon Manosalva',  coordinador: 'Belén' },
  'Castilla Imperial':  { director: 'Alida',           coordinador: 'Juan David' },
  'Castilla Living':    { director: 'Alida',           coordinador: 'Juan David' },
  'Gaia':               { director: 'Alida',           coordinador: 'Luciana' },
  'La Hacienda':        { director: 'Jhon Manosalva',  coordinador: 'Belén' },
  'Mitika':             { director: 'Diego Benavides', coordinador: null },
  'Praia':              { director: 'Alida',           coordinador: 'Juan David' },
  'Primera Este':       { director: 'Jhon Manosalva',  coordinador: 'Belén' },
  'Reserva De Oporto':  { director: 'Jhon Manosalva',  coordinador: 'Luciana' },
  'Verde Vivo':         { director: 'Diego Benavides', coordinador: null },
  'Well':               { director: 'Diego Benavides', coordinador: null },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-')
const div1M = (v) => Math.round(((Number(v) || 0) / 1e6) * 10) / 10

const mergeFlowMap = (dest, src) => {
  for (const [k, v] of src) dest.set(k, (dest.get(k) || 0) + v)
}

const evalStatus = (value, rules) => {
  if (value == null) return 'gray'
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

// ─────────────────────────────────────────────────────────────────────────────
// Construye un nodo de la jerarquía
// ─────────────────────────────────────────────────────────────────────────────
const makeNode = ({
  id, title, owner, level,
  cascadeParentId, cascadeParentIds, levelOwners, cascadeOwner,
  flowMap, totalAporte, totalReintegro, kpiType,
}) => {
  const utilidadMM = div1M(totalReintegro - totalAporte)
  const series     = buildSeries(flowMap)
  const tir        = tirAnualizado(series)
  const isTIR      = kpiType === 'tir'

  const currentValue = isTIR ? tir : utilidadMM

  // Utilidad: verde si positiva, amarilla si pérdida < 5% del aporte, roja si >5%
  const aporteMM = Math.abs(div1M(totalAporte)) || 1
  const rulesUtilidad = {
    type: 'higher_is_better',
    green:  0,
    yellow: -(aporteMM * 0.05),
  }
  // TIR: verde ≥ 20%, amarilla ≥ 12%, roja < 12%
  const rulesTIR = { type: 'higher_is_better', green: 20, yellow: 12 }
  const rules = isTIR ? rulesTIR : rulesUtilidad

  return {
    id,
    title,
    owner,
    level,
    cascadeParentId,
    cascadeParentIds,
    levelOwners,
    cascadeOwner,
    currentValue,
    targetValue: isTIR ? 20 : 0,
    format:      isTIR ? 'percentage' : 'currency',
    rules,
    status: evalStatus(currentValue, rules),
    childrenAggregationType: 'none',
    children: [],
    history: [],
    _meta: {
      pptoRaw:          0,
      realRaw:          currentValue,
      unidadLabel:      isTIR ? '%' : 'MM$',
      utilidadMM,
      tirPct:           tir,
      totalAporteMM:    div1M(totalAporte),
      totalReintegroMM: div1M(totalReintegro),
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────────────────────
export function useKpiProyectos() {
  const [nodes, setNodes] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isIcConfigured) {
      setError(new Error('Supabase IC no configurado'))
      return
    }
    let alive = true
    ;(async () => {
      try {
        const { data, error: qErr } = await supabaseIc
          .from('kpi_flujo_ic_mensual')
          .select('proyecto, fecha, aporte_ic, reintegro_ic')
          .limit(50000)
        if (qErr) throw qErr
        if (!alive) return

        // ── 1. Agregar por macro-proyecto ──────────────────────────────────
        const macroMap = new Map()
        // macroMap: macro → { flowMap, totalAporte, totalReintegro }

        data.forEach(row => {
          const macro = macroFromHistorico(row.proyecto)
          if (!macroMap.has(macro)) {
            macroMap.set(macro, { flowMap: new Map(), totalAporte: 0, totalReintegro: 0 })
          }
          const m  = macroMap.get(macro)
          const ym = row.fecha.slice(0, 7)
          const netCF = Number(row.reintegro_ic) - Number(row.aporte_ic)
          m.flowMap.set(ym, (m.flowMap.get(ym) || 0) + netCF)
          m.totalAporte    += Number(row.aporte_ic)
          m.totalReintegro += Number(row.reintegro_ic)
        })

        // ── 2. Agregar por director y coordinador ─────────────────────────
        // dirMap: director → { flowMap, totalAporte, totalReintegro,
        //                      coordMap: coord → same + projects,
        //                      directProjects: macro → same }
        const dirMap = new Map()

        for (const [macro, m] of macroMap) {
          const { director, coordinador } = EQUIPO[macro] || { director: 'Por Asignar', coordinador: null }

          if (!dirMap.has(director)) {
            dirMap.set(director, {
              flowMap: new Map(), totalAporte: 0, totalReintegro: 0,
              coordMap: new Map(),
              directProjects: new Map(),
            })
          }
          const d = dirMap.get(director)
          mergeFlowMap(d.flowMap, m.flowMap)
          d.totalAporte    += m.totalAporte
          d.totalReintegro += m.totalReintegro

          if (coordinador) {
            if (!d.coordMap.has(coordinador)) {
              d.coordMap.set(coordinador, {
                flowMap: new Map(), totalAporte: 0, totalReintegro: 0,
                projects: new Map(),
              })
            }
            const c = d.coordMap.get(coordinador)
            mergeFlowMap(c.flowMap, m.flowMap)
            c.totalAporte    += m.totalAporte
            c.totalReintegro += m.totalReintegro
            c.projects.set(macro, m)
          } else {
            d.directProjects.set(macro, m)
          }
        }

        // ── 3. Portfolio (CEO) ─────────────────────────────────────────────
        const portfolioFlowMap = new Map()
        let portfolioAporte = 0, portfolioReintegro = 0
        for (const [, m] of macroMap) {
          mergeFlowMap(portfolioFlowMap, m.flowMap)
          portfolioAporte    += m.totalAporte
          portfolioReintegro += m.totalReintegro
        }

        // ── 4. Construir nodos para Utilidad y TIR ─────────────────────────
        const allNodes = []

        for (const kpiType of ['utilidad', 'tir']) {
          const px    = kpiType === 'utilidad' ? 'util' : 'tir'
          const title = kpiType === 'utilidad' ? 'Utilidad Proyectos' : 'TIR Proyectos'
          const ceoId = `ceo-${px}`

          // Nivel 1 + 2: CEO / Gerente Desarrollo
          allNodes.push(makeNode({
            id:          ceoId,
            title,
            owner:       CEO_NAME,
            level:       [1, 2],
            levelOwners: { 1: CEO_NAME, 2: GERENTE_DESARROLLO },
            cascadeOwner: GERENTE_DESARROLLO,
            flowMap:         portfolioFlowMap,
            totalAporte:     portfolioAporte,
            totalReintegro:  portfolioReintegro,
            kpiType,
          }))

          // Nivel 3: Directores
          for (const [director, d] of dirMap) {
            const dirId = `${px}-dir-${slug(director)}`

            allNodes.push(makeNode({
              id:             dirId,
              title,
              owner:          director,
              level:          3,
              cascadeParentId: ceoId,
              flowMap:         d.flowMap,
              totalAporte:     d.totalAporte,
              totalReintegro:  d.totalReintegro,
              kpiType,
            }))

            // Nivel 4: Coordinadores (directores con coordinador)
            for (const [coord, c] of d.coordMap) {
              const coordId = `${px}-coord-${slug(director)}-${slug(coord)}`

              allNodes.push(makeNode({
                id:             coordId,
                title,
                owner:          coord,
                level:          4,
                cascadeParentId: dirId,
                flowMap:         c.flowMap,
                totalAporte:     c.totalAporte,
                totalReintegro:  c.totalReintegro,
                kpiType,
              }))

              // Nivel 5: Proyectos bajo coordinador
              for (const [macro, m] of c.projects) {
                allNodes.push(makeNode({
                  id:             `${px}-proj-${slug(macro)}-${slug(coord)}`,
                  title:          macro,
                  owner:          coord,
                  level:          5,
                  cascadeParentId: coordId,
                  flowMap:         m.flowMap,
                  totalAporte:     m.totalAporte,
                  totalReintegro:  m.totalReintegro,
                  kpiType,
                }))
              }
            }

            // Nivel 4: Proyectos directos (Diego — sin coordinador)
            for (const [macro, m] of d.directProjects) {
              allNodes.push(makeNode({
                id:             `${px}-proj-${slug(macro)}`,
                title:          macro,
                owner:          director,
                level:          4,
                cascadeParentId: dirId,
                flowMap:         m.flowMap,
                totalAporte:     m.totalAporte,
                totalReintegro:  m.totalReintegro,
                kpiType,
              }))
            }
          }
        }

        if (alive) setNodes(allNodes)
      } catch (e) {
        console.error('useKpiProyectos error:', e)
        if (alive) setError(e)
      }
    })()
    return () => { alive = false }
  }, [])

  return { nodes, error }
}
