// Resolución de la API key de Anthropic por usuario.
//
// Cada usuario que habla con VIC consume SU propia cuota: registra su key
// una vez (/registrar-key) y VIC la resuelve por su email AAD en cada
// mensaje. Las keys se guardan cifradas en Supabase (pgcrypto); la clave
// maestra (VIC_KEYS_SECRET) vive solo aquí, en el entorno del bot.

const { createClient } = require('@supabase/supabase-js')
const { emailFromAadObjectId } = require('./graph')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MASTER = process.env.VIC_KEYS_SECRET

function assertMaster() {
  if (!MASTER) {
    throw new Error('VIC_KEYS_SECRET no está configurada; no se pueden manejar keys de usuario.')
  }
}

// Devuelve la API key (en claro) del usuario, o null si no tiene registrada.
async function getUserKey(email) {
  assertMaster()
  if (!email) return null
  const { data, error } = await supabase.rpc('vic_get_user_key', {
    p_email: email.toLowerCase(),
    p_master: MASTER,
  })
  if (error) throw new Error(`Error resolviendo key de usuario: ${error.message}`)
  return data || null
}

// Registra/actualiza la key del usuario. Valida formato básico de Anthropic.
async function setUserKey(email, apiKey) {
  assertMaster()
  if (!email) throw new Error('Sin email de usuario')
  const key = (apiKey || '').trim()
  if (!key.startsWith('sk-ant-')) {
    throw new Error('La key no parece de Anthropic (debe empezar con "sk-ant-").')
  }
  const { error } = await supabase.rpc('vic_set_user_key', {
    p_email: email.toLowerCase(),
    p_apikey: key,
    p_master: MASTER,
  })
  if (error) throw new Error(`Error guardando key: ${error.message}`)
  return key.slice(-4)
}

// Pista de la key registrada (últimos 4 chars) o null. No descifra.
async function getUserKeyHint(email) {
  if (!email) return null
  const { data, error } = await supabase.rpc('vic_user_key_hint', {
    p_email: email.toLowerCase(),
  })
  if (error) throw new Error(`Error consultando key: ${error.message}`)
  return data || null
}

async function deleteUserKey(email) {
  if (!email) return
  const { error } = await supabase.rpc('vic_delete_user_key', {
    p_email: email.toLowerCase(),
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
