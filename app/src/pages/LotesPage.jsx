// src/pages/LotesPage.jsx — Módulo Lotes: seguimiento de lotes y proyectos
import { useState } from 'react'
import { MapPin, Plus, Trash2, ChevronDown, ChevronUp, FileText, TrendingUp, Users, Building } from 'lucide-react'
import { useLots } from '../lib/useLots'

const STATUS_CFG = {
  prospecto:    { label: 'Prospecto',    color: 'var(--text-muted)',     bg: 'var(--bg-overlay)'           },
  analisis:     { label: 'En análisis',  color: 'var(--status-info)',    bg: 'rgba(59,130,246,0.1)'        },
  negociacion:  { label: 'Negociación',  color: 'var(--status-warning)', bg: 'rgba(245,158,11,0.1)'        },
  adquirido:    { label: 'Adquirido',    color: 'var(--status-success)', bg: 'rgba(16,185,129,0.1)'        },
  descartado:   { label: 'Descartado',   color: 'var(--status-error)',   bg: 'rgba(239,68,68,0.1)'         },
}

const USE_TYPES = { residencial: 'Residencial', comercial: 'Comercial', mixto: 'Mixto', industrial: 'Industrial', '': 'Por definir' }

const DOC_CATEGORIES = {
  general:    'General',
  escritura:  'Escritura',
  planos:     'Planos',
  estudios:   'Estudios',
  licencias:  'Licencias',
  promesas:   'Promesas/Contratos',
  otro:       'Otro',
}

const ADVISOR_TYPES = ['Estructural','Suelos','Arquitecto','Ambiental','Hidrosanitario','Eléctrico','Vías/Urbanismo','Avaluador','Otro']
const PARTNER_ROLES = ['Comercializador','Constructor','Inversionista','Financiero','Fiduciaria','Otro']

function fmtCOP(n) {
  if (!n) return '—'
  const num = parseFloat(n)
  if (num >= 1e9)  return `$${(num/1e9).toFixed(2)}B`
  if (num >= 1e6)  return `$${(num/1e6).toFixed(0)}M`
  return `$${num.toLocaleString('es-CO')}`
}

function SubTab({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: 'var(--space-4)' }}>
      {tabs.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} style={{
          padding: 'var(--space-2) var(--space-4)', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.82rem', fontWeight: 600,
          color: active === k ? 'var(--text-primary)' : 'var(--text-muted)',
          borderBottom: `2px solid ${active === k ? 'var(--brand-primary)' : 'transparent'}`,
          marginBottom: -1, whiteSpace: 'nowrap',
        }}>{l}</button>
      ))}
    </div>
  )
}

