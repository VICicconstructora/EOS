// src/components/auth/ProtectedRoute.jsx
import { useEffect, useState } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { isAdmin } from '../../lib/permissions'
import { useDocuments } from '../../lib/useDocuments'
import LoginPage from '../../pages/LoginPage'
import PendingApprovalPage from '../../pages/PendingApprovalPage'
import SuspendedPage from '../../pages/SuspendedPage'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, loading, isDemoMode } = useApp()
  const { loadDocuments } = useDocuments()
  const location = useLocation()

  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [onboardingDone, setOnboardingDone]       = useState(false)

  useEffect(() => {
    if (loading) return
    if (!user || isDemoMode) {
      setOnboardingDone(true)
      setOnboardingChecked(true)
      return
    }

    loadDocuments({ userId: user.id })
      .then(docs => {
        const slug = 'user_profile/' + user.id
        setOnboardingDone(docs.some(d => d.slug === slug))
        setOnboardingChecked(true)
      })
      .catch(() => {
        setOnboardingDone(true)
        setOnboardingChecked(true)
      })
  }, [loading, user, isDemoMode, loadDocuments])

  if (loading) return null

  if (!user) return <LoginPage />

  // Demo Mode bypasses todo (DEMO_PROFILE ya tiene status='active' role='admin')
  if (!isDemoMode) {
    if (!profile)                       return <PendingApprovalPage />
    if (profile.status === 'pending')   return <PendingApprovalPage />
    if (profile.status === 'suspended') return <SuspendedPage />
  }

  if (!onboardingChecked) return null

  const isOnboardingRoute = location.pathname === '/configuracion-inicial'

  if (!onboardingDone && !isOnboardingRoute) {
    return <Navigate to="/configuracion-inicial" replace />
  }

  if (requireAdmin && !isAdmin(profile) && !isDemoMode) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <h2>Acceso denegado</h2>
        <p>Esta sección requiere rol de administrador.</p>
      </div>
    )
  }

  return children
}
