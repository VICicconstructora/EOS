// src/pages/PropuestasWikiPage.jsx
// Curaduría de las propuestas que VIC encola para alimentar el wiki.
// El CEO/admin aprueba o rechaza; nada entra al wiki sin esta revisión.
import { useState } from 'react'
import { BookOpen, Check, X, Filter, RefreshCw, MessageSquareQuote, User, FolderGit2, Settings2, FileText, CheckCheck } from 'lucide-react'
import { useWikiProposals } from '../lib/useWikiProposals'
import { useApp } from '../context/AppContext'

const TIPO_META = {
  persona:  { label: 'Persona',  icon: User },
  proyecto: { label: 'Proyecto', icon: FolderGit2 },
  proceso:  { label: 'Proceso',  icon: Settings2 },
  otro:     { label: 'Otro',     icon: FileText },
}

const ESTADO_META = {
  pendiente: { label: 'Pendiente', color: '#d97706',               bg: 'rgba(217,119,6,0.1)' },
  aprobada:  { label: 'Aprobada',  color: 'var(--status-success)', bg: 'rgba(16,185,129,0.1)' },
  rechazada: { label: 'Rechazada', color: 'var(--status-error)',   bg: 'rgba(239,68,68,0.1)' },
  ingerida:  { label: 'Ingerida',  color: 'var(--text-muted)',     bg: 'var(--bg-elevated)' },
}

const CONFIANZA_COLOR = {
  alta:  'var(--status-success)',
  media: '#d97706',
  baja:  'var(--text-muted)',
}

function fecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ProposalCard({ p, onApprove, onReject, onMarkIngested }) {
  const [rejecting, setRejecting] = useState(false)
  const [nota, setNota] = useState('')

  const tipoMeta = TIPO_META[p.tipo] || TIPO_META.otro
  const estadoMeta = ESTADO_META[p.estado] || ESTADO_META.pendiente
  const TipoIcon = tipoMeta.icon
  const pendiente = p.estado === 'pendiente'

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: 'hidden',
        borderLeft: `4px solid ${estadoMeta.color}`,
        opacity: pendiente ? 1 : 0.7,
        transition: 'opacity 0.2s',
      }}
    >
      <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
        {/* Badges */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)', alignItems: 'center' }}>
          <span style={{
            padding: '2px 8px', borderRadius: 'var(--radius-full)',
            fontSize: '0.7rem', fontWeight: 700,
            color: estadoMeta.color, background: estadoMeta.bg,
          }}>
            {estadoMeta.label}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', borderRadius: 'var(--radius-full)',
            fontSize: '0.7rem', fontWeight: 600,
            background: 'var(--bg-elevated)', color: 'var(--text-muted)',
          }}>
            <TipoIcon size={11} /> {tipoMeta.label}
          </span>
          {p.area && (
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--radius-full)',
              fontSize: '0.7rem', fontWeight: 600,
              background: 'var(--bg-elevated)', color: 'var(--text-muted)',
            }}>
              {p.area}
            </span>
          )}
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: CONFIANZA_COLOR[p.confianza] || 'var(--text-muted)' }}>
            confianza {p.confianza}
          </span>
        </div>

        {/* Contenido propuesto */}
        <p style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 'var(--space-2)', lineHeight: 1.45 }}>
          {p.contenido}
        </p>

        {/* Ficha objetivo */}
        {p.entidad_objetivo && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', fontFamily: 'monospace' }}>
            → {p.entidad_objetivo}
          </p>
        )}

        {/* Cita textual del usuario */}
        {p.cita_textual && (
          <div style={{
            display: 'flex', gap: 6, alignItems: 'flex-start',
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
            padding: '8px 10px', marginBottom: 'var(--space-3)',
          }}>
            <MessageSquareQuote size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              "{p.cita_textual}"
            </span>
          </div>
        )}

        {/* Meta: quién y cuándo */}
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: pendiente ? 'var(--space-3)' : 0 }}>
          Aportado por {p.propuesto_por} · {fecha(p.created_at)}
          {!pendiente && p.revisado_por && (
            <> · revisado por {p.revisado_por} el {fecha(p.revisado_at)}</>
          )}
        </p>

        {!pendiente && p.nota_revision && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Nota: {p.nota_revision}
          </p>
        )}

        {/* Acciones (solo pendientes) */}
        {pendiente && !rejecting && (
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              className="btn btn-sm"
              onClick={() => onApprove(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--status-success)', color: '#fff', border: 'none',
              }}
            >
              <Check size={14} /> Aprobar
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setRejecting(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--status-error)' }}
            >
              <X size={14} /> Rechazar
            </button>
          </div>
        )}

        {/* Rechazo con nota opcional */}
        {pendiente && rejecting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <input
              className="input"
              placeholder="Motivo del rechazo (opcional)"
              value={nota}
              onChange={e => setNota(e.target.value)}
              autoFocus
              style={{ fontSize: '0.82rem' }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                className="btn btn-sm"
                onClick={() => onReject(p.id, nota.trim() || null)}
                style={{ background: 'var(--status-error)', color: '#fff', border: 'none' }}
              >
                Confirmar rechazo
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setRejecting(false); setNota('') }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Aprobada: cerrar el ciclo tras ingestar al wiki con /wikiingesta */}
        {p.estado === 'aprobada' && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onMarkIngested(p.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 'var(--space-3)', color: 'var(--status-success)' }}
          >
            <CheckCheck size={14} /> Marcar como ingerida
          </button>
        )}
      </div>
    </div>
  )
}

