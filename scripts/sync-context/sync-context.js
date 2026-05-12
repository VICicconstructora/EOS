/**
 * sync-context.js
 *
 * Lee los archivos .md de docs/memoria/ y hace upsert en la tabla `documents`
 * de Supabase con type='context', category según subcarpeta, is_indexed=true.
 *
 * Uso:
 *   node sync-context.js            → aplica cambios
 *   node sync-context.js --dry-run  → imprime qué haría sin tocar Supabase
 *
 * Requiere variables de entorno (leer desde ../../app/.env o exportar):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY   ← service_role key (no anon), para saltarse RLS
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { resolve, join, relative, basename, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Config ────────────────────────────────────────────────────────────────────

const DRY_RUN    = process.argv.includes('--dry-run')
const COMPANY_ID = 'ic-constructora'
const REPO_ROOT  = resolve(__dirname, '..', '..')
const MEMORIA    = join(REPO_ROOT, 'docs', 'memoria')

// Leer .env de la app si no están en el entorno
function loadEnv() {
  const envPath = join(REPO_ROOT, 'app', '.env')
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}
loadEnv()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Define SUPABASE_URL y SUPABASE_SERVICE_KEY (o VITE_SUPABASE_URL/ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Construcción dinámica del manifiesto ──────────────────────────────────────

function slugFromFilename(filename) {
  return filename.replace(/\.md$/, '')
}

function titleFromContent(content, fallback) {
  const m = content.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : fallback
}

function buildManifest() {
  const entries = []

  // Organigrama
  entries.push({
    file:     'empresa/organigrama.md',
    slug:     'context/organigrama',
    title:    'Organigrama IC Constructora',
    category: 'empresa',
    tags:     ['organigrama', 'estructura', 'jerarquia', 'equipo'],
  })

  // Personas — todos los .md del directorio automáticamente
  const personasDir = join(MEMORIA, 'personas')
  if (existsSync(personasDir)) {
    const files = readdirSync(personasDir)
      .filter(f => f.endsWith('.md'))
      .sort()

    for (const file of files) {
      const name = slugFromFilename(file)
      const content = readFileSync(join(personasDir, file), 'utf8')
      entries.push({
        file:     `personas/${file}`,
        slug:     `context/personas/${name}`,
        title:    titleFromContent(content, `Perfil: ${name}`),
        category: 'personas',
        tags:     ['persona', ...name.split('-').filter(t => t.length > 2)],
      })
    }
  }

  // Proyectos — todos los index.md de subcarpetas
  const proyectosDir = join(MEMORIA, 'proyectos')
  if (existsSync(proyectosDir)) {
    const subdirs = readdirSync(proyectosDir)
      .filter(d => statSync(join(proyectosDir, d)).isDirectory())
      .sort()

    for (const dir of subdirs) {
      const indexPath = join(proyectosDir, dir, 'index.md')
      if (!existsSync(indexPath)) continue
      const content = readFileSync(indexPath, 'utf8')
      entries.push({
        file:     `proyectos/${dir}/index.md`,
        slug:     `context/proyectos/${dir}`,
        title:    titleFromContent(content, `Proyecto: ${dir}`),
        category: 'proyectos',
        tags:     ['proyecto', ...dir.split('-').filter(t => t.length > 2)],
      })
    }
  }

  return entries
}

const MANIFEST = buildManifest()

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔄 sync-context ${DRY_RUN ? '[DRY RUN] ' : ''}— ${new Date().toLocaleString('es-CO')}`)
  console.log(`   Repo:     ${REPO_ROOT}`)
  console.log(`   Supabase: ${SUPABASE_URL}`)
  console.log(`   Archivos: ${MANIFEST.length}\n`)

  let ok = 0, skipped = 0, errors = 0

  for (const entry of MANIFEST) {
    const filePath = join(MEMORIA, entry.file)

    if (!existsSync(filePath)) {
      console.warn(`  ⚠  FALTA  ${entry.file}`)
      skipped++
      continue
    }

    const content = readFileSync(filePath, 'utf8').trim()

    if (DRY_RUN) {
      console.log(`  ✓  [dry]  ${entry.slug}  (${content.length} chars)`)
      ok++
      continue
    }

    const { error } = await supabase.rpc('sync_context_document', {
      p_slug:     entry.slug,
      p_title:    entry.title,
      p_content:  content,
      p_category: entry.category,
      p_tags:     entry.tags,
    })

    if (error) {
      console.error(`  ✗  ERROR  ${entry.slug}: ${error.message}`)
      errors++
    } else {
      console.log(`  ✓  OK     ${entry.slug}`)
      ok++
    }
  }

  console.log(`\n   Resultado: ${ok} OK · ${skipped} omitidos · ${errors} errores\n`)

  if (errors > 0) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
