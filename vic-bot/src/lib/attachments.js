// Descarga de adjuntos entrantes desde una actividad de Teams para usarlos como
// PRUEBA de cumplimiento de una tarea. La prueba puede ser cualquier archivo:
// foto, PDF, Excel, Word, etc.
//
// Teams entrega los adjuntos de dos formas:
//   1. Archivo subido con el clip → attachment.contentType =
//      'application/vnd.microsoft.teams.file.download.info' con
//      content.downloadUrl PRE-AUTENTICADO (se baja sin token). Cubre PDF,
//      Excel, Word, imágenes, etc. Caso principal.
//   2. Imagen pegada/inline → contentType 'image/*' con un contentUrl que
//      apunta al servicio de Bot Framework y requiere un token de conector.
//
// Devuelve { buffer, filename, contentType } del PRIMER adjunto utilizable, o null.

const TENANT = process.env.BOT_APP_TENANT_ID
const CLIENT_ID = process.env.BOT_APP_ID
const CLIENT_SECRET = process.env.BOT_APP_PASSWORD

let connTokenCache = { value: null, exp: 0 }

// Token para leer adjuntos del servicio de Bot Framework (distinto al de Graph).
async function getBotConnectorToken() {
  const now = Date.now()
  if (connTokenCache.value && now < connTokenCache.exp - 60_000) return connTokenCache.value
  if (!TENANT || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Faltan BOT_APP_* para el token de conector.')
  }
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://api.botframework.com/.default',
    grant_type: 'client_credentials',
  })
  const res = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`Token de conector falló (${res.status}): ${await res.text()}`)
  const json = await res.json()
  connTokenCache = { value: json.access_token, exp: Date.now() + (json.expires_in || 3600) * 1000 }
  return connTokenCache.value
}

function isImage(contentType = '') {
  return contentType.toLowerCase().startsWith('image/')
}

async function toBuffer(res) {
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

// ¿La actividad trae un adjunto utilizable como prueba (archivo o imagen)?
function hasUsableAttachment(activity) {
  return (activity?.attachments || []).some(
    (a) => a.contentType === 'application/vnd.microsoft.teams.file.download.info' ||
           (isImage(a.contentType) && a.contentUrl)
  )
}

// Extrae el primer adjunto utilizable (cualquier tipo de archivo), o null.
async function extractFirstAttachment(activity) {
  const attachments = activity?.attachments || []
  if (!attachments.length) return null

  // Caso 1: archivo subido con el clip (PDF, Excel, Word, imagen, ...).
  const fileInfo = attachments.find(
    (a) => a.contentType === 'application/vnd.microsoft.teams.file.download.info' &&
           a.content?.downloadUrl
  )
  if (fileInfo) {
    const name = fileInfo.name || 'prueba'
    const res = await fetch(fileInfo.content.downloadUrl)
    if (!res.ok) throw new Error(`No pude bajar el archivo (${res.status}).`)
    return {
      buffer: await toBuffer(res),
      filename: name,
      contentType: res.headers.get('content-type') || 'application/octet-stream',
    }
  }

  // Caso 2: imagen pegada inline (image/*) — requiere token de conector.
  const img = attachments.find((a) => isImage(a.contentType) && a.contentUrl)
  if (img) {
    if (img.contentUrl.startsWith('data:')) {
      const b64 = img.contentUrl.split(',')[1] || ''
      return { buffer: Buffer.from(b64, 'base64'), filename: img.name || 'prueba.png', contentType: img.contentType }
    }
    const headers = {}
    try {
      headers.Authorization = `Bearer ${await getBotConnectorToken()}`
    } catch (_) { /* sin token: intentamos sin auth por si la URL es pública */ }
    const res = await fetch(img.contentUrl, { headers })
    if (!res.ok) throw new Error(`No pude bajar la imagen (${res.status}).`)
    return { buffer: await toBuffer(res), filename: img.name || 'prueba.png', contentType: res.headers.get('content-type') || img.contentType }
  }

  return null
}

module.exports = { extractFirstAttachment, hasUsableAttachment }
