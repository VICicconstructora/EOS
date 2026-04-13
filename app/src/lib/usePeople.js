// src/lib/usePeople.js — Team members persistence
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const STORAGE_KEY = 'eos_people'

const DEMO_PEOPLE = [
  { id: 1, name: 'Carlos Martínez', role: 'Director General',       dept: 'Dirección',   email: 'carlos@icconstructora.com', phone: '+52 81 1234 5678', gwc: [true,true,true],  values_fit: true,  notes: 'Fundador. Excelente visión estratégica.' },
  { id: 2, name: 'Ana López',        role: 'Directora de Proyectos', dept: 'Operaciones', email: 'ana@icconstructora.com',    phone: '+52 81 2345 6789', gwc: [true,true,true],  values_fit: true,  notes: 'Lidera los proyectos principales.' },
  { id: 3, name: 'Roberto Sánchez',  role: 'Ingeniero Estructural',  dept: 'Operaciones', email: 'roberto@icconstructora.com',phone: '',                 gwc: [true,false,true], values_fit: true,  notes: 'Gran técnico pero necesita más motivación en gestión.' },
  { id: 4, name: 'Laura Vega',       role: 'Contadora General',      dept: 'Finanzas',    email: 'laura@icconstructora.com',  phone: '',                 gwc: [true,true,false], values_fit: true,  notes: 'Sobrecargada. Considerar apoyo contable.' },
  { id: 5, name: 'Miguel Torres',    role: 'Jefe de RRHH',           dept: 'Personas',    email: 'miguel@icconstructora.com', phone: '',                 gwc: [false,true,true], values_fit: true,  notes: 'Nuevo en el rol. Necesita capacitación en EOS.' },
]

export function usePeople() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [localPeople, setLocalPeople] = useLocalStorage(STORAGE_KEY, DEMO_PEOPLE)
  const [sbPeople, setSbPeople] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return
    setLoading(true)
    supabase
      .from('people')
      .select('*')
      .eq('company_id', 'ic-constructora')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setSbPeople(data ?? [])
        setLoading(false)
      })
  }, [isSupabaseConfigured, isDemoMode])

  const people = (isSupabaseConfigured && !isDemoMode) ? (sbPeople ?? []) : localPeople

  const add = useCallback(async (person) => {
    if (isSupabaseConfigured && !isDemoMode) {
      const { data, error } = await supabase
        .from('people')
        .insert([{ ...person, company_id: 'ic-constructora' }])
        .select()
        .single()
      if (!error && data) setSbPeople(prev => [...(prev ?? []), data])
      return data
    } else {
      const r = { ...person, id: Date.now() }
      setLocalPeople(prev => [...prev, r])
      return r
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalPeople])

  const update = useCallback(async (updated) => {
    if (isSupabaseConfigured && !isDemoMode) {
      const { id, company_id, created_at, ...data } = updated
      const { data: row } = await supabase.from('people').update(data).eq('id', id).select().single()
      if (row) setSbPeople(prev => prev.map(p => p.id === id ? row : p))
    } else {
      setLocalPeople(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalPeople])

  const remove = useCallback(async (id) => {
    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('people').delete().eq('id', id)
      setSbPeople(prev => prev.filter(p => p.id !== id))
    } else {
      setLocalPeople(prev => prev.filter(p => p.id !== id))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalPeople])

  return { people, loading, add, update, remove }
}
