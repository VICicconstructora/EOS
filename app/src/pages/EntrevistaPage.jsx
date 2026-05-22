import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import OnboardingInterview from '../components/onboarding/OnboardingInterview'

export function skipOnboarding(userId) {
  localStorage.setItem('onboarding_skip_' + userId, '1')
}

export default function EntrevistaPage() {
  const navigate = useNavigate()
  const { user, profile, isDemoMode } = useApp()

  useEffect(() => {
    if (isDemoMode) navigate('/', { replace: true })
  }, [isDemoMode, navigate])

  if (isDemoMode) return null

  let displayName, jobTitle, area, userId

  {
    const meta  = user?.user_metadata || {}
    displayName = profile?.full_name || meta.full_name || meta.name || user?.email || ''
    jobTitle    = meta.job_title || meta.jobTitle || ''
    area        = profile?.area || ''
    userId      = user?.id || ''
  }

  function handleSkip() {
    skipOnboarding(userId)
    navigate('/')
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleSkip}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 999,
          background: 'none', border: '1px solid var(--border-medium)',
          borderRadius: 6, padding: '6px 16px', cursor: 'pointer',
          color: 'var(--text-muted)', fontSize: '0.82rem',
        }}
      >
        Saltar entrevista
      </button>
      <OnboardingInterview
        displayName={displayName}
        jobTitle={jobTitle}
        area={area}
        userId={userId}
        onComplete={() => navigate('/')}
      />
    </div>
  )
}
