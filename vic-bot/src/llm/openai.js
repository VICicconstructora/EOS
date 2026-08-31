// Adaptador para cualquier endpoint OpenAI-compatible (Chat Completions).
// Default: NVIDIA build (https://integrate.api.nvidia.com/v1), modelo
// openai/gpt-oss-120b. Todo configurable por .env.
// (meta/llama-3.3-70b-instruct llegó a su end-of-life el 2026-08-26 y devuelve
//  410 Gone: dejó a VIC sin respaldo. Verificar el modelo contra /v1/models
//  antes de cambiarlo — no todos soportan tool calling.)
//
// Usa fetch nativo (Node >=18) — sin dependencias nuevas. Convierte el catálogo
// canónico TOOLS (formato Anthropic, input_schema) al formato de function-calling
// de OpenAI, y reproduce el agentic loop con tool_calls / finish_reason.

const { TOOLS, runTool, systemWithDate } = require('./tools')
const { truncatedMessage, exhaustedMessage } = require('../lib/errors')

const BASE_URL = (process.env.VIC_OPENAI_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '')
const SHARED_API_KEY = process.env.VIC_OPENAI_API_KEY // respaldo compartido del bot
const MODEL    = process.env.VIC_OPENAI_MODEL || 'openai/gpt-oss-120b'
const MAX_TOKENS  = Number(process.env.VIC_MAX_TOKENS || 8000)
const MAX_ITERATIONS = Number(process.env.VIC_MAX_ITERATIONS || 10)
const TEMPERATURE = Number(process.env.VIC_OPENAI_TEMPERATURE || 0.2)
const TOP_P       = Number(process.env.VIC_OPENAI_TOP_P || 0.7)
// Timeout por llamada. El tier gratuito de NVIDIA puede colgar la generación
// sin responder; sin esto el usuario espera minutos. Al abortar, el dispatcher
// cae al otro proveedor (si lo hay) o devuelve un error claro rápido.
const TIMEOUT_MS  = Number(process.env.VIC_OPENAI_TIMEOUT_MS || 45000)

// TOOLS canónico (Anthropic) → herramientas de OpenAI. input_schema es JSON
// Schema estándar, idéntico a lo que OpenAI espera en function.parameters.
const OPENAI_TOOLS = TOOLS.map(t => ({
  type: 'function',
  function: { name: t.name, description: t.description, parameters: t.input_schema }
}))

// Hay proveedor OpenAI disponible si el usuario trae su propia key nvapi-...
// o si el bot tiene una key compartida de respaldo.
function isReady(userKey) {
  return !!(userKey || SHARED_API_KEY)
}

// Lanza un Error con .status para que el dispatcher distinga fallos de red/API.
async function callCompletions(messages, apiKey) {
  const key = apiKey || SHARED_API_KEY
  if (!key) throw new Error('No hay key OpenAI-compatible (ni de usuario ni VIC_OPENAI_API_KEY).')

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)
  let res
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: OPENAI_TOOLS,
        tool_choice: 'auto',
        temperature: TEMPERATURE,
        top_p: TOP_P,
        max_tokens: MAX_TOKENS,
        stream: false
      }),
      signal: ac.signal
    })
  } catch (err) {
    if (err && err.name === 'AbortError') {
      const e = new Error(`El proveedor OpenAI-compatible (${MODEL}) no respondió en ${TIMEOUT_MS} ms (timeout).`)
      e.status = 504
      throw e
    }
    throw err
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    let detail = ''
    try { detail = JSON.stringify(await res.json()) } catch { detail = await res.text().catch(() => '') }
    const err = new Error(`OpenAI-compat ${res.status}: ${detail || res.statusText}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// Agentic loop equivalente al de Anthropic, con el formato de OpenAI.
// `apiKey` es la key nvapi-... del usuario; si falta, cae a la compartida.
async function chat(history, ctx = {}, apiKey) {
  const messages = [
    { role: 'system', content: systemWithDate(ctx) },
    ...history.map(m => ({ role: m.role, content: m.content }))
  ]

  // Último texto visto: si el loop no cierra limpio, se devuelve lo escrito.
  let ultimoTexto = ''

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const data = await callCompletions(messages, apiKey)
    const choice = data.choices && data.choices[0]
    const msg = choice && choice.message
    if (!msg) throw new Error('Respuesta sin choices del endpoint OpenAI-compatible.')

    const toolCalls = msg.tool_calls || []
    const texto = (msg.content || '').trim()
    if (texto) ultimoTexto = texto

    if (toolCalls.length === 0) {
      // finish_reason 'length' = cortada por max_tokens, no es error de la API.
      if (choice.finish_reason === 'length') {
        console.warn(`[VIC] respuesta truncada por max_tokens=${MAX_TOKENS} (iteración ${iteration + 1})`)
        return truncatedMessage(texto)
      }
      return texto || 'No pude generar una respuesta. Intenta reformular la pregunta.'
    }

    // Reanexar el turno del asistente con sus tool_calls, luego cada resultado.
    messages.push({
      role: 'assistant',
      content: msg.content || '',
      tool_calls: toolCalls
    })

    for (const call of toolCalls) {
      const name = call.function && call.function.name
      let input = {}
      try {
        input = call.function && call.function.arguments
          ? JSON.parse(call.function.arguments)
          : {}
      } catch {
        input = {} // argumentos mal formados: runTool responderá con error claro
      }
      const result = await runTool(name, input, ctx)
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result, null, 2)
      })
    }
  }

  console.warn(`[VIC] agentic loop agotado tras ${MAX_ITERATIONS} iteraciones`)
  return exhaustedMessage(ultimoTexto, MAX_ITERATIONS)
}

module.exports = { chat, isReady, MODEL, BASE_URL }
