// src/components/executive/NuevosNegociosWidget.jsx
// Grid de 3 negocios: nombre, promesa, escritura, status, drill-down últimos 3 meses

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const statusLabel = (status) => {
  switch (status) {
    case 'on-track':
      return 'En marcha'
    case 'at-risk':
      return 'En riesgo'
    case 'stalled':
      return 'Estancado'
    default:
      return status
  }
}

function NegocioCard({ negocio }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: `2px solid ${negocio.statusColor}33`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        transition: 'all var(--duration-fast)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = negocio.statusColor
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${negocio.statusColor}33`
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Header: Nombre + Status Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {negocio.nombre}
        </h3>
        <div
          style={{
            padding: 'var(--space-1) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            background: negocio.statusColor,
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {statusLabel(negocio.status)}
        </div>
      </div>

      {/* Owner */}
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
        {negocio.owner}
      </p>

      {/* Valores principales: Promesa + Escritura */}
      <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, marginBottom: 'var(--space-1)' }}>
            Promesa
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>
            {Math.round(negocio.promesaMM * 10) / 10}M
          </p>
        </div>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, marginBottom: 'var(--space-1)' }}>
            Escritura
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--status-success)', margin: 0, fontFamily: 'var(--font-display)' }}>
            {Math.round(negocio.escrituraMM * 10) / 10}M
          </p>
        </div>
      </div>

      {/* Botón expandir para histórico */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
          fontSize: '0.8rem',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          transition: 'all var(--duration-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-medium)'
          e.currentTarget.style.background = 'var(--bg-hover)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-subtle)'
          e.currentTarget.style.background = 'var(--bg-elevated)'
        }}
      >
        Últimos 3 meses
        <ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform var(--duration-fast)' }} />
      </button>

      {/* Histórico expandible */}
      {expanded && negocio.history && negocio.history.length > 0 && (
        <div
          style={{
            marginTop: 'var(--space-3)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <table
            style={{
              width: '100%',
              fontSize: '0.8rem',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th style={{ textAlign: 'left', fontWeight: 600, paddingBottom: 'var(--space-2)' }}>Mes</th>
                <th style={{ textAlign: 'right', fontWeight: 600, paddingBottom: 'var(--space-2)' }}>Promesa</th>
                <th style={{ textAlign: 'right', fontWeight: 600, paddingBottom: 'var(--space-2)' }}>Escritura</th>
              </tr>
            </thead>
            <tbody>
              {negocio.history.map((h, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: 'var(--space-2) 0', color: 'var(--text-secondary)' }}>
                    {h.mes}
                  </td>
                  <td style={{ padding: 'var(--space-2) 0', textAlign: 'right', color: 'var(--text-primary)' }}>
                    {Math.round(h.promesa * 10) / 10}M
                  </td>
                  <td style={{ padding: 'var(--space-2) 0', textAlign: 'right', color: 'var(--status-success)' }}>
                    {Math.round(h.escritura * 10) / 10}M
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function NuevosNegociosWidget({ negocios, loading, error }) {
  if (loading) {
    return (
      <section style={{ marginTop: 'var(--space-10)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
          3 Nuevos Negocios — Meta Q2 2026
        </h2>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando...
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section style={{ marginTop: 'var(--space-10)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
          3 Nuevos Negocios — Meta Q2 2026
        </h2>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--status-error)' }}>
          Error: {error.message}
        </div>
      </section>
    )
  }

  return (
    <section style={{ marginTop: 'var(--space-10)' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
        3 Nuevos Negocios — Meta Q2 2026
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-6)',
        }}
      >
        {negocios && negocios.length > 0 ? (
          negocios.map((neg) => (
            <NegocioCard key={neg.id} negocio={neg} />
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
            Sin negocios registrados
          </div>
        )}
      </div>
    </section>
  )
}
