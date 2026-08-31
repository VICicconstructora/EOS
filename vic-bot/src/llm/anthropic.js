// Adaptador del proveedor Anthropic (Claude).
//
// Mantiene el formato de tool-use nativo de Anthropic. El catálogo TOOLS ya
// está en ese formato (input_schema), así que se pasa tal cual.
//
// Key: la del usuario que habla si la registró (gasta su propia cuota); si no,
// la key compartida del bot. Claude es el primario para TODOS — antes quien no
// registraba key caía a Llama-70B, que generaba SQL poco confiable sobre SINCO.

const Anthropic = require('@anthropic-ai/sdk')
const { TOOLS, runTool, systemWithDate } = require('./tools')
const { truncatedMessage, exhaustedMessage, unexpectedStopMessage } = require('../lib/errors')

const DEFAULT_MODEL = process.env.VIC_ANTHROPIC_MODEL || 'claude-sonnet-4-6'
// 8000, no 1500: con 1500 cualquier informe por proyecto se cortaba a media
// tabla y el texto ya generado se descartaba.
const MAX_TOKENS = Number(process.env.VIC_MAX_TOKENS || 8000)
const MAX_ITERATIONS = Number(process.env.VIC_MAX_ITERATIONS || 10)

// Key compartida del bot, usada cuando el usuario no registró la suya.
const SHARED_API_KEY = process.env.VIC_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY

// Hay proveedor Anthropic si el usuario trae su key o el bot tiene la compartida.
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
          content: JSON.stringify(result, null, 2)
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
