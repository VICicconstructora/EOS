import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'

export default function WelcomeModal() {
  const { displayName, isDemoMode } = useApp()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('welcome-modal-seen')
    if (!hasSeenWelcome) {
      setIsOpen(true)
      localStorage.setItem('welcome-modal-seen', 'true')
    }
  }, [])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          background: 'var(--bg-base)',
          borderRadius: 12,
          padding: 40,
          maxWidth: 420,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: 16,
            color: 'var(--text-primary)',
          }}
        >
          ¡Bienvenido, {displayName}!
        </h2>

        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            marginBottom: 12,
            lineHeight: 1.6,
          }}
        >
          {isDemoMode
            ? 'Estás explorando en modo demo. Todos los datos son locales.'
            : 'Estás en la plataforma EOS Tracción de IC Constructora.'}
        </p>

        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          Aquí puedes gestionar tu VTO, Rocks, Scorecards, Issues y mucho más.
        </p>

        <button
          onClick={() => setIsOpen(false)}
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            background: 'var(--brand-primary, #6366f1)',
            color: '#fff',
            border: 'none',
            fontSize: '0.95rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => (e.target.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.target.style.opacity = '1')}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
