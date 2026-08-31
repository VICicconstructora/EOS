# CLAUDE.md — VIC Bot

> [!IMPORTANT]
> **Archivo espejo:** `AGENTS.md` y `CLAUDE.md` son idénticos en contenido.
> Cada vez que modifiques uno, debes aplicar **los mismos cambios** en el otro
> para mantenerlos sincronizados. Nunca dejes ambos archivos desincronizados.

Guía para Claude Code al trabajar en `vic-bot/`.

## Qué es VIC (enfoque)

VIC no es un chatbot de consultas aislado. Es **el canal de comunicación del portal EOS** de IC Constructora. Dos roles, igual de importantes:

1. **Responder** — lee TODO el conocimiento de la empresa y contesta lo que se le pregunte.
2. **Comunicar proactivamente** — empuja al usuario lo que pasa: alarmas, recomendaciones, sugerencias e inconsistencias que detecta en los datos o el wiki, sin que se lo pidan.

Habla principalmente con Juan Paulo McAllister (CEO). El estilo es directo, en español, sin relleno ni emojis (ver el `SYSTEM` en `src/claude.js`).

## Fuentes de información

VIC tiene acceso a TODO en dos orígenes:

| Fuente | Cómo accede | Alcance |
|--------|-------------|---------|
| **Wiki Obsidian** | `wiki_documents` en Supabase, búsqueda híbrida (full-text tsvector + pgvector/Voyage) | Personas, proyectos, procesos, estructura organizacional. ~594 páginas. |
| **Toda la base Supabase (solo lectura)** | RPCs `vic_*_db` y tools fijas de EOS | EOS (esquema `public`: rocks, metrics, issues, people, meetings, processes, vto, **alarms**, **tasks**) + SINCO (ERP: `sinco_ic_raw`, `sinco_ic_model`, `sinco_ic_calc`, `sinco_ic_targets`, `sinco_ic_historico`, `sinco_ic_export`, `sinco_ic_meta`). |

### Acceso de solo lectura a Supabase

VIC consulta cualquier esquema de negocio con SQL libre vía RPCs `SECURITY DEFINER`. La seguridad vive en Postgres, no en el cliente:

- `vic_query_db(sql, limit)` — un solo SELECT/WITH, transacción `READ ONLY`, `statement_timeout` 15s, sin DML/DDL, y **bloqueo explícito de esquemas sensibles** (`auth`, `vault`, `storage`, `cron`, `net`, etc. — ver `_vic_esquemas_bloqueados()`).
- `vic_list_db_schemas()`, `vic_list_db_tables(schema, filter)`, `vic_describe_db_table(schema, table)` — descubrimiento.
- Las variantes `vic_*_sinco` son el atajo histórico acotado a 4 esquemas de SINCO. `vic_query_db` es el camino general.

Migración: `app/supabase/migrations/20260602_vic_acceso_total_lectura.sql`.

> Para ampliar/restringir el alcance, edita `_vic_esquemas_bloqueados()`. Nunca des a VIC permisos de escritura ni acceso a `auth`/`vault`/`storage`.

## Comunicación proactiva (push)

VIC puede iniciar un mensaje a un usuario en Teams. Mecanismo:

1. **Captura de referencia** — cada vez que un usuario le escribe a VIC, `src/lib/push.js` (`saveConversationRef`) guarda su `conversationReference` en `public.vic_conversation_refs`. Es indispensable: Bot Framework solo puede iniciar un DM si ya tiene esa referencia (el usuario debe haber escrito a VIC al menos una vez).
2. **Endpoint `/api/push`** (`src/index.js`) — autenticado con `VIC_PUSH_SECRET`. Recibe `{ to_email, text }` y envía el mensaje proactivo con `adapter.continueConversationAsync`.
3. **Disparador** — la Edge Function `app/supabase/functions/alarmas-push/` recalcula alarmas, busca las activas no notificadas (`alarms.pushed_at IS NULL`), llama a `/api/push`, marca `pushed_at` y registra en `vic_push_log`.
4. **Cron** — pg_cron dispara el ciclo semanalmente (lunes).

> **Limitación conocida:** el chat 1:1 proactivo de Teams NO se puede hacer con Graph app-only (`Teamwork.Migrate.All` es solo modo migración). Por eso el push va por **Bot Framework** a través de VIC, no por Graph. Para correo, el patrón Graph `sendMail` sí funciona (ver `datamart-sync`).

## Estructura

