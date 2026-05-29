// src/pages/AlarmasPage.jsx — Alarmas operativas desde Datamart.xlsx
import { useState } from 'react'
import { AlertTriangle, CheckCircle, Filter, RefreshCw, X } from 'lucide-react'
import { useAlarms } from '../lib/useAlarms'
import { useApp } from '../context/AppContext'

const PROJECT_LABELS = {
  'praia-natura':        'Praia Natura',
  'reserva-de-oporto':   'Reserva de Oporto',
  'primera-este':        'Primera Este',
  'la-hacienda-jamundi': 'La Hacienda Jamundí',
  'bosque-central':      'Bosque Central',
  'castilla-living':     'Castilla Living',
  'gaia':                'Gaia',
  'castilla-imperial':   'Castilla Imperial',
  'azul-turquesa':       'Azul Turquesa',
  'azul-celeste':        'Azul Celeste',
  'verde-vivo':          'Verde Vivo',
  'mitika':              'Mitika',
  'well':                'Well',
}

const CATEGORY_LABELS = {
  credito:   'Crédito Constructor',
  poliza_tr: 'Póliza Todo Riesgo',
  poliza_rc: 'Póliza Resp. Civil',
  licencia:  'Licencia Construcción',
}

function diasLabel(dias) {
  if (dias === null || dias === undefined) return '—'
  if (dias < 0) return `${Math.abs(dias)}d vencida`
  if (dias === 0) return 'vence hoy'
  return `${dias}d`
}

