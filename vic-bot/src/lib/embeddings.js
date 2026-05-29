/**
 * Embeddings con Voyage AI (voyage-3-lite, 512 dimensiones).
 *
 * Voyage es el proveedor de embeddings recomendado por Anthropic.
 * Anthropic no ofrece API de embeddings propia, por eso usamos un tercero.
 *
 * Si VOYAGE_API_KEY no está definida, embedQuery devuelve null y la búsqueda
 * cae automáticamente a solo-léxica (sin romper nada).
 */

const VOYAGE_MODEL = 'voyage-3-lite'      // 512 dims, multilingüe, barato
const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function callVoyage(input, inputType, { maxRetries = 0 } = {}) {
  const key = process.env.VOYAGE_API_KEY
  if (!key) return null

  const texts = Array.isArray(input) ? input : [input]

  // maxRetries = 0 → reintentar indefinidamente ante 429 (modo backfill nocturno:
  // nunca perder un lote, la cuenta sin tarjeta es muy restrictiva).
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model: VOYAGE_MODEL,
        input: texts,
        input_type: inputType   // 'query' o 'document' — Voyage optimiza por tipo
      })
    })

    if (res.ok) {
      const json = await res.json()
      return json.data.map(d => d.embedding)  // mismo orden de entrada
    }

    const body = await res.text().catch(() => '')

    // 429 = rate limit. Esperar y reintentar. La cuenta sin tarjeta da 3 RPM/10K TPM,
    // así que el 429 es la norma, no la excepción: backoff que sube hasta 60s y se
    // queda ahí (no se rinde, para no perder lotes en una corrida larga).
    const giveUp = maxRetries > 0 && attempt >= maxRetries
    if (res.status === 429 && !giveUp) {
      const waitMs = Math.min(60000, 15000 * (attempt + 1))  // 15s,30s,45s,60s,60s...
      console.log(`  [voyage] 429 rate limit — esperando ${waitMs / 1000}s (intento ${attempt + 1})`)
      await sleep(waitMs)
      continue
    }

    throw new Error(`Voyage ${res.status}: ${body.slice(0, 200)}`)
  }
}

// Embebe una consulta del usuario (input_type='query'). Devuelve un vector o null.
// En vivo: 1 solo reintento. Si Voyage está saturado, el bot cae a léxico rápido
// en vez de hacer esperar al usuario.
async function embedQuery(text) {
  const out = await callVoyage(text, 'query', { maxRetries: 1 })
  return out ? out[0] : null
}

// Embebe un lote de documentos para indexación (input_type='document').
// Reintenta indefinidamente ante rate limit (corrida de backfill, no interactiva).
// Devuelve un array de vectores (mismo orden) o null si no hay clave.
async function embedDocuments(texts) {
  if (!texts.length) return []
  return await callVoyage(texts, 'document', { maxRetries: 0 })
}

module.exports = { embedQuery, embedDocuments, VOYAGE_MODEL }
