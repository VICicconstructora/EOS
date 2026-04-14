// src/lib/useLegal.js — Procesos jurídicos: procesos, hitos, involucrados, documentos, bitácora
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const DEMO_PROCESSES = [
  { id: 1, company_id: 'ic-constructora', title: 'Promesa de CV — Lote Calle 80', type: 'promesa', lot_id: 1, status: 'en-proceso', priority: 'alta', start_date: '2026-03-01', due_date: '2026-04-30', closed_date: null, responsible: 'Carlos Martínez', external_lawyer: 'Dr. Andrés Vargas', law_firm: 'Vargas & Asociados', notary: 'Notaría 23 de Barranquilla', value: 1800000000, description: 'Promesa de compraventa del lote ubicado en Calle 80 #43-25. Área 1.850 m².', notes: 'Pendiente entrega de paz y salvo predial 2026 por parte del vendedor.', created_at: '2026-03-01T09:00:00Z', updated_at: '2026-03-01T09:00:00Z' },
  { id: 2, company_id: 'ic-constructora', title: 'Licencia de Construcción — Torre Mirador', type: 'licencia', lot_id: null, status: 'en-proceso', priority: 'alta', start_date: '2026-01-15', due_date: '2026-06-30', closed_date: null, responsible: 'Ana López', external_lawyer: 'Dra. Claudia Ruiz', law_firm: 'Ruiz Consultoría Jurídica', notary: '', value: 0, description: 'Trámite de licencia de construcción ante Curaduría Urbana #1. Radicado: CU-2026-0234.', notes: 'En revisión técnica por parte de Curaduría.', created_at: '2026-01-15T08:00:00Z', updated_at: '2026-01-15T08:00:00Z' },
  { id: 3, company_id: 'ic-constructora', title: 'Contrato Obra — Proyecto Buenavista', type: 'contrato', lot_id: null, status: 'aprobado', priority: 'media', start_date: '2026-03-15', due_date: '2027-03-15', closed_date: null, responsible: 'Ana López', external_lawyer: '', law_firm: '', notary: '', value: 4500000000, description: 'Contrato de obra por precio global fijo con Constructora XYZ S.A.S. para el Proyecto Buenavista.', notes: '', created_at: '2026-03-10T10:00:00Z', updated_at: '2026-03-15T09:00:00Z' },
]

const DEMO_MILESTONES = [
  { id: 1, process_id: 1, company_id: 'ic-constructora', title: 'Revisión estudio de títulos', due_date: '2026-03-15', completed: true, completed_date: '2026-03-14', completed_by: 'Dr. Andrés Vargas', notes: 'Sin gravámenes. Títulos limpios.', order_index: 1 },
  { id: 2, process_id: 1, company_id: 'ic-constructora', title: 'Firma promesa de compraventa', due_date: '2026-03-25', completed: true, completed_date: '2026-03-25', completed_by: 'Carlos Martínez', notes: '', order_index: 2 },
  { id: 3, process_id: 1, company_id: 'ic-constructora', title: 'Pago cuota inicial (30%)', due_date: '2026-03-30', completed: true, completed_date: '2026-03-28', completed_by: 'Laura Vega', notes: 'Transferencia $540M realizada exitosamente.', order_index: 3 },
  { id: 4, process_id: 1, company_id: 'ic-constructora', title: 'Entrega paz y salvo predial vendedor', due_date: '2026-04-15', completed: false, completed_date: null, completed_by: '', notes: 'Pendiente por parte de Inversiones Caribe S.A.S.', order_index: 4 },
  { id: 5, process_id: 1, company_id: 'ic-constructora', title: 'Escrituración ante notaría', due_date: '2026-04-30', completed: false, completed_date: null, completed_by: '', notes: '', order_index: 5 },
  { id: 6, process_id: 2, company_id: 'ic-constructora', title: 'Radicación documentos ante Curaduría', due_date: '2026-01-20', completed: true, completed_date: '2026-01-18', completed_by: 'Ana López', notes: '', order_index: 1 },
  { id: 7, process_id: 2, company_id: 'ic-constructora', title: 'Visita técnica de Curaduría', due_date: '2026-03-01', completed: true, completed_date: '2026-02-28', completed_by: 'Curaduría #1', notes: 'Observaciones menores subsanadas.', order_index: 2 },
  { id: 8, process_id: 2, company_id: 'ic-constructora', title: 'Expedición licencia de construcción', due_date: '2026-06-30', completed: false, completed_date: null, completed_by: '', notes: '', order_index: 3 },
]

