const { createClient } = require('@supabase/supabase-js')
const { searchDirectory, getDirectoryUser } = require('../lib/graph')

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

// Espejo del directorio: deja en public.directory_people a quien resolvimos
// en Entra. Las RPC de tareas validan contra el directorio DENTRO de Postgres
// (_task_person_name), y Postgres no puede llamar a Graph: sin este espejo,
// asignarle a alguien que no fue invitado a la app falla siempre.
async function mirrorToDirectory(personas) {
  const filas = (personas || [])
    .filter((p) => p?.email)
    .map((p) => ({
      email: p.email.toLowerCase(),
      full_name: p.name || '',
      job_title: p.cargo || '',
      area: p.area || '',
      aad_object_id: p.aadObjectId || '',
      source: 'entra',
      synced_at: new Date().toISOString(),
    }))
  if (!filas.length) return true
  const { error } = await supabase.from('directory_people').upsert(filas, { onConflict: 'email' })
  if (error) {
    console.error('[VIC] No pude espejar el directorio:', error.message)
    return false
  }
  return true
}

// Resuelve personas por nombre o correo. Dos fuentes, en este orden:
//   1. Roster de la app (invited_users + profiles) — quien ya usa Tracción.
//   2. Entra ID vía Graph — el directorio real de la empresa, con TODOS.
// La segunda existe porque el roster solo tiene a los invitados a la app: sin
// ella VIC contestaba "no encontré a nadie con ese nombre" para gente que sí
// trabaja en IC. El modelo usa esto para obtener el correo exacto antes de
// asignar/consultar.
async function findPerson({ query } = {}) {
  const q = (query || '').trim()
  if (!q) return 'Indica un nombre o correo a buscar.'

  const like = `%${q}%`
  const [inv, prof, entra] = await Promise.all([
    supabase.from('invited_users').select('email, full_name, area').or(`full_name.ilike.${like},email.ilike.${like}`).limit(10),
    supabase.from('profiles').select('email, full_name, area, job_title').or(`full_name.ilike.${like},email.ilike.${like}`).limit(10),
    searchDirectory(q),
  ])

  const map = new Map()
  for (const r of [...(inv.data || []), ...(prof.data || [])]) {
    const email = (r.email || '').toLowerCase()
    if (email && !map.has(email)) {
      map.set(email, { email, name: r.full_name || '', area: r.area || '', cargo: r.job_title || '', fuente: 'roster' })
    }
  }
  for (const u of entra) {
    if (!map.has(u.email)) {
      map.set(u.email, { email: u.email, name: u.name, area: u.area, cargo: u.cargo, fuente: 'entra' })
    }
  }

  // Todo lo que vino de Entra queda espejado, así se le puede asignar de una.
  await mirrorToDirectory(entra)

  const matches = [...map.values()]
  if (!matches.length) return `No encontré a nadie que coincida con "${q}" ni en la app ni en el directorio de la empresa.`
  return matches
}

// Garantiza que el correo esté en el directorio que ve Postgres. Si no está
// en el roster ni en el espejo, lo busca en Entra y lo espeja.
// Devuelve { ok } o { ok: false, motivo } para que el llamador lo explique.
async function ensureInDirectory(email) {
  const e = (email || '').trim().toLowerCase()
  if (!e) return { ok: false, motivo: 'Falta el correo.' }

  const [inv, prof, dir] = await Promise.all([
    supabase.from('invited_users').select('email').ilike('email', e).limit(1),
    supabase.from('profiles').select('email').ilike('email', e).limit(1),
    supabase.from('directory_people').select('email').ilike('email', e).limit(1),
  ])
  if (inv.data?.length || prof.data?.length || dir.data?.length) return { ok: true }

  const persona = await getDirectoryUser(e)
  if (!persona) {
    return {
      ok: false,
      motivo: `No encontré a ${e} en el directorio de la organización. ` +
        'Verifica el correo con find_person antes de asignar.',
    }
  }

  if (!(await mirrorToDirectory([persona]))) {
    return {
      ok: false,
      motivo: `${persona.name} sí está en el directorio de la empresa, pero no pude registrarlo ` +
        'para el módulo de tareas (falta aplicar la migración 20260910_001_directory_people_entra.sql). ' +
        'Avísale a TI.',
    }
  }
  return { ok: true }
}

// Crea/asigna una tarea. El creador (= verificador) es quien escribe a VIC.
async function createTask({ creatorEmail, assigned_email, title, due_date, description, priority } = {}) {
  if (!creatorEmail) return 'No pude identificar tu cuenta de Teams; no puedo asignar la tarea a tu nombre.'
  if (!assigned_email?.trim()) return 'Falta el correo del responsable. Búscalo primero con find_person.'
  if (!title?.trim()) return 'La tarea necesita un título.'

  // El responsable puede ser alguien que nunca entró a la app: si está en
  // Entra, lo espejamos para que la RPC lo reconozca.
  const enDirectorio = await ensureInDirectory(assigned_email)
  if (!enDirectorio.ok) return enDirectorio.motivo

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
  findPerson, ensureInDirectory, createTask, commitTask, updateTaskStatus,
  submitTaskProof, verifyTask, getMyTasks, getTasksFor,
}
