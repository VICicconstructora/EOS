// Push proactivo de VIC a Teams (Bot Framework).
//
// Bot Framework solo puede iniciar un DM si ya tiene una "conversation
// reference" del usuario. La capturamos en cada mensaje entrante
// (saveConversationRef) y la usamos para enviar proactivamente
// (sendProactive), llamada desde el endpoint /api/push.

const { createClient } = require('@supabase/supabase-js')
const { TurnContext } = require('botbuilder')
const { emailFromAadObjectId } = require('./graph')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Guarda/actualiza la conversation reference del usuario que escribe a VIC.
async function saveConversationRef(context) {
  try {
    const ref = TurnContext.getConversationReference(context.activity)
    const from = context.activity.from || {}
    const direct =
      (from.aadObjectId && context.activity.from.userPrincipalName) ||
      (from.properties && from.properties.email) ||
      null
    // Resolver el correo real; NO caer al nombre (rompía el allowlist y el push).
    const email = direct
      ? direct.toLowerCase()
      : await emailFromAadObjectId(from.aadObjectId)

    // Sin correo resoluble no guardamos un ref con identificador basura.
    if (!email) {
      console.error('[VIC] No se pudo resolver el email del usuario; ref no guardado.')
      return
    }

    await supabase
      .from('vic_conversation_refs')
      .upsert(
        {
          company_id: 'ic-constructora',
          aad_object_id: from.aadObjectId || null,
          user_email: email,
          user_name: from.name || '',
          reference: ref,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,user_email' }
      )
  } catch (err) {
    console.error('[VIC] No se pudo guardar conversation ref:', err.message)
  }
}

// Envía un mensaje proactivo a un usuario por email. `adapter` es el
// CloudAdapter del servidor. Devuelve true si se envió.
async function sendProactive(adapter, userEmail, text) {
  const { data, error } = await supabase
    .from('vic_conversation_refs')
    .select('reference')
    .eq('company_id', 'ic-constructora')
    .eq('user_email', userEmail.toLowerCase())
    .maybeSingle()

  if (error) throw new Error(`Error leyendo conversation ref: ${error.message}`)
  if (!data?.reference) {
    throw new Error(
      `Sin conversation reference para ${userEmail}. El usuario debe escribirle a VIC al menos una vez.`
    )
  }

  await adapter.continueConversationAsync(
    process.env.BOT_APP_ID,
    data.reference,
    async (context) => {
      await context.sendActivity(text)
    }
  )
  return true
}

module.exports = { saveConversationRef, sendProactive }
