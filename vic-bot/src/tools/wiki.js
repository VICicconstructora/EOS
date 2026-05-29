const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function searchWiki(query) {
  if (!query?.trim()) return 'Query vacía.'

  // Paso 1: buscar en páginas estructuradas (proyectos, personas, procesos, empresa, reportes).
  // Las actas/transcripciones dominan el FTS por volumen de texto, ocultando las fichas reales.
  const { data: structured, error: err1 } = await supabase
    .from('wiki_documents')
    .select('title, content, file_path')
    .textSearch('search_vector', query, { type: 'websearch', config: 'spanish' })
    .not('file_path', 'like', 'wiki/actas/%')
    .not('file_path', 'like', 'wiki/raw/%')
    .limit(8)

  if (!err1 && structured?.length >= 1) {
    return structured.map(d => ({
      title: d.title,
      archivo: d.file_path,
      extracto: d.content.slice(0, 800)
    }))
  }

  // Paso 2: si no hubo resultados estructurados, buscar en todo (incluyendo actas y raw)
  const { data, error } = await supabase
    .from('wiki_documents')
    .select('title, content, file_path')
    .textSearch('search_vector', query, { type: 'websearch', config: 'spanish' })
    .limit(5)

  if (error) {
    console.error('[wiki] Error búsqueda:', error.message)
    return `Error buscando en wiki: ${error.message}`
  }

  if (!data?.length) {
    // Fallback: búsqueda por ilike si FTS no devuelve nada
    const words = query.split(/\s+/).filter(w => w.length > 3)
    if (!words.length) return 'No se encontraron resultados en el wiki.'

    const fallbackFilter = words.map(w => `content.ilike.%${w}%`).join(',')
    const { data: fallback, error: fErr } = await supabase
      .from('wiki_documents')
      .select('title, content, file_path')
      .or(fallbackFilter)
      .limit(4)

    if (fErr || !fallback?.length) return 'No se encontraron resultados en el wiki.'

    return fallback.map(d => ({
      title: d.title,
      archivo: d.file_path,
      extracto: d.content.slice(0, 800)
    }))
  }

  return data.map(d => ({
    title: d.title,
    archivo: d.file_path,
    extracto: d.content.slice(0, 800)
  }))
}

// Devuelve el contenido completo de una página del wiki (todos sus chunks en orden).
// Usar cuando search_wiki devuelve un archivo relevante pero el extracto está incompleto.
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

module.exports = { searchWiki, getWikiPage }
