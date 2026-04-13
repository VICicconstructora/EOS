// src/components/layout/TopHeader.jsx
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import { Menu, Bell, User, Search } from 'lucide-react'

export default function TopHeader({ onMenuClick }) {
  const { t } = useTranslation()
  const { vto, displayName } = useApp()

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

        <button className="btn-icon btn-ghost">
          <Bell size={20} />
        </button>
        
        <div className="flex items-center gap-3" style={{ marginLeft: 'var(--space-2)' }}>
          <div style={{ textAlign: 'right', display: window.innerWidth < 768 ? 'none' : 'block' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{displayName}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>IC Constructora</div>
          </div>
          <div className="avatar avatar-md">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
