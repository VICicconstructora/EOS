const { ActivityHandler, MessageFactory } = require('botbuilder')
const { chat } = require('./llm')
const { saveConversationRef } = require('./lib/push')
const { getUserKey, setUserKey, getUserKeyHint, deleteUserKey, emailFromContext } = require('./lib/keys')
const { userMessageForChatError, anthropicDetails } = require('./lib/errors')
const { extractFirstAttachment, hasUsableAttachment } = require('./lib/attachments')
const { uploadProofToSharePoint } = require('./lib/graph')
const { logChat } = require('./lib/chatlog')

// Instrucciones paso a paso para abrir la API gratuita de NVIDIA y pegarla.
// Se muestran al entrar al chat y con el comando /nvidia.
const NVIDIA_INSTRUCCIONES =
  'Para que yo te responda con TU propia cuota gratuita, abre tu API de NVIDIA (toma 2 minutos):\n\n' +
  '1. Entra a https://build.nvidia.com y regístrate con un correo **PERSONAL** (Gmail, Outlook, etc.).\n' +
  '   ⚠️ NO uses tu correo @icconstructora.co: la cuenta de la empresa tiene la API restringida ' +
  '("API Access Restricted by your Organization") y quedarías bloqueado.\n' +
  '2. Abre cualquier modelo, por ejemplo "Llama 3.3 70B Instruct".\n' +
  '3. A la derecha, haz clic en "Get API Key" (o "Build with this NIM" → "Generate API Key").\n' +
  '4. Copia la key que aparece — empieza con `nvapi-`.\n' +
  '5. Vuelve aquí y pégala así:\n\n' +
  '`/registrar-nvidia nvapi-...`\n\n' +
  'Se guarda cifrada, solo para ti. Después borra el mensaje con la key para que no quede a la vista.'

// Maneja los comandos de gestión de las API keys del usuario (Anthropic y NVIDIA).
// Devuelve un texto de respuesta si el mensaje era un comando, o null si no.
async function handleKeyCommand(userText, email) {
  const lower = userText.toLowerCase()

  // ── NVIDIA (OpenAI-compatible) — proveedor por defecto de VIC ──────
  if (lower === '/nvidia' || lower === '/instrucciones' || lower === '/registrar-nvidia') {
    return NVIDIA_INSTRUCCIONES
  }

  if (lower.startsWith('/registrar-nvidia ')) {
    if (!email) {
      return 'No pude identificar tu cuenta de Teams (email AAD). No puedo asociar la key.'
    }
    const apiKey = userText.slice('/registrar-nvidia '.length).trim()
    try {
      const last4 = await setUserKey(email, apiKey, 'nvidia')
      return `Listo. Tu API key de NVIDIA (…${last4}) quedó registrada para ${email}. ` +
        'A partir de ahora tus consultas consumen tu propia cuota gratuita de NVIDIA.\n\n' +
        'Borra el mensaje anterior con la key para que no quede visible en el chat.'
    } catch (err) {
      return `No pude registrar la key: ${err.message}`
    }
  }

  if (lower === '/mi-nvidia') {
    if (!email) return 'No pude identificar tu cuenta de Teams.'
    const hint = await getUserKeyHint(email, 'nvidia')
    return hint
      ? `Tienes una key de NVIDIA registrada (…${hint}) para ${email}.`
      : `No tienes key de NVIDIA registrada. Escribe \`/nvidia\` y te doy las instrucciones para abrirla.`
  }

  if (lower === '/borrar-nvidia') {
    if (!email) return 'No pude identificar tu cuenta de Teams.'
    await deleteUserKey(email, 'nvidia')
    return 'Borré tu API key de NVIDIA. Volveré a responderte con la cuota compartida del bot; ' +
      'para usar de nuevo la tuya, escribe `/nvidia`.'
  }

  // ── Anthropic (opcional; usa el propio Claude) ─────────────────────
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
      const last4 = await setUserKey(email, apiKey, 'anthropic')
      return `Listo. Tu API key (…${last4}) quedó registrada para ${email}. ` +
        'A partir de ahora tus consultas consumen tu propia cuota de Anthropic.\n\n' +
        'Borra el mensaje anterior con la key para que no quede visible en el chat.'
    } catch (err) {
      return `No pude registrar la key: ${err.message}`
    }
  }

  if (lower === '/mi-key') {
    if (!email) return 'No pude identificar tu cuenta de Teams.'
    const hint = await getUserKeyHint(email, 'anthropic')
    return hint
      ? `Tienes una key de Anthropic registrada (…${hint}) para ${email}.`
      : `No tienes key de Anthropic registrada. Usa \`/registrar-key sk-ant-...\` para registrar la tuya.`
  }

  if (lower === '/borrar-key') {
    if (!email) return 'No pude identificar tu cuenta de Teams.'
    await deleteUserKey(email, 'anthropic')
    return 'Borré tu API key de Anthropic. Seguiré respondiéndote con el modelo por defecto; ' +
      'si quieres volver a usar tu propio Claude, regístrala de nuevo con `/registrar-key sk-ant-...`.'
  }

  return null
}

// Historial de conversación por conversación (en memoria)
// En producción migrar a Supabase para persistencia entre reinicios
const conversations = new Map()
const MAX_TURNS = 12 // ~6 intercambios conservados

// Conversaciones a las que ya les mostramos las instrucciones de NVIDIA
// (para no repetirlas en cada mensaje). Se reinicia al redeployar; aceptable.
const nvidiaNudged = new Set()

