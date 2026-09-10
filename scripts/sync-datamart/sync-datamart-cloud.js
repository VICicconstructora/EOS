/**
 * sync-datamart-cloud.js — versión para GitHub Actions
 *
 * Lee Datamart.xlsx directamente desde SharePoint vía Microsoft Graph API
 * (sin descargar el archivo; usa la Graph Excel API para obtener los datos
 * como JSON). Actualiza alarmas en Supabase y envía email via Graph sendMail.
 *
 * Variables de entorno requeridas (GitHub Secrets):
 *   AZURE_TENANT_ID      — tenant de Entra ID (129cb8aa-...)
 *   AZURE_CLIENT_ID      — app registration client ID
 *   AZURE_CLIENT_SECRET  — secret del app registration
 *   SUPABASE_URL         — https://zbjwasufengayvmutypr.supabase.co
 *   SUPABASE_SERVICE_KEY — service_role key de Supabase
 *   ALERT_FROM_EMAIL     — jmacallister@icconstructora.co
 *   ALERT_TO_EMAILS      — jmacallister@icconstructora.co
 *
 * Variables opcionales:
 *   WIKI_ROOT            — ruta local al wiki de Obsidian (solo en ejecución local)
 */

'use strict';

// ─── .env centralizado (raíz del repo) ────────────────────────────────────────
// Carga sin dependencias. No pisa variables ya definidas (en CI llegan por
// GitHub Secrets y el archivo no existe → no-op).
(() => {
  const fs = require('fs'), path = require('path');
  const envPath = path.resolve(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2];
    const c = v.indexOf(' #'); if (c !== -1) v = v.slice(0, c);
    v = v.trim().replace(/^["']|["']$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
})();

// ─── Configuración SharePoint ─────────────────────────────────────────────────

const SHAREPOINT_HOST      = 'icconstructora.sharepoint.com';
const SHAREPOINT_SITE_PATH = '/sites/GND';
const FILE_NAME            = 'Datamart.xlsx';
const SHEET_NAME           = 'Proyectos';
const DATA_RANGE           = 'A1:DM300';   // 300 filas cubre las ~130 etapas actuales
const DISCOVER_RANGE       = 'A1:P15';     // para debug: primeras 15 filas, columnas A-P

// ─── Configuración de alarmas ─────────────────────────────────────────────────

const UMBRAL_POLIZA   = 30;
const UMBRAL_LICENCIA = 60;
const UMBRAL_CREDITO  = 90;
// Días que una solicitud radicada (prórroga, renovación, revalidación) cuenta como
// gestión viva. Pasados estos, el trámite está estancado: la alarma pierde el fondo
// verde y vuelve a verse como lo que es, un vencimiento que nadie está moviendo.
const UMBRAL_GESTION  = 90;

// Índices de columnas (0-based) en la hoja Proyectos
// La columna A (índice 0) siempre está vacía; los datos reales empiezan en B (índice 1)
// Confirmado con discover mode: fila 6 = ["",1,"PR1","ACTIVO",...,"PRAIA",1,1,...]
const C = {
  Estado:           3,   // col D
  CodSinco:         4,   // col E
  Proyecto:        13,   // col N
  Etapa:           14,   // col O
  Torres:          15,   // col P
  PolizaTR:        35,
  VencTR:          37,
  PolizaRC:        41,
  VencRC:          43,
  VentasProy:      47,
  EntidadCredito:  49,
  MontoCredito:    52,
  FechaVencCred:   58,
  FechaVencProrr:  60,
  NumProrrogas:    61,
  EntidadFiducia:  62,
  Responsable:     87,
  LicUrbanismo:    88,
  LicConstruccion: 90,
  VencLicConst:   109,
  ProxTramite:    117,
};

// Nombre en Datamart → slug wiki
const PROJECT_MAP = {
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
};

// ─── Credenciales ─────────────────────────────────────────────────────────────

const TENANT_ID     = process.env.AZURE_TENANT_ID;
const CLIENT_ID     = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const SUPABASE_URL  = process.env.SUPABASE_URL         || '';
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const FROM_EMAIL    = process.env.ALERT_FROM_EMAIL     || '';
const TO_EMAILS     = (process.env.ALERT_TO_EMAILS     || '').split(',').map(e => e.trim()).filter(Boolean);

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('ERROR: Faltan AZURE_TENANT_ID, AZURE_CLIENT_ID o AZURE_CLIENT_SECRET');
  process.exit(1);
}

// ─── Fecha ────────────────────────────────────────────────────────────────────

// Todo texto visible (email, detalle de alarma) lleva el mes en letras:
// 2026-May-12. El formato ISO queda solo para las columnas DATE de Supabase.
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const TODAY_STR = `${TODAY.getFullYear()}-${MESES[TODAY.getMonth()]}-${String(TODAY.getDate()).padStart(2, '0')}`;

// ─── Microsoft Graph — autenticación ─────────────────────────────────────────

async function getGraphToken() {
  const url  = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope:         'https://graph.microsoft.com/.default',
  });
  const res = await fetch(url, { method: 'POST', body });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Token error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function graphGet(token, path) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Graph GET ${path} → ${res.status}: ${txt}`);
  }
  return res.json();
}

// ─── Localizar Datamart.xlsx en SharePoint ────────────────────────────────────

async function locateFile(token) {
  // 1. Resolver site ID
  const site = await graphGet(token, `/sites/${SHAREPOINT_HOST}:${SHAREPOINT_SITE_PATH}`);
  const siteId = site.id;

  // 2. Buscar la library "DataMart" entre los drives del sitio
  const drivesData = await graphGet(token, `/sites/${siteId}/drives`);
  const drives = drivesData.value || [];
  const datamartDrive = drives.find(d => d.name.toLowerCase() === 'datamart');

  let driveId, filePath;
  if (datamartDrive) {
    driveId  = datamartDrive.id;
    filePath = FILE_NAME;
  } else {
    // Fallback: drive raíz + subcarpeta DataMart
    const defaultDrive = await graphGet(token, `/sites/${siteId}/drive`);
    driveId  = defaultDrive.id;
    filePath = `DataMart/${FILE_NAME}`;
  }

  // 3. Obtener item ID del archivo
  const item = await graphGet(token, `/drives/${driveId}/root:/${filePath}`);
  return { driveId, itemId: item.id };
}

// ─── Leer hoja con Graph Excel API ───────────────────────────────────────────

async function getSheetData(token, ref) {
  const { driveId, itemId } = ref;
  const encodedSheet = encodeURIComponent(SHEET_NAME);
  const path = `/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodedSheet}')/range(address='${DATA_RANGE}')`;
  const data = await graphGet(token, path);
  return data.values;   // array 2D de celdas
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function excelDate(n) {
  if (!n || typeof n !== 'number') return null;
  const d = new Date(Math.round((n - 25569) * 86400 * 1000));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Texto visible. Las fechas de excelDate() están normalizadas a medianoche UTC,
// por eso se leen con getUTC* (con los locales se correría un día en UTC-5).
function fmtDate(d) {
  if (!d) return '';
  return `${d.getUTCFullYear()}-${MESES[d.getUTCMonth()]}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Solo para la columna DATE de Supabase, que exige ISO.
function isoDate(d) {
  if (!d) return '';
  return d.toISOString().split('T')[0];
}

function diasRestantes(d) {
  if (!d) return null;
  return Math.ceil((d.getTime() - TODAY.getTime()) / 86400000);
}

// Una solicitud solo marca la alarma como gestionada mientras sea reciente:
// radicada hace UMBRAL_GESTION días o menos. Un trámite pedido hace un año y sin
// respuesta no es gestión, es abandono.
function gestionVigente(solic) {
  const dias = diasRestantes(solic);
  return dias !== null && dias >= -UMBRAL_GESTION;
}

function iconoAlarma(dias, umbral) {
  if (dias === null) return '';
  if (dias < 0)      return ' 🔴';
  if (dias < umbral) return ' 🟡';
  return '';
}

function fmtMonto(n) {
  if (!n || typeof n !== 'number' || n === 0) return '—';
  return '$' + (n / 1e9).toFixed(1) + 'B';
}

// ─── Resolución de columnas por nombre de cabecera ───────────────────────────
// Las columnas de renovación/solicitud/prórrogas se ubican por su nombre en la
// fila de cabeceras (fila 5), NO por índice fijo: los índices difieren entre el
// sync local y el cloud y no deben adivinarse. Si la cabecera no existe, la
// columna queda en null y su señal simplemente no se aplica.

function norm(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quita acentos
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function resolveCol(headerRow, targets) {
  const list = Array.isArray(targets) ? targets : [targets];
  for (const target of list) {
    const t = norm(target);
    let idx = headerRow.findIndex(h => norm(h) === t);          // match exacto
    if (idx < 0) idx = headerRow.findIndex(h => norm(h).includes(t)); // contiene
    if (idx >= 0) return idx;
  }
  return null;
}

// Índices confirmados contra la cabecera real (2026-06-10): TR 38/39/40, RC
// 44/45/46, crédito solicitud prórroga 59. Se resuelven por nombre igualmente
// para sobrevivir reordenamientos de columnas en el Datamart.
function buildDCOL(headerRow) {
  return {
    vencRenovTR:    resolveCol(headerRow, 'Poliza Vencimiento Renovacion Todo Riesgo'),
    solicRenovTR:   resolveCol(headerRow, 'Poliza Solicitud Renovacion Todo Riesgo'),
    numProrrogasTR: resolveCol(headerRow, 'Poliza Numero Prorrogas Todo Riesgo'),
    vencRenovRC:    resolveCol(headerRow, 'Poliza Vencimiento Renovacion RC'),
    solicRenovRC:   resolveCol(headerRow, 'Poliza Solicitud Renovacion RC'),
    numProrrogasRC: resolveCol(headerRow, 'Poliza Numero Prorrogas RC'),
    solicProrrCred: resolveCol(headerRow, 'Fecha Solicitud Prorroga'),
    // Licencia de Construcción: cascada Original → Prórroga → Revalidación → Prórroga Revalidación.
    // Cada etapa aprobada llena su propia columna "Vencimiento"; sin contador propio en
    // el Datamart, se deriva contando cuántas etapas de vencimiento están llenas.
    solicLicProrr:         resolveCol(headerRow, 'Licencia Construccion Solicitud Prorroga'),
    vencLicProrr:           resolveCol(headerRow, 'Licencia Construccion Vencimiento Prorroga'),
    solicLicRevalida:      resolveCol(headerRow, 'Licencia Construccion Solicitud Revalidacion'),
    vencLicRevalida:        resolveCol(headerRow, 'Licencia Construccion Vencimiento Revalidacion'),
    solicLicProrrRevalida: resolveCol(headerRow, 'Licencia Construccion Solicitud Prorroga Revalidacion'),
    vencLicProrrRevalida:   resolveCol(headerRow, 'Licencia Construccion Vencimiento Prorroga Revalidacion'),
  };
}

// Fecha de vencimiento vigente de la licencia: la última etapa con "Vencimiento"
// aprobado. Si la etapa siguiente tiene "Solicitud" pero no "Vencimiento" aún,
// hay un trámite en curso (se anota, no silencia la alarma).
function licenciaVigente(e) {
  const etapas = [
    { venc: e.vencLicConst,        solic: null },
    { venc: e.vencLicProrr,         solic: e.solicLicProrr },
    { venc: e.vencLicRevalida,      solic: e.solicLicRevalida },
    { venc: e.vencLicProrrRevalida, solic: e.solicLicProrrRevalida },
  ];
  let idxVigente = -1;
  etapas.forEach((et, i) => { if (et.venc) idxVigente = i; });
  const vencEf = idxVigente >= 0 ? etapas[idxVigente].venc : null;
  const siguiente = etapas[idxVigente + 1];
  const solicPendiente = siguiente && siguiente.solic && !siguiente.venc ? siguiente.solic : null;
  return { vencEf, numRenovaciones: Math.max(idxVigente, 0), solicPendiente };
}

function logDCOL(dcol, headerRow) {
  console.log('[cols] Columnas de renovación resueltas por cabecera:');
  for (const [k, v] of Object.entries(dcol)) {
    console.log(`  ${k.padEnd(16)} → ${v === null ? 'NO ENCONTRADA' : `índice ${v} ("${headerRow[v]}")`}`);
  }
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

async function supabaseUpsert(table, rows, conflictColumn) {
  if (!SUPABASE_URL || !SUPABASE_KEY || rows.length === 0) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflictColumn}`, {
    method:  'POST',
    headers: {
      apikey:          SUPABASE_KEY,
      Authorization:   `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) console.warn(`[supabase] Error en ${table}: ${res.status} ${await res.text()}`);
}

async function supabaseResolveStale(runTime) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  const CATEGORIAS = 'credito,poliza_tr,poliza_rc,licencia';   // no tocar lista_precio: la escribe otro proceso
  const staleUrl = `${SUPABASE_URL}/rest/v1/alarms?company_id=eq.ic-constructora&status=in.(active,acknowledged)&category=in.(${CATEGORIAS})&last_seen_at=lt.${encodeURIComponent(runTime)}`;
  const res = await fetch(staleUrl, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return;
  const stale = await res.json();
  if (stale.length === 0) return;

  console.log(`[supabase] Resolviendo ${stale.length} alarmas obsoletas...`);
  for (const alarm of stale) {
    await fetch(`${SUPABASE_URL}/rest/v1/alarms?id=eq.${alarm.id}`, {
      method:  'PATCH',
      headers: {
        apikey:         SUPABASE_KEY,
        Authorization:  `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer:         'return=minimal',
      },
      body: JSON.stringify({ status: 'resolved', resolved_at: runTime }),
    });
  }
}

