// src/App.jsx — App shell: auth guard, layout, routes
import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import ProtectedRoute from './components/auth/ProtectedRoute'

import Sidebar from './components/layout/Sidebar'
import TopHeader from './components/layout/TopHeader'
import WelcomeModal from './components/layout/WelcomeModal'

const DashboardPage      = lazy(() => import('./pages/DashboardPage'))
const ExecutiveDashboardPage = lazy(() => import('./pages/ExecutiveDashboard'))
const VisionPage         = lazy(() => import('./pages/VisionPage'))
const PersonasPage       = lazy(() => import('./pages/PersonasPage'))
const DatosPage          = lazy(() => import('./pages/DatosPage'))
const KpisPage           = lazy(() => import('./pages/KpisPage'))
const AsuntosPage        = lazy(() => import('./pages/AsuntosPage'))
const ProcesosPage       = lazy(() => import('./pages/ProcesosPage'))
const TraccionPage       = lazy(() => import('./pages/TraccionPage'))
const ReunionesPage      = lazy(() => import('./pages/ReunionesPage'))
const ConfiguracionPage  = lazy(() => import('./pages/ConfiguracionPage'))
const ImplementacionPage = lazy(() => import('./pages/ImplementacionPage'))
const BibliotecaPage     = lazy(() => import('./pages/BibliotecaPage'))
const RRHHPage           = lazy(() => import('./pages/RRHHPage'))
const LotesPage          = lazy(() => import('./pages/LotesPage'))
const JuridicoPage       = lazy(() => import('./pages/JuridicoPage'))
const AdminUsuariosPage  = lazy(() => import('./pages/AdminUsuariosPage'))
const EntrevistaPage     = lazy(() => import('./pages/EntrevistaPage'))

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid var(--border-medium)',
        borderTopColor: 'var(--brand-primary)',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      <WelcomeModal />

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 90,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <TopHeader onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className="page-content fade-in">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/"               element={<DashboardPage />} />
              <Route path="/executive"      element={<ExecutiveDashboardPage />} />
              <Route path="/vision"         element={<VisionPage />} />
              <Route path="/personas"       element={<PersonasPage />} />
              <Route path="/datos"          element={<DatosPage />} />
              <Route path="/kpis"          element={<KpisPage />} />
              <Route path="/asuntos"        element={<AsuntosPage />} />
              <Route path="/procesos"       element={<ProcesosPage />} />
              <Route path="/traccion"       element={<TraccionPage />} />
              <Route path="/reuniones"      element={<ReunionesPage />} />
              <Route path="/configuracion"  element={<ConfiguracionPage />} />
              <Route path="/implementacion" element={<ImplementacionPage />} />
              <Route path="/biblioteca"     element={<BibliotecaPage />} />
              <Route path="/rrhh"           element={<RRHHPage />} />
              <Route path="/lotes"          element={<LotesPage />} />
              <Route path="/juridico"       element={<JuridicoPage />} />
              <Route
                path="/admin/usuarios"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminUsuariosPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function LoadingScreen() {
  const { authError, enterDemoMode } = useApp()
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg-base)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360, padding: '0 24px' }}>
        {!authError && (
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid var(--border-medium)',
            borderTopColor: 'var(--brand-primary)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
        )}

        {authError ? (
          <>
            <p style={{ color: 'var(--text-danger, #e53e3e)', fontSize: '0.95rem', marginBottom: 8 }}>
              Error al autenticar
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20, wordBreak: 'break-word' }}>
              {authError}
            </p>
          </>
        ) : slow ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            Esto está tardando más de lo esperado.<br />
            Puede haber un problema de conexión con el servidor.
          </p>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando...</p>
        )}

        {(authError || slow) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 20px', borderRadius: 6, cursor: 'pointer',
                background: 'var(--brand-primary, #6366f1)', color: '#fff',
                border: 'none', fontSize: '0.9rem',
              }}
            >
              Reintentar
            </button>
            <button
              onClick={enterDemoMode}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'underline',
              }}
            >
              Entrar en modo demo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const { loading } = useApp()

  if (loading) return <LoadingScreen />

  return (
    <ProtectedRoute>
      <Routes>
        <Route
          path="/configuracion-inicial"
          element={
            <Suspense fallback={<PageFallback />}>
              <EntrevistaPage />
            </Suspense>
          }
        />
        <Route path="*" element={<AppLayout />} />
      </Routes>
    </ProtectedRoute>
  )
}
