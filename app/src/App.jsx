// src/App.jsx — App shell: auth guard, layout, routes
import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import { useAlarms } from './lib/useAlarms'

import Sidebar from './components/layout/Sidebar'
import TopHeader from './components/layout/TopHeader'
import LoginPage from './pages/LoginPage'
import OnboardingInterview from './components/onboarding/OnboardingInterview'

// Lazy-load page modules to reduce initial bundle
const DashboardPage     = lazy(() => import('./pages/DashboardPage'))
const VisionPage        = lazy(() => import('./pages/VisionPage'))
const PersonasPage      = lazy(() => import('./pages/PersonasPage'))
const DatosPage         = lazy(() => import('./pages/DatosPage'))
const AsuntosPage       = lazy(() => import('./pages/AsuntosPage'))
const ProcesosPage      = lazy(() => import('./pages/ProcesosPage'))
const TraccionPage      = lazy(() => import('./pages/TraccionPage'))
const ReunionesPage     = lazy(() => import('./pages/ReunionesPage'))
const ConfiguracionPage = lazy(() => import('./pages/ConfiguracionPage'))
const ImplementacionPage = lazy(() => import('./pages/ImplementacionPage'))
const BibliotecaPage     = lazy(() => import('./pages/BibliotecaPage'))
const RRHHPage           = lazy(() => import('./pages/RRHHPage'))
const LotesPage          = lazy(() => import('./pages/LotesPage'))
const JuridicoPage       = lazy(() => import('./pages/JuridicoPage'))
const KpisPage           = lazy(() => import('./pages/KpisPage'))
const AlarmasPage        = lazy(() => import('./pages/AlarmasPage'))
const TareasPage         = lazy(() => import('./pages/TareasPage'))

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

function AlarmLoginModal({ onClose }) {
  const navigate = useNavigate()
  const { alarms, countCritical } = useAlarms()

  if (countCritical === 0) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      padding: 'var(--space-4)',
    }}>
      <div className="card-glass" style={{
        width: '100%', maxWidth: 460,
        padding: 'var(--space-8)',
        textAlign: 'center',
        animation: 'fade-in 0.2s ease',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🔴</div>
        <h2 style={{ marginBottom: 'var(--space-3)' }}>
          {countCritical} alarma{countCritical !== 1 ? 's' : ''} crítica{countCritical !== 1 ? 's' : ''}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)', fontSize: '0.9rem' }}>
          Hay vencimientos sin resolver en créditos, pólizas o licencias de construcción.
        </p>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)', fontSize: '0.85rem' }}>
          Revisa las alarmas para coordinar las renovaciones con las áreas correspondientes.
        </p>

        {/* Top 3 preview */}
        <div style={{ textAlign: 'left', marginBottom: 'var(--space-6)' }}>
          {alarms
            .filter(a => a.status === 'active' && a.severity === 'alta')
            .slice(0, 3)
            .map(a => (
              <div key={a.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)',
                background: 'rgba(239,68,68,0.05)', marginBottom: 4,
                fontSize: '0.8rem',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {a.project.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </strong>
                  {' '}· {a.category === 'credito' ? 'Crédito' : a.category === 'licencia' ? 'Licencia' : 'Póliza'} E{a.etapa}
                </span>
                <span style={{ color: 'var(--status-error)', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                  {Math.abs(a.dias)}d vencida
                </span>
              </div>
            ))}
          {countCritical > 3 && (
            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              y {countCritical - 3} más...
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => { onClose(); navigate('/alarmas') }}
          >
            Ver alarmas
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAlarmModal, setShowAlarmModal] = useState(false)
  const { alarms, countCritical } = useAlarms()

  // Muestra el modal una sola vez por sesión si hay alarmas críticas activas
  useEffect(() => {
    if (countCritical > 0 && !sessionStorage.getItem('alarm-modal-shown')) {
      setShowAlarmModal(true)
      sessionStorage.setItem('alarm-modal-shown', '1')
    }
  }, [countCritical])

  function closeModal() {
    setShowAlarmModal(false)
  }

  return (
    <div className="app-shell">
      {/* Modal de alarmas críticas en login */}
      {showAlarmModal && <AlarmLoginModal onClose={closeModal} />}

      {/* Overlay for mobile */}
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
            <Route path="/"              element={<DashboardPage />} />
            <Route path="/vision"        element={<VisionPage />} />
            <Route path="/personas"      element={<PersonasPage />} />
            <Route path="/datos"         element={<DatosPage />} />
            <Route path="/asuntos"       element={<AsuntosPage />} />
            <Route path="/procesos"      element={<ProcesosPage />} />
            <Route path="/traccion"      element={<TraccionPage />} />
            <Route path="/reuniones"     element={<ReunionesPage />} />
            <Route path="/configuracion" element={<ConfiguracionPage />} />
            <Route path="/implementacion" element={<ImplementacionPage />} />
            <Route path="/biblioteca"     element={<BibliotecaPage />} />
            <Route path="/rrhh"           element={<RRHHPage />} />
            <Route path="/lotes"          element={<LotesPage />} />
            <Route path="/juridico"       element={<JuridicoPage />} />
            <Route path="/kpis"           element={<KpisPage />} />
            <Route path="/alarmas"        element={<AlarmasPage />} />
            <Route path="/tareas"         element={<TareasPage />} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function PendingApprovalPage({ displayName, logout }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 'var(--space-4)',
    }}>
      <div className="card-glass" style={{ width: '100%', maxWidth: 440, padding: 'var(--space-10)', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>⏳</div>
        <h2 style={{ marginBottom: 'var(--space-3)' }}>Acceso pendiente de aprobación</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
          Hola, <strong>{displayName}</strong>. Tu cuenta fue creada y está esperando que un administrador la active.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 'var(--space-8)' }}>
          Comunícate con Luis Miguel Serrano (TI) para que active tu acceso.
        </p>
        <button onClick={logout} className="btn btn-ghost btn-sm">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const {
    user, loading, isActive, isPending, displayName, logout,
    profile, onboardingCompleted, completeOnboarding,
  } = useApp()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg-base)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid var(--border-medium)',
            borderTopColor: 'var(--brand-primary)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  if (isPending) return <PendingApprovalPage displayName={displayName} logout={logout} />

  // Entrevista de onboarding: solo usuarios activos que aún no la han completado
  if (isActive && !onboardingCompleted) {
    return (
      <OnboardingInterview
        displayName={displayName}
        jobTitle={profile?.job_title || ''}
        area={profile?.area || ''}
        userId={user.id}
        onComplete={completeOnboarding}
      />
    )
  }

  return <AppLayout />
}
