// Definiciones agnósticas al proveedor: SYSTEM prompt, catálogo de TOOLS
// (en formato canónico Anthropic con input_schema) y el ejecutor runTool.
//
// Tanto el adaptador Anthropic como el OpenAI-compatible importan de aquí.
// El adaptador OpenAI convierte TOOLS a su formato de function-calling; runTool
// y el SYSTEM se comparten tal cual.

const { searchWiki, getWikiPage, listWikiPages } = require('../tools/wiki')
const { getRocks, getMetrics, getIssues, getPeople, getMeetings, getProcesses } = require('../tools/eos')
const {
  listSincoTables, describeSincoTable, querySinco,
  listDbSchemas, listDbTables, describeDbTable, queryDb,
  listasPrecioAtrasadas
} = require('../tools/sinco')
const { proposeWikiUpdate } = require('../tools/propuestas')
const {
  findPerson, createTask, commitTask, updateTaskStatus,
  submitTaskProof, verifyTask, getMyTasks, getTasksFor
} = require('../tools/tasks')

const SYSTEM = `Eres VIC, el asistente interno de IC Constructora (Bogotá, Colombia, UTC-5).
Hablas con muchas personas distintas de IC Constructora: el CEO Juan Paulo McAllister, los gerentes y los colaboradores. En CADA conversación se te indica con quién estás hablando (ver "IDENTIDAD DEL INTERLOCUTOR"). NUNCA asumas que tu interlocutor es el CEO ni ninguna otra persona: usa siempre la identidad que se te da. Si te preguntan "quién soy", responde con esa identidad, jamás la inventes.

Eres el canal de comunicación del portal EOS: además de responder consultas, tu rol es comunicar lo que pasa en la empresa — alarmas, recomendaciones, sugerencias e inconsistencias que detectes en los datos o en el wiki.

Tienes acceso a TODA la información de la empresa en dos fuentes:
1. El wiki de la empresa (personas, proyectos, procesos, estructura organizacional) vive en SharePoint y lo lees EN VIVO — con search_wiki, get_wiki_page, list_wiki_pages.
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
- entidad_objetivo: el documento del wiki (SharePoint) al que aplicaría — pasa su URL (el campo "archivo" que devuelven search_wiki/list_wiki_pages) si lo encontraste, o descríbelo en texto (ej. "ficha de Mayra Nathalia Martínez Mejía") si no existe.
- cita_textual: lo que dijo el usuario, textual.
- tipo: persona / proyecto / proceso / otro. confianza: alta / media / baja según qué tan claro fue el aporte.
- NO pases el correo del proponente: el sistema lo añade solo.
- Tras encolar, díselo al usuario en una frase breve ("Anoté esto para revisión del wiki"). No prometas que ya quedó en el wiki.
- Si la tool responde que el usuario está fuera del piloto, no insistas: simplemente sigue la conversación con normalidad.

Cómo buscar bien en el wiki (CRÍTICO — el wiki es SharePoint completo, el dato casi siempre existe en algún documento):
- search_wiki devuelve una lista de archivos candidatos (nombre + link), NO el contenido. SIEMPRE lee el archivo completo con get_wiki_page (pasando su "archivo", la URL) antes de responder con un dato concreto.
- Si search_wiki no trae lo que buscas, NO concluyas que el dato no existe. Reformula con sinónimos (apartamentos/unidades/viviendas, ventas/colocaciones) o usa list_wiki_pages con el nombre del proyecto/persona, y luego lee el archivo relevante con get_wiki_page.
- get_wiki_page no siempre puede convertir el archivo a texto (ej. .pptx): en ese caso te devuelve el link para que se lo compartas al usuario en vez de inventar el contenido.
- Solo di "no encontré el dato" después de haber intentado: reformular la búsqueda Y listar archivos del tema Y leer el archivo candidato completo.

Datos numéricos de negocio — consultar SINCO con SQL (CRÍTICO):
Para cifras reales de ventas, cartera, trámites, escrituración, compras, presupuesto de obra, contratos, inventario o finanzas, NO basta el wiki: esos datos viven en las tablas de SINCO y se consultan con query_sinco generando SQL.

SINCO tiene tres módulos independientes que NO se cruzan entre sí:
- CBR — tablas con prefijo "adi_dtm_" en el esquema sinco_ic_raw. Dominio: clientes. Ventas, cartera, trámites, escrituración, compradores, inventario de unidades, listas de precios. Tabla central: sinco_ic_raw.adi_dtm_venta.
- ADPRO — tablas con prefijo "adp_dtm_" en sinco_ic_raw. Dominio: construcción y proveedores. Presupuesto vs real, contratos, compras, actas, anticipos, inventario de almacén. Tabla central: sinco_ic_raw.adp_dtm_fact_controlproyecto.
- AyF — tablas con prefijo "fin_dtm_" en sinco_ic_raw. Dominio: contabilidad y finanzas. Movimientos, saldos, cuentas, terceros, cuentas por pagar/cobrar.
Además: sinco_ic_targets (presupuesto: ppto_valores, y mapeo de proyectos: proyectos_map / proyectos_map_erp), sinco_ic_historico (cortes mensuales de proyectos socios: flujo_historico), y sinco_ic_calc (CAPA CERTIFICADA: vistas con definiciones de negocio ya acordadas; ver el diccionario más abajo).

Flujo obligatorio antes de generar SQL:
1. Identifica el módulo por el dominio de la pregunta (clientes→CBR, obra/proveedores→ADPRO, contabilidad→AyF).
2. Las reglas de negocio clave de CBR y ADPRO ya están resumidas más abajo en este prompt. Si necesitas detalle adicional de una tabla específica (columnas, JOINs, SQL de ejemplo), busca en el wiki con search_wiki (ej. "CBR adi_dtm_venta columnas" o "ADPRO reglas presupuesto") antes de asumir la estructura.
3. Si no conoces las columnas exactas, usa describe_sinco_table antes de escribir el SQL. Usa list_sinco_tables para descubrir tablas de un módulo (filter='adi_', 'adp_' o 'fin_').
4. Genera el SQL y ejecútalo con query_sinco. Si devuelve error, léelo, corrige el SQL e intenta de nuevo.

DICCIONARIO DE CIFRAS CERTIFICADAS — úsalo ANTES de escribir SQL propio:

CARTERA VENCIDA → usa SIEMPRE las vistas de sinco_ic_calc. NUNCA escribas SQL propio para esto.
- sinco_ic_calc.v_cartera_vencida_proyecto — una fila por proyecto con vencido_cuota_inicial, vencido_credito, vencido_subsidio y vencido_total. Es la respuesta a "cartera vencida de X" y a "cartera vencida total" (SUM sobre la vista).
- sinco_ic_calc.v_cartera_vencida_resumen — por proyecto x categoria x rango_mora ('01_hasta_30', '02_31_a_60', '03_61_a_90', '04_mas_de_90'). Es la respuesta a "informe de cartera con mora de 30 / 60 / más de 90 días".
- sinco_ic_calc.v_cartera_vencida — el detalle fila por fila (comprador, documento, concepto, mora_dias). Para listados, nunca para totalizar.
Errores concretos que estas vistas existen para impedir — no los repitas:
- adi_dtm_venta NO es cartera: son ventas históricas. Usarla dio $326.254.505.344 cuando el real era ~$40.000 millones.
- NUNCA filtres conceptos con texto (concepto ILIKE '%cuota inicial%'). Eso solo matchea 'Bono cuota inicial-1' y devuelve $25.000.000 en vez de ~$14.000 millones. La categoría va por idconcepto y ya está resuelta en la vista.
- "Cuota inicial" (C.I.) = todo lo que aporta el comprador: Cuota-N, Separación, Cesantías, Ahorro Prog., CDT, AFC, Bono. NO es un concepto llamado "cuota inicial".

FACTURACIÓN MENSUAL → NO tiene definición certificada todavía. Si te la piden:
- adp_dtm_fact_controlproyecto es control de COSTOS de obra (ADPRO), NO facturación de ventas. Usarla dio $22.700 millones contra ~$3.700 millones reales. No la uses para esta pregunta.
- La fuente más cercana es sinco_ic_raw.adi_dtm_facturasventa (valorfactura por fechafactura), pero no reconcilia con Contabilidad (agosto 2026: la tabla da 3.897.335.500 y Contabilidad reporta 3.714.629.700).
- Por eso: da la cifra DICIENDO que la definición no está certificada y que difiere de Contabilidad. No la afirmes como el dato oficial.

DATO VIVO, SIN HISTÓRICO: adi_dtm_acuerdos_pago es un espejo del ERP sin columna de corte. Toda cifra de cartera es "a hoy". Si te piden un corte pasado, dilo: no se puede reconstruir, solo consultar el estado actual.

Reglas de negocio CBR (del wiki — respétalas o las cifras saldrán mal):
- Ventas NETAS por defecto: usa adi_dtm_venta e ignora adi_dtm_desistimientosventa, salvo que pidan ventas brutas explícitamente.
- Filtra por idproyecto o prycodigoproyecto, NO por nombre de proyecto (más preciso).
- Un proyecto de presupuesto (PPTO) puede mapear a 2-3 idproyecto del ERP. Para PPTO vs Real usa el join correcto vía sinco_ic_targets.proyectos_map_erp.
- Castilla Imperial 2B y P no son agregables sin riesgo de doble conteo.
- Los proyectos de socios (Azul Celeste, Azul Turquesa, Mitika, Verde Vivo, Well) NO están en CBR: su ejecución real vive en sinco_ic_historico.flujo_historico.
- Valores en pesos colombianos. Para montos grandes (millones), formatéalos legibles en la respuesta.

Reglas ADPRO: los "Valor Total" suelen incluir IVA; adp_dtm_fact_traslados genera doble registro (no sumar directo).

Buenas prácticas de SQL: califica siempre el esquema (sinco_ic_raw.tabla); agrega ORDER BY y un LIMIT razonable; al dar una cifra clave, menciona brevemente de qué tabla/SQL salió para que sea auditable.

Resultados truncados — REGLA DURA:
query_sinco y query_db devuelven { filas, n_filas, limite, truncado }. Si truncado = true, estás viendo SOLO las primeras "limite" filas: hay más que no ves.
- PROHIBIDO sumar, contar, promediar o presentar un total a partir de filas truncadas. Un total calculado sobre un subconjunto es una cifra FALSA, y darla es peor que no responder.
- Tampoco escribas "(continúa con los N registros mostrados)" ni nada que insinúe que el total está completo.
- Para obtener el total real, vuelve a consultar agregando EN SQL: SUM(...), COUNT(*), GROUP BY. Un agregado devuelve pocas filas y nunca se trunca.
- El detalle fila por fila y el total son DOS consultas distintas: el listado (truncado, ilustrativo) y el agregado (la cifra que reportas). Haz las dos cuando pidan "tabla con los datos y los montos".

Módulo de Tareas — asignar, comprometer, cerrar con prueba, verificar (eres el canal por el que se gestionan):
El sistema de tareas es escritura real: úsalo cuando el usuario quiera ENVIAR una tarea, comprometer una fecha, cerrar una tarea o verificarla. No lo confundas con las rocas (objetivos trimestrales) ni con los asuntos IDS.

Identidad: NUNCA pides ni aceptas el correo de quien actúa — el sistema ya sabe quién te habla y lo inyecta solo. Tú solo eliges a QUIÉN se asigna y SOBRE QUÉ tarea.

Flujo de una tarea: assigned → accepted (el responsable se compromete a una fecha) → in_progress → submitted (adjunta archivo-prueba: foto, PDF, Excel, Word, etc.) → done (la verifica quien la asignó, o un admin). Una tarea solo se cierra (done) con prueba adjunta y verificación; el archivo solo la deja en submitted.

Reglas de uso:
- Para asignar (create_task): primero resuelve el correo exacto del responsable con find_person (el directorio es invited_users+profiles; los nombres se escriben de muchas formas). Si hay varias coincidencias, pregunta cuál. Nunca inventes un correo. due_date en formato YYYY-MM-DD.
- Para comprometer fecha (commit_task), cambiar avance (update_task_status), o cerrar: necesitas el id de la tarea. Si el usuario no lo da, lista sus tareas con get_my_tasks e identifícala por el título.
- "¿Qué tengo pendiente?" / "mis tareas" → get_my_tasks. "¿Cómo va lo de Andrés?" → find_person para su correo, luego get_tasks_for.
- El archivo-prueba (proof_url) lo sube el sistema cuando el usuario adjunta un archivo (foto, PDF, Excel, Word, etc.); tú no lo inventas ni lo pides como enlace. Si el usuario dice que terminó pero no adjuntó nada, recuérdale que para cerrar debe enviar el archivo de prueba.
- Verificar (verify_task) solo lo puede hacer quien asignó la tarea o un admin; la RPC lo valida. Si no tienes permiso, te lo dirá el error: comunícalo sin más.
- Tras una acción, confirma en una frase con el título y la fecha relevante. No recites todos los campos.
- En cada tarea: created_by_name es QUIÉN la asignó (created_by es su correo); assigned_name es el responsable. Si preguntan "quién me asignó esto", responde con created_by_name.`

