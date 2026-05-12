# Integración con Microsoft Entra ID — Diseño

**Fecha:** 2026-05-07
**Proyecto:** Tracción — Sistema EOS de IC Constructora
**Autor:** Juan Paulo McAllister (CEO) + Claude
**Estado:** Diseño aprobado, pendiente plan de implementación

## Objetivo

Reemplazar el login actual de email/password de Supabase por SSO con Microsoft Entra ID, integrar Microsoft Graph para mostrar organigrama y perfiles, e introducir una matriz de permisos basada en roles para que cada empleado de IC Constructora vea contenido apropiado a su posición.

## Decisiones tomadas (brainstorming)

| # | Decisión |
|---|----------|
| 1 | **Acceso:** todos los empleados con cuenta `@icconstructora.com`. Tenant Entra single-tenant. |
| 2 | **Roles:** 4 niveles — Visualizador, Gerente de Área, Líder Transversal, Admin. |
| 3 | **Almacenamiento de roles:** tabla `profiles` en Supabase (admin asigna manualmente). |
| 4 | **Organigrama y perfiles:** híbrido — sync inicial desde Graph al primer login + edición manual en la app, con `locked_fields` para evitar que sync sobreescriba ediciones. |
| 5 | **Onboarding:** primer login crea row con `status='pending'`; usuario ve `PendingApprovalPage` hasta que un admin lo aprueba y le asigna rol+área. |
| 6 | **Personalización:** Dashboard, ROCAS y Asuntos filtrados por owner = email del usuario. (Otras personalizaciones — vista por área, tema, módulos visibles — quedan fuera del alcance de esta entrega.) |
| 7 | **Login UI:** un único botón "Iniciar con Microsoft". Demo Mode automático cuando faltan env vars de Supabase. |
| 8 | **Organigrama:** árbol vertical clásico (CEO arriba) en desktop; lista indentada colapsable como fallback en móvil (<768px). |
| 9 | **Enfoque técnico:** Supabase Azure provider + `provider_token` para llamar Graph desde el frontend (Enfoque 1 de 3). |

## Configuración pre-existente (ya hecha)

- App Registration `Traccion-IC` en Entra ID:
  - Client ID: `a3e3e09a-9bcc-4c58-b6d7-3aefd8bbd744`
  - Tenant ID: `129cb8aa-2444-49b4-acc9-3f6a696f1ff0`
  - Single tenant
  - Redirect URI: `https://zbjwasufengayvmutypr.supabase.co/auth/v1/callback`
  - Permisos delegados con admin consent: `User.Read`, `User.Read.All`, `User.ReadBasic.All`, `email`, `profile`, `openid`, `offline_access`
  - Client secret creado y entregado a Supabase (rotar a 24 meses).
- Provider Azure habilitado en Supabase project `zbjwasufengayvmutypr`.
- URL Configuration en Supabase: `http://localhost:5173/**` registrada para dev. Site URL pendiente confirmación de URL de producción.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  Navegador (React 19 + Vite)                                 │
│  ┌─────────────────┐    ┌──────────────────────────────┐    │
│  │ AppContext      │───▶│ supabase.auth.signInWith     │    │
│  │ (auth+profile)  │    │ OAuth({ provider:'azure' })  │    │
│  └────────┬────────┘    └───────────┬──────────────────┘    │
│           │                         │                        │
│           │            ┌────────────▼──────────────┐         │
│           │            │ Microsoft Entra ID        │         │
│           │            │ (Traccion-IC App)         │         │
│           │            └────────────┬──────────────┘         │
│           │                         │ id_token + provider    │
│           │                         │ token (Graph access)   │
│           │            ┌────────────▼──────────────┐         │
│           │            │ Supabase Auth             │         │
│           │            │ (sesión + auth.users)     │         │
│           │            └────────────┬──────────────┘         │
│           ▼                         │                        │
│  ┌─────────────────┐                │                        │
│  │ useGraph        │──────────────▶ │ Microsoft Graph API    │
│  │ (perfil/jefe/   │  GET /me,      │                        │
│  │  reportes)      │  /me/manager   │                        │
│  └─────────────────┘                │                        │
│           ▼                         ▼                        │
│  ┌─────────────────────────────────────────────────┐        │
│  │ useRocks/useIssues/usePeople (existentes)       │        │
│  │ + useProfile (nuevo)                            │        │
│  └────────────────┬────────────────────────────────┘        │
└───────────────────┼─────────────────────────────────────────┘
                    │
         ┌──────────▼─────────────────────────────┐
         │ Supabase Postgres                      │
         │ ┌──────────┐  ┌──────────┐  ┌────────┐│
         │ │ profiles │  │  people  │  │ rocks/ ││
         │ │ (NUEVA)  │  │ (extend) │  │ issues ││
         │ └──────────┘  └──────────┘  └────────┘│
         │ RLS: auth.uid() + role/status checks   │
         └────────────────────────────────────────┘
