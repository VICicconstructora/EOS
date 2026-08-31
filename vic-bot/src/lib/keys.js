// Resolución de las API keys por usuario (multi-proveedor).
//
// Cada usuario que habla con VIC consume SU propia cuota: registra su key una
// vez y VIC la resuelve por su email AAD en cada mensaje. Hoy hay dos
// proveedores:
//   - 'anthropic' → key sk-ant-... (su propio Claude).
//   - 'nvidia'    → key nvapi-...  (NVIDIA build, OpenAI-compatible, gratis).
//
// Las keys se guardan cifradas en Supabase (pgcrypto), una por (usuario,
// proveedor); la clave maestra (VIC_KEYS_SECRET) vive solo aquí, en el entorno
// del bot. Ver migración 20260708_001_vic_user_keys_multi_provider.sql.

const { createClient } = require('@supabase/supabase-js')
const { emailFromAadObjectId } = require('./graph')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MASTER = process.env.VIC_KEYS_SECRET

// Prefijo esperado y nombre legible por proveedor. La validación de formato es
// un guardarraíl para atrapar copy/paste equivocados, no seguridad.
const PROVIDERS = {
  anthropic: { prefix: 'sk-ant-', label: 'Anthropic' },
  nvidia:    { prefix: 'nvapi-',  label: 'NVIDIA' },
}

function assertMaster() {
  if (!MASTER) {
    throw new Error('VIC_KEYS_SECRET no está configurada; no se pueden manejar keys de usuario.')
  }
}

function normProvider(provider) {
  const p = (provider || 'anthropic').toLowerCase()
  if (!PROVIDERS[p]) throw new Error(`Proveedor de key desconocido: ${provider}`)
  return p
}

// Devuelve la API key (en claro) del usuario para un proveedor, o null.
async function getUserKey(email, provider = 'anthropic') {
  assertMaster()
  if (!email) return null
  const { data, error } = await supabase.rpc('vic_get_user_key', {
    p_email: email.toLowerCase(),
    p_master: MASTER,
    p_provider: normProvider(provider),
  })
  if (error) throw new Error(`Error resolviendo key de usuario: ${error.message}`)
  return data || null
}

// Registra/actualiza la key del usuario para un proveedor. Valida el prefijo.
async function setUserKey(email, apiKey, provider = 'anthropic') {
  assertMaster()
  if (!email) throw new Error('Sin email de usuario')
  const prov = normProvider(provider)
  const { prefix, label } = PROVIDERS[prov]
  const key = (apiKey || '').trim()
  if (!key.startsWith(prefix)) {
    throw new Error(`La key no parece de ${label} (debe empezar con "${prefix}").`)
  }
  const { error } = await supabase.rpc('vic_set_user_key', {
    p_email: email.toLowerCase(),
    p_apikey: key,
    p_master: MASTER,
    p_provider: prov,
  })
  if (error) throw new Error(`Error guardando key: ${error.message}`)
  return key.slice(-4)
}

// Pista de la key registrada (últimos 4 chars) o null. No descifra.
async function getUserKeyHint(email, provider = 'anthropic') {
  if (!email) return null
  const { data, error } = await supabase.rpc('vic_user_key_hint', {
    p_email: email.toLowerCase(),
    p_provider: normProvider(provider),
  })
  if (error) throw new Error(`Error consultando key: ${error.message}`)
  return data || null
}

async function deleteUserKey(email, provider = 'anthropic') {
  if (!email) return
  const { error } = await supabase.rpc('vic_delete_user_key', {
    p_email: email.toLowerCase(),
    p_provider: normProvider(provider),
  })
  if (error) throw new Error(`Error borrando key: ${error.message}`)
}

// Extrae el email real del usuario de un turno de Teams.
// Teams normalmente NO trae el UPN en la actividad; cuando falta, lo resolvemos
// por aadObjectId vía Microsoft Graph (graph.js). Es async por eso.
async function emailFromContext(context) {
  const from = context.activity.from || {}
  // Camino directo: si por algún canal sí viene el UPN/email, úsalo.
  const direct =
    (from.aadObjectId && context.activity.from.userPrincipalName) ||
    (from.properties && from.properties.email) ||
    null
  if (direct) return direct.toLowerCase()
  // Fallback robusto: resolver por aadObjectId vía Graph. Nunca caer al nombre.
  return await emailFromAadObjectId(from.aadObjectId)
}

module.exports = { getUserKey, setUserKey, getUserKeyHint, deleteUserKey, emailFromContext }
