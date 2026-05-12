// src/components/auth/ProtectedRoute.jsx
import { useApp } from '../../context/AppContext'
import { isAdmin } from '../../lib/permissions'
import LoginPage from '../../pages/LoginPage'
import PendingApprovalPage from '../../pages/PendingApprovalPage'
import SuspendedPage from '../../pages/SuspendedPage'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, loading, isDemoMode } = useApp()

  if (loading) return null

  if (!user) return <LoginPage />

  // Demo Mode bypasses todo (DEMO_PROFILE ya tiene status='active' role='admin')
  if (!isDemoMode) {
    if (!profile)                       return <PendingApprovalPage />
    if (profile.status === 'pending')   return <PendingApprovalPage />
    if (profile.status === 'suspended') return <SuspendedPage />
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
