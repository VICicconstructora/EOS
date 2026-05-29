const Anthropic = require('@anthropic-ai/sdk')
const { searchWiki, getWikiPage } = require('./tools/wiki')
const { getRocks, getMetrics, getIssues, getPeople, getMeetings, getProcesses } = require('./tools/eos')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `Eres VIC, el asistente ejecutivo interno de IC Constructora (Bogotá, Colombia, UTC-5).
Hablas principalmente con Juan Paulo McAllister, CEO. Trátalo como un colega — no como un usuario nuevo.

Tienes acceso a dos fuentes de información:
1. El wiki de la empresa (personas, proyectos, procesos, estructura organizacional).
2. El sistema EOS/Tracción: rocas trimestrales, scorecard, asuntos IDS, directorio de personas, reuniones y procesos.

Reglas de respuesta:
- Español siempre.
- Directo y conciso. Sin relleno ("claro", "por supuesto", "excelente pregunta"). Sin emojis.
- Párrafos cortos. Una idea por oración.
- Usa tablas solo cuando compares datos u opciones. Usa listas solo cuando el contenido es genuinamente enumerativo.
- No resumas al final lo que acabas de hacer.
- Usa los datos exactos de las herramientas — no inventes información.
- Si no encuentras algo, dilo directamente y sugiere cómo buscarlo mejor.
- Cuando la pregunta merezca consultar varias fuentes, hazlo (primero wiki, luego EOS).`

const TOOLS = [
  {
    name: 'search_wiki',
    description: 'Busca en el wiki de IC Constructora. Úsalo para preguntas sobre personas, proyectos, procesos, estructura organizacional, información de la empresa, o cualquier tema que no sea datos EOS en tiempo real. Devuelve extractos de los chunks más relevantes. Si el extracto de un archivo parece incompleto, usa get_wiki_page con el file_path para leer la página completa.',
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
          description: 'Ruta relativa del archivo en el wiki, exactamente como aparece en el campo "archivo" de search_wiki. Ejemplo: "wiki/proyectos/mitika/index.md"'
        }
      },
      required: ['file_path']
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
      case 'search_wiki':   return await searchWiki(input.query)
      case 'get_wiki_page': return await getWikiPage(input.file_path)
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
