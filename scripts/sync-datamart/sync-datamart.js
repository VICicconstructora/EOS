/**
 * sync-datamart.js — SCRIPT LOCAL (fallback de emergencia)
 *
 * NOTA: La versión cloud de este proceso corre como Supabase Edge Function en
 *       app/supabase/functions/datamart-sync/index.ts  (cron: lunes 07:00 Bogotá).
 *       Este script solo se necesita si la Edge Function está caída o para pruebas locales.
 *
 * Lee Datamart.xlsx y actualiza docs/memoria/proyectos/<slug>/index.md
 * con datos operativos: responsable, fiducia, crédito, pólizas, licencias.
 * Genera un reporte de alarmas en docs/memoria/reportes/datamart-YYYY-MM-DD.md
 *
 * Uso:
 *   DATAMART_PATH="C:/ruta/local/Datamart.xlsx" node sync-datamart.js
 *   DATAMART_PATH="C:/ruta/local/Datamart.xlsx" node sync-datamart.js --force
 *
 * Variables de entorno requeridas:
 *   DATAMART_PATH  — ruta local al archivo xlsx descargado de SharePoint
 *                    (sites/GND/DataMart/Datamart.xlsx)
 *
 * Variables de entorno opcionales:
 *   REPO_ROOT      — raíz del repositorio  (default: detecta desde __dirname)
 */

'use strict';

const xlsx      = require('xlsx');
const fs        = require('fs');
const path      = require('path');
const nodemailer = require('nodemailer');

// ─── Guardia de 8 días ────────────────────────────────────────────────────────
// Cuando se ejecuta desde Task Scheduler (diario), solo procede si han pasado
// ≥8 días desde la última ejecución. Saltar con --force para ignorar.

const FORCE       = process.argv.includes('--force');
const LAST_RUN_FILE = path.join(__dirname, '.last-run');
const INTERVALO_DIAS = 8;

if (!FORCE && fs.existsSync(LAST_RUN_FILE)) {
  const lastRun  = new Date(fs.readFileSync(LAST_RUN_FILE, 'utf8').trim());
  const diffDias = (Date.now() - lastRun.getTime()) / 86400000;
  if (diffDias < INTERVALO_DIAS) {
    const proxima = new Date(lastRun.getTime() + INTERVALO_DIAS * 86400000);
    console.log(`[sync-datamart] Saltando — última ejecución hace ${diffDias.toFixed(1)} días. Próxima: ${proxima.toISOString().split('T')[0]}`);
    process.exit(0);
  }
}

// ─── Configuración ────────────────────────────────────────────────────────────

const DATAMART_PATH = process.env.DATAMART_PATH;
if (!DATAMART_PATH) {
  console.error('ERROR: Define la variable de entorno DATAMART_PATH con la ruta al archivo descargado.');
  console.error('  Ejemplo: DATAMART_PATH="C:/Downloads/Datamart.xlsx" node sync-datamart.js');
  process.exit(1);
}

const REPO_ROOT = process.env.REPO_ROOT
  || path.resolve(__dirname, '../../');

const MEMORIA_ROOT  = path.join(REPO_ROOT, 'docs/memoria/proyectos');
const REPORTES_ROOT = path.join(REPO_ROOT, 'docs/memoria/reportes');

// Días antes del vencimiento para activar alarma
const UMBRAL_POLIZA   = 30;
const UMBRAL_LICENCIA = 60;
const UMBRAL_CREDITO  = 90;

