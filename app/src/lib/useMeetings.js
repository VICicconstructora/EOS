// src/lib/useMeetings.js — Meetings persistence: localStorage (demo) or Supabase
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const STORAGE_KEY = 'eos_meetings'

const DEMO_MEETINGS = [
  {
    id: 1,
    type: 'l10',
    title: 'Reunión L10 Semanal',
    date: '2026-04-07',
    time: '09:00',
    duration: 90,
    attendees: ['Carlos M.', 'Ana L.', 'Roberto S.', 'Laura V.', 'Miguel T.'],
    status: 'upcoming',
    rating: null,
    scorecard_ok: null,
    rocks_reviewed: null,
    issues_solved: null,
    notes: '',
  },
  {
    id: 2,
    type: 'l10',
    title: 'Reunión L10 Semanal',
    date: '2026-03-31',
    time: '09:00',
    duration: 90,
    attendees: ['Carlos M.', 'Ana L.', 'Roberto S.', 'Laura V.'],
    status: 'completed',
    rating: 8,
    scorecard_ok: true,
    rocks_reviewed: true,
    issues_solved: 3,
    notes: '',
  },
  {
    id: 3,
    type: 'quarterly',
    title: 'Reunión Trimestral (Q1 Review)',
    date: '2026-03-28',
    time: '08:00',
    duration: 480,
    attendees: ['Carlos M.', 'Ana L.', 'Laura V.', 'Miguel T.'],
    status: 'completed',
    rating: 9,
    scorecard_ok: true,
    rocks_reviewed: true,
    issues_solved: 7,
    notes: '',
  },
]

export function useMeetings() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [localMeetings, setLocalMeetings] = useLocalStorage(STORAGE_KEY, DEMO_MEETINGS)
  const [sbMeetings, setSbMeetings] = useState(null) // null = not yet loaded
  const [loading, setLoading] = useState(false)

  // Load from Supabase when configured
  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return
    setLoading(true)
    supabase
      .from('meetings')
      .select('*')
      .eq('company_id', 'ic-constructora')
      .order('date', { ascending: false })
      .then(({ data }) => {
        setSbMeetings(data ?? [])
        setLoading(false)
      })
  }, [isSupabaseConfigured, isDemoMode])

  const meetings = (isSupabaseConfigured && !isDemoMode) ? (sbMeetings ?? []) : localMeetings

  const add = useCallback(async (meeting) => {
    if (isSupabaseConfigured && !isDemoMode) {
      const { data, error } = await supabase
        .from('meetings')
        .insert([{ ...meeting, company_id: 'ic-constructora' }])
        .select()
        .single()
      if (!error && data) setSbMeetings(prev => [data, ...(prev ?? [])])
      return data
    } else {
      const r = { ...meeting, id: Date.now(), created_at: new Date().toISOString() }
      setLocalMeetings(prev => [r, ...prev])
      return r
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalMeetings])

  const update = useCallback(async (updated) => {
    if (isSupabaseConfigured && !isDemoMode) {
      const { id, company_id, created_at, ...data } = updated
      const { data: row } = await supabase
        .from('meetings')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (row) setSbMeetings(prev => prev.map(m => m.id === id ? row : m))
    } else {
      setLocalMeetings(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalMeetings])

  const remove = useCallback(async (id) => {
    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('meetings').delete().eq('id', id)
      setSbMeetings(prev => prev.filter(m => m.id !== id))
    } else {
      setLocalMeetings(prev => prev.filter(m => m.id !== id))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalMeetings])

  return { meetings, loading, add, update, remove }
}
