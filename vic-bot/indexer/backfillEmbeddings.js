/**
 * Backfill de embeddings para wiki_documents — respeta el rate limit de Voyage.
 *
 * Uso:
 *   npm run embed-wiki
 *
 * Genera el embedding de cada chunk que aún no lo tenga (embedding IS NULL).
 * Es REANUDABLE: si se corta, vuelve a correrlo y retoma donde quedó.
 *
 * Voyage en cuenta sin método de pago: 3 RPM y 10K TPM. El cuello de botella
 * real es el TPM. Enviamos lotes de ~8K tokens cada ~22s para mantenernos
 * por debajo de ambos límites. Con método de pago en Voyage, sube TOKENS_PER_MIN
 * y baja SECONDS_PER_BATCH y termina en ~1-2 min.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const { createClient } = require('@supabase/supabase-js')
const { embedDocuments } = require('../src/lib/embeddings')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Límites de la cuenta Voyage sin método de pago.
const TOKEN_BUDGET_PER_BATCH = 100000 // lotes grandes — cuenta con tarjeta tiene
                                      // límites altos. Menos requests = más rápido.
const SECONDS_PER_BATCH = 1           // espaciado mínimo; el backoff absorbe un 429 puntual.
// Estimación grosera: ~1 token por 4 caracteres (texto en español).
const estimateTokens = text => Math.ceil(text.length / 4)

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Trae todas las filas sin embedding, paginando (Supabase limita a 1000 por query).
async function fetchPending() {
  const all = []
  let from = 0
  const PAGE = 1000
  for (;;) {
    const { data, error } = await supabase
      .from('wiki_documents')
      .select('id, title, content')
      .is('embedding', null)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    all.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

// Arma lotes que no excedan el presupuesto de tokens por request.
function buildBatches(rows) {
  const batches = []
  let current = []
  let tokens = 0
  const MAX_TEXTS_PER_BATCH = 128  // tope de items por request a Voyage
  for (const row of rows) {
    const text = `${row.title || ''}\n\n${row.content}`
    const t = estimateTokens(text)
    if (current.length && (tokens + t > TOKEN_BUDGET_PER_BATCH || current.length >= MAX_TEXTS_PER_BATCH)) {
      batches.push(current)
      current = []
      tokens = 0
    }
    current.push({ id: row.id, text: text.slice(0, 8000) })  // cota dura por chunk
    tokens += t
  }
  if (current.length) batches.push(current)
  return batches
}

async function main() {
  if (!process.env.VOYAGE_API_KEY) {
    console.error('ERROR: VOYAGE_API_KEY no definida. No hay nada que embeber.')
    process.exit(1)
  }

  console.log('='.repeat(50))
  console.log('VIC — Backfill de embeddings (Voyage)')
  console.log('='.repeat(50))

  const pending = await fetchPending()
  console.log(`\nChunks sin embedding: ${pending.length}`)
  if (!pending.length) {
    console.log('Nada pendiente. Todos los chunks ya tienen embedding.')
    return
  }

  const batches = buildBatches(pending)
  const etaMin = Math.ceil((batches.length * SECONDS_PER_BATCH) / 60)
  console.log(`Lotes a procesar: ${batches.length} (~${SECONDS_PER_BATCH}s c/u → ETA ~${etaMin} min)\n`)

  let done = 0
  let errors = 0

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const started = Date.now()

    try {
      const vectors = await embedDocuments(batch.map(b => b.text))
      if (!vectors) throw new Error('embedDocuments devolvió null')

      // Actualizar cada fila con su embedding.
      for (let j = 0; j < batch.length; j++) {
        const { error } = await supabase
          .from('wiki_documents')
          .update({ embedding: vectors[j] })
          .eq('id', batch[j].id)
        if (error) {
          console.error(`\n  ERROR update id=${batch[j].id}: ${error.message}`)
          errors++
        } else {
          done++
        }
      }
      process.stdout.write(`\rProgreso: ${done}/${pending.length} chunks  (lote ${i + 1}/${batches.length})   `)
    } catch (e) {
      console.error(`\n  ERROR lote ${i + 1}: ${e.message}`)
      errors++
    }

    // Throttle: respetar el ritmo entre lotes (descontando lo ya transcurrido).
    if (i < batches.length - 1) {
      const elapsed = Date.now() - started
      const wait = Math.max(0, SECONDS_PER_BATCH * 1000 - elapsed)
      if (wait > 0) await sleep(wait)
    }
  }

  console.log('\n')
  console.log('='.repeat(50))
  console.log(`Completado: ${done} embeddings escritos, ${errors} errores.`)
  console.log('Reanudable: si quedaron pendientes, vuelve a correr `npm run embed-wiki`.')
  console.log('='.repeat(50))
}

main().catch(e => {
  console.error('\nFallo:', e.message)
  process.exit(1)
})