// ─── Supabase (opcional) ──────────────────────────────────────────────────────
// Requiere SUPABASE_URL y SUPABASE_SERVICE_KEY en el entorno.
// Si no están definidas, la escritura en DB se omite silenciosamente.
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function supabaseUpsert(table, rows, conflictColumn) {
  if (!SUPABASE_URL || !SUPABASE_KEY || rows.length === 0) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflictColumn}`, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.warn(`[supabase] Error en ${table}: ${res.status} ${txt}`);
  }
}

async function supabaseUpdate(table, match, data) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  const qs = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, {
    method: 'PATCH',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.warn(`[supabase] Error PATCH ${table}: ${res.status} ${txt}`);
  }
}

// ─── Email SMTP Office 365 (opcional) ────────────────────────────────────────
// Requiere SMTP_USER, SMTP_PASS y SMTP_TO en el entorno.
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.office365.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const SMTP_TO   = process.env.SMTP_TO   || '';   // coma-separados

async function sendAlarmEmail(vencidas, porVencer, fecha) {
  if (!SMTP_USER || !SMTP_PASS || !SMTP_TO) return;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST, port: SMTP_PORT, secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { ciphers: 'SSLv3' },
  });

  function filaHtml(a) {
    const ico  = a.nivel === 'VENCIDA' ? '🔴' : '🟡';
    const slug = a.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${ico}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600">${slug}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${a.area}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${a.detalle}</td>
    </tr>`;
  }

  const tablaHtml = (rows) =>
    rows.length === 0 ? '<p style="color:#888">Ninguna</p>' : `
      <table style="border-collapse:collapse;width:100%;font-size:13px">
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
        <h2 style="color:#fff;margin:0;font-size:18px">🏗️ IC Constructora — Alarmas Operativas</h2>
        <p style="color:#aaa;margin:4px 0 0;font-size:13px">Sincronización Datamart · ${fecha}</p>
      </div>
      <div style="padding:24px 28px;background:#fff;border:1px solid #eee;border-top:none">
        <h3 style="color:#dc2626;margin-top:0">🔴 Vencidas (${vencidas.length})</h3>
        ${tablaHtml(vencidas)}
        <h3 style="color:#d97706;margin-top:24px">🟡 Por vencer en los próximos 90 días (${porVencer.length})</h3>
        ${tablaHtml(porVencer)}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#888;font-size:12px">
          Generado automáticamente por el sistema EOS de IC Constructora.<br>
          Para actualizar: accede a <strong>Portal EOS → Alarmas</strong>.
        </p>
      </div>
    </div>`;

  await transporter.sendMail({
    from:    `"IC Constructora EOS" <${SMTP_FROM}>`,
    to:      SMTP_TO,
    subject: `[IC EOS] ${vencidas.length} alarmas vencidas + ${porVencer.length} por vencer · ${fecha}`,
    html,
  });
  console.log(`[email] Enviado a: ${SMTP_TO}`);
}

// Nombre del proyecto en Datamart → slug de carpeta en memoria
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

