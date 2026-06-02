# CLAUDE.md — VIC Bot

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
├── bot.js            # ActivityHandler; captura conversationRef en cada mensaje
├── claude.js         # Claude (agentic loop), SYSTEM prompt y definición de TOOLS
├── lib/
│   ├── embeddings.js # Voyage AI (embeddings de búsqueda del wiki)
│   └── push.js       # saveConversationRef + sendProactive (Bot Framework)
└── tools/
    ├── wiki.js       # Búsqueda híbrida en wiki_documents
    ├── eos.js        # Tools fijas de EOS (rocks, metrics, issues, ...)
    └── sinco.js      # SINCO + acceso total DB (query_db, etc.) + alarmas de negocio
```

## Tools de Claude (en `src/claude.js`)

Wiki: `search_wiki`, `get_wiki_page`, `list_wiki_pages`.
EOS (atajos fijos): `get_rocks`, `get_metrics`, `get_issues`, `get_people`, `get_meetings`, `get_processes`.
SQL libre: `list_db_schemas`, `list_db_tables`, `describe_db_table`, `query_db` (general), y `list_sinco_tables`/`describe_sinco_table`/`query_sinco` (atajo SINCO).
Alarmas de negocio: `listas_precio_atrasadas` (etapas activas sin lista nueva en 30+ días).

Para agregar una tool: define el objeto en `TOOLS`, agrega el `case` en `runTool`, e impleméntala en el archivo de `tools/` que corresponda.

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

(Las demás están documentadas en `README.md`.)

## Despliegue

- **Código del bot** → Azure App Service (`vic-ic-constructora` / `rg-vic-bot`). Solo redeployar cuando cambia el *código*; los datos los lee de Supabase en vivo.
- **Edge Functions** (`alarmas-push`) → `supabase functions deploy alarmas-push`. Requiere secretos `VIC_PUSH_URL`, `VIC_PUSH_SECRET`, `ALERT_TO_EMAILS`.
- **Crons** → pg_cron (esquema `cron`). Ver `cron.job`. El recompute de alarmas corre lunes 12:30.

## Reglas al modificar

- No rompas el candado de solo-lectura de las RPC `vic_*`. Cualquier cambio de alcance pasa por `_vic_esquemas_bloqueados()`.
- Respeta las reglas de negocio de SINCO documentadas en el `SYSTEM` de `claude.js` (ventas netas, mapeo PPTO↔ERP, proyectos de socios en `flujo_historico`, etc.).
- El wiki es la fuente de verdad de personas/proyectos/procesos; SINCO la de cifras reales.
