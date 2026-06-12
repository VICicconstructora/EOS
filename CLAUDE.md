# CLAUDE.md

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
| `wiki` | Wiki scrapeado de VIC (`wiki_documents`), buzón de propuestas (`wiki_proposals`), estado del indexador (`scraping_state`). |
| `sharepoint` | Inventario SharePoint (`sharepoint_sites`, `sharepoint_versiones`, `sharepoint_sync_log`). **No se toca.** |
| `kpi` | 17 matviews + 6 vistas de KPI (`kpi_*`, `mv_proyectos_kpis`). Refrescadas por `public.refresh_kpi_matviews()`, `public.refresh_mv_proyectos_kpis()` y cron jobs 2–6 (apuntan a `kpi.*`). |
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

## Wiki de IC Constructora

Cuando el usuario dice "el wiki" o "revisa el wiki", se refiere a:

`C:\Users\jmacallister\IC CONSTRUCTORA SAS\AA General Edicion - .AI\Wiki\ICEOS\IC-EOS`

Esa es la fuente de verdad de personas, proyectos, procesos y estructura organizacional. Cualquier actualización de información (nombres, roles, proyectos) debe hacerse ahí, no en el wiki local de este repositorio.

## Dev / testing

Para probar sin Supabase real: borrar o vaciar las env vars → la app entra en Demo Mode automáticamente.

Para probar con auth real: usar la cuenta `admin@icconstructora.com` (crearla en Supabase Dashboard > Authentication > Users si no existe). No crear usuarios adicionales durante pruebas. Ver `.claude/commands/dev-login.md`.