```

## Modelo de datos

### Nueva tabla `profiles`

Espejo de Entra + datos de la app. Una row por cada usuario que ha hecho login alguna vez.

```sql
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null unique,
  full_name       text default '',
  role            text not null default 'pending'
                  check (role in ('pending','viewer','area_manager','cross_leader','admin')),
  status          text not null default 'pending'
                  check (status in ('pending','active','suspended')),
  area            text default '',
  manager_id      uuid references public.profiles(id),
  azure_oid       text unique,
  photo_url       text default '',
  job_title       text default '',
  phone           text default '',
  locked_fields   text[] default '{}',
  approved_at     timestamptz,
  approved_by     uuid references public.profiles(id),
  last_synced_at  timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
```

### Cambios en tabla `people`

```sql
alter table public.people
  add column profile_id uuid references public.profiles(id) on delete set null;

update public.people p
   set profile_id = pr.id
  from public.profiles pr
 where p.email = pr.email and p.email <> '';
```

`people` sigue siendo la entidad EOS (GWC, values_fit, notes); `profiles` es el espejo de Entra. Una `profile` puede tener 0 o 1 `person`; una `person` puede existir sin `profile` (gente del equipo sin cuenta M365).

### Trigger de auto-creación

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, azure_oid, full_name, role, status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'provider_id',
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'pending',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Nota de implementación:** verificar al ejecutar el primer login real que Supabase Azure provider efectivamente puebla `raw_user_meta_data->>'provider_id'` con el Object ID de Entra. En algunas versiones puede estar bajo `'sub'` o `'oid'`. Ajustar el trigger antes de cerrar la fase 1 si el campo está vacío después del primer login de prueba.

### Helpers RLS

```sql
create or replace function public.is_active_user() returns boolean as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$ language sql stable security definer;

create or replace function public.current_role_app() returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function public.current_area() returns text as $$
  select area from public.profiles where id = auth.uid();
$$ language sql stable security definer;
```

(Nombre `current_role_app` para no chocar con el built-in `current_role` de Postgres.)

### Política base de RLS por tabla

Todas las tablas existentes pasan de `using (company_id = 'ic-constructora')` a un patrón con 3 políticas (read, write/update, delete) basado en la matriz de permisos. Ejemplo en `rocks`:

```sql
drop policy "company_access_rocks" on public.rocks;

create policy "rocks_read" on public.rocks
  for select using (public.is_active_user());

create policy "rocks_insert" on public.rocks
  for insert with check (
    public.current_role_app() in ('admin','cross_leader','area_manager')
  );

create policy "rocks_update" on public.rocks
  for update using (
    public.current_role_app() in ('admin','cross_leader')
    or (public.current_role_app() = 'area_manager' and owner = (select email from public.profiles where id = auth.uid()))
  );

create policy "rocks_delete" on public.rocks
  for delete using (
    public.current_role_app() in ('admin','cross_leader')
  );
