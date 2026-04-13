// src/pages/Placeholders.jsx
import { useTranslation } from 'react-i18next'
import { Rocket, Construction } from 'lucide-react'
import { Link } from 'react-router-dom'

function PagePlaceholder({ titleKey, icon: Icon }) {
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
        <p>Estamos construyendo el módulo de <strong>{t(`nav.${titleKey}`)}</strong> para IC Constructora. Estará listo en breve.</p>
        <div className="divider" style={{ width: 100 }}></div>
        <Link to="/" className="btn btn-secondary">{t('common.backToDashboard')}</Link>
      </div>
    </div>
  )
}

export const VisionPage        = () => <PagePlaceholder titleKey="vision" icon={Rocket} /> // temporary icon
export const PersonasPage      = () => <PagePlaceholder titleKey="personas" icon={Rocket} />
export const DatosPage         = () => <PagePlaceholder titleKey="datos" icon={Rocket} />
export const AsuntosPage       = () => <PagePlaceholder titleKey="asuntos" icon={Rocket} />
export const ProcesosPage      = () => <PagePlaceholder titleKey="procesos" icon={Rocket} />
export const TraccionPage      = () => <PagePlaceholder titleKey="traccion" icon={Rocket} />
export const ReunionesPage     = () => <PagePlaceholder titleKey="reuniones" icon={Calendar} /> // need Calendar icon import
export const ConfiguracionPage = () => <PagePlaceholder titleKey="configuracion" icon={Settings} />
