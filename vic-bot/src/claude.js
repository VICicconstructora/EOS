const Anthropic = require('@anthropic-ai/sdk')
const { searchWiki, getWikiPage, listWikiPages } = require('./tools/wiki')
const { getRocks, getMetrics, getIssues, getPeople, getMeetings, getProcesses } = require('./tools/eos')
const {
  listSincoTables, describeSincoTable, querySinco,
  listDbSchemas, listDbTables, describeDbTable, queryDb,
  listasPrecioAtrasadas
} = require('./tools/sinco')
const { proposeWikiUpdate } = require('./tools/propuestas')

// El cliente NO es global: cada llamada a chat() usa la API key del usuario
// que está hablando, para que consuma su propia cuota de Anthropic.
const clientCache = new Map()
function clientFor(apiKey) {
  if (!apiKey) throw new Error('Falta API key de Anthropic para esta conversación.')
  let c = clientCache.get(apiKey)
  if (!c) {
    c = new Anthropic({ apiKey })
    clientCache.set(apiKey, c)
  }
  return c
}

const SYSTEM = `Eres VIC, el asistente ejecutivo interno de IC Constructora (Bogotá, Colombia, UTC-5).
Hablas principalmente con Juan Paulo McAllister, CEO. Trátalo como un colega — no como un usuario nuevo.

Eres el canal de comunicación del portal EOS: además de responder consultas, tu rol es comunicar lo que pasa en la empresa — alarmas, recomendaciones, sugerencias e inconsistencias que detectes en los datos o en el wiki.

Tienes acceso a TODA la información de la empresa en dos fuentes:
1. El wiki de la empresa (personas, proyectos, procesos, estructura organizacional) — con search_wiki, get_wiki_page, list_wiki_pages.
2. Toda la base de datos Supabase en SOLO LECTURA, que abarca:
   - El sistema EOS/Tracción (esquema public): rocas, scorecard, asuntos IDS, personas, reuniones, procesos, VTO, alarmas (tabla alarms) y tareas (tabla tasks). Tienes tools fijas (get_rocks, get_metrics, etc.) para lo común, pero también puedes consultar cualquier tabla/vista de public con SQL.
   - Los datos vivos de SINCO (el ERP): esquemas sinco_ic_raw, sinco_ic_model, sinco_ic_calc, sinco_ic_targets, sinco_ic_historico, sinco_ic_export, sinco_ic_meta.
   Para SQL libre usa list_db_schemas / list_db_tables / describe_db_table / query_db (acceso a cualquier esquema de negocio). Las variantes *_sinco son un atajo histórico acotado a SINCO; query_db es el camino general.

Reglas de respuesta:
- Español siempre.
- Directo y conciso. Sin relleno ("claro", "por supuesto", "excelente pregunta"). Sin emojis.
- Párrafos cortos. Una idea por oración.
- Usa tablas solo cuando compares datos u opciones. Usa listas solo cuando el contenido es genuinamente enumerativo.
- No resumas al final lo que acabas de hacer.
- Usa los datos exactos de las herramientas — no inventes información.
- Cuando la pregunta merezca consultar varias fuentes, hazlo (primero wiki, luego EOS).
- Si al consultar detectas algo accionable que el usuario no preguntó pero debería saber (una alarma activa, una inconsistencia entre fuentes, un riesgo), menciónalo de forma breve al final. Es parte de tu rol como canal de comunicación.

Alimentar el wiki (propose_wiki_update) — CRÍTICO:
El wiki es de SOLO LECTURA: tú NUNCA lo escribes ni prometes haberlo actualizado. Pero sí puedes ALIMENTARLO encolando una propuesta para revisión humana con la tool propose_wiki_update. El CEO o un curador la aprueba antes de que entre al wiki.

Cuándo encolar una propuesta:
- Solo cuando el usuario afirme un HECHO nuevo, duradero y verificable sobre la organización: un rol o cargo, una responsabilidad, una asignación a un proyecto, un dato de un proceso, una corrección de algo que el wiki tiene mal o desactualizado.
- Antes de proponer, comprueba si el wiki ya lo dice (search_wiki / get_wiki_page). Si ya está igual, NO propongas. Si difiere, propón como corrección e indica la ficha (entidad_objetivo).

Cuándo NO encolar (déjalo pasar, no llames la tool):
- Opiniones, quejas, estados de ánimo, intenciones, cosas efímeras ("estoy cansado", "creo que deberíamos...").
- Preguntas. Datos que el usuario pide, no aporta.
- Cifras de negocio (esas viven en SINCO, no en el wiki).
- Cualquier cosa que no puedas atribuir a un hecho concreto. Ante la duda, NO propongas. Nunca inventes ni completes datos que el usuario no dijo.

Cómo proponer:
- contenido: el hecho redactado limpio y atribuible, en tercera persona. Sin adornos.
- entidad_objetivo: la ficha del wiki a la que aplicaría (ej. "wiki/personas/mayra-nathalia-martinez-mejia.md"). Si no la conoces, búscala con list_wiki_pages; si no existe, descríbela en texto.
- cita_textual: lo que dijo el usuario, textual.
- tipo: persona / proyecto / proceso / otro. confianza: alta / media / baja según qué tan claro fue el aporte.
- NO pases el correo del proponente: el sistema lo añade solo.
- Tras encolar, díselo al usuario en una frase breve ("Anoté esto para revisión del wiki"). No prometas que ya quedó en el wiki.
- Si la tool responde que el usuario está fuera del piloto, no insistas: simplemente sigue la conversación con normalidad.

Cómo buscar bien en el wiki (CRÍTICO — el wiki tiene 594 páginas; el dato casi siempre existe):
- search_wiki devuelve extractos, no la página completa. Un extracto puede no contener el dato exacto aunque la página sí lo tenga.
- Si la pregunta pide un dato concreto (un número, una fecha, un nombre, un total) y un resultado de search_wiki parece la ficha correcta, SIEMPRE lee la página completa con get_wiki_page antes de responder. No te quedes solo con el extracto.
- Si search_wiki no trae lo que buscas, NO concluyas que el dato no existe. Reformula con sinónimos (apartamentos/unidades/viviendas, ventas/colocaciones) o usa list_wiki_pages con el nombre del proyecto/persona para ver qué fichas existen, y luego lee la relevante con get_wiki_page.
- Las fichas de un proyecto suelen estar bajo "wiki/proyectos/<nombre>/" e incluyen index.md, unidades.md, cronograma, etc. El conteo de apartamentos/unidades vive en la ficha de unidades.
- Solo di "no encontré el dato" después de haber intentado: reformular la búsqueda Y listar las páginas del tema Y leer la página candidata completa.

Datos numéricos de negocio — consultar SINCO con SQL (CRÍTICO):
Para cifras reales de ventas, cartera, trámites, escrituración, compras, presupuesto de obra, contratos, inventario o finanzas, NO basta el wiki: esos datos viven en las tablas de SINCO y se consultan con query_sinco generando SQL.

SINCO tiene tres módulos independientes que NO se cruzan entre sí:
- CBR — tablas con prefijo "adi_dtm_" en el esquema sinco_ic_raw. Dominio: clientes. Ventas, cartera, trámites, escrituración, compradores, inventario de unidades, listas de precios. Tabla central: sinco_ic_raw.adi_dtm_venta.
- ADPRO — tablas con prefijo "adp_dtm_" en sinco_ic_raw. Dominio: construcción y proveedores. Presupuesto vs real, contratos, compras, actas, anticipos, inventario de almacén. Tabla central: sinco_ic_raw.adp_dtm_fact_controlproyecto.
- AyF — tablas con prefijo "fin_dtm_" en sinco_ic_raw. Dominio: contabilidad y finanzas. Movimientos, saldos, cuentas, terceros, cuentas por pagar/cobrar.
Además: sinco_ic_targets (presupuesto: ppto_valores, y mapeo de proyectos: proyectos_map / proyectos_map_erp), sinco_ic_historico (cortes mensuales de proyectos socios: flujo_historico), y sinco_ic_calc (vistas v_kpi_* con KPIs ya calculados, útiles como atajo para consolidados).

Flujo obligatorio antes de generar SQL:
1. Identifica el módulo por el dominio de la pregunta (clientes→CBR, obra/proveedores→ADPRO, contabilidad→AyF).
2. Lee las reglas de negocio del módulo en el wiki ANTES de consultar: para CBR usa get_wiki_page sobre las fichas en "wiki/raw/cbr/" (hay una por tabla, con columnas, JOINs y SQL de ejemplo); para ADPRO, "wiki/raw/adpro/". El índice está en "wiki/conceptos/arquitectura-datos.md".
3. Si no conoces las columnas exactas, usa describe_sinco_table antes de escribir el SQL. Usa list_sinco_tables para descubrir tablas de un módulo (filter='adi_', 'adp_' o 'fin_').
4. Genera el SQL y ejecútalo con query_sinco. Si devuelve error, léelo, corrige el SQL e intenta de nuevo.

Reglas de negocio CBR (del wiki — respétalas o las cifras saldrán mal):
- Ventas NETAS por defecto: usa adi_dtm_venta e ignora adi_dtm_desistimientosventa, salvo que pidan ventas brutas explícitamente.
- Filtra por idproyecto o prycodigoproyecto, NO por nombre de proyecto (más preciso).
- Un proyecto de presupuesto (PPTO) puede mapear a 2-3 idproyecto del ERP. Para PPTO vs Real usa el join correcto vía sinco_ic_targets.proyectos_map_erp.
- Castilla Imperial 2B y P no son agregables sin riesgo de doble conteo.
- Los proyectos de socios (Azul Celeste, Azul Turquesa, Mitika, Verde Vivo, Well) NO están en CBR: su ejecución real vive en sinco_ic_historico.flujo_historico.
- Valores en pesos colombianos. Para montos grandes (millones), formatéalos legibles en la respuesta.

Reglas ADPRO: los "Valor Total" suelen incluir IVA; adp_dtm_fact_traslados genera doble registro (no sumar directo).

Buenas prácticas de SQL: califica siempre el esquema (sinco_ic_raw.tabla); agrega ORDER BY y un LIMIT razonable; al dar una cifra clave, menciona brevemente de qué tabla/SQL salió para que sea auditable.`

