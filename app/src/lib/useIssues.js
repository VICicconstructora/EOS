// src/lib/useIssues.js — Issues (asuntos) persistence
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const STORAGE_KEY = 'eos_issues'

const DEMO_ISSUES = [
  { id: 1, title: 'Retrasos en entrega de materiales por proveedor principal', type: 'operacional', priority: 'alta', status: 'open', identified_by: 'Carlos M.', created_at: '2026-03-15', discussion: 'El proveedor ha fallado en 3 de las últimas 5 entregas.', solution: '', owner: '' },
  { id: 2, title: 'Falta de proceso claro para onboarding de nuevos ingenieros', type: 'personas', priority: 'media', status: 'discussing', identified_by: 'Ana L.', created_at: '2026-03-18', discussion: 'Los nuevos ingresos tardan 4-6 semanas en ser productivos.', solution: 'Crear checklist de onboarding con responsables por área.', owner: 'RRHH' },
  { id: 3, title: 'Sobrecosto del 15% en proyecto Torre Mirador', type: 'financiero', priority: 'alta', status: 'solved', identified_by: 'Finanzas', created_at: '2026-02-28', discussion: 'Los cambios de alcance no gestionados generaron costos adicionales.', solution: 'Implementar proceso formal de gestión de cambios con aprobación del cliente.', owner: 'Operaciones' },
  { id: 4, title: 'Comunicación deficiente entre equipo en campo y oficina', type: 'comunicacion', priority: 'media', status: 'open', identified_by: 'Supervisores', created_at: '2026-03-20', discussion: '', solution: '', owner: '' },
]

export function useIssues() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [localIssues, setLocalIssues] = useLocalStorage(STORAGE_KEY, DEMO_ISSUES)
  const [sbIssues, setSbIssues] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return
    setLoading(true)
    supabase
      .from('issues')
      .select('*')
      .eq('company_id', 'ic-constructora')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSbIssues(data ?? [])
        setLoading(false)
      })
  }, [isSupabaseConfigured, isDemoMode])

  const issues = (isSupabaseConfigured && !isDemoMode) ? (sbIssues ?? []) : localIssues

  const add = useCallback(async (issue) => {
    const base = { ...issue, status: 'open', created_at: new Date().toISOString().split('T')[0] }

    if (isSupabaseConfigured && !isDemoMode) {
      const { data, error } = await supabase
        .from('issues')
        .insert([{ ...base, company_id: 'ic-constructora' }])
        .select()
        .single()
      if (!error && data) setSbIssues(prev => [data, ...(prev ?? [])])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalIssues(prev => [r, ...prev])
      return r
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalIssues])

  const update = useCallback(async (updated) => {
    if (isSupabaseConfigured && !isDemoMode) {
      const { id, company_id, created_at, ...data } = updated
      const { data: row } = await supabase.from('issues').update(data).eq('id', id).select().single()
      if (row) setSbIssues(prev => prev.map(i => i.id === id ? row : i))
    } else {
      setLocalIssues(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalIssues])

  const remove = useCallback(async (id) => {
    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('issues').delete().eq('id', id)
      setSbIssues(prev => prev.filter(i => i.id !== id))
    } else {
      setLocalIssues(prev => prev.filter(i => i.id !== id))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalIssues])

  return { issues, loading, add, update, remove }
}