const DEMO_PARTIES = [
  { id: 1, process_id: 1, company_id: 'ic-constructora', name: 'Carlos Martínez', role: 'Comprador', type: 'interno', email: 'carlos@icconstructora.com', phone: '+57 300 100 2000', notes: 'Representante legal IC Constructora' },
  { id: 2, process_id: 1, company_id: 'ic-constructora', name: 'Inversiones Caribe S.A.S.', role: 'Vendedor', type: 'externo', email: 'contacto@inversionescaribe.com', phone: '+57 300 111 2222', notes: '' },
  { id: 3, process_id: 1, company_id: 'ic-constructora', name: 'Dr. Andrés Vargas', role: 'Abogado comprador', type: 'externo', email: 'avargas@vargasasociados.com', phone: '+57 310 555 6666', notes: 'Vargas & Asociados' },
  { id: 4, process_id: 2, company_id: 'ic-constructora', name: 'Ana López', role: 'Solicitante', type: 'interno', email: 'ana@icconstructora.com', phone: '', notes: '' },
  { id: 5, process_id: 2, company_id: 'ic-constructora', name: 'Dra. Claudia Ruiz', role: 'Asesora jurídica', type: 'externo', email: 'cruiz@ruizconsultoria.com', phone: '+57 315 222 3333', notes: '' },
]

const DEMO_LEGAL_DOCS = [
  { id: 1, process_id: 1, company_id: 'ic-constructora', name: 'Estudio de títulos', category: 'juridico', file_url: '', file_name: 'estudio_titulos_calle80.pdf', uploaded_by: 'Dr. Andrés Vargas', version: '1.0', notes: '', created_at: '2026-03-14T10:00:00Z' },
  { id: 2, process_id: 1, company_id: 'ic-constructora', name: 'Promesa de compraventa firmada', category: 'contrato', file_url: '', file_name: 'promesa_cv_calle80_firmada.pdf', uploaded_by: 'Carlos Martínez', version: '1.0', notes: '', created_at: '2026-03-25T16:00:00Z' },
]

const DEMO_LEGAL_COMMENTS = [
  { id: 1, process_id: 1, company_id: 'ic-constructora', author: 'Dr. Andrés Vargas', content: 'Estudio de títulos completado. El inmueble no tiene hipotecas ni embargos. Procede la operación.', type: 'decision', created_at: '2026-03-14T10:00:00Z' },
  { id: 2, process_id: 1, company_id: 'ic-constructora', author: 'Carlos Martínez', content: 'Promesa firmada por ambas partes. Cuota inicial ($540M) transferida el 28/03.', type: 'nota', created_at: '2026-03-28T15:00:00Z' },
  { id: 3, process_id: 1, company_id: 'ic-constructora', author: 'Dr. Andrés Vargas', content: 'ALERTA: El vendedor no ha entregado el paz y salvo predial 2026. Sin este documento no podemos escriturar antes del 30/04.', type: 'alerta', created_at: '2026-04-05T09:00:00Z' },
]

