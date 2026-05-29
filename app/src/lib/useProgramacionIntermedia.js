// src/lib/useProgramacionIntermedia.js
// Hook que carga el KPI de Programación Intermedia de Compras desde Supabase IC.
//
// Concepto: de los contratos/compras que debían quedar cerrados desde enero hasta
// hoy según la programación intermedia, ¿qué porcentaje fue efectivamente cerrado?
//   contratos_cerrados_ytd / contratos_programados_ytd × 100
//
// Árbol de nodos:
//   - ceo-prog-intermedia    (Juan Paulo McAllister, level 1)
//       └─ marcela-prog-intermedia (Marcela Arroyave, level 2)
//              └─ por macroproyecto
//                    └─ por proyecto PPTO (hojas)

import { useEffect, useState } from 'react'
import { supabaseIc, isIcConfigured } from './supabaseIc'
import { downloadCsv } from '../utils/exportCsv'

const CEO_NAME = 'Juan Paulo McAllister'
const MARCELA_NAME = 'Marcela Arroyave'
const LAURA_NAME = 'Laura Sofía Angarita González'
const RICARDO_NAME = 'Noel Ricardo Vargas Pedraza'
const JULIAN_NAME = 'Julián David Campos Santa'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const monthLabel = (isoDate) => {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  return MONTHS[d.getUTCMonth()]
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-')

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

// Deriva el macroproyecto desde el nombre PPTO. Ejemplos:
//   "Azul Celeste E2"          → "Azul Celeste"
//   "Castilla Imperial 2B"     → "Castilla Imperial"
//   "Castilla Imperial P"      → "Castilla Imperial"
//   "Bosque Central Vivienda"  → "Bosque Central"
//   "Primera Este E 1-2"       → "Primera Este"
//   "Reserva De Oporto E3"     → "Reserva De Oporto"
//   "Gaia" / "Well"            → sin cambio
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

const KPI_RULES = { type: 'higher_is_better', green: 90, yellow: 70 }

// Asignación provisional proyecto → coordinador. Actualizar según asignación real.
const PROYECTO_COORD = {
  'BOSQUE CENTRAL':      RICARDO_NAME,
  'CASTILLA IMPERIAL':   RICARDO_NAME,
  'PRIMERA ESTE':        RICARDO_NAME,
  'LA HACIENDA JAMUNDI': RICARDO_NAME,
  'GAIA':                JULIAN_NAME,
  'PRAIA NATURA':        JULIAN_NAME,
  'CASTILLA LIVING':     JULIAN_NAME,
  'RESERVA DE OPORTO':   JULIAN_NAME,
}

// Construye un nodo hoja (proyecto PPTO individual)
const buildLeafNode = (row, serieRows) => {
  const programados = Number(row.compras_ppto) || 0
  const cerrados    = Number(row.compras_real) || 0
  const pct = programados > 0 ? Math.round((cerrados / programados) * 1000) / 10 : 0

  const history = (serieRows || [])
    .slice()
    .sort((a, b) => String(a.mes).localeCompare(String(b.mes)))
    .map(s => {
      const sp = Number(s.compras_ppto) || 0
      const sc = Number(s.compras_real) || 0
      const pctMes = sp > 0 ? Math.round((sc / sp) * 1000) / 10 : 0
      return { period: monthLabel(s.mes), target: 100, actual: pctMes }
    })

  return {
    id: `leaf-prog-intermedia-${slug(row.proyecto_ppto)}`,
    title: row.proyecto_ppto,
    owner: MARCELA_NAME,
    currentValue: pct,
    targetValue: 100,
    format: 'percentage',
    rules: { ...KPI_RULES },
    status: evalStatus(pct, KPI_RULES),
    childrenAggregationType: 'none',
    children: [],
    history,
    _meta: {
      programados,
      cerrados,
      unidadLabel: 'contratos',
      pctCumplimiento: pct,
      fuenteReal: row.fuente_real || null,
    },
  }
}

// Agrega hojas de un macroproyecto sumando numerador/denominador (no promediando %)
const buildMacroNode = (macroName, leafs) => {
  if (leafs.length === 1 && leafs[0].title === macroName) return leafs[0]

  const totalProgramados = leafs.reduce((a, l) => a + (l._meta?.programados || 0), 0)
  const totalCerrados    = leafs.reduce((a, l) => a + (l._meta?.cerrados    || 0), 0)
  const pct = totalProgramados > 0
    ? Math.round((totalCerrados / totalProgramados) * 1000) / 10
    : 0

  // Agrega serie mensual sumando num/den por mes
  const byPeriod = new Map()
  leafs.forEach(l => {
    ;(l.history || []).forEach(p => {
      // No podemos reconstruir num/den desde % hoja; usamos promedio simple degradado
      const o = byPeriod.get(p.period) || { period: p.period, sum: 0, n: 0 }
      o.sum += Number(p.actual) || 0
      o.n += 1
      byPeriod.set(p.period, o)
    })
  })
  const history = [...byPeriod.values()].map(o => ({
    period: o.period,
    target: 100,
    actual: o.n > 0 ? Math.round((o.sum / o.n) * 10) / 10 : 0,
  }))

  return {
    id: `macro-prog-intermedia-${slug(macroName)}`,
    title: macroName,
    owner: MARCELA_NAME,
    currentValue: pct,
    targetValue: 100,
    format: 'percentage',
    rules: { ...KPI_RULES },
    status: evalStatus(pct, KPI_RULES),
    childrenAggregationType: 'none',
    children: leafs,
    history,
    _meta: {
      programados: totalProgramados,
      cerrados: totalCerrados,
      unidadLabel: 'contratos',
      pctCumplimiento: pct,
    },
  }
}

// Agrupa hojas por macroproyecto y devuelve nodos macro ordenados desc por currentValue
const groupByMacro = (leafs) => {
  const groups = new Map()
  leafs.forEach(leaf => {
    const macro = macroProyectoOf(leaf.title)
    if (!groups.has(macro)) groups.set(macro, [])
    groups.get(macro).push(leaf)
  })
  const macroNodes = []
  for (const [macro, ls] of groups) {
    macroNodes.push(buildMacroNode(macro, ls))
  }
  macroNodes.sort((a, b) => (Number(b.currentValue) || 0) - (Number(a.currentValue) || 0))
  return macroNodes
}

export function useProgramacionIntermedia() {
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
          supabaseIc.from('kpi_prog_intermedia_ytd_proyecto').select(
            'proyecto_ppto, compras_ppto, compras_real, fuente_real'
          ),
          supabaseIc.from('kpi_prog_intermedia_serie_mensual').select(
            'proyecto_ppto, mes, compras_ppto, compras_real'
          ),
        ])

        if (ytdRes.error)   throw ytdRes.error
        if (serieRes.error) throw serieRes.error

        if (!alive) return

        const ytdRows   = ytdRes.data   || []
        const serieRows = serieRes.data || []

        // Índice serie por proyecto
        const serieByProj = new Map()
        serieRows.forEach(r => {
          if (!serieByProj.has(r.proyecto_ppto)) serieByProj.set(r.proyecto_ppto, [])
          serieByProj.get(r.proyecto_ppto).push(r)
        })

        // Totales globales
        const totalProgramados = ytdRows.reduce((a, r) => a + (Number(r.compras_ppto) || 0), 0)
        const totalCerrados    = ytdRows.reduce((a, r) => a + (Number(r.compras_real) || 0), 0)
        const pctTotal = totalProgramados > 0
          ? Math.round((totalCerrados / totalProgramados) * 1000) / 10
          : 0

        // Serie mensual global (suma de todos los proyectos por mes)
        const serieGlobal = new Map()
        serieRows.forEach(r => {
          const k = String(r.mes)
          const o = serieGlobal.get(k) || { mes: k, programados: 0, cerrados: 0 }
          o.programados += Number(r.compras_ppto) || 0
          o.cerrados    += Number(r.compras_real) || 0
          serieGlobal.set(k, o)
        })
        const historyGlobal = [...serieGlobal.values()]
          .sort((a, b) => a.mes.localeCompare(b.mes))
          .map(p => {
            const pctMes = p.programados > 0
              ? Math.round((p.cerrados / p.programados) * 1000) / 10
              : 0
            return { period: monthLabel(p.mes), target: 100, actual: pctMes }
          })

        // Hojas por proyecto PPTO
        const leafs = ytdRows
          .filter(r => r.proyecto_ppto)
          .map(row => buildLeafNode(row, serieByProj.get(row.proyecto_ppto) || []))

        // Macroproyectos particionados por coordinador según PROYECTO_COORD
        const allMacroNodes = groupByMacro(leafs)

        const ricardoProjects = allMacroNodes.filter(
          n => (PROYECTO_COORD[n.title?.toUpperCase()] ?? RICARDO_NAME) === RICARDO_NAME
        )
        const julianProjects = allMacroNodes.filter(
          n => PROYECTO_COORD[n.title?.toUpperCase()] === JULIAN_NAME
        )

        const coordPct = (projects) => {
          const prog = projects.reduce((a, n) => a + (n._meta?.programados || 0), 0)
          const cerr = projects.reduce((a, n) => a + (n._meta?.cerrados    || 0), 0)
          return prog > 0 ? Math.round((cerr / prog) * 1000) / 10 : 0
        }

        const pctRicardo = coordPct(ricardoProjects)
        const pctJulian  = coordPct(julianProjects)

        // Nivel 5: un nodo por proyecto, con cascadeParentId → coordinador
        const ricardoLevel5 = ricardoProjects.map(n => ({
          ...n,
          level: 5,
          cascadeParentId: 'ricardo-prog-intermedia',
        }))
        const julianLevel5 = julianProjects.map(n => ({
          ...n,
          level: 5,
          cascadeParentId: 'julian-prog-intermedia',
        }))

        // ============ Nodos coordinadores (level 4) ============
        const nodeRicardo = {
          id: 'ricardo-prog-intermedia',
          title: 'Prog. Intermedia Compras YTD',
          owner: RICARDO_NAME,
          currentValue: pctRicardo,
          targetValue: 100,
          format: 'percentage',
          rules: { ...KPI_RULES },
          status: evalStatus(pctRicardo, KPI_RULES),
          childrenAggregationType: 'none',
          children: ricardoProjects,
          history: historyGlobal,
          level: 4,
          cascadeParentId: 'laura-prog-intermedia',
          _meta: {
            programadosTotal: ricardoProjects.reduce((a, n) => a + (n._meta?.programados || 0), 0),
            cerradosTotal: ricardoProjects.reduce((a, n) => a + (n._meta?.cerrados || 0), 0),
            unidadLabel: 'contratos',
            pctCumplimiento: pctRicardo,
          },
        }

        const nodeJulian = {
          id: 'julian-prog-intermedia',
          title: 'Prog. Intermedia Compras YTD',
          owner: JULIAN_NAME,
          currentValue: pctJulian,
          targetValue: 100,
          format: 'percentage',
          rules: { ...KPI_RULES },
          status: evalStatus(pctJulian, KPI_RULES),
          childrenAggregationType: 'none',
          children: julianProjects,
          history: historyGlobal,
          level: 4,
          cascadeParentId: 'laura-prog-intermedia',
          _meta: {
            programadosTotal: julianProjects.reduce((a, n) => a + (n._meta?.programados || 0), 0),
            cerradosTotal: julianProjects.reduce((a, n) => a + (n._meta?.cerrados || 0), 0),
            unidadLabel: 'contratos',
            pctCumplimiento: pctJulian,
          },
        }

        // ============ Nodo Laura (level 3) ============
        const nodeLaura = {
          id: 'laura-prog-intermedia',
          title: 'Prog. Intermedia Compras YTD',
          owner: LAURA_NAME,
          currentValue: pctTotal,
          targetValue: 100,
          format: 'percentage',
          rules: { ...KPI_RULES },
          status: evalStatus(pctTotal, KPI_RULES),
          childrenAggregationType: 'none',
          children: allMacroNodes,
          history: historyGlobal,
          level: 3,
          cascadeParentId: 'marcela-prog-intermedia',
          _meta: {
            programadosTotal: totalProgramados,
            cerradosTotal: totalCerrados,
            unidadLabel: 'contratos',
            pctCumplimiento: pctTotal,
          },
        }

        // ============ Nodo Marcela (level 2) ============
        const metaGlobal = {
          programadosTotal: totalProgramados,
          cerradosTotal: totalCerrados,
          unidadLabel: 'contratos',
          pctCumplimiento: pctTotal,
        }
        const nodeMarcela = {
          id: 'marcela-prog-intermedia',
          title: 'Prog. Intermedia Compras YTD',
          owner: MARCELA_NAME,
          currentValue: pctTotal,
          targetValue: 100,
          format: 'percentage',
          rules: { ...KPI_RULES },
          status: evalStatus(pctTotal, KPI_RULES),
          childrenAggregationType: 'none',
          children: [nodeLaura],
          history: historyGlobal,
          level: 2,
          _meta: metaGlobal,
        }

        // ============ Nodo CEO (level 1) ============
        const onExport = async () => {
          const { data: rows } = await supabaseIc
            .from('kpi_prog_intermedia_ytd_proyecto')
            .select('proyecto_ppto, compras_ppto, compras_real, fuente_real')
          downloadCsv(
            `prog_intermedia_ytd_${new Date().toISOString().slice(0, 7)}.csv`,
            rows || []
          )
        }

        const nodeCeo = {
          id: 'ceo-prog-intermedia',
          title: 'Prog. Intermedia Compras YTD',
          owner: CEO_NAME,
          currentValue: pctTotal,
          targetValue: 100,
          format: 'percentage',
          rules: { ...KPI_RULES },
          status: evalStatus(pctTotal, KPI_RULES),
          childrenAggregationType: 'none',
          children: [nodeMarcela],
          history: historyGlobal,
          level: 1,
          cascadeOwner: MARCELA_NAME,
          _meta: metaGlobal,
          onExport,
        }

        if (alive) {
          setNodes([nodeCeo, nodeMarcela, nodeLaura, nodeRicardo, nodeJulian, ...ricardoLevel5, ...julianLevel5])
          setLoading(false)
        }
      } catch (e) {
        console.error('useProgramacionIntermedia error:', e)
        if (alive) {
          setError(e)
          setLoading(false)
        }
      }
    })()

    return () => { alive = false }
  }, [])

  return { nodes, loading, error }
}
