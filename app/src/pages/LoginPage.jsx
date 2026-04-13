// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '../context/AppContext'
import { Mail, Lock, Building2 } from 'lucide-react'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login, isDemoMode } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    if (isDemoMode) {
      if (email === 'admin@icconstructora.com' && password === 'admin') {
        window.location.reload()
      } else {
        setError(t('auth.loginError'))
      }
      setLoading(false)
      return
    }

    const { error: loginError } = await login(email, password)
    if (loginError) setError(t('auth.loginError'))
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 'var(--space-4)',
    }}>
      <div className="card-glass" style={{ width: '100%', maxWidth: 400, padding: 'var(--space-10)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div className="sidebar-logo-icon" style={{ margin: '0 auto var(--space-4)', width: 64, height: 64, fontSize: '2rem' }}>🏗️</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>IC Constructora</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('auth.loginDesc')}</p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-error)', 
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-6)',
            color: 'var(--status-error)', fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">{t('auth.email')}</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              <input 
                type="email" required className="input" placeholder="email@example.com" value={email}
                onChange={e => setEmail(e.target.value)} style={{ paddingLeft: 42 }}
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 'var(--space-2)' }}>
            <label className="input-label">{t('auth.password')}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              <input 
                type="password" required className="input" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} style={{ paddingLeft: 42 }}
              />
            </div>
          </div>

          <div style={{ textAlign: 'right', marginBottom: 'var(--space-8)' }}>
            <button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0 }}>{t('auth.forgotPassword')}</button>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 48 }} disabled={loading}>
            {loading ? t('common.loading') : t('auth.login')}
          </button>
        </form>

        {isDemoMode && (
          <div style={{ marginTop: 'var(--space-8)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <strong>Demo Credentials:</strong><br />
              admin@icconstructora.com / admin
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
