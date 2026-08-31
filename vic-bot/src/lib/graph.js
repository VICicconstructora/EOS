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

// ─────────────────────────────────────────────────────────────────────
// Subida de la foto-prueba de una tarea a SharePoint (módulo de Tareas).
//
// Requiere el permiso de aplicación Graph Sites.ReadWrite.All (o
// Files.ReadWrite.All) con consentimiento de admin sobre el MISMO app
// registration del bot. Destino configurable por entorno:
//   TASK_PROOFS_SITE_ID  — id del sitio de SharePoint (Graph site id).
//   TASK_PROOFS_FOLDER   — carpeta raíz dentro de la biblioteca de docs
//                          (default: "Pruebas de Tareas").
// ─────────────────────────────────────────────────────────────────────
// Sitio GeneralIC, biblioteca de documentos por defecto, carpeta "Tareas"
// (/sites/GeneralIC/Documents/Tareas).
//   TASK_PROOFS_SITE_PATH — "host:/sites/Nombre" (default GeneralIC). Se
//                           resuelve al site id de Graph en runtime (cacheado).
//   TASK_PROOFS_SITE_ID   — opcional: si se conoce el id de Graph, lo usa
//                           directo y se salta la resolución.
//   TASK_PROOFS_FOLDER    — carpeta raíz dentro de la biblioteca (default "Tareas").
const TASK_PROOFS_SITE_PATH = process.env.TASK_PROOFS_SITE_PATH || 'icconstructora.sharepoint.com:/sites/GeneralIC'
const TASK_PROOFS_SITE_ID   = process.env.TASK_PROOFS_SITE_ID || ''
const TASK_PROOFS_FOLDER    = process.env.TASK_PROOFS_FOLDER || 'Tareas'

let siteIdCache = ''

// Resuelve el site id de Graph a partir de la ruta host:/sites/Nombre.
async function resolveSiteId() {
  if (TASK_PROOFS_SITE_ID) return TASK_PROOFS_SITE_ID
  if (siteIdCache) return siteIdCache
  const token = await getGraphToken()
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${TASK_PROOFS_SITE_PATH}?$select=id`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`No pude resolver el sitio SharePoint (${res.status}): ${await res.text()}`)
  const json = await res.json()
  if (!json.id) throw new Error('El sitio SharePoint no devolvió id.')
  siteIdCache = json.id
  return siteIdCache
}

function slugifyEmail(email) {
  return (email || 'sin-correo').toLowerCase().split('@')[0].replace(/[^a-z0-9._-]/g, '-')
}

// Sube un buffer a SharePoint y devuelve { url, name } del archivo creado.
// El path queda: <TASK_PROOFS_FOLDER>/<persona>/<archivo>.
async function uploadProofToSharePoint({ buffer, filename, personEmail, contentType } = {}) {
  if (!buffer || !buffer.length) throw new Error('La imagen llegó vacía.')

  const token = await getGraphToken()
  const siteId = await resolveSiteId()
  const safeName = `${Date.now()}-${(filename || 'prueba').replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const folder = encodeURIComponent(TASK_PROOFS_FOLDER)
  const person = encodeURIComponent(slugifyEmail(personEmail))
  const itemPath = `${folder}/${person}/${encodeURIComponent(safeName)}`

  // Subida simple (archivos < 4 MB; una foto de Teams entra de sobra).
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${itemPath}:/content`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType || 'application/octet-stream',
      },
      body: buffer,
    }
  )
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Subida a SharePoint falló (${res.status}): ${txt}`)
  }
  const item = await res.json()
  return { url: item.webUrl, name: item.name }
}

module.exports = { emailFromAadObjectId, getGraphToken, uploadProofToSharePoint }
