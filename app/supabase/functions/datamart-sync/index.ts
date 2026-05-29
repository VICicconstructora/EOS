// Edge Function: datamart-sync
// Lee Datamart.xlsx desde SharePoint vía Graph Excel API (sin descargar el archivo)
// y sincroniza alarmas de pólizas / licencias / crédito en la tabla `alarms`.
//
// Secretos requeridos:
//   AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
//   ALERT_FROM_EMAIL, ALERT_TO_EMAILS

import { createClient } from 'npm:@supabase/supabase-js@2'

// ── Entorno ──────────────────────────────────────────────────────────────────

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_TENANT_ID           = Deno.env.get('AZURE_TENANT_ID')!
const AZURE_CLIENT_ID           = Deno.env.get('AZURE_CLIENT_ID')!
const AZURE_CLIENT_SECRET       = Deno.env.get('AZURE_CLIENT_SECRET')!
const ALERT_FROM_EMAIL          = Deno.env.get('ALERT_FROM_EMAIL') ?? ''
const ALERT_TO_EMAILS           = Deno.env.get('ALERT_TO_EMAILS') ?? ''

const SHAREPOINT_HOST      = 'icconstructora.sharepoint.com'
const SHAREPOINT_SITE_PATH = '/sites/GND'
const FILE_NAME            = 'Datamart.xlsx'

// ── Umbrales de alarma ────────────────────────────────────────────────────────

const UMBRAL_POLIZA   = 30
const UMBRAL_LICENCIA = 60
const UMBRAL_CREDITO  = 90

// ── Mapping Datamart → slug wiki ─────────────────────────────────────────────

const PROJECT_MAP: Record<string, string> = {
  'PRAIA':               'praia-natura',
  'RESERVA DE OPORTO':   'reserva-de-oporto',
  'PRIMERA ESTE':        'primera-este',
  'LA HACIENDA JAMUNDI': 'la-hacienda-jamundi',
  'BOSQUE CENTRAL':      'bosque-central',
  'CASTILLA LIVING':     'castilla-living',
  'GAIA':                'gaia',
  'CASTILLA IMPERIAL':   'castilla-imperial',
  'AZUL TURQUESA':       'azul-turquesa',
  'AZUL CELESTE':        'azul-celeste',
  'VERDE VIVO':          'verde-vivo',
  'MITIKA':              'mitika',
  'WELL':                'well',
}

// Columnas de la hoja Proyectos (0-based)
const C = {
  Estado:           2,
  Proyecto:        12,
  Etapa:           13,
  PolizaTR:        34,
  VencTR:          36,
  PolizaRC:        40,
  VencRC:          42,
  VentasProy:      46,
  EntidadCredito:  48,
  MontoCredito:    51,
  FechaVencCred:   57,
  FechaVencProrr:  59,
  EntidadFiducia:  61,
  Responsable:     86,
  LicUrbanismo:    87,
  LicConstruccion: 89,
  VencLicConst:   108,
  ProxTramite:    116,
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Fila {
  estado: string; proyecto: string; etapa: string
  polizaTR: string; vencTR: Date | null
  polizaRC: string; vencRC: Date | null
  ventasProy: number
  entidadCredito: string; montoCredito: number
  fechaVencCred: Date | null; fechaVencProrr: Date | null
  entidadFiducia: string; responsable: string
  licUrbanismo: string; licConstruccion: string; vencLicConst: Date | null
}

interface Alarma {
  nivel: 'VENCIDA' | 'POR VENCER'
  area: string
  category: 'credito' | 'poliza_tr' | 'poliza_rc' | 'licencia'
  slug: string; etapa: string; expires_at: string; dias: number; detalle: string
}

// ── Graph API — Auth ──────────────────────────────────────────────────────────

async function getGraphToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
      }),
    }
  )
  if (!res.ok) throw new Error(`Token Graph fallido: ${res.status} ${await res.text()}`)
  const { access_token } = await res.json()
  return access_token
}

// ── Graph API — Localizar archivo en SharePoint ───────────────────────────────

interface FileRef { driveId: string; itemId: string }