// ─── Tareas EOS (módulo de VIC) ───────────────────────────────────────────────
//
// Las tareas viven en public.tasks y las asigna VIC por Teams. El correo es el
// tablero de control: qué se pidió, a quién, quién respondió y qué se cerró.
//
// Se aplica la misma convención que las alarmas — el icono es el estado; el
// fondo es la gestión. Una tarea vencida sigue roja aunque el responsable se
// haya comprometido a una fecha; lo que hace el compromiso es marcarla
// gestionada y ponerle fondo verde, para separarla de la que nadie ha tocado.

const VENTANA_CIERRES = 7;    // días hacia atrás para "cerradas recientemente"
const UMBRAL_TAREA    = 7;    // días para que una tarea abierta pase a 🟡

const ESTADO_TAREA = {
  assigned:    'Sin aceptar',
  accepted:    'Comprometida',
  in_progress: 'En curso',
  blocked:     'Bloqueada',
  submitted:   'Con prueba, sin verificar',
};

// Las fechas de tasks llegan como 'YYYY-MM-DD' (columnas DATE) o como
// timestamptz. Se normalizan a medianoche UTC para que fmtDate() y
// diasRestantes() las lean igual que las del Datamart.
function fechaTarea(v) {
  if (!v) return null;
  const d = new Date(String(v).slice(0, 10) + 'T00:00:00Z');
  return isNaN(d.getTime()) ? null : d;
}

