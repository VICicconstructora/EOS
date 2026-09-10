# CLAUDE.md

> [!IMPORTANT]
> **Archivo espejo:** `CLAUDE.md` y `AGENTS.md` son idénticos en contenido.
> Cada vez que modifiques uno, debes aplicar **los mismos cambios** en el otro
> para mantenerlos sincronizados. Nunca dejes ambos archivos desincronizados.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Aplicación web EOS/Tracción para IC Constructora. Implementa el sistema de gestión empresarial EOS (Entrepreneurial Operating System): VTO, Rocks, Scorecard, Issues, Personas, Procesos y Reuniones L10. Backend: Supabase (PostgreSQL + Auth). Frontend: React 19 + Vite + react-router-dom v7.

## Comandos

```bash
cd app
npm install
npm run dev        # dev server (http://localhost:5173)
npm run build
npm run lint
```

## Variables de entorno

**Credenciales centralizadas (fuente única):** todas viven en un solo `.env` en la **raíz del repo** (gitignored). Plantilla en `.env.example`. NO crear `.env` por carpeta — cada subproyecto carga el de la raíz:

| Subproyecto | Cómo carga la raíz |
|-------------|--------------------|
| `vic-bot/*` | Node `dotenv` → `../../.env` |
| `app/`, `apps/total/frontend/` | Vite `envDir` |
| `apps/indicadores/`, `apps/total/backend/`, `sharepoint-scraper/` | Python `load_dotenv(.../.env)` |
| `scripts/sync-datamart/` | loader inline sin dependencias |

Convenciones del `.env` raíz: Anthropic y Gemini **unificadas** (una key por proveedor); el registro Azure del scraper va con prefijo `SP_` (distinto al de `app`/datamart); el service_role de Supabase se expone con 3 alias (`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_KEY`/`SUPABASE_SERVICE_KEY`). `WIKI_PATH` (vic-bot) y `DEST_ROOT` (export_mirror) son rutas de **datos** fuera del repo, no credenciales.