```
vic-bot/src/
├── index.js          # Express + CloudAdapter; rutas /api/messages, /api/push, /health
├── bot.js            # ActivityHandler; captura conversationRef; resuelve key y llama al dispatcher
├── llm/
│   ├── index.js      # dispatcher de proveedor (primario + fallback cruzado)
│   ├── tools.js      # SYSTEM prompt, catálogo TOOLS y runTool (agnóstico al proveedor)
│   ├── anthropic.js  # adaptador Claude (tool-use nativo)
│   └── openai.js     # adaptador OpenAI-compatible (NVIDIA, etc.) vía fetch
├── lib/
│   ├── embeddings.js # Voyage AI (embeddings de búsqueda del wiki)
│   └── push.js       # saveConversationRef + sendProactive (Bot Framework)
└── tools/
    ├── wiki.js       # Búsqueda híbrida en wiki_documents
    ├── eos.js        # Tools fijas de EOS (rocks, metrics, issues, ...)
    └── sinco.js      # SINCO + acceso total DB (query_db, etc.) + alarmas de negocio
```

## Proveedor LLM dual (Anthropic + OpenAI-compatible)

VIC corre sobre **dos proveedores** detrás de un dispatcher común (`src/llm/index.js`), con la misma firma `chat(history, ctx, { anthropicKey, openaiKey })`. Los adaptadores comparten `SYSTEM`, `TOOLS` y `runTool` (en `src/llm/tools.js`); cada uno traduce el formato de tool-use que su API espera.

| Adaptador | API | Modelo (default) | Key |
|-----------|-----|------------------|-----|
| `llm/anthropic.js` | SDK `@anthropic-ai/sdk` (tool-use nativo) | `claude-sonnet-4-6` | la del usuario (`sk-ant-...`), su propia cuota; si no la registró, la compartida del bot (`VIC_ANTHROPIC_API_KEY` o `ANTHROPIC_API_KEY`) |
| `llm/openai.js` | Chat Completions vía `fetch` (sin dependencia) | `openai/gpt-oss-120b` en NVIDIA build | **la del usuario** (`nvapi-...`, su cuota gratuita); la compartida del bot (`VIC_OPENAI_API_KEY`) es solo respaldo |

**Política de selección** (`providerChain` en `llm/index.js`):
- **Primario para todos: Anthropic (Claude).** Quien registró su key `sk-ant-...` usa su propia cuota; quien no, la compartida del bot (`VIC_ANTHROPIC_API_KEY`, o `ANTHROPIC_API_KEY` del `.env` raíz). *(Cambio 2026-08-30: antes el default era NVIDIA/Llama-70B; generando SQL contra SINCO producía cifras erradas — cartera 8x, facturación 6x. Las consultas de negocio van al modelo fuerte.)*
- **NVIDIA (OpenAI-compatible) queda solo de respaldo.** Cada persona puede registrar su `nvapi-...` con `/registrar-nvidia` para no depender de la cuota compartida cuando se usa el respaldo. `VIC_DEFAULT_PROVIDER=openai` invierte el orden (escape hatch de pruebas).
- **Fallback cruzado:** si el primario lanza error, se intenta el otro proveedor disponible. El `provider` efectivo se loguea por mensaje.

Flujo en cada mensaje (`src/bot.js`):

1. Se extrae el email AAD del usuario (`emailFromContext`, mismo criterio que `push.js`).
2. Comandos de gestión se atienden primero y **no consumen tokens**:
   - `/nvidia` (o `/instrucciones`) — muestra el paso a paso para abrir la API gratuita de NVIDIA. También se envía al entrar al chat (`onMembersAdded`).
   - `/registrar-nvidia nvapi-...` — registra/actualiza la key NVIDIA del usuario (su cuota gratuita en el proveedor por defecto).
   - `/mi-nvidia` / `/borrar-nvidia` — muestra pista / elimina la key NVIDIA.
   - `/registrar-key sk-ant-...` — registra la key Anthropic del usuario (opcional; lo pasa a usar su propio Claude).
   - `/mi-key` / `/borrar-key` — muestra pista / elimina la key Anthropic.
3. Se resuelven ambas keys con `getUserKey(email, 'nvidia')` y `getUserKey(email, 'anthropic')` (`src/lib/keys.js`); cualquiera puede ser `null`.
4. Se llama al dispatcher con `{ anthropicKey, openaiKey }`; este arma la cadena de proveedores y aplica el fallback.

