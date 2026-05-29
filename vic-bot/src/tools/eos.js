const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CO = 'ic-constructora'

async function getRocks({ quarter, status } = {}) {
  let q = supabase
    .from('rocks')
    .select('title, owner, priority, status, due, quarter, notes')
    .eq('company_id', CO)
    .order('quarter', { ascending: false })
    .order('priority', { ascending: true })

  if (quarter) q = q.eq('quarter', quarter)
  if (status) q = q.eq('status', status)

  const { data, error } = await q.limit(30)
  if (error) return `Error: ${error.message}`

  if (!data?.length) return 'No se encontraron rocas con esos filtros.'
  return data
}

async function getMetrics({ category } = {}) {
  let q = supabase
    .from('metrics')
    .select(`
      name, category, owner, goal, unit, lower_is_better,
      metric_values (week_label, week_date, value)
    `)
    .eq('company_id', CO)
    .eq('active', true)
    .order('category')

  if (category) q = q.ilike('category', `%${category}%`)

  const { data, error } = await q.limit(30)
  if (error) return `Error: ${error.message}`

  if (!data?.length) return 'No se encontraron métricas.'

  // Ordenar los valores de cada métrica por fecha descendente y tomar últimos 3
  return data.map(m => ({
    ...m,
    metric_values: (m.metric_values || [])
      .sort((a, b) => (b.week_date || '').localeCompare(a.week_date || ''))
      .slice(0, 3)
  }))
}

async function getIssues({ status = 'open', type } = {}) {
  let q = supabase
    .from('issues')
    .select('title, type, priority, status, identified_by, owner, discussion')
    .eq('company_id', CO)
    .eq('status', status)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })

  if (type) q = q.eq('type', type)

  const { data, error } = await q.limit(25)
  if (error) return `Error: ${error.message}`

  if (!data?.length) return `No hay asuntos con estado "${status}".`
  return data
}

async function getPeople({ query, dept } = {}) {
  let q = supabase
    .from('people')
    .select('name, role, dept, email, gwc, values_fit, notes')
    .eq('company_id', CO)
    .order('name')

  if (dept) q = q.ilike('dept', `%${dept}%`)

  if (query) {
    q = q.or(`name.ilike.%${query}%,role.ilike.%${query}%,dept.ilike.%${query}%`)
  }

  const { data, error } = await q.limit(20)
  if (error) return `Error: ${error.message}`

  if (!data?.length) return 'No se encontraron personas con ese criterio.'

  return data.map(p => ({
    nombre: p.name,
    rol: p.role,
    area: p.dept,
    email: p.email,
    gwc: p.gwc ? {
      entiende: p.gwc[0],
      quiere: p.gwc[1],
      puede: p.gwc[2]
    } : null,
    valores_fit: p.values_fit,
    notas: p.notes
  }))
}

async function getMeetings({ status, limit = 5 } = {}) {
  let q = supabase
    .from('meetings')
    .select('title, type, date, status, attendees, rating, rocks_reviewed, issues_solved, notes')
    .eq('company_id', CO)
    .order('date', { ascending: false })

  if (status) q = q.eq('status', status)

  const { data, error } = await q.limit(limit)
  if (error) return `Error: ${error.message}`

  if (!data?.length) return 'No se encontraron reuniones.'
  return data
}

async function getProcesses({ status } = {}) {
  let q = supabase
    .from('processes')
    .select('name, owner, status, documented, steps, kpi, notes')
    .eq('company_id', CO)
    .order('status')
    .order('name')

  if (status) q = q.eq('status', status)

  const { data, error } = await q.limit(25)
  if (error) return `Error: ${error.message}`

  if (!data?.length) return 'No se encontraron procesos.'
  return data
}

module.exports = { getRocks, getMetrics, getIssues, getPeople, getMeetings, getProcesses }
