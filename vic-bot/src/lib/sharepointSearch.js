// Búsqueda y lectura EN VIVO de SharePoint (reemplaza el índice propio en
// Supabase que se perdió el 2026-08-20 al borrarse el schema `wiki`).
//
// Usa el registro de Azure del scraper ('Claude-SharePoint-Actas',
// SP_AZURE_CLIENT_ID/SECRET), que ya tiene permiso de aplicación
// (Sites.Read.All) sobre todo el tenant — mismo que usaba para crawlear.
// En vez de mantener un índice propio, consultamos el índice nativo de
// búsqueda de SharePoint (Microsoft ya indexa el texto de PDF/DOCX/XLSX/etc.)
// vía Graph Search API, y solo descargamos+convertimos un archivo cuando VIC
// necesita leerlo completo (get_wiki_page).

const TENANT = process.env.AZURE_TENANT_ID
const CLIENT_ID = process.env.SP_AZURE_CLIENT_ID
const CLIENT_SECRET = process.env.SP_AZURE_CLIENT_SECRET
// Graph Search exige `region` en requests con permiso de aplicación.
// Confirmado con el tenant real: 'NAM' funciona (ver prueba manual).
const SEARCH_REGION = process.env.SP_SEARCH_REGION || 'NAM'

let tokenCache = { value: null, exp: 0 }

async function getSpToken() {
  const now = Date.now()
  if (tokenCache.value && now < tokenCache.exp - 60_000) return tokenCache.value
  if (!TENANT || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Faltan AZURE_TENANT_ID / SP_AZURE_CLIENT_ID / SP_AZURE_CLIENT_SECRET para Graph.')
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
  if (!res.ok) throw new Error(`Token Graph (SP) falló (${res.status}): ${await res.text()}`)
  const json = await res.json()
  tokenCache = { value: json.access_token, exp: Date.now() + (json.expires_in || 3600) * 1000 }
  return tokenCache.value
}

// Extensiones que sabemos convertir a texto completo. El resto: solo snippet + link.
const CONVERTIBLE_EXTS = new Set([
  '.md', '.txt', '.csv', '.json', '.xml', '.html', '.htm',
  '.docx', '.pdf', '.xlsx', '.xls',
])

function extOf(name) {
  const m = /\.[a-z0-9]+$/i.exec(name || '')
  return m ? m[0].toLowerCase() : ''
}

// OneDrive personal de cada empleado (no es "el wiki": trae ruido masivo —
// carpetas de escritorio duplicadas por persona, hasta node_modules de repos
// personales). Excluido por defecto; el wiki real vive en sitios de equipo
// (GeneralIC, GND y sus subsitios, etc.).
const PERSONAL_ONEDRIVE = '-my.sharepoint.com/personal/'

// Busca driveItems (archivos, no carpetas) que coincidan con queryText.
// excludePaths: substrings de webUrl a excluir (ruido: actas, papelera, etc.).
async function searchDriveItems(queryText, { size = 8, excludePaths = [], includePersonal = false } = {}) {
  const token = await getSpToken()
  const res = await fetch('https://graph.microsoft.com/v1.0/search/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        entityTypes: ['driveItem'],
        query: { queryString: queryText },
        from: 0,
        size,
        region: SEARCH_REGION,
      }],
    }),
  })
  if (!res.ok) throw new Error(`Graph Search falló (${res.status}): ${await res.text()}`)
  const json = await res.json()
  const hits = json?.value?.[0]?.hitsContainers?.[0]?.hits || []

  return hits
    .map(h => h.resource)
    .filter(r => r && r.file && !r.folder) // solo archivos, no carpetas
    .filter(r => includePersonal || !(r.webUrl || '').includes(PERSONAL_ONEDRIVE))
    .filter(r => !excludePaths.some(p => (r.webUrl || '').includes(p)))
    .map(r => ({
      name: r.name,
      webUrl: r.webUrl,
      lastModifiedDateTime: r.lastModifiedDateTime,
    }))
}

// Resuelve una webUrl de SharePoint a su driveItem vía el endpoint /shares/.
// https://learn.microsoft.com/graph/api/shares-get
function encodeShareId(webUrl) {
  const b64 = Buffer.from(webUrl, 'utf8').toString('base64')
    .replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-')
  return 'u!' + b64
}

async function resolveItemByUrl(webUrl) {
  const token = await getSpToken()
  const shareId = encodeShareId(webUrl)
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem?$select=id,name,size,parentReference`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`No pude resolver el archivo (${res.status}): ${await res.text()}`)
  return res.json()
}

async function downloadItemContent(driveId, itemId) {
  const token = await getSpToken()
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`No pude descargar el archivo (${res.status}): ${await res.text()}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function convertToText(buffer, ext) {
  if (['.md', '.txt', '.csv', '.json', '.xml', '.html', '.htm'].includes(ext)) {
    return buffer.toString('utf8')
  }
  if (ext === '.docx') {
    const mammoth = require('mammoth')
    const { value } = await mammoth.extractRawText({ buffer })
    return value
  }
  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse')
    const { text } = await pdfParse(buffer)
    return text
  }
  if (ext === '.xlsx' || ext === '.xls') {
    const XLSX = require('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    return wb.SheetNames
      .map(name => `--- ${name} ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[name])}`)
      .join('\n\n')
  }
  return null // no convertible (pptx, ppt, doc legado, etc.)
}

// Dada una webUrl (la que devuelve searchDriveItems), trae el contenido
// completo del archivo ya convertido a texto. Si la extensión no se puede
// convertir, devuelve { convertible: false } para que el llamador use el
// link en vez del contenido.
async function fetchItemContent(webUrl) {
  const item = await resolveItemByUrl(webUrl)
  const ext = extOf(item.name)
  if (!CONVERTIBLE_EXTS.has(ext)) {
    return { name: item.name, convertible: false, webUrl }
  }
  const driveId = item.parentReference?.driveId
  const buffer = await downloadItemContent(driveId, item.id)
  const text = await convertToText(buffer, ext)
  return { name: item.name, convertible: text != null, contenido: text, webUrl }
}

module.exports = { searchDriveItems, fetchItemContent }
