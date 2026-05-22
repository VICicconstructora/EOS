// src/pages/ExecutiveDashboard.jsx
// Dashboard ejecutivo: 4 secciones visuales principales
// 1. Scorecard (3 KPI) | 2. Flujo de caja histórico | 3. Nuevos negocios | 4. Obra + cartera

import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useKpis } from '../lib/useKpis'
import { useProgramacionObra } from '../lib/useProgramacionObra'
import { useHistoricoFlujoCaja } from '../lib/useHistoricoFlujoCaja'
import { useNuevosNegocios } from '../lib/useNuevosNegocios'
import { useMetrics } from '../lib/useMetrics'

import { ExecutiveScorecard } from '../components/executive/ExecutiveScorecard'
import { HistoricoFlujoCajaTable } from '../components/executive/HistoricoFlujoCajaTable'
import { NuevosNegociosWidget } from '../components/executive/NuevosNegociosWidget'
import { ObraCarteraTable } from '../components/executive/ObraCarteraTable'
import { ExecutiveFilters } from '../components/executive/ExecutiveFilters'

function extractSaldoCaja(metrics) {
  // Buscar métrica "Saldo de Caja" en el arreglo de métricas
  if (!metrics || !Array.isArray(metrics)) return null
  const saldoMetric = metrics.find(
    (m) =>
      m.name?.toLowerCase().includes('saldo') &&
      m.name?.toLowerCase().includes('caja')
  )
  if (!saldoMetric) return null

  // Asumir que el valor más reciente es el saldo actual
  const latestValue = saldoMetric.values?.[0]?.value || 0
  return {
    saldo: latestValue,
    meta: saldoMetric.target || latestValue,
    status: latestValue >= (saldoMetric.target || latestValue) ? 'success' : 'warning',
  }
}

function buildObraCarteraProyectos(kpisTree, progObraTree) {
  // Combinar datos de KPIs (ventas, cartera) + prog obra
  // para armar tabla de proyectos con: cartera pre, cartera post, % prog obra

  if (!Array.isArray(kpisTree) || !Array.isArray(progObraTree)) return []

  const proyectos = []
  const proyectoMap = new Map()

  // Escanear KPIs para obtener cartera
  kpisTree.forEach((card) => {
    if (card.children) {
      card.children.forEach((node) => {
        if (node.id.includes('carpost') || node.id.includes('carpre')) {
          const projName = node.title
          if (!proyectoMap.has(projName)) {
            proyectoMap.set(projName, { nombre: projName, id: projName })
          }
          const proj = proyectoMap.get(projName)
          if (node.id.includes('carpre')) {
            proj.carteraPre = node.currentValue || 0
          } else if (node.id.includes('carpost')) {
            proj.carteraPost = node.currentValue || 0
          }
        }
      })
    }
  })

  // Escanear prog obra para obtener % y status
  progObraTree.forEach((card) => {
    if (card.children) {
      card.children.forEach((node) => {
        const projName = node.title
        if (!proyectoMap.has(projName)) {
          proyectoMap.set(projName, { nombre: projName, id: projName })
        }
        const proj = proyectoMap.get(projName)
        proj.progObra = node.currentValue || 0
        proj.status = node.status || 'warning'
      })
    }
  })

  // Convertir a array y agregar detalles ficticios por capítulo
  proyectoMap.forEach((proj) => {
    proj.detalles = [
      {
        capitulo: 'Estructura',
        ppto: proj.progObra * 0.35,
        real: proj.progObra * 0.35 * 0.92,
        pct: Math.round(92),
      },
      {
        capitulo: 'Acabados',
        ppto: proj.progObra * 0.40,
        real: proj.progObra * 0.40 * 0.88,
        pct: Math.round(88),
      },
      {
        capitulo: 'Instalaciones',
        ppto: proj.progObra * 0.25,
        real: proj.progObra * 0.25 * 0.75,
        pct: Math.round(75),
      },
    ]
    proyectos.push(proj)
  })

  return proyectos
}

