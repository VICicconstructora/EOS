// src/pages/DashboardPage.jsx — Dashboard con datos reales de hooks
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useRocks } from '../lib/useRocks'
import { useIssues } from '../lib/useIssues'
import { useMetrics } from '../lib/useMetrics'
import { Eye, Users, BarChart3, AlertTriangle, Settings2, Rocket, ChevronRight, Calendar, Target, CheckCircle2, AlertCircle, Circle } from 'lucide-react'

// Orden del modelo EOS: Visión (12) y Tracción (6) son opuestos
const EOS_MODULES = [
  { key: 'vision',   icon: Eye,           color: 'var(--eos-vision)',   path: '/vision',   nameEs: 'Visión',    descEs: 'Valores, propósito y metas' },          // 12h
  { key: 'personas', icon: Users,         color: 'var(--eos-people)',   path: '/personas', nameEs: 'Personas',  descEs: 'El equipo correcto en el asiento correcto' }, // 2h
  { key: 'datos',    icon: BarChart3,     color: 'var(--eos-data)',     path: '/datos',    nameEs: 'Datos',     descEs: 'Scorecard semanal de métricas' },         // 4h
  { key: 'traccion', icon: Rocket,        color: 'var(--eos-traction)', path: '/traccion', nameEs: 'Tracción',  descEs: 'Rocas trimestrales y reuniones' },        // 6h — opuesto a Visión
  { key: 'procesos', icon: Settings2,     color: 'var(--eos-process)',  path: '/procesos', nameEs: 'Procesos',  descEs: 'Procesos medulares documentados' },       // 8h
  { key: 'asuntos',  icon: AlertTriangle, color: 'var(--eos-issues)',   path: '/asuntos',  nameEs: 'Asuntos',   descEs: 'Identificar, Discutir y Solucionar' },    // 10h
]

const STATUS_ICON = { 'on-track': CheckCircle2, 'off-track': AlertCircle, 'done': CheckCircle2 }
const STATUS_COLOR = { 'on-track': 'var(--status-success)', 'off-track': 'var(--status-error)', 'done': 'var(--brand-primary)' }

function semaphore(current, goal, lower) {
  if (current === null || current === undefined) return 'var(--border-medium)'
  const ok = lower ? current <= goal : current >= goal
  const margin = Math.abs(current - goal) / (goal || 1)
  if (ok) return 'var(--status-success)'
  if (margin < 0.1) return 'var(--status-warning)'
  return 'var(--status-error)'
}