function LotCard({ lot, advisors, partners, scenarios, documents, onUpdate, onRemove, onAddAdvisor, onRemoveAdvisor, onAddPartner, onRemovePartner, onAddScenario, onUpdateScenario, onRemoveScenario, onAddDocument, onRemoveDocument }) {
  const [expanded, setExpanded] = useState(false)
  const [subTab, setSubTab] = useState('resumen')
  const [editResumen, setEditResumen] = useState(false)
  const [resumenForm, setResumenForm] = useState({ ...lot })

  const [showAdvForm, setShowAdvForm]   = useState(false)
  const [advForm, setAdvForm]           = useState({ type: 'Estructural', name: '', company: '', phone: '', email: '', notes: '' })
  const [showPartForm, setShowPartForm] = useState(false)
  const [partForm, setPartForm]         = useState({ role: 'Comercializador', name: '', contact: '', phone: '', email: '', participation: 0, notes: '' })
  const [showScenForm, setShowScenForm] = useState(false)
  const [scenForm, setScenForm]         = useState({ name: '', version: 1, is_active: false, land_cost: '', construction_cost: '', total_units: '', sale_price_per_unit: '', total_revenue: '', gross_margin: '', roi: '', irr: '', payback_months: '', cash_flow_notes: '', observations: '', created_by: '' })
  const [showDocForm, setShowDocForm]   = useState(false)
  const [docForm, setDocForm]           = useState({ name: '', category: 'general', file_name: '', uploaded_by: '', notes: '' })

  const myAdvisors  = advisors.filter(a => a.lot_id == lot.id)
  const myPartners  = partners.filter(p => p.lot_id == lot.id)
  const myScenarios = scenarios.filter(s => s.lot_id == lot.id)
  const myDocuments = documents.filter(d => d.lot_id == lot.id)
  const sc = STATUS_CFG[lot.status] || STATUS_CFG.prospecto

  async function saveResumen() {
    await onUpdate(resumenForm)
    setEditResumen(false)
  }

  async function handleAddAdvisor(e) {
    e.preventDefault()
    if (!advForm.name.trim()) return
    await onAddAdvisor({ ...advForm, lot_id: lot.id })
    setAdvForm({ type: 'Estructural', name: '', company: '', phone: '', email: '', notes: '' })
    setShowAdvForm(false)
  }

  async function handleAddPartner(e) {
    e.preventDefault()
    if (!partForm.name.trim()) return
    await onAddPartner({ ...partForm, lot_id: lot.id, participation: parseFloat(partForm.participation) || 0 })
    setPartForm({ role: 'Comercializador', name: '', contact: '', phone: '', email: '', participation: 0, notes: '' })
    setShowPartForm(false)
  }

  async function handleAddScenario(e) {
    e.preventDefault()
    if (!scenForm.name.trim()) return
    const n = v => parseFloat(v) || 0
    await onAddScenario({ ...scenForm, lot_id: lot.id, land_cost: n(scenForm.land_cost), construction_cost: n(scenForm.construction_cost), total_units: parseInt(scenForm.total_units)||0, sale_price_per_unit: n(scenForm.sale_price_per_unit), total_revenue: n(scenForm.total_revenue), gross_margin: n(scenForm.gross_margin), roi: n(scenForm.roi), irr: n(scenForm.irr), payback_months: parseInt(scenForm.payback_months)||0 })
    setScenForm({ name: '', version: 1, is_active: false, land_cost: '', construction_cost: '', total_units: '', sale_price_per_unit: '', total_revenue: '', gross_margin: '', roi: '', irr: '', payback_months: '', cash_flow_notes: '', observations: '', created_by: '' })
    setShowScenForm(false)
  }

  async function handleAddDocument(e) {
    e.preventDefault()
    if (!docForm.name.trim() || !docForm.file_name.trim()) return
    await onAddDocument({ ...docForm, lot_id: lot.id })
    setDocForm({ name: '', category: 'general', file_name: '', uploaded_by: '', notes: '' })
    setShowDocForm(false)
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${sc.color}` }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
            <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700, color: sc.color, background: sc.bg }}>{sc.label}</span>
            {lot.use_type && <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-overlay)' }}>{USE_TYPES[lot.use_type]}</span>}
            {lot.area > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lot.area.toLocaleString('es-CO')} m²</span>}
            {lot.units > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lot.units} unidades</span>}
          </div>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{lot.name}</p>
          {lot.address && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}><MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />{lot.address}</p>}
          {lot.owner_name && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 3 }}>
              Dueño: {lot.owner_name} {lot.owner_phone && `· ${lot.owner_phone}`}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
          <select className="form-input" value={lot.status} onChange={e => onUpdate({ ...lot, status: e.target.value })} style={{ padding: '4px 8px', fontSize: '0.78rem', width: 'auto' }}>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onRemove(lot.id)} style={{ color: 'var(--status-error)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', padding: 'var(--space-4) var(--space-5)' }}>
          <SubTab
            tabs={[['resumen','Resumen'], ['escenarios',`Escenarios (${myScenarios.length})`], ['contactos',`Contactos`], ['documentos',`Documentos (${myDocuments.length})`]]}
            active={subTab}
            onChange={setSubTab}
          />

          {/* RESUMEN */}
          {subTab === 'resumen' && (
            <div>
              {editResumen ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div><label className="form-label">Norma urbanística</label><textarea className="form-input" rows={2} value={resumenForm.norm || ''} onChange={e => setResumenForm(f => ({ ...f, norm: e.target.value }))} /></div>
                  <div><label className="form-label">N° unidades</label><input className="form-input" type="number" value={resumenForm.units || ''} onChange={e => setResumenForm(f => ({ ...f, units: parseInt(e.target.value)||0 }))} /></div>
                  <div><label className="form-label">Uso</label>
                    <select className="form-input" value={resumenForm.use_type || ''} onChange={e => setResumenForm(f => ({ ...f, use_type: e.target.value }))}>
                      {Object.entries(USE_TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Tipo estructura</label><input className="form-input" value={resumenForm.structure_type || ''} onChange={e => setResumenForm(f => ({ ...f, structure_type: e.target.value }))} placeholder="Ej: Concreto aporticado" /></div>
                  <div><label className="form-label">Diseñador estructura</label><input className="form-input" value={resumenForm.structure_designer || ''} onChange={e => setResumenForm(f => ({ ...f, structure_designer: e.target.value }))} /></div>
                  <div><label className="form-label">Área (m²)</label><input className="form-input" type="number" value={resumenForm.area || ''} onChange={e => setResumenForm(f => ({ ...f, area: parseFloat(e.target.value)||0 }))} /></div>
                  <div style={{ gridColumn:'1/-1' }}><label className="form-label">Acabados</label><textarea className="form-input" rows={2} value={resumenForm.finishes || ''} onChange={e => setResumenForm(f => ({ ...f, finishes: e.target.value }))} /></div>
                  <div><label className="form-label">Teléfono dueño</label><input className="form-input" value={resumenForm.owner_phone || ''} onChange={e => setResumenForm(f => ({ ...f, owner_phone: e.target.value }))} /></div>
                  <div><label className="form-label">Email dueño</label><input className="form-input" type="email" value={resumenForm.owner_email || ''} onChange={e => setResumenForm(f => ({ ...f, owner_email: e.target.value }))} /></div>
                  <div style={{ gridColumn:'1/-1' }}><label className="form-label">Notas</label><textarea className="form-input" rows={2} value={resumenForm.notes || ''} onChange={e => setResumenForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <div style={{ gridColumn:'1/-1', display:'flex', gap:'var(--space-2)' }}>
                    <button className="btn btn-primary btn-sm" onClick={saveResumen}>Guardar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditResumen(false); setResumenForm({...lot}) }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    {[
                      { label: 'Norma', value: lot.norm },
                      { label: 'Uso', value: USE_TYPES[lot.use_type] },
                      { label: 'Unidades', value: lot.units || '—' },
                      { label: 'Estructura', value: lot.structure_type },
                      { label: 'Diseñador estr.', value: lot.structure_designer },
                      { label: 'Área', value: lot.area ? `${lot.area.toLocaleString('es-CO')} m²` : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</p>
                        <p style={{ fontSize: '0.85rem', color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: value ? 'normal' : 'italic' }}>{value || 'Por definir'}</p>
                      </div>
                    ))}
                  </div>
                  {lot.finishes && (
                    <div style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Acabados</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lot.finishes}</p>
                    </div>
                  )}
                  {lot.notes && (
                    <div style={{ background: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lot.notes}</p>
                    </div>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditResumen(true); setResumenForm({...lot}) }}>Editar resumen</button>
                </div>
              )}
            </div>
          )}

          {/* ESCENARIOS */}
          {subTab === 'escenarios' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                {myScenarios.map(sc => (
                  <div key={sc.id} style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: sc.is_active ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)', position: 'relative' }}>
                    {sc.is_active && <span style={{ position: 'absolute', top: 10, right: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.65rem', fontWeight: 700, background: 'var(--brand-primary)', color: '#000' }}>ACTIVO</span>}
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 }}>{sc.name}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>v{sc.version} · {sc.created_by && `por ${sc.created_by}`}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                      {[
                        { label: 'Costo terreno',   value: fmtCOP(sc.land_cost),              color: 'var(--status-error)'   },
                        { label: 'Costo construcc.', value: fmtCOP(sc.construction_cost),      color: 'var(--status-warning)' },
                        { label: 'Ingreso total',    value: fmtCOP(sc.total_revenue),          color: 'var(--status-success)' },
                        { label: 'Margen bruto',     value: fmtCOP(sc.gross_margin),           color: 'var(--brand-primary)'  },
                        { label: 'ROI',              value: sc.roi ? `${sc.roi}%` : '—',       color: 'var(--eos-people)'     },
                        { label: 'TIR',              value: sc.irr ? `${sc.irr}%` : '—',       color: 'var(--status-info)'    },
                        { label: 'Payback',          value: sc.payback_months ? `${sc.payback_months} meses` : '—', color: 'var(--text-secondary)' },
                        { label: 'Unidades',         value: sc.total_units ? `${sc.total_units} @ ${fmtCOP(sc.sale_price_per_unit)}` : '—', color: 'var(--text-secondary)' },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 1 }}>{label}</p>
                          <p style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {sc.cash_flow_notes && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>{sc.cash_flow_notes}</p>}
                    {sc.observations && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{sc.observations}</p>}
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                      {!sc.is_active && <button className="btn btn-ghost btn-sm" onClick={() => onUpdateScenario({ ...sc, is_active: true })}>Marcar activo</button>}
                      <button className="btn btn-ghost btn-sm" onClick={() => onRemoveScenario(sc.id)} style={{ color: 'var(--status-error)', marginLeft: 'auto' }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {showScenForm ? (
                <form onSubmit={handleAddScenario} style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid var(--border-medium)' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 'var(--space-3)' }}>Nuevo escenario financiero</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                    <div><label className="form-label">Nombre del escenario *</label><input className="form-input" required value={scenForm.name} onChange={e => setScenForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Escenario Base" /></div>
                    <div><label className="form-label">Elaborado por</label><input className="form-input" value={scenForm.created_by} onChange={e => setScenForm(f => ({ ...f, created_by: e.target.value }))} /></div>
                    <div><label className="form-label">Costo terreno ($)</label><input className="form-input" type="number" value={scenForm.land_cost} onChange={e => setScenForm(f => ({ ...f, land_cost: e.target.value }))} placeholder="0" /></div>
                    <div><label className="form-label">Costo construcción ($)</label><input className="form-input" type="number" value={scenForm.construction_cost} onChange={e => setScenForm(f => ({ ...f, construction_cost: e.target.value }))} placeholder="0" /></div>
                    <div><label className="form-label">N° unidades</label><input className="form-input" type="number" value={scenForm.total_units} onChange={e => setScenForm(f => ({ ...f, total_units: e.target.value }))} placeholder="0" /></div>
                    <div><label className="form-label">Precio por unidad ($)</label><input className="form-input" type="number" value={scenForm.sale_price_per_unit} onChange={e => setScenForm(f => ({ ...f, sale_price_per_unit: e.target.value }))} placeholder="0" /></div>
                    <div><label className="form-label">Ingreso total ($)</label><input className="form-input" type="number" value={scenForm.total_revenue} onChange={e => setScenForm(f => ({ ...f, total_revenue: e.target.value }))} placeholder="0" /></div>
                    <div><label className="form-label">Margen bruto ($)</label><input className="form-input" type="number" value={scenForm.gross_margin} onChange={e => setScenForm(f => ({ ...f, gross_margin: e.target.value }))} placeholder="0" /></div>
                    <div><label className="form-label">ROI (%)</label><input className="form-input" type="number" step="0.1" value={scenForm.roi} onChange={e => setScenForm(f => ({ ...f, roi: e.target.value }))} placeholder="0" /></div>
                    <div><label className="form-label">TIR (%)</label><input className="form-input" type="number" step="0.1" value={scenForm.irr} onChange={e => setScenForm(f => ({ ...f, irr: e.target.value }))} placeholder="0" /></div>
                    <div><label className="form-label">Payback (meses)</label><input className="form-input" type="number" value={scenForm.payback_months} onChange={e => setScenForm(f => ({ ...f, payback_months: e.target.value }))} placeholder="0" /></div>
                    <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', marginTop:20 }}>
                      <input type="checkbox" id={`is_active_${lot.id}`} checked={scenForm.is_active} onChange={e => setScenForm(f => ({ ...f, is_active: e.target.checked }))} />
                      <label htmlFor={`is_active_${lot.id}`} style={{ fontSize:'0.85rem' }}>Marcar como escenario activo</label>
                    </div>
                    <div style={{ gridColumn:'1/-1' }}><label className="form-label">Notas de flujo de caja</label><textarea className="form-input" rows={2} value={scenForm.cash_flow_notes} onChange={e => setScenForm(f => ({ ...f, cash_flow_notes: e.target.value }))} placeholder="Descripción del flujo de caja, hitos de inversión..." /></div>
                    <div style={{ gridColumn:'1/-1' }}><label className="form-label">Observaciones / Supuestos</label><textarea className="form-input" rows={2} value={scenForm.observations} onChange={e => setScenForm(f => ({ ...f, observations: e.target.value }))} /></div>
                  </div>
                  <div style={{ display:'flex', gap:'var(--space-2)', marginTop:'var(--space-3)' }}>
                    <button type="submit" className="btn btn-primary btn-sm">Guardar escenario</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowScenForm(false)}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowScenForm(true)} style={{ width:'100%', justifyContent:'center' }}>
                  <Plus size={14} /> Agregar escenario
                </button>
              )}
            </div>
          )}

          {/* CONTACTOS */}
          {subTab === 'contactos' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
              {/* Asesores */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>Asesores de diseño</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAdvForm(s => !s)}><Plus size={14} /></button>
                </div>
                {showAdvForm && (
                  <form onSubmit={handleAddAdvisor} style={{ background:'var(--bg-overlay)', borderRadius:'var(--radius-md)', padding:'var(--space-3)', marginBottom:'var(--space-3)' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-2)' }}>
                      <div><label className="form-label">Tipo</label>
                        <select className="form-input" value={advForm.type} onChange={e => setAdvForm(f => ({ ...f, type: e.target.value }))}>
                          {ADVISOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div><label className="form-label">Nombre *</label><input className="form-input" required value={advForm.name} onChange={e => setAdvForm(f => ({ ...f, name: e.target.value }))} /></div>
                      <div><label className="form-label">Empresa</label><input className="form-input" value={advForm.company} onChange={e => setAdvForm(f => ({ ...f, company: e.target.value }))} /></div>
                      <div><label className="form-label">Teléfono</label><input className="form-input" value={advForm.phone} onChange={e => setAdvForm(f => ({ ...f, phone: e.target.value }))} /></div>
                      <div style={{ gridColumn:'1/-1' }}><label className="form-label">Email</label><input className="form-input" type="email" value={advForm.email} onChange={e => setAdvForm(f => ({ ...f, email: e.target.value }))} /></div>
                      <div style={{ gridColumn:'1/-1' }}><label className="form-label">Notas</label><input className="form-input" value={advForm.notes} onChange={e => setAdvForm(f => ({ ...f, notes: e.target.value }))} /></div>
                    </div>
                    <div style={{ display:'flex', gap:'var(--space-2)', marginTop:'var(--space-2)' }}>
                      <button type="submit" className="btn btn-primary btn-sm">Guardar</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAdvForm(false)}>Cancelar</button>
                    </div>
                  </form>
                )}
                {myAdvisors.map(a => (
                  <div key={a.id} style={{ background:'var(--bg-overlay)', borderRadius:'var(--radius-md)', padding:'var(--space-3)', marginBottom:'var(--space-2)', display:'flex', justifyContent:'space-between', gap:'var(--space-2)' }}>
                    <div>
                      <div style={{ display:'flex', gap:'var(--space-2)', alignItems:'center', marginBottom:3 }}>
                        <span style={{ fontWeight:600, fontSize:'0.85rem' }}>{a.name}</span>
                        <span style={{ fontSize:'0.7rem', padding:'1px 6px', borderRadius:'var(--radius-full)', background:'var(--bg-surface)', color:'var(--text-muted)' }}>{a.type}</span>
                      </div>
                      {a.company && <p style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{a.company}</p>}
                      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', display:'flex', gap:'var(--space-2)' }}>
                        {a.phone && <span>{a.phone}</span>}
                        {a.email && <span>{a.email}</span>}
                      </div>
                      {a.notes && <p style={{ fontSize:'0.75rem', color:'var(--status-warning)', marginTop:3 }}>{a.notes}</p>}
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => onRemoveAdvisor(a.id)} style={{ color:'var(--status-error)', flexShrink:0 }}><Trash2 size={13} /></button>
                  </div>
                ))}
                {myAdvisors.length === 0 && !showAdvForm && <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', fontStyle:'italic' }}>Sin asesores registrados.</p>}
              </div>

              {/* Socios */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>Socios / Aliados</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowPartForm(s => !s)}><Plus size={14} /></button>
                </div>
                {showPartForm && (
                  <form onSubmit={handleAddPartner} style={{ background:'var(--bg-overlay)', borderRadius:'var(--radius-md)', padding:'var(--space-3)', marginBottom:'var(--space-3)' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-2)' }}>
                      <div><label className="form-label">Rol</label>
                        <select className="form-input" value={partForm.role} onChange={e => setPartForm(f => ({ ...f, role: e.target.value }))}>
                          {PARTNER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div><label className="form-label">Empresa / Nombre *</label><input className="form-input" required value={partForm.name} onChange={e => setPartForm(f => ({ ...f, name: e.target.value }))} /></div>
                      <div><label className="form-label">Contacto</label><input className="form-input" value={partForm.contact} onChange={e => setPartForm(f => ({ ...f, contact: e.target.value }))} /></div>
                      <div><label className="form-label">% Participación</label><input className="form-input" type="number" step="0.1" value={partForm.participation} onChange={e => setPartForm(f => ({ ...f, participation: e.target.value }))} /></div>
                      <div><label className="form-label">Teléfono</label><input className="form-input" value={partForm.phone} onChange={e => setPartForm(f => ({ ...f, phone: e.target.value }))} /></div>
                      <div><label className="form-label">Email</label><input className="form-input" type="email" value={partForm.email} onChange={e => setPartForm(f => ({ ...f, email: e.target.value }))} /></div>
                      <div style={{ gridColumn:'1/-1' }}><label className="form-label">Notas</label><input className="form-input" value={partForm.notes} onChange={e => setPartForm(f => ({ ...f, notes: e.target.value }))} /></div>
                    </div>
                    <div style={{ display:'flex', gap:'var(--space-2)', marginTop:'var(--space-2)' }}>
                      <button type="submit" className="btn btn-primary btn-sm">Guardar</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPartForm(false)}>Cancelar</button>
                    </div>
                  </form>
                )}
                {myPartners.map(p => (
                  <div key={p.id} style={{ background:'var(--bg-overlay)', borderRadius:'var(--radius-md)', padding:'var(--space-3)', marginBottom:'var(--space-2)', display:'flex', justifyContent:'space-between', gap:'var(--space-2)' }}>
                    <div>
                      <div style={{ display:'flex', gap:'var(--space-2)', alignItems:'center', marginBottom:3 }}>
                        <span style={{ fontWeight:600, fontSize:'0.85rem' }}>{p.name}</span>
                        <span style={{ fontSize:'0.7rem', padding:'1px 6px', borderRadius:'var(--radius-full)', background:'var(--bg-surface)', color:'var(--text-muted)' }}>{p.role}</span>
                        {p.participation > 0 && <span style={{ fontSize:'0.78rem', color:'var(--brand-primary)', fontWeight:700 }}>{p.participation}%</span>}
                      </div>
                      {p.contact && <p style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>Contacto: {p.contact}</p>}
                      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', display:'flex', gap:'var(--space-2)' }}>
                        {p.phone && <span>{p.phone}</span>}
                        {p.email && <span>{p.email}</span>}
                      </div>
                      {p.notes && <p style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:3 }}>{p.notes}</p>}
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => onRemovePartner(p.id)} style={{ color:'var(--status-error)', flexShrink:0 }}><Trash2 size={13} /></button>
                  </div>
                ))}
                {myPartners.length === 0 && !showPartForm && <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', fontStyle:'italic' }}>Sin socios/aliados registrados.</p>}
              </div>
            </div>
          )}

          {/* DOCUMENTOS */}
          {subTab === 'documentos' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Solo archivos PDF. Registra el nombre del archivo para referencia.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowDocForm(s => !s)}><Plus size={14} /> Agregar PDF</button>
              </div>
              {showDocForm && (
                <form onSubmit={handleAddDocument} style={{ background:'var(--bg-overlay)', borderRadius:'var(--radius-md)', padding:'var(--space-4)', marginBottom:'var(--space-3)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-3)' }}>
                  <div style={{ gridColumn:'1/-1' }}><label className="form-label">Nombre del documento *</label><input className="form-input" required value={docForm.name} onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Escritura del lote" /></div>
                  <div><label className="form-label">Categoría</label>
                    <select className="form-input" value={docForm.category} onChange={e => setDocForm(f => ({ ...f, category: e.target.value }))}>
                      {Object.entries(DOC_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Nombre del archivo PDF *</label><input className="form-input" required value={docForm.file_name} onChange={e => setDocForm(f => ({ ...f, file_name: e.target.value }))} placeholder="documento.pdf" /></div>
                  <div><label className="form-label">Cargado por</label><input className="form-input" value={docForm.uploaded_by} onChange={e => setDocForm(f => ({ ...f, uploaded_by: e.target.value }))} /></div>
                  <div><label className="form-label">Notas</label><input className="form-input" value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <div style={{ gridColumn:'1/-1', display:'flex', gap:'var(--space-2)' }}>
                    <button type="submit" className="btn btn-primary btn-sm">Registrar documento</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDocForm(false)}>Cancelar</button>
                  </div>
                </form>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {myDocuments.map(doc => (
                  <div key={doc.id} style={{ background:'var(--bg-overlay)', borderRadius:'var(--radius-md)', padding:'var(--space-3) var(--space-4)', display:'flex', alignItems:'center', gap:'var(--space-3)' }}>
                    <FileText size={18} style={{ color:'var(--status-error)', flexShrink:0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display:'flex', gap:'var(--space-2)', alignItems:'center' }}>
                        <span style={{ fontWeight:600, fontSize:'0.85rem' }}>{doc.name}</span>
                        <span style={{ fontSize:'0.7rem', padding:'1px 6px', borderRadius:'var(--radius-full)', background:'var(--bg-surface)', color:'var(--text-muted)' }}>{DOC_CATEGORIES[doc.category]}</span>
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
        </div>
      )}
    </div>
  )
}

const EMPTY_LOT = { name: '', address: '', area: '', status: 'prospecto', owner_name: '', owner_phone: '', owner_email: '', norm: '', units: '', use_type: 'residencial', structure_type: '', structure_designer: '', finishes: '', notes: '' }

export default function LotesPage() {
  const { lots, advisors, partners, scenarios, documents, loading,
    addLot, updateLot, removeLot,
    addAdvisor, removeAdvisor,
    addPartner, removePartner,
    addScenario, updateScenario, removeScenario,
    addDocument, removeDocument,
  } = useLots()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_LOT)
  const [statusFilter, setStatusFilter] = useState('all')

  const stats = {
    total:       lots.length,
    analisis:    lots.filter(l => l.status === 'analisis').length,
    negociacion: lots.filter(l => l.status === 'negociacion').length,
    adquiridos:  lots.filter(l => l.status === 'adquirido').length,
  }

  const filtered = statusFilter === 'all' ? lots : lots.filter(l => l.status === statusFilter)

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    await addLot({ ...form, area: parseFloat(form.area)||0, units: parseInt(form.units)||0 })
    setForm(EMPTY_LOT)
    setShowForm(false)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'var(--space-4)' }}>
          <div className="page-title">
            <div className="page-title-icon" style={{ background:'rgba(232,160,32,0.1)' }}>
              <Building size={24} style={{ color:'var(--brand-primary)' }} />
            </div>
            <div>
              <h1>Lotes — Seguimiento de Proyectos</h1>
              <p style={{ marginTop:4 }}>Gestión de lotes: fichas técnicas, escenarios financieros, contactos y documentos</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}><Plus size={16} /> Nuevo Lote</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:'var(--space-6)' }}>
        {[
          { label:'Total lotes',    value:stats.total,       color:'var(--text-primary)'   },
          { label:'En análisis',    value:stats.analisis,    color:'var(--status-info)'    },
          { label:'Negociación',    value:stats.negociacion, color:'var(--status-warning)' },
          { label:'Adquiridos',     value:stats.adquiridos,  color:'var(--status-success)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign:'center' }}>
            <p style={{ fontSize:'2rem', fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</p>
            <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* New lot form */}
      {showForm && (
        <div className="card" style={{ marginBottom:'var(--space-6)', border:'1px solid var(--brand-primary)' }}>
          <p className="card-title" style={{ marginBottom:'var(--space-4)' }}>Nuevo Lote</p>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div style={{ gridColumn:'1/-1' }}><label className="form-label">Nombre del lote / proyecto *</label><input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Lote Calle 80 — Barranquilla" /></div>
              <div style={{ gridColumn:'1/-1' }}><label className="form-label">Dirección</label><input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Dirección completa" /></div>
              <div><label className="form-label">Área (m²)</label><input className="form-input" type="number" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} /></div>
              <div><label className="form-label">Estado</label>
                <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div><label className="form-label">Uso</label>
                <select className="form-input" value={form.use_type} onChange={e => setForm(f => ({ ...f, use_type: e.target.value }))}>
                  {Object.entries(USE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className="form-label">N° unidades estimadas</label><input className="form-input" type="number" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} /></div>
              <div><label className="form-label">Nombre dueño del lote</label><input className="form-input" value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} /></div>
              <div><label className="form-label">Teléfono dueño</label><input className="form-input" value={form.owner_phone} onChange={e => setForm(f => ({ ...f, owner_phone: e.target.value }))} /></div>
              <div style={{ gridColumn:'1/-1' }}><label className="form-label">Notas iniciales</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div style={{ display:'flex', gap:'var(--space-3)', marginTop:'var(--space-4)' }}>
              <button type="submit" className="btn btn-primary">Crear Lote</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY_LOT) }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div style={{ display:'flex', gap:0, marginBottom:'var(--space-5)', borderBottom:'1px solid var(--border-subtle)' }}>
        {[['all','Todos'], ...Object.entries(STATUS_CFG).map(([k,v]) => [k, v.label])].map(([k, l]) => (
          <button key={k} onClick={() => setStatusFilter(k)} style={{
            padding:'var(--space-2) var(--space-3)', background:'none', border:'none', cursor:'pointer',
            fontSize:'0.82rem', fontWeight:600,
            color: statusFilter === k ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom:`2px solid ${statusFilter === k ? 'var(--brand-primary)' : 'transparent'}`,
            marginBottom:-1, whiteSpace:'nowrap',
          }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'var(--space-12)', color:'var(--text-muted)' }}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><MapPin size={32} /></div>
          <h3>Sin lotes registrados</h3>
          <p>Agrega el primer lote para comenzar el seguimiento de proyectos.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Nuevo Lote</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-3)' }}>
          {filtered.map(lot => (
            <LotCard
              key={lot.id}
              lot={lot}
              advisors={advisors}
              partners={partners}
              scenarios={scenarios}
              documents={documents}
              onUpdate={updateLot}
              onRemove={removeLot}
              onAddAdvisor={addAdvisor}
              onRemoveAdvisor={removeAdvisor}
              onAddPartner={addPartner}
              onRemovePartner={removePartner}
              onAddScenario={addScenario}
              onUpdateScenario={updateScenario}
              onRemoveScenario={removeScenario}
              onAddDocument={addDocument}
              onRemoveDocument={removeDocument}
            />
          ))}
        </div>
      )}
    </div>
  )
}
