// src/components/admin/PendingUsersPanel.jsx
import { useState, useMemo } from 'react'
import { useAdminUsers } from '../../lib/useAdminUsers'
import UserApproveModal from './UserApproveModal'
import { CheckCircle2, Ban, RotateCcw, UserCog } from 'lucide-react'

const STATUS_FILTERS = [
  { value: 'pending',   label: 'Pendientes' },
  { value: 'active',    label: 'Activos' },
  { value: 'suspended', label: 'Suspendidos' },
  { value: 'all',       label: 'Todos' },
]

const ROLE_LABELS = {
  pending:       'Pendiente',
  viewer:        'Visualizador',
  area_manager:  'Gerente de Área',
  cross_leader:  'Líder Transversal',
  admin:         'Admin',
}

export default function PendingUsersPanel() {
  const { users, loading, error, approveUser, suspendUser, reactivateUser, changeUserRole } = useAdminUsers()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [search, setSearch]             = useState('')
  const [modalUser, setModalUser]       = useState(null)

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false
      const q = search.trim().toLowerCase()
      if (q && !u.email.toLowerCase().includes(q) && !(u.full_name || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [users, statusFilter, search])

  if (loading) return <p>Cargando usuarios…</p>
  if (error)   return <p style={{ color: 'var(--status-error)' }}>Error: {error.message}</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, flex: 1 }}>Usuarios</h1>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <select className="input" style={{ maxWidth: 220 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <input
          className="input"
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated, transparent)', textAlign: 'left' }}>
              <th style={{ padding: 'var(--space-3)' }}>Nombre</th>
              <th style={{ padding: 'var(--space-3)' }}>Email</th>
              <th style={{ padding: 'var(--space-3)' }}>Rol</th>
              <th style={{ padding: 'var(--space-3)' }}>Área</th>
              <th style={{ padding: 'var(--space-3)' }}>Estado</th>
              <th style={{ padding: 'var(--space-3)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>Sin usuarios.</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid var(--border-medium)' }}>
                <td style={{ padding: 'var(--space-3)' }}>{u.full_name || '—'}</td>
                <td style={{ padding: 'var(--space-3)', fontSize: '0.85rem' }}>{u.email}</td>
                <td style={{ padding: 'var(--space-3)' }}>{ROLE_LABELS[u.role]}</td>
                <td style={{ padding: 'var(--space-3)' }}>{u.area || '—'}</td>
                <td style={{ padding: 'var(--space-3)' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: '0.75rem',
                    background: u.status === 'pending'   ? 'rgba(245,158,11,0.15)'
                              : u.status === 'active'    ? 'rgba(16,185,129,0.15)'
                              :                            'rgba(239,68,68,0.15)',
                    color:      u.status === 'pending'   ? '#f59e0b'
                              : u.status === 'active'    ? '#10b981'
                              :                            'var(--status-error)',
                  }}>{u.status}</span>
                </td>
                <td style={{ padding: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {u.status === 'pending' && (
                      <button className="btn btn-sm btn-primary" onClick={() => setModalUser(u)}>
                        <CheckCircle2 size={14} /> Aprobar
                      </button>
                    )}
                    {u.status === 'active' && (
                      <>
                        <button className="btn btn-sm btn-ghost" onClick={() => setModalUser(u)} title="Editar rol/área">
                          <UserCog size={14} />
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => suspendUser(u.id)} title="Suspender">
                          <Ban size={14} />
                        </button>
                      </>
                    )}
                    {u.status === 'suspended' && (
                      <button className="btn btn-sm btn-ghost" onClick={() => reactivateUser(u.id)} title="Reactivar">
                        <RotateCcw size={14} /> Reactivar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalUser && (
        <UserApproveModal
          user={modalUser}
          candidates={users}
          onClose={() => setModalUser(null)}
          onSubmit={async (payload) => {
            // Si el usuario ya estaba activo, solo cambia el rol; si era pending o suspended, full approve.
            if (modalUser.status === 'active') {
              return await changeUserRole(modalUser.id, payload.role)
            }
            return await approveUser(payload)
          }}
        />
      )}
    </div>
  )
}