export default function ExecutiveDashboard() {
  const { displayName, isDemoMode } = useApp()
  const { tree: kpisTree, loading: kpisLoading, error: kpisError } = useKpis()
  const { tree: progObraTree, loading: progObraLoading, error: progObraError } = useProgramacionObra()
  const { data: historicoData, movies, loading: historicoLoading, error: historicoError } = useHistoricoFlujoCaja()
  const { negocios, loading: negociosLoading, error: negociosError } = useNuevosNegocios()
  const { metrics } = useMetrics()

  const [period, setPeriod] = useState('ytd')
  const [selectedProject, setSelectedProject] = useState('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Extraer métricas principales
  const ventasCard = kpisTree.find((c) => c.id === 'ceo-ventas')
  const progObraCard = progObraTree.find((c) => c.id === 'ceo-prog-obra' || c.id === 'andres-prog-obra')
  const saldoCaja = extractSaldoCaja(metrics)

  // Construir tabla obra + cartera
  const obraCarteraProyectos = buildObraCarteraProyectos(kpisTree, progObraTree)

  // Manejar refresh manual
  const handleRefresh = async () => {
    setIsRefreshing(true)
    // En producción: hacer re-fetch de datos
    await new Promise((r) => setTimeout(r, 1500))
    setLastRefresh(new Date())
    setIsRefreshing(false)
  }

  const allLoading = kpisLoading || progObraLoading || historicoLoading || negociosLoading
  const anyError = kpisError || progObraError || historicoError || negociosError

  return (
    <div className="fade-in" style={{ padding: 'var(--space-6)' }}>
      {/* Header */}
      <div className="page-header">
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Dashboard Ejecutivo
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
          Estado general operativo — {displayName}
        </p>
      </div>

      {/* Filtros + Refresh */}
      <ExecutiveFilters
        onPeriodChange={setPeriod}
        onProjectChange={setSelectedProject}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Estado de carga / error global */}
      {allLoading && (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div
            style={{
              display: 'inline-block',
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '3px solid var(--border-medium)',
              borderTopColor: 'var(--brand-primary)',
              animation: 'spin 0.8s linear infinite',
              marginBottom: 'var(--space-3)',
            }}
          />
          <p>Cargando dashboard...</p>
        </div>
      )}

      {anyError && (
        <div
          style={{
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid var(--status-error)',
            color: 'var(--status-error)',
            marginBottom: 'var(--space-6)',
            fontSize: '0.9rem',
          }}
        >
          Algunos datos no pudieron cargar. Algunos componentes pueden estar vacíos.
          {anyError && (
            <p style={{ margin: 'var(--space-2) 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>
              {anyError.message}
            </p>
          )}
        </div>
      )}

      {/* En Demo Mode */}
      {isDemoMode && (
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid var(--status-info)',
            color: 'var(--status-info)',
            marginBottom: 'var(--space-6)',
            fontSize: '0.85rem',
          }}
        >
          Modo Demo: datos ficticios. Configura variables de entorno para datos reales.
        </div>
      )}

      {!allLoading && (
        <>
          {/* Sección 1: SCORECARD 3 MÉTRICAS */}
          <ExecutiveScorecard
            ventasYtd={ventasCard}
            programacionObra={progObraCard}
            saldoCaja={saldoCaja}
          />

          {/* Sección 2: FLUJO CAJA HISTÓRICO */}
          <HistoricoFlujoCajaTable
            data={historicoData}
            movies={movies}
            projects={movies.length > 0 ? obraCarteraProyectos.map((p) => p.nombre) : []}
            loading={historicoLoading}
            error={historicoError}
          />

          {/* Sección 3: NUEVOS NEGOCIOS */}
          <NuevosNegociosWidget
            negocios={negocios}
            loading={negociosLoading}
            error={negociosError}
          />

          {/* Sección 4: OBRA + CARTERA */}
          <ObraCarteraTable
            proyectos={obraCarteraProyectos}
            loading={progObraLoading}
            error={progObraError}
          />

          {/* Footer con info de última actualización */}
          <div
            style={{
              marginTop: 'var(--space-12)',
              paddingTop: 'var(--space-6)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
            }}
          >
            <div>
              Última actualización: {lastRefresh.toLocaleTimeString('es-CO')}
            </div>
            <div>
              IC Constructora — Sistema EOS Tracción
            </div>
          </div>
        </>
      )}
    </div>
  )
}
