// src/lib/supabaseIc.js
// Cliente Supabase para el proyecto IC Constructora (datos comerciales/financieros).
// Distinto del cliente principal (supabase.js) que apunta al EOS app.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_IC_URL
const key = import.meta.env.VITE_SUPABASE_IC_ANON_KEY

export const supabaseIc = (url && key) ? createClient(url, key) : null
export const isIcConfigured = Boolean(supabaseIc)