function personaTarea(nombre, email) {
  return nombre || (email || '').split('@')[0] || '—';
}

async function fetchTareas() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const campos = 'id,title,assigned_to,assigned_name,created_by,created_by_name,' +
                 'due_date,committed_date,status,priority,proof_url,verified_by,' +
                 'verified_at,completed_at,created_at';
  const url = `${SUPABASE_URL}/rest/v1/tasks?company_id=eq.ic-constructora` +
              `&select=${campos}&order=created_at.desc&limit=500`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) {
    console.warn(`[tareas] Error leyendo tasks: ${res.status} ${await res.text()}`);
    return null;
  }
  return res.json();
}

// Reparte las tareas en los tres grupos del correo. El orden importa: una
// tarea 'submitted' aparece SOLO en "esperando verificación" — es donde
// bloquea a alguien — y no se repite en abiertas.
function clasificarTareas(tareas) {
  // null = la lectura falló. Se propaga para no confundir "no pude leer" con
  // "no hay tareas": la sección se omite en vez de mentir con un cero.
  if (tareas === null) return null;

  const filas = tareas.map(t => {
    const ancla = fechaTarea(t.committed_date) || fechaTarea(t.due_date);
    return {
      titulo:      t.title || '(sin título)',
      responsable: personaTarea(t.assigned_name, t.assigned_to),
      asigno:      personaTarea(t.created_by_name, t.created_by),
      verifico:    personaTarea('', t.verified_by),
      estado:      t.status,
      prioridad:   t.priority,
      pruebaUrl:   t.proof_url || '',
      ancla,
      dias:        diasRestantes(ancla),
      // El compromiso es la señal de que el responsable ya respondió.
      gestionada:  Boolean(t.committed_date),
      cerrada:     fechaTarea(t.verified_at || t.completed_at),
    };
  });

  const porVerificar = filas.filter(f => f.estado === 'submitted');
  const abiertas = filas
    .filter(f => !['done', 'cancelled', 'submitted'].includes(f.estado))
    .sort((a, b) => {
      if (a.dias === null) return 1;
      if (b.dias === null) return -1;
      return a.dias - b.dias;          // lo más vencido primero
    });
  const cerradas = filas
    .filter(f => f.estado === 'done' && f.cerrada &&
                 diasRestantes(f.cerrada) >= -VENTANA_CIERRES)
    .sort((a, b) => b.cerrada - a.cerrada);

  return { porVerificar, abiertas, cerradas, total: filas.length };
}

