// src/pages/AsuntosPage.jsx — Issues con flujo IDS (Identify, Discuss, Solve)
import { useState } from 'react'
import { AlertTriangle, Plus, Trash2, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { useIssues } from '../lib/useIssues'
import GuiaEOS from '../components/guia/GuiaEOS'

const TYPE_CFG = {
  operacional:  { label: 'Operacional',  color: 'var(--status-info)',    bg: 'rgba(59,130,246,0.1)' },
  personas:     { label: 'Personas',     color: 'var(--eos-people)',     bg: 'rgba(34,197,94,0.1)'  },
  financiero:   { label: 'Financiero',   color: 'var(--status-warning)', bg: 'rgba(234,179,8,0.1)'  },
  comunicacion: { label: 'Comunicación', color: 'var(--eos-vision)',     bg: 'rgba(139,92,246,0.1)' },
  estrategico:  { label: 'Estratégico',  color: 'var(--eos-traction)',   bg: 'rgba(232,160,32,0.1)' },
}
const PRIORITY_CFG = {
  alta:  { label: 'Alta',  color: 'var(--status-error)'   },
  media: { label: 'Media', color: 'var(--status-warning)' },
  baja:  { label: 'Baja',  color: 'var(--status-success)' },
}
const STATUS_STEPS = ['open', 'discussing', 'solved']
const STATUS_LABELS = { open: 'Identificado', discussing: 'Discutiendo', solved: 'Resuelto' }

const EMPTY_FORM = { title: '', type: 'operacional', priority: 'media', identified_by: '', discussion: '', solution: '', owner: '' }

function IssueCard({ issue, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const [editField, setEditField] = useState({})
  const tc = TYPE_CFG[issue.type]
  const pc = PRIORITY_CFG[issue.priority]
  const stepIdx = STATUS_STEPS.indexOf(issue.status)

  function advance() {
    if (stepIdx < STATUS_STEPS.length - 1) onUpdate({ ...issue, status: STATUS_STEPS[stepIdx + 1] })
  }
  function saveField(field, value) {
    onUpdate({ ...issue, [field]: value })
    setEditField({})
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${pc.color}` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 600, color: tc.color, background: tc.bg }}>{tc.label}</span>
            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 600, color: pc.color, background: `${pc.color}18` }}>{pc.label}</span>
            {issue.owner && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Owner: {issue.owner}</span>}
          </div>
          <p style={{ fontWeight: 600, fontSize: '0.9rem', color: issue.status === 'solved' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: issue.status === 'solved' ? 'line-through' : 'none' }}>
            {issue.title}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Por: {issue.identified_by || '—'} · {issue.created_at}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {/* IDS progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {STATUS_STEPS.map((s, i) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: i <= stepIdx ? (s === 'solved' ? 'var(--brand-primary)' : 'var(--status-success)') : 'var(--border-medium)',
                }} />
                <span style={{ fontSize: '0.7rem', color: i === stepIdx ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === stepIdx ? 700 : 400 }}>
                  {STATUS_LABELS[s]}
                </span>
                {i < STATUS_STEPS.length - 1 && <ArrowRight size={10} style={{ color: 'var(--border-medium)' }} />}
              </span>
            ))}
          </div>

          {issue.status !== 'solved' && (
            <button className="btn btn-primary btn-sm" onClick={advance}>
              {stepIdx === 0 ? 'Discutir' : 'Resolver'}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onRemove(issue.id)} style={{ color: 'var(--status-error)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* IDS Details */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          {[
            { key: 'discussion', label: 'Discusión', placeholder: 'Describe el problema en detalle...' },
            { key: 'solution',   label: 'Solución',  placeholder: 'Describe la solución acordada...' },
            { key: 'owner',      label: 'Responsable', placeholder: 'Quién ejecuta la solución' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                {editField[key] ? (
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => saveField(key, editField[key])}>Guardar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditField({})}>Cancelar</button>
                  </div>
                ) : (
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditField({ [key]: issue[key] || '' })}>Editar</button>
                )}
              </div>
              {editField[key] !== undefined ? (
                key === 'owner' ? (
                  <input className="form-input" value={editField[key]} onChange={e => setEditField({ [key]: e.target.value })} placeholder={placeholder} />
                ) : (
                  <textarea className="form-input" rows={3} value={editField[key]} onChange={e => setEditField({ [key]: e.target.value })} placeholder={placeholder} />
                )
              ) : (
                <p style={{ fontSize: '0.875rem', color: issue[key] ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: issue[key] ? 'normal' : 'italic' }}>
                  {issue[key] || placeholder}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AsuntosPage() {
  const { issues, loading, add, update, remove } = useIssues()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [filter, setFilter]     = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('modulo')

  const stats = {
    open:      issues.filter(i => i.status === 'open').length,
    discussing:issues.filter(i => i.status === 'discussing').length,
    solved:    issues.filter(i => i.status === 'solved').length,
  }

  const filtered = issues.filter(i => {
    const statusOk = filter === 'all' || i.status === filter
    const typeOk   = typeFilter === 'all' || i.type === typeFilter
    return statusOk && typeOk
  })

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
        {[['modulo', 'Asuntos'], ['guia', 'Guía EOS']].map(([k, l]) => (
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
                <div className="page-title-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <AlertTriangle size={24} style={{ color: 'var(--eos-issues)' }} />
                </div>
                <div>
                  <h1>Asuntos</h1>
                  <p style={{ marginTop: 4 }}>Identificar, Discutir y Solucionar problemas (IDS)</p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
                <Plus size={16} /> Nuevo Asunto
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
            {[
              { label: 'Identificados', value: stats.open,       color: 'var(--status-error)'   },
              { label: 'Discutiendo',   value: stats.discussing,  color: 'var(--status-warning)' },
              { label: 'Resueltos',     value: stats.solved,      color: 'var(--status-success)' },
              { label: 'Total',         value: issues.length,     color: 'var(--text-primary)'   },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* New issue form */}
          {showForm && (
            <div className="card" style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--eos-issues)' }}>
              <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Nuevo Asunto</p>
              <form onSubmit={handleAdd}>
                <div className="form-grid">
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Título del asunto *</label>
                    <input className="form-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Describe el problema claramente" />
                  </div>
                  <div>
                    <label className="form-label">Tipo</label>
                    <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
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
                    <label className="form-label">Identificado por</label>
                    <input className="form-input" value={form.identified_by} onChange={e => setForm(f => ({ ...f, identified_by: e.target.value }))} placeholder="Nombre" />
                  </div>
                  <div>
                    <label className="form-label">Responsable (si ya se sabe)</label>
                    <input className="form-input" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Nombre" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Descripción inicial</label>
                    <textarea className="form-input" rows={2} value={form.discussion} onChange={e => setForm(f => ({ ...f, discussion: e.target.value }))} placeholder="Contexto del problema..." />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                  <button type="submit" className="btn btn-primary">Agregar Asunto</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-subtle)' }}>
              {[['all','Todos'],['open','Identificados'],['discussing','Discutiendo'],['solved','Resueltos']].map(([k,l]) => (
                <button key={k} onClick={() => setFilter(k)} style={{
                  padding: 'var(--space-2) var(--space-3)', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.82rem', fontWeight: 600,
                  color: filter === k ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${filter === k ? 'var(--eos-issues)' : 'transparent'}`,
                  marginBottom: -1,
                }}>{l}</button>
              ))}
            </div>
            <select className="form-input" style={{ width: 'auto', padding: '4px 10px', fontSize: '0.82rem' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">Todos los tipos</option>
              {Object.entries(TYPE_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>Cargando asuntos...</div>
          ) : filtered.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon"><AlertTriangle size={32} /></div>
              <h3>Sin asuntos pendientes</h3>
              <p>Registra los problemas del equipo para resolverlos en la reunión L10.</p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Nuevo Asunto</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {filtered.map(issue => (
                <IssueCard key={issue.id} issue={issue} onUpdate={update} onRemove={remove} />
              ))}
            </div>
          )}
        </div>
      )}
      {activeTab === 'guia' && <GuiaEOS module="asuntos" />}
    </div>
  )
}
