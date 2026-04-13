// src/pages/ReunionesPage.jsx — Gestión de reuniones L10 y más
import { useState } from 'react'
import { CalendarDays, Plus, Play, Star, CheckCircle2, Users, Clock, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useMeetings } from '../lib/useMeetings'
import { useTranscriptions, EOS_COMPONENTS_TAGS } from '../lib/useTranscriptions'
import L10Runner from '../components/meetings/L10Runner'

// ─── Configuración de tipos ───────────────────────────────────────────────────

const TYPE_CFG = {
  l10:       { label: 'L10 Semanal',    color: '#E8A020', bg: 'rgba(232,160,32,0.12)' },
  quarterly: { label: 'Trimestral',     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  annual:    { label: 'Anual',          color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  issue:     { label: 'Asuntos',        color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
}

const STATUS_CFG = {
  upcoming:  { label: 'Próxima',    color: '#3B82F6' },
  completed: { label: 'Completada', color: '#10B981' },
  cancelled: { label: 'Cancelada',  color: '#6B7280' },
}

const L10_AGENDA = [
  { label: 'Check-in / Segway',       minutes: 5,  color: '#E8A020', desc: 'Buena noticia personal y de negocio' },
  { label: 'Revisión del Scorecard',  minutes: 5,  color: '#F97316', desc: 'Semáforos — ¿algún número fuera de meta?' },
  { label: 'Revisión de Rocas',       minutes: 5,  color: '#3B82F6', desc: 'En camino o en riesgo (sin discutir)' },
  { label: 'Titulares',               minutes: 5,  color: '#10B981', desc: 'Noticias de clientes y empleados' },
  { label: 'IDS — Lista de Asuntos',  minutes: 60, color: '#EF4444', desc: 'Identificar, Discutir y Solucionar' },
  { label: 'Conclusión',              minutes: 5,  color: '#8B5CF6', desc: 'Próxima reunión, tareas, calificación 1-10' },
]

const EMPTY_FORM = {
  type: 'l10',
  title: 'Reunión L10 Semanal',
  date: '',
  time: '09:00',
  duration: 90,
  attendees_raw: '',
  status: 'upcoming',
}

// ─── Avatar con iniciales ─────────────────────────────────────────────────────

function Avatar({ name, size = 28 }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  const hue = name.charCodeAt(0) * 37 % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue}, 55%, 45%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: 'white',
      flexShrink: 0, border: '2px solid var(--bg-surface)',
      marginLeft: -6,
    }} title={name}>
      {initials}
    </div>
  )
}

// ─── Tarjeta de reunión ───────────────────────────────────────────────────────