function buildTareasHtml(t) {
  if (!t) return '';

  const TD_BASE  = 'padding:6px 12px;border-bottom:1px solid #eee';
  const TD_VERDE = 'padding:6px 12px;border-bottom:1px solid #d1fae5;background:#ecfdf5';

  const encabezado = cols => `<thead><tr style="background:#f5f5f5">${
    cols.map(c => `<th style="padding:8px 12px;text-align:left">${c}</th>`).join('')
  }</tr></thead>`;

  const tabla = (cols, filas) =>
    filas.length === 0
      ? '<p style="color:#888">Ninguna</p>'
      : `<table style="border-collapse:collapse;width:100%;font-size:13px">
           ${encabezado(cols)}<tbody>${filas.join('')}</tbody>
         </table>`;

  // 1. Esperando verificación — lo que bloquea a quien asignó.
  const filasVerificar = t.porVerificar.map(f => {
    const prueba = f.pruebaUrl
      ? `<a href="${f.pruebaUrl}" style="color:#2563eb">ver prueba</a>`
      : '—';
    return `<tr>
      <td style="${TD_BASE}">📎</td>
      <td style="${TD_BASE};font-weight:600">${f.titulo}</td>
      <td style="${TD_BASE}">${f.responsable}</td>
      <td style="${TD_BASE}">${f.asigno}</td>
      <td style="${TD_BASE}">${prueba}</td>
    </tr>`;
  });

  // 2. Abiertas — icono por urgencia, fondo verde si ya hay compromiso.
  const filasAbiertas = t.abiertas.map(f => {
    const ico = f.dias === null ? '⚪' : (f.dias < 0 ? '🔴' : (f.dias < UMBRAL_TAREA ? '🟡' : '🟢'));
    const td  = f.gestionada ? TD_VERDE : TD_BASE;
    const cuando = f.ancla
      ? `${fmtDate(f.ancla)}${f.dias < 0 ? ` (${Math.abs(f.dias)}d vencida)` : ''}`
      : 'sin fecha';
    return `<tr>
      <td style="${td}">${ico}</td>
      <td style="${td};font-weight:600">${f.titulo}</td>
      <td style="${td}">${f.responsable}</td>
      <td style="${td}">${f.asigno}</td>
      <td style="${td}">${cuando}</td>
      <td style="${td}">${ESTADO_TAREA[f.estado] || f.estado}</td>
    </tr>`;
  });

  // 3. Cerradas en la ventana — quién la resolvió y quién la dio por buena.
  const filasCerradas = t.cerradas.map(f => `<tr>
      <td style="${TD_BASE}">✅</td>
      <td style="${TD_BASE};font-weight:600">${f.titulo}</td>
      <td style="${TD_BASE}">${f.responsable}</td>
      <td style="${TD_BASE}">${f.verifico}</td>
      <td style="${TD_BASE}">${fmtDate(f.cerrada)}</td>
    </tr>`);

  const vencidas = t.abiertas.filter(f => f.dias !== null && f.dias < 0).length;
  const resumen = t.total === 0
    ? 'Todavía no hay tareas registradas. Se crean pidiéndoselo a VIC en Teams.'
    : `${t.abiertas.length} abiertas${vencidas ? ` (${vencidas} vencidas)` : ''} · ` +
      `${t.porVerificar.length} esperando verificación · ` +
      `${t.cerradas.length} cerradas en los últimos ${VENTANA_CIERRES} días`;

  return `
        <hr style="border:none;border-top:1px solid #eee;margin:28px 0 20px">
        <h3 style="color:#1a1a2e;margin:0 0 4px">Tareas EOS</h3>
        <p style="color:#666;font-size:13px;margin:0 0 16px">${resumen}</p>

        <h4 style="color:#7c3aed;margin:16px 0 8px;font-size:14px">Esperando verificación (${t.porVerificar.length})</h4>
        ${tabla(['', 'Tarea', 'Responsable', 'Asignó', 'Prueba'], filasVerificar)}

        <h4 style="color:#d97706;margin:20px 0 8px;font-size:14px">Abiertas (${t.abiertas.length})</h4>
        ${tabla(['', 'Tarea', 'Responsable', 'Asignó', 'Compromiso', 'Estado'], filasAbiertas)}

        <h4 style="color:#059669;margin:20px 0 8px;font-size:14px">Cerradas en los últimos ${VENTANA_CIERRES} días (${t.cerradas.length})</h4>
        ${tabla(['', 'Tarea', 'Responsable', 'Verificó', 'Cerrada'], filasCerradas)}`;
}

// ─── Email via Graph API ──────────────────────────────────────────────────────