export default function DashboardPage() {
  const { vto, displayName } = useApp()
  const { rocks } = useRocks()
  const { issues } = useIssues()
  const { metrics, latestValue } = useMetrics()

  const openIssues  = issues.filter(i => i.status !== 'solved').length
  const rocksOnTrack = rocks.filter(r => r.status === 'on-track').length
  const rocksDone    = rocks.filter(r => r.status === 'done').length
  const topRocks     = rocks.slice(0, 4)
  const topIssues    = issues.filter(i => i.status !== 'solved').slice(0, 3)
  const topMetrics   = metrics.slice(0, 5)

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Bienvenido, {displayName} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
          {vto?.core_focus || 'Sistema EOS — IC Constructora'}
        </p>
      </div>

      {/* EOS Wheel */}
      <section style={{ position: 'relative', height: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-10)' }}>
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', border: '1px solid var(--border-subtle)', background: 'radial-gradient(circle, rgba(232,160,32,0.05) 0%, transparent 70%)', animation: 'spin 60s linear infinite' }} />

        <div style={{ width: 110, height: 110, borderRadius: '50%', background: '#E60000', border: '4px solid #ffffff', boxShadow: '0 4px 16px rgba(230, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', zIndex: 10, position: 'relative', flexDirection: 'column', color: '#ffffff', fontWeight: 900, fontFamily: 'var(--font-display)', letterSpacing: '-0.05em' }}>
          IC
          <div style={{ position: 'absolute', bottom: -28, whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.8rem', color: '#E60000', letterSpacing: '0.05em' }}>CONSTRUCTORA</div>
        </div>

        {EOS_MODULES.map((module, i) => {
          const angle = (i * 60) - 90
          const radius = 160
          const x = Math.cos(angle * Math.PI / 180) * radius
          const y = Math.sin(angle * Math.PI / 180) * radius
          return (
            <Link key={module.key} to={module.path} style={{
              position: 'absolute', transform: `translate(${x}px, ${y}px)`,
              width: 130, height: 130, padding: 'var(--space-3)', borderRadius: '50%',
              zIndex: 20, textDecoration: 'none',
              border: `1px solid ${module.color}33`, background: 'var(--bg-surface)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.25s', animationDelay: `${i * 0.08}s`,
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = `translate(${x}px, ${y}px) scale(1.1)`; e.currentTarget.style.borderColor = module.color; e.currentTarget.style.boxShadow = `0 0 16px ${module.color}33` }}
              onMouseLeave={e => { e.currentTarget.style.transform = `translate(${x}px, ${y}px) scale(1)`; e.currentTarget.style.borderColor = `${module.color}33`; e.currentTarget.style.boxShadow = 'none' }}
            >
              <module.icon size={26} style={{ color: module.color, marginBottom: 6 }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{module.nameEs}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1.3, marginTop: 2 }}>{module.descEs}</div>
              </div>
            </Link>
          )
        })}
      </section>

      {/* Summary row */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        {[
          { label: 'Rocas en Camino',  value: rocksOnTrack,  color: 'var(--status-success)', link: '/traccion' },
          { label: 'Rocas Completas',  value: rocksDone,      color: 'var(--brand-primary)',  link: '/traccion' },
          { label: 'Asuntos Abiertos', value: openIssues,     color: openIssues > 5 ? 'var(--status-error)' : 'var(--status-warning)', link: '/asuntos' },
          { label: 'Métricas Activas', value: metrics.length, color: 'var(--eos-data)',        link: '/datos' },
        ].map(s => (
          <Link key={s.label} to={s.link} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = s.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
            >
              <p style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>

        {/* Rocks widget */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Target size={16} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--eos-traction)' }} />Rocas del Trimestre</h3>
            <Link to="/traccion" className="btn btn-ghost btn-sm" style={{ padding: 0 }}><ChevronRight size={18} /></Link>
          </div>
          {topRocks.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-4)' }}>Sin rocas registradas</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {topRocks.map(rock => {
                const Icon = STATUS_ICON[rock.status] || Circle
                return (
                  <div key={rock.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${STATUS_COLOR[rock.status]}` }}>
                    <Icon size={14} style={{ color: STATUS_COLOR[rock.status], flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rock.title}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{rock.owner}</p>
                    </div>
                  </div>
                )
              })}
              {rocks.length > 4 && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>+{rocks.length - 4} más →</p>}
            </div>
          )}
        </div>

        {/* Issues widget */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--eos-issues)' }} />Asuntos Pendientes</h3>
            <Link to="/asuntos" className="btn btn-ghost btn-sm" style={{ padding: 0 }}><ChevronRight size={18} /></Link>
          </div>
          {topIssues.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--status-success)', textAlign: 'center', padding: 'var(--space-4)' }}>✓ Sin asuntos pendientes</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {topIssues.map(issue => (
                <div key={issue.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: issue.priority === 'alta' ? 'var(--status-error)' : 'var(--status-warning)', marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>{issue.title}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{issue.status === 'open' ? 'Identificado' : 'Discutiendo'}</p>
                  </div>
                </div>
              ))}
              {openIssues > 3 && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>+{openIssues - 3} más →</p>}
            </div>
          )}
        </div>

        {/* Scorecard widget */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><BarChart3 size={16} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--eos-data)' }} />Scorecard Semana Actual</h3>
            <Link to="/datos" className="btn btn-ghost btn-sm" style={{ padding: 0 }}><ChevronRight size={18} /></Link>
          </div>
          {topMetrics.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-4)' }}>Sin métricas configuradas</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {topMetrics.map(m => {
                const v = latestValue(m.id)
                const color = semaphore(v, m.goal, m.lower_is_better)
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', flex: 1 }}>{m.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>
                        {v !== null ? `${v}${m.unit}` : '—'}
                      </span>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Next meeting widget */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><Calendar size={16} style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--brand-primary)' }} />Próxima Reunión</h3>
            <Link to="/reuniones" className="btn btn-ghost btn-sm" style={{ padding: 0 }}><ChevronRight size={18} /></Link>
          </div>
          <div style={{ textAlign: 'center', padding: 'var(--space-3) 0' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Reunión L10 Semanal</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Lunes · 09:00 · 90 min</p>
            <Link to="/reuniones" className="btn btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
              Iniciar Reunión L10
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
