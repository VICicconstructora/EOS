// Edge Function: alarmas-push
// 1. Recalcula las alarmas de listas de precios (recompute_alarmas_listas_precio).
// 2. Busca alarmas ACTIVAS aún no notificadas (pushed_at IS NULL).
// 3. Las envía a Juan Paulo por Teams llamando al endpoint /api/push de VIC,
//    que las entrega como mensaje proactivo del bot.
// 4. Marca pushed_at y deja bitácora en vic_push_log.
//
// Secretos requeridos:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   VIC_PUSH_URL        — ej: https://vic-ic-constructora.azurewebsites.net/api/push
//   VIC_PUSH_SECRET     — mismo valor que el VIC_PUSH_SECRET del bot
//   ALERT_TO_EMAILS     — email destino (Juan Paulo). Coma-separado; se usa el primero.

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VIC_PUSH_URL              = Deno.env.get('VIC_PUSH_URL') ?? ''
const VIC_PUSH_SECRET           = Deno.env.get('VIC_PUSH_SECRET') ?? ''
const ALERT_TO_EMAILS           = Deno.env.get('ALERT_TO_EMAILS') ?? ''

const PROJECT_LABELS: Record<string, string> = {
  'praia-natura': 'Praia Natura', 'reserva-de-oporto': 'Reserva de Oporto',
  'primera-este': 'Primera Este', 'la-hacienda-jamundi': 'La Hacienda Jamundí',
  'bosque-central': 'Bosque Central', 'castilla-living': 'Castilla Living',
  'gaia': 'Gaia', 'castilla-imperial': 'Castilla Imperial',
}

const CATEGORY_LABELS: Record<string, string> = {
  credito: 'Crédito', poliza_tr: 'Póliza TR', poliza_rc: 'Póliza RC',
  licencia: 'Licencia', lista_precio: 'Lista de precios',
}

function formatAlarm(a: Record<string, unknown>): string {
  const proj = PROJECT_LABELS[a.project as string] ?? a.project
  const cat  = CATEGORY_LABELS[a.category as string] ?? a.category
  const sev  = a.severity === 'alta' ? '🔴' : '🟡'
  const etapa = a.etapa ? ` (etapa ${a.etapa})` : ''
  return `${sev} ${proj}${etapa} — ${cat}: ${a.detail}`
}

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const toEmail = ALERT_TO_EMAILS.split(',')[0]?.trim()

  try {
    // 1. Recalcular alarmas de listas de precios.
    await supabase.rpc('recompute_alarmas_listas_precio')

    // 2. Alarmas activas no notificadas.
    const { data: nuevas, error } = await supabase
      .from('alarms')
      .select('*')
      .eq('company_id', 'ic-constructora')
      .eq('status', 'active')
      .is('pushed_at', null)
      .order('severity', { ascending: true })
      .order('dias', { ascending: true })

    if (error) throw new Error(`Leyendo alarmas: ${error.message}`)

    if (!nuevas || nuevas.length === 0) {
      return Response.json({ status: 'ok', enviadas: 0, mensaje: 'sin alarmas nuevas' })
    }

    if (!VIC_PUSH_URL || !VIC_PUSH_SECRET || !toEmail) {
      throw new Error('Falta configurar VIC_PUSH_URL, VIC_PUSH_SECRET o ALERT_TO_EMAILS')
    }

    // 3. Construir y enviar el mensaje.
    const lineas = nuevas.map(formatAlarm).join('\n')
    const text =
      `**VIC — ${nuevas.length} alarma${nuevas.length !== 1 ? 's' : ''} nueva${nuevas.length !== 1 ? 's' : ''}**\n\n` +
      lineas +
      `\n\nRevisa el detalle en el portal → /alarmas`

    const pushRes = await fetch(VIC_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-vic-push-secret': VIC_PUSH_SECRET },
      body: JSON.stringify({ to_email: toEmail, text }),
    })

    const pushOk = pushRes.ok
    const pushBody = await pushRes.text()

    // 4. Bitácora + marcar pushed_at solo si se envió.
    const ids = nuevas.map((a) => a.external_id as string)
    await supabase.from('vic_push_log').insert({
      channel: 'teams',
      to_email: toEmail,
      subject: `${nuevas.length} alarmas nuevas`,
      body: text,
      ref_kind: 'alarms',
      ref_ids: ids,
      status: pushOk ? 'sent' : 'failed',
      error: pushOk ? '' : `${pushRes.status} ${pushBody}`,
    })

    if (!pushOk) {
      throw new Error(`VIC /api/push respondió ${pushRes.status}: ${pushBody}`)
    }

    const now = new Date().toISOString()
    await supabase
      .from('alarms')
      .update({ pushed_at: now })
      .eq('company_id', 'ic-constructora')
      .in('external_id', ids)

    return Response.json({ status: 'ok', enviadas: nuevas.length, to: toEmail })
  } catch (err) {
    console.error('[alarmas-push]', err)
    return Response.json({ status: 'error', error: String(err) }, { status: 500 })
  }
})
