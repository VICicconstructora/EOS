// src/lib/useImplementation.js
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

// Definición estática de las 5 fases y sus tareas
// Los task_key son identificadores únicos que se persisten en la DB
export const FASES = [
  {
    id: 1,
    nombre: 'Focus Day',
    duracion: '1 día completo',
    descripcion: 'Introducción al sistema EOS con el equipo directivo. El punto de partida.',
    separacion: null,
    tareas_facilitadas: [
      { key: 'f1_t1', label: 'Presentar los 6 componentes EOS al equipo', tipo: 'guia' },
      { key: 'f1_t2', label: 'Construir el Accountability Chart', tipo: 'interactivo', link: '/personas', instruccion: 'Ir a Personas → agregar a cada miembro del equipo directivo con su rol' },
      { key: 'f1_t3', label: 'Definir las primeras 3-7 Rocas del trimestre', tipo: 'interactivo', link: '/traccion', instruccion: 'Ir a Tracción → agregar las primeras Rocas del equipo' },
      { key: 'f1_t4', label: 'Establecer el Meeting Pulse (agendar L10 semanales)', tipo: 'interactivo', link: '/reuniones', instruccion: 'Ir a Reuniones → agendar los L10 semanales del trimestre' },
      { key: 'f1_t5', label: 'Crear la primera Lista de Asuntos con el equipo', tipo: 'interactivo', link: '/asuntos', instruccion: 'Ir a Asuntos → capturar los problemas que el equipo identifique hoy' },
      { key: 'f1_t6', label: 'Definir las primeras 5-10 métricas del Scorecard', tipo: 'interactivo', link: '/datos', instruccion: 'Ir a Datos → configurar las métricas iniciales del equipo' },
    ],
    formularios_individuales: [
      { key: 'f1_f1', label: 'Organizational Checkup (evaluación inicial)', pendiente_ad: true },
      { key: 'f1_f2', label: 'People Analyzer — evaluación inicial del equipo', pendiente_ad: true },
    ],
  },
  {
    id: 2,
    nombre: 'Vision Building Day 1',
    duracion: '1 día completo',
    descripcion: 'Completar la primera mitad del V/TO: Core Values, Core Focus, 10-Year Target y Marketing Strategy.',
    separacion: '~30 días después del Focus Day',
    tareas_facilitadas: [
      { key: 'f2_t1', label: 'Revisar Rocas del primer mes y actualizar estados', tipo: 'interactivo', link: '/traccion', instruccion: 'Ir a Tracción → actualizar el estado de cada Roca' },
      { key: 'f2_t2', label: 'Definir los Core Values de IC Constructora', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → completar el paso "Valores Centrales" del V/TO' },
      { key: 'f2_t3', label: 'Definir el Core Focus (propósito + nicho)', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → completar el paso "Enfoque Central" del V/TO' },
      { key: 'f2_t4', label: 'Definir el 10-Year Target', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → completar el paso "Meta a 10 Años"' },
      { key: 'f2_t5', label: 'Definir la Marketing Strategy', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → completar el paso "Estrategia de Marketing"' },
    ],
    formularios_individuales: [
      { key: 'f2_f1', label: 'Encuesta de identificación de Core Values por persona', pendiente_ad: true },
    ],
  },
  {
    id: 3,
    nombre: 'Vision Building Day 2',
    duracion: '1 día completo',
    descripcion: 'Completar la segunda mitad del V/TO: 3-Year Picture, 1-Year Plan y Rocas del trimestre.',
    separacion: '~30 días después del VBD 1',
    tareas_facilitadas: [
      { key: 'f3_t1', label: 'Revisar y ajustar V/TO Parte 1 del mes anterior', tipo: 'guia' },
      { key: 'f3_t2', label: 'Definir la 3-Year Picture', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → completar el paso "Imagen a 3 Años"' },
      { key: 'f3_t3', label: 'Definir el 1-Year Plan con 3-7 objetivos del año', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → completar el paso "Plan a 1 Año"' },
      { key: 'f3_t4', label: 'Definir las Rocas del próximo trimestre', tipo: 'interactivo', link: '/traccion', instruccion: 'Ir a Tracción → reemplazar Rocas del Q actual por las del siguiente' },
      { key: 'f3_t5', label: 'Revisar y completar el Accountability Chart', tipo: 'interactivo', link: '/personas', instruccion: 'Ir a Personas → verificar que todos tienen rol y evaluación GWC actualizada' },
    ],
    formularios_individuales: [
      { key: 'f3_f1', label: 'People Analyzer completo de todo el equipo', pendiente_ad: true },
    ],
  },
  {
    id: 4,
    nombre: 'Sesiones Trimestrales',
    duracion: '1 día por sesión',
    descripcion: 'Revisión de 90 días: celebrar Rocas completadas, resolver asuntos estratégicos y definir nuevas Rocas.',
    separacion: 'Cada 90 días (recurrente)',
    tareas_facilitadas: [
      { key: 'f4_t1', label: 'Revisar Rocas del trimestre anterior (completadas / no completadas)', tipo: 'interactivo', link: '/traccion', instruccion: 'Ir a Tracción → marcar Rocas como completadas o incompletas' },
      { key: 'f4_t2', label: 'Revisar el Scorecard de las últimas 13 semanas', tipo: 'interactivo', link: '/datos', instruccion: 'Ir a Datos → revisar tendencias de las últimas 13 semanas' },
      { key: 'f4_t3', label: 'Actualizar el V/TO si hay cambios en la visión', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → actualizar los campos que hayan cambiado' },
      { key: 'f4_t4', label: 'Resolver asuntos estratégicos del trimestre (IDS)', tipo: 'interactivo', link: '/asuntos', instruccion: 'Ir a Asuntos → priorizar y resolver los más importantes del trimestre' },
      { key: 'f4_t5', label: 'Definir las Rocas del próximo trimestre', tipo: 'interactivo', link: '/traccion', instruccion: 'Ir a Tracción → agregar las Rocas del siguiente trimestre' },
    ],
    formularios_individuales: [
      { key: 'f4_f1', label: 'Evaluación trimestral de Rocas individuales por gerente', pendiente_ad: true },
    ],
  },
  {
    id: 5,
    nombre: 'Sesión Anual',
    duracion: '2 días completos',
    descripcion: 'Revisión profunda de los 6 componentes, actualización completa del V/TO y planificación del año siguiente.',
    separacion: 'Una vez al año',
    tareas_facilitadas: [
      { key: 'f5_t1', label: 'Revisión completa de los 6 componentes EOS', tipo: 'guia' },
      { key: 'f5_t2', label: 'Actualización completa del V/TO', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → actualizar el V/TO completo para el nuevo año' },
      { key: 'f5_t3', label: 'Revisión anual del Accountability Chart y People Analyzer', tipo: 'interactivo', link: '/personas', instruccion: 'Ir a Personas → revisar y actualizar evaluación GWC de todo el equipo' },
      { key: 'f5_t4', label: 'Definir las Rocas anuales y del Q1', tipo: 'interactivo', link: '/traccion', instruccion: 'Ir a Tracción → definir las Rocas más importantes del año y del primer trimestre' },
      { key: 'f5_t5', label: 'Revisar y mejorar los procesos medulares', tipo: 'interactivo', link: '/procesos', instruccion: 'Ir a Procesos → actualizar o mejorar procesos que necesiten ajuste' },
    ],
    formularios_individuales: [
      { key: 'f5_f1', label: 'Revisión anual de desempeño por gerente', pendiente_ad: true },
      { key: 'f5_f2', label: 'Evaluación de salud EOS (Organizational Checkup anual)', pendiente_ad: true },
    ],
  },
]

const STORAGE_KEY = 'eos_implementation'

// Genera el estado inicial con todas las tareas como no completadas
function buildInitialState() {
  return FASES.map((fase, idx) => ({
    phase_id: fase.id,
    status: idx === 0 ? 'active' : 'pending',
    scheduled_date: null,
    completed_at: null,
    notes: '',
    task_completions: {}, // { task_key: { completed: bool, completed_at: string } }
  }))
}

export function useImplementation() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [localData, setLocalData] = useLocalStorage(STORAGE_KEY, buildInitialState())
  const [sbData, setSbData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return
    setLoading(true)
    Promise.all([
      supabase.from('implementation_progress').select('*').eq('company_id', 'ic-constructora').order('phase_id'),
      supabase.from('implementation_tasks').select('*').eq('company_id', 'ic-constructora'),
    ]).then(([{ data: phases }, { data: tasks }]) => {
      if (!phases) { setLoading(false); return }
      // Merge phases + tasks into the same shape as localData
      const merged = FASES.map(fase => {
        const phase = phases.find(p => p.phase_id === fase.id) || {
          phase_id: fase.id, status: fase.id === 1 ? 'active' : 'pending',
          scheduled_date: null, completed_at: null, notes: '',
        }
        const task_completions = {}
        ;(tasks || []).filter(t => t.phase_id === fase.id).forEach(t => {
          task_completions[t.task_key] = { completed: t.completed, completed_at: t.completed_at }
        })
        return { ...phase, task_completions }
      })
      setSbData(merged)
      setLoading(false)
    })
  }, [isSupabaseConfigured, isDemoMode])

  const data = (isSupabaseConfigured && !isDemoMode) ? (sbData ?? []) : localData

  // Marcar una tarea como completada/incompleta
  const toggleTask = useCallback(async (phaseId, taskKey, completed) => {
    const now = completed ? new Date().toISOString() : null

    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('implementation_tasks').upsert({
        company_id: 'ic-constructora', phase_id: phaseId,
        task_key: taskKey, completed, completed_at: now,
      }, { onConflict: 'company_id,phase_id,task_key' })
      setSbData(prev => prev.map(p => p.phase_id !== phaseId ? p : {
        ...p, task_completions: { ...p.task_completions, [taskKey]: { completed, completed_at: now } }
      }))
    } else {
      setLocalData(prev => prev.map(p => p.phase_id !== phaseId ? p : {
        ...p, task_completions: { ...p.task_completions, [taskKey]: { completed, completed_at: now } }
      }))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalData])

  // Completar una fase completa
  const completePhase = useCallback(async (phaseId) => {
    const now = new Date().toISOString()
    const nextPhaseId = phaseId + 1

    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('implementation_progress').upsert([
        { company_id: 'ic-constructora', phase_id: phaseId, status: 'completed', completed_at: now },
        ...(nextPhaseId <= 5 ? [{ company_id: 'ic-constructora', phase_id: nextPhaseId, status: 'active' }] : []),
      ], { onConflict: 'company_id,phase_id' })
      setSbData(prev => prev.map(p => {
        if (p.phase_id === phaseId) return { ...p, status: 'completed', completed_at: now }
        if (p.phase_id === nextPhaseId) return { ...p, status: 'active' }
        return p
      }))
    } else {
      setLocalData(prev => prev.map(p => {
        if (p.phase_id === phaseId) return { ...p, status: 'completed', completed_at: now }
        if (p.phase_id === nextPhaseId) return { ...p, status: 'active' }
        return p
      }))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalData])

  // Actualizar notas o fecha de una fase
  const updatePhase = useCallback(async (phaseId, changes) => {
    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('implementation_progress').upsert(
        { company_id: 'ic-constructora', phase_id: phaseId, ...changes },
        { onConflict: 'company_id,phase_id' }
      )
      setSbData(prev => prev.map(p => p.phase_id === phaseId ? { ...p, ...changes } : p))
    } else {
      setLocalData(prev => prev.map(p => p.phase_id === phaseId ? { ...p, ...changes } : p))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalData])

  // Helpers
  const getPhaseData = (phaseId) => data.find(p => p.phase_id === phaseId) || {}
  const isTaskDone = (phaseId, taskKey) => !!getPhaseData(phaseId)?.task_completions?.[taskKey]?.completed
  const completedPhases = data.filter(p => p.status === 'completed').length
  const activePhase = data.find(p => p.status === 'active')

  return { data, loading, toggleTask, completePhase, updatePhase, getPhaseData, isTaskDone, completedPhases, activePhase, FASES }
}
