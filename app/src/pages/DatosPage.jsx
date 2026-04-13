// src/pages/DatosPage.jsx — Scorecard semanal con métricas
import { useState } from 'react'
import { BarChart3, Plus, Trash2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import { useMetrics } from '../lib/useMetrics'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'
import GuiaEOS from '../components/guia/GuiaEOS'

const CATEGORY_COLORS = ['#E8A020','#3B82F6','#22C55E','#EF4444','#8B5CF6','#F97316']

const EMPTY_METRIC = { name: '', category: 'General', owner: '', goal: '', unit: '', lower_is_better: false }

function TrendIcon({ current, goal, lower }) {
  if (current === null) return <Minus size={14} style={{ color: 'var(--text-muted)' }} />
  const ok = lower ? current <= goal : current >= goal
  const margin = Math.abs(current - goal) / (goal || 1)
  if (ok) return <TrendingUp size={14} style={{ color: 'var(--status-success)' }} />
  if (margin < 0.1) return <Minus size={14} style={{ color: 'var(--status-warning)' }} />
  return <TrendingDown size={14} style={{ color: 'var(--status-error)' }} />
}

function semaphore(current, goal, lower) {
  if (current === null) return 'var(--border-medium)'
  const ok = lower ? current <= goal : current >= goal
  const margin = Math.abs(current - goal) / (goal || 1)
  if (ok) return 'var(--status-success)'
  if (margin < 0.1) return 'var(--status-warning)'
  return 'var(--status-error)'
}

function MetricRow({ metric, values, onUpdateValue, onRemove, weeks }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing]   = useState(null) // week_label being edited
  const [editVal, setEditVal]   = useState('')
  const latest = values.length ? values[values.length - 1].value : null

  function startEdit(wl, current) {
    setEditing(wl)
    setEditVal(current !== undefined ? String(current) : '')
  }

  function saveEdit(wl) {
    const v = parseFloat(editVal)
    if (isNaN(v)) { setEditing(null); return }
    const existing = values.find(vv => vv.week_label === wl)
    if (existing) onUpdateValue(existing.id, v)
    else onUpdateValue(null, v, metric.id, wl)
    setEditing(null)
  }

  const sem = semaphore(latest, metric.goal, metric.lower_is_better)

  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: sem, flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{metric.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{metric.owner || '—'}</p>
            </div>
          </div>
        </td>
        <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {metric.goal}{metric.unit}
        </td>
        <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
          <span style={{ fontWeight: 700, color: sem, fontSize: '0.9rem' }}>
            {latest !== null ? `${latest}${metric.unit}` : '—'}
          </span>
        </td>
        <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
          <TrendIcon current={latest} goal={metric.goal} lower={metric.lower_is_better} />
        </td>
        <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => onRemove(metric.id)} style={{ color: 'var(--status-error)' }}>
              <Trash2 size={13} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: 8 }}>Valores semanales:</span>
              {weeks.map(wl => {
                const v = values.find(vv => vv.week_label === wl)
                const isEditing = editing === wl
                return (
                  <div key={wl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{wl}</span>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          autoFocus
                          style={{ width: 56, padding: '2px 6px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--brand-primary)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={() => saveEdit(wl)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(wl); if (e.key === 'Escape') setEditing(null) }}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(wl, v?.value)}
                        style={{ minWidth: 48, padding: '2px 6px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${v ? semaphore(v.value, metric.goal, metric.lower_is_better) : 'var(--border-medium)'}`, background: 'var(--bg-base)', color: v ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', textAlign: 'center' }}
                      >
                        {v !== undefined ? `${v.value}${metric.unit}` : '+'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function DatosPage() {
  const { metrics, values, loading, valuesFor, latestValue, addMetric, removeMetric, addValue, updateValue, weeks } = useMetrics()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_METRIC)
  const [catFilter, setCatFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('scorecard')

  const categories = ['all', ...new Set(metrics.map(m => m.category))]
  const filtered = catFilter === 'all' ? metrics : metrics.filter(m => m.category === catFilter)

  // Chart data — last 8 weeks across all metrics (up to 4 shown)
  const chartMetrics = metrics.slice(0, 4)
  const chartData = weeks.map(wl => {
    const point = { week: wl }
    chartMetrics.forEach(m => {
      const v = valuesFor(m.id).find(vv => vv.week_label === wl)
      point[m.name] = v ? v.value : null
    })
    return point
  })

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    await addMetric({ ...form, goal: parseFloat(form.goal) || 0 })
    setForm(EMPTY_METRIC)
    setShowForm(false)
  }

  function handleUpdateValue(id, val, metricId, wl) {
    if (id) updateValue(id, val)
    else addValue(metricId, wl, val)
  }

  const onTrack = metrics.filter(m => {
    const v = latestValue(m.id)
    return v !== null && (m.lower_is_better ? v <= m.goal : v >= m.goal)
  }).length

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div className="page-title">
            <div className="page-title-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <BarChart3 size={24} style={{ color: 'var(--eos-data)' }} />
            </div>
            <div>
              <h1>Datos</h1>
              <p style={{ marginTop: 4 }}>Scorecard semanal — métricas clave del negocio</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            <Plus size={16} /> Nueva Métrica
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Métricas activas', value: metrics.length, color: 'var(--text-primary)' },
          { label: 'En meta',          value: onTrack,         color: 'var(--status-success)' },
          { label: 'Por debajo',       value: metrics.length - onTrack, color: 'var(--status-error)' },
          { label: 'Categorías',       value: new Set(metrics.map(m => m.category)).size, color: 'var(--brand-primary)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* New metric form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--eos-data)' }}>
          <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Nueva Métrica</p>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Nombre de la métrica *</label>
                <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Ventas Semanales, Proyectos a Tiempo..." />
              </div>
              <div>
                <label className="form-label">Categoría</label>
                <input className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Comercial, Operaciones..." />
              </div>
              <div>
                <label className="form-label">Responsable</label>
                <input className="form-input" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} placeholder="Nombre" />
              </div>
              <div>
                <label className="form-label">Meta</label>
                <input className="form-input" type="number" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} placeholder="100" />
              </div>
              <div>
                <label className="form-label">Unidad</label>
                <input className="form-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="%, $k, pcs..." />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" checked={form.lower_is_better} onChange={e => setForm(f => ({ ...f, lower_is_better: e.target.checked }))} />
                  Menor es mejor (ej. incidentes, errores, días de mora)
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button type="submit" className="btn btn-primary">Agregar</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY_METRIC) }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
        {[['scorecard','Scorecard'],['chart','Tendencias'],['guia','Guía EOS']].map(([k,l]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{
            padding: 'var(--space-3) var(--space-5)', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600,
            color: activeTab === k ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: `2px solid ${activeTab === k ? 'var(--brand-primary)' : 'transparent'}`,
            marginBottom: -1,
          }}>{l}</button>
        ))}
      </div>

      {activeTab === 'chart' && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Tendencia — últimas 8 semanas</p>
          {chartData.some(d => chartMetrics.some(m => d[m.name] !== null)) ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 8, color: 'var(--text-primary)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {chartMetrics.map((m, i) => (
                  <Line key={m.id} type="monotone" dataKey={m.name} stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>Agrega valores semanales en el scorecard para ver tendencias.</p>
          )}
        </div>
      )}

      {activeTab === 'scorecard' && (
        <>
          {/* Category filter */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)} style={{
                padding: 'var(--space-2) var(--space-4)', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 600,
                color: catFilter === c ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: `2px solid ${catFilter === c ? 'var(--eos-data)' : 'transparent'}`,
                marginBottom: -1,
              }}>{c === 'all' ? 'Todas' : c}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>Cargando métricas...</div>
          ) : filtered.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon"><BarChart3 size={32} /></div>
              <h3>Sin métricas configuradas</h3>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Nueva Métrica</button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-medium)' }}>
                    {['Métrica / Responsable','Meta','Actual','Tendencia',''].map(h => (
                      <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: h === 'Métrica / Responsable' ? 'left' : 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => (
                    <MetricRow
                      key={m.id}
                      metric={m}
                      values={valuesFor(m.id)}
                      onUpdateValue={handleUpdateValue}
                      onRemove={removeMetric}
                      weeks={weeks}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {activeTab === 'guia' && <GuiaEOS module="datos" />}
    </div>
  )
}