function buildEmailHtml(vencidas, porVencer, tareas) {
  // El 🔴/🟡 dice qué tan grave está el hecho; el fondo dice si alguien ya lo está
  // gestionando. Una alarma con solicitud de prórroga, renovación o revalidación
  // radicada sigue siendo roja — el documento está vencido — pero va sobre verde
  // para distinguirla de la que nadie ha tocado.
  function filaHtml(a) {
    const ico  = a.nivel === 'VENCIDA' ? '🔴' : '🟡';
    const nombre = a.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const td = a.gestionada
      ? 'padding:6px 12px;border-bottom:1px solid #d1fae5;background:#ecfdf5'
      : 'padding:6px 12px;border-bottom:1px solid #eee';
    return `<tr>
      <td style="${td}">${ico}</td>
      <td style="${td};font-weight:600">${nombre}</td>
      <td style="${td}">${a.area}</td>
      <td style="${td}">${a.detalle}</td>
    </tr>`;
  }

  const tablaHtml = rows =>
    rows.length === 0
      ? '<p style="color:#888">Ninguna</p>'
      : `<table style="border-collapse:collapse;width:100%;font-size:13px">
           <thead><tr style="background:#f5f5f5">
             <th style="padding:8px 12px;text-align:left"></th>
             <th style="padding:8px 12px;text-align:left">Proyecto</th>
             <th style="padding:8px 12px;text-align:left">Tipo</th>
             <th style="padding:8px 12px;text-align:left">Detalle</th>
           </tr></thead>
           <tbody>${rows.map(filaHtml).join('')}</tbody>
         </table>`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
      <div style="background:#1a1a2e;padding:20px 28px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">IC Constructora — Alarmas Operativas</h2>
        <p style="color:#aaa;margin:4px 0 0;font-size:13px">Sincronización Datamart · ${TODAY_STR}</p>
      </div>
      <div style="padding:24px 28px;background:#fff;border:1px solid #eee;border-top:none">
        <h3 style="color:#dc2626;margin-top:0">Vencidas (${vencidas.length})</h3>
        ${tablaHtml(vencidas)}
        <h3 style="color:#d97706;margin-top:24px">Por vencer en los próximos 90 días (${porVencer.length})</h3>
        ${tablaHtml(porVencer)}
        ${buildTareasHtml(tareas)}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="font-size:12px;color:#555;margin:0 0 8px">
          <span style="display:inline-block;width:12px;height:12px;background:#ecfdf5;border:1px solid #d1fae5;vertical-align:middle"></span>
          Fondo verde: en alarmas, ya hay una solicitud radicada (prórroga, renovación o
          revalidación); en tareas, el responsable ya se comprometió a una fecha.
          El estado sigue siendo el del icono — el fondo solo indica que está gestionada.
        </p>
        <p style="color:#888;font-size:12px">Generado automáticamente por el sistema EOS de IC Constructora.</p>
      </div>
    </div>`;

  return html;
}

async function sendEmail(token, vencidas, porVencer, tareas) {
  if (!FROM_EMAIL || TO_EMAILS.length === 0) {
    console.log('[email] Omitido — configura ALERT_FROM_EMAIL y ALERT_TO_EMAILS.');
    return;
  }

  const html = buildEmailHtml(vencidas, porVencer, tareas);

  const message = {
    message: {
      subject: `[IC EOS] ${vencidas.length} alarmas vencidas + ${porVencer.length} por vencer · ${TODAY_STR}`,
      body:    { contentType: 'HTML', content: html },
      toRecipients: TO_EMAILS.map(e => ({ emailAddress: { address: e } })),
    },
    saveToSentItems: false,
  };

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${FROM_EMAIL}/sendMail`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (res.ok || res.status === 202) {
    console.log(`[email] Enviado a: ${TO_EMAILS.join(', ')}`);
  } else {
    console.warn(`[email] Error ${res.status}: ${await res.text()}`);
  }
}

// ─── Lógica de alarmas ────────────────────────────────────────────────────────

