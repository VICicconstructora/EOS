// src/components/meetings/L10Runner.jsx — L10 meeting interactive runner
import { useState, useEffect, useRef } from 'react'
import { Play, Pause, SkipForward, X, CheckCircle2, Clock, Star } from 'lucide-react'
import { useRocks } from '../../lib/useRocks'
import { useIssues } from '../../lib/useIssues'

const AGENDA_STEPS = [
  { key: 'checkin',     label: 'Check-in / Segway',          minutes: 5,  color: '#E8A020', desc: 'Cada persona comparte una buena noticia personal y de negocio' },
  { key: 'scorecard',   label: 'Revisión del Scorecard',     minutes: 5,  color: '#F97316', desc: 'Revisar semáforos — ¿hay algún número fuera de meta?' },
  { key: 'rocks',       label: 'Revisión de Rocas',          minutes: 5,  color: '#3B82F6', desc: 'Cada responsable reporta: en camino o en riesgo (sin discutir)' },
  { key: 'headlines',   label: 'Titulares',                  minutes: 5,  color: '#10B981', desc: 'Noticias de clientes y empleados — buenas o malas, sin debate' },
  { key: 'ids',         label: 'IDS — Lista de Asuntos',     minutes: 60, color: '#EF4444', desc: 'Identificar, Discutir y Solucionar los problemas prioritarios' },
  { key: 'conclusion',  label: 'Conclusión',                 minutes: 5,  color: '#8B5CF6', desc: 'Próxima reunión, tareas asignadas, calificación 1-10' },
]

const TOTAL_MINUTES = AGENDA_STEPS.reduce((a, s) => a + s.minutes, 0)

function Timer({ running, secondsLeft, totalSeconds }) {
  const pct = ((totalSeconds - secondsLeft) / totalSeconds) * 100
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const isWarning = secondsLeft < 60
  const isOver    = secondsLeft <= 0

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Ring */}
      <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 16px' }}>
        <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={60} cy={60} r={52} fill="none" stroke="var(--border-medium)" strokeWidth={8} />
          <circle cx={60} cy={60} r={52} fill="none"
            stroke={isOver ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981'}
            strokeWidth={8}
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}>
          <span style={{
            fontSize: '1.5rem', fontWeight: 800,
            color: isOver ? '#EF4444' : isWarning ? '#F59E0B' : 'var(--text-primary)',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {isOver ? 'TIEMPO' : `${mins}:${secs.toString().padStart(2, '0')}`}
          </span>
          {!isOver && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>restante</span>}
        </div>
      </div>
    </div>
  )
}

