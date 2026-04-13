// src/lib/useMetrics.js — Scorecard metrics persistence
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const METRICS_KEY = 'eos_metrics'
const VALUES_KEY  = 'eos_metric_values'

const WEEKS = ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8']

const DEMO_METRICS = [
  { id: 1, name: 'Ventas Semanales ($k)',     category: 'Comercial',    owner: 'Ana L.',    goal: 100, unit: '$k',  lower_is_better: false, active: true },
  { id: 2, name: 'Proyectos a Tiempo (%)',    category: 'Operaciones',  owner: 'Ana L.',    goal: 95,  unit: '%',   lower_is_better: false, active: true },
  { id: 3, name: 'Asuntos Resueltos',         category: 'General',      owner: 'Carlos M.', goal: 5,   unit: '',    lower_is_better: false, active: true },
  { id: 4, name: 'Incidentes de Seguridad',   category: 'Seguridad',    owner: 'Seguridad', goal: 0,   unit: '',    lower_is_better: true,  active: true },
  { id: 5, name: 'Satisfacción del Equipo (%)',category: 'Personas',    owner: 'Miguel T.', goal: 85,  unit: '%',   lower_is_better: false, active: true },
  { id: 6, name: 'Propuestas Enviadas',        category: 'Comercial',   owner: 'Comercial', goal: 8,   unit: '',    lower_is_better: false, active: true },
]

const DEMO_VALUES = [
  // metric_id 1 — Ventas
  ...WEEKS.map((w, i) => ({ id: 100+i, metric_id: 1, week_label: w, value: [88,95,102,110,98,125,115,122][i] })),
  // metric_id 2 — Proyectos a tiempo
  ...WEEKS.map((w, i) => ({ id: 200+i, metric_id: 2, week_label: w, value: [90,88,92,89,91,88,93,95][i] })),
  // metric_id 3 — Asuntos
  ...WEEKS.map((w, i) => ({ id: 300+i, metric_id: 3, week_label: w, value: [3,5,4,6,5,7,4,5][i] })),
  // metric_id 4 — Incidentes
  ...WEEKS.map((w, i) => ({ id: 400+i, metric_id: 4, week_label: w, value: [0,1,0,0,1,0,0,0][i] })),
  // metric_id 5 — Satisfacción
  ...WEEKS.map((w, i) => ({ id: 500+i, metric_id: 5, week_label: w, value: [80,82,83,85,84,86,88,87][i] })),
  // metric_id 6 — Propuestas
  ...WEEKS.map((w, i) => ({ id: 600+i, metric_id: 6, week_label: w, value: [5,7,6,8,9,7,10,8][i] })),
]

export function useMetrics() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [localMetrics, setLocalMetrics] = useLocalStorage(METRICS_KEY, DEMO_METRICS)
  const [localValues,  setLocalValues]  = useLocalStorage(VALUES_KEY,  DEMO_VALUES)
  const [sbMetrics, setSbMetrics] = useState(null)
  const [sbValues,  setSbValues]  = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return
    setLoading(true)
    Promise.all([
      supabase.from('metrics').select('*').eq('company_id', 'ic-constructora').eq('active', true).order('category'),
      supabase.from('metric_values').select('*, metrics!inner(company_id)').eq('metrics.company_id', 'ic-constructora').order('week_date', { ascending: true }),
    ]).then(([{ data: m }, { data: v }]) => {
      setSbMetrics(m ?? [])
      setSbValues(v ?? [])
      setLoading(false)
    })
  }, [isSupabaseConfigured, isDemoMode])

  const metrics = (isSupabaseConfigured && !isDemoMode) ? (sbMetrics ?? []) : localMetrics
  const values  = (isSupabaseConfigured && !isDemoMode) ? (sbValues  ?? []) : localValues

  // Get values for a specific metric
  const valuesFor = useCallback((metricId) =>
    values.filter(v => v.metric_id === metricId),
  [values])

  // Latest value for a metric
  const latestValue = useCallback((metricId) => {
    const vs = valuesFor(metricId)
    return vs.length ? vs[vs.length - 1].value : null
  }, [valuesFor])

  const addMetric = useCallback(async (metric) => {
    if (isSupabaseConfigured && !isDemoMode) {
      const { data } = await supabase.from('metrics').insert([{ ...metric, company_id: 'ic-constructora' }]).select().single()
      if (data) setSbMetrics(prev => [...(prev ?? []), data])
      return data
    } else {
      const r = { ...metric, id: Date.now(), active: true }
      setLocalMetrics(prev => [...prev, r])
      return r
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalMetrics])

  const updateMetric = useCallback(async (updated) => {
    if (isSupabaseConfigured && !isDemoMode) {
      const { id, company_id, created_at, ...data } = updated
      const { data: row } = await supabase.from('metrics').update(data).eq('id', id).select().single()
      if (row) setSbMetrics(prev => prev.map(m => m.id === id ? row : m))
    } else {
      setLocalMetrics(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalMetrics])

  const removeMetric = useCallback(async (id) => {
    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('metrics').delete().eq('id', id)
      setSbMetrics(prev => prev.filter(m => m.id !== id))
      setSbValues(prev => prev.filter(v => v.metric_id !== id))
    } else {
      setLocalMetrics(prev => prev.filter(m => m.id !== id))
      setLocalValues(prev => prev.filter(v => v.metric_id !== id))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalMetrics, setLocalValues])

  const addValue = useCallback(async (metricId, weekLabel, value) => {
    const entry = { metric_id: metricId, week_label: weekLabel, value, week_date: new Date().toISOString().split('T')[0] }
    if (isSupabaseConfigured && !isDemoMode) {
      const { data } = await supabase.from('metric_values').insert([entry]).select().single()
      if (data) setSbValues(prev => [...(prev ?? []), data])
    } else {
      setLocalValues(prev => [...prev, { ...entry, id: Date.now() }])
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalValues])

  const updateValue = useCallback(async (id, value) => {
    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('metric_values').update({ value }).eq('id', id)
      setSbValues(prev => prev.map(v => v.id === id ? { ...v, value } : v))
    } else {
      setLocalValues(prev => prev.map(v => v.id === id ? { ...v, value } : v))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalValues])

  return { metrics, values, loading, valuesFor, latestValue, addMetric, updateMetric, removeMetric, addValue, updateValue, weeks: WEEKS }
}
