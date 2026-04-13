// src/lib/useTranscriptions.js
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const STORAGE_KEY = 'eos_transcriptions'

export const EOS_COMPONENTS_TAGS = ['vision','personas','datos','asuntos','procesos','traccion','general']

export function useTranscriptions() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [localT, setLocalT] = useLocalStorage(STORAGE_KEY, [])
  const [sbT, setSbT] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return
    setLoading(true)
    supabase
      .from('transcriptions')
      .select('*')
      .eq('company_id', 'ic-constructora')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setSbT(data ?? []); setLoading(false) })
  }, [isSupabaseConfigured, isDemoMode])

  const transcriptions = (isSupabaseConfigured && !isDemoMode) ? (sbT ?? []) : localT

  const add = useCallback(async (t) => {
    const entry = { ...t, created_at: new Date().toISOString() }
    if (isSupabaseConfigured && !isDemoMode) {
      const { data } = await supabase
        .from('transcriptions')
        .insert([{ ...entry, company_id: 'ic-constructora' }])
        .select().single()
      if (data) setSbT(prev => [data, ...(prev ?? [])])
      return data
    } else {
      const r = { ...entry, id: Date.now() }
      setLocalT(prev => [r, ...prev])
      return r
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalT])

  const remove = useCallback(async (id) => {
    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('transcriptions').delete().eq('id', id)
      setSbT(prev => prev.filter(t => t.id !== id))
    } else {
      setLocalT(prev => prev.filter(t => t.id !== id))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalT])

  // Detectar patrones: temas más frecuentes en las últimas N transcripciones
  const topTopics = (limit = 10) => {
    const counts = {}
    transcriptions.forEach(t => {
      (t.topics || []).forEach(topic => {
        const key = `${topic.eos_component}::${topic.label}`
        counts[key] = (counts[key] || 0) + 1
      })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, count]) => {
        const [eos_component, label] = key.split('::')
        return { label, eos_component, count }
      })
  }

  // Asuntos recurrentes: mismo tema en 3+ transcripciones
  const recurringTopics = () => topTopics(50).filter(t => t.count >= 3)

  return { transcriptions, loading, add, remove, topTopics, recurringTopics }
}
