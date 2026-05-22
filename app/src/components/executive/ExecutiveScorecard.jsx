// src/components/executive/ExecutiveScorecard.jsx
// Tarjetas grandes de KPIs para el dashboard ejecutivo
// 3 columnas: Ventas YTD, Programación Obra, Saldo Caja

import { TrendingUp, DollarSign, Zap } from 'lucide-react'

const statusSemaphore = (status) => {
  switch (status) {
    case 'success':
      return { color: 'var(--status-success)', label: '✓' }
    case 'warning':
      return { color: 'var(--status-warning)', label: '!' }
    case 'danger':
      return { color: 'var(--status-error)', label: '✕' }
    default:
      return { color: 'var(--border-medium)', label: '–' }
  }
}

function ScorecardCard({ title, value, unit, target, status, owner, icon: Icon }) {
  const semaphore = statusSemaphore(status)
  const pctProgress = target > 0 ? Math.round((value / target) * 100) : 0

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid var(--border-subtle)`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        transition: 'all var(--duration-fast) var(--ease-default)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-medium)'
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Header: Icon + Title + Owner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
            {title}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {owner}
          </p>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <Icon size={20} />
        </div>
      </div>

      {/* Valor principal grande */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
        <span style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {Math.round(value * 10) / 10}
        </span>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {unit}
        </span>
      </div>

      {/* Progreso: barra + % */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {/* Barra de progreso */}
        <div
          style={{
            width: '100%',
            height: 8,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-elevated)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(pctProgress, 100)}%`,
              background: semaphore.color,
              transition: 'width var(--duration-normal) var(--ease-default)',
            }}
          />
        </div>

        {/* Texto: % progreso vs meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {pctProgress}% de {Math.round(target * 10) / 10} {unit}
          </span>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: semaphore.color,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            {semaphore.label}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ExecutiveScorecard({ ventasYtd, programacionObra, saldoCaja }) {
  return (
    <section>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
        Scorecard — 3 Métricas Clave
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        {ventasYtd && (
          <ScorecardCard
            title="Ventas YTD"
            value={ventasYtd.currentValue}
            unit="MM$"
            target={ventasYtd.targetValue}
            status={ventasYtd.status}
            owner="Juan Paulo McAllister"
            icon={DollarSign}
          />
        )}

        {programacionObra && (
          <ScorecardCard
            title="Prog. Obra YTD"
            value={programacionObra.currentValue}
            unit="%"
            target={programacionObra.targetValue}
            status={programacionObra.status}
            owner="Andrés Arango"
            icon={TrendingUp}
          />
        )}

        {saldoCaja && (
          <ScorecardCard
            title="Saldo Caja"
            value={saldoCaja.saldo}
            unit="MM$"
            target={saldoCaja.meta || saldoCaja.saldo}
            status={saldoCaja.status}
            owner="Juan José Leal"
            icon={Zap}
          />
        )}
      </div>
    </section>
  )
}
