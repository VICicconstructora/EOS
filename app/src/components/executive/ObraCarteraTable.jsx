// src/components/executive/ObraCarteraTable.jsx
// Data grid expandible: Proyecto, Cartera Pre, Cartera Post, Prog. Obra %, Status
// Ordenado por status (rojo first, verde last)

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const statusColor = (status) => {
  switch (status) {
    case 'success':
      return 'var(--status-success)'
    case 'warning':
      return 'var(--status-warning)'
    case 'danger':
      return 'var(--status-error)'
    default:
      return 'var(--text-muted)'
  }
}

const statusLabel = (status) => {
  switch (status) {
    case 'success':
      return '✓ En marcha'
    case 'warning':
      return '! En riesgo'
    case 'danger':
      return '✕ Crítico'
    default:
      return '–'
  }
}

function ObraCarteraRow({ proyecto, expanded, onToggle }) {
  const status = proyecto.status || 'warning'
  const color = statusColor(status)

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          background: status === 'danger' ? 'rgba(239,68,68,0.08)' : 'transparent',
          borderBottom: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          transition: 'background var(--duration-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            status === 'danger' ? 'rgba(239,68,68,0.08)' : 'transparent'
        }}
      >
        <td
          style={{
            padding: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            fontWeight: 500,
            color: 'var(--text-primary)',
            minWidth: 200,
          }}
        >
          <ChevronDown
            size={16}
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform var(--duration-fast)',
              opacity: 0.6,
            }}
          />
          {proyecto.nombre}
        </td>
        <td style={{ padding: 'var(--space-4)', textAlign: 'right', color: 'var(--text-secondary)' }}>
          {Math.round(proyecto.carteraPre * 10) / 10}M
        </td>
        <td style={{ padding: 'var(--space-4)', textAlign: 'right', color: 'var(--text-secondary)' }}>
          {Math.round(proyecto.carteraPost * 10) / 10}M
        </td>
        <td style={{ padding: 'var(--space-4)', textAlign: 'right', color: 'var(--text-secondary)' }}>
          {Math.round(proyecto.progObra * 10) / 10}%
        </td>
        <td style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              background: color,
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {statusLabel(status)}
          </div>
        </td>
      </tr>

      {/* Expandible: detalles por capítulo presupuestal */}
      {expanded && proyecto.detalles && proyecto.detalles.length > 0 && (
        <tr style={{ background: 'var(--bg-overlay)', borderBottom: '1px solid var(--border-subtle)' }}>
          <td colSpan={5} style={{ padding: 'var(--space-6)' }}>
            <div style={{ marginLeft: 'var(--space-4)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 'var(--space-3)', color: 'var(--text-primary)' }}>
                Detalles por Capítulo
              </h4>
              <table style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ textAlign: 'left', paddingBottom: 'var(--space-2)', fontWeight: 500 }}>Capítulo</th>
                    <th style={{ textAlign: 'right', paddingBottom: 'var(--space-2)', fontWeight: 500 }}>Presupuesto</th>
                    <th style={{ textAlign: 'right', paddingBottom: 'var(--space-2)', fontWeight: 500 }}>Real</th>
                    <th style={{ textAlign: 'right', paddingBottom: 'var(--space-2)', fontWeight: 500 }}>% Prog.</th>
                  </tr>
                </thead>
                <tbody>
                  {proyecto.detalles.map((det, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 'var(--space-2) 0', color: 'var(--text-secondary)' }}>
                        {det.capitulo}
                      </td>
                      <td style={{ padding: 'var(--space-2) 0', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {Math.round(det.ppto * 10) / 10}M
                      </td>
                      <td style={{ padding: 'var(--space-2) 0', textAlign: 'right', color: 'var(--text-primary)' }}>
                        {Math.round(det.real * 10) / 10}M
                      </td>
                      <td style={{ padding: 'var(--space-2) 0', textAlign: 'right', color: 'var(--text-primary)' }}>
                        {Math.round(det.pct * 10) / 10}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function ObraCarteraTable({ proyectos, loading, error }) {
  const [expandedId, setExpandedId] = useState(null)

  if (loading) {
    return (
      <section style={{ marginTop: 'var(--space-10)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
          Control Obra + Cartera
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
          Control Obra + Cartera
        </h2>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--status-error)' }}>
          Error: {error.message}
        </div>
      </section>
    )
  }

  // Ordenar por status: rojo → amarillo → verde
  const statusOrder = { danger: 0, warning: 1, success: 2 }
  const sorted = [...(proyectos || [])].sort(
    (a, b) => (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999)
  )

  return (
    <section style={{ marginTop: 'var(--space-10)' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--text-primary)' }}>
        Control Obra + Cartera — Expandible por Capítulo
      </h2>

      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
            }}
          >
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th
                  style={{
                    padding: 'var(--space-4)',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    minWidth: 200,
                  }}
                >
                  Proyecto
                </th>
                <th
                  style={{
                    padding: 'var(--space-4)',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    minWidth: 120,
                  }}
                >
                  Cartera Pre
                </th>
                <th
                  style={{
                    padding: 'var(--space-4)',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    minWidth: 120,
                  }}
                >
                  Cartera Post
                </th>
                <th
                  style={{
                    padding: 'var(--space-4)',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    minWidth: 100,
                  }}
                >
                  Prog. Obra
                </th>
                <th
                  style={{
                    padding: 'var(--space-4)',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    minWidth: 100,
                  }}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted && sorted.length > 0 ? (
                sorted.map((proy) => (
                  <ObraCarteraRow
                    key={proy.id}
                    proyecto={proy}
                    expanded={expandedId === proy.id}
                    onToggle={() => setExpandedId(expandedId === proy.id ? null : proy.id)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Sin proyectos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
