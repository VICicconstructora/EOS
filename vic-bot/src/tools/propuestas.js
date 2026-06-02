const { createClient } = require('@supabase/supabase-js')

// VIC ALIMENTA el wiki sin escribir en él.
//
// Cuando un usuario aporta un dato nuevo y duradero sobre la organización,
// VIC no toca el wiki: encola una PROPUESTA en public.wiki_proposals vía la
// RPC vic_propose_wiki_update (SECURITY DEFINER, única grieta de escritura).
// El CEO / curador la revisa en la app y solo entonces se ingesta al wiki.
//
// La RPC aplica el allowlist del piloto (public.vic_piloto_aportes): si el
// proponente no está habilitado, rechaza. Aquí no se decide nada de seguridad.

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Encola una propuesta de actualización del wiki para revisión humana.
// proposto_por: email del usuario (lo provee el bot desde la actividad de Teams).
// Devuelve un mensaje corto para que VIC confirme al usuario, o el motivo
// por el que no se encoló (ej. fuera del piloto) — sin inventar.
async function proposeWikiUpdate({
  proposto_por, tipo, contenido, entidad_objetivo,
  cita_textual, confianza, origen_conversacion
} = {}) {
  if (!proposto_por?.trim()) return 'No tengo el correo del proponente; no puedo registrar la propuesta.'
  if (!contenido?.trim())    return 'Falta el contenido de la propuesta.'

  const { data, error } = await supabase.rpc('vic_propose_wiki_update', {
    p_proposto_por: proposto_por,
    p_tipo: tipo || 'otro',
    p_contenido: contenido,
    p_entidad_objetivo: entidad_objetivo || null,
    p_cita_textual: cita_textual || null,
    p_confianza: confianza || 'media',
    p_origen_conversacion: origen_conversacion || null
  })

  if (error) {
    // El error de la RPC trae el motivo (ej. "Proponente fuera del piloto").
    if (/fuera del piloto/i.test(error.message)) {
      return 'Aporte no registrado: este usuario no está habilitado para alimentar el wiki en esta fase.'
    }
    return `No pude registrar la propuesta: ${error.message}`
  }

  if (data?.duplicada) {
    return 'Ya había una propuesta pendiente idéntica; no la dupliqué.'
  }
  return 'Anoté esto para revisión del wiki. Queda pendiente de aprobación antes de incorporarse.'
}

module.exports = { proposeWikiUpdate }
