const { createClient } = require('@supabase/supabase-js')

// Acceso de VIC a los datos vivos de SINCO (módulos CBR, ADPRO, AyF) en Supabase.
//
// A diferencia de las tools EOS (que leen tablas fijas), aquí VIC genera SQL
// propio. La seguridad NO está en este cliente sino en Postgres: las tres RPC
// (vic_query_sinco, vic_list_sinco_tables, vic_describe_sinco_table) son
// SECURITY DEFINER, acotadas a los esquemas curados, y vic_query_sinco ejecuta
// en transacción READ ONLY con validación de solo-SELECT. Ver migración
// vic_sinco_readonly_query_v2.

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ESQUEMAS = ['sinco_ic_raw', 'sinco_ic_targets', 'sinco_ic_historico', 'sinco_ic_calc']

// Lista tablas/vistas de un esquema SINCO. Filtro opcional por subcadena del
// nombre (útil para acotar por módulo: 'adi_'=CBR, 'adp_'=ADPRO, 'fin_'=AyF).
async function listSincoTables({ schema = 'sinco_ic_raw', filter } = {}) {
  if (!ESQUEMAS.includes(schema)) {
    return `Esquema no permitido. Usa uno de: ${ESQUEMAS.join(', ')}.`
  }
  const { data, error } = await supabase.rpc('vic_list_sinco_tables', {
    schema_name: schema,
    name_filter: filter || null
  })
  if (error) return `Error al listar tablas: ${error.message}`
  if (!data?.length) return `No hay tablas en ${schema} que coincidan con "${filter || ''}".`
  return data
}

// Describe columnas (nombre + tipo) de una tabla/vista de SINCO.
async function describeSincoTable({ schema = 'sinco_ic_raw', table } = {}) {
  if (!ESQUEMAS.includes(schema)) {
    return `Esquema no permitido. Usa uno de: ${ESQUEMAS.join(', ')}.`
  }
  if (!table?.trim()) return 'Falta el nombre de la tabla.'

  const { data, error } = await supabase.rpc('vic_describe_sinco_table', {
    schema_name: schema,
    tbl_name: table
  })
  if (error) return `Error al describir ${schema}.${table}: ${error.message}`
  return data
}

// Ejecuta un SELECT de solo-lectura sobre los esquemas curados de SINCO.
// Postgres rechaza cualquier escritura. Devuelve filas (máx row_limit) o el
// mensaje de error para que VIC corrija el SQL e intente de nuevo.
async function querySinco({ sql, limit = 200 } = {}) {
  if (!sql?.trim()) return 'Falta el SQL a ejecutar.'

  const { data, error } = await supabase.rpc('vic_query_sinco', {
    query_text: sql,
    row_limit: limit
  })
  if (error) return `Error en la consulta: ${error.message}`
  if (!data?.length) return 'La consulta no devolvió filas.'
  return data
}

// ── Acceso total de SOLO LECTURA a Supabase ─────────────────────────
// VIC es el canal de comunicación del portal: ve todos los esquemas de
// negocio (EOS en public, SINCO, targets, etc.), no solo los 4 de SINCO.
// La seguridad vive en Postgres (RPC vic_query_db: solo-SELECT, READ ONLY,
// esquemas sensibles bloqueados). Ver migración vic_acceso_total_lectura.

async function listDbSchemas() {
  const { data, error } = await supabase.rpc('vic_list_db_schemas')
  if (error) return `Error al listar esquemas: ${error.message}`
  return data
}

async function listDbTables({ schema, filter } = {}) {
  if (!schema?.trim()) return 'Falta el esquema. Usa list_db_schemas para descubrirlos.'
  const { data, error } = await supabase.rpc('vic_list_db_tables', {
    schema_name: schema,
    name_filter: filter || null
  })
  if (error) return `Error al listar tablas de ${schema}: ${error.message}`
  if (!data?.length) return `No hay tablas en ${schema} que coincidan con "${filter || ''}".`
  return data
}

async function describeDbTable({ schema, table } = {}) {
  if (!schema?.trim()) return 'Falta el esquema.'
  if (!table?.trim()) return 'Falta el nombre de la tabla.'
  const { data, error } = await supabase.rpc('vic_describe_db_table', {
    schema_name: schema,
    tbl_name: table
  })
  if (error) return `Error al describir ${schema}.${table}: ${error.message}`
  return data
}

async function queryDb({ sql, limit = 200 } = {}) {
  if (!sql?.trim()) return 'Falta el SQL a ejecutar.'
  const { data, error } = await supabase.rpc('vic_query_db', {
    query_text: sql,
    row_limit: limit
  })
  if (error) return `Error en la consulta: ${error.message}`
  if (!data?.length) return 'La consulta no devolvió filas.'
  return data
}

// Alarma de negocio: etapas activas cuya última lista de precios se creó hace
// 30+ días. Lee la vista curada vía RPC SECURITY DEFINER (misma fuente que el
// portal /alarmas). alta = >60 días, media = 30-60 días.
async function listasPrecioAtrasadas() {
  const { data, error } = await supabase.rpc('vic_listas_precio_atrasadas')
  if (error) return `Error al consultar listas atrasadas: ${error.message}`
  if (!data?.length) return 'Todas las etapas activas tienen una lista de precios creada en los últimos 30 días.'
  return data
}

module.exports = {
  listSincoTables, describeSincoTable, querySinco,
  listDbSchemas, listDbTables, describeDbTable, queryDb,
  listasPrecioAtrasadas
}