export function useLegal() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [localProcesses,  setLocalProcesses]  = useLocalStorage('legal_processes',  DEMO_PROCESSES)
  const [localMilestones, setLocalMilestones] = useLocalStorage('legal_milestones', DEMO_MILESTONES)
  const [localParties,    setLocalParties]    = useLocalStorage('legal_parties',    DEMO_PARTIES)
  const [localDocs,       setLocalDocs]       = useLocalStorage('legal_docs',       DEMO_LEGAL_DOCS)
  const [localComments,   setLocalComments]   = useLocalStorage('legal_comments',   DEMO_LEGAL_COMMENTS)

  const [sbProcesses,  setSbProcesses]  = useState(null)
  const [sbMilestones, setSbMilestones] = useState(null)
  const [sbParties,    setSbParties]    = useState(null)
  const [sbDocs,       setSbDocs]       = useState(null)
  const [sbComments,   setSbComments]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return
    setLoading(true)
    Promise.all([
      supabase.from('legal_processes').select('*').eq('company_id', 'ic-constructora').order('created_at', { ascending: false }),
      supabase.from('legal_milestones').select('*').eq('company_id', 'ic-constructora').order('order_index', { ascending: true }),
      supabase.from('legal_parties').select('*').eq('company_id', 'ic-constructora'),
      supabase.from('legal_documents').select('*').eq('company_id', 'ic-constructora').order('created_at', { ascending: false }),
      supabase.from('legal_comments').select('*').eq('company_id', 'ic-constructora').order('created_at', { ascending: true }),
    ]).then(([proc, mile, party, docs, comm]) => {
      setSbProcesses(proc.data ?? [])
      setSbMilestones(mile.data ?? [])
      setSbParties(party.data ?? [])
      setSbDocs(docs.data ?? [])
      setSbComments(comm.data ?? [])
      setLoading(false)
    })
  }, [isSupabaseConfigured, isDemoMode])

  const isLive = isSupabaseConfigured && !isDemoMode
  const processes  = isLive ? (sbProcesses  ?? []) : localProcesses
  const milestones = isLive ? (sbMilestones ?? []) : localMilestones
  const parties    = isLive ? (sbParties    ?? []) : localParties
  const documents  = isLive ? (sbDocs       ?? []) : localDocs
  const comments   = isLive ? (sbComments   ?? []) : localComments

  // --- Processes ---
  const addProcess = useCallback(async (proc) => {
    const base = { ...proc, company_id: 'ic-constructora', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    if (isLive) {
      const { data, error } = await supabase.from('legal_processes').insert([base]).select().single()
      if (!error && data) setSbProcesses(prev => [data, ...(prev ?? [])])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalProcesses(prev => [r, ...prev])
      return r
    }
  }, [isLive, setLocalProcesses])

  const updateProcess = useCallback(async (updated) => {
    const upd = { ...updated, updated_at: new Date().toISOString() }
    if (isLive) {
      const { id, company_id, created_at, ...data } = upd
      const { data: row } = await supabase.from('legal_processes').update(data).eq('id', id).select().single()
      if (row) setSbProcesses(prev => prev.map(p => p.id === id ? row : p))
    } else {
      setLocalProcesses(prev => prev.map(p => p.id === upd.id ? { ...p, ...upd } : p))
    }
  }, [isLive, setLocalProcesses])

  const removeProcess = useCallback(async (id) => {
    if (isLive) {
      await supabase.from('legal_processes').delete().eq('id', id)
      setSbProcesses(prev => prev.filter(p => p.id !== id))
    } else {
      setLocalProcesses(prev => prev.filter(p => p.id !== id))
    }
  }, [isLive, setLocalProcesses])

  // --- Milestones ---
  const addMilestone = useCallback(async (mile) => {
    const base = { ...mile, company_id: 'ic-constructora' }
    if (isLive) {
      const { data, error } = await supabase.from('legal_milestones').insert([base]).select().single()
      if (!error && data) setSbMilestones(prev => [...(prev ?? []), data])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalMilestones(prev => [...prev, r])
      return r
    }
  }, [isLive, setLocalMilestones])

  const updateMilestone = useCallback(async (updated) => {
    if (isLive) {
      const { id, company_id, ...data } = updated
      const { data: row } = await supabase.from('legal_milestones').update(data).eq('id', id).select().single()
      if (row) setSbMilestones(prev => prev.map(m => m.id === id ? row : m))
    } else {
      setLocalMilestones(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
    }
  }, [isLive, setLocalMilestones])

  const removeMilestone = useCallback(async (id) => {
    if (isLive) {
      await supabase.from('legal_milestones').delete().eq('id', id)
      setSbMilestones(prev => prev.filter(m => m.id !== id))
    } else {
      setLocalMilestones(prev => prev.filter(m => m.id !== id))
    }
  }, [isLive, setLocalMilestones])

  // --- Parties ---
  const addParty = useCallback(async (party) => {
    const base = { ...party, company_id: 'ic-constructora' }
    if (isLive) {
      const { data, error } = await supabase.from('legal_parties').insert([base]).select().single()
      if (!error && data) setSbParties(prev => [...(prev ?? []), data])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalParties(prev => [...prev, r])
      return r
    }
  }, [isLive, setLocalParties])

  const removeParty = useCallback(async (id) => {
    if (isLive) {
      await supabase.from('legal_parties').delete().eq('id', id)
      setSbParties(prev => prev.filter(p => p.id !== id))
    } else {
      setLocalParties(prev => prev.filter(p => p.id !== id))
    }
  }, [isLive, setLocalParties])

  // --- Documents ---
  const addDocument = useCallback(async (doc) => {
    const base = { ...doc, company_id: 'ic-constructora', created_at: new Date().toISOString() }
    if (isLive) {
      const { data, error } = await supabase.from('legal_documents').insert([base]).select().single()
      if (!error && data) setSbDocs(prev => [data, ...(prev ?? [])])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalDocs(prev => [r, ...prev])
      return r
    }
  }, [isLive, setLocalDocs])

  const removeDocument = useCallback(async (id) => {
    if (isLive) {
      await supabase.from('legal_documents').delete().eq('id', id)
      setSbDocs(prev => prev.filter(d => d.id !== id))
    } else {
      setLocalDocs(prev => prev.filter(d => d.id !== id))
    }
  }, [isLive, setLocalDocs])

  // --- Comments ---
  const addComment = useCallback(async (comm) => {
    const base = { ...comm, company_id: 'ic-constructora', created_at: new Date().toISOString() }
    if (isLive) {
      const { data, error } = await supabase.from('legal_comments').insert([base]).select().single()
      if (!error && data) setSbComments(prev => [...(prev ?? []), data])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalComments(prev => [...prev, r])
      return r
    }
  }, [isLive, setLocalComments])

  return {
    processes, milestones, parties, documents, comments, loading,
    addProcess, updateProcess, removeProcess,
    addMilestone, updateMilestone, removeMilestone,
    addParty, removeParty,
    addDocument, removeDocument,
    addComment,
  }
}