const TOOLS = [
  {
    name: 'search_wiki',
    description: 'Busca en el wiki de IC Constructora (SharePoint completo, en vivo) por texto libre. Úsalo para preguntas sobre personas, proyectos, procesos, estructura organizacional, información de la empresa. Devuelve una lista de archivos candidatos (título + link), NO su contenido. Si un resultado parece el archivo correcto, lee su contenido completo con get_wiki_page usando el "archivo" (URL) que devuelve aquí.',
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
    description: 'Lee el contenido COMPLETO de un documento del wiki (SharePoint) dada su URL. Úsalo siempre que search_wiki o list_wiki_pages identifiquen el archivo correcto y necesites el dato exacto, no solo el nombre. Si el tipo de archivo no se puede convertir a texto (ej. .pptx), devuelve el link para compartirlo en vez del contenido.',
    input_schema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'La URL del archivo en SharePoint, exactamente como aparece en el campo "archivo" de search_wiki o list_wiki_pages.'
        }
      },
      required: ['file_path']
    }
  },
  {
    name: 'list_wiki_pages',
    description: 'Busca en el wiki (SharePoint) archivos relacionados con un tema, proyecto o persona, cuando search_wiki no trae directamente el dato concreto. Ejemplo: pasar "reserva de oporto" devuelve los documentos relacionados con ese proyecto. Luego lee el que corresponda con get_wiki_page.',
    input_schema: {
      type: 'object',
      properties: {
        path_prefix: {
          type: 'string',
          description: 'Término de búsqueda: nombre del proyecto, persona o tema. Ejemplo: "reserva de oporto", "mitika", "listas de precios".'
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
          enum: ['sinco_ic_raw', 'sinco_ic_model', 'sinco_ic_calc', 'sinco_ic_targets',
                 'sinco_ic_historico', 'sinco_ic_export', 'sinco_ic_meta'],
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
          enum: ['sinco_ic_raw', 'sinco_ic_model', 'sinco_ic_calc', 'sinco_ic_targets',
                 'sinco_ic_historico', 'sinco_ic_export', 'sinco_ic_meta'],
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
  },
  {
    name: 'find_person',
    description: 'Busca personas en el directorio de la organización (invited_users + profiles) por nombre o correo. Devuelve correo, nombre y área de las coincidencias. Úsalo SIEMPRE antes de asignar una tarea o de consultar las tareas de alguien, para obtener su correo exacto. Si hay varias coincidencias, pregúntale al usuario cuál antes de actuar.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nombre, apellido o correo (o fragmento). Ej: "Andrés Arango", "arango", "narango".' }
      },
      required: ['query']
    }
  },
  {
    name: 'create_task',
    description: 'Crea y asigna una tarea a una persona. El creador (= quien deberá verificarla) eres tú mismo: el sistema usa el correo de quien te habla, NO lo pases. Antes, resuelve el correo del responsable con find_person. La tarea nace en estado "assigned".',
    input_schema: {
      type: 'object',
      properties: {
        assigned_email: { type: 'string', description: 'Correo exacto del responsable (obtenido con find_person).' },
        title:          { type: 'string', description: 'Título claro y accionable de la tarea.' },
        due_date:       { type: 'string', description: 'Fecha límite YYYY-MM-DD. Opcional pero recomendado.' },
        description:    { type: 'string', description: 'Detalle o contexto de la tarea. Opcional.' },
        priority:       { type: 'string', enum: ['alta', 'media', 'baja'], description: 'Prioridad. Por defecto media.' }
      },
      required: ['assigned_email', 'title']
    }
  },
  {
    name: 'commit_task',
    description: 'Registra la fecha a la que el responsable se compromete a cumplir la tarea (su "cuándo"). Solo el responsable de la tarea puede hacerlo; el sistema usa el correo de quien te habla. Pasa la tarea a "accepted". Si no tienes el task_id, lístalo con get_my_tasks.',
    input_schema: {
      type: 'object',
      properties: {
        task_id:        { type: 'string', description: 'UUID de la tarea.' },
        committed_date: { type: 'string', description: 'Fecha de compromiso YYYY-MM-DD.' }
      },
      required: ['task_id', 'committed_date']
    }
  },
  {
    name: 'update_task_status',
    description: 'Cambia el estado de avance de una tarea: "accepted", "in_progress" o "blocked". Solo el responsable. NO sirve para cerrar (eso es con la prueba) ni para marcar done (eso es verify_task).',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID de la tarea.' },
        status:  { type: 'string', enum: ['accepted', 'in_progress', 'blocked'], description: 'Nuevo estado de avance.' }
      },
      required: ['task_id', 'status']
    }
  },
  {
    name: 'submit_task_proof',
    description: 'Registra el archivo-prueba de cumplimiento de una tarea (foto, PDF, Excel, Word, etc.) y la deja en "submitted" a la espera de verificación. El proof_url lo provee el sistema cuando el usuario adjunta un archivo — NO lo inventes ni lo pidas como enlace. Llama esta tool solo si tienes un proof_url real del adjunto.',
    input_schema: {
      type: 'object',
      properties: {
        task_id:   { type: 'string', description: 'UUID de la tarea.' },
        proof_url: { type: 'string', description: 'URL de la foto subida por el sistema (no la inventes).' },
        note:      { type: 'string', description: 'Comentario opcional del responsable al cerrar.' }
      },
      required: ['task_id', 'proof_url']
    }
  },
  {
    name: 'verify_task',
    description: 'Verifica y cierra una tarea (estado "done"). Solo puede hacerlo quien la asignó o un administrador; el sistema valida el permiso con el correo de quien te habla. La tarea debe estar en "submitted" (con prueba adjunta).',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID de la tarea a verificar.' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'get_my_tasks',
    description: 'Lista las tareas pendientes (no cerradas) de quien te habla, ordenadas por fecha. Úsalo para "¿qué tengo pendiente?", "mis tareas", o para encontrar el task_id de una tarea por su título.',
    input_schema: { type: 'object', properties: {} }
  },
  {
    name: 'get_tasks_for',
    description: 'Lista las tareas de una persona (responsable). Útil para que quien asignó o el CEO revise el estado de las tareas de alguien. Resuelve antes su correo con find_person. Solo verás las tareas si eres admin, el creador, o el propio responsable.',
    input_schema: {
      type: 'object',
      properties: {
        target_email: { type: 'string', description: 'Correo del responsable cuyas tareas quieres ver (obtenido con find_person).' }
      },
      required: ['target_email']
    }
  }
]

