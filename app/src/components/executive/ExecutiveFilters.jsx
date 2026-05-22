// src/components/executive/ExecutiveFilters.jsx
// Filtros de período, proyecto, y botón de refresh manual

import { RefreshCw, Calendar } from 'lucide-react'
import { useState } from 'react'

export function ExecutiveFilters({ onPeriodChange, onProjectChange, onRefresh, isRefreshing }) {
  const [period, setPeriod] = useState('ytd')
  const [project, setProject] = useState('all')

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod)
    onPeriodChange?.(newPeriod)
  }

  const handleProjectChange = (newProject) => {
    setProject(newProject)
    onProjectChange?.(newProject)
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--space-4)',
        alignItems: 'center',
        flexWrap: 'wrap',
        padding: 'var(--space-4)',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-6)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Período */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Período:
        </label>
        <select
          value={period}
          onChange={(e) => handlePeriodChange(e.target.value)}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <option value="ytd">YTD (Acumulado)</option>
          <option value="q2">Q2 2026</option>
          <option value="thismonth">Este mes</option>
          <option value="lastmonth">Mes anterior</option>
        </select>
      </div>

      {/* Proyecto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Proyecto:
        </label>
        <select
          value={project}
          onChange={(e) => handleProjectChange(e.target.value)}
          style={{
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <option value="all">Todos</option>
          <option value="bosque-central">Bosque Central</option>
          <option value="gaia">Gaia</option>
          <option value="praia-natura">Praia Natura</option>
          <option value="primera-este">Primera Este</option>
          <option value="castilla-imperial">Castilla Imperial</option>
          <option value="castilla-living">Castilla Living</option>
          <option value="la-hacienda">La Hacienda</option>
          <option value="reserva-oporto">Reserva De Oporto</option>
        </select>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Refresh Button */}
      <button
        onClick={() => onRefresh?.()}
        disabled={isRefreshing}
        style={{
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          fontWeight: 500,
          cursor: isRefreshing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          transition: 'all var(--duration-fast)',
          opacity: isRefreshing ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isRefreshing) {
            e.currentTarget.style.borderColor = 'var(--border-medium)'
            e.currentTarget.style.background = 'var(--bg-hover)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-subtle)'
          e.currentTarget.style.background = 'var(--bg-elevated)'
        }}
      >
        <RefreshCw
          size={14}
          style={{
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
          }}
        />
        {isRefreshing ? 'Actualizando...' : 'Actualizar'}
      </button>

      {/* Info de auto-refresh */}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, marginLeft: 'var(--space-3)' }}>
        Auto-refresh cada 4h
      </p>
    </div>
  )
}
