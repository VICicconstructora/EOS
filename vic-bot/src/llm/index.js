// Dispatcher de proveedor LLM. Sistema dual Anthropic + OpenAI-compatible.
//
// Política:
//   - Primario para TODOS: Anthropic (Claude). Si la persona registró su key
//     sk-ant- usa su propia cuota; si no, la compartida del bot
//     (VIC_ANTHROPIC_API_KEY, o ANTHROPIC_API_KEY del .env raíz).
//   - OpenAI-compatible (NVIDIA / Llama) queda SOLO de respaldo.
//   - Antes el default era NVIDIA: un modelo de 70B escribiendo SQL contra
//     SINCO producía cifras erradas (cartera 8x, facturación 6x). Las consultas
//     de negocio necesitan el modelo fuerte, no el gratuito.
//   - Fallback cruzado: si el primario falla, se intenta el otro disponible.
//   - VIC_DEFAULT_PROVIDER=openai invierte el orden (escape hatch para pruebas).
//
// La firma que ve el bot: chat(history, ctx, { anthropicKey, openaiKey }).

const anthropic = require('./anthropic')
const openai = require('./openai')

// Construye la cadena de proveedores a intentar, en orden, para este usuario.
// Cada entrada: { name, run(history, ctx) }.
//
// Orden normal: Anthropic primario, OpenAI respaldo. Con
// VIC_DEFAULT_PROVIDER=openai se invierte — útil para probar el respaldo sin
// tocar keys.
function providerChain({ anthropicKey, openaiKey } = {}) {
  // anthropicKey = key sk-ant- del usuario (si la registró); anthropic.isReady
  // cae a la compartida del bot cuando el usuario no trae la suya.
  const anth = anthropic.isReady(anthropicKey)
    ? { name: 'anthropic', run: (h, ctx) => anthropic.chat(h, anthropicKey, ctx) }
    : null
  // openaiKey = key nvapi-... del usuario (si la registró); openai.isReady cae
  // a la compartida del bot cuando el usuario no trae la suya.
  const oai = openai.isReady(openaiKey)
    ? { name: 'openai', run: (h, ctx) => openai.chat(h, ctx, openaiKey) }
    : null

  const preferOpenai = (process.env.VIC_DEFAULT_PROVIDER || '').toLowerCase() === 'openai'
  const ordered = preferOpenai ? [oai, anth] : [anth, oai]
  return ordered.filter(Boolean)
}

// Devuelve { text, provider, fallosPrevios }. Intenta el primario; ante un
// error, cae al siguiente proveedor de la cadena.
//
// `fallosPrevios` son los errores de los proveedores que se saltaron cuando
// otro sí respondió. Importan: si la persona registró su key y esa key falla en
// cada mensaje, el fallback la deja invisible — VIC contesta por NVIDIA y ella
// cree que está usando su Claude. Le pasó a Pablo Ángel el 2026-09-11.
//
// Si fallan todos, se lanza el error MÁS ACCIONABLE, no el último. Un 500
// pasajero del respaldo tapaba el 400/401 del primario, que es el que dice qué
// hacer ("prompt demasiado largo", "key revocada").
function masAccionable(errores) {
  // 4xx = algo que el usuario o TI puede corregir. 5xx/timeout = pasajero.
  const accionable = errores.find(e => {
    const st = e && (e.status || e.statusCode)
    return st && st >= 400 && st < 500
  })
  return accionable || errores[errores.length - 1]
}

async function chat(history, ctx = {}, opts = {}) {
  const chain = providerChain(opts)
  if (chain.length === 0) {
    throw new Error(
      'No hay proveedor LLM configurado: registra una key Anthropic (/registrar-key) ' +
      'o define VIC_OPENAI_API_KEY en el entorno del bot.'
    )
  }

  const errores = []
  for (let i = 0; i < chain.length; i++) {
    const p = chain[i]
    try {
      const text = await p.run(history, ctx)
      return { text, provider: p.name, fallosPrevios: errores }
    } catch (err) {
      // Marcar quién falló: el mensaje al usuario nombra al proveedor real y
      // le pide (si acaso) la key que sí corresponde.
      if (err && !err.provider) err.provider = p.name
      errores.push(err)
      const hayMas = i < chain.length - 1
      console.warn(
        `[VIC] proveedor ${p.name} falló${hayMas ? ' — intentando fallback' : ''}:`,
        err.message
      )
      if (!hayMas) throw masAccionable(errores)
    }
  }
}

module.exports = { chat, providerChain }
