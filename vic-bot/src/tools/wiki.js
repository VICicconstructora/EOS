const { createClient } = require('@supabase/supabase-js')
const { embedQuery } = require('../lib/embeddings')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EXTRACT_CHARS = 1500

// Busca en el wiki combinando ranking léxico tolerante (OR + stemming) y
// similitud semántica por embeddings. Resuelve el caso clásico donde la
// pregunta usa una palabra ("apartamentos") distinta a la de la ficha
// ("unidades"): el embedding las acerca, y el léxico OR no exige que todas
// las palabras de la pregunta estén presentes.
async function searchWiki(query) {
  if (!query?.trim()) return 'Query vacía.'

  // Embedding de la consulta (null si no hay VOYAGE_API_KEY → degrada a solo-léxico).
  let queryEmbedding = null
  try {
    queryEmbedding = await embedQuery(query)
  } catch (e) {
    console.error('[wiki] embedQuery falló, uso solo-léxico:', e.message)
  }

  // Paso 1: búsqueda híbrida sobre páginas estructuradas (sin actas/raw, que
  // dominan por volumen de texto y ocultan las fichas reales).
  const structured = await runHybrid(query, queryEmbedding, true, 8)
  if (structured.length) return formatResults(structured)

  // Paso 2: si no hubo nada estructurado, ampliar a todo el wiki (incluye actas/raw).
  const all = await runHybrid(query, queryEmbedding, false, 5)
  if (all.length) return formatResults(all)

  // Paso 3 (último recurso): ilike por palabras sueltas, por si el FTS no tokenizó nada.
  return await ilikeFallback(query)
}

async function runHybrid(query, queryEmbedding, excludeNoise, matchCount) {
  const { data, error } = await supabase.rpc('search_wiki_hybrid', {
    query_text: query,
    query_embedding: queryEmbedding,
    exclude_noise: excludeNoise,
    match_count: matchCount
  })

  if (error) {
    console.error('[wiki] Error search_wiki_hybrid:', error.message)
    // Si la función aún no existe (migración no aplicada), caer a léxico simple.
    return await legacyTextSearch(query, excludeNoise, matchCount)
  }
  return data || []
}

// Fallback para entornos donde la migración híbrida todavía no se aplicó.
async function legacyTextSearch(query, excludeNoise, matchCount) {
  let q = supabase
    .from('wiki_documents')
    .select('title, content, file_path, chunk_index')
    .textSearch('search_vector', query, { type: 'websearch', config: 'spanish' })
    .limit(matchCount)

  if (excludeNoise) {
    q = q.not('file_path', 'like', 'wiki/actas/%').not('file_path', 'like', 'wiki/raw/%')
  }
  const { data, error } = await q
  if (error || !data) return []
  return data
}

async function ilikeFallback(query) {
  const words = query.split(/\s+/).filter(w => w.length > 3)
  if (!words.length) return 'No se encontraron resultados en el wiki.'

  const filter = words.map(w => `content.ilike.%${w}%`).join(',')
  const { data, error } = await supabase
    .from('wiki_documents')
    .select('title, content, file_path')
    .or(filter)
    .not('file_path', 'like', 'wiki/raw/%')
    .limit(5)

  if (error || !data?.length) return 'No se encontraron resultados en el wiki.'
  return formatResults(data)
}

function formatResults(rows) {
  return rows.map(d => ({
    title: d.title,
    archivo: d.file_path,
    extracto: (d.content || '').slice(0, EXTRACT_CHARS)
  }))
}

// Devuelve el contenido completo de una página del wiki (todos sus chunks en orden).
// Usar cuando search_wiki identifica un archivo relevante: ahí está el dato exacto.
async function getWikiPage(filePath) {
  if (!filePath?.trim()) return 'file_path requerido.'

  const { data, error } = await supabase
    .from('wiki_documents')
    .select('title, content, chunk_index')
    .eq('file_path', filePath)
    .order('chunk_index', { ascending: true })

  if (error) {
    console.error('[wiki] Error get_wiki_page:', error.message)
    return `Error al leer página: ${error.message}`
  }

  if (!data?.length) return `Página no encontrada en el wiki: ${filePath}`

  const fullContent = data.map(d => d.content).join('\n\n')
  return {
    title: data[0].title,
    archivo: filePath,
    chunks: data.length,
    contenido: fullContent
  }
}

// Lista todas las páginas del wiki bajo un prefijo de ruta (ej: "wiki/proyectos/reserva-de-oporto").
// Útil para descubrir qué fichas existen de un proyecto/persona antes de leerlas.
async function listWikiPages(pathPrefix) {
  if (!pathPrefix?.trim()) return 'pathPrefix requerido.'

  const { data, error } = await supabase
    .from('wiki_documents')
    .select('file_path, title')
    .ilike('file_path', `%${pathPrefix}%`)
    .order('file_path')

  if (error) return `Error al listar páginas: ${error.message}`
  if (!data?.length) return `No hay páginas que coincidan con: ${pathPrefix}`

  // Deduplicar por file_path (hay múltiples chunks por página).
  const seen = new Map()
  for (const d of data) {
    if (!seen.has(d.file_path)) seen.set(d.file_path, d.title)
  }
  return Array.from(seen, ([archivo, title]) => ({ archivo, title }))
}

module.exports = { searchWiki, getWikiPage, listWikiPages }