```

Para que un Visualizador pueda actualizar SOLO el `status` de sus ROCAS propias (regla de la matriz), no se le da `UPDATE` directo en la tabla; en su lugar se expone una RPC restrictiva:

```sql
create or replace function public.update_my_rock_status(rock_id uuid, new_status text)
returns void as $$
begin
  if not exists (select 1 from public.rocks where id = rock_id and owner = (select email from public.profiles where id = auth.uid())) then
    raise exception 'Not your rock';
  end if;
  if new_status not in ('on-track','off-track','done') then
    raise exception 'Invalid status';
  end if;
  update public.rocks set status = new_status, updated_at = now() where id = rock_id;
end;
$$ language plpgsql security definer;

grant execute on function public.update_my_rock_status(uuid, text) to authenticated;
```

Patrón análogo de RPC restrictiva para issues (`update_my_issue_status`), metric_values (`record_my_metric`), etc., cuando la matriz asigne edición acotada a un rol que no tiene UPDATE general.

Tablas con patrón de 3 políticas (read/insert/update/delete según matriz): `vto`, `rocks`, `issues`, `metrics`, `metric_values`, `processes`, `meetings`, `people`, `implementation_progress`, `implementation_tasks`, `transcriptions`.

### RLS de `profiles`

```sql
alter table public.profiles enable row level security;

create policy "profiles_read"
  on public.profiles for select
  using (public.is_active_user() or id = auth.uid());

create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid());
```

RLS sola no puede restringir qué columnas modifica el usuario. Para evitar que un usuario se auto-promueva a admin, un trigger BEFORE UPDATE bloquea cambios en campos sensibles si el caller no es admin:

```sql
create or replace function public.guard_profile_sensitive_fields()
returns trigger as $$
begin
  if public.current_role_app() = 'admin' then
    return new;
  end if;
  if (new.role        is distinct from old.role)        or
     (new.status      is distinct from old.status)      or
     (new.area        is distinct from old.area)        or
     (new.manager_id  is distinct from old.manager_id)  or
     (new.approved_at is distinct from old.approved_at) or
     (new.approved_by is distinct from old.approved_by) or
     (new.azure_oid   is distinct from old.azure_oid)   or
     (new.email       is distinct from old.email)       then
    raise exception 'Cannot modify sensitive profile fields outside approve_user RPC';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger profiles_guard_sensitive
  before update on public.profiles
  for each row execute function public.guard_profile_sensitive_fields();
```

Modificación de campos sensibles solo vía RPC dedicada que valida rol del caller:

```sql
create or replace function public.approve_user(
  target_id   uuid,
  new_role    text,
  new_area    text,
  new_manager uuid
) returns void as $$
begin
  if public.current_role_app() <> 'admin' then
    raise exception 'Only admins can approve users';
  end if;
  if new_role not in ('viewer','area_manager','cross_leader','admin') then
    raise exception 'Invalid role';
  end if;
  update public.profiles
     set role        = new_role,
         area        = new_area,
         manager_id  = new_manager,
         status      = 'active',
         approved_at = now(),
         approved_by = auth.uid(),
         updated_at  = now()
   where id = target_id;
end;
$$ language plpgsql security definer;

grant execute on function public.approve_user(uuid, text, text, uuid) to authenticated;
```

Análogamente: `suspend_user(target_id)`, `reactivate_user(target_id)`, `change_user_role(target_id, new_role)`.

## Flujo de autenticación

```
[Sin sesión]
    │  click "Iniciar con Microsoft"
    ▼
[Redirige a Entra]  ── usuario autentica con MFA / SSO ──┐
                                                          │
[Callback Supabase] ◀────────────────────────────────────┘
    │  trigger handle_new_user crea profile (pending) si es primer login
    ▼
[App carga AppContext, carga profile]
    │
    ├── profile.status = 'pending'   ──▶  PendingApprovalPage
    ├── profile.status = 'active'    ──▶  app normal (rutas según role)
    └── profile.status = 'suspended' ──▶  pantalla "Acceso suspendido"
