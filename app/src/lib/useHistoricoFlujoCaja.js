// src/lib/useHistoricoFlujoCaja.js
// Hook que carga el flujo de caja histórico (películas mensuales × proyectos)
// desde Supabase IC. Retorna una estructura optimizada para tabla con scroll horizontal.

import { useEffect, useState } from 'react'
import { supabaseIc, isIcConfigured } from './supabaseIc'

const PROYECTOS_ACTIVOS = [
  'Bosque Central',
  'Gaia',
  'Praia Natura',
  'Primera Este',
  'Castilla Imperial',
  'Castilla Living',
  'La Hacienda',
  'Reserva De Oporto',
]

// Convierte "2025-01" a "Ene 2025" o similar
const formatMovie = (isoMonth) => {
  if (!isoMonth) return ''
  const [year, month] = isoMonth.split('-')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const m = parseInt(month) - 1
  return `${months[m]} ${year}`
}

export function useHistoricoFlujoCaja() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [movies, setMovies] = useState([])
  const [projects, setProjects] = useState([])

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

        // Consultar histórico de flujo de caja
        // Esperamos una vista o tabla con: proyecto, mes, flujo_caja_mm
        const { data: historico, error: err } = await supabaseIc
          .from('historico_flujo_caja') // Nombre de tabla/vista a definir
          .select('proyecto, mes, flujo_caja_mm, tipo')
          .order('mes', { ascending: false })

        if (err) throw err
        if (!alive) return

        // Organizar: películas (meses) × proyectos
        const movies_ = new Set()
        const projects_ = new Set()
        const matrix = {} // { "proyecto|mes": flujo_mm }

        historico.forEach(row => {
          movies_.add(row.mes)
          projects_.add(row.proyecto)
          const key = `${row.proyecto}|${row.mes}`
          matrix[key] = {
            valor: row.flujo_caja_mm || 0,
            tipo: row.tipo || 'historico', // 'historico' | 'proyectado'
          }
        })

        // Ordenar películas (meses) descendentes (más recientes primero)
        const sortedMovies = Array.from(movies_).sort().reverse()

        // Filtrar proyectos activos o incluir todos
        const sortedProjects = Array.from(projects_).sort((a, b) =>
          PROYECTOS_ACTIVOS.indexOf(a) - PROYECTOS_ACTIVOS.indexOf(b)
        )

        // Construir árbol de datos para renderizar
        const treeData = sortedProjects.map(proj => {
          const row = { proyecto: proj, valores: {} }
          sortedMovies.forEach(mes => {
            const key = `${proj}|${mes}`
            row.valores[mes] = matrix[key] || { valor: 0, tipo: 'historico' }
          })
          return row
        })

        if (alive) {
          setMovies(sortedMovies)
          setProjects(sortedProjects)
          setData(treeData)
          setLoading(false)
        }
      } catch (e) {
        console.error('useHistoricoFlujoCaja error:', e)
        if (alive) {
          setError(e)
          setLoading(false)
        }
      }
    })()

    return () => { alive = false }
  }, [])

  return {
    data,
    movies: movies.map(m => ({ key: m, label: formatMovie(m) })),
    projects,
    loading,
    error,
    isConfigured: isIcConfigured,
  }
}
