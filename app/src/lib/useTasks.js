// src/lib/useTasks.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const DEMO_TASKS = [
  {
    id: 'task-demo-1',
    company_id: 'ic-constructora',
    title: 'Renovar crédito constructor Reserva de Oporto E1 con DAVIVIENDA',
    description: 'El crédito venció el 2026-05-08. Coordinar con área financiera y banco para prórroga o renovación.',
    assigned_to: 'jmanosalva@icconstructora.com',
    assigned_name: 'Jhon Manosalva',
    due_date: '2026-05-20',
    status: 'todo',
    priority: 'alta',
    created_by: 'admin@icconstructora.com',
    source: 'datamart',
    source_ref: 'reserva-de-oporto::E1::credito',
    completed_at: null,
    created_at: '2026-05-09T00:00:00Z',
  },
  {
    id: 'task-demo-2',
    company_id: 'ic-constructora',
    title: 'Preparar informe de ventas Q2 para reunión L10',
    description: '',
    assigned_to: 'mbaez@icconstructora.com',
    assigned_name: 'Mónica Báez',
    due_date: '2026-05-15',
    status: 'in-progress',
    priority: 'media',
    created_by: 'admin@icconstructora.com',
    source: 'meeting',
    source_ref: '',
    completed_at: null,
    created_at: '2026-05-05T00:00:00Z',
  },
  {
    id: 'task-demo-3',
    company_id: 'ic-constructora',
    title: 'Verificar estado de licencias vencidas Well E1',
    description: 'La licencia venció el 2025-09-26. Confirmar si hay prórroga o trámite en curso.',
    assigned_to: 'nvinchira@icconstructora.com',
    assigned_name: 'Nataly Vinchira',
    due_date: '2026-05-31',
    status: 'todo',
    priority: 'alta',
    created_by: 'admin@icconstructora.com',
    source: 'datamart',
    source_ref: 'well::E1::licencia',
    completed_at: null,
    created_at: '2026-05-09T00:00:00Z',
  },
  {
    id: 'task-demo-4',
    company_id: 'ic-constructora',
    title: 'Consolidar reporte de escrituraciones mayo 2026',
    description: '',
    assigned_to: 'mbaez@icconstructora.com',
    assigned_name: 'Mónica Báez',
    due_date: '2026-06-05',
    status: 'todo',
    priority: 'media',
    created_by: 'admin@icconstructora.com',
    source: 'manual',
    source_ref: '',
    completed_at: null,
    created_at: '2026-05-08T00:00:00Z',
  },
]

export function useTasks() {
  const { isDemoMode, isSupabaseConfigured, user } = useApp()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (includeDone = false) => {
    if (!isSupabaseConfigured || isDemoMode) {
      setTasks(includeDone ? DEMO_TASKS : DEMO_TASKS.filter(t => t.status !== 'done'))
      return
    }
    setLoading(true)
    let q = supabase
      .from('tasks')
      .select('*')
      .eq('company_id', 'ic-constructora')
      .order('due_date', { ascending: true, nullsFirst: false })
    if (!includeDone) q = q.neq('status', 'done')
    const { data, error } = await q
    if (!error) setTasks(data ?? [])
    setLoading(false)
  }, [isSupabaseConfigured, isDemoMode])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (taskData) => {
    const base = {
      company_id: 'ic-constructora',
      created_by: user?.email || '',
      source: taskData.source || 'manual',
      ...taskData,
    }
    if (isDemoMode) {
      const newTask = { ...base, id: `task-demo-${Date.now()}`, created_at: new Date().toISOString() }
      setTasks(prev => [newTask, ...prev])
      return newTask
    }
    const { data, error } = await supabase.from('tasks').insert(base).select().single()
    if (!error) load()
    return data
  }, [isDemoMode, user, load])

  const update = useCallback(async (updated) => {
    if (isDemoMode) {
      setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
      return
    }
    const { id, ...rest } = updated
    await supabase.from('tasks').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
    load()
  }, [isDemoMode, load])

  const remove = useCallback(async (id) => {
    if (isDemoMode) {
      setTasks(prev => prev.filter(t => t.id !== id))
      return
    }
    await supabase.from('tasks').delete().eq('id', id)
    load()
  }, [isDemoMode, load])

  return { tasks, loading, add, update, remove, reload: load }
}