const TOOLS = [
  {
    name: 'search_wiki',
    description: 'Busca en el wiki de IC Constructora (594 páginas) con búsqueda híbrida: léxica + semántica. Úsalo para preguntas sobre personas, proyectos, procesos, estructura organizacional, información de la empresa. Devuelve EXTRACTOS de los chunks más relevantes, no páginas completas. Importante: el extracto puede no contener el dato exacto aunque la página sí. Si un resultado parece la ficha correcta para un dato concreto (número, fecha, total), lee la página completa con get_wiki_page usando su file_path.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Consulta en lenguaje natural. Sé específico: incluye nombres propios, área, proyecto, etc.'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_wiki_page',
    description: 'Lee el contenido COMPLETO de una página del wiki dado su file_path. Úsalo cuando search_wiki identifica el archivo correcto pero el extracto está incompleto, tiene datos pendientes ([por definir], etc.), o necesitas todos los detalles de una página específica.',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Ruta relativa del archivo en el wiki, exactamente como aparece en el campo "archivo" de search_wiki o list_wiki_pages. Ejemplo: "wiki/proyectos/reserva-de-oporto/unidades.md"'
        }
      },
      required: ['file_path']
    }
  },
  {
    name: 'list_wiki_pages',
    description: 'Lista todas las páginas del wiki cuya ruta contiene un texto dado. Úsalo para descubrir qué fichas existen sobre un proyecto o persona cuando search_wiki no encuentra el dato concreto. Ejemplo: pasar "reserva-de-oporto" devuelve index.md, unidades.md, cronograma, etc. Luego lee la ficha relevante con get_wiki_page.',
    input_schema: {
      type: 'object',
      properties: {
        path_prefix: {
          type: 'string',
          description: 'Texto a buscar en la ruta de los archivos. Suele ser el nombre del proyecto o persona en kebab-case. Ejemplo: "reserva-de-oporto", "mitika", "proyectos".'
        }
      },
      required: ['path_prefix']
    }
  },
  {
    name: 'list_sinco_tables',
    description: 'Lista las tablas/vistas de un esquema de SINCO. Úsalo para descubrir qué tablas existen en un módulo antes de consultar. Filtra por prefijo de módulo: "adi_" = CBR (clientes/ventas), "adp_" = ADPRO (construcción/proveedores), "fin_" = AyF (finanzas).',
    input_schema: {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          enum: ['sinco_ic_raw', 'sinco_ic_targets', 'sinco_ic_historico', 'sinco_ic_calc'],
          description: 'Esquema a listar. Las tablas de los tres módulos viven en sinco_ic_raw. Por defecto: sinco_ic_raw.'
        },
        filter: {
          type: 'string',
          description: 'Subcadena para filtrar nombres de tabla. Ej: "adi_" (CBR), "adp_" (ADPRO), "fin_" (AyF), "venta", "contrato".'
        }
      }
    }
  },
  {
    name: 'describe_sinco_table',
    description: 'Devuelve las columnas (nombre y tipo) de una tabla/vista de SINCO. Úsalo SIEMPRE antes de escribir SQL si no estás seguro de los nombres exactos de las columnas.',
    input_schema: {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          enum: ['sinco_ic_raw', 'sinco_ic_targets', 'sinco_ic_historico', 'sinco_ic_calc'],
          description: 'Esquema de la tabla. Por defecto: sinco_ic_raw.'
        },
        table: {
          type: 'string',
          description: 'Nombre exacto de la tabla, en minúsculas. Ej: "adi_dtm_venta", "adp_dtm_fact_controlproyecto", "fin_dtm_movimientos".'
        }
      },
      required: ['table']
    }
  },
  {
    name: 'query_sinco',
    description: 'Ejecuta una consulta SELECT de SOLO LECTURA sobre los datos vivos de SINCO y devuelve las filas. Úsalo para responder cualquier cifra real de negocio (ventas, cartera, trámites, escrituración, compras, presupuesto de obra, contratos, finanzas). Genera tú el SQL. Solo SELECT/WITH; Postgres rechaza cualquier escritura. Si devuelve un error, corrige el SQL y reintenta. Respeta las reglas de negocio del módulo (consúltalas en el wiki primero).',
    input_schema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'Consulta SELECT (o WITH). Califica el esquema: ej. "SELECT vtanombreproyecto, count(*), sum(valorneto) FROM sinco_ic_raw.adi_dtm_venta GROUP BY 1 ORDER BY 3 DESC". Sin punto y coma final, un solo statement.'
        },
        limit: {
          type: 'number',
          description: 'Máximo de filas a devolver (1-1000). Por defecto: 200.'
        }
      },
      required: ['sql']
    }
  },
  {
    name: 'list_db_schemas',
    description: 'Lista los esquemas de negocio disponibles en Supabase (EOS en public, y los esquemas de SINCO). Úsalo para descubrir qué dominios de datos existen antes de consultar con SQL. No incluye esquemas de sistema/credenciales (no son accesibles).',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'list_db_tables',
    description: 'Lista tablas y vistas de cualquier esquema de negocio (public, sinco_ic_model, etc.). Filtro opcional por subcadena del nombre. Úsalo para descubrir qué tablas hay en un esquema antes de escribir SQL.',
    input_schema: {
      type: 'object',
      properties: {
        schema: { type: 'string', description: 'Esquema a listar, ej: public, sinco_ic_model, sinco_ic_calc.' },
        filter: { type: 'string', description: 'Subcadena del nombre de tabla para filtrar. Omitir para todas.' }
      },
      required: ['schema']
    }
  },
  {
    name: 'describe_db_table',
    description: 'Describe las columnas (nombre, tipo, nullable) de una tabla o vista de cualquier esquema de negocio. Úsalo antes de escribir SQL si no conoces las columnas exactas.',
    input_schema: {
      type: 'object',
      properties: {
        schema: { type: 'string', description: 'Esquema de la tabla.' },
        table:  { type: 'string', description: 'Nombre de la tabla o vista.' }
      },
      required: ['schema', 'table']
    }
  },
  {
    name: 'query_db',
    description: 'Ejecuta un SELECT de SOLO LECTURA sobre CUALQUIER esquema de negocio de Supabase (EOS en public, SINCO, targets, etc.). Es el camino general para consultar datos: úsalo para EOS (alarmas, rocas, tareas, scorecard) o para cruzar EOS con SINCO. Solo SELECT/WITH; un solo statement; Postgres rechaza escrituras y esquemas sensibles. Califica siempre el esquema (ej: public.alarms, sinco_ic_raw.adi_dtm_venta). Si da error, corrige y reintenta.',
    input_schema: {
      type: 'object',
      properties: {
        sql:   { type: 'string', description: 'Consulta SELECT/WITH con el esquema calificado. Sin punto y coma final.' },
        limit: { type: 'number', description: 'Máximo de filas (1-1000). Por defecto: 200.' }
      },
      required: ['sql']
    }
  },
  {
    name: 'listas_precio_atrasadas',
    description: 'Devuelve las etapas ACTIVAS del portafolio cuya última lista de precios se creó hace 30 o más días (es decir, que NO tienen lista nueva en el último mes). Para cada una indica el slug del proyecto, la etapa, el nombre, la fecha de la última lista, los días sin actualizar y la severidad (alta = >60 días, media = 30-60 días). Úsalo cuando pregunten qué proyectos/etapas tienen las listas de precios atrasadas o sin actualizar. Es la misma alarma que aparece en el portal /alarmas.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'propose_wiki_update',
    description: 'Encola una PROPUESTA de actualización del wiki para revisión humana (no escribe en el wiki). Úsala SOLO cuando el usuario aporte un hecho nuevo, duradero y verificable sobre la organización (rol, responsabilidad, asignación a proyecto, dato de proceso, o corrección de algo que el wiki tiene mal). NO la uses para opiniones, estados de ánimo, preguntas, cifras de negocio, ni nada que no puedas atribuir a un hecho concreto. Antes de proponer, verifica con search_wiki que el wiki no lo diga ya. No inventes ni completes datos que el usuario no dijo. El correo del proponente lo añade el sistema; no lo pases.',
    input_schema: {
      type: 'object',
      properties: {
        tipo: {
          type: 'string',
          enum: ['persona', 'proyecto', 'proceso', 'otro'],
          description: 'A qué se refiere el hecho.'
        },
        contenido: {
          type: 'string',
          description: 'El hecho redactado limpio, atribuible, en tercera persona. Sin adornos. Ej: "Mayra Nathalia Martínez coordina la pauta digital de los proyectos Azul Celeste y Gaia."'
        },
        entidad_objetivo: {
          type: 'string',
          description: 'Ruta de la ficha del wiki a la que aplicaría, si la conoces (ej: "wiki/personas/mayra-nathalia-martinez-mejia.md"). Si no, descríbela en texto o déjala vacía.'
        },
        cita_textual: {
          type: 'string',
          description: 'Lo que dijo el usuario, textual, para que el curador juzgue el contexto.'
        },
        confianza: {
          type: 'string',
          enum: ['alta', 'media', 'baja'],
          description: 'Qué tan claro y verificable fue el aporte. Por defecto: media.'
        }
      },
      required: ['tipo', 'contenido']
    }
  },
  {
    name: 'get_rocks',
    description: 'Obtiene las rocas (objetivos trimestrales) del sistema EOS. Úsalo para preguntas sobre metas del trimestre, estado de objetivos, quién es responsable de qué.',
    input_schema: {
      type: 'object',
      properties: {
        quarter: {
          type: 'string',
          description: 'Trimestre específico, ej: Q2_2026. Omitir para traer todos los registrados.'
        },
        status: {
          type: 'string',
          enum: ['on-track', 'off-track', 'done'],
          description: 'Filtrar por estado. Omitir para traer todos.'
        }
      }
    }
  },
  {
    name: 'get_metrics',
    description: 'Obtiene métricas del scorecard semanal con sus últimos 3 valores registrados. Úsalo para preguntas sobre indicadores, KPIs, metas numéricas.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Categoría de métricas a filtrar. Omitir para traer todas.'
        }
      }
    }
  },
  {
    name: 'get_issues',
    description: 'Obtiene asuntos de la lista IDS del sistema EOS. Úsalo para preguntas sobre problemas abiertos, temas pendientes de resolver, o asuntos discutidos en reuniones.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['open', 'discussing', 'solved'],
          description: 'Estado del asunto. Por defecto: open.'
        },
        type: {
          type: 'string',
          description: 'Tipo: operacional, personas, financiero, comunicacion, estrategico.'
        }
      }
    }
  },
  {
    name: 'get_people',
    description: 'Busca personas en el directorio del sistema EOS. Para información más detallada de una persona (proyectos, historia), combina con search_wiki.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Nombre, apellido, rol o cargo a buscar.'
        },
        dept: {
          type: 'string',
          description: 'Departamento o área: Construcción, Financiero, Jurídico, TI, etc.'
        }
      }
    }
  },
  {
    name: 'get_meetings',
    description: 'Obtiene reuniones del sistema EOS (L10, trimestrales, anuales).',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['upcoming', 'completed', 'cancelled'],
          description: 'Estado de la reunión.'
        },
        limit: {
          type: 'number',
          description: 'Número máximo de resultados. Por defecto: 5.'
        }
      }
    }
  },
  {
    name: 'get_processes',
    description: 'Obtiene los procesos medulares de la empresa registrados en el sistema EOS.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['documented', 'in-progress', 'needs-work'],
          description: 'Estado del proceso.'
        }
      }
    }
  }
]

