import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import OnboardingInterview from '../components/onboarding/OnboardingInterview'

export default function EntrevistaPage() {
  const navigate = useNavigate()
  const { user, profile, isDemoMode } = useApp()

  let displayName, jobTitle, area, userId

  if (isDemoMode) {
    displayName = 'Demo Usuario'
    jobTitle    = 'Gerente Demo'
    area        = 'Dirección'
    userId      = 'demo-user'
  } else {
    const meta  = user?.user_metadata || {}
    displayName = profile?.full_name || meta.full_name || meta.name || user?.email || ''
    jobTitle    = meta.job_title || meta.jobTitle || ''
    area        = profile?.area || ''
    userId      = user?.id || ''
  }

  return (
    <OnboardingInterview
      displayName={displayName}
      jobTitle={jobTitle}
      area={area}
      userId={userId}
      onComplete={() => navigate('/')}
    />
  )
}
