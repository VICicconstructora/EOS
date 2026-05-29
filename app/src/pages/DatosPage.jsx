// src/pages/DatosPage.jsx — Scorecard: mismos KPIs del dashboard corporativo
import { useState } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { useKpis } from '../lib/useKpis'
import { useTramitesFrancisco } from '../lib/useTramitesFrancisco'
import { useProgramacionObra } from '../lib/useProgramacionObra'
import { useProgramacionIntermedia } from '../lib/useProgramacionIntermedia'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import GuiaEOS from '../components/guia/GuiaEOS'

const STATUS_COLOR = {
  success: 'var(--status-success)',
  warning: 'var(--status-warning)',
  danger:  'var(--status-error)',
}

const CHART_COLORS = ['#E8A020','#3B82F6','#22C55E','#EF4444','#8B5CF6','#F97316']

function TrendIcon({ status }) {
  if (status === 'success') return <TrendingUp  size={14} style={{ color: 'var(--status-success)' }} />
  if (status === 'warning') return <Minus       size={14} style={{ color: 'var(--status-warning)' }} />
  return                           <TrendingDown size={14} style={{ color: 'var(--status-error)'   }} />
}

function fmtValue(val, format) {
  if (val == null || isNaN(val)) return '—'
  if (format === 'currency')    return `$${Number(val).toLocaleString()} MM`
  if (format === 'percentage')  return `${Number(val).toLocaleString()}%`
  return Number(val).toLocaleString()
}

function ScoreRow({ node }) {
  const [expanded, setExpanded] = useState(false)
  const color      = STATUS_COLOR[node.status] || 'var(--border-medium)'
  const hasChildren = node.children && node.children.length > 0

  return (
    <>
      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{node.title}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{node.owner || '—'}</p>
            </div>
          </div>
        </td>
        <td style={{ padding: 'var(--space-3)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {fmtValue(node.targetValue, node.format)}
        </td>
        <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
          <span style={{ fontWeight: 700, color, fontSize: '0.9rem' }}>
            {fmtValue(node.currentValue, node.format)}
          </span>
        </td>
        <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
          <TrendIcon status={node.status} />
        </td>
        <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
          {hasChildren && (
            <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </td>
      </tr>

      {expanded && hasChildren && node.children.map(child => (
        <tr key={child.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <td style={{ padding: 'var(--space-2) var(--space-4) var(--space-2) var(--space-10)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[child.status] || 'var(--border-medium)', flexShrink: 0 }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{child.title}</p>
            </div>
          </td>
          <td style={{ padding: 'var(--space-2)', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {fmtValue(child.targetValue, child.format)}
          </td>
          <td style={{ padding: 'var(--space-2)', textAlign: 'center' }}>
            <span style={{ fontWeight: 600, color: STATUS_COLOR[child.status] || 'var(--text-primary)', fontSize: '0.82rem' }}>
              {fmtValue(child.currentValue, child.format)}
            </span>
          </td>
          <td style={{ padding: 'var(--space-2)', textAlign: 'center' }}>
            <TrendIcon status={child.status} />
          </td>
          <td />
        </tr>
      ))}
    </>
  )
}

export default function DatosPage() {
  const { tree: realTree, loading, error } = useKpis('total')
  const { nodes: franciscoNodes } = useTramitesFrancisco()
  const { nodes: obraNodes } = useProgramacionObra()
  const { nodes: interMediaNodes } = useProgramacionIntermedia()
  const [activeTab,   setActiveTab]   = useState('scorecard')
  const [ownerFilter, setOwnerFilter] = useState('all')

  const allKpis = [...obraNodes, ...interMediaNodes, ...(realTree || []), ...franciscoNodes]

  const owners   = ['all', ...new Set(allKpis.map(k => k.owner).filter(Boolean))]
  const filtered = ownerFilter === 'all' ? allKpis : allKpis.filter(k => k.owner === ownerFilter)

  const onTrack  = allKpis.filter(k => k.status === 'success').length
  const atRisk   = allKpis.filter(k => k.status === 'warning').length
  const offTrack = allKpis.filter(k => k.status === 'danger').length

  // Tendencias: KPIs raíz con historial mensual (Francisco no tiene historial)
  const chartKpis = allKpis.filter(k => k.history && k.history.length > 0).slice(0, 4)
  const allPeriods = [...new Set(chartKpis.flatMap(k => k.history.map(h => h.period)))]
  const chartData  = allPeriods.map(period => {
    const point = { period }
    chartKpis.forEach(k => {
      const h = k.history.find(h => h.period === period)
      point[k.title] = h ? h.actual : null
    })
    return point
  })

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">
          <div className="page-title-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <BarChart3 size={24} style={{ color: 'var(--eos-data)' }} />
          </div>
          <div>
            <h1>Datos</h1>
            <p style={{ marginTop: 4 }}>Scorecard — Indicadores clave del negocio</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--status-error)' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          Error cargando indicadores: {error?.message}
        </div>
      )}

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Indicadores',  value: allKpis.length, color: 'var(--text-primary)'    },
          { label: 'En meta',      value: onTrack,         color: 'var(--status-success)'  },
          { label: 'En riesgo',    value: atRisk,          color: 'var(--status-warning)'  },
          { label: 'Por debajo',   value: offTrack,        color: 'var(--status-error)'    },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
        {[['scorecard','Scorecard'],['chart','Tendencias'],['guia','Guía EOS']].map(([k,l]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{
            padding: 'var(--space-3) var(--space-5)', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600,
            color:       activeTab === k ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: `2px solid ${activeTab === k ? 'var(--brand-primary)' : 'transparent'}`,
            marginBottom: -1,
          }}>{l}</button>
        ))}
      </div>

      {activeTab === 'chart' && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Tendencia mensual — KPIs principales</p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="period" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 8, color: 'var(--text-primary)' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {chartKpis.map((k, i) => (
                  <Line key={k.id} type="monotone" dataKey={k.title} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>Sin historial mensual disponible.</p>
          )}
        </div>
      )}

      {activeTab === 'scorecard' && (
        <>
          {/* Owner filter */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
            {owners.map(o => (
              <button key={o} onClick={() => setOwnerFilter(o)} style={{
                padding: 'var(--space-2) var(--space-4)', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 600,
                color:       ownerFilter === o ? 'var(--text-primary)' : 'var(--text-muted)',
                borderBottom: `2px solid ${ownerFilter === o ? 'var(--eos-data)' : 'transparent'}`,
                marginBottom: -1,
                whiteSpace: 'nowrap',
              }}>{o === 'all' ? 'Todos' : o}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>Cargando indicadores...</div>
          ) : filtered.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon"><BarChart3 size={32} /></div>
              <h3>Sin indicadores para mostrar</h3>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-medium)' }}>
                    {['Indicador / Responsable','Meta','Actual','Tendencia',''].map(h => (
                      <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: h === 'Indicador / Responsable' ? 'left' : 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(node => (
                    <ScoreRow key={node.id} node={node} />
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