async function runTool(name, input, ctx = {}) {
  console.log(`[VIC] Usando herramienta: ${name}`, JSON.stringify(input))
  try {
    switch (name) {
      case 'search_wiki':     return await searchWiki(input.query)
      case 'get_wiki_page':   return await getWikiPage(input.file_path)
      case 'list_wiki_pages': return await listWikiPages(input.path_prefix)
      case 'list_sinco_tables':    return await listSincoTables(input)
      case 'describe_sinco_table': return await describeSincoTable(input)
      case 'query_sinco':          return await querySinco(input)
      case 'list_db_schemas':      return await listDbSchemas()
      case 'list_db_tables':       return await listDbTables(input)
      case 'describe_db_table':    return await describeDbTable(input)
      case 'query_db':             return await queryDb(input)
      case 'listas_precio_atrasadas': return await listasPrecioAtrasadas()
      case 'propose_wiki_update':
        // El email del proponente lo inyecta el servidor (ctx), NO el modelo:
        // así el LLM no puede falsificar quién aporta. El allowlist del piloto
        // se valida en la RPC.
        return await proposeWikiUpdate({
          proposto_por: ctx.email,
          tipo: input.tipo,
          contenido: input.contenido,
          entidad_objetivo: input.entidad_objetivo,
          cita_textual: input.cita_textual,
          confianza: input.confianza,
          origen_conversacion: ctx.conversationId
        })
      case 'get_rocks':     return await getRocks(input)
      case 'get_metrics':   return await getMetrics(input)
      case 'get_issues':    return await getIssues(input)
      case 'get_people':    return await getPeople(input)
      case 'get_meetings':  return await getMeetings(input)
      case 'get_processes': return await getProcesses(input)
      default:              return `Herramienta desconocida: ${name}`
    }
  } catch (err) {
    console.error(`[VIC] Error en herramienta ${name}:`, err.message)
    return `Error al ejecutar ${name}: ${err.message}`
  }
}

// Agentic loop: Claude puede encadenar múltiples tool calls antes de responder.
// `apiKey` es la key del usuario que habla: cada quien gasta su propia cuota.
async function chat(history, apiKey, ctx = {}) {
  const client = clientFor(apiKey)
  const messages = history.map(m => ({ role: m.role, content: m.content }))

  for (let iteration = 0; iteration < 10; iteration++) {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1500,
      system: SYSTEM,
      tools: TOOLS,
      messages
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      return response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const result = await runTool(block.name, block.input, ctx)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result, null, 2)
        })
      }
      messages.push({ role: 'user', content: toolResults })
    } else {
      // stop_reason inesperado
      break
    }
  }

  return 'No pude generar una respuesta después de múltiples intentos. Esto puede deberse a que la tarea es muy compleja o hubo un problema inesperado de la API.'
}

module.exports = { chat }
