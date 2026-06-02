// src/lib/useWikiProposals.js
// Cola de propuestas que VIC encola para alimentar el wiki (public.wiki_proposals).
// El curador (CEO/admin) las aprueba o rechaza aquí; la ingesta al wiki real es
// un paso local separado (skill wikiingesta) sobre las marcadas 'aprobada'.
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const DEMO_PROPOSALS = [
  {
    id: 'demo-prop-1',
    company_id: 'ic-constructora',
    tipo: 'persona',
    entidad_objetivo: 'wiki/personas/mayra-nathalia-martinez-mejia.md',
    contenido: 'Mayra Nathalia Martínez coordina la pauta digital de los proyectos Azul Celeste y Gaia.',
    cita_textual: 'yo llevo la pauta digital de Azul Celeste y Gaia',
    confianza: 'alta',
    area: 'Experiencia',
    propuesto_por: 'mmartinez@icconstructora.co',
    estado: 'pendiente',
    revisado_por: null,
    nota_revision: null,
    revisado_at: null,
    created_at: '2026-06-02T22:30:00Z',
  },
  {
    id: 'demo-prop-2',
    company_id: 'ic-constructora',
    tipo: 'proyecto',
    entidad_objetivo: null,
    contenido: 'El proyecto en estructuración X arranca lanzamiento comercial en Q3 2026.',
    cita_textual: 'lanzamos el proyecto nuevo el próximo trimestre',
    confianza: 'media',
    area: 'Desarrollo',
    propuesto_por: 'erozo@icconstructora.co',
    estado: 'pendiente',
    revisado_por: null,
    nota_revision: null,
    revisado_at: null,
    created_at: '2026-06-02T23:00:00Z',
  },
]

export function useWikiProposals() {
  const { isDemoMode, isSupabaseConfigured, user } = useApp()
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || isDemoMode) {
      setProposals(DEMO_PROPOSALS)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('wiki_proposals')
      .select('*')
      .eq('company_id', 'ic-constructora')
      .order('created_at', { ascending: false })
    if (!error) setProposals(data ?? [])
    setLoading(false)
  }, [isSupabaseConfigured, isDemoMode])

  useEffect(() => { load() }, [load])

  // Cambia el estado de una propuesta (aprobada/rechazada/ingerida) y registra
  // quién y cuándo. nota es opcional (motivo del rechazo / ajuste al aprobar).
  const setEstado = useCallback(async (id, estado, nota = null) => {
    const revisado_por = user?.email || ''
    const revisado_at = new Date().toISOString()

    if (isDemoMode) {
      setProposals(prev =>
        prev.map(p =>
          p.id === id ? { ...p, estado, nota_revision: nota, revisado_por, revisado_at } : p
        )
      )
      return
    }
    await supabase
      .from('wiki_proposals')
      .update({ estado, nota_revision: nota, revisado_por, revisado_at })
      .eq('id', id)
    load()
  }, [isDemoMode, load, user])

  const approve     = useCallback((id, nota) => setEstado(id, 'aprobada', nota), [setEstado])
  const reject      = useCallback((id, nota) => setEstado(id, 'rechazada', nota), [setEstado])
  // Cierre del ciclo: tras exportar e ingestar al wiki con /wikiingesta, el
  // curador confirma que quedó incorporada marcándola 'ingerida'.
  const markIngested = useCallback((id) => setEstado(id, 'ingerida'), [setEstado])

  const countPending = proposals.filter(p => p.estado === 'pendiente').length

  return { proposals, loading, approve, reject, markIngested, reload: load, countPending }
}
