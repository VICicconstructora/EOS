// src/pages/ModulePlaceholders.jsx
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Users, BarChart3, AlertTriangle, Settings2, Rocket, Calendar, Settings } from 'lucide-react'

function Placeholder({ titleKey, icon: Icon }) {
  const { t } = useTranslation()
  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="breadcrumb">
          <span>IC Constructora</span>
          <span className="breadcrumb-sep">/</span>
          <span>{t(`nav.${titleKey}`)}</span>
        </div>
        <h1 className="page-title">
          <div className="page-title-icon" style={{ background: `var(--eos-${titleKey})` }}>
            <Icon size={24} color="white" />
          </div>
          {t(`nav.${titleKey}`)}
        </h1>
      </div>
      
      <div className="card empty-state" style={{ padding: 'var(--space-16)' }}>
        <div className="empty-state-icon">🏗️</div>
        <h3>{t('common.comingSoon')}</h3>
        <p>El módulo de <strong>{t(`nav.${titleKey}`)}</strong> está siendo desarrollado para IC Constructora.</p>
        <div className="divider" style={{ width: 100 }}></div>
        <Link to="/" className="btn btn-secondary">{t('common.backToDashboard')}</Link>
      </div>
    </div>
  )
}

export const PersonasPage      = () => <Placeholder titleKey="personas" icon={Users} />
export const DatosPage         = () => <Placeholder titleKey="datos" icon={BarChart3} />
export const AsuntosPage       = () => <Placeholder titleKey="asuntos" icon={AlertTriangle} />
export const ProcesosPage      = () => <Placeholder titleKey="procesos" icon={Settings2} />
export const TraccionPage      = () => <Placeholder titleKey="traccion" icon={Rocket} />
export const ReunionesPage     = () => <Placeholder titleKey="reuniones" icon={Calendar} />
export const ConfiguracionPage = () => <Placeholder titleKey="configuracion" icon={Settings} />
