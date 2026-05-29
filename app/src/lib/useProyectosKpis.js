import { useState, useEffect } from 'react'
import { supabaseIc, isIcConfigured } from './supabaseIc'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const DEMO_KPIS = [
  { proyecto: 'Bosque Central Vivienda', fecha_datos: '2026-03-01', ventas_un: 378, ventas_cop: 145200000000, credito_ingresos: 35100600592, cupo_credito: 91000000000, cubrimiento_pct: 38.6 },
  { proyecto: 'Castilla Imperial 2B',   fecha_datos: '2026-03-01', ventas_un: 189, ventas_cop: 68400000000,  credito_ingresos: 9941390330,  cupo_credito: 54000000000, cubrimiento_pct: 18.4 },
  { proyecto: 'Castilla Living',        fecha_datos: '2026-03-01', ventas_un: 463, ventas_cop: 90633953250,  credito_ingresos: 0,           cupo_credito: 65000000000, cubrimiento_pct: null },
  { proyecto: 'Gaia',                   fecha_datos: '2026-03-01', ventas_un: 24,  ventas_cop: 12800000000,  credito_ingresos: 0,           cupo_credito: 48000000000, cubrimiento_pct: null },
  { proyecto: 'La Hacienda E1',         fecha_datos: '2026-03-01', ventas_un: 147, ventas_cop: 52100000000,  credito_ingresos: 0,           cupo_credito: 28000000000, cubrimiento_pct: null },
  { proyecto: 'Praia E1',               fecha_datos: '2026-03-01', ventas_un: 104, ventas_cop: 38700000000,  credito_ingresos: 0,           cupo_credito: 35000000000, cubrimiento_pct: null },
  { proyecto: 'Reserva De Oporto E 1-2',fecha_datos: '2026-03-01', ventas_un: 512, ventas_cop: 196400000000, credito_ingresos: 0,           cupo_credito: 110000000000, cubrimiento_pct: null },
  { proyecto: 'WELL',                   fecha_datos: '2026-04-01', ventas_un: 298, ventas_cop: 114900000000, credito_ingresos: 18200000000, cupo_credito: 75000000000, cubrimiento_pct: 24.3 },
]

const DEMO_ALARMS = [
  { project: 'reserva-de-oporto', severity: 'alta',  category: 'credito' },
  { project: 'reserva-de-oporto', severity: 'alta',  category: 'credito' },
  { project: 'bosque-central',    severity: 'alta',  category: 'poliza_tr' },
  { project: 'well',              severity: 'media', category: 'poliza_tr' },
  { project: 'castilla-living',   severity: 'media', category: 'poliza_tr' },
  { project: 'la-hacienda-jamundi', severity: 'media', category: 'credito' },
]

export function useProyectosKpis() {
  const { isDemoMode } = useApp()
  const [kpis, setKpis]     = useState([])
  const [alarms, setAlarms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (isDemoMode || !isIcConfigured) {
      setKpis(DEMO_KPIS)
      setAlarms(DEMO_ALARMS)
      setLoading(false)
      return
    }

    async function load() {
      setLoading(true)
      const [kpisRes, alarmsRes] = await Promise.all([
        supabaseIc.from('mv_proyectos_kpis').select('*'),
        supabase
          ? supabase.from('alarms').select('project,severity,category,status').eq('company_id', 'ic-constructora').eq('status', 'active')
          : Promise.resolve({ data: [], error: null }),
      ])

      if (kpisRes.error) {
        setError(kpisRes.error.message)
        setLoading(false)
        return
      }

      setKpis((kpisRes.data || []).map(r => ({
        ...r,
        ventas_un:        Number(r.ventas_un),
        ventas_cop:       Number(r.ventas_cop),
        credito_ingresos: Number(r.credito_ingresos),
        cupo_credito:     Number(r.cupo_credito),
        cubrimiento_pct:  r.cubrimiento_pct !== null ? Number(r.cubrimiento_pct) : null,
      })))
      setAlarms(alarmsRes.data || [])
      setLoading(false)
    }

    load()
  }, [isDemoMode])

  return { kpis, alarms, loading, error }
}
