// src/App.jsx — App shell: auth guard, layout, routes
import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import ProtectedRoute from './components/auth/ProtectedRoute'

import Sidebar from './components/layout/Sidebar'
import TopHeader from './components/layout/TopHeader'

const DashboardPage      = lazy(() => import('./pages/DashboardPage'))
const VisionPage         = lazy(() => import('./pages/VisionPage'))
const PersonasPage       = lazy(() => import('./pages/PersonasPage'))
const DatosPage          = lazy(() => import('./pages/DatosPage'))
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
              <Route path="/vision"         element={<VisionPage />} />
              <Route path="/personas"       element={<PersonasPage />} />
              <Route path="/datos"          element={<DatosPage />} />
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

export default function App() {
  const { loading } = useApp()

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

  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  )
}
