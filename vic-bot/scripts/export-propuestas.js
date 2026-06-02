// scripts/export-propuestas.js
//
// Cierra el ciclo del buzón de propuestas: exporta las propuestas APROBADAS
// (estado='aprobada', aún no ingeridas) a archivos .md "parche" en la carpeta
// de Ingesta, agrupados por entidad objetivo. Luego se corre /wikiingesta sobre
// esa carpeta y, una vez confirmado en el wiki, se marcan 'ingerida' desde la
// app (botón "Marcar como ingerida").
//
// Este script NO escribe en el wiki ni cambia el estado en Supabase: solo
// exporta. El control del paso final lo mantiene el curador.
//
// Uso:
//   node scripts/export-propuestas.js [carpeta-destino]
// Si no se pasa carpeta, usa la carpeta de Ingesta por defecto de la skill.

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const DEFAULT_DEST =
  'C:\\Users\\jmacallister\\OneDrive - IC CONSTRUCTORA SAS\\Escritorio\\Ingesta'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Slug de archivo a partir de la entidad objetivo o, si falta, del tipo.
function slugFor(entidad, tipo) {
  if (entidad) {
    // wiki/personas/mayra-...-mejia.md -> mayra-...-mejia
    const base = path.basename(entidad).replace(/\.md$/i, '')
    if (base) return base
  }
  return `sin-ficha-${tipo || 'otro'}`
}

function fecha(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function main() {
  const dest = process.argv[2] || DEFAULT_DEST

  if (!fs.existsSync(dest)) {
    console.error(`La carpeta destino no existe: ${dest}`)
    process.exit(1)
  }

  const { data, error } = await supabase
    .from('wiki_proposals')
    .select('*')
    .eq('company_id', 'ic-constructora')
    .eq('estado', 'aprobada')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error leyendo propuestas:', error.message)
    process.exit(1)
  }
  if (!data || data.length === 0) {
    console.log('No hay propuestas aprobadas pendientes de exportar.')
    return
  }

  // Agrupar por entidad objetivo (una ficha del wiki = un .md parche).
  const grupos = new Map()
  for (const p of data) {
    const key = slugFor(p.entidad_objetivo, p.tipo)
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key).push(p)
  }

  const escritos = []
  for (const [slug, props] of grupos) {
    const first = props[0]
    const lines = []
    lines.push('---')
    lines.push('tipo: propuestas-wiki')
    lines.push(`entidad_objetivo: ${first.entidad_objetivo || '(sin ficha definida)'}`)
    lines.push(`clase: ${first.tipo}`)
    lines.push(`generado: ${new Date().toISOString().slice(0, 10)}`)
    lines.push('origen: buzon-vic')
    lines.push('estado: por-revisar')
    lines.push('---')
    lines.push('')
    lines.push(`# Propuestas para: ${first.entidad_objetivo || slug}`)
    lines.push('')
    lines.push('> Hechos aportados vía VIC y aprobados por curaduría. Revisar e integrar a la ficha del wiki con criterio. NO copiar a ciegas.')
    lines.push('')

    props.forEach((p, i) => {
      lines.push(`## ${i + 1}. ${p.contenido}`)
      lines.push('')
      if (p.cita_textual) {
        lines.push(`- **Cita textual:** "${p.cita_textual}"`)
      }
      lines.push(`- **Aportado por:** ${p.propuesto_por}${p.area ? ` (${p.area})` : ''}`)
      lines.push(`- **Confianza:** ${p.confianza}`)
      lines.push(`- **Fecha:** ${fecha(p.created_at)}`)
      lines.push(`- **ID propuesta:** ${p.id}`)
      lines.push('')
    })

    const file = path.join(dest, `${slug}--propuestas.md`)
    fs.writeFileSync(file, lines.join('\n'), 'utf8')
    escritos.push({ file, n: props.length })
  }

  console.log(`Exportadas ${data.length} propuestas en ${escritos.length} archivo(s):`)
  for (const e of escritos) {
    console.log(`  - ${e.file}  (${e.n} hecho${e.n !== 1 ? 's' : ''})`)
  }
  console.log('')
  console.log('Siguiente paso:')
  console.log(`  1) Corre  /wikiingesta "${dest}"  para integrar al wiki Obsidian.`)
  console.log('  2) Verifica en el wiki que quedó bien.')
  console.log('  3) En la app (Propuestas Wiki) marca cada una como "ingerida".')
}

main().catch(err => {
  console.error('Fallo inesperado:', err.message)
  process.exit(1)
})
