/**
 * reporte-semanal.js — Reporte Semanal de Productividad de IC Constructora.
 *
 * Mismo patrón de entrega que el correo de alarmas EOS
 * (scripts/sync-datamart/sync-datamart-cloud.js): corre en GitHub Actions, lee
 * de Supabase y envía HTML por Microsoft Graph sendMail. La diferencia es que
 * este NO escribe nada: solo lee.
 *
 * Secuencia del correo, en el orden en que se revisa la semana:
 *   1. Ventas por proyecto      — real vs presupuesto prorrateado.
 *   2. Trámites                 — lo que debían cerrar vs lo que cerraron.
 *   3. Cartera                  — recaudo de la semana y mora acumulada.
 *   4. Ejecución de obra        — inversión de la semana vs su propio ritmo.
 *   5. Flujo de caja            — proxy semanal vivo + FCL del último corte.
 *
 * Variables de entorno (GitHub Secrets en CI, .env de la raíz en local):
 *   SUPABASE_URL          — https://zbjwasufengayvmutypr.supabase.co
 *   SUPABASE_SERVICE_KEY  — service_role (alias: SUPABASE_SERVICE_ROLE_KEY)
 *   AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET
 *   ALERT_FROM_EMAIL      — buzón remitente
 *   ALERT_TO_EMAILS       — destinatarios, coma-separados
 *
 * Uso:
 *   node reporte-semanal.js                    # semana anterior completa, envía
 *   node reporte-semanal.js --dry-run          # no envía; escribe reporte.html
 *   node reporte-semanal.js --semana=2026-08-31  # fuerza el lunes de la semana
 *   node reporte-semanal.js --to=otro@correo.co  # sobreescribe destinatarios
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

const fs = require('fs');
const path = require('path');
const Q = require('./queries');
const XLSX = require('./xlsx');

// ─── Configuración ────────────────────────────────────────────────────────────

const SUPABASE_URL  = process.env.SUPABASE_URL || '';
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY
                   || process.env.SUPABASE_SERVICE_ROLE_KEY
                   || '';
const TENANT_ID     = process.env.AZURE_TENANT_ID || '';
const CLIENT_ID     = process.env.AZURE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';
const FROM_EMAIL    = process.env.ALERT_FROM_EMAIL || '';

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const argTo   = (args.find(a => a.startsWith('--to=')) || '').slice(5);
const argSem  = (args.find(a => a.startsWith('--semana=')) || '').slice(9);

const TO_EMAILS = (argTo || process.env.ALERT_TO_EMAILS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

// ─── Semana de reporte ────────────────────────────────────────────────────────
// Lunes a domingo de la última semana COMPLETA. Se calcula en UTC para que el
// runner de GitHub (UTC) y una corrida local en Bogotá den el mismo rango.

function semanaReporte(override) {
  let lunes;
  if (override) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(override)) {
      throw new Error(`--semana debe ser YYYY-MM-DD, llegó "${override}"`);
    }
    lunes = new Date(`${override}T00:00:00Z`);
    if (Number.isNaN(lunes.getTime())) throw new Error(`Fecha inválida: ${override}`);
  } else {
    const hoy = new Date();
    const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
    // getUTCDay(): 0 = domingo. Retroceder al lunes de esta semana y luego 7 días.
    const desdeLunes = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - desdeLunes - 7);
    lunes = d;
  }
  const domingo = new Date(lunes);
  domingo.setUTCDate(domingo.getUTCDate() + 6);
  return { ini: iso(lunes), fin: iso(domingo) };
}

const iso = d => d.toISOString().slice(0, 10);

// Lunes de la primera semana de la ventana de tendencia: n-1 semanas antes del
// lunes reportado, para que la última fila de la serie sea la semana del correo.
function lunesAtras(isoLunes, semanas) {
  const d = new Date(`${isoLunes}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7 * (semanas - 1));
  return iso(d);
}

// ─── Acceso a datos ───────────────────────────────────────────────────────────
// vic_query_db es el único ejecutor de SQL arbitrario de la BD y es de solo
// lectura por construcción (rechaza todo lo que no sea un SELECT/WITH único,
// fija transaction_read_only y corta a los 15s). Si algún día cambian sus
// guardas, mover estas consultas a una función SECURITY DEFINER propia.

async function sql(query, rowLimit = 200, intento = 1) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/vic_query_db`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    // btrim() de vic_query_db solo quita espacios, no saltos de línea, y la
    // consulta tiene que empezar literalmente en SELECT/WITH.
    body: JSON.stringify({ query_text: query.trim(), row_limit: rowLimit }),
  });
  const body = await res.text();
  if (!res.ok) {
    // 57014 = statement timeout. Ninguna de estas consultas pasa de 3 s sola:
    // cuando aparece es contención en el pool, no una consulta lenta. Se
    // reintenta una vez porque esto corre desatendido los lunes.
    if (body.includes('57014') && intento === 1) {
      console.warn('[reporte] statement timeout, reintentando una vez');
      await new Promise(r => setTimeout(r, 3000));
      return sql(query, rowLimit, 2);
    }
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 400)}`);
  }
  const data = JSON.parse(body);
  if (!Array.isArray(data)) {
    throw new Error(`Respuesta inesperada de vic_query_db: ${body.slice(0, 400)}`);
  }
  return data;
}

// vic_query_db corta en 1.000 filas por llamada, sin importar el row_limit que
// se le pida. Las hojas de detalle (los 6.300 trámites atrasados, por ejemplo)
// se traen paginando con offset hasta que una página vuelva incompleta.
const PAGINA = 1000;

async function sqlTodo(consulta, tope = 10000) {
  const filas = [];
  for (let off = 0; off < tope; off += PAGINA) {
    const pagina = await sql(consulta(off), PAGINA);
    filas.push(...pagina);
    if (pagina.length < PAGINA) break;
  }
  return filas;
}

// ─── Formato ──────────────────────────────────────────────────────────────────

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
               'agosto','septiembre','octubre','noviembre','diciembre'];

function fechaLarga(isoStr) {
  if (!isoStr) return '—';
  const [y, m, d] = isoStr.slice(0, 10).split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

function fechaCorta(isoStr) {
  if (!isoStr) return '—';
  const [y, m, d] = isoStr.slice(0, 10).split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

const num = v => (v === null || v === undefined ? 0 : Number(v));

// Todos los valores monetarios del correo pasan por aquí, así que el signo va
// en un solo sitio. El cero se sigue imprimiendo como raya: "$0" en cincuenta
// celdas ensucia la tabla y no dice nada que la raya no diga.
// Unidades. La meta semanal sale de dividir el PPTO mensual de unidades entre
// las semanas del mes, así que casi nunca es entera: 33 unidades / 5 semanas.
// Redondear a entero escondería que la meta de un proyecto chico es media
// unidad por semana.
function un(v) {
  const n = num(v);
  if (n === 0) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

function mm(v) {
  const n = num(v);
  if (n === 0) return '—';
  return `$${n.toLocaleString('es-CO')}`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Semáforo de cumplimiento. Sin umbral inventado: verde desde 100%, ámbar
// desde 70%, rojo por debajo. Devuelve null cuando no hay meta contra la cual
// medir (no se pinta un color sobre una división por cero).
function semaforo(real, meta) {
  if (!meta || num(meta) === 0) return null;
  return num(real) / num(meta);
}

function pct(real, meta) {
  const r = semaforo(real, meta);
  return r === null ? '—' : `${Math.round(r * 100)}%`;
}

// Variación contra la semana anterior. En las cuatro tarjetas del encabezado
// más es mejor (ventas, trámites cumplidos, recaudo, obra ejecutada), así que
// el color no necesita excepciones: verde sube, rojo baja.
// Se calcula sobre la serie de tendencia, no sobre los totales de cada sección,
// para que numerador y denominador salgan de la misma consulta.
function delta(actual, previo) {
  const a = num(actual), pv = num(previo);
  const gris = t => `<span style="color:${COLOR.tenue};font-size:11px">${t}</span>`;
  if (pv === 0) {
    return a === 0 ? gris('igual que la semana anterior')
                   : gris('sin base la semana anterior');
  }
  const r = (a - pv) / pv;
  if (Math.abs(r) < 0.005) return gris('igual que la semana anterior');
  const c = r > 0 ? COLOR.ok : COLOR.malo;
  const signo = r > 0 ? '+' : '';
  return `<span style="color:${c};font-size:11px">${r > 0 ? '▲' : '▼'} ${signo}${Math.round(r * 100)}% vs sem. ant.</span>`;
}


// ─── Mini-gráfico de las tarjetas ─────────────────────────────────────────────
// Ocho columnas: el acumulado de la ventana semana a semana, con la meta
// acumulada dibujada encima como una línea escalonada.
//
// Va con celdas de tabla, no con SVG ni canvas: Outlook de escritorio usa el
// motor de render de Word, que ignora <svg> y la posición absoluta de CSS. Lo
// único que dibuja de forma confiable es una tabla con fondos y bordes, así que
// cada columna es una tablita apilada de 2-3 segmentos y la "línea" de meta es
// el borde superior del segmento que arranca a la altura de la meta.
const SPARK_H = 34;   // px de alto útil
const SPARK_W = 11;   // px de ancho de barra

function sparkline(puntos, colorBarra) {
  const vals = puntos.flatMap(p => [num(p.real), p.meta === null ? 0 : num(p.meta)]);
  const max = Math.max(...vals, 1);

  const columnas = puntos.map(pt => {
    const barH  = Math.max(1, Math.round(num(pt.real) / max * SPARK_H));
    const metaH = pt.meta === null ? null
                : Math.min(SPARK_H, Math.round(num(pt.meta) / max * SPARK_H));

    // Cortes de abajo hacia arriba; cada segmento va entre dos cortes.
    const cortes = [...new Set([0, barH, metaH, SPARK_H].filter(v => v !== null))]
      .sort((a, b) => a - b);

    const filas = [];
    for (let i = cortes.length - 1; i > 0; i--) {
      const hi = cortes[i], lo = cortes[i - 1], h = hi - lo;
      if (h <= 0) continue;
      const lleno = hi <= barH;
      // El borde superior del segmento cuyo techo es la meta cae exactamente a
      // la altura de la meta: esa es la línea.
      const linea = metaH !== null && hi === metaH;
      const bg = lleno ? `background:${colorBarra};` : '';
      const bd = linea ? `border-top:2px solid ${COLOR.fondo};` : '';
      filas.push(`<tr><td height="${h}" style="height:${h}px;line-height:${h}px;font-size:1px;${bg}${bd}">&nbsp;</td></tr>`);
    }

    return `<td style="padding:0 3px 0 0;vertical-align:bottom">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:${SPARK_W}px">${filas.join('')}</table>
    </td>`;
  });

  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:6px 0 4px">
    <tr>${columnas.join('')}</tr>
  </table>`;
}

// Acumula una serie semanal en pares {real, meta} listos para sparkline().
function acumular(serie, campoReal, campoMeta) {
  let r = 0, m = 0;
  return serie.map(f => {
    r += num(f[campoReal]);
    if (campoMeta) m += num(f[campoMeta]);
    return { real: r, meta: campoMeta ? m : null };
  });
}

// Tarjeta del encabezado: cifra de la semana, delta, meta de la semana,
// mini-gráfico del acumulado de la ventana y acumulado del año.
function tarjeta({ titulo, cifra, deltaHtml, metaSem, spark, pie }) {
  return `<td width="25%" style="padding:12px 14px;vertical-align:top">
    <div style="font-size:12px;color:#666">${esc(titulo)}</div>
    <div style="font-size:17px;font-weight:700;margin:1px 0 1px">${cifra}</div>
    <div>${deltaHtml}</div>
    <div style="font-size:11px;color:#666;margin-top:3px">${metaSem}</div>
    ${spark}
    <div style="font-size:11px;color:#666">${pie}</div>
  </td>`;
}

// ─── Render HTML ──────────────────────────────────────────────────────────────

const COLOR = {
  fondo:   '#1a1a2e',
  ok:      '#059669',
  alerta:  '#d97706',
  malo:    '#dc2626',
  tenue:   '#888',
  borde:   '#eee',
};

// Semáforo de FONDO para las celdas de %, con los umbrales que fijó el CEO:
// verde al cumplir, amarillo entre 90% y 100%, rojo por debajo. Es más estricto
// que claseCumplimiento() (que perdona hasta el 70%) porque aquí el color es lo
// primero que se ve al abrir el correo.
function claseFondo(real, meta) {
  const r = semaforo(real, meta);
  if (r === null) return 'g';
  if (r >= 1)     return 's1';
  if (r >= 0.9)   return 's2';
  return 's3';
}

// Semáforo de texto, más indulgente: verde desde 100%, ámbar desde 70%.
function claseCumplimiento(real, meta) {
  const r = semaforo(real, meta);
  if (r === null) return 'g';
  if (r >= 1)     return 'v';
  if (r >= 0.7)   return 'a';
  return 'r';
}

// Versión en hex del mismo semáforo indulgente. La necesitan los
// mini-gráficos: el color de la barra va inline porque se arma dentro de una
// tabla anidada por columna, donde una clase no ahorraría nada.
function colorCumplimiento(real, meta) {
  const r = semaforo(real, meta);
  if (r === null) return COLOR.tenue;
  if (r >= 1)   return COLOR.ok;
  if (r >= 0.7) return COLOR.alerta;
  return COLOR.malo;
}

// Las celdas de tabla llevan clase, no estilo inline.
//
// El correo tiene ~980 celdas y repetir el estilo en cada una pesaba 82 KB de
// los 113 KB del mensaje: el 72% eran atributos style idénticos. Gmail recorta
// a partir de ~102 KB, así que el formato inline se estaba comiendo el correo.
// Con clases baja a ~40 KB sin quitar una sola tabla.
//
// Word (el motor con el que Outlook de escritorio renderiza) sí soporta
// selectores de clase simples, y Gmail respeta el bloque <style>. Lo que ese
// motor no soporta —y por eso los mini-gráficos siguen siendo tablas— es SVG y
// posición absoluta. Si algún cliente llegara a descartar el bloque, las tablas
// pierden formato pero el contenido se sigue leyendo.
//
// Solo queda inline lo que es genuinamente dinámico y no se puede enumerar,
// como el color de una celda que depende de un valor.
const HOJA_ESTILOS = `<style>
  .t{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px}
  .h,.hn{padding:8px 10px;font-weight:600;color:#444;background:#f5f5f5}
  .h{text-align:left} .hn{text-align:right}
  .c,.n{padding:6px 10px;border-bottom:1px solid #eee}
  .n{text-align:right}
  .b{font-weight:600}
  .g{color:#888} .r{color:#dc2626} .v{color:#059669} .a{color:#d97706}
  .s1{background:#d1fae5;color:#065f46}
  .s2{background:#fef3c7;color:#92400e}
  .s3{background:#fee2e2;color:#991b1b}
  .tot{background:#fafafa;font-weight:600}
  .sm{font-size:11px}
</style>`;

function tabla(headers, filas) {
  if (filas.length === 0) {
    return `<p style="color:${COLOR.tenue};font-size:13px;margin:8px 0 0">Sin movimiento en la semana.</p>`;
  }
  const head = headers.map((h, i) =>
    `<th class="${i === 0 ? 'h' : 'hn'}">${esc(h)}</th>`).join('');
  return `<table class="t">
    <thead><tr>${head}</tr></thead>
    <tbody>${filas.join('')}</tbody>
  </table>`;
}

// `numero` puede ir vacío: la tendencia va antes de la secuencia numerada
// porque no es un paso de la revisión, es el marco donde se lee la semana.
// Puntero a la hoja del adjunto que sustenta la sección. El correo resume; el
// que quiera discutir una cifra necesita saber dónde está el nombre propio.
function soporte(...hojas) {
  const lista = hojas.map(h => `«${esc(h)}»`).join(' y ');
  return `<p style="margin:6px 0 0;font-size:11px;color:${COLOR.tenue}">Soporte cliente a cliente: ${hojas.length > 1 ? 'hojas' : 'hoja'} ${lista} del .xlsx adjunto.</p>`;
}

function seccion(numero, titulo, subtitulo, cuerpo) {
  return `
    <h3 style="margin:28px 0 2px;font-size:15px;color:#111">
      ${numero ? `${numero}. ` : ''}${esc(titulo)}
    </h3>
    <p style="margin:0;color:${COLOR.tenue};font-size:12px">${subtitulo}</p>
    ${cuerpo}`;
}

function construirHtml(d) {
  const { semana, tendencia, acumulado, ventas, tramites, tramitesProy, cartera, obra, flujoProxy, flujoCorte, frescura } = d;
  const ac = (acumulado && acumulado[0]) || {};

  // ── 0. Tendencia — la serie en la que se lee la semana
  // La última fila es la semana reportada; la penúltima es la base de los deltas.
  const serie = tendencia || [];
  const estaSem = serie[serie.length - 1] || {};
  const semAnt  = serie[serie.length - 2] || {};

  const rangoCorto = r =>
    `${fechaCorta(r.lunes).slice(0, 5)}–${fechaCorta(r.domingo).slice(0, 5)}`;

  const tendenciaFilas = serie.map((r, i) => {
    const ultima = i === serie.length - 1;
    const fondo  = ultima ? ' class="tot"' : '';
    // El represado solo dice algo contra el de la semana pasada: lo relevante
    // no es que sean miles, es si suben o bajan.
    const prev   = i > 0 ? num(serie[i - 1].vencidos_acum) : null;
    const dif    = prev === null ? null : num(r.vencidos_acum) - prev;
    const difTxt = dif === null || dif === 0 ? ''
      : ` <span class="${dif > 0 ? 'r' : 'v'}" style="font-weight:400">${dif > 0 ? '+' : ''}${dif}</span>`;
    return `<tr${fondo}>
      <td class="c">${esc(rangoCorto(r))}</td>
      <td class="n">${num(r.un_sem) || '—'}</td>
      <td class="n">${mm(r.mm_sem)}</td>
      <td class="n b ${claseFondo(r.mm_ytd, r.mm_meta_ytd)}">${pct(r.mm_ytd, r.mm_meta_ytd)}</td>
      <td class="n ${num(r.desist_un_sem) ? 'r' : 'g'}">${num(r.desist_un_sem) || '—'}</td>
      <td class="n">${num(r.hicieron) || '—'} / ${num(r.debian) || '—'}</td>
      <td class="n b ${claseFondo(r.hicieron, r.debian)}">${pct(r.hicieron, r.debian)}</td>
      <td class="n">${num(r.vencidos_acum).toLocaleString('es-CO')}${difTxt}</td>
      <td class="n">${mm(r.pactado_mm)}</td>
      <td class="n">${mm(r.pagado_mm)}</td>
      <td class="n b ${claseFondo(r.pagado_mm, r.pactado_mm)}">${pct(r.pagado_mm, r.pactado_mm)}</td>
    </tr>`;
  });

  const tendenciaHtml = tabla(
    ['Semana', 'Un.', 'Vendido MM', '% año', 'Desist.', 'Trámites', '%',
     'Atrasados acum.', 'Pactado MM', 'Recaudo MM', '%'],
    tendenciaFilas);

  // ── 1. Ventas
  const totVentas = ventas.reduce((a, r) => ({
    inv_total:   a.inv_total   + num(r.inv_total),
    inv_vend:    a.inv_vend    + num(r.inv_vendidas),
    inv_disp:    a.inv_disp    + num(r.inv_disponibles),
    un_sem:      a.un_sem      + num(r.un_sem),
    mm_sem:      a.mm_sem      + num(r.mm_sem),
    un_ppto_sem: a.un_ppto_sem + num(r.un_ppto_sem),
    mm_ppto_sem: a.mm_ppto_sem + num(r.mm_ppto_sem),
    desist_un:   a.desist_un   + num(r.desist_un_sem),
    desist_mm:   a.desist_mm   + num(r.desist_mm_sem),
    un_ytd:      a.un_ytd      + num(r.un_ytd),
    mm_ytd:      a.mm_ytd      + num(r.mm_ytd),
    mm_ppto_ytd: a.mm_ppto_ytd + num(r.mm_ppto_ytd),
  }), { inv_total: 0, inv_vend: 0, inv_disp: 0, un_sem: 0, mm_sem: 0, un_ppto_sem: 0,
        mm_ppto_sem: 0, desist_un: 0, desist_mm: 0, un_ytd: 0, mm_ytd: 0, mm_ppto_ytd: 0 });

  // Solo se listan proyectos con algo que mirar: venta, desistimiento o meta.
  const ventasFilas = ventas
    .filter(r => num(r.inv_total) || num(r.un_sem) || num(r.desist_un_sem)
              || num(r.mm_ppto_sem) || num(r.mm_ytd) || num(r.mm_ppto_ytd))
    .map(r => `<tr>
      <td class="c">${esc(r.proyecto)}</td>
      <td class="n g">${num(r.inv_total) || '—'}</td>
      <td class="n">${num(r.inv_vendidas) || '—'}</td>
      <td class="n b ${num(r.inv_disponibles) ? '' : 'g'}">${num(r.inv_disponibles) || '—'}</td>
      <td class="n">${num(r.un_sem) || '—'}</td>
      <td class="n">${mm(r.mm_sem)}</td>
      <td class="n g">${un(r.un_ppto_sem)}</td>
      <td class="n">${mm(r.mm_ppto_sem)}</td>
      <td class="n b ${claseFondo(r.mm_sem, r.mm_ppto_sem)}">${pct(r.mm_sem, r.mm_ppto_sem)}</td>
      <td class="n ${num(r.desist_un_sem) ? 'r' : 'g'}">${num(r.desist_un_sem) ? `${r.desist_un_sem} · ${mm(r.desist_mm_sem)}` : '—'}</td>
      <td class="n">${mm(r.mm_ytd)}</td>
      <td class="n">${mm(r.mm_ppto_ytd)}</td>
      <td class="n b ${claseFondo(r.mm_ytd, r.mm_ppto_ytd)}">${pct(r.mm_ytd, r.mm_ppto_ytd)}</td>
    </tr>`);

  ventasFilas.push(`<tr class="tot">
    <td class="c">Total portafolio</td>
    <td class="n">${totVentas.inv_total.toLocaleString('es-CO') || '—'}</td>
    <td class="n">${totVentas.inv_vend.toLocaleString('es-CO') || '—'}</td>
    <td class="n">${totVentas.inv_disp.toLocaleString('es-CO') || '—'}</td>
    <td class="n">${totVentas.un_sem || '—'}</td>
    <td class="n">${mm(totVentas.mm_sem)}</td>
    <td class="n">${un(totVentas.un_ppto_sem)}</td>
    <td class="n">${mm(totVentas.mm_ppto_sem)}</td>
    <td class="n ${claseFondo(totVentas.mm_sem, totVentas.mm_ppto_sem)}">${pct(totVentas.mm_sem, totVentas.mm_ppto_sem)}</td>
    <td class="n ${totVentas.desist_un ? 'r' : 'g'}">${totVentas.desist_un ? `${totVentas.desist_un} · ${mm(totVentas.desist_mm)}` : '—'}</td>
    <td class="n">${mm(totVentas.mm_ytd)}</td>
    <td class="n">${mm(totVentas.mm_ppto_ytd)}</td>
    <td class="n ${claseFondo(totVentas.mm_ytd, totVentas.mm_ppto_ytd)}">${pct(totVentas.mm_ytd, totVentas.mm_ppto_ytd)}</td>
  </tr>`);

  const ventasHtml = tabla(
    ['Proyecto', 'Inventario', 'Vendidas', 'Disponibles', 'Un.', 'Vendido MM',
     'Meta un.', 'Meta sem.', '%', 'Desistido', 'Año MM', 'Meta año', '%'],
    ventasFilas);

  // ── 2. Trámites
  const totTram = tramites.reduce((a, r) => ({
    debian_ytd:   a.debian_ytd   + num(r.debian_ytd),
    hicieron_ytd: a.hicieron_ytd + num(r.hicieron_ytd),
    debian:       a.debian       + num(r.debian),
    hicieron:     a.hicieron     + num(r.hicieron),
    atrasados:    a.atrasados    + num(r.atrasados),
    prox:         a.prox         + num(r.prox_semana),
    // El más antiguo del portafolio es el mínimo de los mínimos, no una suma.
    mas_antiguo:  [a.mas_antiguo, r.mas_antiguo].filter(Boolean).sort()[0] || null,
    // Promedio ponderado por represado: promediar los nueve promedios daría
    // el mismo peso a una categoría con 75 atrasados que a otra con 1.142.
    dias_pond:    a.dias_pond    + num(r.atraso_promedio) * num(r.atrasados),
  }), { debian_ytd: 0, hicieron_ytd: 0, debian: 0, hicieron: 0, atrasados: 0,
        prox: 0, mas_antiguo: null, dias_pond: 0 });

  totTram.atraso_promedio = totTram.atrasados
    ? Math.round(totTram.dias_pond / totTram.atrasados) : 0;

  const dias = v => (num(v) ? `${Math.round(num(v)).toLocaleString('es-CO')} d` : '—');

  const tramitesFilas = tramites.map(r => `<tr>
    <td class="c">${esc(r.categoria)}</td>
    <td class="n">${num(r.debian_ytd) || '—'}</td>
    <td class="n b">${num(r.hicieron_ytd) || '—'}</td>
    <td class="n b ${claseFondo(r.hicieron_ytd, r.debian_ytd)}">${pct(r.hicieron_ytd, r.debian_ytd)}</td>
    <td class="n g">${num(r.debian) || '—'}</td>
    <td class="n">${num(r.hicieron) || '—'}</td>
    <td class="n b ${claseFondo(r.hicieron, r.debian)}">${pct(r.hicieron, r.debian)}</td>
    <td class="n b ${num(r.atrasados) ? 'r' : 'g'}">${num(r.atrasados).toLocaleString('es-CO') || '—'}</td>
    <td class="n g">${fechaCorta(r.mas_antiguo)}</td>
    <td class="n ${num(r.atraso_promedio) > 365 ? 'r' : 'a'}">${dias(r.atraso_promedio)}</td>
    <td class="n g">${num(r.prox_semana) || '—'}</td>
  </tr>`);

  tramitesFilas.push(`<tr class="tot">
    <td class="c">Total</td>
    <td class="n">${totTram.debian_ytd || '—'}</td>
    <td class="n">${totTram.hicieron_ytd || '—'}</td>
    <td class="n ${claseFondo(totTram.hicieron_ytd, totTram.debian_ytd)}">${pct(totTram.hicieron_ytd, totTram.debian_ytd)}</td>
    <td class="n">${totTram.debian || '—'}</td>
    <td class="n">${totTram.hicieron || '—'}</td>
    <td class="n ${claseFondo(totTram.hicieron, totTram.debian)}">${pct(totTram.hicieron, totTram.debian)}</td>
    <td class="n ${totTram.atrasados ? 'r' : 'g'}">${totTram.atrasados.toLocaleString('es-CO') || '—'}</td>
    <td class="n g">${fechaCorta(totTram.mas_antiguo)}</td>
    <td class="n r">${dias(totTram.atraso_promedio)}</td>
    <td class="n g">${totTram.prox || '—'}</td>
  </tr>`);

  const tramitesHtml = tabla(
    ['Trámite', 'Debían año', 'Van', '%', 'Debían sem.', 'Hicieron', '%',
     'Atrasados', 'Más antiguo', 'Atraso prom.', 'Próx. sem.'],
    tramitesFilas);

  const totProy = tramitesProy.reduce((a, r) => ({
    debian_ytd:   a.debian_ytd   + num(r.debian_ytd),
    hicieron_ytd: a.hicieron_ytd + num(r.hicieron_ytd),
    debian:       a.debian       + num(r.debian),
    hicieron:     a.hicieron     + num(r.hicieron),
    atrasados:    a.atrasados    + num(r.atrasados),
    mas_antiguo:  [a.mas_antiguo, r.mas_antiguo].filter(Boolean).sort()[0] || null,
    dias_pond:    a.dias_pond    + num(r.atraso_promedio) * num(r.atrasados),
  }), { debian_ytd: 0, hicieron_ytd: 0, debian: 0, hicieron: 0, atrasados: 0,
        mas_antiguo: null, dias_pond: 0 });

  const proyFilas = tramitesProy.map(r => `<tr>
      <td class="c">${esc(r.proyecto)}</td>
      <td class="n">${num(r.debian_ytd) || '—'}</td>
      <td class="n">${num(r.hicieron_ytd) || '—'}</td>
      <td class="n b ${claseFondo(r.hicieron_ytd, r.debian_ytd)}">${pct(r.hicieron_ytd, r.debian_ytd)}</td>
      <td class="n g">${num(r.debian) || '—'}</td>
      <td class="n">${num(r.hicieron) || '—'}</td>
      <td class="n b ${claseFondo(r.hicieron, r.debian)}">${pct(r.hicieron, r.debian)}</td>
      <td class="n b ${num(r.atrasados) ? 'r' : 'g'}">${num(r.atrasados).toLocaleString('es-CO') || '—'}</td>
      <td class="n g">${fechaCorta(r.mas_antiguo)}</td>
      <td class="n g">${dias(r.atraso_promedio)}</td>
    </tr>`);

  proyFilas.push(`<tr class="tot">
    <td class="c">Total</td>
    <td class="n">${totProy.debian_ytd || '—'}</td>
    <td class="n">${totProy.hicieron_ytd || '—'}</td>
    <td class="n ${claseFondo(totProy.hicieron_ytd, totProy.debian_ytd)}">${pct(totProy.hicieron_ytd, totProy.debian_ytd)}</td>
    <td class="n">${totProy.debian || '—'}</td>
    <td class="n">${totProy.hicieron || '—'}</td>
    <td class="n ${claseFondo(totProy.hicieron, totProy.debian)}">${pct(totProy.hicieron, totProy.debian)}</td>
    <td class="n ${totProy.atrasados ? 'r' : 'g'}">${totProy.atrasados.toLocaleString('es-CO') || '—'}</td>
    <td class="n g">${fechaCorta(totProy.mas_antiguo)}</td>
    <td class="n r">${dias(totProy.atrasados ? Math.round(totProy.dias_pond / totProy.atrasados) : 0)}</td>
  </tr>`);

  const tramitesProyHtml = tabla(
    ['Proyecto', 'Debían año', 'Van', '%', 'Debían sem.', 'Hicieron', '%',
     'Atrasados', 'Más antiguo', 'Atraso prom.'],
    proyFilas);

  // ── 3. Cartera
  const totCart = cartera.reduce((a, r) => ({
    pactado:  a.pactado  + num(r.pactado_sem_mm),
    pagado:   a.pagado   + num(r.pagado_sem_mm),
    vencido:  a.vencido  + num(r.vencido_mm),
    v90:      a.v90      + num(r.vencido_90_mm),
    clientes: a.clientes + num(r.clientes_mora),
  }), { pactado: 0, pagado: 0, vencido: 0, v90: 0, clientes: 0 });

  const carteraFilas = cartera
    .filter(r => num(r.pactado_sem_mm) || num(r.pagado_sem_mm) || num(r.vencido_mm))
    .map(r => `<tr>
      <td class="c">${esc(r.proyecto)}</td>
      <td class="n">${mm(r.pactado_sem_mm)}</td>
      <td class="n b">${mm(r.pagado_sem_mm)}</td>
      <td class="n b ${claseCumplimiento(r.pagado_sem_mm, r.pactado_sem_mm)}">${pct(r.pagado_sem_mm, r.pactado_sem_mm)}</td>
      <td class="n r">${mm(r.vencido_mm)}</td>
      <td class="n r">${mm(r.vencido_90_mm)}</td>
      <td class="n g">${num(r.clientes_mora) || '—'}</td>
    </tr>`);

  carteraFilas.push(`<tr class="tot">
    <td class="c">Total portafolio</td>
    <td class="n">${mm(totCart.pactado)}</td>
    <td class="n">${mm(totCart.pagado)}</td>
    <td class="n ${claseCumplimiento(totCart.pagado, totCart.pactado)}">${pct(totCart.pagado, totCart.pactado)}</td>
    <td class="n r">${mm(totCart.vencido)}</td>
    <td class="n r">${mm(totCart.v90)}</td>
    <td class="n g">${totCart.clientes || '—'}</td>
  </tr>`);

  const carteraHtml = tabla(
    ['Proyecto', 'Pactado sem. MM', 'Recaudado MM', '%', 'Vencido MM', '> 90 días MM', 'Clientes en mora'],
    carteraFilas);

  // ── 4. Obra
  // El cronograma de ADPRO no cubre todos los proyectos ni todo el presupuesto.
  // Cuando está vencido o no existe, se muestra el estado en vez de un
  // cumplimiento contra una meta que no está ahí.
  // Por debajo de este % de cobertura el cronograma no sirve como meta: Praia
  // Natura tiene cargado el 11% de su presupuesto y comparar 859 MM ejecutados
  // contra 2 MM programados daba un 42.950% que no significa nada.
  const COBERTURA_MINIMA = 25;

  const obraFilas = obra.map(r => {
    const vigente = r.horizonte && r.horizonte.slice(0, 10) >= semana.fin;
    const medible = vigente && num(r.cobertura_pct) >= COBERTURA_MINIMA;
    const meta = medible ? r.prog_sem_mm : null;
    let estado, colorEstado;
    if (!r.horizonte) {
      estado = 'sin cronograma';       colorEstado = COLOR.malo;
    } else if (!vigente) {
      estado = `vencido ${fechaCorta(r.horizonte)}`; colorEstado = COLOR.alerta;
    } else {
      estado = `cubre ${num(r.cobertura_pct)}% del ppto`;
      colorEstado = num(r.cobertura_pct) >= 60 ? COLOR.tenue : COLOR.alerta;
    }
    return `<tr>
      <td class="c">${esc(r.proyecto)}</td>
      <td class="n">${meta === null ? '—' : mm(r.prog_sem_mm)}</td>
      <td class="n b">${mm(r.inv_sem_mm)}</td>
      <td class="n b ${meta === null ? 'g' : claseCumplimiento(r.inv_sem_mm, meta)}">${meta === null ? '—' : pct(r.inv_sem_mm, meta)}</td>
      <td class="n">${medible ? mm(r.prog_mtd_mm) : '—'}</td>
      <td class="n">${mm(r.inv_mtd_mm)}</td>
      <td class="n b">${r.avance_pct === null ? '—' : `${r.avance_pct}%`}</td>
      <td class="n sm" style="color:${colorEstado}">${esc(estado)}</td>
    </tr>`;
  });

  const obraHtml = tabla(
    ['Proyecto', 'Programado sem. MM', 'Invertido sem. MM', '%',
     'Programado mes MM', 'Invertido mes MM', 'Avance obra', 'Cronograma'],
    obraFilas);

  // ── 5. Flujo
  const fp = flujoProxy[0] || { recaudo_mm: 0, obra_mm: 0, neto_mm: 0 };
  const corte = flujoCorte.length ? flujoCorte[0].corte : null;
  const flujoCorteHtml = tabla(
    ['Proyecto', 'FCL del mes MM', 'FCL acumulado MM', 'Ingresos MM', 'Costos MM'],
    flujoCorte.map(r => `<tr>
      <td class="c">${esc(r.proyecto)}</td>
      <td class="n b ${num(r.fcl_mm) < 0 ? 'r' : 'v'}">${mm(r.fcl_mm)}</td>
      <td class="n ${num(r.fcl_acum_mm) < 0 ? 'r' : ''}">${mm(r.fcl_acum_mm)}</td>
      <td class="n g">${mm(r.ingresos_mm)}</td>
      <td class="n g">${mm(r.costos_mm)}</td>
    </tr>`));

  const cajaCard = `
    <table style="border-collapse:collapse;width:100%;margin-top:10px;font-size:13px">
      <tr>
        <td class="c" style="width:34%">Recaudo cobrado en la semana</td>
        <td class="n b">${mm(fp.recaudo_mm)} MM</td>
      </tr>
      <tr>
        <td class="c">Inversión de obra ejecutada</td>
        <td class="n b">(${mm(fp.obra_mm)}) MM</td>
      </tr>
      <tr style="background:#fafafa">
        <td class="c b">Neto operativo de la semana</td>
        <td class="n b ${num(fp.neto_mm) < 0 ? 'r' : 'v'}" style="font-weight:700">${mm(fp.neto_mm)} MM</td>
      </tr>
    </table>`;

  // ── Pie: frescura de fuentes
  const frescuraHtml = frescura.map(f =>
    `<li style="margin:2px 0">${esc(f.fuente)}: <strong>${fechaCorta(f.ultimo_dato)}</strong></li>`).join('');

  const asunto = tituloAsunto(totVentas, totTram, semana);

  const html = `${HOJA_ESTILOS}
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:900px;margin:0 auto;color:#111">
    <div style="background:${COLOR.fondo};padding:20px 28px;border-radius:8px 8px 0 0">
      <h2 style="color:#fff;margin:0;font-size:18px">IC Constructora — Productividad de la semana</h2>
      <p style="color:#aaa;margin:4px 0 0;font-size:13px">
        ${fechaLarga(semana.ini)} al ${fechaLarga(semana.fin)}
      </p>
    </div>

    <div style="padding:22px 28px;background:#fff;border:1px solid ${COLOR.borde};border-top:none">

      <table style="border-collapse:collapse;width:100%;font-size:13px;background:#f8f8fb;border-radius:6px">
        <tr>
          ${tarjeta({
            titulo: 'Ventas',
            cifra: `${num(estaSem.un_sem)} un · ${mm(estaSem.mm_sem)} MM`,
            deltaHtml: delta(estaSem.mm_sem, semAnt.mm_sem),
            metaSem: `Meta ${mm(estaSem.mm_meta_sem)} MM · <span class="b ${claseFondo(estaSem.mm_sem, estaSem.mm_meta_sem)}" style="padding:0 3px">${pct(estaSem.mm_sem, estaSem.mm_meta_sem)}</span>`,
            spark: sparkline(acumular(serie, 'mm_sem', 'mm_meta_sem'),
                             colorCumplimiento(ac.ventas_mm, ac.ventas_meta_mm)),
            pie: `Año ${mm(ac.ventas_mm)} de ${mm(ac.ventas_meta_mm)} MM · <strong>${pct(ac.ventas_mm, ac.ventas_meta_mm)}</strong>`,
          })}
          ${tarjeta({
            titulo: 'Trámites cumplidos',
            cifra: `${num(estaSem.hicieron)} de ${num(estaSem.debian)}`,
            deltaHtml: delta(estaSem.hicieron, semAnt.hicieron),
            metaSem: `<span class="b ${claseFondo(estaSem.hicieron, estaSem.debian)}" style="padding:0 3px">${pct(estaSem.hicieron, estaSem.debian)}</span> de lo programado`,
            spark: sparkline(acumular(serie, 'hicieron', 'debian'),
                             colorCumplimiento(ac.tram_hicieron, ac.tram_debian)),
            pie: `<strong style="color:${COLOR.malo}">${num(ac.tram_vencidos).toLocaleString('es-CO')}</strong> vencidos acumulados · ${num(ac.tram_vencidos_90d)} de los últimos 90 d`,
          })}
          ${tarjeta({
            titulo: 'Recaudo (conceptos iniciales)',
            cifra: `${mm(estaSem.pagado_mm)} MM`,
            deltaHtml: delta(estaSem.pagado_mm, semAnt.pagado_mm),
            metaSem: `Pactado ${mm(estaSem.pactado_mm)} MM · <span class="b ${claseFondo(estaSem.pagado_mm, estaSem.pactado_mm)}" style="padding:0 3px">${pct(estaSem.pagado_mm, estaSem.pactado_mm)}</span>`,
            spark: sparkline(acumular(serie, 'pagado_mm', 'pactado_mm'),
                             colorCumplimiento(ac.cartera_pagado_mm, ac.cartera_pactado_mm)),
            pie: `Año ${mm(ac.cartera_pagado_mm)} de ${mm(ac.cartera_pactado_mm)} MM · <strong>${pct(ac.cartera_pagado_mm, ac.cartera_pactado_mm)}</strong>`,
          })}
          ${tarjeta({
            titulo: 'Obra ejecutada',
            cifra: `${mm(estaSem.obra_mm)} MM`,
            deltaHtml: delta(estaSem.obra_mm, semAnt.obra_mm),
            metaSem: `<span style="color:${COLOR.tenue}">sin meta semanal confiable</span>`,
            spark: sparkline(acumular(serie, 'obra_mm', null), '#94a3b8'),
            pie: `Año ${mm(ac.obra_mm)} MM · avance <strong>${pct(ac.obra_vida_real_mm, ac.obra_vida_ppto_mm)}</strong> del ppto de obra`,
          })}
        </tr>
      </table>

      ${seccion('', `Tendencia — últimas ${serie.length} semanas`,
        'Ventas, trámites y cartera del portafolio CBR, una fila por semana. La última fila es la semana de este correo; los deltas de arriba comparan contra la fila anterior.',
        tendenciaHtml)}

      ${seccion(1, 'Ventas por proyecto',
        'Inventario de unidades principales (sin parqueaderos ni depósitos), luego la venta de la semana y el acumulado del año. La meta semanal es el PPTO del mes dividido entre las semanas completas del mes, en unidades y en pesos; la del año suma solo las semanas ya cerradas. Una unidad reservada no cuenta ni como vendida ni como disponible. Desistido resta.',
        ventasHtml + soporte('Ventas', 'Desistimientos'))}

      ${seccion(2, 'Trámites — lo programado contra lo cumplido',
        'Primero el acumulado del año: cuántos debía haber cerrado a la fecha y cuántos lleva. Después la semana. "Hicieron" incluye atrasos de periodos previos, y por eso el % puede pasar de 100. "Atrasados" es el represado completo al corte, sin cota de tiempo, con la fecha del más viejo y el atraso promedio de cada categoría.',
        tramitesHtml + `<p style="margin:16px 0 0;font-size:12px;color:${COLOR.tenue}">Apertura por proyecto</p>` + tramitesProyHtml + soporte('Trámites semana', 'Trámites atrasados'))}

      ${seccion(3, 'Cartera',
        'Cuotas con vencimiento dentro de la semana (pactado vs recaudado) y saldo en mora acumulado a hoy. Vencido = saldo en mora, definición certificada con Cartera.',
        carteraHtml + soporte('Cartera semana', 'Cartera mora'))}

      ${seccion(4, 'Ejecución de obra',
        'Inversión ejecutada en pesos (ADPRO, clase Invertido) contra el cronograma de obra valorizado y prorrateado por días. El cronograma no cubre todos los proyectos ni todo el presupuesto: la última columna dice qué tan confiable es la meta de cada uno.',
        obraHtml + soporte('Obra'))}

      ${seccion(5, 'Flujo de caja',
        'Proxy vivo de la semana: lo que entró por recaudo menos lo que salió a obra.',
        cajaCard + `
        <p style="margin:18px 0 0;font-size:12px;color:${COLOR.tenue}">
          FCL formal por proyecto — último corte disponible: <strong>${fechaCorta(corte)}</strong>${corteViejo(corte) ? ` <span style="color:${COLOR.malo}">(desactualizado)</span>` : ''}
        </p>` + flujoCorteHtml)}

      <hr style="border:none;border-top:1px solid ${COLOR.borde};margin:26px 0 14px">

      <p style="font-size:12px;color:${COLOR.tenue};margin:0 0 6px"><strong>Alcance y corte de los datos</strong></p>
      <ul style="font-size:12px;color:${COLOR.tenue};margin:0;padding-left:18px">
        <li style="margin:2px 0">Ventas, trámites y cartera cubren los 14 proyectos CBR con dato vivo en SINCO. Azul Celeste, Azul Turquesa, Mitika, Verde Vivo y Well solo tienen corte mensual de Excel y no aparecen en las secciones semanales.</li>
        <li style="margin:2px 0">La meta semanal de obra sale del cronograma valorizado de ADPRO. Donde el cronograma está vencido o no existe, no se calcula cumplimiento.</li>
        ${frescuraHtml}
      </ul>
      <p style="color:${COLOR.tenue};font-size:12px;margin:14px 0 0">
        Generado automáticamente por el sistema EOS de IC Constructora.
      </p>
    </div>
  </div>`;

  return { html, asunto };
}

function corteViejo(corte) {
  if (!corte) return true;
  const dias = (Date.now() - new Date(`${corte}T00:00:00Z`).getTime()) / 86400000;
  return dias > 60;
}

function tituloAsunto(v, t, semana) {
  const partes = [`${v.un_sem} venta${v.un_sem === 1 ? '' : 's'}`];
  partes.push(`${t.hicieron}/${t.debian} trámites`);
  if (t.atrasados) partes.push(`${t.atrasados.toLocaleString('es-CO')} atrasados`);
  return `[IC EOS] Productividad semana ${fechaCorta(semana.ini)}–${fechaCorta(semana.fin)} · ${partes.join(' · ')}`;
}

// ─── Soporte .xlsx ────────────────────────────────────────────────────────────
// Una hoja por sección del correo, con la lista nominal detrás de cada cifra.
// Sin esto, discutir un número en comité obliga a pedirle a TI que lo abra.

const T = (clave, titulo, ancho) => ({ clave, titulo, ancho, tipo: 'texto' });
const N = (clave, titulo, ancho) => ({ clave, titulo, ancho: ancho || 14, tipo: 'numero' });
// Pesos: mismo número, con formato de moneda en Excel. Se separa de N porque
// las columnas de unidades, días y porcentajes no llevan signo.
const P = (clave, titulo, ancho) => ({ clave, titulo, ancho: ancho || 16, tipo: 'pesos' });
const F = (clave, titulo) => ({ clave, titulo, ancho: 13, tipo: 'fecha' });

function hoja(nombre, columnas, filas) {
  return {
    nombre,
    columnas,
    filas: filas.map(r => columnas.map(c => r[c.clave])),
  };
}

function construirLibro(det, d, semana) {
  const hojas = [];
  const ac = (d.acumulado && d.acumulado[0]) || {};

  // Portada: qué es cada hoja y con qué corte se sacó. El adjunto circula solo
  // por correo y termina abierto meses después, sin el mensaje al lado.
  hojas.push(hoja('Léame', [T('a', 'Hoja', 26), T('b', 'Qué contiene', 82)],
    [
      ['Semana reportada', `${fechaCorta(semana.ini)} a ${fechaCorta(semana.fin)}`],
      ['Alcance', 'Los 14 proyectos CBR con dato vivo en SINCO (fuente_real = CRM).'],
      ['', ''],
      ['RESUMEN', 'Las mismas tablas del correo, para revisarlas sin abrirlo. Cifras en millones (MM).'],
      ['Año', 'Cierre del año a la fecha: ventas, trámites, cartera y obra contra su meta.'],
      ['Tendencia', 'Las últimas 8 semanas, una fila por semana.'],
      ['Ventas resumen', 'Inventario, venta de la semana y acumulado del año, por proyecto.'],
      ['Trámites resumen', 'Por categoría: acumulado del año, la semana y el represado con su antigüedad.'],
      ['Trámites x proyecto', 'Lo mismo, abierto por proyecto: a quién reclamarle.'],
      ['Cartera resumen', 'Pactado y recaudado de la semana, más la mora acumulada por proyecto.'],
      ['Obra', 'Ejecución contra cronograma por proyecto. Obra no tiene grano de cliente.'],
      ['Flujo', 'FCL formal por proyecto del último corte mensual del Excel PyG.'],
      ['', ''],
      ['DETALLE', 'La lista nominal detrás de cada cifra. Cifras en pesos exactos.'],
      ['Ventas', 'Cada venta firmada dentro de la semana, con comprador, unidad y vendedor.'],
      ['Desistimientos', 'Desistimientos registrados en la semana, con motivo y valor a devolver.'],
      ['Trámites semana', 'Trámites programados en la semana y/o cumplidos en la semana.'],
      ['Trámites atrasados', 'Represado completo al corte: programados antes del domingo y sin cumplir.'],
      ['Cartera semana', 'Cuotas con vencimiento en la semana. Solo conceptos iniciales: separación, cuota inicial y cesantías.'],
      ['Cartera mora', 'Saldo en mora a hoy, todos los conceptos. Sustenta la sección 3 del correo.'],
    ].map(([a, b]) => ({ a, b }))));

  // ── Resumen: las mismas tablas del correo, en MM.
  hojas.push(hoja('Año', [T('a', 'Indicador', 34), T('b', 'Valor', 22)], [
    ['Ventas del año MM',            mm(ac.ventas_mm)],
    ['Meta del año a la fecha MM',   mm(ac.ventas_meta_mm)],
    ['Cumplimiento ventas',          pct(ac.ventas_mm, ac.ventas_meta_mm)],
    ['Unidades vendidas',            num(ac.ventas_un).toLocaleString('es-CO')],
    ['Trámites programados año',     num(ac.tram_debian).toLocaleString('es-CO')],
    ['Trámites cumplidos año',       num(ac.tram_hicieron).toLocaleString('es-CO')],
    ['Cumplimiento trámites',        pct(ac.tram_hicieron, ac.tram_debian)],
    ['Trámites vencidos acumulados', num(ac.tram_vencidos).toLocaleString('es-CO')],
    ['Cartera pactada año MM',       mm(ac.cartera_pactado_mm)],
    ['Cartera recaudada año MM',     mm(ac.cartera_pagado_mm)],
    ['Cumplimiento recaudo',         pct(ac.cartera_pagado_mm, ac.cartera_pactado_mm)],
    ['Obra ejecutada año MM',        mm(ac.obra_mm)],
    ['Avance de obra',               pct(ac.obra_vida_real_mm, ac.obra_vida_ppto_mm)],
  ].map(([a, b]) => ({ a, b: String(b) }))));

  hojas.push(hoja('Tendencia', [
    F('lunes', 'Lunes'), F('domingo', 'Domingo'),
    N('un_sem', 'Unidades', 10), P('mm_sem', 'Vendido MM'),
    P('mm_meta_sem', 'Meta sem. MM'), N('desist_un_sem', 'Desist.', 10),
    P('mm_ytd', 'Año MM'), P('mm_meta_ytd', 'Meta año MM'),
    N('debian', 'Trám. debían', 13), N('hicieron', 'Trám. hicieron', 14),
    N('vencidos_acum', 'Vencidos acum.', 14),
    P('pactado_mm', 'Pactado MM'), P('pagado_mm', 'Recaudo MM'),
    P('obra_mm', 'Obra MM'),
  ], d.tendencia || []));

  hojas.push(hoja('Ventas resumen', [
    T('proyecto', 'Proyecto', 26),
    N('inv_total', 'Inventario', 11), N('inv_vendidas', 'Vendidas', 10),
    N('inv_disponibles', 'Disponibles', 12),
    N('un_sem', 'Un. semana', 11), P('mm_sem', 'Vendido sem. MM'),
    N('un_ppto_sem', 'Meta un. sem.', 13), P('mm_ppto_sem', 'Meta sem. MM'),
    N('desist_un_sem', 'Desist. un.', 11), P('desist_mm_sem', 'Desist. MM'),
    N('un_ytd', 'Un. año', 10), P('mm_ytd', 'Año MM'), P('mm_ppto_ytd', 'Meta año MM'),
  ], d.ventas || []));

  hojas.push(hoja('Trámites resumen', [
    T('categoria', 'Trámite', 24), T('grupo', 'Grupo', 14),
    N('debian_ytd', 'Debían año', 12), N('hicieron_ytd', 'Van año', 11),
    N('debian', 'Debían sem.', 12), N('hicieron', 'Hicieron sem.', 13),
    N('atrasados', 'Atrasados', 11), F('mas_antiguo', 'Más antiguo'),
    N('atraso_promedio', 'Atraso prom. d', 14), N('prox_semana', 'Próx. sem.', 11),
  ], d.tramites || []));

  hojas.push(hoja('Trámites x proyecto', [
    T('proyecto', 'Proyecto', 26),
    N('debian_ytd', 'Debían año', 12), N('hicieron_ytd', 'Van año', 11),
    N('debian', 'Debían sem.', 12), N('hicieron', 'Hicieron sem.', 13),
    N('atrasados', 'Atrasados', 11), F('mas_antiguo', 'Más antiguo'),
    N('atraso_promedio', 'Atraso prom. d', 14),
  ], d.tramitesProy || []));

  hojas.push(hoja('Cartera resumen', [
    T('proyecto', 'Proyecto', 26),
    P('pactado_sem_mm', 'Pactado sem. MM'), P('pagado_sem_mm', 'Recaudado sem. MM'),
    P('vencido_mm', 'Vencido MM'), P('vencido_90_mm', 'Vencido +90d MM'),
    P('vencido_credito_mm', 'Vencido crédito MM'), P('vencido_subsidio_mm', 'Vencido subsidio MM'),
    N('clientes_mora', 'Clientes en mora', 15),
  ], d.cartera || []));

  hojas.push(hoja('Flujo', [
    T('proyecto', 'Proyecto', 26), F('corte', 'Corte'),
    P('fcl_mm', 'FCL del mes MM'), P('fcl_acum_mm', 'FCL acumulado MM'),
    P('ingresos_mm', 'Ingresos MM'), P('costos_mm', 'Costos MM'),
  ], d.flujoCorte || []));

  hojas.push(hoja('Ventas', [
    T('proyecto', 'Proyecto', 26), T('unidad', 'Unidad', 16),
    T('comprador', 'Comprador', 34), T('documento', 'Documento', 14),
    F('fecha_venta', 'Fecha venta'), T('vendedor', 'Vendedor', 26),
    P('valor_neto', 'Valor neto', 16), N('area_m2', 'Área m2', 10),
    T('estado', 'Estado', 14), T('entidad_credito', 'Entidad crédito', 22),
    T('estado_plan_pago', 'Estado plan pago', 18),
  ], det.ventas));

  hojas.push(hoja('Desistimientos', [
    T('proyecto', 'Proyecto', 26), T('unidad', 'Unidad', 16),
    T('comprador', 'Comprador', 34), T('documento', 'Documento', 14),
    F('fecha_desistimiento', 'Fecha desist.'), F('fecha_venta_original', 'Fecha venta'),
    T('vendedor', 'Vendedor', 26), P('valor_venta', 'Valor venta', 16),
    P('valor_arras', 'Arras', 14), P('valor_a_devolver', 'A devolver', 14),
    T('motivo', 'Motivo', 30), T('observaciones', 'Observaciones', 50),
  ], det.desistimientos));

  hojas.push(hoja('Trámites semana', [
    T('proyecto', 'Proyecto', 26), T('categoria', 'Categoría', 22),
    T('unidad', 'Unidad', 16), T('comprador', 'Comprador', 34),
    T('documento', 'Documento', 14), T('tramite', 'Trámite', 38),
    T('codigo', 'Código', 10), T('estado', 'Estado', 12),
    F('fecha_programada', 'Programada'), F('fecha_cumplimiento', 'Cumplida'),
    N('dias_desfase', 'Días desfase', 12), T('responsable', 'Responsable', 28),
    T('cumplido_por', 'Cumplido por', 28),
  ], det.tramitesSemana));

  hojas.push(hoja('Trámites atrasados', [
    T('proyecto', 'Proyecto', 26), T('categoria', 'Categoría', 22),
    T('unidad', 'Unidad', 16), T('comprador', 'Comprador', 34),
    T('documento', 'Documento', 14), T('tramite', 'Trámite', 38),
    T('codigo', 'Código', 10), F('fecha_programada', 'Programada'),
    N('dias_atraso', 'Días atraso', 12), T('responsable', 'Responsable', 28),
    T('estado', 'Estado', 12),
  ], det.tramitesAtrasados));

  hojas.push(hoja('Cartera semana', [
    T('proyecto', 'Proyecto', 26), T('unidad', 'Unidad', 16),
    T('comprador', 'Comprador', 34), T('documento', 'Documento', 14),
    T('concepto', 'Concepto', 18), F('fecha_vencimiento', 'Vencimiento'),
    P('pactado', 'Pactado', 16), P('pagado', 'Pagado', 16),
    P('diferencia', 'Diferencia', 16), P('saldo', 'Saldo', 16),
    N('dias_mora', 'Días mora', 11), P('saldo_en_mora', 'Saldo en mora', 16),
    T('estado_cartera', 'Estado cartera', 18), T('entidad', 'Entidad', 24),
  ], det.carteraSemana));

  hojas.push(hoja('Cartera mora', [
    T('proyecto', 'Proyecto', 26), T('unidad', 'Unidad', 16),
    T('comprador', 'Comprador', 34), T('documento', 'Documento', 14),
    T('concepto', 'Concepto', 18), F('fecha_vencimiento', 'Vencimiento'),
    P('pactado', 'Pactado', 16), P('pagado', 'Pagado', 16),
    N('dias_mora', 'Días mora', 11), P('saldo_en_mora', 'Saldo en mora', 16),
    T('estado_cartera', 'Estado cartera', 18), T('entidad', 'Entidad', 24),
  ], det.carteraMora));

  // Obra va en millones porque su fuente ya viene redondeada a MM.
  hojas.push(hoja('Obra', [
    T('proyecto', 'Proyecto', 26), N('prog_sem_mm', 'Programado sem. MM'),
    N('inv_sem_mm', 'Invertido sem. MM'), N('prog_mtd_mm', 'Programado mes MM'),
    N('inv_mtd_mm', 'Invertido mes MM'), N('acum_mm', 'Acumulado MM'),
    N('ppto_mm', 'Ppto obra MM'), N('avance_pct', 'Avance %', 11),
    N('cobertura_pct', 'Cobertura crono %', 16), F('horizonte', 'Horizonte crono'),
  ], det.obra));

  return XLSX.construir(hojas);
}

function nombreLibro(semana) {
  return `Soporte productividad ${semana.ini} a ${semana.fin}.xlsx`;
}

// ─── Envío por Microsoft Graph ────────────────────────────────────────────────

async function graphToken() {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`Token Graph ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

// sendMail acepta adjuntos en línea hasta ~3 MB de mensaje total. El libro
// comprimido pesa cientos de KB, pero si algún día se pasa hay que subirlo con
// una upload session en vez de meterlo en el cuerpo.
const TOPE_ADJUNTO = 3 * 1024 * 1024;

async function enviar(asunto, html, adjunto) {
  const token = await graphToken();

  const mensaje = {
    subject: asunto,
    body: { contentType: 'HTML', content: html },
    toRecipients: TO_EMAILS.map(e => ({ emailAddress: { address: e } })),
  };

  if (adjunto && adjunto.datos.length <= TOPE_ADJUNTO) {
    mensaje.attachments = [{
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: adjunto.nombre,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contentBytes: adjunto.datos.toString('base64'),
    }];
  } else if (adjunto) {
    console.warn(`[email] Soporte de ${(adjunto.datos.length / 1048576).toFixed(1)} MB por encima del tope; se envía sin adjunto.`);
  }

  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${FROM_EMAIL}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: mensaje, saveToSentItems: false }),
  });
  if (!(res.ok || res.status === 202)) {
    throw new Error(`sendMail ${res.status}: ${await res.text()}`);
  }
  console.log(`[email] Enviado a: ${TO_EMAILS.join(', ')}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_KEY.');
  }

  const semana = semanaReporte(argSem);
  console.log(`[reporte] Semana ${semana.ini} → ${semana.fin}`);

  const tendIni = lunesAtras(semana.ini, Q.SEMANAS_TENDENCIA);

  // Secuencial a propósito. Las nueve consultas en paralelo saturaban el pool y
  // alguna moría con statement timeout (57014) aunque sola corra en menos de 3 s;
  // en serie el reporte completo tarda ~9 s y no falla.
  const plan = [
    ['tendencia',    Q.TENDENCIA(tendIni, semana.fin),          Q.SEMANAS_TENDENCIA + 2],
    ['acumulado',    Q.ACUMULADO(semana.fin),                    2],
    ['ventas',       Q.VENTAS(semana.ini, semana.fin),          60],
    ['tramites',     Q.TRAMITES(semana.ini, semana.fin),        30],
    ['tramitesProy', Q.TRAMITES_PROYECTO(semana.ini, semana.fin), 60],
    ['cartera',      Q.CARTERA(semana.ini, semana.fin),         60],
    ['obra',         Q.OBRA(semana.ini, semana.fin),            60],
    ['flujoProxy',   Q.FLUJO_PROXY(semana.ini, semana.fin),      5],
    ['flujoCorte',   Q.FLUJO_CORTE(),                           80],
    ['frescura',     Q.FRESCURA(),                              10],
  ];

  const d = { semana };
  for (const [nombre, query, filas] of plan) d[nombre] = await sql(query, filas);

  const { html, asunto } = construirHtml(d);

  // Detalle del adjunto. Va después del HTML para que un fallo armando el
  // soporte no impida mandar el correo: el resumen es lo que no puede faltar.
  let adjunto = null;
  try {
    const det = {
      ventas:            await sqlTodo(off => Q.DET_VENTAS(semana.ini, semana.fin, off)),
      desistimientos:    await sqlTodo(off => Q.DET_DESISTIMIENTOS(semana.ini, semana.fin, off)),
      tramitesSemana:    await sqlTodo(off => Q.DET_TRAMITES_SEMANA(semana.ini, semana.fin, off)),
      tramitesAtrasados: await sqlTodo(off => Q.DET_TRAMITES_ATRASADOS(semana.fin, off)),
      carteraSemana:     await sqlTodo(off => Q.DET_CARTERA_SEMANA(semana.ini, semana.fin, off)),
      carteraMora:       await sqlTodo(off => Q.DET_CARTERA_MORA(off), 5000),
      obra:              d.obra,
    };
    console.log('[soporte] ' + Object.entries(det)
      .map(([k, v]) => `${k}=${v.length}`).join(' '));
    adjunto = { nombre: nombreLibro(semana), datos: construirLibro(det, d, semana) };
    console.log(`[soporte] ${adjunto.nombre} — ${(adjunto.datos.length / 1024).toFixed(0)} KB`);
  } catch (err) {
    console.error(`[soporte] No se pudo armar el .xlsx: ${err.message}`);
  }

  if (DRY_RUN) {
    const out = path.join(__dirname, 'reporte.html');
    fs.writeFileSync(out, html, 'utf8');
    console.log(`[dry-run] Asunto: ${asunto}`);
    console.log(`[dry-run] HTML escrito en ${out} — no se envió correo.`);
    if (adjunto) {
      const xls = path.join(__dirname, adjunto.nombre);
      fs.writeFileSync(xls, adjunto.datos);
      console.log(`[dry-run] Soporte escrito en ${xls}`);
    }
    return;
  }

  if (!FROM_EMAIL || TO_EMAILS.length === 0) {
    throw new Error('Faltan ALERT_FROM_EMAIL o ALERT_TO_EMAILS para enviar.');
  }
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Faltan credenciales de Azure para Graph sendMail.');
  }

  await enviar(asunto, html, adjunto);
}

main().catch(err => {
  console.error('[reporte-semanal]', err.message);
  process.exitCode = 1;
});
