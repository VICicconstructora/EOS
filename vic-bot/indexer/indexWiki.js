/**
 * Indexador del wiki de IC Constructora → Supabase wiki_documents
 *
 * Uso:
 *   npm run index-wiki
 *   (desde la carpeta vic-bot, con .env configurado)
 *
 * Lee todos los archivos .md del wiki, los divide en chunks y los guarda
 * en Supabase para búsqueda full-text. Ejecutar cada vez que cambie el wiki.
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const WIKI_PATH = process.env.WIKI_PATH ||
  'C:/Users/jmacallister/OneDrive - IC CONSTRUCTORA SAS/Documentos/ICEOS/IC-EOS'

const CHUNK_CHARS = 1200
const MAX_CHUNK_CHARS = 2000  // límite duro — evita chunks de 65K de transcripciones
const MIN_CHUNK_CHARS = 60

// Línea de transcripción cruda: [HH:MM:SS] **Persona:** texto
const TRANSCRIPT_LINE = /^\[\d{2}:\d{2}:\d{2}\]\s+\*\*/

function extractTitle(content, filePath) {
  const match = content.match(/^#\s+(.+)/m)
  return match ? match[1].trim() : path.basename(filePath, '.md')
}

// Para actas: elimina las líneas de diálogo crudo y conserva solo las secciones estructuradas
// (Resumen Ejecutivo, Temas Tratados, Decisiones, Compromisos, etc.)
function stripTranscriptLines(text) {
  const lines = text.split('\n')
  const cleaned = []
  let inTranscriptBlock = false

  for (const line of lines) {
    if (TRANSCRIPT_LINE.test(line)) {
      inTranscriptBlock = true
      continue  // descartar línea de diálogo
    }
    // Una línea de header (##, ###) o línea en blanco después de un bloque transcript
    // indica que salimos del bloque de diálogo
    if (inTranscriptBlock && (line.startsWith('#') || line.trim() === '')) {
      inTranscriptBlock = false
    }
    if (!inTranscriptBlock) cleaned.push(line)
  }

  return cleaned.join('\n')
}

function splitHard(text) {
  // Partir cualquier texto que supere MAX_CHUNK_CHARS en fragmentos fijos
  const parts = []
  for (let i = 0; i < text.length; i += MAX_CHUNK_CHARS) {
    const part = text.slice(i, i + MAX_CHUNK_CHARS).trim()
    if (part.length > MIN_CHUNK_CHARS) parts.push(part)
  }
  return parts
}

function chunkByHeaders(text, isActa = false) {
  const processedText = isActa ? stripTranscriptLines(text) : text

  // Dividir por headers H1 y H2 para mantener coherencia semántica
  const sections = processedText.split(/(?=^#{1,2} )/m).filter(s => s.trim().length > MIN_CHUNK_CHARS)
  const chunks = []

  for (const section of sections) {
    if (section.length <= CHUNK_CHARS) {
      chunks.push(section.trim())
    } else if (section.length <= MAX_CHUNK_CHARS) {
      // Sección mediana: dividir por párrafos
      const paragraphs = section.split(/\n{2,}/)
      let current = ''
      for (const para of paragraphs) {
        if ((current + '\n\n' + para).length > CHUNK_CHARS && current) {
          chunks.push(current.trim())
          current = para
        } else {
          current = current ? current + '\n\n' + para : para
        }
      }
      if (current.trim().length > MIN_CHUNK_CHARS) chunks.push(current.trim())
    } else {
      // Sección enorme (ej: transcript no filtrado): partir duro
      chunks.push(...splitHard(section))
    }
  }

  return chunks.filter(c => c.length > MIN_CHUNK_CHARS)
}

function walkDir(dir) {
  const files = []
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        files.push(...walkDir(full))
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(full)
      }
    }
  } catch (e) {
    console.error(`No se pudo leer directorio: ${dir}`)
  }
  return files
}

async function deleteStaleChunks(relativePath, keepCount) {
  // Eliminar chunks viejos que ya no existen (si el archivo se acortó)
  await supabase
    .from('wiki_documents')
    .delete()
    .eq('file_path', relativePath)
    .gte('chunk_index', keepCount)
}

async function indexWiki() {
  console.log('='.repeat(50))
  console.log('VIC Wiki Indexer')
  console.log(`Wiki: ${WIKI_PATH}`)
  console.log('='.repeat(50))

  if (!fs.existsSync(WIKI_PATH)) {
    console.error('\nERROR: Wiki path no encontrado.')
    console.error('Verifica WIKI_PATH en .env')
    process.exit(1)
  }

  const files = walkDir(WIKI_PATH)
  console.log(`\nArchivos .md encontrados: ${files.length}\n`)

  let totalChunks = 0
  let totalFiles = 0
  let errors = 0

  for (const filePath of files) {
    const relativePath = path.relative(WIKI_PATH, filePath).replace(/\\/g, '/')

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      if (!content.trim()) continue

      const title = extractTitle(content, filePath)
      const isActa = relativePath.startsWith('wiki/actas/')
      const chunks = chunkByHeaders(content, isActa)

      if (!chunks.length) continue

      const records = chunks.map((chunk, i) => ({
        file_path: relativePath,
        title,
        content: chunk,
        chunk_index: i,
        updated_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('wiki_documents')
        .upsert(records, { onConflict: 'file_path,chunk_index' })

      if (error) {
        console.error(`\nERROR ${relativePath}: ${error.message}`)
        errors++
        continue
      }

      // Limpiar chunks viejos si el archivo se acortó
      await deleteStaleChunks(relativePath, chunks.length)

      totalChunks += chunks.length
      totalFiles++
      process.stdout.write('.')
    } catch (e) {
      console.error(`\nERROR leyendo ${relativePath}: ${e.message}`)
      errors++
    }
  }

  console.log('\n')
  console.log('='.repeat(50))
  console.log(`Completado:`)
  console.log(`  Archivos indexados: ${totalFiles}`)
  console.log(`  Chunks guardados:   ${totalChunks}`)
  console.log(`  Errores:            ${errors}`)
  console.log('='.repeat(50))

  if (errors > 0) process.exit(1)
}

indexWiki()
