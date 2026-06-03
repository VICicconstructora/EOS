// Traducción de errores conocidos a mensajes accionables para el usuario.
//
// El SDK de Anthropic lanza errores con `status` (HTTP) y un cuerpo con
// `error.type` / `error.message`. En vez de mostrar la jerga cruda de la API,
// clasificamos los casos comunes en un mensaje claro en español, y dejamos el
// detalle técnico para el log del servidor. Para lo no reconocido, mostramos el
// detalle al usuario (es interno) para no ocultar la causa.

// Extrae status y mensaje de la API de un error del SDK de Anthropic.
function anthropicDetails(err) {
  const status = err && (err.status || err.statusCode) || null
  // El SDK suele exponer err.error.error.message; intentamos varias formas.
  const apiMsg =
    (err && err.error && err.error.error && err.error.error.message) ||
    (err && err.error && err.error.message) ||
    null
  const apiType =
    (err && err.error && err.error.error && err.error.error.type) ||
    (err && err.error && err.error.type) ||
    null
  return { status, apiMsg, apiType }
}

// Devuelve un mensaje para el usuario final dado un error de chat().
// Reconoce: sin saldo, key inválida/ausente, rate limit, sobrecarga, timeout.
function userMessageForChatError(err) {
  const raw = (err && err.message) || ''
  const { status, apiMsg, apiType } = anthropicDetails(err)
  const blob = `${raw} ${apiMsg || ''}`.toLowerCase()

  // Key ausente (la lanza clientFor antes de llamar a la API).
  if (blob.includes('falta api key')) {
    return 'No tienes una API key de Anthropic registrada. Regístrala con `/registrar-key sk-ant-...`.'
  }

  // Saldo agotado de la cuenta de Anthropic.
  if (blob.includes('credit balance is too low') || blob.includes('credit balance')) {
    return 'Tu cuenta de Anthropic se quedó sin saldo. Recarga créditos en console.anthropic.com → Plans & Billing y vuelve a intentar.'
  }

  // Key inválida o sin permisos (401/403 o authentication_error).
  if (status === 401 || status === 403 || apiType === 'authentication_error' || blob.includes('invalid x-api-key') || blob.includes('authentication')) {
    return 'Tu API key de Anthropic no es válida o fue revocada. Regístrala de nuevo con `/registrar-key sk-ant-...`.'
  }

  // Rate limit.
  if (status === 429 || apiType === 'rate_limit_error' || blob.includes('rate limit')) {
    return 'Anthropic está limitando las solicitudes en este momento (rate limit). Espera unos segundos y vuelve a intentar.'
  }

  // Modelo inexistente o inaccesible para esta key.
  if (blob.includes('model') && (status === 404 || blob.includes('not_found') || blob.includes('not found'))) {
    return 'El modelo configurado no está disponible para tu cuenta de Anthropic. Avisa a TI para revisar la configuración del bot.'
  }

  // Sobrecarga temporal de Anthropic.
  if (status === 529 || apiType === 'overloaded_error' || blob.includes('overloaded')) {
    return 'Los servidores de Anthropic están sobrecargados ahora mismo. Intenta de nuevo en un momento.'
  }

  // Timeout / red.
  if (blob.includes('timeout') || blob.includes('timed out') || blob.includes('econnreset') || blob.includes('fetch failed')) {
    return 'La solicitud tardó demasiado o falló la conexión con Anthropic. Intenta de nuevo.'
  }

  // No reconocido: mostramos el detalle (entorno interno) para no ocultar la causa.
  const detalle = apiMsg || raw || 'sin detalle'
  return `Ocurrió un error al procesar tu solicitud. Detalle técnico: ${detalle}`
}

module.exports = { userMessageForChatError, anthropicDetails }