> **Config (`.env` raíz):** `VIC_ANTHROPIC_API_KEY` (o `ANTHROPIC_API_KEY`) para el primario; `VIC_OPENAI_API_KEY`, `VIC_OPENAI_BASE_URL` (default `https://integrate.api.nvidia.com/v1`), `VIC_OPENAI_MODEL`, `VIC_OPENAI_TEMPERATURE`, `VIC_OPENAI_TOP_P` para el respaldo. Opcionales: `VIC_ANTHROPIC_MODEL`, `VIC_MAX_TOKENS` (default **8000**), `VIC_MAX_ITERATIONS` (default 10), `VIC_DEFAULT_PROVIDER`. El adaptador OpenAI usa `fetch` nativo (Node ≥18), sin añadir dependencias.

### Respuestas incompletas ≠ errores de la API

Los dos adaptadores comparten el manejo de cierre del agentic loop (`src/lib/errors.js`). Antes, **cualquier** salida que no fuera `end_turn` devolvía *"hubo un problema inesperado de la API"* y **descartaba el texto ya generado** — diagnóstico falso que era la queja principal de los usuarios en las pruebas de agosto 2026.

| Situación | `stop_reason` / `finish_reason` | Qué hace ahora |
|-----------|--------------------------------|----------------|
| Respuesta cortada por longitud | `max_tokens` / `length` | `truncatedMessage()` — devuelve lo escrito + aviso de que se cortó por longitud |
| Loop agotado (demasiadas tool calls) | — | `exhaustedMessage()` — devuelve lo escrito + sugerencia de dividir la consulta |
| Parada inesperada | `refusal`, `pause_turn`, … | `unexpectedStopMessage()` — devuelve lo escrito + el motivo real |
| Error real de la API | excepción | `userMessageForChatError()` — sin cambios |

`VIC_MAX_TOKENS` subió de 1500 a **8000**: con 1500 cualquier informe por proyecto se cortaba a media tabla.

### Resultados de SQL truncados

`query_sinco` / `query_db` ya no devuelven el arreglo de filas pelado, sino `{ filas, n_filas, limite, truncado, aviso? }` (`src/tools/sinco.js`). Las RPC cortan en silencio con `LIMIT` (máx. 1000): antes VIC totalizaba sobre el subconjunto y presentaba la cifra como completa (*"continúa con los 500 registros mostrados"*). Con `truncado: true` el SYSTEM prompt le prohíbe sumar/contar sobre esas filas y le exige reconsultar agregando en SQL (`SUM`/`COUNT`/`GROUP BY`).

Los esquemas SINCO aceptados por `list_sinco_tables` / `describe_sinco_table` son los **7** que anuncia el prompt (`raw`, `model`, `calc`, `targets`, `historico`, `export`, `meta`); antes el `enum` solo permitía 4 y las llamadas a los otros rebotaban, quemando iteraciones.

### Almacenamiento (cifrado)

Las keys viven en `vic.vic_user_keys` (vista de compat en `public`), **cifradas con pgcrypto** (`pgp_sym_encrypt`). La clave maestra de cifrado vive solo en la variable de entorno `VIC_KEYS_SECRET` del bot; nunca se guarda en la tabla. La tabla tiene RLS sin políticas: el único acceso es vía las RPC `SECURITY DEFINER` (`vic_set_user_key`, `vic_get_user_key`, `vic_user_key_hint`, `vic_delete_user_key`), expuestas solo a `service_role`.

**Multi-proveedor:** la PK es `(company_id, user_email, provider)` — cada usuario guarda una key por proveedor (`'anthropic'` sk-ant-…, `'nvidia'` nvapi-…). Las 4 RPC llevan un parámetro `p_provider` (default `'anthropic'`, por compatibilidad). En `keys.js`, todas las funciones aceptan un 2º/3er argumento `provider`.

Migraciones: `app/supabase/migrations/20260602_vic_user_keys.sql` (base) + `20260708_001_vic_user_keys_multi_provider.sql` (columna `provider` en la PK + RPC con `p_provider`).

> El identificador de usuario es el **email AAD**, no el `conversation.id` (opaco y efímero). Cambiar `VIC_KEYS_SECRET` después de registrar keys las vuelve indescifrables — habría que re-registrarlas.

## Tools de Claude (en `src/llm/tools.js`)

Wiki: `search_wiki`, `get_wiki_page`, `list_wiki_pages`.
EOS (atajos fijos): `get_rocks`, `get_metrics`, `get_issues`, `get_people`, `get_meetings`, `get_processes`.
SQL libre: `list_db_schemas`, `list_db_tables`, `describe_db_table`, `query_db` (general), y `list_sinco_tables`/`describe_sinco_table`/`query_sinco` (atajo SINCO).
Alarmas de negocio: `listas_precio_atrasadas` (etapas activas sin lista nueva en 30+ días).
Tareas (única ESCRITURA de VIC): `find_person`, `create_task`, `commit_task`, `update_task_status`, `submit_task_proof`, `verify_task`, `get_my_tasks`, `get_tasks_for` (ver `tools/tasks.js`).

