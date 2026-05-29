import React, { useMemo } from 'react'
import { useProyectosKpis } from '../../lib/useProyectosKpis'

// Convierte nombre de proyecto a slug para cruzar con tabla alarms
function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Devuelve true si el slug del proyecto coincide con el slug de la alarma.
// Las alarmas usan el macro-proyecto ('reserva-de-oporto'), el historico
// puede tener etapas ('reserva-de-oporto-e-1-2'), así que se hace
// comparación por prefijo en ambas direcciones.
const SLUG_OVERRIDES = {
  'la-hacienda-e1': 'la-hacienda-jamundi',
  'la-hacienda-e2': 'la-hacienda-jamundi',
  'la-hacienda-e3': 'la-hacienda-jamundi',
}

function matchAlarm(alarmProject, proyectoNombre) {
  let slug = toSlug(proyectoNombre)
  slug = SLUG_OVERRIDES[slug] ?? slug
  return slug.startsWith(alarmProject) || alarmProject.startsWith(slug)
}

function fmtCOP(v) {
  if (!v || v === 0) return '—'
  const mm = v / 1e9
  if (mm >= 1000) return `$${(mm / 1000).toFixed(1)} B`
  if (mm >= 1)    return `$${mm.toFixed(1)} MM`
  return `$${(v / 1e6).toFixed(0)} M`
}

function fmtMes(fechaDatos) {
  if (!fechaDatos) return '—'
  const [y, m] = fechaDatos.split('-')
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${meses[parseInt(m, 10) - 1]} ${y}`
}

function CubrimientoBar({ pct }) {
  if (pct === null || pct === undefined) return <span style={{ color: 'var(--text-muted)' }}>—</span>

  const cubierto = pct >= 100
  const clamped  = Math.min(pct, 100)
  const color    = cubierto ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626'
  const label    = cubierto ? `>100%` : `${pct.toFixed(1)}%`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <div style={{
        flex: 1, height: 8, borderRadius: 4,
        background: 'var(--border-light)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${clamped}%`,
          background: color,
          borderRadius: 4,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 600, minWidth: 44, textAlign: 'right' }}>
        {label}
      </span>
    </div>
  )
}

const SEVERITY_STYLE = {
  alta:  { bg: '#fef2f2', color: '#dc2626', label: 'Alta' },
  media: { bg: '#fffbeb', color: '#d97706', label: 'Media' },
  baja:  { bg: '#f0fdf4', color: '#16a34a', label: 'Baja' },
}

function AlarmaBadges({ alarmas }) {
  if (!alarmas.length) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>

  const counts = {}
  for (const a of alarmas) {
    counts[a.severity] = (counts[a.severity] ?? 0) + 1
  }

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {Object.entries(counts).map(([sev, n]) => {
        const s = SEVERITY_STYLE[sev] ?? SEVERITY_STYLE.baja
        return (
          <span key={sev} style={{
            fontSize: 11, fontWeight: 600,
            padding: '2px 7px', borderRadius: 10,
            background: s.bg, color: s.color,
            border: `1px solid ${s.color}33`,
          }}>
            {n} {s.label}
          </span>
        )
      })}
    </div>
  )
}

const COL = {
  th: {
    padding: '10px 14px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-light)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 14px',
    borderBottom: '1px solid var(--border-light)',
    fontSize: 13,
    color: 'var(--text-primary)',
    verticalAlign: 'middle',
  },
}

export default function ProyectosResumenTable() {
  const { kpis, alarms, loading, error } = useProyectosKpis()

  const rows = useMemo(() =>
    kpis.map(k => ({
      ...k,
      alarmas: alarms.filter(a => matchAlarm(a.project, k.proyecto)),
    })),
    [kpis, alarms]
  )

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
      Cargando datos...
    </div>
  )

  if (error) return (
    <div style={{ padding: 24, color: '#dc2626', fontSize: 13 }}>
      Error: {error}
    </div>
  )

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Resumen por Proyecto
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Ventas acumuladas, valor vendido, cubrimiento de crédito constructor y alarmas activas al último corte disponible.
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...COL.th, textAlign: 'left' }}>Proyecto</th>
              <th style={{ ...COL.th, textAlign: 'center' }}>Corte</th>
              <th style={{ ...COL.th, textAlign: 'right' }}>Vendidas</th>
              <th style={{ ...COL.th, textAlign: 'right' }}>Valor Vendido</th>
              <th style={{ ...COL.th, textAlign: 'left', minWidth: 170 }}>
                Cubrimiento Crédito
                <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 4 }}>(Ing. / Cupo)</span>
              </th>
              <th style={{ ...COL.th, textAlign: 'left' }}>Alarmas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.proyecto}
                style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}
              >
                <td style={{ ...COL.td, fontWeight: 500 }}>{r.proyecto}</td>
                <td style={{ ...COL.td, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {fmtMes(r.fecha_datos)}
                </td>
                <td style={{ ...COL.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {r.ventas_un > 0 && r.ventas_un < 100000
                    ? r.ventas_un.toLocaleString('es-CO')
                    : r.ventas_un > 100000
                      ? <span style={{ color: '#d97706', fontSize: 11 }}>err</span>
                      : '—'}
                </td>
                <td style={{ ...COL.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtCOP(r.ventas_cop)}
                </td>
                <td style={{ ...COL.td }}>
                  <CubrimientoBar pct={r.cubrimiento_pct} />
                </td>
                <td style={{ ...COL.td }}>
                  <AlarmaBadges alarmas={r.alarmas} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
        Cubrimiento = Ingresos de crédito vendido acumulados / Cupo vigente del crédito constructor.
        Rojo &lt; 50% · Amarillo 50–80% · Verde ≥ 80%.
      </p>
    </div>
  )
}
