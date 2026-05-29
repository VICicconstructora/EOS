const { ActivityHandler, MessageFactory } = require('botbuilder')
const { chat } = require('./claude')

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

      // Recuperar o iniciar historial
      if (!conversations.has(convId)) conversations.set(convId, [])
      const history = conversations.get(convId)

      history.push({ role: 'user', content: userText })

      // Recortar si crece demasiado (eliminar par más antiguo)
      while (history.length > MAX_TURNS) history.splice(0, 2)

      // Indicador de escritura mientras procesa
      await context.sendActivity({ type: 'typing' })

      try {
        const response = await chat(history)
        history.push({ role: 'assistant', content: response })
        await context.sendActivity(MessageFactory.text(response))
      } catch (err) {
        console.error('[VIC] Error en chat:', err.message)
        await context.sendActivity('No pude procesar eso. Intenta reformular la pregunta.')
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
            '¿En qué te ayudo?'
          )
        }
      }
      await next()
    })
  }
}

module.exports = VicBot
