// src/lib/useLots.js — Lotes: seguimiento de lotes y proyectos inmobiliarios
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const DEMO_LOTS = [
  { id: 1, company_id: 'ic-constructora', name: 'Lote Calle 80 — Barranquilla', address: 'Calle 80 #43-25, Barranquilla', area: 1850, status: 'analisis', owner_name: 'Inversiones Caribe S.A.S.', owner_phone: '+57 300 111 2222', owner_email: 'contacto@inversionescaribe.com', norm: 'Zona Residencial R3 — POT Barranquilla 2022. Índice de ocupación 0.6, índice de construcción 3.0.', units: 120, use_type: 'residencial', structure_type: 'Concreto aporticado', structure_designer: 'Ing. Roberto Sánchez', finishes: 'Estrato 4-5: pisos porcelanato, cocina integral, ventanería aluminio termopanel.', notes: 'Lote con excelente ubicación. Pendiente estudio de suelos y consulta urbanística para altura máxima.', created_at: '2026-02-15T10:00:00Z', updated_at: '2026-02-15T10:00:00Z' },
  { id: 2, company_id: 'ic-constructora', name: 'Lote Av. Circunvalar', address: 'Av. Circunvalar #23-10, Barranquilla', area: 3200, status: 'prospecto', owner_name: 'Familia Torres Méndez', owner_phone: '+57 315 444 5555', owner_email: '', norm: 'Por definir — consulta urbanística pendiente', units: 200, use_type: 'mixto', structure_type: 'Por definir', structure_designer: '', finishes: 'Por definir', notes: 'Contacto inicial con propietario. Precio pedido elevado, requiere negociación.', created_at: '2026-03-20T10:00:00Z', updated_at: '2026-03-20T10:00:00Z' },
]

const DEMO_ADVISORS = [
  { id: 1, lot_id: 1, company_id: 'ic-constructora', type: 'Estructural', name: 'Roberto Sánchez', company: 'RS Ingeniería', phone: '+57 311 333 4444', email: 'roberto@rsingenieria.com', notes: '' },
  { id: 2, lot_id: 1, company_id: 'ic-constructora', type: 'Suelos', name: 'Luis Gómez', company: 'GeoEstudio S.A.', phone: '+57 315 555 6666', email: 'luis@geoestudio.com', notes: 'Pendiente entrega estudio de suelos — semana del 20/04' },
  { id: 3, lot_id: 1, company_id: 'ic-constructora', type: 'Arquitecto', name: 'Sofía Méndez', company: 'Arq. Méndez & Asociados', phone: '+57 320 777 8888', email: 'sofia@arqmendez.com', notes: '' },
]

const DEMO_PARTNERS = [
  { id: 1, lot_id: 1, company_id: 'ic-constructora', role: 'Comercializador', name: 'Propiedades del Caribe', contact: 'Jorge Ramos', phone: '+57 304 999 0000', email: 'jorge@propiedadescaribe.com', participation: 5, notes: 'Comisión del 5% sobre ventas netas' },
  { id: 2, lot_id: 1, company_id: 'ic-constructora', role: 'Inversionista', name: 'Familia Torres', contact: 'Pedro Torres', phone: '+57 301 111 3333', email: 'ptorres@gmail.com', participation: 30, notes: 'Aporte: terreno + capital inicial del proyecto' },
]

const DEMO_SCENARIOS = [
  { id: 1, lot_id: 1, company_id: 'ic-constructora', name: 'Escenario Base', version: 1, is_active: true, land_cost: 1800000000, construction_cost: 3500000000, total_units: 120, sale_price_per_unit: 48000000, total_revenue: 5760000000, gross_margin: 460000000, roi: 10.2, irr: 18.5, payback_months: 36, cash_flow_notes: 'Flujo positivo desde el mes 18. Punto de equilibrio en 60 unidades vendidas.', observations: 'Escenario conservador: ritmo de ventas de 5 unidades/mes.', created_by: 'Ana López', created_at: '2026-02-20T10:00:00Z' },
  { id: 2, lot_id: 1, company_id: 'ic-constructora', name: 'Escenario Optimista', version: 1, is_active: false, land_cost: 1800000000, construction_cost: 3500000000, total_units: 120, sale_price_per_unit: 52000000, total_revenue: 6240000000, gross_margin: 940000000, roi: 21.5, irr: 28.3, payback_months: 28, cash_flow_notes: 'Ritmo de ventas de 8 unidades/mes. Lanzamiento con preventa anticipada al 30%.', observations: 'Requiere mayor inversión en marketing y refuerzo del equipo comercial.', created_by: 'Ana López', created_at: '2026-02-22T14:00:00Z' },
]

