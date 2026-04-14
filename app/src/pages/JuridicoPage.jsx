// src/pages/JuridicoPage.jsx — Módulo Jurídico: procesos legales con hitos, involucrados y bitácora
import { useState } from 'react'
import { Scale, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2, Circle, FileText, AlertTriangle, MessageSquare, Users, Clock } from 'lucide-react'
import { useLegal } from '../lib/useLegal'

const TYPE_CFG = {
  compraventa:    { label: 'Compraventa',     color: 'var(--status-info)'    },
  promesa:        { label: 'Promesa CV',       color: 'var(--eos-vision)'     },
  escrituracion:  { label: 'Escrituración',   color: 'var(--eos-people)'     },
  hipoteca:       { label: 'Hipoteca',         color: 'var(--status-warning)' },
  licencia:       { label: 'Licencia',         color: 'var(--eos-process)'    },
  permiso:        { label: 'Permiso',          color: 'var(--status-warning)' },
  contrato:       { label: 'Contrato',         color: 'var(--brand-primary)'  },
  demanda:        { label: 'Demanda',          color: 'var(--status-error)'   },
  otro:           { label: 'Otro',             color: 'var(--text-muted)'     },
}

const STATUS_CFG = {
  pendiente:    { label: 'Pendiente',    color: 'var(--text-muted)'     },
  'en-proceso': { label: 'En proceso',  color: 'var(--status-info)'    },
  'en-revision':{ label: 'En revisión', color: 'var(--status-warning)' },
  aprobado:     { label: 'Aprobado',    color: 'var(--eos-people)'     },
  cerrado:      { label: 'Cerrado',     color: 'var(--status-success)' },
  cancelado:    { label: 'Cancelado',   color: 'var(--status-error)'   },
}

const PRIORITY_CFG = {
  alta:  { color: 'var(--status-error)'   },
  media: { color: 'var(--status-warning)' },
  baja:  { color: 'var(--status-success)' },
}

const COMMENT_TYPE_CFG = {
  nota:     { label: 'Nota',     color: 'var(--text-secondary)', icon: MessageSquare },
  alerta:   { label: 'Alerta',   color: 'var(--status-error)',   icon: AlertTriangle },
  decision: { label: 'Decisión', color: 'var(--eos-vision)',     icon: CheckCircle2  },
  accion:   { label: 'Acción',   color: 'var(--brand-primary)',  icon: Clock         },
}

const PARTY_ROLES = ['Comprador','Vendedor','Abogado comprador','Abogado vendedor','Notario','Fiduciaria','Banco','Aseguradora','Entidad pública','Otro']
const DOC_CATEGORIES = ['general','juridico','contrato','soporte','notarial','otro']

function fmtCOP(n) {
  if (!n || n === 0) return ''
  const num = parseFloat(n)
  if (num >= 1e9) return `$${(num/1e9).toFixed(2)}B`
  if (num >= 1e6) return `$${(num/1e6).toFixed(0)}M`
  return `$${num.toLocaleString('es-CO')}`
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff
}

function SubTab({ tabs, active, onChange }) {
  return (
    <div style={{ display:'flex', borderBottom:'1px solid var(--border-subtle)', marginBottom:'var(--space-4)' }}>
      {tabs.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} style={{
          padding:'var(--space-2) var(--space-4)', background:'none', border:'none', cursor:'pointer',
          fontSize:'0.82rem', fontWeight:600,
          color: active === k ? 'var(--text-primary)' : 'var(--text-muted)',
          borderBottom:`2px solid ${active === k ? 'var(--eos-process)' : 'transparent'}`,
          marginBottom:-1, whiteSpace:'nowrap',
        }}>{l}</button>
      ))}
    </div>
  )
}