export default function L10Runner({ onClose, onFinish }) {
  const { rocks } = useRocks()
  const { issues } = useIssues()
  const [stepIdx, setStepIdx]   = useState(0)
  const [running, setRunning]   = useState(false)
  const [secondsLeft, setSecsLeft] = useState(AGENDA_STEPS[0].minutes * 60)
  const [rating, setRating]     = useState(0)
  const [notes, setNotes]       = useState({})
  const [rockStatuses, setRockStatuses] = useState({})
  const [resolved, setResolved] = useState({})
  const intervalRef = useRef(null)

  const step = AGENDA_STEPS[stepIdx]
  const isLast = stepIdx === AGENDA_STEPS.length - 1

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => setSecsLeft(s => s - 1), 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, secondsLeft])

  function goNext() {
    if (isLast) return
    const next = stepIdx + 1
    setStepIdx(next)
    setSecsLeft(AGENDA_STEPS[next].minutes * 60)
    setRunning(false)
  }

  function goPrev() {
    if (stepIdx === 0) return
    const prev = stepIdx - 1
    setStepIdx(prev)
    setSecsLeft(AGENDA_STEPS[prev].minutes * 60)
    setRunning(false)
  }

  const openIssues = issues.filter(i => i.status !== 'solved')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column',
      overflow: 'auto',
    }}>
      {/* Top bar */}
      <div style={{
        height: 64, background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center',
        padding: '0 var(--space-6)',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: running ? '#10B981' : '#F59E0B', boxShadow: running ? '0 0 0 3px rgba(16,185,129,0.3)' : 'none' }} />
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Reunión L10 en curso</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        {/* Overall progress */}
        <div style={{ flex: 1, maxWidth: 300, margin: '0 var(--space-6)' }}>
          <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2 }}>
            {AGENDA_STEPS.map((s, i) => (
              <div key={s.key} style={{
                flex: s.minutes,
                background: i < stepIdx ? s.color : i === stepIdx ? `${s.color}80` : 'var(--border-medium)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
            Paso {stepIdx + 1} de {AGENDA_STEPS.length}
          </p>
        </div>

        <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', gap: 0, minHeight: 0 }}>

        {/* Left: Steps sidebar */}
        <div style={{
          width: 260, background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          padding: 'var(--space-4) 0',
          overflowY: 'auto', flexShrink: 0,
        }}>
          {AGENDA_STEPS.map((s, i) => {
            const done = i < stepIdx
            const active = i === stepIdx
            return (
              <button
                key={s.key}
                onClick={() => { setStepIdx(i); setSecsLeft(s.minutes * 60); setRunning(false) }}
                style={{
                  width: '100%', background: active ? 'var(--bg-elevated)' : 'none',
                  border: 'none', borderLeft: active ? `3px solid ${s.color}` : '3px solid transparent',
                  padding: 'var(--space-3) var(--space-5)',
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  transition: 'all var(--duration-fast)',
                  opacity: done ? 0.6 : 1,
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: done ? s.color : active ? `${s.color}20` : 'var(--bg-elevated)',
                  border: `2px solid ${done || active ? s.color : 'var(--border-medium)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 800,
                  color: done ? 'white' : active ? s.color : 'var(--text-muted)',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: active ? 700 : 500, color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {s.label}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.minutes} min</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Center: Active step */}
        <div style={{ flex: 1, padding: 'var(--space-8)', overflowY: 'auto' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>

            {/* Step header */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <span style={{
                display: 'inline-block', padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                background: `${step.color}20`, color: step.color,
                fontSize: '0.75rem', fontWeight: 700, marginBottom: 'var(--space-3)',
              }}>
                {step.minutes} minutos
              </span>
              <h2 style={{ fontSize: '1.6rem', marginBottom: 'var(--space-2)' }}>{step.label}</h2>
              <p style={{ color: 'var(--text-muted)' }}>{step.desc}</p>
            </div>

            {/* Timer controls */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-6)',
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)',
              marginBottom: 'var(--space-6)',
            }}>
              <Timer running={running} secondsLeft={secondsLeft} totalSeconds={step.minutes * 60} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <button className={`btn btn-${running ? 'secondary' : 'primary'}`} onClick={() => setRunning(r => !r)}>
                    {running ? <><Pause size={16} /> Pausar</> : <><Play size={16} /> {secondsLeft === step.minutes * 60 ? 'Iniciar' : 'Reanudar'}</>}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setSecsLeft(step.minutes * 60)}>
                    Reiniciar
                  </button>
                </div>
                {!isLast && (
                  <button className="btn btn-secondary btn-sm" onClick={goNext}>
                    <SkipForward size={14} /> Siguiente: {AGENDA_STEPS[stepIdx + 1]?.label}
                  </button>
                )}
              </div>
            </div>

            {/* Step-specific content */}

            {/* Rocks review */}
            {step.key === 'rocks' && (
              <div className="card">
                <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Estado de rocas</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {rocks.map(rock => (
                    <div key={rock.id} style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{rock.title}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rock.owner}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {['on-track', 'off-track', 'done'].map(s => {
                          const labels = { 'on-track': '→ Camino', 'off-track': '⚠ Riesgo', done: '✓ Lista' }
                          const colors = { 'on-track': '#3B82F6', 'off-track': '#EF4444', done: '#10B981' }
                          const current = rockStatuses[rock.id] ?? rock.status
                          const selected = current === s
                          return (
                            <button key={s} onClick={() => setRockStatuses(r => ({ ...r, [rock.id]: s }))}
                              style={{
                                padding: '3px 8px', borderRadius: 'var(--radius-full)',
                                border: `1px solid ${selected ? colors[s] : 'var(--border-medium)'}`,
                                background: selected ? `${colors[s]}20` : 'none',
                                color: selected ? colors[s] : 'var(--text-muted)',
                                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                transition: 'all var(--duration-fast)',
                              }}
                            >
                              {labels[s]}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IDS - Issues */}
            {step.key === 'ids' && (
              <div className="card">
                <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
                  Lista de asuntos ({openIssues.length} abiertos)
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {openIssues.map(issue => (
                    <div key={issue.id} style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                      opacity: resolved[issue.id] ? 0.5 : 1,
                    }}>
                      <button
                        onClick={() => setResolved(r => ({ ...r, [issue.id]: !r[issue.id] }))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, color: resolved[issue.id] ? '#10B981' : 'var(--text-muted)' }}
                      >
                        {resolved[issue.id] ? <CheckCircle2 size={18} /> : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid currentColor' }} />}
                      </button>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', flex: 1, textDecoration: resolved[issue.id] ? 'line-through' : 'none' }}>
                        {issue.title}
                      </p>
                    </div>
                  ))}
                  {openIssues.length === 0 && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--status-success)', textAlign: 'center', padding: 'var(--space-5)' }}>
                      ✓ Sin asuntos pendientes — ¡excelente!
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Conclusion - Rating */}
            {step.key === 'conclusion' && (
              <div className="card">
                <p className="card-title" style={{ marginBottom: 'var(--space-5)' }}>Califica esta reunión</p>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} onClick={() => setRating(n)} style={{
                      width: 44, height: 44, borderRadius: 'var(--radius-md)',
                      border: `2px solid ${rating === n ? 'var(--brand-primary)' : 'var(--border-medium)'}`,
                      background: rating === n ? 'rgba(232,160,32,0.15)' : 'var(--bg-elevated)',
                      color: rating === n ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                      transition: 'all var(--duration-fast)',
                    }}>
                      {n}
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p style={{ fontSize: '0.9rem', color: rating >= 8 ? 'var(--status-success)' : rating >= 6 ? 'var(--status-warning)' : 'var(--status-error)', fontWeight: 600 }}>
                    {rating >= 9 ? '🏆 Reunión de nivel 10 — ¡excelente!' : rating >= 7 ? '👍 Buena reunión' : rating >= 5 ? '🟡 Reunión promedio — identifica qué mejorar' : '🔴 Reunión difícil — ¿qué salió mal?'}
                  </p>
                )}
                <div className="input-group" style={{ marginTop: 'var(--space-5)' }}>
                  <label className="input-label">Notas finales / Compromisos</label>
                  <textarea className="input" rows={4} value={notes.conclusion || ''} onChange={e => setNotes(n => ({ ...n, conclusion: e.target.value }))} placeholder="Tareas asignadas, decisiones clave, próximos pasos..." />
                </div>
                <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => {
                  const issuesSolved = Object.values(resolved).filter(Boolean).length
                  if (onFinish) onFinish({ rating, issuesSolved, rockStatuses, notes })
                  onClose()
                }}>
                  <CheckCircle2 size={16} /> Finalizar reunión
                </button>
              </div>
            )}

            {/* Generic notes for other steps */}
            {!['rocks', 'ids', 'conclusion'].includes(step.key) && (
              <div className="card">
                <p className="card-title" style={{ marginBottom: 'var(--space-3)' }}>Notas de este punto</p>
                <textarea
                  className="input"
                  rows={5}
                  value={notes[step.key] || ''}
                  onChange={e => setNotes(n => ({ ...n, [step.key]: e.target.value }))}
                  placeholder="Anota decisiones, compromisos o temas relevantes..."
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
