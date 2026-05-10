// src/pages/TareasPage.jsx — Tareas, compromisos y to-dos
import { useState, useMemo } from 'react'
import { CheckSquare, Plus, Trash2, Calendar, User, X, Save, AlertCircle } from 'lucide-react'
import { useTasks } from '../lib/useTasks'
import { usePeople } from '../lib/usePeople'
import { useApp } from '../context/AppContext'

const STATUS_CFG = {
  'todo':        { label: 'Pendiente',    color: 'var(--text-muted)',     bg: 'var(--bg-elevated)' },
  'in-progress': { label: 'En progreso',  color: 'var(--status-info)',    bg: 'rgba(59,130,246,0.1)' },
  'done':        { label: 'Completada',   color: 'var(--status-success)', bg: 'rgba(34,197,94,0.1)' },
  'blocked':     { label: 'Bloqueada',    color: 'var(--status-error)',   bg: 'rgba(239,68,68,0.1)' },
}

const STATUS_NEXT = { 'todo': 'in-progress', 'in-progress': 'done', 'done': null, 'blocked': 'todo' }
const STATUS_BTN  = { 'todo': 'Iniciar', 'in-progress': 'Completar', 'blocked': 'Reactivar' }

const PRIORITY_CFG = {
  alta:  { label: 'Alta',  color: 'var(--status-error)' },
  media: { label: 'Media', color: '#d97706' },
  baja:  { label: 'Baja',  color: 'var(--status-success)' },
}

const SOURCE_LABELS = { manual: '', meeting: 'Reunión', datamart: 'Datamart' }

function diasHasta(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d - today) / 86400000)
}

function diasLabel(dias) {
  if (dias === null) return ''
  if (dias < 0)  return `${Math.abs(dias)}d vencida`
  if (dias === 0) return 'vence hoy'
  if (dias === 1) return 'mañana'
  return `${dias}d`
}