function ProcessCard({ proc, milestones, parties, documents, comments, onUpdate, onRemove, onAddMilestone, onUpdateMilestone, onRemoveMilestone, onAddParty, onRemoveParty, onAddDocument, onRemoveDocument, onAddComment }) {
  const [expanded, setExpanded] = useState(false)
  const [subTab, setSubTab] = useState('hitos')

  const [showMileForm, setShowMileForm]       = useState(false)
  const [mileForm, setMileForm]               = useState({ title:'', due_date:'', notes:'', order_index: 0 })
  const [showPartyForm, setShowPartyForm]     = useState(false)
  const [partyForm, setPartyForm]             = useState({ name:'', role:'Abogado comprador', type:'externo', email:'', phone:'', notes:'' })
  const [showDocForm, setShowDocForm]         = useState(false)
  const [docForm, setDocForm]                 = useState({ name:'', category:'juridico', file_name:'', uploaded_by:'', version:'1.0', notes:'' })
  const [commentText, setCommentText]         = useState('')
  const [commentAuthor, setCommentAuthor]     = useState('')
  const [commentType, setCommentType]         = useState('nota')

  const myMilestones = milestones.filter(m => m.process_id == proc.id).sort((a, b) => a.order_index - b.order_index)
  const myParties    = parties.filter(p => p.process_id == proc.id)
  const myDocuments  = documents.filter(d => d.process_id == proc.id)
  const myComments   = comments.filter(c => c.process_id == proc.id)

  const completedMilestones = myMilestones.filter(m => m.completed).length
  const tc = TYPE_CFG[proc.type] || TYPE_CFG.otro
  const sc = STATUS_CFG[proc.status] || STATUS_CFG.pendiente
  const pc = PRIORITY_CFG[proc.priority] || PRIORITY_CFG.media
  const daysLeft = daysUntil(proc.due_date)
  const isOverdue = daysLeft !== null && daysLeft < 0
  const isUrgent  = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14

  async function handleAddMilestone(e) {
    e.preventDefault()
    if (!mileForm.title.trim()) return
    await onAddMilestone({ ...mileForm, process_id: proc.id, order_index: myMilestones.length + 1 })
    setMileForm({ title:'', due_date:'', notes:'', order_index: 0 })
    setShowMileForm(false)
  }

  async function handleAddParty(e) {
    e.preventDefault()
    if (!partyForm.name.trim()) return
    await onAddParty({ ...partyForm, process_id: proc.id })
    setPartyForm({ name:'', role:'Abogado comprador', type:'externo', email:'', phone:'', notes:'' })
    setShowPartyForm(false)
  }

  async function handleAddDocument(e) {
    e.preventDefault()
    if (!docForm.name.trim() || !docForm.file_name.trim()) return
    await onAddDocument({ ...docForm, process_id: proc.id })
    setDocForm({ name:'', category:'juridico', file_name:'', uploaded_by:'', version:'1.0', notes:'' })
    setShowDocForm(false)
  }

  async function handleAddComment(e) {
    e.preventDefault()
    if (!commentText.trim() || !commentAuthor.trim()) return
    await onAddComment({ process_id: proc.id, author: commentAuthor, content: commentText, type: commentType })
    setCommentText('')
  }

  return (
    <div className="card" style={{ padding:0, overflow:'hidden', borderLeft:`4px solid ${pc.color}` }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:'var(--space-3)', padding:'var(--space-4) var(--space-5)', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:'var(--space-2)', flexWrap:'wrap', marginBottom:'var(--space-2)' }}>
            <span style={{ padding:'2px 8px', borderRadius:'var(--radius-full)', fontSize:'0.7rem', fontWeight:700, color:tc.color, background:`${tc.color}18` }}>{tc.label}</span>
            <span style={{ padding:'2px 8px', borderRadius:'var(--radius-full)', fontSize:'0.7rem', fontWeight:600, color:sc.color, background:`${sc.color}18` }}>{sc.label}</span>
            {proc.value > 0 && <span style={{ fontSize:'0.75rem', color:'var(--brand-primary)', fontWeight:700 }}>{fmtCOP(proc.value)}</span>}
          </div>
          <p style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--text-primary)' }}>{proc.title}</p>
          <div style={{ display:'flex', gap:'var(--space-4)', flexWrap:'wrap', marginTop:4 }}>
            {proc.responsible && <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Responsable: {proc.responsible}</p>}
            {proc.external_lawyer && <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Abogado: {proc.external_lawyer} {proc.law_firm && `· ${proc.law_firm}`}</p>}
            {proc.notary && <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Notaría: {proc.notary}</p>}
          </div>
          <div style={{ display:'flex', gap:'var(--space-4)', flexWrap:'wrap', marginTop:4 }}>
            {proc.due_date && (
              <p style={{ fontSize:'0.75rem', fontWeight:600, color: isOverdue ? 'var(--status-error)' : isUrgent ? 'var(--status-warning)' : 'var(--text-muted)' }}>
                {isOverdue ? '⚠ Vencido: ' : 'Vence: '}{proc.due_date}
                {daysLeft !== null && daysLeft >= 0 && ` (${daysLeft} días)`}
              </p>
            )}
            {myMilestones.length > 0 && (
              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                Hitos: {completedMilestones}/{myMilestones.length}
              </p>
            )}
          </div>
        </div>
        <div style={{ display:'flex', gap:'var(--space-2)', alignItems:'center', flexShrink:0 }}>
          {myMilestones.length > 0 && (
            <div style={{ display:'flex', gap:3, alignItems:'center' }}>
              {myMilestones.map(m => (
                <span key={m.id} title={m.title} style={{ width:10, height:10, borderRadius:'50%', background: m.completed ? 'var(--status-success)' : 'var(--border-medium)', flexShrink:0, cursor:'pointer' }}
                  onClick={() => onUpdateMilestone({ ...m, completed: !m.completed, completed_date: m.completed ? null : new Date().toISOString().split('T')[0] })}
                />
              ))}
            </div>
          )}
          <select className="form-input" value={proc.status} onChange={e => onUpdate({ ...proc, status: e.target.value })} style={{ padding:'4px 8px', fontSize:'0.78rem', width:'auto' }}>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onRemove(proc.id)} style={{ color:'var(--status-error)' }}><Trash2 size={14} /></button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop:'1px solid var(--border-subtle)', background:'var(--bg-elevated)', padding:'var(--space-4) var(--space-5)' }}>
          {proc.description && (
            <p style={{ fontSize:'0.85rem', color:'var(--text-secondary)', marginBottom:'var(--space-4)', padding:'var(--space-3)', background:'var(--bg-overlay)', borderRadius:'var(--radius-md)' }}>{proc.description}</p>
          )}

          <SubTab
            tabs={[
              ['hitos', `Hitos (${myMilestones.length})`],
              ['involucrados', `Involucrados (${myParties.length})`],
              ['documentos', `Documentos (${myDocuments.length})`],
              ['bitacora', `Bitácora (${myComments.length})`],
            ]}
            active={subTab}
            onChange={setSubTab}
          />

          {/* HITOS */}
          {subTab === 'hitos' && (
            <div>
              <div style={{ position:'relative', paddingLeft:20 }}>
                {myMilestones.map((m, idx) => {
                  const isDone = m.completed
                  const mDays = daysUntil(m.due_date)
                  const mOverdue = mDays !== null && mDays < 0 && !isDone
                  return (
                    <div key={m.id} style={{ display:'flex', gap:'var(--space-3)', marginBottom:'var(--space-3)', position:'relative' }}>
                      <div style={{ position:'absolute', left:-20, top:2, display:'flex', flexDirection:'column', alignItems:'center' }}>
                        <button onClick={() => onUpdateMilestone({ ...m, completed: !isDone, completed_date: isDone ? null : new Date().toISOString().split('T')[0] })} style={{ background:'none', border:'none', cursor:'pointer', padding:0, color: isDone ? 'var(--status-success)' : 'var(--border-medium)' }}>
                          {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>
                        {idx < myMilestones.length - 1 && <div style={{ width:1, flex:1, minHeight:20, background:'var(--border-subtle)', marginTop:2 }} />}
                      </div>
                      <div style={{ flex:1, background:'var(--bg-overlay)', borderRadius:'var(--radius-md)', padding:'var(--space-3)', opacity: isDone ? 0.7 : 1 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                          <p style={{ fontWeight:600, fontSize:'0.85rem', textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--text-muted)' : 'var(--text-primary)' }}>{m.title}</p>
                          <button className="btn btn-ghost btn-sm" onClick={() => onRemoveMilestone(m.id)} style={{ color:'var(--status-error)', padding:'2px 4px' }}><Trash2 size={12} /></button>
                        </div>
                        <div style={{ display:'flex', gap:'var(--space-3)', marginTop:4, flexWrap:'wrap' }}>
                          {m.due_date && <span style={{ fontSize:'0.72rem', color: mOverdue ? 'var(--status-error)' : 'var(--text-muted)' }}>{mOverdue ? '⚠ Vencido: ' : 'Fecha: '}{m.due_date}</span>}
                          {isDone && m.completed_date && <span style={{ fontSize:'0.72rem', color:'var(--status-success)' }}>Completado: {m.completed_date} {m.completed_by && `por ${m.completed_by}`}</span>}
                        </div>
                        {m.notes && <p style={{ fontSize:'0.78rem', color:'var(--text-secondary)', marginTop:4 }}>{m.notes}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>

              {showMileForm ? (
                <form onSubmit={handleAddMilestone} style={{ background:'var(--bg-overlay)', borderRadius:'var(--radius-md)', padding:'var(--space-3)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-2)' }}>
                  <div style={{ gridColumn:'1/-1' }}><label className="form-label">Hito *</label><input className="form-input" required value={mileForm.title} onChange={e => setMileForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Firma de escritura" /></div>
                  <div><label className="form-label">Fecha límite</label><input className="form-input" type="date" value={mileForm.due_date} onChange={e => setMileForm(f => ({ ...f, due_date: e.target.value }))} /></div>
                  <div><label className="form-label">Notas</label><input className="form-input" value={mileForm.notes} onChange={e => setMileForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <div style={{ gridColumn:'1/-1', display:'flex', gap:'var(--space-2)' }}>
                    <button type="submit" className="btn btn-primary btn-sm">Agregar hito</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowMileForm(false)}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowMileForm(true)} style={{ width:'100%', justifyContent:'center', marginTop:'var(--space-2)' }}>
                  <Plus size={14} /> Agregar hito
                </button>
              )}
            </div>
          )}

          {/* INVOLUCRADOS */}
          {subTab === 'involucrados' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'var(--space-3)', marginBottom:'var(--space-3)' }}>
                {myParties.map(p => (
                  <div key={p.id} style={{ background:'var(--bg-overlay)', borderRadius:'var(--radius-md)', padding:'var(--space-3)', position:'relative' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ display:'flex', gap:'var(--space-2)', alignItems:'center', marginBottom:4 }}>
                          <span style={{ fontWeight:600, fontSize:'0.85rem' }}>{p.name}</span>
                        </div>
                        <span style={{ fontSize:'0.7rem', padding:'1px 7px', borderRadius:'var(--radius-full)', background:`${p.type === 'interno' ? 'rgba(16,185,129,0.15)' : 'var(--bg-surface)'}`, color: p.type === 'interno' ? 'var(--eos-people)' : 'var(--text-muted)' }}>{p.role}</span>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => onRemoveParty(p.id)} style={{ color:'var(--status-error)', padding:'2px 4px' }}><Trash2 size={12} /></button>
                    </div>
                    <div style={{ marginTop:'var(--space-2)', fontSize:'0.75rem', color:'var(--text-muted)', display:'flex', flexDirection:'column', gap:2 }}>
                      {p.email && <span>{p.email}</span>}
                      {p.phone && <span>{p.phone}</span>}
                      {p.notes && <span style={{ color:'var(--text-secondary)', fontStyle:'italic' }}>{p.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {showPartyForm ? (
                <form onSubmit={handleAddParty} style={{ background:'var(--bg-overlay)', borderRadius:'var(--radius-md)', padding:'var(--space-4)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-3)' }}>
                  <div style={{ gridColumn:'1/-1' }}><label className="form-label">Nombre *</label><input className="form-input" required value={partyForm.name} onChange={e => setPartyForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><label className="form-label">Rol</label>
                    <select className="form-input" value={partyForm.role} onChange={e => setPartyForm(f => ({ ...f, role: e.target.value }))}>
                      {PARTY_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Tipo</label>
                    <select className="form-input" value={partyForm.type} onChange={e => setPartyForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="interno">Interno</option>
                      <option value="externo">Externo</option>
                    </select>
                  </div>
                  <div><label className="form-label">Email</label><input className="form-input" type="email" value={partyForm.email} onChange={e => setPartyForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><label className="form-label">Teléfono</label><input className="form-input" value={partyForm.phone} onChange={e => setPartyForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div style={{ gridColumn:'1/-1' }}><label className="form-label">Notas</label><input className="form-input" value={partyForm.notes} onChange={e => setPartyForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <div style={{ gridColumn:'1/-1', display:'flex', gap:'var(--space-2)' }}>
                    <button type="submit" className="btn btn-primary btn-sm">Agregar</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPartyForm(false)}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowPartyForm(true)} style={{ width:'100%', justifyContent:'center' }}>
                  <Plus size={14} /> Agregar involucrado
                </button>
              )}
            </div>
          )}

          {/* DOCUMENTOS */}
          {subTab === 'documentos' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'var(--space-3)' }}>
                <p style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>Documentos PDF del proceso</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowDocForm(s => !s)}><Plus size={14} /> Agregar PDF</button>
              </div>
              {showDocForm && (
                <form onSubmit={handleAddDocument} style={{ background:'var(--bg-overlay)', borderRadius:'var(--radius-md)', padding:'var(--space-4)', marginBottom:'var(--space-3)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-3)' }}>
                  <div style={{ gridColumn:'1/-1' }}><label className="form-label">Nombre *</label><input className="form-input" required value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Promesa de compraventa" /></div>
                  <div><label className="form-label">Categoría</label>
                    <select className="form-input" value={docForm.category} onChange={e => setDocForm(f => ({ ...f, category: e.target.value }))}>
                      {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Nombre del archivo PDF *</label><input className="form-input" required value={docForm.file_name} onChange={e => setDocForm(f => ({ ...f, file_name: e.target.value }))} placeholder="documento.pdf" /></div>
                  <div><label className="form-label">Versión</label><input className="form-input" value={docForm.version} onChange={e => setDocForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0" /></div>
                  <div><label className="form-label">Cargado por</label><input className="form-input" value={docForm.uploaded_by} onChange={e => setDocForm(f => ({ ...f, uploaded_by: e.target.value }))} /></div>
                  <div style={{ gridColumn:'1/-1', display:'flex', gap:'var(--space-2)' }}>
                    <button type="submit" className="btn btn-primary btn-sm">Registrar</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDocForm(false)}>Cancelar</button>
                  </div>
                </form>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)' }}>
                {myDocuments.map(doc => (
                  <div key={doc.id} style={{ background:'var(--bg-overlay)', borderRadius:'var(--radius-md)', padding:'var(--space-3) var(--space-4)', display:'flex', gap:'var(--space-3)', alignItems:'center' }}>
                    <FileText size={18} style={{ color:'var(--status-error)', flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:'var(--space-2)', alignItems:'center' }}>
                        <span style={{ fontWeight:600, fontSize:'0.85rem' }}>{doc.name}</span>
                        <span style={{ fontSize:'0.7rem', padding:'1px 6px', borderRadius:'var(--radius-full)', background:'var(--bg-surface)', color:'var(--text-muted)' }}>{doc.category}</span>
                        <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>v{doc.version}</span>
                      </div>
                      <p style={{ fontSize:'0.75rem', color:'var(--status-info)', marginTop:2 }}>{doc.file_name}</p>
                      {doc.uploaded_by && <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>Cargado por: {doc.uploaded_by}</p>}
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => onRemoveDocument(doc.id)} style={{ color:'var(--status-error)' }}><Trash2 size={13} /></button>
                  </div>
                ))}
                {myDocuments.length === 0 && !showDocForm && (
                  <div style={{ textAlign:'center', padding:'var(--space-8)', color:'var(--text-muted)' }}>
                    <FileText size={24} style={{ marginBottom:8, opacity:0.4 }} />
                    <p>Sin documentos registrados.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BITÁCORA */}
          {subTab === 'bitacora' && (
            <div>
              <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)', marginBottom:'var(--space-4)' }}>
                {myComments.map(c => {
                  const ct = COMMENT_TYPE_CFG[c.type] || COMMENT_TYPE_CFG.nota
                  const CIcon = ct.icon
                  return (
                    <div key={c.id} style={{ background:'var(--bg-overlay)', borderRadius:'var(--radius-md)', padding:'var(--space-3) var(--space-4)', borderLeft:`3px solid ${ct.color}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                        <div style={{ display:'flex', gap:'var(--space-2)', alignItems:'center' }}>
                          <CIcon size={13} style={{ color:ct.color }} />
                          <span style={{ fontWeight:700, fontSize:'0.82rem', color:ct.color }}>{c.author}</span>
                          <span style={{ fontSize:'0.7rem', padding:'1px 6px', borderRadius:'var(--radius-full)', background:'var(--bg-surface)', color:'var(--text-muted)' }}>{ct.label}</span>
                        </div>
                        <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                      </div>
                      <p style={{ fontSize:'0.85rem', color:'var(--text-secondary)' }}>{c.content}</p>
                    </div>
                  )
                })}
                {myComments.length === 0 && <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', fontStyle:'italic' }}>Sin entradas en bitácora.</p>}
              </div>
              <form onSubmit={handleAddComment} style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:'var(--space-2)', alignItems:'flex-end' }}>
                <div>
                  <label className="form-label">Autor</label>
                  <input className="form-input" value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)} placeholder="Tu nombre" required />
                </div>
                <div>
                  <label className="form-label">Tipo</label>
                  <select className="form-input" value={commentType} onChange={e => setCommentType(e.target.value)}>
                    {Object.entries(COMMENT_TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Entrada</label>
                  <div style={{ display:'flex', gap:'var(--space-2)' }}>
                    <input className="form-input" style={{ flex:1 }} value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Escribe una nota, alerta, decisión o acción..." required />
                    <button type="submit" className="btn btn-primary btn-sm"><MessageSquare size={14} /></button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const EMPTY_FORM = { title:'', type:'promesa', lot_id:null, status:'pendiente', priority:'alta', start_date:'', due_date:'', responsible:'', external_lawyer:'', law_firm:'', notary:'', value:'', description:'', notes:'' }

export default function JuridicoPage() {
  const { processes, milestones, parties, documents, comments, loading,
    addProcess, updateProcess, removeProcess,
    addMilestone, updateMilestone, removeMilestone,
    addParty, removeParty,
    addDocument, removeDocument,
    addComment,
  } = useLegal()

  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter]   = useState('all')

  const today = new Date().toISOString().split('T')[0]

  const stats = {
    total:    processes.length,
    active:   processes.filter(p => ['en-proceso','en-revision','pendiente'].includes(p.status)).length,
    overdue:  processes.filter(p => p.due_date && p.due_date < today && !['cerrado','cancelado'].includes(p.status)).length,
    urgent:   processes.filter(p => {
      if (!p.due_date || ['cerrado','cancelado'].includes(p.status)) return false
      const d = Math.ceil((new Date(p.due_date) - new Date()) / 86400000)
      return d >= 0 && d <= 14
    }).length,
  }

  const filtered = processes.filter(p => {
    const sOk = statusFilter === 'all' || p.status === statusFilter
    const tOk = typeFilter === 'all' || p.type === typeFilter
    return sOk && tOk
  })

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    await addProcess({ ...form, value: parseFloat(form.value)||0 })
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'var(--space-4)' }}>
          <div className="page-title">
            <div className="page-title-icon" style={{ background:'rgba(139,92,246,0.1)' }}>
              <Scale size={24} style={{ color:'var(--eos-process)' }} />
            </div>
            <div>
              <h1>Jurídico — Procesos Legales</h1>
              <p style={{ marginTop:4 }}>Seguimiento de trámites, contratos, hitos y documentos legales</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}><Plus size={16} /> Nuevo Proceso</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:'var(--space-6)' }}>
        {[
          { label:'Total procesos', value:stats.total,   color:'var(--text-primary)'   },
          { label:'Activos',        value:stats.active,  color:'var(--status-info)'    },
          { label:'Urgentes (≤14d)',value:stats.urgent,  color:'var(--status-warning)' },
          { label:'Vencidos',       value:stats.overdue, color:'var(--status-error)'   },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign:'center' }}>
            <p style={{ fontSize:'2rem', fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</p>
            <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* New process form */}
      {showForm && (
        <div className="card" style={{ marginBottom:'var(--space-6)', border:'1px solid var(--eos-process)' }}>
          <p className="card-title" style={{ marginBottom:'var(--space-4)' }}>Nuevo Proceso Jurídico</p>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div style={{ gridColumn:'1/-1' }}><label className="form-label">Título *</label><input className="form-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Promesa de CV — Lote Calle 80" /></div>
              <div><label className="form-label">Tipo</label>
                <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div><label className="form-label">Estado</label>
                <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div><label className="form-label">Prioridad</label>
                <select className="form-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
              <div><label className="form-label">Valor económico ($)</label><input className="form-input" type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0" /></div>
              <div><label className="form-label">Fecha inicio</label><input className="form-input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><label className="form-label">Fecha límite</label><input className="form-input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div><label className="form-label">Responsable interno</label><input className="form-input" value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} /></div>
              <div><label className="form-label">Abogado externo</label><input className="form-input" value={form.external_lawyer} onChange={e => setForm(f => ({ ...f, external_lawyer: e.target.value }))} /></div>
              <div><label className="form-label">Firma de abogados</label><input className="form-input" value={form.law_firm} onChange={e => setForm(f => ({ ...f, law_firm: e.target.value }))} /></div>
              <div><label className="form-label">Notaría</label><input className="form-input" value={form.notary} onChange={e => setForm(f => ({ ...f, notary: e.target.value }))} /></div>
              <div style={{ gridColumn:'1/-1' }}><label className="form-label">Descripción</label><textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div style={{ gridColumn:'1/-1' }}><label className="form-label">Notas</label><input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div style={{ display:'flex', gap:'var(--space-3)', marginTop:'var(--space-4)' }}>
              <button type="submit" className="btn btn-primary">Crear Proceso</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display:'flex', gap:'var(--space-3)', marginBottom:'var(--space-5)', flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border-subtle)' }}>
          {[['all','Todos'], ...Object.entries(STATUS_CFG).map(([k,v]) => [k, v.label])].map(([k, l]) => (
            <button key={k} onClick={() => setStatusFilter(k)} style={{
              padding:'var(--space-2) var(--space-3)', background:'none', border:'none', cursor:'pointer',
              fontSize:'0.82rem', fontWeight:600,
              color: statusFilter === k ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom:`2px solid ${statusFilter === k ? 'var(--eos-process)' : 'transparent'}`,
              marginBottom:-1, whiteSpace:'nowrap',
            }}>{l}</button>
          ))}
        </div>
        <select className="form-input" style={{ width:'auto', padding:'4px 10px', fontSize:'0.82rem' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">Todos los tipos</option>
          {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'var(--space-12)', color:'var(--text-muted)' }}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><Scale size={32} /></div>
          <h3>Sin procesos jurídicos</h3>
          <p>Registra el primer proceso legal para comenzar el seguimiento.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Nuevo Proceso</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
          {filtered.map(proc => (
            <ProcessCard
              key={proc.id}
              proc={proc}
              milestones={milestones}
              parties={parties}
              documents={documents}
              comments={comments}
              onUpdate={updateProcess}
              onRemove={removeProcess}
              onAddMilestone={addMilestone}
              onUpdateMilestone={updateMilestone}
              onRemoveMilestone={removeMilestone}
              onAddParty={addParty}
              onRemoveParty={removeParty}
              onAddDocument={addDocument}
              onRemoveDocument={removeDocument}
              onAddComment={addComment}
            />
          ))}
        </div>
      )}
    </div>
  )
}
