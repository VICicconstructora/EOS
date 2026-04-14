// src/pages/RRHHPage.jsx — Módulo RRHH: Requisiciones de personal
import { useState } from 'react'
import { Users, Plus, ChevronDown, ChevronUp, Trash2, FileText, MessageSquare, UserCheck, ArrowRight } from 'lucide-react'
import { useHR } from '../lib/useHR'

const STATUS_STEPS = ['draft','approved','searching','interviews','offer','closed']
const STATUS_LABELS = { draft: 'Borrador', approved: 'Aprobado', searching: 'Búsqueda', interviews: 'Entrevistas', offer: 'Oferta', closed: 'Cerrado' }
const STATUS_COLORS = { draft: 'var(--text-muted)', approved: 'var(--status-info)', searching: 'var(--status-warning)', interviews: 'var(--eos-people)', offer: 'var(--brand-primary)', closed: 'var(--status-success)', cancelled: 'var(--status-error)' }

const PRIORITY_CFG = {
  alta:  { label: 'Alta',  color: 'var(--status-error)'   },
  media: { label: 'Media', color: 'var(--status-warning)' },
  baja:  { label: 'Baja',  color: 'var(--status-success)' },
}

const SOURCE_LABELS = { directo: 'Directo', headhunter: 'Headhunter', linkedin: 'LinkedIn', referido: 'Referido', bolsa: 'Bolsa de empleo', otro: 'Otro' }
const INTERVIEW_TYPES = { rrhh: 'RRHH', tecnica: 'Técnica', gerencia: 'Gerencia', prueba: 'Prueba', final: 'Final' }
const RESULT_CFG = {
  pendiente:  { label: 'Pendiente',  color: 'var(--text-muted)'    },
  aprobado:   { label: 'Aprobado',   color: 'var(--status-success)' },
  reprobado:  { label: 'Reprobado',  color: 'var(--status-error)'  },
  'en-espera':{ label: 'En espera',  color: 'var(--status-warning)' },
}
const CANDIDATE_STATUS_CFG = {
  activo:     { label: 'Activo',     color: 'var(--status-info)'    },
  descartado: { label: 'Descartado', color: 'var(--status-error)'   },
  oferta:     { label: 'Con oferta', color: 'var(--brand-primary)'  },
  contratado: { label: 'Contratado', color: 'var(--status-success)' },
}

const DEPT_OPTIONS = ['Dirección','Operaciones','Finanzas','Comercial','Personas','Tecnología','Jurídico','Otro']

const EMPTY_REQUEST = { title: '', department: 'Operaciones', requester: '', headcount: 1, status: 'draft', priority: 'media', job_description: '', requirements: '', headhunter_external: false, headhunter_name: '', headhunter_contact: '', notes: '', requested_date: new Date().toISOString().split('T')[0], target_start_date: '' }
const EMPTY_CANDIDATE = { name: '', email: '', phone: '', source: 'directo', cv_filename: '', cv_url: '', notes: '' }
const EMPTY_INTERVIEW = { interviewer: '', interview_date: '', interview_type: 'tecnica', result: 'pendiente', score: '', comments: '' }

function Badge({ children, color, bg }) {
  return (
    <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 600, color, background: bg || `${color}18` }}>
      {children}
    </span>
  )
}

function SubTab({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 'var(--space-4)' }}>
      {tabs.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} style={{
          padding: 'var(--space-2) var(--space-4)', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.82rem', fontWeight: 600,
          color: active === k ? 'var(--text-primary)' : 'var(--text-muted)',
          borderBottom: `2px solid ${active === k ? 'var(--eos-people)' : 'transparent'}`,
          marginBottom: -1,
        }}>{l}</button>
      ))}
    </div>
  )
}

