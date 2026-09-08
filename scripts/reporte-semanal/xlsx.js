/**
 * xlsx.js — Escritor mínimo de archivos .xlsx, sin dependencias.
 *
 * El reporte semanal corre en GitHub Actions con `node reporte-semanal.js` a
 * secas: el workflow no hace `npm install` y el resto del proyecto es
 * dependency-free a propósito. Traer exceljs solo para adjuntar un soporte
 * obligaría a meter un paso de instalación en CI, así que el .xlsx se arma a
 * mano con lo que trae Node: zlib para comprimir y Buffer para el ZIP.
 *
 * Alcance deliberadamente corto: varias hojas, encabezado congelado con
 * autofiltro, y tres tipos de celda (texto, número, fecha). No hay fórmulas,
 * ni gráficos, ni sharedStrings — los textos van inline, que es más verboso
 * pero se comprime bien y evita mantener una tabla de strings.
 *
 * Uso:
 *   construir([{ nombre: 'Ventas', columnas: [...], filas: [[...], ...] }])
 *   → Buffer listo para adjuntar o escribir a disco.
 *
 * Cada columna es { titulo, ancho, tipo }, con tipo 'texto' | 'numero' |
 * 'pesos' (número con signo $) | 'fecha'.
 */

'use strict';

const zlib = require('zlib');

// ─── ZIP ──────────────────────────────────────────────────────────────────────

const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// Fecha/hora MS-DOS fijas: el mismo contenido produce siempre el mismo archivo,
// lo que hace comparable una corrida contra otra.
const DOS_HORA = 0;
const DOS_FECHA = ((2026 - 1980) << 9) | (1 << 5) | 1;

function zip(entradas) {
  const locales = [], central = [];
  let offset = 0;

  for (const { nombre, datos } of entradas) {
    const nom = Buffer.from(nombre, 'utf8');
    const crudo = Buffer.isBuffer(datos) ? datos : Buffer.from(datos, 'utf8');
    const comprimido = zlib.deflateRawSync(crudo, { level: 9 });
    const crc = crc32(crudo);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(DOS_HORA, 10);
    lh.writeUInt16LE(DOS_FECHA, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comprimido.length, 18);
    lh.writeUInt32LE(crudo.length, 22);
    lh.writeUInt16LE(nom.length, 26);
    lh.writeUInt16LE(0, 28);
    locales.push(lh, nom, comprimido);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(DOS_HORA, 12);
    ch.writeUInt16LE(DOS_FECHA, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comprimido.length, 20);
    ch.writeUInt32LE(crudo.length, 24);
    ch.writeUInt16LE(nom.length, 28);
    ch.writeUInt32LE(0, 38);          // atributos externos
    ch.writeUInt32LE(offset, 42);
    central.push(ch, nom);

    offset += lh.length + nom.length + comprimido.length;
  }

  const cd = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entradas.length, 8);
  fin.writeUInt16LE(entradas.length, 10);
  fin.writeUInt32LE(cd.length, 12);
  fin.writeUInt32LE(offset, 16);

  return Buffer.concat([...locales, cd, fin]);
}

// ─── XML ──────────────────────────────────────────────────────────────────────

const MAPA_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

function xmlEsc(s) {
  // Excel rechaza el libro entero si se cuela un carácter de control, y los
  // nombres de comprador que vienen de SINCO traen tabuladores y saltos.
  return String(s)
    .replace(/[&<>"']/g, c => MAPA_ESC[c])
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

// 0 → A, 25 → Z, 26 → AA
function col(n) {
  let s = '';
  for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  }
  return s;
}

// Serial de fecha de Excel: días desde el 1899-12-30 (sistema 1900, con el bug
// del año bisiesto ya incorporado).
const EPOCA = Date.UTC(1899, 11, 30);

function serialFecha(v) {
  const t = v instanceof Date
    ? v.getTime()
    : Date.parse(String(v).slice(0, 10) + 'T00:00:00Z');
  if (Number.isNaN(t)) return null;
  return (t - EPOCA) / 86400000;
}

const ESTILO = { normal: 0, encabezado: 1, fecha: 2, numero: 3, pesos: 4 };

function celda(ref, valor, tipo) {
  if (valor === null || valor === undefined || valor === '') return '';
  const texto = () => `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(valor)}</t></is></c>`;

  if (tipo === 'numero' || tipo === 'pesos') {
    const n = Number(valor);
    return Number.isNaN(n) ? texto() : `<c r="${ref}" s="${ESTILO[tipo]}"><v>${n}</v></c>`;
  }
  if (tipo === 'fecha') {
    const s = serialFecha(valor);
    return s === null ? texto() : `<c r="${ref}" s="${ESTILO.fecha}"><v>${s}</v></c>`;
  }
  return texto();
}

function hojaXml(hoja) {
  const { columnas, filas } = hoja;
  const ultima = col(columnas.length - 1);
  const nFilas = filas.length + 1;

  const cols = columnas.map((c, i) =>
    `<col min="${i + 1}" max="${i + 1}" width="${c.ancho || 16}" customWidth="1"/>`).join('');

  const encabezado = `<row r="1">${columnas.map((c, i) =>
    `<c r="${col(i)}1" t="inlineStr" s="${ESTILO.encabezado}"><is><t>${xmlEsc(c.titulo)}</t></is></c>`).join('')}</row>`;

  const cuerpo = filas.map((f, r) =>
    `<row r="${r + 2}">${f.map((v, i) => celda(`${col(i)}${r + 2}`, v, columnas[i].tipo)).join('')}</row>`
  ).join('');

  // El orden de los elementos no es negociable: Excel rechaza el archivo si
  // sheetViews va después de cols, o autoFilter antes de sheetData.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${ultima}${nFilas}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${encabezado}${cuerpo}</sheetData>
<autoFilter ref="A1:${ultima}${nFilas}"/>
</worksheet>`;
}

const ESTILOS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/><numFmt numFmtId="165" formatCode="#,##0"/><numFmt numFmtId="166" formatCode="&quot;$&quot;#,##0"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1A1A2E"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

// Excel no acepta : \ / ? * [ ] en el nombre de una hoja, ni más de 31 chars.
function nombreHoja(s) {
  return String(s).replace(/[:\\/?*[\]]/g, '-').slice(0, 31);
}

function construir(hojas) {
  const n = hojas.length;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${hojas.map((h, i) =>
  `<sheet name="${xmlEsc(nombreHoja(h.nombre))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  return zip([
    { nombre: '[Content_Types].xml', datos: contentTypes },
    { nombre: '_rels/.rels', datos: rels },
    { nombre: 'xl/workbook.xml', datos: workbook },
    { nombre: 'xl/_rels/workbook.xml.rels', datos: workbookRels },
    { nombre: 'xl/styles.xml', datos: ESTILOS_XML },
    ...hojas.map((h, i) => ({ nombre: `xl/worksheets/sheet${i + 1}.xml`, datos: hojaXml(h) })),
  ]);
}

module.exports = { construir };