async function locateFile(token: string): Promise<FileRef> {
  const h = { Authorization: `Bearer ${token}` }

  // Resolver site ID
  const siteRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_HOST}:${SHAREPOINT_SITE_PATH}`,
    { headers: h }
  )
  if (!siteRes.ok) throw new Error(`Site lookup fallido: ${siteRes.status} ${await siteRes.text()}`)
  const { id: siteId } = await siteRes.json()

  // Listar drives para encontrar la biblioteca DataMart
  const drivesRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
    { headers: h }
  )
  if (!drivesRes.ok) throw new Error(`Drives fallido: ${drivesRes.status} ${await drivesRes.text()}`)
  const { value: drives } = await drivesRes.json()

  const dmDrive = drives.find((d: { name: string }) =>
    d.name.toLowerCase() === 'datamart'
  )

  let driveId: string
  let filePath: string

  if (dmDrive) {
    driveId = dmDrive.id
    filePath = FILE_NAME
    console.log(`[datamart-sync] Biblioteca: ${dmDrive.name}`)
  } else {
    // DataMart es una carpeta dentro de la biblioteca default
    const defaultDrive = drives.find((d: { name: string }) =>
      ['documents', 'documentos', 'shared documents'].includes(d.name.toLowerCase())
    ) ?? drives[0]
    driveId = defaultDrive.id
    filePath = `DataMart/${FILE_NAME}`
    console.log(`[datamart-sync] Drive default: ${defaultDrive.name}, path: ${filePath}`)
  }

  // Obtener el item ID del archivo
  const itemRes = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${filePath}`,
    { headers: h }
  )
  if (!itemRes.ok) throw new Error(`Archivo no encontrado: ${itemRes.status} ${await itemRes.text()}`)
  const { id: itemId } = await itemRes.json()

  return { driveId, itemId }
}

// ── Graph Excel API — Leer datos de una hoja ─────────────────────────────────

async function getSheetNames(token: string, ref: FileRef): Promise<string[]> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${ref.driveId}/items/${ref.itemId}/workbook/worksheets`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Worksheets fallido: ${res.status} ${await res.text()}`)
  const { value } = await res.json()
  return value.map((ws: { name: string }) => ws.name)
}

// Columna 116 (0-based) = DL en notación Excel
// Leemos hasta fila 600 para cubrir todos los proyectos/etapas
async function getSheetRange(
  token: string, ref: FileRef, sheetName: string, range = 'A1:DL600'
): Promise<unknown[][]> {
  const encodedSheet = encodeURIComponent(sheetName)
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${ref.driveId}/items/${ref.itemId}/workbook/worksheets('${encodedSheet}')/range(address='${range}')`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Sheet range fallido [${sheetName}]: ${res.status} ${await res.text()}`)
  const { values } = await res.json()
  return values as unknown[][]
}

// ── Parseo ────────────────────────────────────────────────────────────────────

