// src/pages/ProcesosPage.jsx — Procesos medulares CRUD
import { useState } from 'react'
import { Settings2, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useProcesses } from '../lib/useProcesses'
import GuiaEOS from '../components/guia/GuiaEOS'

const STATUS_CFG = {
  documented:  { label: 'Documentado',  icon: CheckCircle2, color: 'var(--status-success)', bg: 'rgba(34,197,94,0.1)' },
  'in-progress':{ label: 'En Progreso', icon: Clock,        color: 'var(--status-warning)', bg: 'rgba(234,179,8,0.1)' },
  'needs-work':{ label: 'Necesita Trabajo', icon: AlertCircle, color: 'var(--status-error)', bg: 'rgba(239,68,68,0.1)' },
}

const EMPTY_FORM = { name: '', owner: '', status: 'needs-work', documented: false, steps: [''], kpi: '', notes: '' }

function ProcessCard({ process, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState({ ...process, steps: process.steps?.length ? process.steps : [''] })
  const sc = STATUS_CFG[process.status]
  const Icon = sc.icon

  function addStep() { setForm(f => ({ ...f, steps: [...f.steps, ''] })) }
  function removeStep(i) { setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) })) }
  function updateStep(i, val) { setForm(f => { const s = [...f.steps]; s[i] = val; return { ...f, steps: s } }) }

  function save() {
    onUpdate({ ...form, steps: form.steps.filter(s => s.trim()), documented: form.status === 'documented' })
    setEditing(false)
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${sc.color}` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)', flexWrap: 'wrap' }}>
        <Icon size={18} style={{ color: sc.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{process.name}</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Owner: {process.owner || '—'} · {process.steps?.filter(s => s.trim()).length || 0} pasos
            {process.kpi && <> · KPI: {process.kpi}</>}
          </p>
        </div>
        <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 600, color: sc.color, background: sc.bg, flexShrink: 0 }}>
          {sc.label}
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(e => !e); setExpanded(true) }}>Editar</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onRemove(process.id)} style={{ color: 'var(--status-error)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', padding: 'var(--space-4) var(--space-5)' }}>
          {editing ? (
            <div>
              <div className="form-grid" style={{ marginBottom: 'var(--space-4)' }}>
                <div>
                  <label className="form-label">Nombre del proceso</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Responsable</label>
                  <input className="form-input" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Estado</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">KPI</label>
                  <input className="form-input" value={form.kpi} onChange={e => setForm(f => ({ ...f, kpi: e.target.value }))} placeholder="Ej. 95% proyectos en tiempo" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Notas</label>
                  <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Pasos del proceso</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addStep}><Plus size={13} /> Paso</button>
                </div>
                {form.steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--brand-primary)', color: '#000', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <input className="form-input" style={{ flex: 1, marginBottom: 0 }} value={step} onChange={e => updateStep(i, e.target.value)} placeholder={`Paso ${i + 1}`} />
                    {form.steps.length > 1 && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeStep(i)} style={{ color: 'var(--status-error)', flexShrink: 0 }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button className="btn btn-primary" onClick={save}>Guardar</button>
                <button className="btn btn-ghost" onClick={() => { setEditing(false); setForm({ ...process, steps: process.steps?.length ? process.steps : [''] }) }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div>
              {process.steps?.filter(s => s.trim()).length > 0 && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-3)' }}>Pasos</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {process.steps.filter(s => s.trim()).map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand-primary)', color: '#000', fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          {i + 1}
                        </span>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {process.notes && (
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Notas</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{process.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProcesosPage() {
  const { processes, loading, add, update, remove } = useProcesses()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [filter, setFilter]     = useState('all')
  const [activeTab, setActiveTab] = useState('modulo')

  const stats = {
    documented:  processes.filter(p => p.status === 'documented').length,
    inProgress:  processes.filter(p => p.status === 'in-progress').length,
    needsWork:   processes.filter(p => p.status === 'needs-work').length,
  }
  const pct = processes.length ? Math.round((stats.documented / processes.length) * 100) : 0
  const filtered = filter === 'all' ? processes : processes.filter(p => p.status === filter)

  function addStep() { setForm(f => ({ ...f, steps: [...f.steps, ''] })) }
  function removeStep(i) { setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) })) }
  function updateStep(i, val) { setForm(f => { const s = [...f.steps]; s[i] = val; return { ...f, steps: s } }) }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    await add({ ...form, steps: form.steps.filter(s => s.trim()), documented: form.status === 'documented' })
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  return (
    <div className="fade-in">
      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
        {[['modulo', 'Procesos'], ['guia', 'Guía EOS']].map(([k, l]) => (
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
                <div className="page-title-icon" style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <Settings2 size={24} style={{ color: 'var(--eos-process)' }} />
                </div>
                <div>
                  <h1>Procesos</h1>
                  <p style={{ marginTop: 4 }}>Procesos medulares del negocio — documentación y estado</p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
                <Plus size={16} /> Nuevo Proceso
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
            {[
              { label: 'Total',          value: processes.length,  color: 'var(--text-primary)' },
              { label: 'Documentados',   value: stats.documented,  color: 'var(--status-success)' },
              { label: 'En Progreso',    value: stats.inProgress,  color: 'var(--status-warning)' },
              { label: 'Necesitan Trabajo', value: stats.needsWork, color: 'var(--status-error)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <p style={{ fontWeight: 600 }}>Documentación completada</p>
              <span style={{ fontWeight: 700, color: pct >= 80 ? 'var(--status-success)' : pct >= 50 ? 'var(--status-warning)' : 'var(--status-error)' }}>{pct}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--eos-process)', transition: 'width 0.6s ease' }} />
            </div>
          </div>

          {/* New process form */}
          {showForm && (
            <div className="card" style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--eos-process)' }}>
              <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Nuevo Proceso</p>
              <form onSubmit={handleAdd}>
                <div className="form-grid">
                  <div>
                    <label className="form-label">Nombre del proceso *</label>
                    <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Gestión de Proyectos" />
                  </div>
                  <div>
                    <label className="form-label">Responsable</label>
                    <input className="form-input" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Nombre" />
                  </div>
                  <div>
                    <label className="form-label">Estado</label>
                    <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">KPI del proceso</label>
                    <input className="form-input" value={form.kpi} onChange={e => setForm(f => ({ ...f, kpi: e.target.value }))} placeholder="Indicador de éxito" />
                  </div>
                </div>

                <div style={{ marginTop: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Pasos del proceso</label>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={addStep}><Plus size={13} /> Paso</button>
                  </div>
                  {form.steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand-primary)', color: '#000', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <input className="form-input" style={{ flex: 1, marginBottom: 0 }} value={step} onChange={e => updateStep(i, e.target.value)} placeholder={`Paso ${i + 1}`} />
                      {form.steps.length > 1 && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeStep(i)} style={{ color: 'var(--status-error)' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                  <button type="submit" className="btn btn-primary">Agregar Proceso</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {/* Filter */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
            {[['all','Todos'],['documented','Documentados'],['in-progress','En Progreso'],['needs-work','Necesitan Trabajo']].map(([k,l]) => (
              <button key={k} onClick={() => setFilter(k)} style={{
                padding: 'var(--space-2) var(--space-4)', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 600,
                color: filter === k ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: `2px solid ${filter === k ? 'var(--eos-process)' : 'transparent'}`,
                marginBottom: -1,
              }}>{l}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>Cargando procesos...</div>
          ) : filtered.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon"><Settings2 size={32} /></div>
              <h3>Sin procesos registrados</h3>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Nuevo Proceso</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {filtered.map(p => <ProcessCard key={p.id} process={p} onUpdate={update} onRemove={remove} />)}
            </div>
          )}
        </div>
      )}
      {activeTab === 'guia' && <GuiaEOS module="procesos" />}
    </div>
  )
}
