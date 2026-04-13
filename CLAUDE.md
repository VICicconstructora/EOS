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

Archivo `app/.env`:
- `VITE_SUPABASE_URL` — URL del proyecto Supabase
- `VITE_SUPABASE_ANON_KEY` — anon/public key de Supabase

Si estas variables no están definidas, la app entra automáticamente en **Demo Mode** (sin llamadas reales a Supabase, datos mock locales).

## Base de datos (Supabase)

Schema completo en `app/supabase/schema.sql`. Migraciones incrementales en `app/supabase/migrations/`.

Tablas principales: `vto`, `rocks`, `issues`, `people`, `metrics`, `metric_values`, `processes`, `meetings`.

Todas las tablas usan `company_id = 'ic-constructora'` como tenant fijo. RLS habilitado en todas las tablas.

Para aplicar migraciones: ejecutar el SQL directamente en el Supabase Dashboard SQL Editor.

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

## Dev / testing

Para probar sin Supabase real: borrar o vaciar las env vars → la app entra en Demo Mode automáticamente.

Para probar con auth real: usar la cuenta `admin@icconstructora.com` (crearla en Supabase Dashboard > Authentication > Users si no existe). No crear usuarios adicionales durante pruebas. Ver `.claude/commands/dev-login.md`.
