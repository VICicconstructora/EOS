// src/lib/useRocks.js — Rocks persistence: localStorage (demo) or Supabase
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const STORAGE_KEY = 'eos_rocks'
const QUARTER = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}_${new Date().getFullYear()}`

const DEMO_ROCKS = [
  { id: 1, title: 'Implementar sistema de gestión de calidad ISO 9001', owner: 'Carlos Martínez', priority: 'alta', status: 'on-track',  due: '2026-06-30', notes: '', quarter: QUARTER },
  { id: 2, title: 'Abrir oficina de representación en Monterrey',        owner: 'Ana López',      priority: 'alta', status: 'off-track', due: '2026-06-30', notes: 'Pendiente definir local', quarter: QUARTER },
  { id: 3, title: 'Contratar 3 ingenieros senior para área estructural', owner: 'RRHH',           priority: 'media',status: 'on-track',  due: '2026-05-31', notes: '', quarter: QUARTER },
  { id: 4, title: 'Lanzar plataforma de licitaciones online v1.0',       owner: 'Tech',           priority: 'media',status: 'done',      due: '2026-03-31', notes: 'Completado en tiempo', quarter: QUARTER },
  { id: 5, title: 'Capacitar 100% del equipo en seguridad industrial',   owner: 'Seguridad',      priority: 'alta', status: 'on-track',  due: '2026-06-30', notes: '', quarter: QUARTER },
]

export function useRocks() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [localRocks, setLocalRocks] = useLocalStorage(STORAGE_KEY, DEMO_ROCKS)
  const [sbRocks, setSbRocks] = useState(null)   // null = not yet loaded
  const [loading, setLoading] = useState(false)

  // Load from Supabase when configured
  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return
    setLoading(true)
    supabase
      .from('rocks')
      .select('*')
      .eq('company_id', 'ic-constructora')
      .eq('quarter', QUARTER)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setSbRocks(data ?? [])
        setLoading(false)
      })
  }, [isSupabaseConfigured, isDemoMode])

  const rocks = (isSupabaseConfigured && !isDemoMode) ? (sbRocks ?? []) : localRocks

  const add = useCallback(async (rock) => {
    const newRock = { ...rock, quarter: QUARTER }

    if (isSupabaseConfigured && !isDemoMode) {
      const { data, error } = await supabase
        .from('rocks')
        .insert([{ ...newRock, company_id: 'ic-constructora' }])
        .select()
        .single()
      if (!error && data) setSbRocks(prev => [...(prev ?? []), data])
      return data
    } else {
      const r = { ...newRock, id: Date.now(), created_at: new Date().toISOString() }
      setLocalRocks(prev => [...prev, r])
      return r
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalRocks])

  const update = useCallback(async (updated) => {
    if (isSupabaseConfigured && !isDemoMode) {
      const { id, company_id, created_at, ...data } = updated
      const { data: row } = await supabase.from('rocks').update(data).eq('id', id).select().single()
      if (row) setSbRocks(prev => prev.map(r => r.id === id ? row : r))
    } else {
      setLocalRocks(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalRocks])

  const remove = useCallback(async (id) => {
    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('rocks').delete().eq('id', id)
      setSbRocks(prev => prev.filter(r => r.id !== id))
    } else {
      setLocalRocks(prev => prev.filter(r => r.id !== id))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalRocks])

  return { rocks, loading, add, update, remove, quarter: QUARTER }
}