function buildAlarms(slug, etapas) {
  const alarmas = [];

  etapas.forEach(e => {
    // Solo alarmar etapas activas. Las entregadas/cerradas conservan fechas
    // viejas que generaban alarmas fantasma (créditos/pólizas vencidos 2021-2023).
    if (String(e.estado).trim().toUpperCase() !== 'ACTIVO') return;

    // Crédito. La fecha de vencimiento prorrogada anula la original
    // (fechaVencProrr || fechaVencCred). La solicitud de prórroga avisa pero no
    // silencia; el nº de prórrogas (columna aparte) se anota como control.
    const credVenc = e.fechaVencProrr || e.fechaVencCred;
    const diasC = diasRestantes(credVenc);
    if (diasC !== null && diasC < UMBRAL_CREDITO) {
      const notas = [];
      if (e.solicProrrCred) {
        notas.push(credVenc && e.solicProrrCred > credVenc
          ? `prórroga solicitada ${fmtDate(e.solicProrrCred)} (aún no otorgada)`
          : `prórroga solicitada ${fmtDate(e.solicProrrCred)}`);
      }
      if (e.numProrrogas > 0) {
        notas.push(`${e.numProrrogas} prórroga${e.numProrrogas !== 1 ? 's' : ''}`);
      }
      const sufijo = notas.length ? ` · ${notas.join(' · ')}` : '';
      alarmas.push({
        slug, nivel: diasC < 0 ? 'VENCIDA' : 'POR VENCER',
        gestionada: gestionVigente(e.solicProrrCred),
        area: 'Crédito', category: 'credito',
        etapa: String(e.etapa), expires_at: isoDate(credVenc), dias: diasC,
        cuerpo: `${e.entidadCredito}, vence ${fmtDate(credVenc)} (${diasC} días)${sufijo}`,
      });
    }

    // Pólizas TR y RC.
    // La renovación vigente anula el vencimiento original (mismo patrón que el
    // crédito: prórroga || original). La SOLICITUD de renovación NO silencia la
    // alarma — solo la anota: si la solicitud es posterior al vencimiento, es una
    // ampliación pedida aún no otorgada. El nº de prórrogas se anota como control.
    [
      { venc: e.vencTR, vencRenov: e.vencRenovTR, solic: e.solicRenovTR, prorrogas: e.numProrrogasTR, ent: e.polizaTR, tipo: 'TR', cat: 'poliza_tr' },
      { venc: e.vencRC, vencRenov: e.vencRenovRC, solic: e.solicRenovRC, prorrogas: e.numProrrogasRC, ent: e.polizaRC, tipo: 'RC', cat: 'poliza_rc' },
    ].forEach(p => {
      const vencEf = p.vencRenov || p.venc;      // renovación anula original
      const dias = diasRestantes(vencEf);
      if (dias === null || dias >= UMBRAL_POLIZA) return;

      const notas = [];
      if (p.solic) {
        notas.push(vencEf && p.solic > vencEf
          ? `ampliación solicitada ${fmtDate(p.solic)} (aún no otorgada)`
          : `renovación solicitada ${fmtDate(p.solic)}`);
      }
      if (p.prorrogas > 0) {
        notas.push(`${p.prorrogas} prórroga${p.prorrogas !== 1 ? 's' : ''}`);
      }
      const sufijo = notas.length ? ` · ${notas.join(' · ')}` : '';

      alarmas.push({
        slug, nivel: dias < 0 ? 'VENCIDA' : 'POR VENCER',
        gestionada: gestionVigente(p.solic),
        area: `Póliza ${p.tipo}`, category: p.cat,
        etapa: String(e.etapa), expires_at: isoDate(vencEf), dias,
        cuerpo: `${p.ent}, vence ${fmtDate(vencEf)} (${dias} días)${sufijo}`,
      });
    });

    // Licencia de Construcción. La etapa aprobada más reciente (Prórroga Revalidación
    // → Revalidación → Prórroga → Original) anula las anteriores, igual que crédito y
    // pólizas. La solicitud de la siguiente etapa avisa pero no silencia la alarma.
    const { vencEf: vencLicEf, numRenovaciones: numRenovLic, solicPendiente: solicLicPendiente } = licenciaVigente(e);
    const diasL = diasRestantes(vencLicEf);
    if (diasL !== null && diasL < UMBRAL_LICENCIA) {
      const notas = [];
      if (solicLicPendiente) {
        notas.push(vencLicEf && solicLicPendiente > vencLicEf
          ? `renovación solicitada ${fmtDate(solicLicPendiente)} (aún no otorgada)`
          : `renovación solicitada ${fmtDate(solicLicPendiente)}`);
      }
      if (numRenovLic > 0) {
        notas.push(`${numRenovLic} ${numRenovLic !== 1 ? 'renovaciones' : 'renovación'}`);
      }
      const sufijo = notas.length ? ` · ${notas.join(' · ')}` : '';
      alarmas.push({
        slug, nivel: diasL < 0 ? 'VENCIDA' : 'POR VENCER',
        gestionada: gestionVigente(solicLicPendiente),
        area: 'Licencia Construcción', category: 'licencia',
        etapa: String(e.etapa), expires_at: isoDate(vencLicEf), dias: diasL,
        cuerpo: `venció ${fmtDate(vencLicEf)} (${diasL} días)${sufijo}`,
      });
    }
  });

  return conservarMasCritica(mergeEtapas(alarmas));
}

// Un crédito o una póliza suelen cubrir varias etapas del mismo proyecto. El
// Datamart repite el dato fila por fila (una fila por etapa), pero es un solo
// hecho: debe salir una sola alarma que nombre todas las etapas que cubre.
// La clave de agrupación es todo el contenido menos la etapa; si algo difiere
// (entidad, fecha vigente, prórrogas), son hechos distintos y no se agrupan.
// Dos filas del Datamart pueden traer la misma etapa y la misma categoría con
// pólizas distintas (Mitika E1.2 tiene dos TR y dos RC). En la base comparten
// identidad — external_id es slug::etapa::categoría — así que solo puede quedar
// una: se conserva la más crítica, la de menos días restantes.
function conservarMasCritica(alarmas) {
  const porIdentidad = new Map();

  alarmas.forEach(a => {
    const clave  = `${a.slug}::${a.etapa}::${a.category}`;
    const previa = porIdentidad.get(clave);
    if (!previa || a.dias < previa.dias) porIdentidad.set(clave, a);
  });

  return Array.from(porIdentidad.values());
}

function etiquetaEtapa(etapa) {
  return /^\d/.test(etapa) ? `E${etapa}` : etapa;
}

