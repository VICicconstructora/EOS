// src/lib/useAlarms.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const DEMO_ALARMS = [
  {
    id: 'demo-alarm-1',
    company_id: 'ic-constructora',
    external_id: 'reserva-de-oporto::E1::credito',
    project: 'reserva-de-oporto',
    category: 'credito',
    etapa: 'E1',
    detail: 'DAVIVIENDA, vence 2026-05-08 (-1 días)',
    severity: 'alta',
    expires_at: '2026-05-08',
    dias: -1,
    status: 'active',
    acknowledged_by: '',
    acknowledged_at: null,
    created_at: '2026-05-09T00:00:00Z',
  },
  {
    id: 'demo-alarm-2',
    company_id: 'ic-constructora',
    external_id: 'reserva-de-oporto::E2::credito',
    project: 'reserva-de-oporto',
    category: 'credito',
    etapa: 'E2',
    detail: 'DAVIVIENDA, vence 2026-05-08 (-1 días)',
    severity: 'alta',
    expires_at: '2026-05-08',
    dias: -1,
    status: 'active',
    acknowledged_by: '',
    acknowledged_at: null,
    created_at: '2026-05-09T00:00:00Z',
  },
  {
    id: 'demo-alarm-3',
    company_id: 'ic-constructora',
    external_id: 'bosque-central::E1::poliza_tr',
    project: 'bosque-central',
    category: 'poliza_tr',
    etapa: 'E1',
    detail: 'SURA, vence 2024-04-30 (-739 días)',
    severity: 'alta',
    expires_at: '2024-04-30',
    dias: -739,
    status: 'active',
    acknowledged_by: '',
    acknowledged_at: null,
    created_at: '2026-05-09T00:00:00Z',
  },
  {
    id: 'demo-alarm-4',
    company_id: 'ic-constructora',
    external_id: 'well::E1::poliza_tr',
    project: 'well',
    category: 'poliza_tr',
    etapa: 'E1',
    detail: 'Seguros Mundial, vence 2026-05-14 (5 días)',
    severity: 'media',
    expires_at: '2026-05-14',
    dias: 5,
    status: 'active',
    acknowledged_by: '',
    acknowledged_at: null,
    created_at: '2026-05-09T00:00:00Z',
  },
  {
    id: 'demo-alarm-5',
    company_id: 'ic-constructora',
    external_id: 'castilla-living::E1B::poliza_tr',
    project: 'castilla-living',
    category: 'poliza_tr',
    etapa: 'E1B',
    detail: 'SURA, vence 2026-05-20 (11 días)',
    severity: 'media',
    expires_at: '2026-05-20',
    dias: 11,
    status: 'active',
    acknowledged_by: '',
    acknowledged_at: null,
    created_at: '2026-05-09T00:00:00Z',
  },
  {
    id: 'demo-alarm-6',
    company_id: 'ic-constructora',
    external_id: 'la-hacienda-jamundi::E1::credito',
    project: 'la-hacienda-jamundi',
    category: 'credito',
    etapa: 'E1',
    detail: 'DAVIVIENDA, vence 2026-06-01 (23 días)',
    severity: 'media',
    expires_at: '2026-06-01',
    dias: 23,
    status: 'active',
    acknowledged_by: '',
    acknowledged_at: null,
    created_at: '2026-05-09T00:00:00Z',
  },
]

export function useAlarms() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [alarms, setAlarms] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || isDemoMode) {
      setAlarms(DEMO_ALARMS)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('alarms')
      .select('*')
      .eq('company_id', 'ic-constructora')
      .in('status', ['active', 'acknowledged'])
      .order('dias', { ascending: true })
    if (!error) setAlarms(data ?? [])
    setLoading(false)
  }, [isSupabaseConfigured, isDemoMode])

  useEffect(() => { load() }, [load])

  const acknowledge = useCallback(async (id, userEmail = '') => {
    if (isDemoMode) {
      setAlarms(prev =>
        prev.map(a =>
          a.id === id
            ? { ...a, status: 'acknowledged', acknowledged_by: userEmail, acknowledged_at: new Date().toISOString() }
            : a
        )
      )
      return
    }
    await supabase
      .from('alarms')
      .update({
        status: 'acknowledged',
        acknowledged_by: userEmail,
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    load()
  }, [isDemoMode, load])

  // Alarmas activas 🔴 — para badge y modal de login
  const countCritical = alarms.filter(a => a.status === 'active' && a.severity === 'alta').length
  const countAll      = alarms.filter(a => a.status === 'active').length

  return { alarms, loading, acknowledge, reload: load, countCritical, countAll }
}