function RequestCard({ req, candidates, interviews, comments, onUpdate, onRemove, onAddCandidate, onUpdateCandidate, onRemoveCandidate, onAddInterview, onUpdateInterview, onRemoveInterview, onAddComment }) {
  const [expanded, setExpanded] = useState(false)
  const [subTab, setSubTab] = useState('candidatos')
  const [showCandForm, setShowCandForm] = useState(false)
  const [candForm, setCandForm] = useState(EMPTY_CANDIDATE)
  const [showIntervForm, setShowIntervForm] = useState(null) // candidate id
  const [intervForm, setIntervForm] = useState(EMPTY_INTERVIEW)
  const [commentText, setCommentText] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('')

  const myCandiates = candidates.filter(c => c.request_id == req.id)
  const myComments  = comments.filter(c => c.request_id == req.id)
  const myInterviews = interviews.filter(i => i.request_id == req.id)
  const stepIdx = STATUS_STEPS.indexOf(req.status)
  const pc = PRIORITY_CFG[req.priority] || PRIORITY_CFG.media

  async function advanceStatus() {
    if (stepIdx < STATUS_STEPS.length - 1) onUpdate({ ...req, status: STATUS_STEPS[stepIdx + 1] })
  }

  async function handleAddCandidate(e) {
    e.preventDefault()
    if (!candForm.name.trim()) return
    await onAddCandidate({ ...candForm, request_id: req.id })
    setCandForm(EMPTY_CANDIDATE)
    setShowCandForm(false)
  }

  async function handleAddInterview(e, candidateId) {
    e.preventDefault()
    if (!intervForm.interviewer.trim()) return
    await onAddInterview({ ...intervForm, request_id: req.id, candidate_id: candidateId, score: intervForm.score ? parseInt(intervForm.score) : null })
    setIntervForm(EMPTY_INTERVIEW)
    setShowIntervForm(null)
  }

  async function handleAddComment(e) {
    e.preventDefault()
    if (!commentText.trim() || !commentAuthor.trim()) return
    await onAddComment({ request_id: req.id, author: commentAuthor, content: commentText })
    setCommentText('')
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${pc.color}` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
            <Badge color={STATUS_COLORS[req.status]}>{STATUS_LABELS[req.status]}</Badge>
            <Badge color={pc.color}>{pc.label}</Badge>
            <Badge color="var(--text-muted)" bg="var(--bg-overlay)">{req.department}</Badge>
            {req.headcount > 1 && <Badge color="var(--status-info)">{req.headcount} plazas</Badge>}
            {req.headhunter_external && <Badge color="var(--eos-process)">Headhunter externo</Badge>}
          </div>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{req.title}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Solicitado por: {req.requester || '—'} · {req.requested_date}
            {req.target_start_date && ` · Inicio: ${req.target_start_date}`}
          </p>
          {req.headhunter_external && req.headhunter_name && (
            <p style={{ fontSize: '0.75rem', color: 'var(--eos-process)', marginTop: 2 }}>
              Headhunter: {req.headhunter_name} {req.headhunter_contact && `— ${req.headhunter_contact}`}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {STATUS_STEPS.slice(0, -1).map((s, i) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: i <= stepIdx ? STATUS_COLORS[s] : 'var(--border-medium)' }} />
                {i < STATUS_STEPS.length - 2 && <ArrowRight size={8} style={{ color: 'var(--border-medium)' }} />}
              </span>
            ))}
          </div>
          {req.status !== 'closed' && req.status !== 'cancelled' && stepIdx < STATUS_STEPS.length - 1 && (
            <button className="btn btn-primary btn-sm" onClick={advanceStatus} style={{ fontSize: '0.75rem' }}>
              → {STATUS_LABELS[STATUS_STEPS[stepIdx + 1]]}
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onRemove(req.id)} style={{ color: 'var(--status-error)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', padding: 'var(--space-4) var(--space-5)' }}>
          {/* Job info */}
          {(req.job_description || req.requirements) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              {req.job_description && (
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Descripción del cargo</p>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{req.job_description}</p>
                </div>
              )}
              {req.requirements && (
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Requisitos</p>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{req.requirements}</p>
                </div>
              )}
            </div>
          )}

          <SubTab
            tabs={[['candidatos', `Candidatos (${myCandiates.length})`], ['entrevistas', `Entrevistas (${myInterviews.length})`], ['comentarios', `Comentarios (${myComments.length})`]]}
            active={subTab}
            onChange={setSubTab}
          />

          {/* CANDIDATOS */}
          {subTab === 'candidatos' && (
            <div>
              {myCandiates.map(cand => {
                const cs = CANDIDATE_STATUS_CFG[cand.status] || CANDIDATE_STATUS_CFG.activo
                const candInterviews = myInterviews.filter(i => i.candidate_id == cand.id)
                return (
                  <div key={cand.id} style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-2)', display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cand.name}</span>
                        <Badge color={cs.color}>{cs.label}</Badge>
                        <Badge color="var(--text-muted)" bg="var(--bg-elevated)">{SOURCE_LABELS[cand.source]}</Badge>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        {cand.email && <span>{cand.email}</span>}
                        {cand.phone && <span>{cand.phone}</span>}
                        {cand.cv_filename && <span style={{ color: 'var(--status-info)' }}><FileText size={11} style={{ display: 'inline', marginRight: 3 }} />{cand.cv_filename}</span>}
                      </div>
                      {cand.notes && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 3 }}>{cand.notes}</p>}
                      {candInterviews.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          {candInterviews.map(iv => {
                            const rc = RESULT_CFG[iv.result]
                            return (
                              <span key={iv.id} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: rc.color }}>
                                {INTERVIEW_TYPES[iv.interview_type]}: {rc.label} {iv.score ? `(${iv.score}/10)` : ''}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }}>
                      <select
                        className="form-input"
                        value={cand.status}
                        onChange={e => onUpdateCandidate({ ...cand, status: e.target.value })}
                        style={{ padding: '2px 6px', fontSize: '0.75rem', width: 'auto' }}
                      >
                        {Object.entries(CANDIDATE_STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button className="btn btn-ghost btn-sm" title="Agregar entrevista" onClick={() => setShowIntervForm(cand.id)}>
                        <UserCheck size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => onRemoveCandidate(cand.id)} style={{ color: 'var(--status-error)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {showIntervForm === cand.id && (
                      <form onSubmit={e => handleAddInterview(e, cand.id)} style={{ width: '100%', marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                        <div>
                          <label className="form-label">Entrevistador *</label>
                          <input className="form-input" required value={intervForm.interviewer} onChange={e => setIntervForm(f => ({ ...f, interviewer: e.target.value }))} placeholder="Nombre del entrevistador" />
                        </div>
                        <div>
                          <label className="form-label">Fecha</label>
                          <input className="form-input" type="date" value={intervForm.interview_date} onChange={e => setIntervForm(f => ({ ...f, interview_date: e.target.value }))} />
                        </div>
                        <div>
                          <label className="form-label">Tipo</label>
                          <select className="form-input" value={intervForm.interview_type} onChange={e => setIntervForm(f => ({ ...f, interview_type: e.target.value }))}>
                            {Object.entries(INTERVIEW_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Resultado</label>
                          <select className="form-input" value={intervForm.result} onChange={e => setIntervForm(f => ({ ...f, result: e.target.value }))}>
                            {Object.entries(RESULT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Puntaje (1-10)</label>
                          <input className="form-input" type="number" min="1" max="10" value={intervForm.score} onChange={e => setIntervForm(f => ({ ...f, score: e.target.value }))} placeholder="—" />
                        </div>
                        <div>
                          <label className="form-label">Comentarios</label>
                          <input className="form-input" value={intervForm.comments} onChange={e => setIntervForm(f => ({ ...f, comments: e.target.value }))} placeholder="Observaciones" />
                        </div>
                        <div style={{ gridColumn: '1/-1', display: 'flex', gap: 'var(--space-2)' }}>
                          <button type="submit" className="btn btn-primary btn-sm">Guardar entrevista</button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowIntervForm(null)}>Cancelar</button>
                        </div>
                      </form>
                    )}
                  </div>
                )
              })}

              {showCandForm ? (
                <form onSubmit={handleAddCandidate} style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 'var(--space-3)' }}>Nuevo candidato</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="form-label">Nombre completo *</label>
                      <input className="form-input" required value={candForm.name} onChange={e => setCandForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del candidato" />
                    </div>
                    <div>
                      <label className="form-label">Email</label>
                      <input className="form-input" type="email" value={candForm.email} onChange={e => setCandForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@email.com" />
                    </div>
                    <div>
                      <label className="form-label">Teléfono</label>
                      <input className="form-input" value={candForm.phone} onChange={e => setCandForm(f => ({ ...f, phone: e.target.value }))} placeholder="+57 300 000 0000" />
                    </div>
                    <div>
                      <label className="form-label">Fuente</label>
                      <select className="form-input" value={candForm.source} onChange={e => setCandForm(f => ({ ...f, source: e.target.value }))}>
                        {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Nombre archivo HV (PDF)</label>
                      <input className="form-input" value={candForm.cv_filename} onChange={e => setCandForm(f => ({ ...f, cv_filename: e.target.value }))} placeholder="cv_nombre.pdf" />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label className="form-label">Notas</label>
                      <input className="form-input" value={candForm.notes} onChange={e => setCandForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones del perfil" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                    <button type="submit" className="btn btn-primary btn-sm">Agregar candidato</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowCandForm(false); setCandForm(EMPTY_CANDIDATE) }}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCandForm(true)} style={{ marginTop: 'var(--space-2)', width: '100%', justifyContent: 'center' }}>
                  <Plus size={14} /> Agregar candidato
                </button>
              )}
            </div>
          )}

          {/* ENTREVISTAS */}
          {subTab === 'entrevistas' && (
            <div>
              {myInterviews.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin entrevistas registradas. Agrega candidatos y usa el botón de entrevista en la pestaña Candidatos.</p>}
              {myInterviews.map(iv => {
                const cand = candidates.find(c => c.id == iv.candidate_id)
                const rc = RESULT_CFG[iv.result]
                return (
                  <div key={iv.id} style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{cand?.name || 'Candidato'}</span>
                        <Badge color="var(--text-muted)" bg="var(--bg-surface)">{INTERVIEW_TYPES[iv.interview_type]}</Badge>
                        <Badge color={rc.color}>{rc.label}</Badge>
                        {iv.score && <span style={{ fontSize: '0.78rem', color: 'var(--brand-primary)', fontWeight: 700 }}>{iv.score}/10</span>}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Entrevistador: {iv.interviewer} {iv.interview_date && `· ${iv.interview_date}`}
                      </p>
                      {iv.comments && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>{iv.comments}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                      <select className="form-input" value={iv.result} onChange={e => onUpdateInterview({ ...iv, result: e.target.value })} style={{ padding: '2px 6px', fontSize: '0.75rem', width: 'auto' }}>
                        {Object.entries(RESULT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <button className="btn btn-ghost btn-sm" onClick={() => onRemoveInterview(iv.id)} style={{ color: 'var(--status-error)' }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* COMENTARIOS */}
          {subTab === 'comentarios' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                {myComments.map(c => (
                  <div key={c.id} style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--eos-people)' }}>{c.author}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.content}</p>
                  </div>
                ))}
                {myComments.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin comentarios aún.</p>}
              </div>
              <form onSubmit={handleAddComment} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
                <div>
                  <label className="form-label">Tu nombre</label>
                  <input className="form-input" value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)} placeholder="Nombre" required />
                </div>
                <div>
                  <label className="form-label">Comentario</label>
                  <input className="form-input" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Escribe un comentario..." required />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ marginBottom: 1 }}>
                  <MessageSquare size={14} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const EMPTY_FORM = { ...EMPTY_REQUEST }

export default function RRHHPage() {
  const { requests, candidates, interviews, comments, loading,
    addRequest, updateRequest, removeRequest,
    addCandidate, updateCandidate, removeCandidate,
    addInterview, updateInterview, removeInterview,
    addComment,
  } = useHR()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [statusFilter, setStatusFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')

  const stats = {
    total:      requests.length,
    active:     requests.filter(r => !['closed','cancelled','draft'].includes(r.status)).length,
    candidates: candidates.length,
    pending:    interviews.filter(i => i.result === 'pendiente').length,
  }

  const filtered = requests.filter(r => {
    const sOk = statusFilter === 'all' || r.status === statusFilter
    const dOk = deptFilter === 'all' || r.department === deptFilter
    return sOk && dOk
  })

  const depts = [...new Set(requests.map(r => r.department).filter(Boolean))]

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.requester.trim()) return
    await addRequest(form)
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div className="page-title">
            <div className="page-title-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
              <Users size={24} style={{ color: 'var(--eos-people)' }} />
            </div>
            <div>
              <h1>RRHH — Requisiciones de Personal</h1>
              <p style={{ marginTop: 4 }}>Gestión de procesos de selección con candidatos y entrevistas</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            <Plus size={16} /> Nueva Solicitud
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Total solicitudes', value: stats.total,      color: 'var(--text-primary)'   },
          { label: 'Procesos activos',  value: stats.active,     color: 'var(--eos-people)'     },
          { label: 'Candidatos',        value: stats.candidates, color: 'var(--status-info)'    },
          { label: 'Entrevistas pend.', value: stats.pending,    color: 'var(--status-warning)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* New request form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--eos-people)' }}>
          <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Nueva Requisición de Personal</p>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Cargo solicitado *</label>
                <input className="form-input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Ingeniero Residente de Obra" />
              </div>
              <div>
                <label className="form-label">Departamento</label>
                <select className="form-input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Solicitado por *</label>
                <input className="form-input" required value={form.requester} onChange={e => setForm(f => ({ ...f, requester: e.target.value }))} placeholder="Nombre de quien solicita" />
              </div>
              <div>
                <label className="form-label">N° de plazas</label>
                <input className="form-input" type="number" min="1" value={form.headcount} onChange={e => setForm(f => ({ ...f, headcount: parseInt(e.target.value) || 1 }))} />
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
                <label className="form-label">Fecha inicio requerida</label>
                <input className="form-input" type="date" value={form.target_start_date} onChange={e => setForm(f => ({ ...f, target_start_date: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">¿Usa Headhunter externo?</label>
                <select className="form-input" value={form.headhunter_external ? 'si' : 'no'} onChange={e => setForm(f => ({ ...f, headhunter_external: e.target.value === 'si' }))}>
                  <option value="no">No</option>
                  <option value="si">Sí</option>
                </select>
              </div>
              {form.headhunter_external && (
                <>
                  <div>
                    <label className="form-label">Empresa Headhunter</label>
                    <input className="form-input" value={form.headhunter_name} onChange={e => setForm(f => ({ ...f, headhunter_name: e.target.value }))} placeholder="Nombre de la firma" />
                  </div>
                  <div>
                    <label className="form-label">Contacto Headhunter</label>
                    <input className="form-input" value={form.headhunter_contact} onChange={e => setForm(f => ({ ...f, headhunter_contact: e.target.value }))} placeholder="Email o teléfono" />
                  </div>
                </>
              )}
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Descripción del cargo</label>
                <textarea className="form-input" rows={2} value={form.job_description} onChange={e => setForm(f => ({ ...f, job_description: e.target.value }))} placeholder="Responsabilidades principales..." />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Requisitos / Perfil</label>
                <textarea className="form-input" rows={2} value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} placeholder="Formación, experiencia, habilidades..." />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Notas</label>
                <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Contexto adicional..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="submit" className="btn btn-primary">Crear Requisición</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-subtle)' }}>
          {[['all','Todos'], ...STATUS_STEPS.map(s => [s, STATUS_LABELS[s]])].map(([k, l]) => (
            <button key={k} onClick={() => setStatusFilter(k)} style={{
              padding: 'var(--space-2) var(--space-3)', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 600,
              color: statusFilter === k ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: `2px solid ${statusFilter === k ? 'var(--eos-people)' : 'transparent'}`,
              marginBottom: -1, whiteSpace: 'nowrap',
            }}>{l}</button>
          ))}
        </div>
        {depts.length > 0 && (
          <select className="form-input" style={{ width: 'auto', padding: '4px 10px', fontSize: '0.82rem' }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="all">Todos los departamentos</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><Users size={32} /></div>
          <h3>Sin requisiciones</h3>
          <p>Crea la primera solicitud de personal para iniciar el proceso de selección.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Nueva Solicitud</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filtered.map(req => (
            <RequestCard
              key={req.id}
              req={req}
              candidates={candidates}
              interviews={interviews}
              comments={comments}
              onUpdate={updateRequest}
              onRemove={removeRequest}
              onAddCandidate={addCandidate}
              onUpdateCandidate={updateCandidate}
              onRemoveCandidate={removeCandidate}
              onAddInterview={addInterview}
              onUpdateInterview={updateInterview}
              onRemoveInterview={removeInterview}
              onAddComment={addComment}
            />
          ))}
        </div>
      )}
    </div>
  )
}
