// src/components/layout/Sidebar.jsx
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../context/AppContext'
import {
  LayoutDashboard, Eye, Users, BarChart3, AlertTriangle,
  Settings2, Rocket, CalendarDays, Settings, LogOut, Globe,
  Map, BookOpen, UserCheck, Building, Scale, TrendingUp, ScanLine, ExternalLink,
  Gauge, ChevronUp, ChevronDown, BellRing, CheckSquare, UserCog
} from 'lucide-react'
import { useAlarms } from '../../lib/useAlarms'
import { isAdmin } from '../../lib/permissions'

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
  const { logout, displayName, isDemoMode, profile } = useApp()
  const showAdmin = isDemoMode || isAdmin(profile)
  const location = useLocation()
  const [footerOpen, setFooterOpen] = useState(false)
  const { countCritical } = useAlarms()

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
          to="/alarmas"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          <BellRing size={18} className="nav-item-icon" style={{ color: 'var(--status-error)' }} />
          Alarmas
          {countCritical > 0 && (
            <span style={{
              marginLeft: 'auto',
              background: 'var(--status-error)',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 'var(--radius-full)',
              lineHeight: 1.6,
              flexShrink: 0,
            }}>
              {countCritical > 99 ? '99+' : countCritical}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/tareas"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          <CheckSquare size={18} className="nav-item-icon" style={{ color: 'var(--brand-primary)' }} />
          Tareas
        </NavLink>

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

        <NavLink
          to="/kpis"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={handleNavClick}
        >
          <Gauge size={18} className="nav-item-icon" style={{ color: '#10b981' }} />
          KPIs
        </NavLink>

        {/* Administración */}
        {showAdmin && (
          <>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: 'var(--space-3) var(--space-4) var(--space-1)', marginTop: 'var(--space-2)' }}>
              Administración
            </div>

            <NavLink
              to="/admin/usuarios"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <UserCog size={18} className="nav-item-icon" style={{ color: 'var(--brand-primary)' }} />
              Usuarios
            </NavLink>
          </>
        )}

        {/* Herramientas externas */}
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: 'var(--space-3) var(--space-4) var(--space-1)', marginTop: 'var(--space-2)' }}>
          Herramientas
        </div>

        <a
          href={import.meta.env.VITE_INDICADORES_URL || 'http://localhost:8501'}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-item"
          style={{ textDecoration: 'none' }}
        >
          <TrendingUp size={18} className="nav-item-icon" style={{ color: '#10b981' }} />
          Indicadores
          <ExternalLink size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />
        </a>

        <a
          href={import.meta.env.VITE_TOTAL_URL || 'http://localhost:5174'}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-item"
          style={{ textDecoration: 'none' }}
        >
          <ScanLine size={18} className="nav-item-icon" style={{ color: '#6366f1' }} />
          Análisis de Planos
          <ExternalLink size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />
        </a>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {isDemoMode && (
          <div style={{
            background: 'rgba(232,160,32,0.1)',
            border: '1px solid rgba(232,160,32,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            marginBottom: 8,
            fontSize: '0.75rem',
            color: 'var(--brand-primary)',
          }}>
            🎯 Modo Demo activo
          </div>
        )}

        {/* User row — always visible, click to expand/collapse actions */}
        <button
          onClick={() => setFooterOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '8px 4px',
            background: 'none', border: 'none', cursor: 'pointer',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div className="avatar avatar-sm" style={{ flexShrink: 0, fontSize: '0.75rem' }}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          {footerOpen ? <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <ChevronUp size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
        </button>

        {footerOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 4 }}>
            <button className="nav-item" onClick={toggleLang} style={{ borderRadius: 'var(--radius-md)' }}>
              <Globe size={16} className="nav-item-icon" />
              {i18n.language === 'es' ? 'English' : 'Español'}
            </button>
            <NavLink to="/configuracion" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={handleNavClick}>
              <Settings size={16} className="nav-item-icon" />
              {t('nav.configuracion')}
            </NavLink>
            <button className="nav-item" onClick={logout} style={{ borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
              <LogOut size={16} className="nav-item-icon" />
              {t('common.logout')}
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
