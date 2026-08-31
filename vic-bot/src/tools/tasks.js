const { createClient } = require('@supabase/supabase-js')

// Módulo de Tareas EOS vía VIC.
//
// VIC asigna, comprometa fechas, cierra (con prueba) y verifica tareas.
// Es la ÚNICA escritura que VIC puede hacer: pasa por RPC SECURITY DEFINER
// acotadas a public.tasks (task_create, task_commit, ...). La seguridad vive
// en Postgres; aquí no se decide nada.
//
// CRÍTICO: el email de quien actúa (creador / responsable / verificador) lo
// inyecta el servidor desde ctx.email (la actividad de Teams), NO el modelo.
// Así el LLM no puede actuar en nombre de otra persona. Lo único que el modelo
// elige es A QUIÉN se asigna (assigned_email) y SOBRE QUÉ tarea (task_id).

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CO = 'ic-constructora'

// Aviso proactivo INMEDIATO al responsable (sin esperar el cron). Llama al
// propio endpoint /api/push del bot, autenticado con VIC_PUSH_SECRET. Si la
// persona aún no le ha escrito a VIC (sin conversation_ref), el push falla en
// silencio y el cron lo reintenta luego; nunca rompe la creación de la tarea.
async function notifyAssignmentDM(assignedEmail, title, dueDate, assignerName) {
  const secret = process.env.VIC_PUSH_SECRET
  if (!secret) return false
  const port = process.env.PORT || 3978
  const quien = assignerName ? `${assignerName} te asignó` : 'Te asignaron'
  const text =
    `${quien} una tarea: «${title}» (vence ${dueDate || 'sin fecha'}). ` +
    `Respóndeme con la fecha a la que te comprometes a cumplirla.`
  try {
    const res = await fetch(`http://localhost:${port}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-vic-push-secret': secret },
      body: JSON.stringify({ to_email: assignedEmail, text }),
    })
    return res.ok
  } catch {
    return false
  }
}

// Resuelve personas del roster (invited_users + profiles) por nombre o correo.
// El modelo lo usa para obtener el email exacto antes de asignar/consultar.
async function findPerson({ query } = {}) {
  const q = (query || '').trim()
  if (!q) return 'Indica un nombre o correo a buscar.'

  const like = `%${q}%`
  const [inv, prof] = await Promise.all([
    supabase.from('invited_users').select('email, full_name, area').or(`full_name.ilike.${like},email.ilike.${like}`).limit(10),
    supabase.from('profiles').select('email, full_name, area').or(`full_name.ilike.${like},email.ilike.${like}`).limit(10),
  ])

  const map = new Map()
  for (const r of [...(inv.data || []), ...(prof.data || [])]) {
    const email = (r.email || '').toLowerCase()
    if (email && !map.has(email)) map.set(email, { email, name: r.full_name || '', area: r.area || '' })
  }

  const matches = [...map.values()]
  if (!matches.length) return `No encontré a nadie que coincida con "${q}" en el directorio.`
  return matches
}

// Crea/asigna una tarea. El creador (= verificador) es quien escribe a VIC.
async function createTask({ creatorEmail, assigned_email, title, due_date, description, priority } = {}) {
  if (!creatorEmail) return 'No pude identificar tu cuenta de Teams; no puedo asignar la tarea a tu nombre.'
  if (!assigned_email?.trim()) return 'Falta el correo del responsable. Búscalo primero con find_person.'
  if (!title?.trim()) return 'La tarea necesita un título.'

  const { data, error } = await supabase.rpc('task_create', {
    p_creator_email: creatorEmail,
    p_assigned_email: assigned_email,
    p_title: title,
    p_due_date: due_date || null,
    p_description: description || '',
    p_priority: priority || 'media',
  })
  if (error) return `No pude crear la tarea: ${error.message}`

  // Nombre de quien asigna (para el aviso) desde la fila recién creada.
  const { data: row } = await supabase
    .from('tasks').select('created_by_name').eq('id', data).single()

  // Avisar de inmediato al responsable y, si se logró, marcar para que el
  // cron no lo notifique otra vez.
  const notified = await notifyAssignmentDM(assigned_email, title, due_date, row?.created_by_name)
  if (notified) {
    await supabase.from('tasks').update({ assigned_notified_at: new Date().toISOString() }).eq('id', data)
  }

  return { ok: true, task_id: data, assigned_to: assigned_email, title, due_date: due_date || null, notified }
}

// El responsable se compromete a una fecha de cumplimiento.
async function commitTask({ callerEmail, task_id, committed_date } = {}) {
  if (!callerEmail) return 'No pude identificar tu cuenta de Teams.'
  if (!task_id) return 'Falta el id de la tarea.'
  if (!committed_date) return 'Falta la fecha a la que te comprometes (YYYY-MM-DD).'

  const { data, error } = await supabase.rpc('task_commit', {
    p_caller_email: callerEmail, p_task_id: task_id, p_committed_date: committed_date,
  })
  if (error) return `No pude registrar el compromiso: ${error.message}`
  return data
}

// Cambia el estado de avance (accepted / in_progress / blocked).
async function updateTaskStatus({ callerEmail, task_id, status } = {}) {
  if (!callerEmail) return 'No pude identificar tu cuenta de Teams.'
  if (!task_id) return 'Falta el id de la tarea.'

  const { data, error } = await supabase.rpc('task_update_status', {
    p_caller_email: callerEmail, p_task_id: task_id, p_status: status,
  })
  if (error) return `No pude actualizar el estado: ${error.message}`
  return data
}

// El responsable adjunta la foto-prueba → la tarea queda en 'submitted'.
// El proof_url lo genera el bot al subir el adjunto a SharePoint (fase 3);
// el modelo no lo inventa.
async function submitTaskProof({ callerEmail, task_id, proof_url, note } = {}) {
  if (!callerEmail) return 'No pude identificar tu cuenta de Teams.'
  if (!task_id) return 'Falta el id de la tarea.'
  if (!proof_url?.trim()) return 'Para cerrar la tarea adjunta una foto como prueba.'

  const { data, error } = await supabase.rpc('task_submit_proof', {
    p_caller_email: callerEmail, p_task_id: task_id, p_proof_url: proof_url, p_note: note || '',
  })
  if (error) return `No pude registrar la prueba: ${error.message}`
  return data
}

// Verifica y cierra. La hace quien asignó (o un admin/CEO).
async function verifyTask({ callerEmail, task_id } = {}) {
  if (!callerEmail) return 'No pude identificar tu cuenta de Teams.'
  if (!task_id) return 'Falta el id de la tarea.'

  const { data, error } = await supabase.rpc('task_verify', {
    p_caller_email: callerEmail, p_task_id: task_id,
  })
  if (error) return `No pude verificar la tarea: ${error.message}`
  return data
}

// Tareas pendientes de quien pregunta.
async function getMyTasks({ callerEmail } = {}) {
  if (!callerEmail) return 'No pude identificar tu cuenta de Teams.'
  const { data, error } = await supabase.rpc('get_my_tasks', { p_caller_email: callerEmail })
  if (error) return `No pude leer tus tareas: ${error.message}`
  if (!data?.length) return 'No tienes tareas pendientes.'
  return data
}

// Tareas de un responsable (para el asignador o el CEO).
async function getTasksFor({ callerEmail, target_email } = {}) {
  if (!callerEmail) return 'No pude identificar tu cuenta de Teams.'
  if (!target_email?.trim()) return 'Falta el correo de la persona a consultar. Búscalo con find_person.'
  const { data, error } = await supabase.rpc('get_tasks_for', {
    p_caller_email: callerEmail, p_target_email: target_email,
  })
  if (error) return `No pude leer esas tareas: ${error.message}`
  if (!data?.length) return 'No hay tareas registradas para esa persona (o no tienes visibilidad sobre ellas).'
  return data
}

module.exports = {
  findPerson, createTask, commitTask, updateTaskStatus,
  submitTaskProof, verifyTask, getMyTasks, getTasksFor,
}
