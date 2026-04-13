// src/pages/PersonasPage.jsx — Equipo + EQP (Entiende/Quiere/Puede)
import { useState } from 'react'
import { Users, Plus, Trash2, ChevronDown, ChevronUp, Star, Mail, Phone } from 'lucide-react'
import { usePeople } from '../lib/usePeople'
import GuiaEOS from '../components/guia/GuiaEOS'

const DEPT_COLORS = {
  'Dirección':   'var(--brand-primary)',
  'Operaciones': 'var(--eos-traction)',
  'Finanzas':    'var(--status-success)',
  'Personas':    'var(--eos-people)',
  'Comercial':   'var(--eos-vision)',
  'Tecnología':  'var(--status-info)',
}
const EQP_LABELS = ['E', 'Q', 'P']
const EQP_FULL   = ['Entiende', 'Quiere', 'Puede']

const EMPTY_FORM = { name: '', role: '', dept: 'Operaciones', email: '', phone: '', gwc: [true, true, true], values_fit: true, notes: '' }

function PersonCard({ person, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState({ ...person, gwc: person.gwc ?? [true, true, true] })

  const gwc = person.gwc ?? [true, true, true]
  const gwcOk = gwc.every(Boolean)
  const deptColor = DEPT_COLORS[person.dept] || 'var(--text-muted)'
  const initials = person.name.split(' ').map(n => n[0]).slice(0, 2).join('')

  function toggleGwc(i) {
    setForm(f => { const g = [...f.gwc]; g[i] = !g[i]; return { ...f, gwc: g } })
  }

  function save() {
    onUpdate(form)
    setEditing(false)
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)', flexWrap: 'wrap' }}>
        {/* Avatar */}
        <div className="avatar" style={{ background: deptColor, color: '#fff', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
          {initials}
        </div>

        {/* Name + role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{person.name}</p>
            {person.values_fit && <Star size={13} style={{ color: 'var(--brand-primary)', fill: 'var(--brand-primary)', flexShrink: 0 }} title="Encaja con valores" />}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{person.role}</p>
          <span style={{ fontSize: '0.72rem', padding: '1px 7px', borderRadius: 'var(--radius-full)', background: `${deptColor}18`, color: deptColor, fontWeight: 600 }}>
            {person.dept}
          </span>
        </div>

        {/* EQP dots */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {gwc.map((ok, i) => (
            <div key={i} title={`${EQP_FULL[i]}: ${ok ? 'Sí' : 'No'}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: ok ? 'var(--status-success)' : 'var(--status-error)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>
                {EQP_LABELS[i]}
              </div>
            </div>
          ))}
          {!gwcOk && <span style={{ fontSize: '0.72rem', color: 'var(--status-error)', fontWeight: 700 }}>Atención</span>}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(e => !e); setExpanded(true) }}>Editar</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onRemove(person.id)} style={{ color: 'var(--status-error)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', padding: 'var(--space-4) var(--space-5)' }}>
          {editing ? (
            <div className="form-grid">
              <div>
                <label className="form-label">Nombre completo</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Puesto</label>
                <input className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Departamento</label>
                <input className="form-input" value={form.dept} onChange={e => setForm(f => ({ ...f, dept: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Encaja con valores</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={form.values_fit} onChange={e => setForm(f => ({ ...f, values_fit: e.target.checked }))} />
                    Sí, encaja con los valores de IC Constructora
                  </label>
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">EQP — Entiende / Quiere / Puede</label>
                <div style={{ display: 'flex', gap: 'var(--space-5)', marginTop: 8 }}>
                  {EQP_FULL.map((label, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input type="checkbox" checked={form.gwc[i]} onChange={() => toggleGwc(i)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notas</label>
                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 'var(--space-3)' }}>
                <button className="btn btn-primary" onClick={save}>Guardar</button>
                <button className="btn btn-ghost" onClick={() => { setEditing(false); setForm({ ...person, gwc: person.gwc ?? [true,true,true] }) }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              {person.email && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} /> {person.email}
                </p>
              )}
              {person.phone && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={13} /> {person.phone}
                </p>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                  Evaluación EQP
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  {EQP_FULL.map((label, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: gwc[i] ? 'var(--status-success)' : 'var(--status-error)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff', fontWeight: 700 }}>
                        {gwc[i] ? '✓' : '✗'}
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {person.notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Notas</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{person.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PersonasPage() {
  const { people, loading, add, update, remove } = usePeople()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [deptFilter, setDeptFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('modulo')

  const depts = ['all', ...new Set(people.map(p => p.dept))]
  const filtered = deptFilter === 'all' ? people : people.filter(p => p.dept === deptFilter)

  const needsAttention = people.filter(p => !(p.gwc ?? [true,true,true]).every(Boolean) || !p.values_fit)

  function toggleGwc(i) {
    setForm(f => { const g = [...f.gwc]; g[i] = !g[i]; return { ...f, gwc: g } })
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    await add(form)
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  return (
    <div className="fade-in">
      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
        {[['modulo', 'Personas'], ['guia', 'Guía EOS']].map(([k, l]) => (
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
                <div className="page-title-icon" style={{ background: 'rgba(34,197,94,0.1)' }}>
                  <Users size={24} style={{ color: 'var(--eos-people)' }} />
                </div>
                <div>
                  <h1>Personas</h1>
                  <p style={{ marginTop: 4 }}>Equipo directivo con evaluación EQP (Entiende / Quiere / Puede)</p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
                <Plus size={16} /> Agregar Persona
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
            {[
              { label: 'Total equipo',       value: people.length,   color: 'var(--text-primary)'   },
              { label: 'EQP Completo',       value: people.filter(p => (p.gwc ?? [true,true,true]).every(Boolean)).length, color: 'var(--status-success)' },
              { label: 'Necesitan atención', value: needsAttention.length, color: 'var(--status-error)' },
              { label: 'Encajan valores',    value: people.filter(p => p.values_fit).length, color: 'var(--brand-primary)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {needsAttention.length > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)', marginBottom: 'var(--space-6)' }}>
              <p style={{ fontWeight: 600, color: 'var(--status-error)', marginBottom: 4, fontSize: '0.9rem' }}>
                ⚠ {needsAttention.length} persona(s) necesitan atención
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {needsAttention.map(p => p.name).join(', ')} — revisar evaluación EQP o encaje con valores.
              </p>
            </div>
          )}

          {/* New person form */}
          {showForm && (
            <div className="card" style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--eos-people)' }}>
              <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Nueva Persona</p>
              <form onSubmit={handleAdd}>
                <div className="form-grid">
                  <div>
                    <label className="form-label">Nombre completo *</label>
                    <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre Apellido" />
                  </div>
                  <div>
                    <label className="form-label">Puesto</label>
                    <input className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Director, Gerente, etc." />
                  </div>
                  <div>
                    <label className="form-label">Departamento</label>
                    <input className="form-input" value={form.dept} onChange={e => setForm(f => ({ ...f, dept: e.target.value }))} placeholder="Operaciones, Finanzas..." />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Evaluación EQP</label>
                    <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 8 }}>
                      {EQP_FULL.map((label, i) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                          <input type="checkbox" checked={form.gwc[i]} onChange={() => toggleGwc(i)} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Notas</label>
                    <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Fortalezas, áreas de mejora..." />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                  <button type="submit" className="btn btn-primary">Agregar</button>
                  <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {/* Dept filter */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            {depts.map(d => (
              <button key={d} onClick={() => setDeptFilter(d)} style={{
                padding: 'var(--space-2) var(--space-4)', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 600,
                color: deptFilter === d ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: `2px solid ${deptFilter === d ? 'var(--eos-people)' : 'transparent'}`,
                marginBottom: -1,
              }}>{d === 'all' ? 'Todos' : d}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>Cargando equipo...</div>
          ) : filtered.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon"><Users size={32} /></div>
              <h3>Sin personas registradas</h3>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Agregar Persona</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {filtered.map(p => <PersonCard key={p.id} person={p} onUpdate={update} onRemove={remove} />)}
            </div>
          )}
        </div>
      )}
      {activeTab === 'guia' && <GuiaEOS module="personas" />}
    </div>
  )
}
