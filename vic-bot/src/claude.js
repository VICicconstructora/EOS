const Anthropic = require('@anthropic-ai/sdk')
const { searchWiki, getWikiPage, listWikiPages } = require('./tools/wiki')
const { getRocks, getMetrics, getIssues, getPeople, getMeetings, getProcesses } = require('./tools/eos')
const { listSincoTables, describeSincoTable, querySinco } = require('./tools/sinco')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `Eres VIC, el asistente ejecutivo interno de IC Constructora (Bogotá, Colombia, UTC-5).
Hablas principalmente con Juan Paulo McAllister, CEO. Trátalo como un colega — no como un usuario nuevo.

Tienes acceso a tres fuentes de información:
1. El wiki de la empresa (personas, proyectos, procesos, estructura organizacional).
2. El sistema EOS/Tracción: rocas trimestrales, scorecard, asuntos IDS, directorio de personas, reuniones y procesos.
3. Los datos vivos de SINCO (el ERP) en Supabase, que consultas generando SQL propio con las herramientas list_sinco_tables, describe_sinco_table y query_sinco.

Reglas de respuesta:
- Español siempre.
- Directo y conciso. Sin relleno ("claro", "por supuesto", "excelente pregunta"). Sin emojis.
- Párrafos cortos. Una idea por oración.
- Usa tablas solo cuando compares datos u opciones. Usa listas solo cuando el contenido es genuinamente enumerativo.
- No resumas al final lo que acabas de hacer.
- Usa los datos exactos de las herramientas — no inventes información.
- Cuando la pregunta merezca consultar varias fuentes, hazlo (primero wiki, luego EOS).

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

async function runTool(name, input) {
  console.log(`[VIC] Usando herramienta: ${name}`, JSON.stringify(input))
  try {
    switch (name) {
      case 'search_wiki':     return await searchWiki(input.query)
      case 'get_wiki_page':   return await getWikiPage(input.file_path)
      case 'list_wiki_pages': return await listWikiPages(input.path_prefix)
      case 'list_sinco_tables':    return await listSincoTables(input)
      case 'describe_sinco_table': return await describeSincoTable(input)
      case 'query_sinco':          return await querySinco(input)
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

// Agentic loop: Claude puede encadenar múltiples tool calls antes de responder
async function chat(history) {
  const messages = history.map(m => ({ role: m.role, content: m.content }))

  for (let iteration = 0; iteration < 10; iteration++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
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
        const result = await runTool(block.name, block.input)
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

  return 'No pude generar una respuesta. Intenta reformular la pregunta.'
}

module.exports = { chat }