class VicBot extends ActivityHandler {
  constructor() {
    super()

    this.onMessage(async (context, next) => {
      const convId = context.activity.conversation.id
      const userText = (context.activity.text || '').trim()
      const withFile = hasUsableAttachment(context.activity)

      // Sin texto y sin adjunto no hay nada que procesar.
      if (!userText && !withFile) return await next()

      // Guardar la referencia de conversación para poder enviar push proactivos.
      await saveConversationRef(context)

      const email = await emailFromContext(context)
      // Nombre visible del usuario en Teams (para la identidad y la bitácora).
      const userName = (context.activity.from && context.activity.from.name) || null

      // Registrar la pregunta del usuario (best-effort; no bloquea el chat).
      if (userText) {
        logChat({ email, name: userName, conversationId: convId, role: 'user', content: userText })
      }

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

      // Resolver las API keys del usuario (ambas opcionales):
      //   - NVIDIA (nvapi-): su cuota gratuita en el proveedor por defecto.
      //   - Anthropic (sk-ant-): si la registró, será su primario (su Claude).
      // Sin ninguna, VIC responde igual con la key compartida del bot. El
      // dispatcher en ./llm decide el orden y el fallback cruzado.
      let anthropicKey, openaiKey
      try {
        anthropicKey = await getUserKey(email, 'anthropic')
      } catch (err) {
        console.error('[VIC] Error resolviendo key Anthropic:', err.message)
      }
      try {
        openaiKey = await getUserKey(email, 'nvidia')
      } catch (err) {
        console.error('[VIC] Error resolviendo key NVIDIA:', err.message)
      }

      // Nudge de adopción: si el usuario NO tiene ninguna key propia (ni NVIDIA
      // ni Anthropic), está consumiendo la cuota compartida. Dale las
      // instrucciones para abrir la suya, UNA sola vez por conversación —
      // igual respondemos su consulta abajo con la compartida.
      if (!openaiKey && !anthropicKey && !nvidiaNudged.has(convId)) {
        nvidiaNudged.add(convId)
        try {
          await context.sendActivity(MessageFactory.text(
            'Aún no tienes tu propia API de NVIDIA registrada, así que te respondo con la cuota compartida.\n\n' +
            NVIDIA_INSTRUCCIONES
          ))
        } catch (err) {
          console.error('[VIC] Error enviando nudge NVIDIA:', err.message)
        }
      }

      // Si llegó un adjunto (foto, PDF, Excel, Word...), súbelo a SharePoint
      // como prueba y dale al modelo la URL real (no la inventa). El email de
      // quien actúa sale del contexto.
      let effectiveText = userText
      if (withFile) {
        try {
          const file = await extractFirstAttachment(context.activity)
          if (file) {
            const { url } = await uploadProofToSharePoint({
              buffer: file.buffer, filename: file.filename,
              personEmail: email, contentType: file.contentType,
            })
            const note =
              `[Sistema: el usuario adjuntó el archivo "${file.filename}", guardado como prueba en: ${url} . ` +
              `Si corresponde a cerrar una tarea, usa submit_task_proof con EXACTAMENTE ese proof_url; ` +
              `no inventes otra URL. Si no sabes a qué tarea, lista get_my_tasks y pregúntale cuál.]`
            effectiveText = userText ? `${userText}\n\n${note}` : `Adjunté este archivo como prueba.\n\n${note}`
          }
        } catch (err) {
          console.error('[VIC] Error procesando adjunto de prueba:', err.message)
          await context.sendActivity(MessageFactory.text(
            `No pude guardar el archivo como prueba: ${err.message}`
          ))
          return await next()
        }
      }

      // Recuperar o iniciar historial
      if (!conversations.has(convId)) conversations.set(convId, [])
      const history = conversations.get(convId)

      history.push({ role: 'user', content: effectiveText })

      // Recortar si crece demasiado (eliminar par más antiguo)
      while (history.length > MAX_TURNS) history.splice(0, 2)

      // Indicador de escritura mientras procesa
      await context.sendActivity({ type: 'typing' })

      try {
        const { text: response, provider } = await chat(
          history,
          { email, name: userName, conversationId: convId },
          { anthropicKey, openaiKey }
        )
        console.log(`[VIC] Respuesta vía proveedor: ${provider} (email=${email || 'desconocido'})`)
        history.push({ role: 'assistant', content: response })
        // Registrar la respuesta de VIC (best-effort).
        logChat({ email, name: userName, conversationId: convId, role: 'assistant', content: response, provider })
        await context.sendActivity(MessageFactory.text(response))
      } catch (err) {
        const { status, apiType, apiMsg } = anthropicDetails(err)
        console.error(
          `[VIC] Error en chat (email=${email || 'desconocido'}, status=${status || '-'}, type=${apiType || '-'}):`,
          apiMsg || err.message
        )
        await context.sendActivity(MessageFactory.text(userMessageForChatError(err)))
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
            'Para arrancar, abre tu API gratuita de NVIDIA y pégamela — así respondes con tu propia cuota:\n\n' +
            NVIDIA_INSTRUCCIONES + '\n\n' +
            'Cuando quieras, escribe `/nvidia` para ver de nuevo estos pasos. ' +
            '(Opcional: si prefieres tu propio Claude, usa `/registrar-key sk-ant-...`.)\n\n' +
            '¿En qué te ayudo?'
          )
        }
      }
      await next()
    })
  }
}

module.exports = VicBot