const DEMO_LOT_DOCS = [
  { id: 1, lot_id: 1, company_id: 'ic-constructora', name: 'Escritura del lote', category: 'escritura', file_url: '', file_name: 'escritura_calle80.pdf', uploaded_by: 'Ana López', notes: '', created_at: '2026-02-15T11:00:00Z' },
  { id: 2, lot_id: 1, company_id: 'ic-constructora', name: 'Plano topográfico', category: 'planos', file_url: '', file_name: 'topografia_calle80.pdf', uploaded_by: 'Ana López', notes: '', created_at: '2026-02-18T09:00:00Z' },
]

export function useLots() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [localLots,      setLocalLots]      = useLocalStorage('lots_data',      DEMO_LOTS)
  const [localAdvisors,  setLocalAdvisors]  = useLocalStorage('lots_advisors',  DEMO_ADVISORS)
  const [localPartners,  setLocalPartners]  = useLocalStorage('lots_partners',  DEMO_PARTNERS)
  const [localScenarios, setLocalScenarios] = useLocalStorage('lots_scenarios', DEMO_SCENARIOS)
  const [localDocs,      setLocalDocs]      = useLocalStorage('lots_documents', DEMO_LOT_DOCS)

  const [sbLots,      setSbLots]      = useState(null)
  const [sbAdvisors,  setSbAdvisors]  = useState(null)
  const [sbPartners,  setSbPartners]  = useState(null)
  const [sbScenarios, setSbScenarios] = useState(null)
  const [sbDocs,      setSbDocs]      = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return
    setLoading(true)
    Promise.all([
      supabase.from('lots').select('*').eq('company_id', 'ic-constructora').order('created_at', { ascending: false }),
      supabase.from('lot_advisors').select('*').eq('company_id', 'ic-constructora'),
      supabase.from('lot_partners').select('*').eq('company_id', 'ic-constructora'),
      supabase.from('lot_scenarios').select('*').eq('company_id', 'ic-constructora').order('created_at', { ascending: true }),
      supabase.from('lot_documents').select('*').eq('company_id', 'ic-constructora').order('created_at', { ascending: false }),
    ]).then(([lots, adv, part, scen, docs]) => {
      setSbLots(lots.data ?? [])
      setSbAdvisors(adv.data ?? [])
      setSbPartners(part.data ?? [])
      setSbScenarios(scen.data ?? [])
      setSbDocs(docs.data ?? [])
      setLoading(false)
    })
  }, [isSupabaseConfigured, isDemoMode])

  const isLive = isSupabaseConfigured && !isDemoMode
  const lots      = isLive ? (sbLots      ?? []) : localLots
  const advisors  = isLive ? (sbAdvisors  ?? []) : localAdvisors
  const partners  = isLive ? (sbPartners  ?? []) : localPartners
  const scenarios = isLive ? (sbScenarios ?? []) : localScenarios
  const documents = isLive ? (sbDocs      ?? []) : localDocs

  // --- Lots ---
  const addLot = useCallback(async (lot) => {
    const base = { ...lot, company_id: 'ic-constructora', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    if (isLive) {
      const { data, error } = await supabase.from('lots').insert([base]).select().single()
      if (!error && data) setSbLots(prev => [data, ...(prev ?? [])])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalLots(prev => [r, ...prev])
      return r
    }
  }, [isLive, setLocalLots])

  const updateLot = useCallback(async (updated) => {
    const upd = { ...updated, updated_at: new Date().toISOString() }
    if (isLive) {
      const { id, company_id, created_at, ...data } = upd
      const { data: row } = await supabase.from('lots').update(data).eq('id', id).select().single()
      if (row) setSbLots(prev => prev.map(l => l.id === id ? row : l))
    } else {
      setLocalLots(prev => prev.map(l => l.id === upd.id ? { ...l, ...upd } : l))
    }
  }, [isLive, setLocalLots])

  const removeLot = useCallback(async (id) => {
    if (isLive) {
      await supabase.from('lots').delete().eq('id', id)
      setSbLots(prev => prev.filter(l => l.id !== id))
    } else {
      setLocalLots(prev => prev.filter(l => l.id !== id))
    }
  }, [isLive, setLocalLots])

  // --- Advisors ---
  const addAdvisor = useCallback(async (adv) => {
    const base = { ...adv, company_id: 'ic-constructora' }
    if (isLive) {
      const { data, error } = await supabase.from('lot_advisors').insert([base]).select().single()
      if (!error && data) setSbAdvisors(prev => [...(prev ?? []), data])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalAdvisors(prev => [...prev, r])
      return r
    }
  }, [isLive, setLocalAdvisors])

  const removeAdvisor = useCallback(async (id) => {
    if (isLive) {
      await supabase.from('lot_advisors').delete().eq('id', id)
      setSbAdvisors(prev => prev.filter(a => a.id !== id))
    } else {
      setLocalAdvisors(prev => prev.filter(a => a.id !== id))
    }
  }, [isLive, setLocalAdvisors])

  // --- Partners ---
  const addPartner = useCallback(async (partner) => {
    const base = { ...partner, company_id: 'ic-constructora' }
    if (isLive) {
      const { data, error } = await supabase.from('lot_partners').insert([base]).select().single()
      if (!error && data) setSbPartners(prev => [...(prev ?? []), data])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalPartners(prev => [...prev, r])
      return r
    }
  }, [isLive, setLocalPartners])

  const removePartner = useCallback(async (id) => {
    if (isLive) {
      await supabase.from('lot_partners').delete().eq('id', id)
      setSbPartners(prev => prev.filter(p => p.id !== id))
    } else {
      setLocalPartners(prev => prev.filter(p => p.id !== id))
    }
  }, [isLive, setLocalPartners])

  // --- Scenarios ---
  const addScenario = useCallback(async (scen) => {
    const base = { ...scen, company_id: 'ic-constructora', created_at: new Date().toISOString() }
    if (isLive) {
      const { data, error } = await supabase.from('lot_scenarios').insert([base]).select().single()
      if (!error && data) setSbScenarios(prev => [...(prev ?? []), data])
      return data
    } else {
      const r = { ...base, id: Date.now() }
      setLocalScenarios(prev => [...prev, r])
      return r
    }
  }, [isLive, setLocalScenarios])

  const updateScenario = useCallback(async (updated) => {
    if (isLive) {
      const { id, company_id, created_at, ...data } = updated
      const { data: row } = await supabase.from('lot_scenarios').update(data).eq('id', id).select().single()
      if (row) setSbScenarios(prev => prev.map(s => s.id === id ? row : s))
    } else {
      setLocalScenarios(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
    }
  }, [isLive, setLocalScenarios])

  const removeScenario = useCallback(async (id) => {
    if (isLive) {
      await supabase.from('lot_scenarios').delete().eq('id', id)
      setSbScenarios(prev => prev.filter(s => s.id !== id))
    } else {
      setLocalScenarios(prev => prev.filter(s => s.id !== id))
    }
  }, [isLive, setLocalScenarios])

  // --- Documents ---
  const addDocument = useCallback(async (doc) => {
    const base = { ...doc, company_id: 'ic-constructora', created_at: new Date().toISOString() }
    if (isLive) {
      const { data, error } = await supabase.from('lot_documents').insert([base]).select().single()
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
      await supabase.from('lot_documents').delete().eq('id', id)
      setSbDocs(prev => prev.filter(d => d.id !== id))
    } else {
      setLocalDocs(prev => prev.filter(d => d.id !== id))
    }
  }, [isLive, setLocalDocs])

  return {
    lots, advisors, partners, scenarios, documents, loading,
    addLot, updateLot, removeLot,
    addAdvisor, removeAdvisor,
    addPartner, removePartner,
    addScenario, updateScenario, removeScenario,
    addDocument, removeDocument,
  }
}
