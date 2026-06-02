// Resolución del correo real de un usuario de Teams vía Microsoft Graph.
//
// Teams NO entrega el email (UPN) en la actividad de un mensaje normal: solo
// el nombre y el aadObjectId. Para identificar al usuario por su correo real
// (allowlist del piloto, keys por usuario) resolvemos aadObjectId → mail con
// Graph app-only, usando las mismas credenciales del bot (BOT_APP_*).
//
// Requiere el permiso de aplicación Graph User.Read.All con consentimiento de
// admin sobre el app registration del bot.

const TENANT = process.env.BOT_APP_TENANT_ID
const CLIENT_ID = process.env.BOT_APP_ID
const CLIENT_SECRET = process.env.BOT_APP_PASSWORD

// Cache de token app-only (válido ~1h) y de aadObjectId → email (estable).
let tokenCache = { value: null, exp: 0 }
const emailCache = new Map()

async function getGraphToken() {
  const now = Date.now()
  if (tokenCache.value && now < tokenCache.exp - 60_000) return tokenCache.value
  if (!TENANT || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Faltan BOT_APP_TENANT_ID / BOT_APP_ID / BOT_APP_PASSWORD para Graph.')
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })

  const res = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Token Graph falló (${res.status}): ${txt}`)
  }
  const json = await res.json()
  tokenCache = { value: json.access_token, exp: Date.now() + (json.expires_in || 3600) * 1000 }
  return tokenCache.value
}

// Devuelve el correo (en minúsculas) del usuario dado su aadObjectId, o null.
// Prefiere `mail`; cae a userPrincipalName si la cuenta no tiene mail.
async function emailFromAadObjectId(aadObjectId) {
  if (!aadObjectId) return null
  if (emailCache.has(aadObjectId)) return emailCache.get(aadObjectId)

  try {
    const token = await getGraphToken()
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${aadObjectId}?$select=mail,userPrincipalName`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      console.error(`[VIC] Graph users/${aadObjectId} → ${res.status}`)
      return null
    }
    const u = await res.json()
    const email = (u.mail || u.userPrincipalName || '').toLowerCase() || null
    if (email) emailCache.set(aadObjectId, email)
    return email
  } catch (err) {
    console.error('[VIC] Error resolviendo email vía Graph:', err.message)
    return null
  }
}

module.exports = { emailFromAadObjectId }
