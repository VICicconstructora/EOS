// src/lib/useProcesses.js — Core processes persistence
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const STORAGE_KEY = 'eos_processes'

const DEMO_PROCESSES = [
  {
    id: 1, name: 'Gestión de Proyectos', owner: 'Ana López', status: 'documented', documented: true,
    steps: ['Recepción de licitación y análisis de viabilidad', 'Elaboración de propuesta técnica y económica', 'Firma de contrato y kick-off con cliente', 'Planificación detallada y asignación de recursos', 'Ejecución con revisiones semanales', 'Entrega, finiquito y retroalimentación'],
    kpi: '95% proyectos en tiempo y presupuesto', notes: 'Proceso principal del negocio.',
  },
  {
    id: 2, name: 'Reclutamiento y Selección', owner: 'Miguel Torres', status: 'in-progress', documented: false,
    steps: ['Identificar vacante y perfil requerido', 'Publicación en bolsas de trabajo', 'Filtro de CVs y entrevista inicial', 'Entrevista técnica con área', 'Oferta y contratación', 'Onboarding'],
    kpi: 'Tiempo promedio de contratación < 3 semanas', notes: 'En proceso de documentación formal.',
  },
  {
    id: 3, name: 'Gestión Financiera', owner: 'Laura Vega', status: 'needs-work', documented: false,
    steps: ['Facturación semanal a clientes', 'Revisión de cuentas por cobrar', 'Pago a proveedores', 'Cierre contable mensual', 'Reporte financiero al equipo directivo'],
    kpi: 'DSO (días de cobro) < 45 días', notes: 'Requiere automatización de reportes.',
  },
  {
    id: 4, name: 'Compras y Proveedores', owner: 'Carlos Martínez', status: 'in-progress', documented: false,
    steps: ['Requisición de materiales por área', 'Cotización con mínimo 3 proveedores', 'Autorización según monto', 'Orden de compra y seguimiento', 'Recepción y verificación', 'Pago y evaluación de proveedor'],
    kpi: 'Cumplimiento de proveedores > 90%', notes: '',
  },
  {
    id: 5, name: 'Seguridad e Higiene', owner: 'Seguridad', status: 'documented', documented: true,
    steps: ['Inducción de seguridad a todo personal', 'Revisión diaria de EPP en obra', 'Reporte de incidentes y near-misses', 'Capacitación mensual', 'Auditoría trimestral de seguridad'],
    kpi: '0 accidentes incapacitantes', notes: 'Proceso crítico para cumplimiento legal.',
  },
]

export function useProcesses() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [localProcesses, setLocalProcesses] = useLocalStorage(STORAGE_KEY, DEMO_PROCESSES)
  const [sbProcesses, setSbProcesses] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return
    setLoading(true)
    supabase
      .from('processes')
      .select('*')
      .eq('company_id', 'ic-constructora')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setSbProcesses(data ?? [])
        setLoading(false)
      })
  }, [isSupabaseConfigured, isDemoMode])

  const processes = (isSupabaseConfigured && !isDemoMode) ? (sbProcesses ?? []) : localProcesses

  const add = useCallback(async (process) => {
    if (isSupabaseConfigured && !isDemoMode) {
      const { data } = await supabase.from('processes').insert([{ ...process, company_id: 'ic-constructora' }]).select().single()
      if (data) setSbProcesses(prev => [...(prev ?? []), data])
      return data
    } else {
      const r = { ...process, id: Date.now() }
      setLocalProcesses(prev => [...prev, r])
      return r
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalProcesses])

  const update = useCallback(async (updated) => {
    if (isSupabaseConfigured && !isDemoMode) {
      const { id, company_id, created_at, ...data } = updated
      const { data: row } = await supabase.from('processes').update(data).eq('id', id).select().single()
      if (row) setSbProcesses(prev => prev.map(p => p.id === id ? row : p))
    } else {
      setLocalProcesses(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalProcesses])

  const remove = useCallback(async (id) => {
    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('processes').delete().eq('id', id)
      setSbProcesses(prev => prev.filter(p => p.id !== id))
    } else {
      setLocalProcesses(prev => prev.filter(p => p.id !== id))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalProcesses])

  return { processes, loading, add, update, remove }
}
