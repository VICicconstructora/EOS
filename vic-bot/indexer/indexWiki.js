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
const MIN_CHUNK_CHARS = 60

function extractTitle(content, filePath) {
  const match = content.match(/^#\s+(.+)/m)
  return match ? match[1].trim() : path.basename(filePath, '.md')
}

function chunkByHeaders(text) {
  // Dividir por headers H1 y H2 para mantener coherencia semántica
  const sections = text.split(/(?=^#{1,2} )/m).filter(s => s.trim().length > MIN_CHUNK_CHARS)
  const chunks = []

  for (const section of sections) {
    if (section.length <= CHUNK_CHARS) {
      chunks.push(section.trim())
    } else {
      // Sección larga: dividir por párrafos respetando el límite
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
      const chunks = chunkByHeaders(content)

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
