// src/components/admin/UserApproveModal.jsx
import { useState } from 'react'

const ROLES = [
  { value: 'viewer',        label: 'Visualizador' },
  { value: 'area_manager',  label: 'Gerente de Área' },
  { value: 'cross_leader',  label: 'Líder Transversal' },
  { value: 'admin',         label: 'Admin' },
]

const AREAS = [
  'Dirección', 'Experiencia', 'Construcción', 'Financiero',
  'Talento Humano', 'Control', 'Jurídico', 'TI', 'Desarrollo', 'Otra',
]

export default function UserApproveModal({ user, candidates, onClose, onSubmit }) {
  const [role, setRole]           = useState(user?.role !== 'pending' ? user.role : 'viewer')
  const [area, setArea]           = useState(user?.area || 'Operaciones')
  const [managerId, setManagerId] = useState(user?.manager_id || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const { error: err } = await onSubmit({
      targetId: user.id,
      role,
      area,
      managerId: managerId || null,
    })
    setSubmitting(false)
    if (err) setError(err.message || 'Error al aprobar')
    else onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, padding: 'var(--space-6)' }}>
        <h2 style={{ marginBottom: 'var(--space-2)' }}>Aprobar usuario</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-6)' }}>
          {user.email}
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-error)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)',
            color: 'var(--status-error)', fontSize: '0.85rem',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Rol</label>
            <select className="input" value={role} onChange={e => setRole(e.target.value)} required>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Área</label>
            <select className="input" value={area} onChange={e => setArea(e.target.value)} required>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Manager directo</label>
            <select className="input" value={managerId} onChange={e => setManagerId(e.target.value)}>
              <option value="">— sin manager —</option>
              {candidates
                .filter(c => c.id !== user.id && c.status === 'active')
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.email} {c.area ? `(${c.area})` : ''}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Aprobando...' : 'Aprobar y activar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