La app frontend usa `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Si no están definidas, entra en **Demo Mode** (sin Supabase real, datos mock locales).

## Base de datos (Supabase)

Schema completo en `app/supabase/schema.sql`. Migraciones incrementales en `app/supabase/migrations/`.

Tablas principales: `vto`, `rocks`, `issues`, `people`, `metrics`, `metric_values`, `processes`, `meetings`.

Todas las tablas usan `company_id = 'ic-constructora'` como tenant fijo. RLS habilitado en todas las tablas.

Para aplicar migraciones: ejecutar el SQL directamente en el Supabase Dashboard SQL Editor.

### Organización de schemas (reorg 2026-06-10)

La base se reorganizó por dominio. Cada módulo vive en su propio schema; en `public` queda una **vista de compatibilidad** (`security_invoker = true`) con el nombre viejo, para que app, Power BI, VIC y las funciones RPC sigan leyendo `public.<tabla>` sin cambios. Para leer/escribir los datos reales, usar el schema destino.

| Schema | Contenido |
|--------|-----------|
| `public` | **EOS core** (real): `vto`, `rocks`, `issues`, `people`, `profiles`, `metrics`, `metric_values`, `meetings`, `transcriptions`, `processes`, `documents`, `implementation_*`, `invited_users`, `alarms`, `usuarios`. Además: vistas de compat de todos los demás módulos. |
| `wiki` | Solo `wiki_proposals` (buzón de propuestas de VIC, revisión humana). `wiki_documents` y `scraping_state` se borraron el 2026-08-20 fuera del flujo de migraciones — ver `20260820_001_recreate_wiki_proposals.sql` y la sección "Wiki de IC Constructora" más abajo. |
| `sharepoint` | Inventario SharePoint (`sharepoint_sites`, `sharepoint_versiones`, `sharepoint_sync_log`). **No se toca.** |
| `ic_kpi` / `ic_calc` | Capa de KPI **real de esta BD**: matviews `kpi_*` + `mv_proyectos_kpis` en `ic_kpi`, vistas fuente en `ic_calc`. El frontend (`supabaseIc`, schema `public`) las lee vía **vistas de compat `public.kpi_*`** (`security_invoker`, ver `20260714_001`). Refrescadas por `public.refresh_kpi_matviews()`, `public.refresh_mv_proyectos_kpis()` y cron jobs 2–6. ⚠ El schema `kpi` de las migraciones `20260610_001/_009` **nunca se aplicó a esta BD**; el home real es `ic_kpi`. |
| `excel_ic_*` | Data de origen Excel/PyG (espejo de `sinco_ic_*`): `excel_ic_raw` (`historico`, `flujo_historico` baseline PyG, `mc_*`, `ppto_valores`, `proyectos_map`, `pyg_lineas`), `excel_ic_model` (vistas `v_real_ejecutado`, `v_proyecciones_vigentes`, `v_fcl_actual`), `excel_ic_meta` (sharepoint sheets). **Reemplazó a `historico` + `sinco_ic_historico` + `sinco_ic_meta` + `sinco_ic_targets`.** |
| `hr` | Talento Humano: `hr_requests`, `hr_candidates`, `hr_interviews`, `hr_comments`. |
| `lotes` | Originación/predios: `lots`, `lot_advisors`, `lot_partners`, `lot_scenarios`, `lot_documents`. |
| `legal` | Jurídico: `legal_processes` (+ FK a `lotes.lots`), `legal_milestones`, `legal_parties`, `legal_documents`, `legal_comments`. |
| `vic` | Operación de VIC: `vic_conversation_refs`, `vic_piloto_aportes`, `vic_push_log`, `vic_user_keys`. Las 4 funciones de keys (`vic_set/get/delete/hint`) apuntan directo a `vic.vic_user_keys` (no a la vista, por el UPSERT). |
| `sinco_ic_*` | Espejo SINCO (`raw`, `model`, `export`, `calc`, `meta`, `targets`, `historico`). |
| `lm_config` | Configuración de la landing/módulos (Power BI embeds). |

**Histórico / Flujo (2026-06-10):** una reorg paralela movió `historico`→`excel_ic_raw` y `sinco_ic_historico`→`excel_ic_model`, e incluyó las tablas `mc_*` en `excel_ic_raw`. La tabla legado `public.flujo_historico` (45 filas, seed CBR) se eliminó; las 3 vistas `public.vw_flujo_*` se repuntaron al dato real (`excel_ic_raw.flujo_historico`, línea PyG `16.0` FCL, real vs proyección por último corte) exponiendo `company_id` constante para no tocar el front (`FlujosHistoricoChart`).

**Acceso de VIC:** el rol `vic_readonly` tiene `USAGE` + `SELECT` en todos los schemas nuevos (base y vistas de compat), para que VIC pueda leer toda la organización.

Migraciones de la reorg: `app/supabase/migrations/20260610_003..009_*.sql` (aplicadas en producción vía MCP; usar `supabase migration repair` si se hace `db push`).

## Arquitectura frontend (`app/src/`)

- `context/AppContext.jsx` — estado global: auth, VTO, demo mode, idioma. Todos los componentes usan `useApp()` para acceder a estos datos.
- `lib/supabase.js` — cliente Supabase (retorna `null` si no hay env vars configuradas).
- `lib/use*.js` — hooks de datos por entidad (`useRocks`, `useIssues`, `useMetrics`, `usePeople`, `useProcesses`, `useMeetings`). Siempre filtran por `company_id = 'ic-constructora'`.
- `pages/` — una página por módulo EOS, lazy-loaded desde `App.jsx`.
- `components/layout/` — `Sidebar` y `TopHeader`.
- `components/charts/` — gráficos con Recharts.
- `components/meetings/` — `L10Runner` para conducir reuniones L10 en vivo.
- `lib/i18n.js` — internacionalización con react-i18next (idioma por defecto: español).

## Patrones de código

Al crear componentes que lean de Supabase:
1. Importar `supabase` de `../../lib/supabase` y `useApp` de `../../context/AppContext`.
2. Verificar `isDemoMode` al inicio de `loadData()` y retornar datos mock si es verdadero.
3. Siempre filtrar queries por `.eq('company_id', 'ic-constructora')`.
4. Usar `useTranslation()` de react-i18next para textos visibles.

Ver plantilla completa en `.claude/commands/new-analytics-chart.md`.

## Correos automáticos

Dos correos salen solos desde GitHub Actions, ambos por Microsoft Graph
`sendMail` con el app registration de Azure (`AZURE_*`). Los destinatarios NO se
comparten: `datamart-sync` lee el secret `ALERT_TO_EMAILS` (desde el 2026-09-10,
solo el CEO — es su tablero) y `reporte-semanal` lee `REPORTE_TO_EMAILS` (los 8
gerentes, directores y coordinadores). Ambos scripts leen la misma variable de
entorno `ALERT_TO_EMAILS`; lo que cambia es de qué secret se alimenta.

| Workflow | Cuándo | Script | Qué manda |
|----------|--------|--------|-----------|
| `datamart-sync` | Lunes 07:00 Bogotá | `scripts/sync-datamart/sync-datamart-cloud.js` | Alarmas operativas (pólizas, licencias, crédito) leídas de `Datamart.xlsx` en SharePoint, más la sección de **Tareas EOS** leída de `public.tasks`. También **escribe** en `public.alarms`. |
| `reporte-semanal` | Lunes 07:30 Bogotá | `scripts/reporte-semanal/reporte-semanal.js` | Productividad de la semana anterior: ventas → trámites → cartera → obra → flujo. **Solo lee.** |

El reporte semanal ejecuta su SQL (`scripts/reporte-semanal/queries.js`) con el
RPC `public.vic_query_db`, que es de solo lectura por construcción. Antes de
tocarlo, leer `scripts/reporte-semanal/README.md`: documenta las tres
limitaciones de fuente que condicionan lo que el correo puede afirmar — solo
cubre los 14 proyectos CBR con dato vivo en SINCO; la meta semanal de obra sale
del cronograma valorizado de ADPRO (`adp_dtm_vfact_programacion`, valor con
fecha = `Valor Programado × Porcentaje Asignado`), que hoy solo está vigente y
con cobertura suficiente en Bosque Central y Primera Este; y el FCL formal
depende del corte mensual del Excel PyG (atrasado a abril 2026).

Para probar sin enviar: `node reporte-semanal.js --dry-run`.

### Sección de Tareas EOS (datamart-sync)

Las tareas las asigna VIC por Teams y viven en `public.tasks`; el correo es el
tablero del CEO sobre ellas. Tres bloques, en el orden en que exigen acción:

| Bloque | Qué trae | Por qué va primero/último |
|--------|----------|---------------------------|
| Esperando verificación | `status='submitted'`, con enlace a la prueba | Es lo único que bloquea a quien asignó: la tarea ya se hizo y espera su visto bueno. |
| Abiertas | Todo lo no cerrado, lo más vencido arriba | Ancla = `committed_date` si existe, si no `due_date` — la misma que usan los recordatorios de `v_task_reminders_due`. |
| Cerradas | `status='done'` con `verified_at` en los últimos 7 días | Responde "quién resolvió qué" sin arrastrar el histórico completo. |

Una tarea `submitted` aparece **solo** en el primer bloque, nunca repetida en
abiertas.

Se hereda la convención de las alarmas — **el icono es el estado; el fondo es la
gestión**. Una tarea vencida sigue 🔴 aunque el responsable se haya comprometido
a una fecha; el compromiso (`committed_date`) es lo que le pone fondo verde, para
separar la que alguien ya respondió de la que nadie ha tocado (`Sin aceptar`).

Las columnas nombran a las dos personas: **Responsable** (`assigned_name`) y
**Asignó** (`created_by_name`). En las cerradas, **Verificó** sale de
`verified_by`. Sin esas tres columnas el correo no contesta la pregunta que
justifica la sección.

### Reglas de las alarmas (datamart-sync)

1. **Una alarma por hecho, no por fila.** El Datamart repite el crédito o la
   póliza en cada etapa del proyecto; `mergeEtapas()` agrupa las que traen
   exactamente la misma información y nombra todas las etapas que cubre
   (`E1, E2: DAVIVIENDA, vence ...`). Si algo difiere (entidad, fecha vigente,
   prórrogas) son hechos distintos y no se agrupan. Cuando dos filas comparten
   etapa y categoría con datos distintos (Mitika E1.2 trae dos pólizas), no
   caben las dos bajo el mismo `external_id`: `conservarMasCritica()` deja la
   de menos días restantes.
2. **Fecha visible con el mes en letras: `2026-May-12`.** Vale para el correo,
   el detalle de la alarma y la app (`app/src/lib/fechas.js`). El formato ISO
   queda solo para las columnas `DATE` de Supabase (`isoDate()` en el script).
3. **El icono es el estado; el fondo es la gestión.** Una solicitud radicada
   (prórroga, renovación o revalidación) nunca baja el nivel de la alarma: si la
   fecha vigente ya pasó sigue siendo VENCIDA / rojo. Lo que hace es marcarla
   `gestionada`, y el correo le pone fondo verde (`#ecfdf5`) para separarla de la
   que nadie ha tocado. En `--dry-run` sale como `[monitoreada]`.

