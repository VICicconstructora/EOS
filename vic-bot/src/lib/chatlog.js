// Bitácora de diálogos de VIC por usuario.
//
// Guarda cada pregunta del usuario y cada respuesta de VIC en
// vic.vic_chat_log (vía RPC SECURITY DEFINER), para analizar qué se pregunta
// y qué responde. Es best-effort: si el registro falla, NUNCA rompe el chat.

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// role ∈ {'user','assistant'}. provider solo aplica a 'assistant'.
async function logChat({ email, name, conversationId, role, content, provider }) {
  if (!email || !content) return
  try {
    const { error } = await supabase.rpc('vic_log_chat', {
      p_email: email.toLowerCase(),
      p_role: role,
      p_content: content,
      p_provider: provider || null,
      p_conversation_id: conversationId || null,
      p_name: name || null,
    })
    if (error) console.error('[VIC] Error registrando diálogo:', error.message)
  } catch (err) {
    console.error('[VIC] Error registrando diálogo:', err.message)
  }
}

module.exports = { logChat }
