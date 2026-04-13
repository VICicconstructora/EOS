// src/context/AppContext.jsx
// Global app state: auth, company data, VTO, user preferences
import { createContext, useContext, useState, useEffect } from 'react'
import { 
  Eye, Users, BarChart3, AlertTriangle, Settings2, Rocket, 
  ChevronRight, Calendar, Target, CheckCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

// Demo data for when Supabase is not configured yet
const DEMO_USER = {
  id: 'demo-user',
  email: 'admin@icconstructora.com',
  user_metadata: { full_name: 'Admin IC', role: 'admin' }
}

const DEMO_VTO = {
  core_values: ['Integridad', 'Excelencia', 'Compromiso', 'Innovación', 'Trabajo en Equipo'],
  core_focus: 'Construir el futuro de la infraestructura con calidad y confianza.',
  niche: 'La constructora de mayor confianza para proyectos industriales en la región.',
  ten_year_target: '',
  marketing_strategy: '',
  three_year_picture: '',
  one_year_plan: '',
  quarterly_rocks_text: '',
  is_complete: false,
}

export function AppProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [vto, setVto]             = useState(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [lang, setLang]           = useState('es')

  const isSupabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  )

  // Auth
  useEffect(() => {
    async function initAuth() {
      try {
        if (!isSupabaseConfigured || !supabase) {
          throw new Error('Supabase not configured')
        }

        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        
        setUser(session?.user ?? null)
      } catch (err) {
        console.warn('EOS App: Starting in Demo Mode due to:', err.message)
        setIsDemoMode(true)
        setUser(DEMO_USER)
        setVto(DEMO_VTO)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })
      return () => subscription.unsubscribe()
    }
  }, [isSupabaseConfigured])

  // Load VTO when user is set
  useEffect(() => {
    if (user && isSupabaseConfigured) {
      loadVTO()
    }
  }, [user])

  async function loadVTO() {
    if (!isSupabaseConfigured) return
    const { data } = await supabase
      .from('vto')
      .select('*')
      .eq('company_id', 'ic-constructora')
      .single()
    if (data) setVto(data)
  }

  async function saveVTO(vtoData) {
    if (isDemoMode) {
      setVto(prev => ({ ...prev, ...vtoData }))
      return { success: true }
    }
    const { error } = await supabase
      .from('vto')
      .upsert({ ...vtoData, company_id: 'ic-constructora' })
    if (!error) await loadVTO()
    return { success: !error, error }
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function logout() {
    if (!isDemoMode) await supabase.auth.signOut()
    setUser(null)
  }

  const value = {
    user,
    loading,
    vto,
    setVto,
    saveVTO,
    login,
    logout,
    isDemoMode,
    lang,
    setLang,
    isSupabaseConfigured,
    // Derived
    isAdmin: user?.user_metadata?.role === 'admin' || isDemoMode,
    displayName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario',
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