Para probar sin escribir ni enviar: `node sync-datamart-cloud.js --dry-run`.

## Wiki de IC Constructora

Cuando el usuario dice "el wiki" o "revisa el wiki", se refiere a:

`C:\Users\jmacallister\IC CONSTRUCTORA SAS\AA General Edicion - .AI\Wiki\ICEOS\IC-EOS`

Esa es la fuente de verdad de personas, proyectos, procesos y estructura organizacional.

**Un solo árbol (unificado 2026-09-07).** Existía un segundo wiki en
`.AI/_sharepoint/wiki/` — 40 archivos congelados el 2026-06-17, sin capa
`personas/` ni `cargos/`, y también indexado por Graph Search. VIC podía
contestar desde ahí y afirmar cosas falsas ("el wiki no tiene nombres de
personas"). Sus 19 hubs únicos se migraron a `wiki/raw/scrape-hubs/` y los 40
archivos quedaron convertidos en lápidas `tipo: lapida` que redirigen al árbol
real. **No volver a crear un wiki paralelo dentro de `_sharepoint/`.**

**El organigrama es generado, no escrito.** `wiki/empresa/organigrama.md` y la
tabla de gerentes de `wiki/index.md` se derivan de `cargos/*.md` (asientos) y
`personas/*.md` mediante `scripts/gen_organigrama.py`, entre marcadores
`<!-- GENERADO:... -->`. Lo corre el paso 2 de `scripts/run_entra_sync.ps1`
(tarea `IC-Entra-Sync-Personas`, día 1 de cada mes). Para cambiar un titular se
edita **el asiento** en `cargos/`, nunca el organigrama: cualquier edición dentro
de los marcadores se pierde en la siguiente corrida. Las notas curadas a mano
(asignación de salas por proyecto, brokers externos) viven fuera de los
marcadores y sobreviven. Los duplicados se marcan `estado: fusionado` y el
generador los ignora. Cualquier actualización de información (nombres, roles, proyectos) debe hacerse ahí, no en el wiki local de este repositorio.

**Cómo busca VIC en el wiki (real, desde 2026-08-21):** no hay índice propio ni embeddings. `vic-bot/src/lib/sharepointSearch.js` consulta la **Microsoft Graph Search API** (`/search/query`, índice nativo de SharePoint) con 3 pasadas de fallback (sitios de equipo → sin filtrar → incluyendo OneDrive). `sharepoint-scraper/sharepoint_scraper.py` solo convierte documentos a `.md` con MarkItDown y los sube de vuelta a SharePoint (`.AI/_local-ingest/sharepoint/<sitio>/...`) para que ese índice los recoja — sin chunking ni embeddings. El schema `wiki.wiki_documents` (pgvector, búsqueda híbrida) que existía antes se borró el 2026-08-20; el código que lo usaba (`vic-bot/indexer/dailySync.js`, `indexWiki.js`, `backfillEmbeddings.js`, `wiki_hybrid_search.sql`) sigue en el repo pero es código muerto — no tocar como si estuviera activo. `vic-bot/README.md` de ese módulo puede seguir desactualizado; confiar en `sharepointSearch.js` como fuente de verdad del comportamiento real.

## Dev / testing

Para probar sin Supabase real: borrar o vaciar las env vars → la app entra en Demo Mode automáticamente.

Para probar con auth real: usar la cuenta `admin@icconstructora.com` (crearla en Supabase Dashboard > Authentication > Users si no existe). No crear usuarios adicionales durante pruebas. Ver `.claude/commands/dev-login.md`.