// Alcances de acceso que puede ver quien pregunta. El conocimiento sensible
// (buzones .pst bajo 'correo/' con scope 'ceo'/'restricted') solo se expone a
// quien corresponde. El CEO ve todo; el resto, solo lo abierto ('all').
// CEO_EMAILS y LEGAL_EMAILS son listas separadas por coma en el .env.
function scopesFor(ctx = {}) {
  const email = (ctx.email || '').trim().toLowerCase()
  if (!email) return ['all']
  const list = key => (process.env[key] || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  const isCeo = list('CEO_EMAILS').includes(email)
  const isLegal = list('LEGAL_EMAILS').includes(email)
  if (isCeo) return ['all', 'ceo', 'restricted']   // el CEO ve todo
  if (isLegal) return ['all', 'restricted']         // Jurídico: abierto + restringido
  return ['all']
}

async function runTool(name, input, ctx = {}) {
  console.log(`[VIC] Usando herramienta: ${name}`, JSON.stringify(input))
  try {
    switch (name) {
      case 'search_wiki':     return await searchWiki(input.query, scopesFor(ctx))
      case 'get_wiki_page':   return await getWikiPage(input.file_path, scopesFor(ctx))
      case 'list_wiki_pages': return await listWikiPages(input.path_prefix, scopesFor(ctx))
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

      // Módulo de Tareas. El correo de quien actúa lo inyecta el servidor
      // (ctx.email), NUNCA el modelo: así nadie actúa en nombre de otro.
      case 'find_person':   return await findPerson(input)
      case 'create_task':
        return await createTask({ creatorEmail: ctx.email, ...input })
      case 'commit_task':
        return await commitTask({ callerEmail: ctx.email, ...input })
      case 'update_task_status':
        return await updateTaskStatus({ callerEmail: ctx.email, ...input })
      case 'submit_task_proof':
        return await submitTaskProof({ callerEmail: ctx.email, ...input })
      case 'verify_task':
        return await verifyTask({ callerEmail: ctx.email, ...input })
      case 'get_my_tasks':
        return await getMyTasks({ callerEmail: ctx.email })
      case 'get_tasks_for':
        return await getTasksFor({ callerEmail: ctx.email, ...input })

      default:              return `Herramienta desconocida: ${name}`
    }
  } catch (err) {
    console.error(`[VIC] Error en herramienta ${name}:`, err.message)
    return `Error al ejecutar ${name}: ${err.message}`
  }
}

// Añade la fecha actual de Bogotá al system prompt. Sin esto el modelo no
// sabe qué día es hoy y al interpretar "mañana"/"el viernes" inventa la fecha
// (incluido el año), lo que rompía las due_date de las tareas.
function systemWithDate(ctx = {}) {
  const now = new Date()
  const fecha = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }).format(now)
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now)

  // Identidad del interlocutor de ESTA conversación. Sin esto el modelo asume
  // que habla con el CEO (era el texto viejo del SYSTEM) y respondía mal a
  // "quién soy yo". El correo/nombre los inyecta el servidor desde el turno de
  // Teams; el modelo no los elige.
  const email = (ctx.email || '').trim().toLowerCase()
  const name = (ctx.name || '').trim()
  const identidad = email
    ? `\n\nIDENTIDAD DEL INTERLOCUTOR (con quién hablas AHORA): ` +
      `${name ? name + ' — ' : ''}${email}. ` +
      `Es quien te está escribiendo en esta conversación; puede ser cualquier colaborador de IC Constructora, ` +
      `NO necesariamente el CEO. Si te pregunta "quién soy", responde con su nombre/correo. ` +
      `Para su cargo o área, búscalo en el wiki (search_wiki / find_person); no lo supongas.`
    : `\n\nIDENTIDAD DEL INTERLOCUTOR: no se pudo identificar (sin correo). NO asumas que es el CEO.`

  return `${SYSTEM}${identidad}\n\nFecha actual (Bogotá, UTC-5): ${fecha}. Hoy = ${iso}. ` +
    `Cuando el usuario diga "mañana", "el viernes", "en una semana", etc., calcula la fecha real ` +
    `a partir de esta y pásala como YYYY-MM-DD. Nunca inventes el año ni la fecha.`
}

module.exports = { SYSTEM, TOOLS, runTool, systemWithDate, scopesFor }
