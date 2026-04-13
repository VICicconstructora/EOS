// src/pages/TraccionPage.jsx — Rocas trimestrales CRUD
import { useState } from 'react'
import { Rocket, Plus, Trash2, CheckCircle2, AlertCircle, Circle, ChevronDown, ChevronUp, Target } from 'lucide-react'
import { useRocks } from '../lib/useRocks'
import GuiaEOS from '../components/guia/GuiaEOS'

const PRIORITY_CFG = {
  alta:  { label: 'Alta',  color: 'var(--status-error)',   bg: 'rgba(239,68,68,0.1)' },
  media: { label: 'Media', color: 'var(--status-warning)', bg: 'rgba(234,179,8,0.1)' },
  baja:  { label: 'Baja',  color: 'var(--status-success)', bg: 'rgba(34,197,94,0.1)' },
}
const STATUS_CFG = {
  'on-track':  { label: 'En Camino',  icon: CheckCircle2, color: 'var(--status-success)' },
  'off-track': { label: 'En Riesgo',  icon: AlertCircle,  color: 'var(--status-error)'   },
  'done':      { label: 'Completada', icon: CheckCircle2, color: 'var(--brand-primary)'  },
}
const EMPTY_FORM = { title: '', owner: '', priority: 'media', status: 'on-track', due: '', notes: '' }