export default function PropuestasWikiPage() {
  const { proposals, loading, approve, reject, markIngested, reload } = useWikiProposals()
  const [filterEstado, setFilterEstado] = useState('pendiente')
  const [filterArea, setFilterArea] = useState('all')

  const filtered = proposals
    .filter(p => {
      if (filterEstado !== 'all' && p.estado !== filterEstado) return false
      if (filterArea !== 'all' && p.area !== filterArea) return false
      return true
    })

  const stats = {
    pendientes: proposals.filter(p => p.estado === 'pendiente').length,
    aprobadas:  proposals.filter(p => p.estado === 'aprobada').length,
    rechazadas: proposals.filter(p => p.estado === 'rechazada').length,
    ingeridas:  proposals.filter(p => p.estado === 'ingerida').length,
  }

  const areas = [...new Set(proposals.map(p => p.area).filter(Boolean))].sort()

  const STAT_ROWS = [
    { label: 'Pendientes', value: stats.pendientes, color: '#d97706' },
    { label: 'Aprobadas',  value: stats.aprobadas,  color: 'var(--status-success)' },
    { label: 'Rechazadas', value: stats.rechazadas, color: 'var(--status-error)' },
    { label: 'Ingeridas',  value: stats.ingeridas,  color: 'var(--text-muted)' },
  ]

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)',
      }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 4 }}>
            <BookOpen size={24} color="var(--brand-primary)" />
            Propuestas para el Wiki
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Aportes que VIC capturó en conversaciones. Aprueba para incorporar al wiki; rechaza lo inexacto.
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={reload}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: 'var(--space-4)', marginBottom: 'var(--space-6)',
      }}>
        {STAT_ROWS.map(s => (
          <div key={s.label} className="card-glass" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap',
        marginBottom: 'var(--space-5)', alignItems: 'center',
      }}>
        <Filter size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

        <div style={{ display: 'flex', gap: 3, background: 'var(--bg-elevated)', padding: 3, borderRadius: 'var(--radius-md)' }}>
          {[
            { value: 'pendiente', label: 'Pendientes' },
            { value: 'aprobada',  label: 'Aprobadas' },
            { value: 'rechazada', label: 'Rechazadas' },
            { value: 'all',       label: 'Todas' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterEstado(value)}
              style={{
                padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                background: filterEstado === value ? 'var(--bg-surface)' : 'transparent',
                color: filterEstado === value ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: filterEstado === value ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {areas.length > 0 && (
          <select
            value={filterArea}
            onChange={e => setFilterArea(e.target.value)}
            className="input"
            style={{ height: 34, width: 'auto', padding: '0 12px' }}
          >
            <option value="all">Todas las áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
          Cargando propuestas...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-glass" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <BookOpen size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)', display: 'block', opacity: 0.5 }} />
          <p style={{ fontWeight: 600, marginBottom: 8 }}>
            {proposals.length === 0 ? 'Aún no hay propuestas' : 'Sin resultados con estos filtros'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {proposals.length === 0
              ? 'Cuando alguien aporte datos a VIC en Teams, aparecerán aquí para tu revisión.'
              : 'Cambia los filtros para ver más propuestas.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filtered.map(p => (
            <ProposalCard key={p.id} p={p} onApprove={approve} onReject={reject} onMarkIngested={markIngested} />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 'var(--space-4)' }}>
          {filtered.length} propuesta{filtered.length !== 1 ? 's' : ''} · Las aprobadas se ingestan al wiki en un paso aparte
        </p>
      )}
    </div>
  )
}
