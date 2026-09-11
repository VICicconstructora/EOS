// Adaptador del proveedor Anthropic (Claude).
//
// Mantiene el formato de tool-use nativo de Anthropic. El catálogo TOOLS ya
// está en ese formato (input_schema), así que se pasa tal cual.
//
// Key: la del usuario que habla si la registró (gasta su propia cuota). Quien
// no la registró NO cae aquí: va por NVIDIA. Claude dejó de ser el primario
// para todos el 2026-09-11 — ver SHARED_HABILITADA más abajo.

const Anthropic = require('@anthropic-ai/sdk')
const { TOOLS, runTool, systemWithDate, serializarResultado } = require('./tools')
const { truncatedMessage, exhaustedMessage, unexpectedStopMessage } = require('../lib/errors')

const DEFAULT_MODEL = process.env.VIC_ANTHROPIC_MODEL || 'claude-opus-5'
// 16000, no 8000: en Opus 5 el pensamiento está activo por defecto y sus tokens
// cuentan contra max_tokens, así que el tope viejo cortaba informes que antes
// cabían. (8000 ya había reemplazado a 1500, con el que cualquier informe por
// proyecto se partía a media tabla y el texto generado se descartaba.)
// `VIC_ANTHROPIC_MAX_TOKENS` lo separa del tope del respaldo NVIDIA, que es otro
// modelo con otros límites.
const MAX_TOKENS = Number(process.env.VIC_ANTHROPIC_MAX_TOKENS || process.env.VIC_MAX_TOKENS || 16000)
const MAX_ITERATIONS = Number(process.env.VIC_MAX_ITERATIONS || 10)

// Key compartida del bot. Apagada por defecto desde el 2026-09-11: ese día se
// agotó el saldo entero en una jornada. La causa no fue el volumen (74
// preguntas) sino el costo unitario — sin prompt caching, cada iteración
// reenvía el SYSTEM y las 26 herramientas (~8.000 tokens de piso), y una
// consulta de cartera contra SINCO encadena hasta 10 iteraciones de Opus.
// Quien no registró su `sk-ant-` responde por NVIDIA, que es gratis.
// `VIC_SHARED_ANTHROPIC=1` la reactiva; hacerlo solo con presupuesto encima.
const SHARED_HABILITADA = /^(1|true|si|sí|yes)$/i.test(process.env.VIC_SHARED_ANTHROPIC || '')
const SHARED_API_KEY = SHARED_HABILITADA
  ? (process.env.VIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY)
  : null

// Hay proveedor Anthropic si el usuario trae su key o la compartida está
// habilitada (por defecto no lo está).
function isReady(userKey) {
  return !!(userKey || SHARED_API_KEY)
}

// El cliente NO es global: se cachea uno por API key.
const clientCache = new Map()
function clientFor(apiKey) {
  const key = apiKey || SHARED_API_KEY
  if (!key) throw new Error('Falta API key de Anthropic para esta conversación.')
  let c = clientCache.get(key)
  if (!c) {
    c = new Anthropic({ apiKey: key })
    clientCache.set(key, c)
  }
  return c
}

function textOf(content) {
  return content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim()
}

// Agentic loop: Claude puede encadenar varias tool calls antes de responder.
async function chat(history, apiKey, ctx = {}) {
  const client = clientFor(apiKey)
  const messages = history.map(m => ({ role: m.role, content: m.content }))
  const system = systemWithDate(ctx)

  // Último texto visto: si el loop termina sin cierre limpio, se devuelve lo
  // que Claude alcanzó a escribir en vez de descartarlo.
  let ultimoTexto = ''

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      tools: TOOLS,
      messages
    })

    messages.push({ role: 'assistant', content: response.content })

    const texto = textOf(response.content)
    if (texto) ultimoTexto = texto

    if (response.stop_reason === 'end_turn') return texto

    // Cortada por el tope de tokens: NO es un error de la API.
    if (response.stop_reason === 'max_tokens') {
      console.warn(`[VIC] respuesta truncada por max_tokens=${MAX_TOKENS} (iteración ${iteration + 1})`)
      return truncatedMessage(texto)
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const result = await runTool(block.name, block.input, ctx)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: serializarResultado(result)
        })
      }
      messages.push({ role: 'user', content: toolResults })
      continue
    }

    // stop_reason inesperado (refusal, pause_turn, ...).
    console.warn(`[VIC] stop_reason inesperado: ${response.stop_reason}`)
    return unexpectedStopMessage(ultimoTexto, response.stop_reason)
  }

  console.warn(`[VIC] agentic loop agotado tras ${MAX_ITERATIONS} iteraciones`)
  return exhaustedMessage(ultimoTexto, MAX_ITERATIONS)
}

module.exports = { chat, isReady, DEFAULT_MODEL, MAX_TOKENS }
