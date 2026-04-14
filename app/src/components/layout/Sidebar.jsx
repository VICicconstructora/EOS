// src/components/layout/Sidebar.jsx
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import {
  LayoutDashboard, Eye, Users, BarChart3, AlertTriangle,
  Settings2, Rocket, CalendarDays, Settings, LogOut, Globe,
  Map, BookOpen, UserCheck, Building, Scale
} from 'lucide-react'

const EOS_MODULES = [
  { key: 'vision',   path: '/vision',   icon: Eye,           color: 'var(--eos-vision)' },
  { key: 'personas', path: '/personas', icon: Users,         color: 'var(--eos-people)' },
  { key: 'datos',    path: '/datos',    icon: BarChart3,     color: 'var(--eos-data)' },
  { key: 'asuntos',  path: '/asuntos',  icon: AlertTriangle, color: 'var(--eos-issues)' },
  { key: 'procesos', path: '/procesos', icon: Settings2,     color: 'var(--eos-process)' },
  { key: 'traccion', path: '/traccion', icon: Rocket,        color: 'var(--eos-traction)' },
]

export default function Sidebar({ isOpen, onClose }) {
  const { t, i18n } = useTranslation()
  const { logout, displayName, isDemoMode } = useApp()
  const location = useLocation()

  function toggleLang() {
    const next = i18n.language === 'es' ? 'en' : 'es'
    i18n.changeLanguage(next)
  }

  function handleNavClick() {
    if (window.innerWidth < 1024) onClose?.()
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🏗️</div>
        <div className="sidebar-logo-text">
          <span className="company">IC Constructora</span>
          <span className="system">Sistema EOS</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {/* General */}
        <div className="nav-section-label">{t('nav.general')}</div>

        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          <LayoutDashboard size={18} className="nav-item-icon" />
          {t('nav.dashboard')}
        </NavLink>

        <NavLink
          to="/reuniones"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          <CalendarDays size={18} className="nav-item-icon" />
          {t('nav.reuniones')}
        </NavLink>

        {/* EOS Modules */}
        <div className="nav-section-label" style={{ marginTop: 8 }}>{t('nav.modules')}</div>

        {EOS_MODULES.map(({ key, path, icon: Icon, color }) => {
          const isActive = location.pathname.startsWith(path)
          return (
            <NavLink
              key={key}
              to={path}
              data-module={key}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <Icon size={18} className="nav-item-icon" style={{ color: isActive ? color : undefined }} />
              {t(`nav.${key}`)}
              <span className="nav-item-dot" style={{ background: color }} />
            </NavLink>
          )
        })}

        {/* EOS Toolkit */}
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: 'var(--space-3) var(--space-4) var(--space-1)', marginTop: 'var(--space-2)' }}>
          EOS Toolkit
        </div>

        <NavLink
          to="/implementacion"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          <Map size={18} className="nav-item-icon" />
          Implementación
        </NavLink>

        <NavLink
          to="/biblioteca"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          <BookOpen size={18} className="nav-item-icon" />
          Biblioteca EOS
        </NavLink>

        {/* IC Constructora — Módulos propios */}
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: 'var(--space-3) var(--space-4) var(--space-1)', marginTop: 'var(--space-2)' }}>
          IC Constructora
        </div>

        <NavLink
          to="/rrhh"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          <UserCheck size={18} className="nav-item-icon" style={{ color: 'var(--eos-people)' }} />
          RRHH
        </NavLink>

        <NavLink
          to="/lotes"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          <Building size={18} className="nav-item-icon" style={{ color: 'var(--brand-primary)' }} />
          Lotes
        </NavLink>

        <NavLink
          to="/juridico"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          <Scale size={18} className="nav-item-icon" style={{ color: 'var(--eos-process)' }} />
          Jurídico
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {isDemoMode && (
          <div style={{
            background: 'rgba(232,160,32,0.1)',
            border: '1px solid rgba(232,160,32,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            marginBottom: 12,
            fontSize: '0.75rem',
            color: 'var(--brand-primary)',
          }}>
            🎯 Modo Demo activo
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button className="nav-item" onClick={toggleLang} style={{ borderRadius: 'var(--radius-md)' }}>
            <Globe size={16} className="nav-item-icon" />
            {i18n.language === 'es' ? 'English' : 'Español'}
          </button>
          <NavLink to="/configuracion" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
            <Settings size={16} className="nav-item-icon" />
            {t('nav.configuracion')}
          </NavLink>
          <button className="nav-item" onClick={logout} style={{ borderRadius: 'var(--radius-md)' }}>
            <LogOut size={16} className="nav-item-icon" />
            {t('common.logout')}
          </button>
        </div>

        <div style={{ marginTop: 12, padding: '8px 0', borderTop: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {displayName}
          </p>
        </div>
      </div>
    </aside>
  )
}
