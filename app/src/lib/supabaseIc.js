// src/lib/supabaseIc.js
// Cliente Supabase solo para datos (KPIs, ADPRO, CRM).
// Auth deshabilitada: el cliente principal (supabase.js) es el único que maneja
// el intercambio de código OAuth. Si ambos lo intentaran, el segundo falla con
// "Unable to exchange external code" y borra la sesión.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_IC_URL
const key = import.meta.env.VITE_SUPABASE_IC_ANON_KEY

export const supabaseIc = (url && key)
  ? createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null

export const isIcConfigured = Boolean(supabaseIc)