function AlarmCard({ alarm, onAcknowledge, userEmail }) {
  const isVencida = alarm.severity === 'alta'
  const borderColor = alarm.status === 'acknowledged'
    ? 'var(--border-medium)'
    : isVencida
    ? 'var(--status-error)'
    : '#d97706'

  const sevColor = isVencida ? 'var(--status-error)' : '#d97706'
  const sevBg    = isVencida ? 'rgba(239,68,68,0.1)' : 'rgba(217,119,6,0.1)'

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: 'hidden',
        borderLeft: `4px solid ${borderColor}`,
        opacity: alarm.status === 'acknowledged' ? 0.65 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
        padding: 'var(--space-4) var(--space-5)', flexWrap: 'wrap',
      }}>
        {/* Left: info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--radius-full)',
              fontSize: '0.7rem', fontWeight: 700,
              color: sevColor, background: sevBg,
            }}>
              {isVencida ? '🔴 VENCIDA' : '🟡 POR VENCER'}
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--radius-full)',
              fontSize: '0.7rem', fontWeight: 600,
              background: 'var(--bg-elevated)', color: 'var(--text-muted)',
            }}>
              {CATEGORY_LABELS[alarm.category] || alarm.category}
            </span>
            {alarm.etapa && (
              <span style={{
                padding: '2px 8px', borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem', fontWeight: 600,
                background: 'var(--bg-elevated)', color: 'var(--text-muted)',
              }}>
                Etapa {alarm.etapa}
              </span>
            )}
          </div>

          {/* Project */}
          <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
            {PROJECT_LABELS[alarm.project] || alarm.project}
          </p>

          {/* Detail */}
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            {alarm.detail}
          </p>

          {/* Acknowledged by */}
          {alarm.status === 'acknowledged' && (
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={11} />
              Reconocido
              {alarm.acknowledged_by ? ` por ${alarm.acknowledged_by}` : ''}
              {alarm.acknowledged_at
                ? ` · ${new Date(alarm.acknowledged_at).toLocaleDateString('es-CO')}`
                : ''}
            </p>
          )}
        </div>

        {/* Right: días + action */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)', flexShrink: 0 }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: sevColor, lineHeight: 1 }}>
            {diasLabel(alarm.dias)}
          </div>
          {alarm.expires_at && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Vence: {alarm.expires_at}
            </div>
          )}
          {alarm.status === 'active' ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onAcknowledge(alarm.id, userEmail)}
              style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <CheckCircle size={13} />
              Reconocer
            </button>
          ) : (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={12} />
              Reconocido
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AlarmasPage() {
  const { alarms, loading, acknowledge, reload, countCritical } = useAlarms()
  const { user } = useApp()

  const [filterSeverity, setFilterSeverity] = useState('all')
  const [filterProject,  setFilterProject]  = useState('all')
  const [filterStatus,   setFilterStatus]   = useState('active')

  const filtered = alarms
    .filter(a => {
      if (filterStatus !== 'all' && a.status !== filterStatus) return false
      if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false
      if (filterProject  !== 'all' && a.project  !== filterProject)  return false
      return true
    })
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'alta' ? -1 : 1
      return (a.dias ?? 0) - (b.dias ?? 0)
    })

  const stats = {
    activas:      alarms.filter(a => a.status === 'active').length,
    vencidas:     alarms.filter(a => a.severity === 'alta'  && a.status === 'active').length,
    porVencer:    alarms.filter(a => a.severity === 'media' && a.status === 'active').length,
    reconocidas:  alarms.filter(a => a.status === 'acknowledged').length,
  }

  const projects = [...new Set(alarms.map(a => a.project))].sort()

  const hasFilters = filterSeverity !== 'all' || filterProject !== 'all' || filterStatus !== 'active'

  const STAT_ROWS = [
    { label: 'Activas',     value: stats.activas,     color: 'var(--text-primary)' },
    { label: 'Vencidas',    value: stats.vencidas,    color: 'var(--status-error)' },
    { label: 'Por vencer',  value: stats.porVencer,   color: '#d97706' },
    { label: 'Reconocidas', value: stats.reconocidas, color: 'var(--text-muted)' },
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
            <AlertTriangle size={24} color="var(--status-error)" />
            Alarmas Operativas
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Vencimientos de créditos, pólizas y licencias por proyecto · Fuente: Datamart.xlsx
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

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--bg-elevated)', padding: 3, borderRadius: 'var(--radius-md)' }}>
          {[
            { value: 'active',       label: 'Activas' },
            { value: 'acknowledged', label: 'Reconocidas' },
            { value: 'all',          label: 'Todas' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              style={{
                padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                background: filterStatus === value ? 'var(--bg-surface)' : 'transparent',
                color: filterStatus === value ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: filterStatus === value ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Severity */}
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
          className="input"
          style={{ height: 34, width: 'auto', padding: '0 12px' }}
        >
          <option value="all">Toda gravedad</option>
          <option value="alta">🔴 Vencidas</option>
          <option value="media">🟡 Por vencer</option>
        </select>

        {/* Project */}
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="input"
          style={{ height: 34, width: 'auto', padding: '0 12px' }}
        >
          <option value="all">Todos los proyectos</option>
          {projects.map(p => (
            <option key={p} value={p}>{PROJECT_LABELS[p] || p}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setFilterSeverity('all'); setFilterProject('all'); setFilterStatus('active') }}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <X size={12} /> Limpiar
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
          Cargando alarmas...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-glass" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <CheckCircle size={48} style={{ color: 'var(--status-success)', margin: '0 auto var(--space-4)', display: 'block' }} />
          <p style={{ fontWeight: 600, marginBottom: 8 }}>
            {alarms.length === 0 ? 'Sin alarmas registradas' : 'Sin resultados con estos filtros'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {alarms.length === 0
              ? 'Las alarmas se sincronizan automáticamente cada lunes desde Datamart.xlsx.'
              : 'Cambia los filtros para ver más alarmas.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filtered.map(alarm => (
            <AlarmCard
              key={alarm.id}
              alarm={alarm}
              onAcknowledge={acknowledge}
              userEmail={user?.email || ''}
            />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 'var(--space-4)' }}>
          {filtered.length} alarma{filtered.length !== 1 ? 's' : ''} ·
          Datamart.xlsx sincroniza automáticamente cada lunes
        </p>
      )}
    </div>
  )
}