// ─── Fecha de hoy ──────────────────────────────────────────────────────────────

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const TODAY_STR = TODAY.toISOString().split('T')[0];

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Convierte número serial de Excel a Date (UTC). */
function excelDate(n) {
  if (!n || typeof n !== 'number') return null;
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d  = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Formatea Date como YYYY-MM-DD o cadena vacía. */
function fmtDate(d) {
  if (!d) return '';
  return d.toISOString().split('T')[0];
}

/** Días restantes hasta d desde hoy. Negativo = vencida. */
function diasRestantes(d) {
  if (!d) return null;
  return Math.ceil((d.getTime() - TODAY.getTime()) / 86400000);
}

/** Icono de alarma según días restantes y umbral. */
function iconoAlarma(dias, umbral) {
  if (dias === null)   return '';
  if (dias < 0)        return ' 🔴';
  if (dias < umbral)   return ' 🟡';
  return '';
}

/** Formatea monto en billones: $32.0B o —. */
function fmtMonto(n) {
  if (!n || typeof n !== 'number' || n === 0) return '—';
  return '$' + (n / 1e9).toFixed(1) + 'B';
}

// ─── Lectura del Datamart ─────────────────────────────────────────────────────

console.log(`\n[sync-datamart] ${TODAY_STR}`);
console.log(`Leyendo: ${DATAMART_PATH}`);

if (!fs.existsSync(DATAMART_PATH)) {
  console.error('ERROR: Archivo no encontrado:', DATAMART_PATH);
  console.error('Ajusta DATAMART_PATH o descarga el archivo desde SharePoint.');
  process.exit(1);
}

// ─── Resolución de columnas por nombre de cabecera ───────────────────────────
// Las columnas de renovación/solicitud/prórrogas se ubican por nombre en la fila
// de cabeceras (fila 5), NO por índice fijo. Si no existe, la señal no se aplica.
function norm(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
function resolveCol(headerRow, targets) {
  const list = Array.isArray(targets) ? targets : [targets];
  for (const target of list) {
    const t = norm(target);
    let idx = headerRow.findIndex(h => norm(h) === t);
    if (idx < 0) idx = headerRow.findIndex(h => norm(h).includes(t));
    if (idx >= 0) return idx;
  }
  return null;
}

const wb  = xlsx.readFile(DATAMART_PATH, { sheetStubs: false });
const ws  = wb.Sheets['Proyectos'];
const raw = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Fila 5 (índice 4) = cabeceras; datos desde fila 6 (índice 5)
const headerRow = raw[4] || [];
const DATA = raw.slice(5).filter(r => r[0] !== '');
console.log(`Etapas encontradas: ${DATA.length}`);

// Índices de columnas (0-based)
const C = {
  Estado:           2,
  CodSinco:         3,
  Proyecto:        12,
  Etapa:           13,
  Torres:          14,
  PolizaTR:        34,
  VencTR:          36,
  PolizaRC:        40,
  VencRC:          42,
  VentasProy:      46,
  EntidadCredito:  48,
  MontoCredito:    51,
  FechaVencCred:   57,
  FechaVencProrr:  59,
  NumProrrogas:    60,
  EntidadFiducia:  61,
  PEFiducia:       62,
  ICOCEDCiudad:    69,
  ICOCEDArea:      70,
  Responsable:     86,
  LicUrbanismo:    87,
  LicConstruccion: 89,
  VencLicConst:   108,
  ProxTramite:    116,
};

// Resolver por nombre las columnas de renovación/solicitud/prórrogas (índices no fijos).
const DCOL = {
  vencRenovTR:    resolveCol(headerRow, 'Poliza Vencimiento Renovacion Todo Riesgo'),
  solicRenovTR:   resolveCol(headerRow, 'Poliza Solicitud Renovacion Todo Riesgo'),
  numProrrogasTR: resolveCol(headerRow, 'Poliza Numero Prorrogas Todo Riesgo'),
  vencRenovRC:    resolveCol(headerRow, 'Poliza Vencimiento Renovacion RC'),
  solicRenovRC:   resolveCol(headerRow, 'Poliza Solicitud Renovacion RC'),
  numProrrogasRC: resolveCol(headerRow, 'Poliza Numero Prorrogas RC'),
  solicProrrCred: resolveCol(headerRow, 'Fecha Solicitud Prorroga'),
};
console.log('Columnas de renovación resueltas por cabecera:');
for (const [k, v] of Object.entries(DCOL)) {
  console.log(`  ${k.padEnd(16)} → ${v === null ? 'NO ENCONTRADA' : `índice ${v} ("${headerRow[v]}")`}`);
}

const filas = DATA.map(r => ({
  estado:          r[C.Estado]          || '',
  codSinco:        r[C.CodSinco],
  proyecto:       (r[C.Proyecto]        || '').trim(),
  etapa:          String(r[C.Etapa]     || '').trim(),
  torres:          r[C.Torres]          || '',
  polizaTR:        r[C.PolizaTR]        || '',
  vencTR:          excelDate(r[C.VencTR]),
  vencRenovTR:     DCOL.vencRenovTR    !== null ? excelDate(r[DCOL.vencRenovTR])  : null,
  solicRenovTR:    DCOL.solicRenovTR   !== null ? excelDate(r[DCOL.solicRenovTR]) : null,
  numProrrogasTR:  DCOL.numProrrogasTR !== null ? (Number(r[DCOL.numProrrogasTR]) || 0) : 0,
  polizaRC:        r[C.PolizaRC]        || '',
  vencRC:          excelDate(r[C.VencRC]),
  vencRenovRC:     DCOL.vencRenovRC    !== null ? excelDate(r[DCOL.vencRenovRC])  : null,
  solicRenovRC:    DCOL.solicRenovRC   !== null ? excelDate(r[DCOL.solicRenovRC]) : null,
  numProrrogasRC:  DCOL.numProrrogasRC !== null ? (Number(r[DCOL.numProrrogasRC]) || 0) : 0,
  ventasProy:      r[C.VentasProy]      || 0,
  entidadCredito:  r[C.EntidadCredito]  || '',
  montoCredito:    r[C.MontoCredito]    || 0,
  fechaVencCred:   excelDate(r[C.FechaVencCred]),
  fechaVencProrr:  excelDate(r[C.FechaVencProrr]),
  numProrrogas:    r[C.NumProrrogas]    || 0,
  solicProrrCred:  DCOL.solicProrrCred !== null ? excelDate(r[DCOL.solicProrrCred]) : null,
  entidadFiducia:  r[C.EntidadFiducia]  || '',
  peFiducia:       r[C.PEFiducia]       || '',
  responsable:     r[C.Responsable]     || '',
  licUrbanismo:    r[C.LicUrbanismo]    || '',
  licConstruccion: r[C.LicConstruccion] || '',
  vencLicConst:    excelDate(r[C.VencLicConst]),
  proxTramite:     typeof r[C.ProxTramite] === 'number'
                     ? excelDate(r[C.ProxTramite])
                     : null,
}));

// Agrupar por nombre de proyecto
const porProyecto = {};
filas.forEach(f => {
  if (!porProyecto[f.proyecto]) porProyecto[f.proyecto] = [];
  porProyecto[f.proyecto].push(f);
});

// ─── Generación de la sección markdown ────────────────────────────────────────

const alarmasGlobales = [];

function construirSeccion(slug, etapas) {
  const L = [];
  const alarmasLocales = [];

  L.push(`## Datos Operativos (Datamart)`);
  L.push('');
  L.push(`_Fuente: Datamart.xlsx — actualizado ${TODAY_STR}_`);
  L.push('');

  // Responsable (puede variar entre propios y socios)
  const responsables = [...new Set(etapas.map(e => e.responsable).filter(Boolean))];
  if (responsables.length) {
    L.push(`**Director de Proyecto:** ${responsables.join(', ')}`);
    L.push('');
  }

  // Tabla de etapas: estado, fiducia, crédito
  L.push(`### Etapas`);
  L.push('');
  L.push(`| Etapa | Estado | Fiducia | Crédito | Monto | Venc. Crédito | Ventas Proy. |`);
  L.push(`|-------|--------|---------|---------|-------|---------------|-------------|`);

  etapas.forEach(e => {
    const credVenc = e.fechaVencProrr || e.fechaVencCred;
    const diasC    = diasRestantes(credVenc);
    const icoC     = iconoAlarma(diasC, UMBRAL_CREDITO);

    if (diasC !== null && diasC < UMBRAL_CREDITO) {
      const nivel = diasC < 0 ? 'VENCIDA' : 'POR VENCER';
      const notas = [];
      if (e.solicProrrCred) {
        notas.push(`prórroga solicitada ${fmtDate(e.solicProrrCred)}${credVenc && e.solicProrrCred > credVenc ? ' (aún no otorgada)' : ''}`);
      }
      if (e.numProrrogas > 0) notas.push(`${e.numProrrogas} prórroga${e.numProrrogas !== 1 ? 's' : ''}`);
      const sufijo = notas.length ? ` · ${notas.join(' · ')}` : '';
      alarmasLocales.push({
        nivel, area: 'Crédito', category: 'credito',
        etapa: String(e.etapa), expires_at: fmtDate(credVenc), dias: diasC,
        detalle: `E${e.etapa}: ${e.entidadCredito}, vence ${fmtDate(credVenc)} (${diasC} días)${sufijo}`
      });
    }

    L.push(`| E${e.etapa} | ${e.estado} | ${e.entidadFiducia || '—'} | ${e.entidadCredito || '—'} | ${fmtMonto(e.montoCredito)} | ${fmtDate(credVenc)}${icoC} | ${fmtMonto(e.ventasProy)} |`);
  });

  L.push('');

  // Tabla de pólizas
  L.push(`### Pólizas`);
  L.push('');
  L.push(`| Etapa | Entidad TR | Venc. TR | Entidad RC | Venc. RC |`);
  L.push(`|-------|------------|----------|------------|----------|`);

  etapas.forEach(e => {
    const vencTRef = e.vencRenovTR || e.vencTR;   // renovación anula original
    const vencRCef = e.vencRenovRC || e.vencRC;
    const diasTR = diasRestantes(vencTRef);
    const diasRC = diasRestantes(vencRCef);

    [{ venc: e.vencTR, vencRenov: e.vencRenovTR, solic: e.solicRenovTR, prorrogas: e.numProrrogasTR, tipo: 'TR', ent: e.polizaTR, cat: 'poliza_tr' },
     { venc: e.vencRC, vencRenov: e.vencRenovRC, solic: e.solicRenovRC, prorrogas: e.numProrrogasRC, tipo: 'RC', ent: e.polizaRC, cat: 'poliza_rc' }]
      .forEach(p => {
        const vencEf = p.vencRenov || p.venc;
        const dias = diasRestantes(vencEf);
        if (dias === null || dias >= UMBRAL_POLIZA) return;
        const notas = [];
        if (p.solic) {
          notas.push(vencEf && p.solic > vencEf
            ? `ampliación solicitada ${fmtDate(p.solic)} (aún no otorgada)`
            : `renovación solicitada ${fmtDate(p.solic)}`);
        }
        if (p.prorrogas > 0) notas.push(`${p.prorrogas} prórroga${p.prorrogas !== 1 ? 's' : ''}`);
        const sufijo = notas.length ? ` · ${notas.join(' · ')}` : '';
        alarmasLocales.push({
          nivel: dias < 0 ? 'VENCIDA' : 'POR VENCER', area: `Póliza ${p.tipo}`, category: p.cat,
          etapa: String(e.etapa), expires_at: fmtDate(vencEf), dias,
          detalle: `E${e.etapa}: ${p.ent}, vence ${fmtDate(vencEf)} (${dias} días)${sufijo}`
        });
      });

    L.push(`| E${e.etapa} | ${e.polizaTR || '—'} | ${fmtDate(vencTRef)}${iconoAlarma(diasTR, UMBRAL_POLIZA)} | ${e.polizaRC || '—'} | ${fmtDate(vencRCef)}${iconoAlarma(diasRC, UMBRAL_POLIZA)} |`);
  });

  L.push('');

  // Tabla de licencias
  L.push(`### Licencias`);
  L.push('');
  L.push(`| Etapa | Lic. Urbanismo | Lic. Construcción | Venc. Lic. Const. | Próx. Trámite |`);
  L.push(`|-------|----------------|-------------------|-------------------|---------------|`);

  etapas.forEach(e => {
    const diasL = diasRestantes(e.vencLicConst);

    if (diasL !== null && diasL < UMBRAL_LICENCIA) {
      const nivel = diasL < 0 ? 'VENCIDA' : 'POR VENCER';
      alarmasLocales.push({
        nivel, area: 'Licencia Construcción', category: 'licencia',
        etapa: String(e.etapa), expires_at: fmtDate(e.vencLicConst), dias: diasL,
        detalle: `E${e.etapa}: venció ${fmtDate(e.vencLicConst)} (${diasL} días)`
      });
    }

    L.push(`| E${e.etapa} | ${e.licUrbanismo || '—'} | ${e.licConstruccion || '—'} | ${fmtDate(e.vencLicConst)}${iconoAlarma(diasL, UMBRAL_LICENCIA)} | ${fmtDate(e.proxTramite) || '—'} |`);
  });

  // Alarmas locales
  if (alarmasLocales.length > 0) {
    L.push('');
    L.push(`### Alarmas`);
    L.push('');
    alarmasLocales.forEach(a => {
      const ico = a.nivel === 'VENCIDA' ? '🔴' : '🟡';
      L.push(`- ${ico} **${a.area} ${a.nivel}:** ${a.detalle}`);
    });
    alarmasLocales.forEach(a => alarmasGlobales.push({ ...a, slug }));
  }

  L.push('');
  return L.join('\n');
}

// ─── Actualización de archivos markdown ──────────────────────────────────────

const MARCA_INICIO = '## Datos Operativos (Datamart)';

function actualizarMarkdown(filePath, seccion) {
  if (!fs.existsSync(filePath)) {
    console.warn(`  ✗ No existe: ${filePath}`);
    return false;
  }

  let contenido = fs.readFileSync(filePath, 'utf8');

  // Reemplaza sección existente o inserta antes de ## Changelog
  const idxExistente = contenido.indexOf(MARCA_INICIO);

  if (idxExistente !== -1) {
    // Buscar el siguiente ## heading después de la sección
    const siguienteH2 = contenido.indexOf('\n## ', idxExistente + 1);
    if (siguienteH2 !== -1) {
      contenido = contenido.slice(0, idxExistente) + seccion + contenido.slice(siguienteH2 + 1);
    } else {
      contenido = contenido.slice(0, idxExistente) + seccion.trimEnd() + '\n';
    }
  } else {
    // Insertar antes de ## Changelog
    const idxChangelog = contenido.indexOf('\n## Changelog');
    if (idxChangelog !== -1) {
      contenido = contenido.slice(0, idxChangelog + 1) + seccion + contenido.slice(idxChangelog + 1);
    } else {
      contenido = contenido.trimEnd() + '\n\n' + seccion;
    }
  }

  fs.writeFileSync(filePath, contenido, 'utf8');
  return true;
}

// ─── Loop principal ───────────────────────────────────────────────────────────

console.log(`\nActualizando archivos en: ${MEMORIA_ROOT}\n`);

let actualizados = 0;
let noEncontrados = 0;

Object.entries(PROJECT_MAP).forEach(([dmName, slug]) => {
  const etapas = porProyecto[dmName];

  if (!etapas || etapas.length === 0) {
    console.warn(`  ✗ No encontrado en Datamart: "${dmName}"`);
    noEncontrados++;
    return;
  }

  const seccion   = construirSeccion(slug, etapas);
  const indexPath = path.join(MEMORIA_ROOT, slug, 'index.md');
  const ok        = actualizarMarkdown(indexPath, seccion);

  if (ok) {
    const activas   = etapas.filter(e => e.estado === 'ACTIVO').length;
    const inactivas = etapas.length - activas;
    console.log(`  ✓ ${dmName.padEnd(22)} → ${slug} (${activas} activas, ${inactivas} inactivas)`);
    actualizados++;
  } else {
    noEncontrados++;
  }
});

// ─── Reporte global ───────────────────────────────────────────────────────────

const vencidas   = alarmasGlobales.filter(a => a.nivel === 'VENCIDA');
const porVencer  = alarmasGlobales.filter(a => a.nivel === 'POR VENCER');

const RL = [];
RL.push(`---`);
RL.push(`tipo: reporte`);
RL.push(`fecha: ${TODAY_STR}`);
RL.push(`fuente: Datamart.xlsx`);
RL.push(`---`);
RL.push('');
RL.push(`# Reporte Datamart — ${TODAY_STR}`);
RL.push('');
RL.push(`## Resumen`);
RL.push('');
RL.push(`| Item | Valor |`);
RL.push(`|------|-------|`);
RL.push(`| Proyectos actualizados | ${actualizados} |`);
RL.push(`| No encontrados | ${noEncontrados} |`);
RL.push(`| Total alarmas | ${alarmasGlobales.length} |`);
RL.push(`| 🔴 Vencidas | ${vencidas.length} |`);
RL.push(`| 🟡 Por vencer (<90 días) | ${porVencer.length} |`);
RL.push('');

if (vencidas.length > 0) {
  RL.push(`## 🔴 Vencidas (${vencidas.length})`);
  RL.push('');
  // Agrupar por proyecto
  const porSlug = {};
  vencidas.forEach(a => {
    if (!porSlug[a.slug]) porSlug[a.slug] = [];
    porSlug[a.slug].push(a);
  });
  Object.entries(porSlug).forEach(([slug, alarmas]) => {
    RL.push(`### ${slug}`);
    RL.push('');
    alarmas.forEach(a => RL.push(`- **${a.area}:** ${a.detalle}`));
    RL.push('');
  });
}

if (porVencer.length > 0) {
  RL.push(`## 🟡 Por vencer en los próximos 90 días (${porVencer.length})`);
  RL.push('');
  const porSlug = {};
  porVencer.forEach(a => {
    if (!porSlug[a.slug]) porSlug[a.slug] = [];
    porSlug[a.slug].push(a);
  });
  Object.entries(porSlug).forEach(([slug, alarmas]) => {
    RL.push(`### ${slug}`);
    RL.push('');
    alarmas.forEach(a => RL.push(`- **${a.area}:** ${a.detalle}`));
    RL.push('');
  });
}

if (!fs.existsSync(REPORTES_ROOT)) {
  fs.mkdirSync(REPORTES_ROOT, { recursive: true });
}

const reportePath = path.join(REPORTES_ROOT, `datamart-${TODAY_STR}.md`);
fs.writeFileSync(reportePath, RL.join('\n'), 'utf8');

// Guardar timestamp de última ejecución exitosa
fs.writeFileSync(LAST_RUN_FILE, new Date().toISOString(), 'utf8');

console.log(`\n────────────────────────────────────────`);
console.log(`Actualizados: ${actualizados} proyectos`);
console.log(`Alarmas:      ${alarmasGlobales.length} total (${vencidas.length} 🔴 vencidas, ${porVencer.length} 🟡 por vencer)`);
console.log(`Reporte:      ${reportePath}`);
console.log(`────────────────────────────────────────\n`);

// ─── Escritura en Supabase ────────────────────────────────────────────────────
// UPSERT de todas las alarmas activas en esta ejecución.
// Las alarmas que ya no aparecen en el Datamart se marcan como 'resolved'.

const RUN_TIME = new Date().toISOString();

const alarmRecords = alarmasGlobales.map(a => ({
  company_id:  'ic-constructora',
  external_id: `${a.slug}::${a.etapa}::${a.category}`,
  project:     a.slug,
  category:    a.category,
  etapa:       a.etapa || '',
  detail:      a.detalle || '',
  severity:    a.nivel === 'VENCIDA' ? 'alta' : 'media',
  expires_at:  a.expires_at || null,
  dias:        a.dias !== undefined ? a.dias : null,
  status:      'active',
  last_seen_at: RUN_TIME,
  updated_at:  RUN_TIME,
}));

(async () => {
  if (SUPABASE_URL && SUPABASE_KEY) {
    console.log('[supabase] Sincronizando alarmas...');
    await supabaseUpsert('alarms', alarmRecords, 'company_id,external_id');

    // Marcar como 'resolved' alarmas que ya no están en el Datamart actual
    // (last_seen_at anterior a esta ejecución)
    if (alarmRecords.length > 0) {
      await supabaseUpdate('alarms',
        { company_id: 'ic-constructora', status: 'active' },
        // Usamos un PATCH condicional combinado:
        // Supabase no permite NOT IN directamente en PATCH params, así que usamos
        // el endpoint con lt filter en last_seen_at
        { status: 'resolved', resolved_at: RUN_TIME }
      );
      // Nota: el PATCH anterior resolvería TODAS las activas. En su lugar hacemos
      // una llamada GET para obtener IDs de alarmas no vistas y luego PATCH individual.
      // Para simplificar, usamos un endpoint con lt en last_seen_at:
      const staleUrl = `${SUPABASE_URL}/rest/v1/alarms?company_id=eq.ic-constructora&status=eq.active&last_seen_at=lt.${encodeURIComponent(RUN_TIME)}`;
      const staleRes = await fetch(staleUrl, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
      if (staleRes.ok) {
        const staleAlarms = await staleRes.json();
        if (staleAlarms.length > 0) {
          const staleIds = staleAlarms.map(a => a.id);
          console.log(`[supabase] Marcando ${staleIds.length} alarmas como resolved (no vistas en este run)`);
          for (const id of staleIds) {
            await supabaseUpdate('alarms', { id }, { status: 'resolved', resolved_at: RUN_TIME });
          }
        }
      }
      console.log(`[supabase] ${alarmRecords.length} alarmas sincronizadas.`);
    }
  } else {
    console.log('[supabase] Omitido — configura SUPABASE_URL y SUPABASE_SERVICE_KEY para habilitar.');
  }

  // ─── Email SMTP ─────────────────────────────────────────────────────────────
  if (SMTP_USER && SMTP_PASS && SMTP_TO) {
    console.log('[email] Enviando reporte...');
    try {
      await sendAlarmEmail(vencidas, porVencer, TODAY_STR);
    } catch (err) {
      console.warn('[email] Error al enviar:', err.message);
    }
  } else {
    console.log('[email] Omitido — configura SMTP_USER, SMTP_PASS y SMTP_TO para habilitar.');
  }

})();