function MeetingCard({ meeting, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const tc = TYPE_CFG[meeting.type] ?? TYPE_CFG.l10
  const sc = STATUS_CFG[meeting.status] ?? STATUS_CFG.upcoming

  const dateFormatted = meeting.date
    ? new Date(meeting.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  const durationLabel = meeting.duration >= 60
    ? `${meeting.duration / 60}h${meeting.duration % 60 ? ` ${meeting.duration % 60}min` : ''}`
    : `${meeting.duration}min`

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header de la card */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-4) var(--space-5)', flexWrap: 'wrap',
      }}>
        {/* Indicador de color */}
        <div style={{
          width: 4, height: 40, borderRadius: 2, background: tc.color, flexShrink: 0,
        }} />

        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 4 }}>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {meeting.title}
            </p>
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--radius-full)',
              fontSize: '0.7rem', fontWeight: 700,
              color: tc.color, background: tc.bg,
            }}>
              {tc.label}
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: 'var(--radius-full)',
              fontSize: '0.7rem', fontWeight: 600,
              color: sc.color, background: `${sc.color}18`,
            }}>
              {sc.label}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarDays size={12} /> {dateFormatted} · {meeting.time}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> {durationLabel}
            </span>
          </div>
        </div>

        {/* Avatars asistentes */}
        {meeting.attendees && meeting.attendees.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: 6 }}>
            {meeting.attendees.slice(0, 4).map((a, i) => (
              <Avatar key={i} name={a} size={28} />
            ))}
            {meeting.attendees.length > 4 && (
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--bg-elevated)', border: '2px solid var(--bg-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)',
                marginLeft: -6,
              }}>
                +{meeting.attendees.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Rating (completadas) */}
        {meeting.status === 'completed' && meeting.rating != null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 'var(--radius-full)',
            background: meeting.rating >= 8 ? 'rgba(16,185,129,0.12)' : meeting.rating >= 6 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
            color: meeting.rating >= 8 ? '#10B981' : meeting.rating >= 6 ? '#F59E0B' : '#EF4444',
            fontWeight: 700, fontSize: '0.85rem',
          }}>
            <Star size={13} fill="currentColor" /> {meeting.rating}/10
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)} title="Ver detalle">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onRemove(meeting.id)} style={{ color: 'var(--status-error)' }} title="Eliminar">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div style={{
          padding: 'var(--space-4) var(--space-5)',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
        }}>
          {/* Resumen para completadas */}
          {meeting.status === 'completed' && (
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                <CheckCircle2 size={14} style={{ color: meeting.scorecard_ok ? 'var(--status-success)' : 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Scorecard:</span>
                <span style={{ fontWeight: 600, color: meeting.scorecard_ok ? 'var(--status-success)' : 'var(--status-error)' }}>
                  {meeting.scorecard_ok == null ? '—' : meeting.scorecard_ok ? 'Revisado' : 'Pendiente'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                <CheckCircle2 size={14} style={{ color: meeting.rocks_reviewed ? 'var(--status-success)' : 'var(--text-muted)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Rocas:</span>
                <span style={{ fontWeight: 600, color: meeting.rocks_reviewed ? 'var(--status-success)' : 'var(--status-error)' }}>
                  {meeting.rocks_reviewed == null ? '—' : meeting.rocks_reviewed ? 'Revisadas' : 'Pendiente'}
                </span>
              </div>
              {meeting.issues_solved != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Asuntos resueltos:</span>
                  <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{meeting.issues_solved}</span>
                </div>
              )}
            </div>
          )}

          {/* Asistentes completos */}
          {meeting.attendees && meeting.attendees.length > 0 && (
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={12} /> Asistentes ({meeting.attendees.length})
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                {meeting.attendees.map((a, i) => (
                  <span key={i} style={{
                    padding: '2px 10px', borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                    fontSize: '0.78rem', color: 'var(--text-secondary)',
                  }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {meeting.notes && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Notas</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{meeting.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Formulario nueva reunión ─────────────────────────────────────────────────

function NewMeetingForm({ onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const f = v => setForm(p => ({ ...p, ...v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.date) return
    const attendees = form.attendees_raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    await onSave({
      type: form.type,
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      duration: Number(form.duration),
      attendees,
      status: 'upcoming',
      rating: null,
      scorecard_ok: null,
      rocks_reviewed: null,
      issues_solved: null,
      notes: '',
    })
  }

  return (
    <div className="card" style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--brand-primary)' }}>
      <div className="card-header" style={{ marginBottom: 'var(--space-4)' }}>
        <p className="card-title">Agendar nueva reunión</p>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}><X size={14} /></button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div>
            <label className="form-label">Tipo de reunión</label>
            <select className="form-input" value={form.type} onChange={e => f({ type: e.target.value })}>
              <option value="l10">L10 Semanal</option>
              <option value="quarterly">Trimestral</option>
              <option value="annual">Anual</option>
              <option value="issue">Asuntos</option>
            </select>
          </div>
          <div>
            <label className="form-label">Título</label>
            <input className="form-input" required value={form.title} onChange={e => f({ title: e.target.value })} placeholder="Nombre de la reunión" />
          </div>
          <div>
            <label className="form-label">Fecha *</label>
            <input className="form-input" type="date" required value={form.date} onChange={e => f({ date: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Hora</label>
            <input className="form-input" type="time" value={form.time} onChange={e => f({ time: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Duración (minutos)</label>
            <input className="form-input" type="number" min={15} max={960} value={form.duration} onChange={e => f({ duration: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Asistentes (separados por coma)</label>
            <input
              className="form-input"
              value={form.attendees_raw}
              onChange={e => f({ attendees_raw: e.target.value })}
              placeholder="Carlos M., Ana L., Roberto S."
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <button type="submit" className="btn btn-primary">Agendar reunión</button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ReunionesPage() {
  const { meetings, loading, add, update, remove } = useMeetings()
  const { transcriptions, loading: tLoading, add: addTranscription, remove: removeTranscription, topTopics, recurringTopics } = useTranscriptions()
  const [showL10, setShowL10] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState('agenda')
  const [showTransForm, setShowTransForm] = useState(false)
  const [transForm, setTransForm] = useState({
    participants_raw: '', topics_raw: '', decisions_raw: '',
    commitments_raw: '', raw_transcript: '', meeting_id: null,
  })

  // Stats
  const upcoming   = meetings.filter(m => m.status === 'upcoming')
  const completed  = meetings.filter(m => m.status === 'completed')
  const avgRating  = completed.length
    ? (completed.reduce((s, m) => s + (m.rating ?? 0), 0) / completed.length).toFixed(1)
    : '—'
  const totalIssues = completed.reduce((s, m) => s + (m.issues_solved ?? 0), 0)

  // Ordenar: próximas por fecha asc, completadas por fecha desc
  const sortedUpcoming  = [...upcoming].sort((a, b) => a.date.localeCompare(b.date))
  const sortedCompleted = [...completed].sort((a, b) => b.date.localeCompare(a.date))

  // Callback al finalizar L10Runner — guarda calificación e issues resueltos
  function handleL10Finish({ rating, issuesSolved }) {
    const nextMeeting = meetings.find(m => m.status === 'upcoming')
    if (nextMeeting) {
      update({
        ...nextMeeting,
        status: 'completed',
        scorecard_ok: true,
        rocks_reviewed: true,
        rating: rating || null,
        issues_solved: issuesSolved || 0,
      })
    }
    setShowL10(false)
  }

  return (
    <>
      {/* L10 Runner overlay */}
      {showL10 && <L10Runner onClose={() => setShowL10(false)} onFinish={handleL10Finish} />}

      <div className="fade-in">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div className="page-title">
              <div className="page-title-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
                <CalendarDays size={24} style={{ color: 'var(--eos-vision)' }} />
              </div>
              <div>
                <h1>Reuniones</h1>
                <p style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                  Agenda, historial y ejecución de reuniones EOS
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(s => !s)}>
                <Plus size={16} /> Nueva Reunión
              </button>
              <button className="btn btn-primary" onClick={() => setShowL10(true)}>
                <Play size={16} /> Iniciar reunión L10
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats cards ─────────────────────────────────────────── */}
        <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
          {[
            { label: 'Próximas',           value: upcoming.length,  color: '#3B82F6' },
            { label: 'Completadas',        value: completed.length, color: '#10B981' },
            { label: 'Calificación prom.', value: avgRating,        color: '#E8A020' },
            { label: 'Asuntos resueltos',  value: totalIssues,      color: '#8B5CF6' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Formulario nueva reunión ─────────────────────────────── */}
        {showForm && (
          <NewMeetingForm
            onSave={async (data) => { await add(data); setShowForm(false) }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 0,
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 'var(--space-6)',
        }}>
          {[
            { key: 'agenda',          label: 'Agenda L10' },
            { key: 'history',         label: 'Historial de reuniones' },
            { key: 'transcripciones', label: 'Transcripciones' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: 'var(--space-2) var(--space-5)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.9rem', fontWeight: 600,
                color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: `2px solid ${activeTab === tab.key ? 'var(--brand-primary)' : 'transparent'}`,
                marginBottom: -1,
                transition: 'all var(--duration-fast)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Agenda L10 ─────────────────────────────────────── */}
        {activeTab === 'agenda' && (
          <div>
            <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'flex-start' }}>

              {/* Lista de pasos */}
              <div style={{ flex: '1 1 360px' }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <p className="card-title" style={{ margin: 0 }}>Los 6 pasos de la reunión L10</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      90 minutos en total — cada semana, mismo día, misma hora
                    </p>
                  </div>
                  {L10_AGENDA.map((step, i) => (
                    <div
                      key={step.label}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                        padding: 'var(--space-3) var(--space-5)',
                        borderBottom: i < L10_AGENDA.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        borderLeft: `3px solid ${step.color}`,
                      }}
                    >
                      {/* Número */}
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: `${step.color}18`,
                        border: `2px solid ${step.color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', fontWeight: 800, color: step.color,
                      }}>
                        {i + 1}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {step.label}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{step.desc}</p>
                      </div>

                      {/* Minutos */}
                      <span style={{
                        padding: '2px 10px', borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem', fontWeight: 700,
                        color: step.color, background: `${step.color}18`,
                        flexShrink: 0,
                      }}>
                        {step.minutes} min
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Próxima reunión L10 */}
              <div style={{ flex: '1 1 280px' }}>
                <div className="card">
                  <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Próxima reunión</p>
                  {sortedUpcoming.length > 0 ? (
                    <div>
                      {(() => {
                        const next = sortedUpcoming[0]
                        const tc = TYPE_CFG[next.type] ?? TYPE_CFG.l10
                        const dateF = next.date
                          ? new Date(next.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
                          : '—'
                        return (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                              <span style={{
                                padding: '3px 10px', borderRadius: 'var(--radius-full)',
                                fontSize: '0.75rem', fontWeight: 700,
                                color: tc.color, background: tc.bg,
                              }}>
                                {tc.label}
                              </span>
                            </div>
                            <p style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-1)' }}>{next.title}</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-1)', textTransform: 'capitalize' }}>
                              {dateF} · {next.time}
                            </p>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                              <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                              {next.duration >= 60 ? `${next.duration / 60}h${next.duration % 60 ? ` ${next.duration % 60}min` : ''}` : `${next.duration}min`}
                            </p>
                            {next.attendees && next.attendees.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                                <div style={{ display: 'flex', paddingLeft: 6 }}>
                                  {next.attendees.slice(0, 5).map((a, i) => <Avatar key={i} name={a} size={30} />)}
                                  {next.attendees.length > 5 && (
                                    <div style={{
                                      width: 30, height: 30, borderRadius: '50%',
                                      background: 'var(--bg-elevated)', border: '2px solid var(--bg-surface)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)',
                                      marginLeft: -6,
                                    }}>
                                      +{next.attendees.length - 5}
                                    </div>
                                  )}
                                </div>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  {next.attendees.length} asistentes
                                </span>
                              </div>
                            )}
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowL10(true)}>
                              <Play size={14} /> Iniciar L10 ahora
                            </button>
                          </>
                        )
                      })()}
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
                      <div className="empty-state-icon"><CalendarDays size={24} /></div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sin reuniones próximas</p>
                      <button className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-3)' }} onClick={() => setShowForm(true)}>
                        <Plus size={13} /> Agendar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Historial ──────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
                Cargando reuniones...
              </div>
            ) : meetings.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-state-icon"><CalendarDays size={32} /></div>
                <h3>Sin reuniones registradas</h3>
                <p>Agenda tu primera reunión o inicia un L10.</p>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                  <Plus size={14} /> Nueva Reunión
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>

                {/* Próximas */}
                {sortedUpcoming.length > 0 && (
                  <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Próximas
                      </h3>
                      <span style={{
                        padding: '1px 8px', borderRadius: 'var(--radius-full)',
                        fontSize: '0.72rem', fontWeight: 700,
                        color: '#3B82F6', background: 'rgba(59,130,246,0.12)',
                      }}>
                        {sortedUpcoming.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {sortedUpcoming.map(m => (
                        <MeetingCard key={m.id} meeting={m} onUpdate={update} onRemove={remove} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Completadas */}
                {sortedCompleted.length > 0 && (
                  <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Completadas
                      </h3>
                      <span style={{
                        padding: '1px 8px', borderRadius: 'var(--radius-full)',
                        fontSize: '0.72rem', fontWeight: 700,
                        color: '#10B981', background: 'rgba(16,185,129,0.12)',
                      }}>
                        {sortedCompleted.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {sortedCompleted.map(m => (
                        <MeetingCard key={m.id} meeting={m} onUpdate={update} onRemove={remove} />
                      ))}
                    </div>
                  </section>
                )}

              </div>
            )}
          </div>
        )}

        {/* ── Tab: Transcripciones ────────────────────────────────── */}
        {activeTab === 'transcripciones' && (
          <div>
            {/* Header del tab */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Transcripciones de Reuniones</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>Repositorio estructurado para detectar patrones a lo largo del tiempo</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowTransForm(s => !s)}>+ Nueva transcripción</button>
            </div>

            {/* Patrones detectados */}
            {transcriptions.length >= 3 && (
              <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
                <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Patrones detectados</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>Temas más frecuentes</p>
                    {topTopics(5).map((t, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{t.label}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.count}x</span>
                      </div>
                    ))}
                  </div>
                  {recurringTopics().length > 0 && (
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-warning)', textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>Asuntos recurrentes (3+ veces)</p>
                      {recurringTopics().map((t, i) => (
                        <div key={i} style={{ padding: 'var(--space-2)', background: 'rgba(234,179,8,0.06)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          ⚠ {t.label} ({t.count}x)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Formulario nueva transcripción */}
            {showTransForm && (
              <div className="card" style={{ marginBottom: 'var(--space-5)', border: '1px solid var(--brand-primary)' }}>
                <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Nueva Transcripción</p>
                <div className="form-grid">
                  <div>
                    <label className="form-label">Participantes (separados por coma)</label>
                    <input className="form-input" value={transForm.participants_raw} onChange={e => setTransForm(f => ({ ...f, participants_raw: e.target.value }))} placeholder="Carlos M., Ana L., ..." />
                  </div>
                  <div>
                    <label className="form-label">Reunión relacionada</label>
                    <select className="form-input" value={transForm.meeting_id || ''} onChange={e => setTransForm(f => ({ ...f, meeting_id: e.target.value || null }))}>
                      <option value="">Sin vincular</option>
                      {meetings.filter(m => m.status === 'completed').map(m => (
                        <option key={m.id} value={m.id}>{m.title} — {m.date}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Temas tratados (uno por línea — formato: "componente: descripción" ej. "vision: revisar core values")</label>
                    <textarea className="form-input" rows={3} value={transForm.topics_raw} onChange={e => setTransForm(f => ({ ...f, topics_raw: e.target.value }))} placeholder={'vision: revisar core values\ntraccion: rocas Q2\nasuntos: proveedor retrasa entrega'} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Decisiones tomadas (una por línea)</label>
                    <textarea className="form-input" rows={2} value={transForm.decisions_raw} onChange={e => setTransForm(f => ({ ...f, decisions_raw: e.target.value }))} placeholder="Cambiar proveedor de materiales antes del 15 de mayo" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Transcripción completa (pegar desde Otter / Teams / Zoom)</label>
                    <textarea className="form-input" rows={6} value={transForm.raw_transcript} onChange={e => setTransForm(f => ({ ...f, raw_transcript: e.target.value }))} placeholder="Pegar aquí la transcripción completa de la reunión..." />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                  <button className="btn btn-primary" onClick={() => {
                    const topics = transForm.topics_raw.split('\n').filter(Boolean).map(line => {
                      const [comp, ...rest] = line.split(':')
                      const eos_component = EOS_COMPONENTS_TAGS.includes(comp.trim()) ? comp.trim() : 'general'
                      return { label: rest.join(':').trim() || comp.trim(), eos_component }
                    })
                    addTranscription({
                      participants: transForm.participants_raw.split(',').map(s => s.trim()).filter(Boolean),
                      topics,
                      decisions: transForm.decisions_raw.split('\n').filter(Boolean),
                      commitments: [],
                      raw_transcript: transForm.raw_transcript,
                      meeting_id: transForm.meeting_id,
                      source: 'manual',
                    })
                    setTransForm({ participants_raw: '', topics_raw: '', decisions_raw: '', commitments_raw: '', raw_transcript: '', meeting_id: null })
                    setShowTransForm(false)
                  }}>Guardar Transcripción</button>
                  <button className="btn btn-ghost" onClick={() => setShowTransForm(false)}>Cancelar</button>
                </div>
              </div>
            )}

            {/* Placeholder integración */}
            <div style={{ padding: 'var(--space-4)', background: 'var(--bg-elevated)', border: '1px dashed var(--border-medium)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Integración automática de transcripciones</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Conecta Otter.ai, Microsoft Teams o Zoom para que las transcripciones lleguen automáticamente.</p>
              </div>
              <span style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'var(--bg-base)', border: '1px solid var(--border-medium)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Próximamente</span>
            </div>

            {/* Lista de transcripciones */}
            {tLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>Cargando...</div>
            ) : transcriptions.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-state-icon">🎙</div>
                <h3>Sin transcripciones aún</h3>
                <p>Agrega la primera transcripción de una reunión L10.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {transcriptions.map(t => (
                  <div key={t.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{new Date(t.created_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.participants?.join(', ')}</p>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeTranscription(t.id)} style={{ color: 'var(--status-error)' }}>Eliminar</button>
                    </div>
                    {t.topics?.length > 0 && (
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                        {t.topics.map((tp, i) => (
                          <span key={i} style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 600, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                            {tp.eos_component}: {tp.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {t.decisions?.length > 0 && (
                      <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Decisiones</p>
                        {t.decisions.map((d, i) => <p key={i} style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>• {d}</p>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