function RockRow({ rock, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState(rock)
  const sc = STATUS_CFG[rock.status]
  const pc = PRIORITY_CFG[rock.priority]
  const Icon = sc.icon

  function save() {
    onUpdate(form)
    setEditing(false)
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', flexWrap: 'wrap' }}>
        <Icon size={18} style={{ color: sc.color, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              className="form-input" style={{ marginBottom: 0 }}
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          ) : (
            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: rock.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: rock.status === 'done' ? 'line-through' : 'none' }}>
              {rock.title}
            </p>
          )}
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{rock.owner} · Vence {rock.due || '—'}</p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 600, color: pc.color, background: pc.bg }}>
            {pc.label}
          </span>
          {/* Status selector */}
          {editing ? (
            <select className="form-input" style={{ padding: '4px 8px', fontSize: '0.8rem', marginBottom: 0 }}
              value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          ) : (
            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 600, color: sc.color, background: `${sc.color}18` }}>
              {sc.label}
            </span>
          )}

          {editing ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={save}>Guardar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setForm(rock) }}>Cancelar</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Editar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => onRemove(rock.id)} style={{ color: 'var(--status-error)' }}>
                <Trash2 size={14} />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded edit */}
      {expanded && !editing && (
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Propietario</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{rock.owner || '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Trimestre</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{rock.quarter}</p>
          </div>
          {rock.notes && (
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Notas</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{rock.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Inline full edit form */}
      {editing && (
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <div>
            <label className="form-label">Propietario</label>
            <input className="form-input" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Nombre" />
          </div>
          <div>
            <label className="form-label">Fecha límite</label>
            <input className="form-input" type="date" value={form.due} onChange={e => setForm(f => ({ ...f, due: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Prioridad</label>
            <select className="form-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
          <div>
            <label className="form-label">Notas</label>
            <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" />
          </div>
        </div>
      )}
    </div>
  )
}

export default function TraccionPage() {
  const { rocks, loading, add, update, remove, quarter } = useRocks()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [filter, setFilter]     = useState('all')
  const [activeTab, setActiveTab] = useState('modulo')

  const stats = {
    total:    rocks.length,
    onTrack:  rocks.filter(r => r.status === 'on-track').length,
    offTrack: rocks.filter(r => r.status === 'off-track').length,
    done:     rocks.filter(r => r.status === 'done').length,
  }
  const pct = stats.total ? Math.round(((stats.done + stats.onTrack * 0.5) / stats.total) * 100) : 0

  const filtered = filter === 'all' ? rocks : rocks.filter(r => r.status === filter)

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    await add(form)
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  return (
    <div className="fade-in">
      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
        {[['modulo', 'Tracción'], ['guia', 'Guía EOS']].map(([k, l]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{
            padding: 'var(--space-3) var(--space-5)', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600,
            color: activeTab === k ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: `2px solid ${activeTab === k ? 'var(--brand-primary)' : 'transparent'}`,
            marginBottom: -1,
          }}>{l}</button>
        ))}
      </div>

      {activeTab === 'modulo' && (
        <div>
          <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
              <div className="page-title">
                <div className="page-title-icon" style={{ background: 'rgba(232,160,32,0.1)' }}>
                  <Rocket size={24} style={{ color: 'var(--eos-traction)' }} />
                </div>
                <div>
                  <h1>Tracción</h1>
                  <p style={{ marginTop: 4 }}>Rocas trimestrales — {quarter.replace('_', ' ')}</p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
                <Plus size={16} /> Nueva Roca
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
            {[
              { label: 'Total Rocas',   value: stats.total,    color: 'var(--text-primary)' },
              { label: 'En Camino',     value: stats.onTrack,  color: 'var(--status-success)' },
              { label: 'En Riesgo',     value: stats.offTrack, color: 'var(--status-error)' },
              { label: 'Completadas',   value: stats.done,     color: 'var(--brand-primary)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={16} style={{ color: 'var(--eos-traction)' }} /> Progreso del Trimestre
              </p>
              <span style={{ fontWeight: 700, color: pct >= 80 ? 'var(--status-success)' : pct >= 50 ? 'var(--status-warning)' : 'var(--status-error)' }}>
                {pct}%
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--status-success)' : pct >= 50 ? 'var(--status-warning)' : 'var(--status-error)', transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
              {[['var(--status-success)', 'En Camino'], ['var(--status-error)', 'En Riesgo'], ['var(--brand-primary)', 'Completadas']].map(([c, l]) => (
                <span key={l} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} /> {l}
                </span>
              ))}
            </div>
          </div>

          {/* New rock form */}
          {showForm && (
            <div className="card" style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--brand-primary)' }}>
              <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Nueva Roca</p>
              <form onSubmit={handleAdd}>
                <div className="form-grid">
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Título de la Roca *</label>
                    <input className="form-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="¿Qué quieres lograr este trimestre?" />
                  </div>
                  <div>
                    <label className="form-label">Propietario</label>
                    <input className="form-input" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Nombre del responsable" />
                  </div>
                  <div>
                    <label className="form-label">Fecha límite</label>
                    <input className="form-input" type="date" value={form.due} onChange={e => setForm(f => ({ ...f, due: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Prioridad</label>
                    <select className="form-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Estado inicial</label>
                    <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="on-track">En Camino</option>
                      <option value="off-track">En Riesgo</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Notas</label>
                    <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Contexto adicional (opcional)" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                  <button type="submit" className="btn btn-primary">Agregar Roca</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
            {[['all', 'Todas'], ['on-track', 'En Camino'], ['off-track', 'En Riesgo'], ['done', 'Completadas']].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} style={{
                padding: 'var(--space-2) var(--space-4)', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 600,
                color: filter === k ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: `2px solid ${filter === k ? 'var(--brand-primary)' : 'transparent'}`,
                marginBottom: -1, transition: 'all var(--duration-fast)',
              }}>{l}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>Cargando rocas...</div>
          ) : filtered.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon"><Rocket size={32} /></div>
              <h3>Sin rocas {filter !== 'all' ? 'en esta categoría' : 'este trimestre'}</h3>
              <p>Agrega las prioridades más importantes del trimestre.</p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Nueva Roca</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {filtered.map(rock => (
                <RockRow key={rock.id} rock={rock} onUpdate={update} onRemove={remove} />
              ))}
            </div>
          )}
        </div>
      )}
      {activeTab === 'guia' && <GuiaEOS module="traccion" />}
    </div>
  )
}
