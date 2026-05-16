// Hook que carga los KPIs de trámites de Francisco desde Supabase IC
// Fuentes: public.kpi_francisco_tramites_mes (scalar) + RPC get_francisco_tramites_detalle (export)
import { useEffect, useState } from 'react'
import { supabaseIc, isIcConfigured } from './supabaseIc'
import { downloadCsv } from '../utils/exportCsv'

const FRANCISCO = 'Francisco'
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function mesLabel() {
  const d = new Date()
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function evalStatus(value, rules) {
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

function makeExportFn(codigos, soloPendientes = false, label = 'tramites') {
  return async () => {
    if (!supabaseIc) return
    const { data, error } = await supabaseIc.rpc('get_francisco_tramites_detalle', {
      p_codigos: codigos,
      p_solo_pendientes: soloPendientes,
    })
    if (error) { console.error('export error:', error); return }
    const mes = new Date().toISOString().slice(0, 7)
    downloadCsv(`francisco_${label}_${mes}.csv`, data || [])
  }
}

function makeKpiNode(id, title, value, ppto, rules, codigos, soloPendientes = false, label) {
  const effectiveRules = (ppto != null && ppto > 0)
    ? { type: 'higher_is_better', green: Math.round(ppto * 0.8), yellow: Math.round(ppto * 0.5) }
    : rules
  const node = {
    id,
    title: `${title} — ${mesLabel()}`,
    owner: FRANCISCO,
    currentValue: value ?? 0,
    targetValue: ppto ?? null,
    format: 'number',
    rules: effectiveRules,
    children: [],
    history: [],
    _meta: { unidadLabel: 'unidades' },
    onExport: makeExportFn(codigos, soloPendientes, label || id),
  }
  node.status = evalStatus(node.currentValue, node.rules)
  return node
}

export function useTramitesFrancisco() {
  const [nodes, setNodes] = useState([])
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
        const { data, error: e } = await supabaseIc
          .from('kpi_francisco_tramites_mes')
          .select('*')
          .single()
        if (e) throw e
        if (!alive) return

        const d = data || {}

        const children = [
          makeKpiNode(
            'fra-promesas', 'Promesas firmadas', d.promesas_mes, d.promesas_ppto,
            { type: 'higher_is_better', green: 1, yellow: 0 },
            ['TRGA'], false, 'promesas'
          ),
          makeKpiNode(
            'fra-cred-rad', 'Créditos radicados', d.creditos_radicados_mes, d.creditos_radicados_ppto,
            { type: 'higher_is_better', green: 1, yellow: 0 },
            ['CRAR', 'CTAR'], false, 'creditos_radicados'
          ),
          makeKpiNode(
            'fra-cred-apr', 'Créditos aprobados', d.creditos_aprobados_mes, d.creditos_aprobados_ppto,
            { type: 'higher_is_better', green: 1, yellow: 0 },
            ['CRFA', 'CTFA'], false, 'creditos_aprobados'
          ),
          makeKpiNode(
            'fra-sub-rad', 'Subsidios radicados CCF', d.subsidios_radicados_mes, d.subsidios_radicados_ppto,
            { type: 'higher_is_better', green: 1, yellow: 0 },
            ['SUAR'], false, 'subsidios_radicados'
          ),
          makeKpiNode(
            'fra-sub-apr', 'Subsidios aprobados', d.subsidios_aprobados_mes, d.subsidios_aprobados_ppto,
            { type: 'higher_is_better', green: 1, yellow: 0 },
            ['SUEA', 'OSAR'], false, 'subsidios_aprobados'
          ),
          makeKpiNode(
            'fra-escrituras', 'Escrituras firmadas', d.escrituras_mes, d.escrituras_ppto,
            { type: 'higher_is_better', green: 1, yellow: 0 },
            ['ESEF'], false, 'escrituras'
          ),
          // Alertas de backlog (lower is better — sin PPTO, son conteos absolutos)
          makeKpiNode(
            'fra-cred-backlog', 'Créditos pendientes banco', d.creditos_backlog, null,
            { type: 'lower_is_better', green: 5, yellow: 20 },
            ['CRAR', 'CTAR'], true, 'creditos_backlog'
          ),
          makeKpiNode(
            'fra-sub-backlog', 'Subsidios CCF pendientes', d.subsidios_ccf_backlog, null,
            { type: 'lower_is_better', green: 10, yellow: 50 },
            ['SUAR'], true, 'subsidios_ccf_backlog'
          ),
        ]

        const leveledChildren = children.map(c => ({ ...c, level: 3, cascadeParentId: 'monica-tramites' }))

        if (alive) {
          setNodes(leveledChildren)
          setLoading(false)
        }
      } catch (e) {
        console.error('useTramitesFrancisco error:', e)
        if (alive) { setError(e); setLoading(false) }
      }
    })()
    return () => { alive = false }
  }, [])

  return { nodes, loading, error, isConfigured: isIcConfigured }
}