function TaskCard({ task, onUpdate, onRemove }) {
  const sc = STATUS_CFG[task.status] || STATUS_CFG.todo
  const pc = PRIORITY_CFG[task.priority] || PRIORITY_CFG.media
  const dias = diasHasta(task.due_date)
  const nextStatus = STATUS_NEXT[task.status]

  const dueColor = dias === null
    ? 'var(--text-muted)'
    : dias < 0
    ? 'var(--status-error)'
    : dias <= 2
    ? '#d97706'
    : 'var(--text-muted)'

  function advance() {
    const updates = { ...task, status: nextStatus }
    if (nextStatus === 'done') updates.completed_at = new Date().toISOString()
    onUpdate(updates)
  }

  return (
    <div className="card" style={{
      padding: 0, overflow: 'hidden',
      borderLeft: `4px solid ${pc.color}`,
      opacity: task.status === 'done' ? 0.6 : 1,
      transition: 'opacity 0.2s',
    }}>
      <div style={{
        padding: 'var(--space-4) var(--space-5)',
        display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-start',
      }}>
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 600, color: sc.color, background: sc.bg }}>
              {sc.label}
            </span>
            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 600, color: pc.color, background: `${pc.color}18` }}>
              {pc.label}
            </span>
            {task.source && task.source !== 'manual' && (
              <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                {SOURCE_LABELS[task.source]}
              </span>
            )}
          </div>

          {/* Title */}
          <p style={{
            fontWeight: 600, fontSize: '0.9rem', marginBottom: 'var(--space-2)',
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
          }}>
            {task.title}
          </p>

          {/* Description */}
          {task.description && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
              {task.description}
            </p>
          )}

          {/* Meta */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: '0.78rem' }}>
            {task.assigned_name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                <User size={12} />
                {task.assigned_name}
              </span>
            )}
            {task.due_date && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: dueColor, fontWeight: dias !== null && dias <= 2 ? 600 : 400 }}>
                <Calendar size={12} />
                {task.due_date}
                {dias !== null && <span>({diasLabel(dias)})</span>}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
          {nextStatus && (
            <button className="btn btn-primary btn-sm" onClick={advance}>
              {STATUS_BTN[task.status]}
            </button>
          )}
          {task.status === 'in-progress' && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onUpdate({ ...task, status: 'blocked' })}
              style={{ color: 'var(--status-error)' }}
            >
              Bloquear
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onRemove(task.id)}
            style={{ color: 'var(--status-error)' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  title: '',
  description: '',
  assigned_to: '',
  assigned_name: '',
  due_date: '',
  priority: 'media',
}

function TaskForm({ onSave, onCancel, people }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function handlePersonChange(email) {
    const p = people.find(x => x.email === email)
    setForm(f => ({ ...f, assigned_to: email, assigned_name: p?.name || '' }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <form
      onSubmit={submit}
      className="card"
      style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)', borderLeft: '4px solid var(--brand-primary)' }}
    >
      <h3 style={{ marginBottom: 'var(--space-4)', fontSize: '0.95rem', fontWeight: 700 }}>
        Nueva tarea
      </h3>

      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Título *</label>
          <input
            className="input"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="¿Qué hay que hacer?"
            required
            autoFocus
          />
        </div>

        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="label">Descripción</label>
          <textarea
            className="input"
            rows={2}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Contexto adicional (opcional)"
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label">Responsable</label>
            <select
              className="input"
              value={form.assigned_to}
              onChange={e => handlePersonChange(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {people.filter(p => p.email).map(p => (
                <option key={p.id || p.email} value={p.email}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label">Fecha límite</label>
            <input
              type="date"
              className="input"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label">Prioridad</label>
            <select
              className="input"
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Save size={14} />
          {saving ? 'Guardando...' : 'Guardar tarea'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default function TareasPage() {
  const { tasks, loading, add, update, remove } = useTasks()
  const { people } = usePeople()
  const { user } = useApp()

  const [showForm,      setShowForm]      = useState(false)
  const [filterStatus,  setFilterStatus]  = useState('open')
  const [filterOwner,   setFilterOwner]   = useState('all')

  const filtered = useMemo(() => {
    return tasks
      .filter(t => {
        if (filterStatus === 'open' && t.status === 'done') return false
        if (filterStatus === 'done' && t.status !== 'done') return false
        if (filterOwner === 'mine' && t.assigned_to !== user?.email) return false
        return true
      })
      .sort((a, b) => {
        const pOrder = { alta: 0, media: 1, baja: 2 }
        if (a.priority !== b.priority) return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1)
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      })
  }, [tasks, filterStatus, filterOwner, user])

  const counts = {
    open:  tasks.filter(t => t.status !== 'done').length,
    done:  tasks.filter(t => t.status === 'done').length,
    mine:  tasks.filter(t => t.assigned_to === user?.email && t.status !== 'done').length,
    vencidas: tasks.filter(t => {
      const d = diasHasta(t.due_date)
      return t.status !== 'done' && d !== null && d < 0
    }).length,
  }

  async function handleAdd(form) {
    await add(form)
    setShowForm(false)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-6)',
      }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 4 }}>
            <CheckSquare size={24} color="var(--brand-primary)" />
            Tareas
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Compromisos, seguimientos y to-dos del equipo
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowForm(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nueva tarea</>}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {[
          { label: 'Pendientes',  value: counts.open,     color: 'var(--brand-primary)' },
          { label: 'Mis tareas',  value: counts.mine,     color: 'var(--status-info)' },
          { label: 'Vencidas',    value: counts.vencidas, color: 'var(--status-error)' },
          { label: 'Completadas', value: counts.done,     color: 'var(--status-success)' },
        ].map(s => (
          <div key={s.label} className="card-glass" style={{ padding: 'var(--space-3) var(--space-5)', textAlign: 'center', minWidth: 90 }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alert: tasks with expired due dates */}
      {counts.vencidas > 0 && filterStatus !== 'done' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          marginBottom: 'var(--space-4)', fontSize: '0.85rem', color: 'var(--status-error)',
        }}>
          <AlertCircle size={16} />
          <span><strong>{counts.vencidas} tarea{counts.vencidas !== 1 ? 's' : ''}</strong> con fecha límite vencida.</span>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <TaskForm people={people} onSave={handleAdd} onCancel={() => setShowForm(false)} />
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)', alignItems: 'center' }}>
        {/* Status */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--bg-elevated)', padding: 3, borderRadius: 'var(--radius-md)' }}>
          {[
            { value: 'open', label: `Abiertas (${counts.open})` },
            { value: 'done', label: `Completadas (${counts.done})` },
            { value: 'all',  label: 'Todas' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              style={{
                padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                background: filterStatus === value ? 'var(--bg-surface)' : 'transparent',
                color: filterStatus === value ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: filterStatus === value ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Owner */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--bg-elevated)', padding: 3, borderRadius: 'var(--radius-md)' }}>
          {[
            { value: 'all',  label: 'Todas' },
            { value: 'mine', label: 'Mis tareas' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterOwner(value)}
              style={{
                padding: '4px 12px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                background: filterOwner === value ? 'var(--bg-surface)' : 'transparent',
                color: filterOwner === value ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: filterOwner === value ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
          Cargando tareas...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-glass" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <CheckSquare size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)', display: 'block' }} />
          <p style={{ fontWeight: 600, marginBottom: 8 }}>
            {filterStatus === 'done' ? 'Sin tareas completadas aún.' : 'Sin tareas pendientes.'}
          </p>
          {filterStatus !== 'done' && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Crea una tarea o convierta una alarma del Datamart en to-do.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filtered.map(task => (
            <TaskCard key={task.id} task={task} onUpdate={update} onRemove={remove} />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 'var(--space-4)' }}>
          {filtered.length} tarea{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
