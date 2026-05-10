/**
 * sync-datamart.js
 * Lee Datamart.xlsx y actualiza docs/memoria/proyectos/<slug>/index.md
 * con datos operativos: responsable, fiducia, crédito, pólizas, licencias.
 * Genera un reporte de alarmas en docs/memoria/reportes/datamart-YYYY-MM-DD.md
 *
 * Uso:
 *   node sync-datamart.js
 *   DATAMART_PATH="C:/ruta/Datamart.xlsx" node sync-datamart.js
 *
 * Variables de entorno opcionales:
 *   DATAMART_PATH  — ruta al archivo xlsx  (default: C:/Users/Ana/Downloads/Datamart.xlsx)
 *   REPO_ROOT      — raíz del repositorio  (default: detecta desde __dirname)
 */

'use strict';

const xlsx = require('xlsx');
const fs   = require('fs');
const path = require('path');

// ─── Configuración ────────────────────────────────────────────────────────────

const DATAMART_PATH = process.env.DATAMART_PATH
  || 'C:/Users/Ana/Downloads/Datamart.xlsx';

const REPO_ROOT = process.env.REPO_ROOT
  || path.resolve(__dirname, '../../');

const MEMORIA_ROOT  = path.join(REPO_ROOT, 'docs/memoria/proyectos');
const REPORTES_ROOT = path.join(REPO_ROOT, 'docs/memoria/reportes');

// Días antes del vencimiento para activar alarma
const UMBRAL_POLIZA   = 30;
const UMBRAL_LICENCIA = 60;
const UMBRAL_CREDITO  = 90;

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

const wb  = xlsx.readFile(DATAMART_PATH, { sheetStubs: false });
const ws  = wb.Sheets['Proyectos'];
const raw = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Fila 5 (índice 4) = cabeceras; datos desde fila 6 (índice 5)
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

const filas = DATA.map(r => ({
  estado:          r[C.Estado]          || '',
  codSinco:        r[C.CodSinco],
  proyecto:       (r[C.Proyecto]        || '').trim(),
  etapa:          String(r[C.Etapa]     || '').trim(),
  torres:          r[C.Torres]          || '',
  polizaTR:        r[C.PolizaTR]        || '',
  vencTR:          excelDate(r[C.VencTR]),
  polizaRC:        r[C.PolizaRC]        || '',
  vencRC:          excelDate(r[C.VencRC]),
  ventasProy:      r[C.VentasProy]      || 0,
  entidadCredito:  r[C.EntidadCredito]  || '',
  montoCredito:    r[C.MontoCredito]    || 0,
  fechaVencCred:   excelDate(r[C.FechaVencCred]),
  fechaVencProrr:  excelDate(r[C.FechaVencProrr]),
  numProrrogas:    r[C.NumProrrogas]    || 0,
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
      alarmasLocales.push({
        nivel, area: 'Crédito',
        detalle: `E${e.etapa}: ${e.entidadCredito}, vence ${fmtDate(credVenc)} (${diasC} días)`
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
    const diasTR = diasRestantes(e.vencTR);
    const diasRC = diasRestantes(e.vencRC);

    [{ dias: diasTR, tipo: 'TR', ent: e.polizaTR, venc: fmtDate(e.vencTR) },
     { dias: diasRC, tipo: 'RC', ent: e.polizaRC, venc: fmtDate(e.vencRC) }]
      .forEach(p => {
        if (p.dias !== null && p.dias < UMBRAL_POLIZA) {
          const nivel = p.dias < 0 ? 'VENCIDA' : 'POR VENCER';
          alarmasLocales.push({
            nivel, area: `Póliza ${p.tipo}`,
            detalle: `E${e.etapa}: ${p.ent}, vence ${p.venc} (${p.dias} días)`
          });
        }
      });

    L.push(`| E${e.etapa} | ${e.polizaTR || '—'} | ${fmtDate(e.vencTR)}${iconoAlarma(diasTR, UMBRAL_POLIZA)} | ${e.polizaRC || '—'} | ${fmtDate(e.vencRC)}${iconoAlarma(diasRC, UMBRAL_POLIZA)} |`);
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
        nivel, area: 'Licencia Construcción',
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

console.log(`\n────────────────────────────────────────`);
console.log(`Actualizados: ${actualizados} proyectos`);
console.log(`Alarmas:      ${alarmasGlobales.length} total (${vencidas.length} 🔴 vencidas, ${porVencer.length} 🟡 por vencer)`);
console.log(`Reporte:      ${reportePath}`);
console.log(`────────────────────────────────────────\n`);
