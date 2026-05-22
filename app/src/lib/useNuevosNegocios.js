// src/lib/useNuevosNegocios.js
// Hook que carga los 3 nuevos negocios del trimestre desde una tabla CRM
// Retorna: nombre, promesa $, escritura $, status, histórico últimos 3 meses

import { useEffect, useState } from 'react'
import { supabaseIc, isIcConfigured } from './supabaseIc'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const monthLabel = (isoDate) => {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  return MONTHS[d.getUTCMonth()]
}

const statusColor = (status) => {
  // status: 'on-track' | 'at-risk' | 'stalled'
  switch (status) {
    case 'on-track':
      return 'var(--status-success)'
    case 'at-risk':
      return 'var(--status-warning)'
    case 'stalled':
      return 'var(--status-error)'
    default:
      return 'var(--text-muted)'
  }
}

export function useNuevosNegocios() {
  const [negocios, setNegocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isIcConfigured) {
      setError(new Error('Supabase IC no configurado'))
      setLoading(false)
      return
    }

    let alive = true

    ;(async () => {
      try {
        setLoading(true)

        // Consultar nuevos negocios del trimestre
        // Tabla esperada: nuevos_negocios con campos:
        // - id, nombre, promesa_mm, escritura_mm, status, created_at
        const { data: negs, error: err } = await supabaseIc
          .from('nuevos_negocios')
          .select('*')
          .eq('estado', 'activo')
          .order('created_at', { ascending: false })
          .limit(3)

        if (err) throw err
        if (!alive) return

        // Para cada negocio, obtener el histórico de últimos 3 meses
        const enrichedNegocios = await Promise.all(
          negs.map(async (neg) => {
            const { data: hist, error: histErr } = await supabaseIc
              .from('nuevos_negocios_historico')
              .select('mes, promesa_mm, escritura_mm')
              .eq('negocio_id', neg.id)
              .order('mes', { ascending: false })
              .limit(3)

            const history = !histErr
              ? hist.map(h => ({
                  mes: monthLabel(h.mes),
                  promesa: h.promesa_mm || 0,
                  escritura: h.escritura_mm || 0,
                }))
              : []

            return {
              id: neg.id,
              nombre: neg.nombre,
              promesaMM: neg.promesa_mm || 0,
              escrituraMM: neg.escritura_mm || 0,
              status: neg.status || 'at-risk',
              statusColor: statusColor(neg.status),
              owner: neg.owner_name || 'Por asignar',
              history,
            }
          })
        )

        if (alive) {
          setNegocios(enrichedNegocios)
          setLoading(false)
        }
      } catch (e) {
        console.error('useNuevosNegocios error:', e)
        if (alive) {
          setError(e)
          setLoading(false)
        }
      }
    })()

    return () => { alive = false }
  }, [])

  return {
    negocios,
    loading,
    error,
    isConfigured: isIcConfigured,
  }
}