function excelDate(n: unknown): Date | null {
  if (!n || typeof n !== 'number') return null
  const ms = Math.round((n - 25569) * 86400 * 1000)
  const d  = new Date(ms)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function fmtDate(d: Date | null): string {
  if (!d) return ''
  return d.toISOString().split('T')[0]
}

function diasRestantes(d: Date | null, hoy: Date): number | null {
  if (!d) return null
  return Math.ceil((d.getTime() - hoy.getTime()) / 86400000)
}

function parseProyectos(raw: unknown[][]): Fila[] {
  // Fila 5 (índice 4) = cabeceras; datos desde índice 5
  return raw.slice(5)
    .filter(r => r[C.Proyecto] !== '' && r[C.Proyecto] != null)
    .map(r => ({
      estado:          String(r[C.Estado]         ?? '').trim(),
      proyecto:        String(r[C.Proyecto]        ?? '').trim(),
      etapa:           String(r[C.Etapa]           ?? '').trim(),
      polizaTR:        String(r[C.PolizaTR]        ?? ''),
      vencTR:          excelDate(r[C.VencTR]),
      polizaRC:        String(r[C.PolizaRC]        ?? ''),
      vencRC:          excelDate(r[C.VencRC]),
      ventasProy:      Number(r[C.VentasProy])     || 0,
      entidadCredito:  String(r[C.EntidadCredito]  ?? ''),
      montoCredito:    Number(r[C.MontoCredito])   || 0,
      fechaVencCred:   excelDate(r[C.FechaVencCred]),
      fechaVencProrr:  excelDate(r[C.FechaVencProrr]),
      entidadFiducia:  String(r[C.EntidadFiducia]  ?? ''),
      responsable:     String(r[C.Responsable]     ?? ''),
      licUrbanismo:    String(r[C.LicUrbanismo]    ?? ''),
      licConstruccion: String(r[C.LicConstruccion] ?? ''),
      vencLicConst:    excelDate(r[C.VencLicConst]),
    }))
}

// ── Alarmas ───────────────────────────────────────────────────────────────────

function generarAlarmas(filas: Fila[], hoy: Date): Alarma[] {
  const alarmas: Alarma[] = []
  const porProyecto: Record<string, Fila[]> = {}
  for (const f of filas) {
    if (!porProyecto[f.proyecto]) porProyecto[f.proyecto] = []
    porProyecto[f.proyecto].push(f)
  }

  for (const [dmName, etapas] of Object.entries(porProyecto)) {
    const slug = PROJECT_MAP[dmName]
    if (!slug) continue
    for (const e of etapas) {
      const credVenc = e.fechaVencProrr ?? e.fechaVencCred
      const diasC    = diasRestantes(credVenc, hoy)
      if (diasC !== null && diasC < UMBRAL_CREDITO)
        alarmas.push({ nivel: diasC < 0 ? 'VENCIDA' : 'POR VENCER', area: 'Crédito', category: 'credito', slug, etapa: `E${e.etapa}`, expires_at: fmtDate(credVenc), dias: diasC, detalle: `E${e.etapa}: ${e.entidadCredito}, vence ${fmtDate(credVenc)} (${diasC} días)` })

      const diasTR = diasRestantes(e.vencTR, hoy)
      if (diasTR !== null && diasTR < UMBRAL_POLIZA)
        alarmas.push({ nivel: diasTR < 0 ? 'VENCIDA' : 'POR VENCER', area: 'Póliza TR', category: 'poliza_tr', slug, etapa: `E${e.etapa}`, expires_at: fmtDate(e.vencTR), dias: diasTR, detalle: `E${e.etapa}: ${e.polizaTR}, vence ${fmtDate(e.vencTR)} (${diasTR} días)` })

      const diasRC = diasRestantes(e.vencRC, hoy)
      if (diasRC !== null && diasRC < UMBRAL_POLIZA)
        alarmas.push({ nivel: diasRC < 0 ? 'VENCIDA' : 'POR VENCER', area: 'Póliza RC', category: 'poliza_rc', slug, etapa: `E${e.etapa}`, expires_at: fmtDate(e.vencRC), dias: diasRC, detalle: `E${e.etapa}: ${e.polizaRC}, vence ${fmtDate(e.vencRC)} (${diasRC} días)` })

      const diasL = diasRestantes(e.vencLicConst, hoy)
      if (diasL !== null && diasL < UMBRAL_LICENCIA)
        alarmas.push({ nivel: diasL < 0 ? 'VENCIDA' : 'POR VENCER', area: 'Licencia Construcción', category: 'licencia', slug, etapa: `E${e.etapa}`, expires_at: fmtDate(e.vencLicConst), dias: diasL, detalle: `E${e.etapa}: venció ${fmtDate(e.vencLicConst)} (${diasL} días)` })
    }
  }
  return alarmas
}

// ── Supabase ──────────────────────────────────────────────────────────────────

async function syncAlarmas(
  supabase: ReturnType<typeof createClient>,
  alarmas: Alarma[], runTime: string
): Promise<{ upserted: number; resolved: number }> {
  const records = alarmas.map(a => ({
    company_id: 'ic-constructora',
    external_id: `${a.slug}::${a.etapa}::${a.category}`,
    project: a.slug, category: a.category, etapa: a.etapa,
    detail: a.detalle, severity: a.nivel === 'VENCIDA' ? 'alta' : 'media',
    expires_at: a.expires_at || null, dias: a.dias,
    status: 'active', last_seen_at: runTime, updated_at: runTime,
  }))

  if (records.length > 0) {
    const { error } = await supabase.from('alarms')
      .upsert(records, { onConflict: 'company_id,external_id' })
    if (error) throw new Error(`Upsert alarms: ${error.message}`)
  }

  const { data: stale } = await supabase.from('alarms').select('id')
    .eq('company_id', 'ic-constructora').eq('status', 'active').lt('last_seen_at', runTime)

  let resolved = 0
  if (stale && stale.length > 0) {
    await supabase.from('alarms')
      .update({ status: 'resolved', resolved_at: runTime, updated_at: runTime })
      .in('id', stale.map(r => r.id))
    resolved = stale.length
  }
  return { upserted: records.length, resolved }
}

// ── Email ─────────────────────────────────────────────────────────────────────

function buildEmailHtml(vencidas: Alarma[], porVencer: Alarma[], fecha: string): string {
  const fila = (a: Alarma) => {
    const ico  = a.nivel === 'VENCIDA' ? '🔴' : '🟡'
    const slug = a.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${ico}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600">${slug}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${a.area}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${a.detalle}</td></tr>`
  }
  const tabla = (rows: Alarma[]) => rows.length === 0 ? '<p style="color:#888">Ninguna</p>'
    : `<table style="border-collapse:collapse;width:100%;font-size:13px"><thead><tr style="background:#f5f5f5"><th style="padding:8px 12px;text-align:left"></th><th style="padding:8px 12px;text-align:left">Proyecto</th><th style="padding:8px 12px;text-align:left">Tipo</th><th style="padding:8px 12px;text-align:left">Detalle</th></tr></thead><tbody>${rows.map(fila).join('')}</tbody></table>`

  return `<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
    <div style="background:#1a1a2e;padding:20px 28px;border-radius:8px 8px 0 0">
      <h2 style="color:#fff;margin:0;font-size:18px">IC Constructora — Alarmas Operativas</h2>
      <p style="color:#aaa;margin:4px 0 0;font-size:13px">Sincronización Datamart · ${fecha}</p>
    </div>
    <div style="padding:24px 28px;background:#fff;border:1px solid #eee;border-top:none">
      <h3 style="color:#dc2626;margin-top:0">🔴 Vencidas (${vencidas.length})</h3>${tabla(vencidas)}
      <h3 style="color:#d97706;margin-top:24px">🟡 Por vencer — próximos 90 días (${porVencer.length})</h3>${tabla(porVencer)}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#888;font-size:12px">Generado automáticamente · <strong>Portal EOS → Alarmas</strong></p>
    </div></div>`
}

async function sendEmail(token: string, alarmas: Alarma[], fecha: string): Promise<void> {
  if (!ALERT_FROM_EMAIL || !ALERT_TO_EMAILS || alarmas.length === 0) return
  const vencidas  = alarmas.filter(a => a.nivel === 'VENCIDA')
  const porVencer = alarmas.filter(a => a.nivel === 'POR VENCER')
  const recipients = ALERT_TO_EMAILS.split(',').map(e => e.trim()).filter(Boolean)
    .map(address => ({ emailAddress: { address } }))
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${ALERT_FROM_EMAIL}/sendMail`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: `[IC EOS] ${vencidas.length} alarmas vencidas + ${porVencer.length} por vencer · ${fecha}`,
          body: { contentType: 'HTML', content: buildEmailHtml(vencidas, porVencer, fecha) },
          toRecipients: recipients,
        },
        saveToSentItems: false,
      }),
    }
  )
  if (!res.ok) console.warn(`[email] Error: ${res.status} ${await res.text()}`)
  else console.log(`[email] Enviado a: ${ALERT_TO_EMAILS}`)
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET')
    return new Response('Method not allowed', { status: 405 })

  const url      = new URL(req.url)
  const discover = url.searchParams.get('discover') === 'true'
  const started  = Date.now()
  const runTime  = new Date().toISOString()
  const hoy      = new Date(); hoy.setUTCHours(0, 0, 0, 0)
  const fecha    = hoy.toISOString().split('T')[0]
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    console.log(`[datamart-sync] Inicio ${fecha}${discover ? ' (discover)' : ''}`)
    const token = await getGraphToken()
    const ref   = await locateFile(token)

    // Modo discover: listar hojas + primeras filas
    if (discover) {
      const sheets = await getSheetNames(token, ref)
      const preview: Record<string, unknown> = {}
      for (const name of sheets) {
        try {
          const rows = await getSheetRange(token, ref, name, 'A1:T8')
          preview[name] = rows
        } catch { preview[name] = 'error al leer' }
      }
      return Response.json({ ok: true, sheets, preview })
    }

    // Modo sync normal
    console.log('[datamart-sync] Leyendo hoja Proyectos...')
    const raw    = await getSheetRange(token, ref, 'Proyectos')
    const filas  = parseProyectos(raw)
    console.log(`[datamart-sync] ${filas.length} etapas`)

    const alarmas   = generarAlarmas(filas, hoy)
    const vencidas  = alarmas.filter(a => a.nivel === 'VENCIDA')
    const porVencer = alarmas.filter(a => a.nivel === 'POR VENCER')
    console.log(`[datamart-sync] ${vencidas.length} vencidas, ${porVencer.length} por vencer`)

    const db = await syncAlarmas(supabase, alarmas, runTime)
    await sendEmail(token, alarmas, fecha)

    return Response.json({
      ok: true, fecha, elapsed_s: ((Date.now() - started) / 1000).toFixed(1),
      etapas: filas.length, alarmas: { vencidas: vencidas.length, por_vencer: porVencer.length }, db,
    })
  } catch (err) {
    const message = (err as Error).message
    console.error('[datamart-sync] Error:', message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
})
