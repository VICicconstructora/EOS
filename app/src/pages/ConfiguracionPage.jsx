// src/pages/ConfiguracionPage.jsx — Settings completo
import { useState } from 'react'
import { Settings, Building2, User, Globe, Bell, LogOut, Save, Eye, EyeOff } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useTranslation } from 'react-i18next'

export default function ConfiguracionPage() {
  const { user, logout, isDemoMode, displayName, lang, setLang } = useApp()
  const { i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState('empresa')

  // Company form
  const [company, setCompany] = useState({
    name: 'IC Constructora',
    industry: 'Construcción Industrial',
    city: 'Monterrey, NL',
    website: 'www.icconstructora.com',
    employees: '50-100',
    founded: '2010',
  })

  // Profile form
  const [profile, setProfile] = useState({
    full_name: displayName,
    email: user?.email || '',
    role: user?.user_metadata?.role || 'admin',
    phone: '',
  })
  const [showEmail, setShowEmail] = useState(false)

  // Notifications
  const [notifs, setNotifs] = useState({
    rocks_at_risk: true,
    meeting_reminder: true,
    issue_assigned: true,
    weekly_summary: false,
  })

  function changeLang(l) {
    setLang(l)
    i18n.changeLanguage(l)
  }

  function Toggle({ checked, onChange }) {
    return (
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: 'pointer', flexShrink: 0,
          background: checked ? 'var(--brand-primary)' : 'var(--border-medium)',
          position: 'relative', transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3,
          left: checked ? 23 : 3,
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">
          <div className="page-title-icon" style={{ background: 'rgba(100,116,139,0.1)' }}>
            <Settings size={24} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <h1>Configuración</h1>
            <p style={{ marginTop: 4 }}>Empresa, perfil, idioma y preferencias del sistema</p>
          </div>
        </div>
      </div>

      {isDemoMode && (
        <div style={{ background: 'rgba(232,160,32,0.08)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
            Modo Demo activo — Los cambios aquí no se guardan permanentemente. Conecta Supabase para persistencia completa.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-subtle)' }}>
        {[
          ['empresa', Building2, 'Empresa'],
          ['perfil',  User,      'Mi Perfil'],
          ['idioma',  Globe,     'Idioma'],
          ['sistema', Bell,      'Sistema'],
        ].map(([k, Icon, l]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{
            padding: 'var(--space-3) var(--space-5)', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600,
            color: activeTab === k ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: `2px solid ${activeTab === k ? 'var(--brand-primary)' : 'transparent'}`,
            marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon size={15} /> {l}
          </button>
        ))}
      </div>

      {activeTab === 'empresa' && (
        <div className="card" style={{ maxWidth: 640 }}>
          <p className="card-title" style={{ marginBottom: 'var(--space-5)' }}>Información de la empresa</p>
          <div className="form-grid">
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Nombre de la empresa</label>
              <input className="form-input" value={company.name} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Industria</label>
              <input className="form-input" value={company.industry} onChange={e => setCompany(c => ({ ...c, industry: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Ciudad</label>
              <input className="form-input" value={company.city} onChange={e => setCompany(c => ({ ...c, city: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Sitio web</label>
              <input className="form-input" value={company.website} onChange={e => setCompany(c => ({ ...c, website: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Empleados</label>
              <select className="form-input" value={company.employees} onChange={e => setCompany(c => ({ ...c, employees: e.target.value }))}>
                {['1-10','11-25','26-50','50-100','100-250','250+'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Año de fundación</label>
              <input className="form-input" value={company.founded} onChange={e => setCompany(c => ({ ...c, founded: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <button className="btn btn-primary"><Save size={14} /> Guardar cambios</button>
          </div>
        </div>
      )}

      {activeTab === 'perfil' && (
        <div className="card" style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
            <div className="avatar" style={{ width: 64, height: 64, fontSize: '1.4rem', background: 'var(--brand-primary)', color: '#000', fontWeight: 700 }}>
              {displayName[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{displayName}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{profile.role === 'admin' ? 'Administrador' : 'Usuario'}</p>
              {isDemoMode && <span className="badge badge-warning" style={{ marginTop: 4 }}>Modo Demo</span>}
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label className="form-label">Nombre completo</label>
              <input className="form-input" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Teléfono</label>
              <input className="form-input" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+52 81 ..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Email</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showEmail ? 'text' : 'password'} value={profile.email} readOnly style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowEmail(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showEmail ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)' }}>
            <button className="btn btn-primary"><Save size={14} /> Guardar cambios</button>
            <button className="btn btn-ghost" style={{ color: 'var(--status-error)' }} onClick={logout}>
              <LogOut size={14} /> Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {activeTab === 'idioma' && (
        <div className="card" style={{ maxWidth: 480 }}>
          <p className="card-title" style={{ marginBottom: 'var(--space-5)' }}>Idioma de la interfaz</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[['es','Español','🇲🇽'],['en','English','🇺🇸']].map(([code, label, flag]) => (
              <div key={code}
                onClick={() => changeLang(code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                  padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                  border: `2px solid ${lang === code ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                  background: lang === code ? 'rgba(232,160,32,0.06)' : 'var(--bg-elevated)',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: '1.8rem' }}>{flag}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{code === 'es' ? 'Interfaz completa en español' : 'Full English interface'}</p>
                </div>
                {lang === code && (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#000', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sistema' && (
        <div style={{ maxWidth: 540 }}>
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <p className="card-title" style={{ marginBottom: 'var(--space-5)' }}>Notificaciones</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {[
                ['rocks_at_risk',     'Rocas en riesgo',          'Alerta cuando una roca pasa a "En Riesgo"'],
                ['meeting_reminder',  'Recordatorio de reunión',  'Aviso 30 min antes de cada reunión L10'],
                ['issue_assigned',    'Asunto asignado',          'Notificación cuando te asignan un asunto'],
                ['weekly_summary',    'Resumen semanal',          'Email con el resumen de la semana'],
              ].map(([key, label, desc]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                  <Toggle checked={notifs[key]} onChange={v => setNotifs(n => ({ ...n, [key]: v }))} />
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Sistema</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[
                ['Versión de la app', '1.0.0'],
                ['Estado de Supabase', isDemoMode ? 'Modo demo (sin conexión)' : 'Conectado ✓'],
                ['Empresa ID', 'ic-constructora'],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