function mergeEtapas(alarmas) {
  const grupos = new Map();

  alarmas.forEach(a => {
    const clave = `${a.slug}::${a.category}::${a.nivel}::${a.expires_at}::${a.cuerpo}`;
    const g = grupos.get(clave);
    if (g) {
      if (!g.etapas.includes(a.etapa)) g.etapas.push(a.etapa);
    } else {
      grupos.set(clave, { ...a, etapas: [a.etapa] });
    }
  });

  return Array.from(grupos.values()).map(g => {
    const { cuerpo, etapas, ...resto } = g;
    return {
      ...resto,
      etapa:   etapas.join(', '),
      detalle: `${etapas.map(etiquetaEtapa).join(', ')}: ${cuerpo}`,
    };
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const DISCOVER = process.argv.includes('--discover');
  const DRY_RUN  = process.argv.includes('--dry-run');   // imprime las alarmas y no toca Supabase ni el correo
  console.log(`\n[datamart-sync] ${TODAY_STR}${DISCOVER ? ' [DISCOVER MODE]' : ''}`);

  // 1. Autenticar
  console.log('[graph] Obteniendo token...');
  const token = await getGraphToken();

  // 2. Localizar archivo
  console.log('[graph] Localizando Datamart.xlsx...');
  const ref = await locateFile(token);
  console.log(`[graph] Drive: ${ref.driveId.slice(0, 20)}... Item: ${ref.itemId.slice(0, 20)}...`);

  // Modo discover: imprime las primeras 15 filas para inspeccionar estructura
  if (DISCOVER) {
    console.log(`\n[discover] Leyendo rango ${DISCOVER_RANGE}...`);
    const preview = await graphGet(token,
      `/drives/${ref.driveId}/items/${ref.itemId}/workbook/worksheets('${encodeURIComponent(SHEET_NAME)}')/range(address='${DISCOVER_RANGE}')`
    );
    const rows = preview.values || [];
    rows.forEach((row, i) => {
      const nonEmpty = row.filter(v => v !== '' && v !== null);
      console.log(`  Fila ${i + 1} (${nonEmpty.length} celdas): ${JSON.stringify(row.slice(0, 16))}`);
    });

    // Volcado completo de la fila de cabeceras (fila 5) con índices, para verificar
    // que las columnas de renovación/solicitud/prórrogas resuelven correctamente.
    console.log(`\n[discover] Cabeceras (fila 5) con índice — rango ${DATA_RANGE}:`);
    const full = await graphGet(token,
      `/drives/${ref.driveId}/items/${ref.itemId}/workbook/worksheets('${encodeURIComponent(SHEET_NAME)}')/range(address='${DATA_RANGE}')`
    );
    const hdr = (full.values || [])[4] || [];
    hdr.forEach((h, i) => {
      if (h !== '' && h !== null) console.log(`  [${i}] ${h}`);
    });
    console.log('');
    logDCOL(buildDCOL(hdr), hdr);
    return;
  }

  // 3. Leer hoja Proyectos
  console.log(`[graph] Leyendo hoja "${SHEET_NAME}" rango ${DATA_RANGE}...`);
  const values = await getSheetData(token, ref);

  // Fila 5 (índice 4) = cabeceras; datos desde fila 6 (índice 5)
  // Col A (índice 0) siempre vacía — filtrar por col B (índice 1) que tiene CodDataMart numérico
  const headerRow = values[4] || [];
  const DATA = values.slice(5).filter(r => r[1] !== '' && r[1] !== null && r[1] !== undefined);
  console.log(`[parse] ${DATA.length} etapas encontradas`);

  // Resolver por nombre las columnas de renovación/solicitud/prórrogas (índices
  // no fijos). Si no se encuentran, quedan en null y su señal no se aplica.
  const DCOL = buildDCOL(headerRow);
  logDCOL(DCOL, headerRow);

  // 4. Parsear filas
  const filas = DATA.map(r => ({
    estado:          String(r[C.Estado]          || '').trim(),
    proyecto:        String(r[C.Proyecto]        || '').trim(),
    etapa:           String(r[C.Etapa]           || '').trim(),
    polizaTR:        String(r[C.PolizaTR]        || ''),
    vencTR:          excelDate(r[C.VencTR]),
    vencRenovTR:     DCOL.vencRenovTR    !== null ? excelDate(r[DCOL.vencRenovTR])  : null,
    solicRenovTR:    DCOL.solicRenovTR   !== null ? excelDate(r[DCOL.solicRenovTR]) : null,
    numProrrogasTR:  DCOL.numProrrogasTR !== null ? (Number(r[DCOL.numProrrogasTR]) || 0) : 0,
    polizaRC:        String(r[C.PolizaRC]        || ''),
    vencRC:          excelDate(r[C.VencRC]),
    vencRenovRC:     DCOL.vencRenovRC    !== null ? excelDate(r[DCOL.vencRenovRC])  : null,
    solicRenovRC:    DCOL.solicRenovRC   !== null ? excelDate(r[DCOL.solicRenovRC]) : null,
    numProrrogasRC:  DCOL.numProrrogasRC !== null ? (Number(r[DCOL.numProrrogasRC]) || 0) : 0,
    ventasProy:      r[C.VentasProy]      || 0,
    entidadCredito:  String(r[C.EntidadCredito]  || ''),
    montoCredito:    r[C.MontoCredito]    || 0,
    fechaVencCred:   excelDate(r[C.FechaVencCred]),
    fechaVencProrr:  excelDate(r[C.FechaVencProrr]),
    numProrrogas:    Number(r[C.NumProrrogas]) || 0,
    solicProrrCred:  DCOL.solicProrrCred !== null ? excelDate(r[DCOL.solicProrrCred]) : null,
    entidadFiducia:  String(r[C.EntidadFiducia]  || ''),
    responsable:     String(r[C.Responsable]     || ''),
    licUrbanismo:    String(r[C.LicUrbanismo]    || ''),
    licConstruccion: String(r[C.LicConstruccion] || ''),
    vencLicConst:    excelDate(r[C.VencLicConst]),
    proxTramite:     typeof r[C.ProxTramite] === 'number' ? excelDate(r[C.ProxTramite]) : null,
    solicLicProrr:         DCOL.solicLicProrr         !== null ? excelDate(r[DCOL.solicLicProrr])         : null,
    vencLicProrr:           DCOL.vencLicProrr           !== null ? excelDate(r[DCOL.vencLicProrr])           : null,
    solicLicRevalida:      DCOL.solicLicRevalida      !== null ? excelDate(r[DCOL.solicLicRevalida])      : null,
    vencLicRevalida:        DCOL.vencLicRevalida        !== null ? excelDate(r[DCOL.vencLicRevalida])        : null,
    solicLicProrrRevalida: DCOL.solicLicProrrRevalida !== null ? excelDate(r[DCOL.solicLicProrrRevalida]) : null,
    vencLicProrrRevalida:   DCOL.vencLicProrrRevalida   !== null ? excelDate(r[DCOL.vencLicProrrRevalida])   : null,
  }));

  // 5. Agrupar y generar alarmas
  const porProyecto = {};
  filas.forEach(f => {
    if (!porProyecto[f.proyecto]) porProyecto[f.proyecto] = [];
    porProyecto[f.proyecto].push(f);
  });

  const alarmasGlobales = [];
  for (const [dmName, slug] of Object.entries(PROJECT_MAP)) {
    const etapas = porProyecto[dmName];
    if (!etapas || etapas.length === 0) {
      console.warn(`  [warn] No encontrado en Datamart: "${dmName}"`);
      continue;
    }
    const alarmasProyecto = buildAlarms(slug, etapas);
    alarmasProyecto.forEach(a => alarmasGlobales.push(a));
    const activas = etapas.filter(e => e.estado === 'ACTIVO').length;
    console.log(`  ✓ ${dmName.padEnd(22)} ${activas} activas · ${alarmasProyecto.length} alarmas`);
  }

  const vencidas  = alarmasGlobales.filter(a => a.nivel === 'VENCIDA');
  const porVencer = alarmasGlobales.filter(a => a.nivel === 'POR VENCER');

  console.log(`\n[alarmas] Total: ${alarmasGlobales.length} (${vencidas.length} vencidas, ${porVencer.length} por vencer)`);

  // 5b. Tareas EOS — solo lectura, no dependen del Datamart.
  const tareas = clasificarTareas(await fetchTareas());
  if (tareas) {
    console.log(`[tareas]  Total: ${tareas.total} (${tareas.abiertas.length} abiertas, ` +
                `${tareas.porVerificar.length} por verificar, ${tareas.cerradas.length} cerradas recientes)`);
  } else {
    console.warn('[tareas]  No se pudieron leer — la sección de Tareas EOS se omite del correo.');
  }

  // 6. Upsert en Supabase
  if (DRY_RUN) {
    console.log('\n[dry-run] Alarmas generadas — no se escribe en Supabase ni se envía correo:');
    alarmasGlobales.forEach(a => {
      console.log(`  ${a.nivel.padEnd(10)} ${a.gestionada ? '[monitoreada]' : '             '} ${a.slug.padEnd(20)} ${a.area.padEnd(22)} ${a.detalle}`);
    });

    // El fondo verde no se ve en consola. Se deja el correo renderizado en disco
    // para abrirlo en el navegador y verificar cómo llega realmente.
    (tareas ? tareas.abiertas : []).forEach(t => {
      const cuando = t.ancla ? fmtDate(t.ancla) : 'sin fecha';
      console.log(`  TAREA      ${t.gestionada ? '[comprometida]' : '              '} ` +
                  `${t.responsable.padEnd(24)} ${cuando.padEnd(14)} ${t.titulo}`);
    });

    const preview = require('path').join(__dirname, 'alarmas-preview.html');
    require('fs').writeFileSync(preview, buildEmailHtml(vencidas, porVencer, tareas), 'utf8');
    console.log(`\n[dry-run] Correo renderizado en ${preview}`);
  } else if (SUPABASE_URL && SUPABASE_KEY) {
    const RUN_TIME = new Date().toISOString();
    const records = alarmasGlobales.map(a => ({
      company_id:   'ic-constructora',
      external_id:  `${a.slug}::${a.etapa}::${a.category}`,
      project:      a.slug,
      category:     a.category,
      etapa:        a.etapa || '',
      detail:       a.detalle || '',
      severity:     a.nivel === 'VENCIDA' ? 'alta' : 'media',
      expires_at:   a.expires_at || null,
      dias:         a.dias !== undefined ? a.dias : null,
      status:       'active',
      last_seen_at: RUN_TIME,
      updated_at:   RUN_TIME,
    }));

    // Deduplicar por external_id — quedarse con la última ocurrencia
    const seen = new Map();
    records.forEach(r => seen.set(r.external_id, r));
    const deduped = Array.from(seen.values());
    console.log(`[supabase] Sincronizando ${deduped.length} alarmas (${records.length - deduped.length} duplicados eliminados)...`);
    await supabaseUpsert('alarms', deduped, 'company_id,external_id');
    await supabaseResolveStale(RUN_TIME);
    console.log('[supabase] Listo.');
  } else {
    console.log('[supabase] Omitido — configura SUPABASE_URL y SUPABASE_SERVICE_KEY.');
  }

  // 7. Email
  if (!DRY_RUN) await sendEmail(token, vencidas, porVencer, tareas);

  // 8. Resumen final
  console.log(`\n────────────────────────────────────────`);
  console.log(`Alarmas: ${alarmasGlobales.length} total`);
  console.log(`  Vencidas:    ${vencidas.length}`);
  console.log(`  Por vencer:  ${porVencer.length}`);
  if (tareas) {
    console.log(`Tareas EOS: ${tareas.total} total`);
    console.log(`  Abiertas:      ${tareas.abiertas.length}`);
    console.log(`  Por verificar: ${tareas.porVerificar.length}`);
  }
  console.log(`────────────────────────────────────────\n`);
}

main().catch(err => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
