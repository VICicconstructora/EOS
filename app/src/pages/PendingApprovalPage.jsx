// src/pages/PendingApprovalPage.jsx
import { useApp } from '../context/AppContext'
import { Clock, LogOut } from 'lucide-react'

export default function PendingApprovalPage() {
  const { profile, logout } = useApp()

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 'var(--space-4)',
    }}>
      <div className="card-glass" style={{ width: '100%', maxWidth: 480, padding: 'var(--space-10)', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto var(--space-6)',
          color: '#f59e0b',
        }}>
          <Clock size={32} />
        </div>

        <h1 style={{ fontSize: '1.4rem', marginBottom: 'var(--space-3)' }}>
          Hola{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>

        <p style={{ color: 'var(--text-secondary, var(--text-primary))', marginBottom: 'var(--space-3)' }}>
          Tu acceso a Tracción está en revisión.
        </p>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-8)', lineHeight: 1.5 }}>
          Hemos creado tu perfil con la información de tu cuenta corporativa.
          Un administrador debe asignarte un rol y un área antes de que puedas usar la aplicación.
          Esto suele tomar menos de 24 horas.
        </p>

        <button
          type="button"
          onClick={logout}
          className="btn btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
