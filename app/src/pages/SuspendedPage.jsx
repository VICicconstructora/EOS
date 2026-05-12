// src/pages/SuspendedPage.jsx
import { useApp } from '../context/AppContext'
import { Ban, LogOut } from 'lucide-react'

export default function SuspendedPage() {
  const { logout } = useApp()

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 'var(--space-4)',
    }}>
      <div className="card-glass" style={{ width: '100%', maxWidth: 480, padding: 'var(--space-10)', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto var(--space-6)',
          color: 'var(--status-error)',
        }}>
          <Ban size={32} />
        </div>

        <h1 style={{ fontSize: '1.4rem', marginBottom: 'var(--space-3)' }}>Acceso suspendido</h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-8)', lineHeight: 1.5 }}>
          Tu acceso a Tracción ha sido suspendido por un administrador.
          Si crees que es un error, contacta al equipo de TI.
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
