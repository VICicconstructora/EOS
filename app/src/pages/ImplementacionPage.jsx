// src/pages/ImplementacionPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map, CheckCircle2, Circle, Lock, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { useImplementation, FASES } from '../lib/useImplementation'

const STATUS_CFG = {
  pending:   { label: 'Pendiente',   color: 'var(--border-medium)',  bg: 'var(--bg-elevated)' },
  active:    { label: 'Fase Actual', color: 'var(--brand-primary)',  bg: 'rgba(232,160,32,0.08)' },
  completed: { label: 'Completada',  color: 'var(--status-success)', bg: 'rgba(34,197,94,0.06)' },
}

function PhaseCard({ fase, phaseData, isTaskDone, onToggleTask, onComplete, onUpdatePhase }) {
  const [expanded, setExpanded] = useState(phaseData?.status === 'active')
  const [editNotes, setEditNotes] = useState(false)
  const [notes, setNotes] = useState(phaseData?.notes || '')
  const navigate = useNavigate()

  const sc = STATUS_CFG[phaseData?.status || 'pending']
  const isActive = phaseData?.status === 'active'
  const isCompleted = phaseData?.status === 'completed'
  const isPending = phaseData?.status === 'pending'

  const allFacilitadasDone = fase.tareas_facilitadas.every(t => isTaskDone(fase.id, t.key))
  const totalTasks = fase.tareas_facilitadas.length
  const doneTasks = fase.tareas_facilitadas.filter(t => isTaskDone(fase.id, t.key)).length

  return (
    <div style={{ border: `2px solid ${isActive ? sc.color : isPending ? 'var(--border-subtle)' : sc.color}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      {/* Header */}
      <div style={{ background: isActive ? sc.bg : 'var(--bg-surface)', padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: isCompleted ? sc.color : isActive ? sc.color : 'var(--bg-elevated)', border: `2px solid ${sc.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isCompleted
            ? <CheckCircle2 size={20} color="#fff" />
            : isPending
              ? <Lock size={16} style={{ color: 'var(--text-muted)' }} />
              : <span style={{ fontWeight: 800, color: isActive ? '#000' : 'var(--text-muted)', fontSize: '0.9rem' }}>{fase.id}</span>
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Fase {fase.id} — {fase.nombre}</h3>
            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700, color: sc.color, background: `${sc.color}18` }}>{sc.label}</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {fase.duracion}{fase.separacion ? ` · ${fase.separacion}` : ''}
          </p>
        </div>

        {isActive && (
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {doneTasks}/{totalTasks} tareas
          </span>
        )}

        {!isPending && (
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Barra de progreso (solo fase activa) */}
      {isActive && (
        <div style={{ height: 4, background: 'var(--border-subtle)' }}>
          <div style={{ height: '100%', width: `${totalTasks ? (doneTasks/totalTasks)*100 : 0}%`, background: 'var(--brand-primary)', transition: 'width 0.4s' }} />
        </div>
      )}

      {/* Contenido expandido */}
      {expanded && !isPending && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <div style={{ padding: 'var(--space-5)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>{fase.descripcion}</p>

            {/* Tareas facilitadas */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
                🖥 Ejercicios facilitados (pantalla compartida)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {fase.tareas_facilitadas.map(tarea => {
                  const done = isTaskDone(fase.id, tarea.key)
                  return (
                    <div key={tarea.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-3)', background: done ? 'rgba(34,197,94,0.05)' : 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'var(--border-subtle)'}` }}>
                      <button onClick={() => !isCompleted && onToggleTask(fase.id, tarea.key, !done)} style={{ background: 'none', border: 'none', cursor: isCompleted ? 'default' : 'pointer', color: done ? 'var(--status-success)' : 'var(--text-muted)', flexShrink: 0, padding: 0, marginTop: 1 }}>
                        {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.875rem', color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none', fontWeight: 500 }}>
                          {tarea.label}
                        </p>
                        {tarea.instruccion && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{tarea.instruccion}</p>
                        )}
                      </div>
                      {tarea.link && !isCompleted && (
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(tarea.link)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ExternalLink size={12} /> Ir
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Formularios individuales (placeholders) */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
                📋 Formularios individuales (para cada gerente)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {fase.formularios_individuales.map(f => (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-medium)', opacity: 0.7 }}>
                    <Circle size={18} style={{ color: 'var(--border-medium)', flexShrink: 0 }} />
                    <p style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{f.label}</p>
                    <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                      Requiere integración AD
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notas de la sesión</p>
                {!editNotes && <button className="btn btn-ghost btn-sm" onClick={() => setEditNotes(true)}>Editar</button>}
              </div>
              {editNotes ? (
                <div>
                  <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Apuntes, acuerdos, contexto de la sesión..." />
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => { onUpdatePhase(fase.id, { notes }); setEditNotes(false) }}>Guardar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setNotes(phaseData?.notes || ''); setEditNotes(false) }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.875rem', color: notes ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: notes ? 'normal' : 'italic' }}>
                  {notes || 'Sin notas aún...'}
                </p>
              )}
            </div>

            {/* Botón completar fase */}
            {isActive && allFacilitadasDone && (
              <div style={{ padding: 'var(--space-4)', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--status-success)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                  ✓ Todas las tareas completadas — ¿listo para avanzar?
                </p>
                <button className="btn btn-primary" onClick={() => onComplete(fase.id)}>
                  <CheckCircle2 size={14} /> Completar Fase {fase.id} y desbloquear la siguiente
                </button>
              </div>
            )}

            {isCompleted && (
              <p style={{ fontSize: '0.82rem', color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} />
                Completada el {new Date(phaseData.completed_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ImplementacionPage() {
  const { data, loading, toggleTask, completePhase, updatePhase, getPhaseData, isTaskDone, completedPhases, activePhase } = useImplementation()

  const pct = Math.round((completedPhases / 5) * 100)

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div className="page-title">
            <div className="page-title-icon" style={{ background: 'rgba(232,160,32,0.1)' }}>
              <Map size={24} style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <h1>Implementación EOS</h1>
              <p style={{ marginTop: 4 }}>Hoja de ruta IC Constructora — basada en el libro <em>Tracción</em></p>
            </div>
          </div>
        </div>
      </div>

      {/* Progreso global */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem' }}>Progreso de Implementación</p>
            {activePhase && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Actualmente en: <strong style={{ color: 'var(--brand-primary)' }}>Fase {activePhase.phase_id} — {FASES[activePhase.phase_id - 1]?.nombre}</strong>
              </p>
            )}
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: pct === 100 ? 'var(--status-success)' : 'var(--brand-primary)' }}>{pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%`, transition: 'width 0.6s ease', background: pct === 100 ? 'var(--status-success)' : 'var(--brand-primary)' }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
          {[['var(--status-success)', 'Completadas', completedPhases], ['var(--brand-primary)', 'En curso', activePhase ? 1 : 0], ['var(--border-medium)', 'Pendientes', 5 - completedPhases - (activePhase ? 1 : 0)]].map(([c, l, v]) => (
            <span key={l} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
              {v} {l}
            </span>
          ))}
        </div>
      </div>

      {/* Fases */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>Cargando progreso...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {FASES.map(fase => (
            <PhaseCard
              key={fase.id}
              fase={fase}
              phaseData={getPhaseData(fase.id)}
              isTaskDone={isTaskDone}
              onToggleTask={toggleTask}
              onComplete={completePhase}
              onUpdatePhase={updatePhase}
            />
          ))}
        </div>
      )}

      {/* Nota sobre formularios */}
      <div style={{ marginTop: 'var(--space-8)', padding: 'var(--space-4) var(--space-5)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Formularios individuales:</strong> Los formularios marcados como "Requiere integración AD" se activarán cuando se conecte el directorio activo de IC Constructora. Los gerentes entrarán a la app con sus credenciales corporativas y verán sus formularios pendientes en su dashboard.
        </p>
      </div>
    </div>
  )
}
