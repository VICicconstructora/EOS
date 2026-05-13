// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useApp } from '../context/AppContext'

// SVG inline del logo Microsoft (4 cuadritos rojo/verde/azul/amarillo)
function MicrosoftLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
      <rect x="1"  y="1"  width="10" height="10" fill="#F25022" />
      <rect x="12" y="1"  width="10" height="10" fill="#7FBA00" />
      <rect x="1"  y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  )
}

export default function LoginPage() {
  const { signInWithMicrosoft, isDemoMode, enterDemoMode } = useApp()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
    const { error: err } = await signInWithMicrosoft()
    if (err) {
      setError(err.message || 'No fue posible iniciar sesión.')
      setLoading(false)
    }
    // En éxito el navegador redirige a Entra y vuelve; no apagamos loading.
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 'var(--space-4)',
    }}>
      <div className="card-glass" style={{ width: '100%', maxWidth: 420, padding: 'var(--space-10)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div className="sidebar-logo-icon" style={{ margin: '0 auto var(--space-4)', width: 64, height: 64, fontSize: '2rem' }}>
            🏗️
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Tracción</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Sistema EOS de IC Constructora
          </p>
        </div>

        {isDemoMode && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid var(--status-warning, #f59e0b)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-6)',
            color: 'var(--status-warning, #f59e0b)',
            fontSize: '0.85rem',
          }}>
            Modo demo activo — datos no persistentes.
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--status-error)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-6)',
            color: 'var(--status-error)',
            fontSize: '0.85rem',
          }}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="btn"
          style={{
            width: '100%',
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: '#fff',
            color: '#5e5e5e',
            border: '1px solid #8c8c8c',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          <MicrosoftLogo size={20} />
          {loading ? 'Conectando con Microsoft...' : 'Iniciar sesión con Microsoft'}
        </button>

        <p style={{ marginTop: 'var(--space-6)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Solo cuentas <strong>@icconstructora.com</strong>
        </p>

        <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid var(--border-soft)', paddingTop: 'var(--space-6)', textAlign: 'center' }}>
          <button
            type="button"
            onClick={enterDemoMode}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'underline',
            }}
          >
            Entrar en modo demo (sin cuenta)
          </button>
        </div>
      </div>
    </div>
  )
}
