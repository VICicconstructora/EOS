// src/context/AppContext.jsx
// Global app state: auth, profile, VTO, demo mode, language.
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { isAdmin } from '../lib/permissions'

const AppContext = createContext(null)

const DEMO_USER = {
  id: 'demo-user',
  email: 'admin@icconstructora.com',
}

const DEMO_PROFILE = {
  id: 'demo-user',
  email: 'admin@icconstructora.com',
  full_name: 'Admin IC',
  role: 'admin',
  status: 'active',
  area: 'Dirección',
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
  const [user, setUser]                   = useState(null)
  const [profile, setProfile]             = useState(null)
  const [providerToken, setProviderToken] = useState(null)
  const [loading, setLoading]             = useState(true)
  const [vto, setVto]                     = useState(null)
  const [isDemoMode, setIsDemoMode]       = useState(false)
  const [lang, setLang]                   = useState('es')

  const isSupabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function initAuth() {
      try {
        if (!isSupabaseConfigured || !supabase) {
          throw new Error('Supabase not configured')
        }

        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        setUser(session?.user ?? null)
        setProviderToken(session?.provider_token ?? null)

        if (session?.user) {
          await loadProfile(session.user.id)
        }
      } catch (err) {
        console.warn('EOS App: Starting in Demo Mode due to:', err.message)
        setIsDemoMode(true)
        setUser(DEMO_USER)
        setProfile(DEMO_PROFILE)
        setVto(DEMO_VTO)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          setUser(session?.user ?? null)
          setProviderToken(session?.provider_token ?? null)
          if (session?.user) {
            await loadProfile(session.user.id)
          } else {
            setProfile(null)
          }
        }
      )
      return () => subscription.unsubscribe()
    }
  }, [isSupabaseConfigured])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('Error loading profile:', error)
      setProfile(null)
      return
    }
    setProfile(data)
  }

  // Load VTO when user becomes active
  useEffect(() => {
    if (user && profile?.status === 'active' && isSupabaseConfigured) {
      loadVTO()
    }
  }, [user, profile?.status])

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

  async function signInWithMicrosoft() {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'openid profile email User.Read User.Read.All offline_access',
        redirectTo: window.location.origin,
      },
    })
    return { error }
  }

  async function logout() {
    if (!isDemoMode && supabase) await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setProviderToken(null)
  }

  const value = {
    user,
    profile,
    providerToken,
    loading,
    vto,
    setVto,
    saveVTO,
    signInWithMicrosoft,
    logout,
    isDemoMode,
    lang,
    setLang,
    isSupabaseConfigured,
    // Derived
    isAdmin: isAdmin(profile) || isDemoMode,
    displayName: profile?.full_name || user?.email?.split('@')[0] || 'Usuario',
    refreshProfile: () => user && loadProfile(user.id),
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
