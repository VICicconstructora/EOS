const { ActivityHandler, MessageFactory } = require('botbuilder')
const { chat } = require('./claude')
const { saveConversationRef } = require('./lib/push')
const { getUserKey, setUserKey, getUserKeyHint, deleteUserKey, emailFromContext } = require('./lib/keys')

// Maneja los comandos de gestión de la API key del usuario.
// Devuelve un texto de respuesta si el mensaje era un comando, o null si no.
async function handleKeyCommand(userText, email) {
  const lower = userText.toLowerCase()

  if (lower === '/registrar-key' || lower === '/registrar-key '.trim()) {
    return 'Para registrar tu API key de Anthropic, escribe:\n\n' +
      '`/registrar-key sk-ant-...`\n\n' +
      'Consíguela en console.anthropic.com → API Keys. ' +
      'Solo se usa para que tus consultas consuman tu propia cuota; se guarda cifrada.'
  }

  if (lower.startsWith('/registrar-key ')) {
    if (!email) {
      return 'No pude identificar tu cuenta de Teams (email AAD). No puedo asociar la key.'
    }
    const apiKey = userText.slice('/registrar-key '.length).trim()
    try {
      const last4 = await setUserKey(email, apiKey)
      return `Listo. Tu API key (…${last4}) quedó registrada para ${email}. ` +
        'A partir de ahora tus consultas consumen tu propia cuota de Anthropic.\n\n' +
        'Borra el mensaje anterior con la key para que no quede visible en el chat.'
    } catch (err) {
      return `No pude registrar la key: ${err.message}`
    }
  }

  if (lower === '/mi-key') {
    if (!email) return 'No pude identificar tu cuenta de Teams.'
    const hint = await getUserKeyHint(email)
    return hint
      ? `Tienes una key registrada (…${hint}) para ${email}.`
      : `No tienes key registrada. Usa \`/registrar-key sk-ant-...\` para registrar la tuya.`
  }

  if (lower === '/borrar-key') {
    if (!email) return 'No pude identificar tu cuenta de Teams.'
    await deleteUserKey(email)
    return 'Borré tu API key registrada. No podré responder consultas hasta que registres una nueva.'
  }

  return null
}

// Historial de conversación por conversación (en memoria)
// En producción migrar a Supabase para persistencia entre reinicios
const conversations = new Map()
const MAX_TURNS = 12 // ~6 intercambios conservados

class VicBot extends ActivityHandler {
  constructor() {
    super()

    this.onMessage(async (context, next) => {
      const convId = context.activity.conversation.id
      const userText = (context.activity.text || '').trim()

      if (!userText) return await next()

      // Guardar la referencia de conversación para poder enviar push proactivos.
      await saveConversationRef(context)

      const email = await emailFromContext(context)

      // Comandos de gestión de key (/registrar-key, /mi-key, /borrar-key).
      // Se atienden antes que cualquier consulta y NO consumen tokens.
      try {
        const cmdReply = await handleKeyCommand(userText, email)
        if (cmdReply !== null) {
          await context.sendActivity(MessageFactory.text(cmdReply))
          return await next()
        }
      } catch (err) {
        console.error('[VIC] Error en comando de key:', err.message)
        await context.sendActivity('No pude procesar ese comando. Intenta de nuevo.')
        return await next()
      }

      // Resolver la API key del usuario. Sin key registrada → no se responde
      // (nadie consume la cuota de otro).
      let userKey
      try {
        userKey = await getUserKey(email)
      } catch (err) {
        console.error('[VIC] Error resolviendo key:', err.message)
      }
      if (!userKey) {
        await context.sendActivity(MessageFactory.text(
          'Antes de responderte necesito que registres tu propia API key de Anthropic, ' +
          'para que tus consultas consuman tu cuota y no la de otra persona.\n\n' +
          'Escribe: `/registrar-key sk-ant-...`\n\n' +
          '(La consigues en console.anthropic.com → API Keys. Se guarda cifrada.)'
        ))
        return await next()
      }

      // Recuperar o iniciar historial
      if (!conversations.has(convId)) conversations.set(convId, [])
      const history = conversations.get(convId)

      history.push({ role: 'user', content: userText })

      // Recortar si crece demasiado (eliminar par más antiguo)
      while (history.length > MAX_TURNS) history.splice(0, 2)

      // Indicador de escritura mientras procesa
      await context.sendActivity({ type: 'typing' })

      try {
        const response = await chat(history, userKey, { email, conversationId: convId })
        history.push({ role: 'assistant', content: response })
        await context.sendActivity(MessageFactory.text(response))
      } catch (err) {
        console.error('[VIC] Error en chat:', err.message)
        await context.sendActivity(`Ocurrió un error al procesar tu solicitud. Detalle técnico: ${err.message}`)
      }

      await next()
    })

    this.onMembersAdded(async (context, next) => {
      for (const member of context.activity.membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(
            'Soy VIC, el asistente de IC Constructora.\n\n' +
            'Puedo consultar el wiki de la empresa, las rocas trimestrales, ' +
            'el scorecard, los asuntos IDS, personas, reuniones y procesos.\n\n' +
            'Antes de empezar, registra tu propia API key de Anthropic para que ' +
            'tus consultas consuman tu cuota:\n\n`/registrar-key sk-ant-...`\n\n' +
            '¿En qué te ayudo?'
          )
        }
      }
      await next()
    })
  }
}

module.exports = VicBot
