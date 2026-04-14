// src/lib/useHR.js — RRHH: Requisiciones de personal, candidatos, entrevistas, comentarios
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const DEMO_REQUESTS = [
  { id: 1, company_id: 'ic-constructora', title: 'Ingeniero Residente de Obra', department: 'Operaciones', requester: 'Ana López', headcount: 2, status: 'interviews', priority: 'alta', job_description: 'Ingeniero civil con mínimo 5 años en proyectos de construcción masiva. Manejo de personal, cronogramas y presupuesto de obra.', requirements: 'Ing. Civil titulado, AutoCAD, MS Project, 5+ años de experiencia en obra.', headhunter_external: true, headhunter_name: 'Hunt & Partners', headhunter_contact: 'maria@huntpartners.com', notes: '', requested_date: '2026-03-01', target_start_date: '2026-05-01', created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-01T10:00:00Z' },
  { id: 2, company_id: 'ic-constructora', title: 'Auxiliar Contable', department: 'Finanzas', requester: 'Laura Vega', headcount: 1, status: 'searching', priority: 'media', job_description: 'Apoyo en cuentas por pagar/cobrar, conciliaciones bancarias y archivo de soportes contables.', requirements: 'Técnico o tecnólogo contable, Excel avanzado, 1-2 años de experiencia.', headhunter_external: false, headhunter_name: '', headhunter_contact: '', notes: 'Urgente por sobrecarga del departamento de finanzas', requested_date: '2026-03-15', target_start_date: '2026-04-15', created_at: '2026-03-15T09:00:00Z', updated_at: '2026-03-15T09:00:00Z' },
  { id: 3, company_id: 'ic-constructora', title: 'Director Comercial', department: 'Comercial', requester: 'Carlos Martínez', headcount: 1, status: 'draft', priority: 'alta', job_description: 'Liderar estrategia y equipo comercial de proyectos inmobiliarios.', requirements: 'Profesional en Adm. o afines, 8+ años en ventas inmobiliarias, liderazgo de equipos.', headhunter_external: false, headhunter_name: '', headhunter_contact: '', notes: 'En espera de aprobación de presupuesto Q2', requested_date: '2026-04-01', target_start_date: '2026-06-01', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
]

const DEMO_CANDIDATES = [
  { id: 1, request_id: 1, company_id: 'ic-constructora', name: 'Juan Pérez García', email: 'juan.perez@gmail.com', phone: '+57 300 123 4567', source: 'headhunter', status: 'activo', cv_filename: 'cv_juan_perez.pdf', cv_url: '', notes: '5 años en obras verticales, proyectos $5M+', added_at: '2026-03-10T10:00:00Z' },
  { id: 2, request_id: 1, company_id: 'ic-constructora', name: 'María Rodríguez Torres', email: 'maria.r@hotmail.com', phone: '+57 311 987 6543', source: 'linkedin', status: 'activo', cv_filename: 'cv_maria_rodriguez.pdf', cv_url: '', notes: 'Proyectos residenciales 3-4 años', added_at: '2026-03-12T14:00:00Z' },
  { id: 3, request_id: 1, company_id: 'ic-constructora', name: 'Carlos Herrera', email: 'cherrera@email.com', phone: '+57 320 456 7890', source: 'referido', status: 'descartado', cv_filename: 'cv_carlos_herrera.pdf', cv_url: '', notes: 'No cumple experiencia mínima (2 años)', added_at: '2026-03-08T11:00:00Z' },
]

const DEMO_INTERVIEWS = [
  { id: 1, candidate_id: 1, request_id: 1, company_id: 'ic-constructora', interviewer: 'Miguel Torres', interview_date: '2026-03-20', interview_type: 'rrhh', result: 'aprobado', score: 8, comments: 'Excelente presentación, muy motivado con el proyecto.', created_at: '2026-03-20T10:00:00Z' },
  { id: 2, candidate_id: 1, request_id: 1, company_id: 'ic-constructora', interviewer: 'Ana López', interview_date: '2026-03-25', interview_type: 'tecnica', result: 'pendiente', score: null, comments: '', created_at: '2026-03-21T09:00:00Z' },
  { id: 3, candidate_id: 2, request_id: 1, company_id: 'ic-constructora', interviewer: 'Miguel Torres', interview_date: '2026-03-22', interview_type: 'rrhh', result: 'aprobado', score: 7, comments: 'Perfil interesante, validar con área técnica.', created_at: '2026-03-22T10:00:00Z' },
]

const DEMO_COMMENTS = [
  { id: 1, request_id: 1, company_id: 'ic-constructora', author: 'Miguel Torres', content: 'Proceso iniciado. Contactado a Hunt & Partners para búsqueda activa.', created_at: '2026-03-02T09:00:00Z' },
  { id: 2, request_id: 1, company_id: 'ic-constructora', author: 'Ana López', content: 'Necesitamos priorizar — tenemos proyecto iniciando en mayo y no podemos arrancar sin ingenieros.', created_at: '2026-03-05T14:30:00Z' },
  { id: 3, request_id: 1, company_id: 'ic-constructora', author: 'Hunt & Partners', content: '5 perfiles identificados. Enviamos HVs esta semana.', created_at: '2026-03-08T16:00:00Z' },
]

export function useHR() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [localRequests,   setLocalRequests]   = useLocalStorage('hr_requests',   DEMO_REQUESTS)
  const [localCandidates, setLocalCandidates] = useLocalStorage('hr_candidates', DEMO_CANDIDATES)
  const [localInterviews, setLocalInterviews] = useLocalStorage('hr_interviews', DEMO_INTERVIEWS)
  const [localComments,   setLocalComments]   = useLocalStorage('hr_comments',   DEMO_COMMENTS)

  const [sbRequests,   setSbRequests]   = useState(null)
  const [sbCandidates, setSbCandidates] = useState(null)
  const [sbInterviews, setSbInterviews] = useState(null)
  const [sbComments,   setSbComments]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return
    setLoading(true)
    Promise.all([
      supabase.from('hr_requests').select('*').eq('company_id', 'ic-constructora').order('created_at', { ascending: false }),
      supabase.from('hr_candidates').select('*').eq('company_id', 'ic-constructora').order('added_at', { ascending: false }),
      supabase.from('hr_interviews').select('*').eq('company_id', 'ic-constructora').order('interview_date', { ascending: true }),
      supabase.from('hr_comments').select('*').eq('company_id', 'ic-constructora').order('created_at', { ascending: true }),
    ]).then(([req, cand, interv, comm]) => {
      setSbRequests(req.data ?? [])
      setSbCandidates(cand.data ?? [])
      setSbInterviews(interv.data ?? [])
      setSbComments(comm.data ?? [])
      setLoading(false)
    })
  }, [isSupabaseConfigured, isDemoMode])

  const isLive = isSupabaseConfigured && !isDemoMode
  const requests   = isLive ? (sbRequests   ?? []) : localRequests
  const candidates = isLive ? (sbCandidates ?? []) : localCandidates
  const interviews = isLive ? (sbInterviews ?? []) : localInterviews
  const comments   = isLive ? (sbComments   ?? []) : localComments

  // --- Requests ---
  const addRequest = useCallback(async (req) => {
    const base = { ...req, company_id: 'ic-constructora', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    if (isLive) {
      const { data, error } = await supabase.from('hr_requests').insert([base]).select().single()
      if (!error && data) setSbRequests(prev => [data, ...(prev ?? [])])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalRequests(prev => [r, ...prev])
      return r
    }
  }, [isLive, setLocalRequests])

  const updateRequest = useCallback(async (updated) => {
    const upd = { ...updated, updated_at: new Date().toISOString() }
    if (isLive) {
      const { id, company_id, created_at, ...data } = upd
      const { data: row } = await supabase.from('hr_requests').update(data).eq('id', id).select().single()
      if (row) setSbRequests(prev => prev.map(r => r.id === id ? row : r))
    } else {
      setLocalRequests(prev => prev.map(r => r.id === upd.id ? { ...r, ...upd } : r))
    }
  }, [isLive, setLocalRequests])

  const removeRequest = useCallback(async (id) => {
    if (isLive) {
      await supabase.from('hr_requests').delete().eq('id', id)
      setSbRequests(prev => prev.filter(r => r.id !== id))
    } else {
      setLocalRequests(prev => prev.filter(r => r.id !== id))
    }
  }, [isLive, setLocalRequests])

  // --- Candidates ---
  const addCandidate = useCallback(async (cand) => {
    const base = { ...cand, company_id: 'ic-constructora', added_at: new Date().toISOString() }
    if (isLive) {
      const { data, error } = await supabase.from('hr_candidates').insert([base]).select().single()
      if (!error && data) setSbCandidates(prev => [data, ...(prev ?? [])])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalCandidates(prev => [r, ...prev])
      return r
    }
  }, [isLive, setLocalCandidates])

  const updateCandidate = useCallback(async (updated) => {
    if (isLive) {
      const { id, company_id, added_at, ...data } = updated
      const { data: row } = await supabase.from('hr_candidates').update(data).eq('id', id).select().single()
      if (row) setSbCandidates(prev => prev.map(c => c.id === id ? row : c))
    } else {
      setLocalCandidates(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
    }
  }, [isLive, setLocalCandidates])

  const removeCandidate = useCallback(async (id) => {
    if (isLive) {
      await supabase.from('hr_candidates').delete().eq('id', id)
      setSbCandidates(prev => prev.filter(c => c.id !== id))
    } else {
      setLocalCandidates(prev => prev.filter(c => c.id !== id))
    }
  }, [isLive, setLocalCandidates])

  // --- Interviews ---
  const addInterview = useCallback(async (interv) => {
    const base = { ...interv, company_id: 'ic-constructora', created_at: new Date().toISOString() }
    if (isLive) {
      const { data, error } = await supabase.from('hr_interviews').insert([base]).select().single()
      if (!error && data) setSbInterviews(prev => [...(prev ?? []), data])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalInterviews(prev => [...prev, r])
      return r
    }
  }, [isLive, setLocalInterviews])

  const updateInterview = useCallback(async (updated) => {
    if (isLive) {
      const { id, company_id, created_at, ...data } = updated
      const { data: row } = await supabase.from('hr_interviews').update(data).eq('id', id).select().single()
      if (row) setSbInterviews(prev => prev.map(i => i.id === id ? row : i))
    } else {
      setLocalInterviews(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))
    }
  }, [isLive, setLocalInterviews])

  const removeInterview = useCallback(async (id) => {
    if (isLive) {
      await supabase.from('hr_interviews').delete().eq('id', id)
      setSbInterviews(prev => prev.filter(i => i.id !== id))
    } else {
      setLocalInterviews(prev => prev.filter(i => i.id !== id))
    }
  }, [isLive, setLocalInterviews])

  // --- Comments ---
  const addComment = useCallback(async (comm) => {
    const base = { ...comm, company_id: 'ic-constructora', created_at: new Date().toISOString() }
    if (isLive) {
      const { data, error } = await supabase.from('hr_comments').insert([base]).select().single()
      if (!error && data) setSbComments(prev => [...(prev ?? []), data])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalComments(prev => [...prev, r])
      return r
    }
  }, [isLive, setLocalComments])

  return {
    requests, candidates, interviews, comments, loading,
    addRequest, updateRequest, removeRequest,
    addCandidate, updateCandidate, removeCandidate,
    addInterview, updateInterview, removeInterview,
    addComment,
  }
}
