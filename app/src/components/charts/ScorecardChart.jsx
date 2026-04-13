// src/components/charts/ScorecardChart.jsx — Recharts line chart for scorecard trends
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-overlay)',
      border: '1px solid var(--border-medium)',
      borderRadius: 'var(--radius-md)',
      padding: '8px 12px',
      fontSize: '0.8rem',
      boxShadow: 'var(--shadow-md)',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

/**
 * ScorecardTrendChart — Area chart showing one metric over weeks
 */
export function ScorecardTrendChart({ data, dataKey, goal, color = '#E8A020', label, unit = '' }) {
  const goalVal = typeof goal === 'number' ? goal : undefined

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={40}
          tickFormatter={v => unit === 'MXN' ? `$${(v/1000).toFixed(0)}K` : `${v}${unit === '%' ? '%' : ''}`}
        />
        {goalVal !== undefined && (
          <ReferenceLine y={goalVal} stroke={color} strokeDasharray="4 4" strokeOpacity={0.5}
            label={{ value: 'Meta', fill: color, fontSize: 10, position: 'insideTopRight' }}
          />
        )}
        <Tooltip content={<CUSTOM_TOOLTIP />} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} name={label || dataKey} dot={false} activeDot={{ r: 4, fill: color }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/**
 * MultiLineChart — Multiple metrics on one chart
 */
export function MultiLineChart({ data, lines, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
        <Tooltip content={<CUSTOM_TOOLTIP />} />
        <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: 12 }} formatter={v => <span style={{ color: 'var(--text-secondary)' }}>{v}</span>} />
        {lines.map(({ key, color, label }) => (
          <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2} name={label || key} dot={false} activeDot={{ r: 4, fill: color }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * RocksDonutChart — Radial/donut-like breakdown using a bar
 */
export function RocksStatusBar({ done, onTrack, offTrack }) {
  const total = done + onTrack + offTrack || 1
  const segments = [
    { label: 'Completadas', value: done,     color: '#10B981', pct: (done/total)*100 },
    { label: 'En camino',   value: onTrack,  color: '#3B82F6', pct: (onTrack/total)*100 },
    { label: 'En riesgo',   value: offTrack, color: '#EF4444', pct: (offTrack/total)*100 },
  ]

  return (
    <div>
      <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 12 }}>
        {segments.filter(s => s.value > 0).map(s => (
          <div key={s.label} style={{ flex: s.pct, background: s.color, transition: 'flex var(--duration-slow)' }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.label}: <strong style={{ color: s.color }}>{s.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  )
}
