// src/components/layout/TopHeader.jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useAlarms } from '../../lib/useAlarms'
import { Menu, Bell, Search, LogOut, AlertTriangle } from 'lucide-react'

const PROJECT_SHORT = {
  'praia-natura':        'Praia Natura',
  'reserva-de-oporto':   'Reserva de Oporto',
  'primera-este':        'Primera Este',
  'la-hacienda-jamundi': 'La Hacienda',
  'bosque-central':      'Bosque Central',
  'castilla-living':     'Castilla Living',
  'gaia':                'Gaia',
  'castilla-imperial':   'Castilla Imperial',
  'azul-turquesa':       'Azul Turquesa',
  'azul-celeste':        'Azul Celeste',
  'verde-vivo':          'Verde Vivo',
  'mitika':              'Mitika',
  'well':                'Well',
}

const CAT_SHORT = {
  credito: 'Crédito', poliza_tr: 'Póliza TR',
  poliza_rc: 'Póliza RC', licencia: 'Licencia',
}

export default function TopHeader({ onMenuClick }) {
  const { t } = useTranslation()
  const { vto, displayName, isDemoMode, logout } = useApp()
  const { alarms, countCritical, countAll } = useAlarms()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen]  = useState(false)
  const [bellOpen, setBellOpen]  = useState(false)

  const topAlarms = alarms
    .filter(a => a.status === 'active')
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'alta' ? -1 : 1
      return (a.dias ?? 0) - (b.dias ?? 0)
    })
    .slice(0, 5)

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <button
          className="btn-icon btn-ghost"
          onClick={onMenuClick}
          style={{ display: window.innerWidth < 1024 ? 'flex' : 'none' }}
        >
          <Menu size={20} />
        </button>

        <div className="mission-banner">
          <strong>{t('vision.mission')}:</strong>
          <span>{vto?.core_focus || 'Definiendo propósito...'}</span>
        </div>
      </div>

      <div className="header-actions">
        <div className="input-group" style={{ marginBottom: 0, display: window.innerWidth < 640 ? 'none' : 'block' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            <input
              type="text"
              className="input"
              placeholder="Buscar..."
              style={{ paddingLeft: 36, height: 36, width: 200 }}
            />
          </div>
        </div>

        {/* Bell con badge de alarmas críticas */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon btn-ghost"
            onClick={() => { setBellOpen(o => !o); setMenuOpen(false) }}
            style={{ position: 'relative' }}
          >
            <Bell size={20} />
            {countCritical > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                background: 'var(--status-error)', color: '#fff',
                fontSize: '0.6rem', fontWeight: 800,
                minWidth: 16, height: 16,
                borderRadius: 'var(--radius-full)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1, padding: '0 3px',
                border: '2px solid var(--bg-surface)',
              }}>
                {countCritical > 9 ? '9+' : countCritical}
              </span>
            )}
          </button>

          {bellOpen && (
            <>
              <div onClick={() => setBellOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 101,
                background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                width: 320, overflow: 'hidden',
              }}>
                {/* Header del dropdown */}
                <div style={{
                  padding: 'var(--space-3) var(--space-4)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} color="var(--status-error)" />
                    Alarmas activas
                  </span>
                  {countAll > 0 && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {countCritical} 🔴 · {countAll - countCritical} 🟡
                    </span>
                  )}
                </div>

                {/* Lista de alarmas */}
                {topAlarms.length === 0 ? (
                  <div style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    Sin alarmas activas
                  </div>
                ) : (
                  <div>
                    {topAlarms.map(a => (
                      <div
                        key={a.id}
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          borderBottom: '1px solid var(--border-subtle)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {PROJECT_SHORT[a.project] || a.project}
                          </p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {CAT_SHORT[a.category] || a.category} · E{a.etapa}
                          </p>
                        </div>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                          color: a.severity === 'alta' ? 'var(--status-error)' : '#d97706',
                        }}>
                          {a.dias < 0 ? `${Math.abs(a.dias)}d` : `${a.dias}d`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div style={{ padding: 'var(--space-2) var(--space-4)' }}>
                  <button
                    onClick={() => { setBellOpen(false); navigate('/alarmas') }}
                    style={{
                      width: '100%', padding: 'var(--space-2)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 600, color: 'var(--brand-primary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    Ver todas las alarmas →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ position: 'relative', marginLeft: 'var(--space-2)' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <div style={{ textAlign: 'right', display: window.innerWidth < 768 ? 'none' : 'block' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{displayName}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {isDemoMode ? 'Modo demo' : 'IC Constructora'}
              </div>
            </div>
            <div className="avatar avatar-md">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </button>

          {menuOpen && (
            <>
              <div
                onClick={() => setMenuOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 100 }}
              />
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 101,
                background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                minWidth: 180, padding: 'var(--space-2)',
              }}>
                <button
                  onClick={() => { setMenuOpen(false); logout() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    width: '100%', padding: 'var(--space-2) var(--space-3)',
                    background: 'none', border: 'none', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={15} />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
