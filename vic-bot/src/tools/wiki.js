const { searchDriveItems, fetchItemContent } = require('../lib/sharepointSearch')

const EXTRACT_CHARS = 1500

// Rutas a excluir del primer paso de búsqueda (actas/minutas, ruido de
// volumen que domina el ranking y tapa las fichas reales). Ajustable por env.
const NOISE_PATHS = (process.env.VIC_WIKI_NOISE_PATHS || '/actas/,/Actas/,/papelera/,/Recycle')
  .split(',').map(s => s.trim()).filter(Boolean)

// Gobierno de acceso: prefijos de ruta restringidos a ciertos alcances.
// Formato env: "substring1|scope1,substring2|scope2". Vacío = todo abierto
// (comportamiento real actual: la ingesta de buzones .pst con scope nunca
// se corrió, así que hoy no hay contenido restringido de verdad).
const RESTRICTED = (process.env.VIC_RESTRICTED_PATHS || '')
  .split(',').map(s => s.trim()).filter(Boolean)
  .map(entry => {
    const [substring, scope] = entry.split('|')
    return { substring, scope: scope || 'restricted' }
  })

function isAllowed(webUrl, allowedScopes) {
  for (const r of RESTRICTED) {
    if (webUrl.includes(r.substring) && !allowedScopes.includes(r.scope)) return false
  }
  return true
}

function filterByScope(items, allowedScopes) {
  return items.filter(it => isAllowed(it.webUrl, allowedScopes))
}

// Busca en SharePoint (índice nativo) en 3 pasadas cada vez más amplias:
// 1) sitios de equipo, sin ruido (actas/papelera) — el caso normal.
// 2) sitios de equipo, sin filtrar ruido — por si el ruido tapaba el dato.
// 3) último recurso: incluye OneDrive personal de cada empleado (mucho más
//    ruidoso: escritorios duplicados, hasta node_modules de repos propios).
async function searchWiki(query, allowedScopes = ['all']) {
  if (!query?.trim()) return 'Query vacía.'

  try {
    const clean = filterByScope(
      await searchDriveItems(query, { size: 8, excludePaths: NOISE_PATHS }),
      allowedScopes
    )
    if (clean.length) return formatResults(clean)

    const teamSites = filterByScope(
      await searchDriveItems(query, { size: 8 }),
      allowedScopes
    )
    if (teamSites.length) return formatResults(teamSites)

    const withPersonal = filterByScope(
      await searchDriveItems(query, { size: 8, includePersonal: true }),
      allowedScopes
    )
    if (withPersonal.length) return formatResults(withPersonal)

    return 'No se encontraron resultados en el wiki (SharePoint).'
  } catch (e) {
    console.error('[wiki] Error search_wiki (SharePoint):', e.message)
    return `Error buscando en SharePoint: ${e.message}`
  }
}

function formatResults(items) {
  return items.map(it => ({
    title: it.name,
    archivo: it.webUrl, // get_wiki_page recibe esta URL tal cual
  }))
}

// Devuelve el contenido completo de un archivo del wiki dado su webUrl
// (el campo "archivo" que devuelve search_wiki/list_wiki_pages).
async function getWikiPage(webUrl, allowedScopes = ['all']) {
  if (!webUrl?.trim()) return 'archivo (URL) requerido.'
  if (!isAllowed(webUrl, allowedScopes)) return 'No tienes acceso a este documento.'

  try {
    const result = await fetchItemContent(webUrl)
    if (!result.convertible) {
      return {
        title: result.name,
        archivo: webUrl,
        contenido: `No puedo leer el contenido completo de este tipo de archivo. Ábrelo directamente: ${webUrl}`,
      }
    }
    return {
      title: result.name,
      archivo: webUrl,
      contenido: result.contenido,
    }
  } catch (e) {
    console.error('[wiki] Error get_wiki_page (SharePoint):', e.message)
    return `Error al leer página: ${e.message}`
  }
}

// Lista archivos relacionados con un prefijo/tema (ya no es un path literal
// de un índice propio; se resuelve como término de búsqueda sobre SharePoint).
async function listWikiPages(pathPrefix, allowedScopes = ['all']) {
  if (!pathPrefix?.trim()) return 'pathPrefix requerido.'

  try {
    const items = filterByScope(
      await searchDriveItems(pathPrefix, { size: 15 }),
      allowedScopes
    )
    if (!items.length) return `No hay páginas que coincidan con: ${pathPrefix}`
    return items.map(it => ({ archivo: it.webUrl, title: it.name }))
  } catch (e) {
    console.error('[wiki] Error list_wiki_pages (SharePoint):', e.message)
    return `Error al listar páginas: ${e.message}`
  }
}

module.exports = { searchWiki, getWikiPage, listWikiPages }