Para agregar una tool: define el objeto en `TOOLS`, agrega el `case` en `runTool`, e impleméntala en el archivo de `tools/` que corresponda.

## Módulo de Tareas (EOS — asignar/cerrar con prueba)

Único punto donde VIC ESCRIBE. Pasa por RPC `SECURITY DEFINER` acotadas a `public.tasks` (`task_create/commit/update_status/submit_proof/verify` + lecturas `get_my_tasks/get_tasks_for`); el candado read-only general (`_vic_esquemas_bloqueados`) no se toca. Migración: `app/supabase/migrations/20260612_001_tasks_module_phase1.sql`.

Seguridad clave: el correo de quien actúa (creador/responsable/verificador) lo inyecta el servidor desde `ctx.email`, NUNCA el modelo. El modelo solo elige a quién se asigna y sobre qué tarea. Roster válido = `invited_users` ∪ `profiles`. Verifica quien asignó (`created_by`) o un admin (`profiles.role='admin'` = CEO).

Flujo: `assigned → accepted` (responsable compromete fecha) `→ in_progress → submitted` (foto-prueba) `→ done` (verificación). `done` exige prueba + verificación.

Pendiente: fase 3 (adjuntos image/* en `bot.js` → subir a SharePoint vía Graph → `submit_task_proof`) y fase 4 (Edge Function `tasks-push` + cron diario para recordatorios 30/15/5/3/2/1 y avisos de asignación/verificación, leyendo `v_task_reminders_due`).

## Patrón para nuevas alarmas / detecciones proactivas

Las alarmas son la forma concreta del rol "comunicar". Patrón establecido (ejemplo: listas de precios):

1. **Vista en Supabase** que calcula la condición en vivo (fuente única de verdad). Ej: `sinco_ic_calc.v_listas_precio_atrasadas`.
2. **Función recompute** que hace upsert en `public.alarms` desde la vista (idempotente; resuelve solas las que dejan de aplicar). Ej: `recompute_alarmas_listas_precio()`.
3. **Cron** semanal que la ejecuta.
4. **Tool en VIC** que lee la vista vía RPC, para responder bajo demanda.
5. **Push** vía la Edge Function `alarmas-push` (lee `alarms` con `pushed_at IS NULL`).

Así una alarma aparece en los tres canales: el portal `/alarmas`, las respuestas de VIC, y el push a Teams.

## Variables de entorno (añadidas al README base)

| Variable | Para qué |
|----------|----------|
| `VIC_PUSH_SECRET` | Secreto compartido que autentica el endpoint `/api/push`. Debe coincidir con el secreto homónimo de la Edge Function `alarmas-push`. |
| `VIC_KEYS_SECRET` | Clave maestra para cifrar/descifrar las API keys de usuario en `vic_user_keys`. Cadena larga y aleatoria; NO la cambies tras registrar keys (las invalida). |
| `VIC_ANTHROPIC_API_KEY` | Key **compartida** del proveedor primario (Claude). Si falta, se usa `ANTHROPIC_API_KEY` del `.env` raíz. Cubre a quien no registró la suya con `/registrar-key`. |
| `VIC_OPENAI_API_KEY` | Key **compartida de respaldo** (OpenAI-compatible; NVIDIA build `nvapi-...`). Cada usuario puede registrar la suya con `/registrar-nvidia`; esta cubre a quienes no lo hicieron. |
| `VIC_OPENAI_BASE_URL` / `VIC_OPENAI_MODEL` | Endpoint y modelo del proveedor por defecto. Defaults: `https://integrate.api.nvidia.com/v1` y `openai/gpt-oss-120b`. ⚠ `meta/llama-3.3-70b-instruct` quedó en end-of-life el 2026-08-26 (410 Gone); al cambiar de modelo, verifícalo contra `/v1/models` y comprueba que soporte tool calling. |

(Las demás están documentadas en `README.md`.)

## Despliegue

- **Código del bot** → Azure App Service (`vic-ic-constructora` / `rg-vic-bot`). Solo redeployar cuando cambia el *código*; los datos los lee de Supabase en vivo. Tras este cambio, define `VIC_OPENAI_API_KEY` (y opcionalmente `VIC_OPENAI_BASE_URL`/`VIC_OPENAI_MODEL`) en App Settings antes de redeployar, o el default OpenAI no responderá.
- **Edge Functions** (`alarmas-push`) → `supabase functions deploy alarmas-push`. Requiere secretos `VIC_PUSH_URL`, `VIC_PUSH_SECRET`, `ALERT_TO_EMAILS`.
- **Crons** → pg_cron (esquema `cron`). Ver `cron.job`. El recompute de alarmas corre lunes 12:30.

## Reglas al modificar

- No rompas el candado de solo-lectura de las RPC `vic_*`. Cualquier cambio de alcance pasa por `_vic_esquemas_bloqueados()`.
- Respeta las reglas de negocio de SINCO documentadas en el `SYSTEM` de `llm/tools.js` (ventas netas, mapeo PPTO↔ERP, proyectos de socios en `flujo_historico`, etc.).
- El wiki es la fuente de verdad de personas/proyectos/procesos; SINCO la de cifras reales.

## Capa certificada de cartera (`sinco_ic_calc`)

Las cifras de cartera dejaron de depender del SQL que improvisara el modelo. La definición vive en tres vistas (migración `app/supabase/migrations/20260830_001_cartera_vencida_certificada.sql`) y el SYSTEM prompt obliga a usarlas.

| Vista | Grano | Para qué |
|-------|-------|----------|
| `sinco_ic_calc.v_cartera_vencida_proyecto` | proyecto | "cartera vencida de X" y totales; abre `vencido_cuota_inicial` / `vencido_credito` / `vencido_subsidio` / `vencido_total` |
| `sinco_ic_calc.v_cartera_vencida_resumen` | proyecto x categoría x rango de mora | "informe de cartera con mora de 30 / 60 / más de 90" |
| `sinco_ic_calc.v_cartera_vencida` | una fila por cuota en mora | listados auditables; **nunca** para totalizar |

**Definición.** Fuente única `sinco_ic_raw.adi_dtm_acuerdos_pago`. Vencido = `mora_saldo > 0` (equivale exactamente a `estadocartera = 'Vencido'`). Categoría por `idconcepto`, **no** por el texto del concepto: `3,4` → crédito; `6,313` → subsidio; el resto → cuota inicial (Cuota-N, Separación, Cesantías, Ahorro Prog., CDT, AFC, Bono).

**Errores del 2026-08-28 que estas vistas impiden:**

| Pregunta | VIC respondió | Real | Causa |
|---|---|---|---|
| Saldo cartera vencida | $326.254.505.344 | ~$40.000M | leyó `adi_dtm_venta` (ventas históricas), no cartera |
| Cuota inicial vencida | $25.000.000 | ~$14.000M | `concepto ILIKE '%cuota inicial%'` solo matchea `Bono cuota inicial-1` |
| Mora de Praia | $0 en todos los rangos | $6.062.483.185 | tabla equivocada, otra vez `adi_dtm_venta` |
| Facturado agosto | $22.700.520.888 | ~$3.700M | `adp_dtm_fact_controlproyecto` es control de **costos de obra**, no facturación de ventas |

> **Facturación mensual NO está certificada.** La fuente más cercana es `sinco_ic_raw.adi_dtm_facturasventa` (agosto 2026: 3.897.335.500), pero no reconcilia con Contabilidad (3.714.629.700) y la brecha de 182.705.800 no se explica por empresa, fecha ni estado de factura. El prompt obliga a VIC a dar la cifra **advirtiendo** que la definición no está acordada. Pendiente: cerrar la definición con Contabilidad y crear `v_facturacion_mensual`.

> **Dato vivo, sin histórico.** `adi_dtm_acuerdos_pago` es un espejo del ERP sin columna de corte: toda cifra de cartera es "a hoy" y no se puede reconstruir un corte pasado. Por eso la regresión separa anclas de tendencias.

### Regresión — `npm run regresion`

`scripts/regresion-cartera.js` contrasta las vistas contra las cifras que Cartera confirmó con Nicolás:

- **Anclas** (deben cuadrar al peso; son categorías sin recaudo diario): Castilla Living crédito `1.184.945.900` y subsidio `1.178.305.800`. Si una falla, la definición cambió — no publiques.
- **Tendencias** (tolerancia %, la fuente deriva con el recaudo): C.I. total, vencido total, Castilla Living total.
- **Guardas de regresión** contra los errores concretos: el total no puede acercarse al orden de `adi_dtm_venta`, la C.I. no puede colapsar a $25M, Praia no puede dar cero, los 4 rangos de mora deben estar poblados.

Sale con código 1 si falla un ancla o una guarda; los avisos de deriva no rompen.