```

### Cambios en `AppContext.jsx`

- Añadir state: `profile`, `providerToken`.
- Añadir método: `signInWithMicrosoft()` reemplaza a `login(email, password)`.
- En `initAuth()`: cargar profile después de session, guardar `providerToken` para Graph.
- `isAdmin` ahora deriva de `profile?.role === 'admin'`.
- En Demo Mode: inyectar profile mock con `role='admin'` y `status='active'`.

### Refresh del `provider_token` de Graph

Supabase no refresca el `provider_token` automáticamente. Estrategia en `useGraph`:

1. Si Graph responde `401`, llamar `supabase.auth.refreshSession()`.
2. Si `refreshSession` retorna nuevo `provider_token`, reintentar la llamada original una vez.
3. Si no, llamar `signInWithOAuth({ provider: 'azure', options: { skipBrowserRedirect: false } })` (re-autenticación completa).

## Microsoft Graph

### `lib/useGraph.js` (nuevo)

Hook que expone:
- `me()` — `/me`
- `myPhoto()` — `/me/photo/$value` → blob → object URL
- `myManager()` — `/me/manager`
- `myDirectReports()` — `/me/directReports`
- `userById(oid)` — `/users/{oid}`
- `photoById(oid)` — `/users/{oid}/photo/$value` → object URL

Maneja el refresh de token y rate limits internamente. Constante `GRAPH_BASE = 'https://graph.microsoft.com/v1.0'`.

### Sync de profiles

| Momento | Qué hace | Quién dispara |
|---------|----------|---------------|
| **Primer login** | `last_synced_at = null` → frontend llama `me()`, `myPhoto()`, `myManager()`. Guarda `full_name`, `job_title`, `phone`, `azure_oid`, `photo_url` en `profiles`. Resuelve `manager_id` por `azure_oid` del manager. | `useEffect` en AppContext |
| **Sync admin global** | Botón "Sincronizar todos desde Entra" en panel admin. Itera sobre profiles, para cada uno llama `userById(azure_oid)` y actualiza campos no listados en `locked_fields`. | `PendingUsersPanel` |
| **Sync individual lazy** | Si `last_synced_at > 7 días`, sync en background al ver el perfil. | `useProfile(id)` |

### Lock de campos

Cuando el usuario o admin edita un campo manualmente, se agrega el nombre del campo a `profiles.locked_fields`. El sync de Graph omite cualquier campo listado allí. Botón "Desbloquear y resincronizar" lo quita del array y trae el valor de Entra.

### Foto

Las fotos vienen de Graph como blob. Para arrancar se cachean como data URL (base64) en `profiles.photo_url`. Esto suma ~30 KB por perfil, aceptable para 50-100 personas. Si la tabla crece, migrar a Supabase Storage en una fase posterior.

## Componentes UI

### Modificadas

| Archivo | Cambio |
|---------|--------|
| `pages/LoginPage.jsx` | Reemplazar form de email/password por botón único "Iniciar con Microsoft". Mostrar banner de Demo Mode si aplica. |
| `context/AppContext.jsx` | Añadir `profile`, `providerToken`; reemplazar `login` por `signInWithMicrosoft`. |
| `App.jsx` | Añadir `ProtectedRoutes` que redirige según `profile.status`. |
| `components/layout/Sidebar.jsx` | Ocultar items según `can(profile, 'view', resource)`. Ítem "Admin → Usuarios" visible solo si `role='admin'`. |
| Hooks `useRocks`, `useIssues`, `useMetrics`, etc. | Filtrar consultas según rol/área/email del usuario. |
| `pages/DashboardPage.jsx` | Filtrar widgets a propios del usuario (ROCAS de owner=email, issues de owner=email). |
| `pages/PersonasPage.jsx` | Mostrar foto de Graph cuando exista; respetar permisos de edición. |
| RLS de `vto`, `rocks`, `issues`, `metrics`, `metric_values`, `processes`, `meetings`, `people`, `implementation_*`, `transcriptions` | Reescribir según matriz. |

### Nuevas

| Archivo | Propósito |
|---------|-----------|
| `lib/useGraph.js` | Hook para llamar Microsoft Graph. |
| `lib/useProfile.js` | Hook que combina `auth.users` + `profiles`. |
| `lib/permissions.js` | Helper `can(profile, action, resource)` y matriz de reglas. |
| `pages/PendingApprovalPage.jsx` | Pantalla para usuarios con `status='pending'`. |
| `pages/SuspendedPage.jsx` | Pantalla para `status='suspended'`. |
| `pages/OrganigramaPage.jsx` | Árbol vertical (`react-d3-tree` desktop, lista indentada móvil). |
| `pages/MiPerfilPage.jsx` | Edición de campos propios (foto, teléfono, idioma, vista por defecto), botón resync. |
| `components/admin/PendingUsersPanel.jsx` | Tabla en `/admin/usuarios` con acción "Aprobar y asignar rol+área+manager". |
| `components/admin/UserEditModal.jsx` | Modal para cambio de rol/área/manager. |
| `components/auth/ProtectedRoute.jsx` | Wrapper de rutas que valida `profile.status` y permisos. |

### Pantalla de Login

```
┌─────────────────────────────────────┐
│         [Logo IC Constructora]       │
│                                     │
│           Tracción                  │
│   Sistema EOS de IC Constructora    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ [MS] Iniciar con Microsoft    │  │
│  └───────────────────────────────┘  │
│                                     │
│   Solo cuentas @icconstructora.com  │
└─────────────────────────────────────┘
```

### Organigrama

Árbol vertical con `react-d3-tree`. Nodo: foto + nombre + cargo + área. Click → modal con detalle (email, teléfono, GWC si tiene `people` relacionado, ROCAS asignadas, KPIs propios). Raíz: profile cuyo `manager_id` es null (CEO).

En móvil (`< 768px`): lista indentada colapsable estilo árbol de carpetas.

### Panel admin de usuarios

Tabla en `/admin/usuarios` con:
- Filtros: estado (`pending`/`active`/`suspended`), área, rol.
- Búsqueda por nombre/email.
- Botón "Sync Entra" (sync global).
- Acción "Aprobar" en row pending → modal que pide rol, área, manager, opcional vincular con `people` existente.
- Acción "Editar" en active → mismo modal.
- Acción "Suspender" en active.

## Matriz de permisos

| Módulo | Visualizador | Gerente de Área | Líder Transversal | Admin |
|--------|:------------:|:---------------:|:-----------------:|:-----:|
| Visión / VTO | Lee | Lee | Lee + edita | Lee + edita |
| ROCAS — propias | Lee + edita estado | Lee + edita | Lee + edita | Lee + edita |
| ROCAS — de mi área | Lee | Lee + edita | Lee + edita | Lee + edita |
| ROCAS — globales | Lee | Lee | Lee + edita | Lee + edita |
| Asuntos — propios | Lee + edita | Lee + edita | Lee + edita | Lee + edita |
| Asuntos — de mi área | Lee | Lee + edita | Lee + edita | Lee + edita |
| Asuntos — globales | Solo título | Lee | Lee + edita | Lee + edita |
| Scorecard / KPIs | Lee | Lee + edita métricas de mi área | Lee + edita | Lee + edita |
| Personas (EOS, GWC) | Solo nombre+cargo | Lee + edita su gente | Lee + edita | Lee + edita |
| Procesos | Lee | Lee + edita los suyos | Lee + edita | Lee + edita |
| Reuniones L10 | Lee si fue convocado | Lee + crea/edita las suyas | Lee + edita | Lee + edita |
| Organigrama | Lee | Lee | Lee | Lee + edita |
| Mi Perfil | Edita | Edita | Edita | Edita |
| Admin / Usuarios | — | — | — | Lee + edita |
| Configuración | — | — | — | Edita |

Doble validación:
- **Servidor:** RLS en Postgres (defensa en profundidad). Edición acotada por columna que no puede expresarse en RLS (ej. "Visualizador edita solo `status` de sus ROCAS") se canaliza por RPCs `security definer` con validación explícita.
- **Cliente:** `lib/permissions.js` con `can(profile, action, resource)` para esconder UI.

**Nota sobre lecturas con columnas restringidas (ej. Visualizador en Personas: "Solo nombre+cargo"):** RLS de Postgres no soporta filtrado a nivel columna. Se implementa en el frontend seleccionando solo los campos permitidos (`select('id, full_name, job_title')`) cuando el rol es Visualizador. Para defensa en profundidad opcionalmente crear una vista `public.people_public` que exponga solo columnas no-sensibles, con RLS propio.

## Demo Mode

Sigue funcionando como hoy: si `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY` faltan (o si Supabase falla), AppContext entra en Demo Mode y:
- Inyecta `user = DEMO_USER` y `profile = { role: 'admin', status: 'active', full_name: 'Admin IC', area: 'Dirección' }`.
- Muestra banner "Modo Demo — datos no persistentes".
- Todas las operaciones de escritura quedan en memoria.
- `useGraph` retorna mocks (sin red).

## Migración de datos existentes

- Tabla `people` con registros existentes: queda intacta. Campo `profile_id` agregado, se llena por email-match cuando un user real haga login.
- Personas en `people` que nunca hagan login (sin cuenta M365): permanecen sin `profile_id`. Aparecen en PersonasPage pero no en el organigrama (que se construye desde `profiles`).
- VTO seed existente: queda intacto.
- Auth users existentes (la cuenta de prueba `admin@icconstructora.com`): si fue creada manualmente con email/password en Supabase, se promueve manualmente con un script: `update profiles set role='admin', status='active' where email='admin@icconstructora.com';`. O se borra y se recrea vía login Entra.

## Rollout en fases

| Fase | Alcance | Validación |
|------|---------|------------|
| 1 — Auth + onboarding | Login Microsoft, trigger creación profile, PendingApprovalPage, panel admin para aprobar | CEO + TI loggean, se aprueban entre sí |
| 2 — Sync Graph + perfiles | useGraph, sync inicial al primer login, MiPerfilPage editable, fotos | CEO + 2 gerentes piloto |
| 3 — Organigrama | OrganigramaPage con árbol vertical | Todos los gerentes |
| 4 — RLS + matriz de permisos | Reemplazar políticas actuales por nuevas, gates en frontend | Pruebas con cuentas reales de cada rol |
| 5 — Dashboard personal | Filtrar Dashboard, ROCAS, Asuntos por owner=email | Empleados piloto |
| 6 — Apertura general | Anuncio a todo IC, abrir login a todo el dominio | Todo IC Constructora |

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Cuentas técnicas o invitados de @icconstructora.com pueden quedar pending sin ser empleados reales | Lista de exclusión por regex de email; o simplemente dejar que admin las suspenda manualmente |
| Refresh de provider_token falla silenciosamente y Graph deja de funcionar | Catch global en `useGraph`, redirige a re-login con `prompt=none` |
| Datos en Entra mal poblados (sin manager, sin foto) → organigrama incompleto | Edición manual disponible desde admin panel; locked_fields permite override |
| Si la app se mueve de dominio, redirect URI rompe login | Lista de Redirect URLs en Supabase y Entra incluye dev y producción; se actualiza ambos al cambiar de dominio |
| Usuario malicioso intenta auto-promoverse a admin desde el cliente | Campos sensibles (`role`, `status`, `area`, `manager_id`) solo modificables vía RPC `approve_user` que valida rol del caller |
| Client secret comprometido | Rotación cada 24 meses; rotación inmediata si se sospecha exposición (ya programada por haberse compartido en chat durante la configuración inicial) |

## Fuera de alcance (entrega futura)

- Vista filtrada por área (decisión 6 — opción B): cada gerente ve por defecto su área en widgets globales.
- Notificaciones por email/Teams al admin cuando un usuario queda pending.
- Sincronización programada con Graph (cron job en Edge Function).
- Migración de fotos a Supabase Storage.
- Multi-tenancy real (hoy `company_id='ic-constructora'` sigue hardcodeado; el rediseño de RLS lo deja preparado para evolucionar pero no abre tenants nuevos).
- Edge Function como broker (Enfoque 3) — solo si Enfoque 1 demuestra limitaciones.
- Roles automáticos por grupo de Entra (Opción A de pregunta 3) — escapatoria si manualmente se vuelve insostenible.
