# Plan 1 — Auth con Microsoft Entra ID (Fase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el login email/password por SSO con Microsoft Entra. Crear tabla `profiles` con flujo de aprobación. Habilitar a un admin para aprobar usuarios pending y asignar rol+área.

**Architecture:** Supabase Azure provider + `provider_token` para Graph (Enfoque 1 del spec). Trigger en `auth.users` crea `profiles` row con `status='pending'`. Usuarios pending ven `PendingApprovalPage`. Admin aprueba vía RPC `approve_user`. La matriz de permisos completa y RLS por tabla son alcance del Plan 4 (no este).

**Tech Stack:** React 19 + Vite, Supabase (Postgres + Auth con Azure provider), `react-router-dom` v7, `@supabase/supabase-js` v2.

**Spec:** [`docs/superpowers/specs/2026-05-07-entra-id-integration-design.md`](../specs/2026-05-07-entra-id-integration-design.md)

---

## Pre-requisitos

Antes de empezar verificar:

- App `Traccion-IC` registrada en Entra con admin consent dado (ya hecho).
- Provider Azure habilitado en Supabase project `zbjwasufengayvmutypr` con client_id, secret y tenant URL configurados (ya hecho).
- `app/.env` contiene `VITE_SUPABASE_URL=https://zbjwasufengayvmutypr.supabase.co` y `VITE_SUPABASE_ANON_KEY=<anon-key>`. Si faltan, conseguirlos en Supabase Dashboard → Settings → API.
- `app/.env.example` debe documentar las variables (sin valores reales).
- `cd app && npm install && npm run dev` debe levantar el dev server en `http://localhost:5173`.

## Mapa de archivos

**Nuevos:**
- `app/supabase/migrations/2026_05_08_profiles_and_approval.sql` — migración SQL única con tabla, helpers, triggers, RPCs, RLS.
- `app/src/lib/permissions.js` — helper `can(profile, action, resource)` (versión mínima Fase 1: solo `isAdmin` y `isActive`).
- `app/src/components/auth/ProtectedRoute.jsx` — wrapper que redirige según `profile.status`.
- `app/src/pages/PendingApprovalPage.jsx` — pantalla "tu acceso está en revisión".
- `app/src/pages/SuspendedPage.jsx` — pantalla "acceso suspendido".
- `app/src/lib/useAdminUsers.js` — hook con CRUD de profiles (lista + RPC).
- `app/src/components/admin/UserApproveModal.jsx` — modal con form rol+área+manager.
- `app/src/components/admin/PendingUsersPanel.jsx` — tabla de usuarios con acciones admin.
- `app/src/pages/AdminUsuariosPage.jsx` — wrapper de página que monta el panel.

**Modificados:**
- `app/src/context/AppContext.jsx` — añade `profile`, `providerToken`, `signInWithMicrosoft`, elimina `login(email,pwd)`.
- `app/src/pages/LoginPage.jsx` — reemplazado por botón único Microsoft.
- `app/src/App.jsx` — usa `ProtectedRoute`, agrega rutas `/pending`, `/suspended`, `/admin/usuarios`.
- `app/src/components/layout/Sidebar.jsx` — entrada "Admin → Usuarios" visible solo si `profile.role === 'admin'`.
- `app/src/lib/i18n.js` (es.json/en.json) — claves nuevas: `auth.signInWithMicrosoft`, `auth.pendingTitle`, `auth.pendingBody`, `auth.suspended`, `admin.usersTitle`, `admin.approve`, `admin.role`, `admin.area`, `admin.manager`.

**Fuera de alcance (otros planes):**
- Sync con Microsoft Graph (Plan 2).
- Organigrama (Plan 3).
- RLS por tabla con matriz completa + RPCs `update_my_rock_status` etc. (Plan 4).
- Dashboard personal filtrado por owner (Plan 5).

---

## Task 1 — Migración SQL: profiles + helpers + triggers + RPCs

Crear el archivo completo de migración. Se aplica como un único bloque en Supabase.

**Files:**
- Create: `app/supabase/migrations/2026_05_08_profiles_and_approval.sql`

- [ ] **Step 1.1 — Escribir el archivo de migración**

Contenido completo de `app/supabase/migrations/2026_05_08_profiles_and_approval.sql`:

```sql
-- =====================================================================
-- Migración: profiles + onboarding (Fase 1 Entra ID)
-- Fecha: 2026-05-08
-- =====================================================================

-- 1. Tabla profiles
create table if not exists public.profiles (
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

create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_role_idx   on public.profiles(role);

-- 2. Helper functions
create or replace function public.is_active_user() returns boolean as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$ language sql stable security definer;

create or replace function public.current_role_app() returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

grant execute on function public.is_active_user()  to authenticated, anon;
grant execute on function public.current_role_app() to authenticated, anon;

-- 3. Trigger handle_new_user (se dispara al insertar en auth.users)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, azure_oid, full_name, role, status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'provider_id',
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             ''),
    'pending',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Trigger guard_profile_sensitive_fields
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

drop trigger if exists profiles_guard_sensitive on public.profiles;
create trigger profiles_guard_sensitive
  before update on public.profiles
  for each row execute function public.guard_profile_sensitive_fields();

-- 5. RPCs admin
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

create or replace function public.suspend_user(target_id uuid)
returns void as $$
begin
  if public.current_role_app() <> 'admin' then
    raise exception 'Only admins can suspend users';
  end if;
  update public.profiles
     set status = 'suspended', updated_at = now()
   where id = target_id;
end;
$$ language plpgsql security definer;

create or replace function public.reactivate_user(target_id uuid)
returns void as $$
begin
  if public.current_role_app() <> 'admin' then
    raise exception 'Only admins can reactivate users';
  end if;
  update public.profiles
     set status = 'active', updated_at = now()
   where id = target_id;
end;
$$ language plpgsql security definer;

create or replace function public.change_user_role(target_id uuid, new_role text)
returns void as $$
begin
  if public.current_role_app() <> 'admin' then
    raise exception 'Only admins can change roles';
  end if;
  if new_role not in ('viewer','area_manager','cross_leader','admin') then
    raise exception 'Invalid role';
  end if;
  update public.profiles
     set role = new_role, updated_at = now()
   where id = target_id;
end;
$$ language plpgsql security definer;

grant execute on function public.approve_user(uuid, text, text, uuid) to authenticated;
grant execute on function public.suspend_user(uuid)                    to authenticated;
grant execute on function public.reactivate_user(uuid)                 to authenticated;
grant execute on function public.change_user_role(uuid, text)          to authenticated;

-- 6. RLS de profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles_read"        on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;

create policy "profiles_read"
  on public.profiles for select
  using (public.is_active_user() or id = auth.uid());

create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid() or public.current_role_app() = 'admin')
  with check (id = auth.uid() or public.current_role_app() = 'admin');

-- (No insert/delete policies: las inserciones solo vía trigger handle_new_user (security definer)
-- y la eliminación solo por cascada cuando se borra auth.users.)

-- 7. Vincular tabla people con profiles (preparación para Plan 4)
alter table public.people
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

-- Match existente por email (no-op cuando no hay matches; idempotente)
update public.people p
   set profile_id = pr.id
  from public.profiles pr
 where p.email = pr.email
   and p.email <> ''
   and p.profile_id is null;
```

- [ ] **Step 1.2 — Verificación previa: query de prueba que debe FALLAR antes de aplicar**

Conectar a Supabase SQL Editor del proyecto `zbjwasufengayvmutypr`. Ejecutar:

```sql
select 1 from public.profiles limit 1;
```

Esperado: error `relation "public.profiles" does not exist`. Si la tabla ya existe, alguien aplicó algo previo — revisar antes de continuar.

- [ ] **Step 1.3 — Aplicar la migración**

Copiar el contenido de `app/supabase/migrations/2026_05_08_profiles_and_approval.sql` y pegarlo en Supabase SQL Editor. Click **Run**.

Esperado: "Success. No rows returned." Sin errores.

- [ ] **Step 1.4 — Verificación post-aplicación: estructura**

En SQL Editor:

```sql
-- Tabla existe con columnas correctas
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;
```

Esperado: 17 filas con id, email, full_name, role, status, area, manager_id, azure_oid, photo_url, job_title, phone, locked_fields, approved_at, approved_by, last_synced_at, created_at, updated_at.

```sql
-- Funciones existen
select proname from pg_proc
where proname in (
  'is_active_user','current_role_app','handle_new_user',
  'guard_profile_sensitive_fields','approve_user',
  'suspend_user','reactivate_user','change_user_role'
);
```

Esperado: 8 filas.

```sql
-- Triggers en su lugar
select tgname, tgrelid::regclass
from pg_trigger
where tgname in ('on_auth_user_created','profiles_guard_sensitive');
```

Esperado: 2 filas.

- [ ] **Step 1.5 — Sembrar manualmente el primer admin (CEO)**

Como aún no hay flujo de Microsoft sign-in funcionando, el primer admin se siembra a mano para poder aprobar a los siguientes. **Esto se hace UNA sola vez.**

Primero, en Supabase Dashboard → Authentication → Users → "Add user" → "Send invitation" — invitar a `<email-CEO>@icconstructora.com` con magic link, o crear con email/password temporal.

Después, en SQL Editor (reemplaza el email con el real del CEO):

```sql
update public.profiles
   set role = 'admin',
       status = 'active',
       full_name = 'Juan Paulo McAllister',
       area = 'Dirección',
       approved_at = now()
 where email = '<email-CEO>@icconstructora.com';

-- Verificar
select id, email, role, status from public.profiles;
```

Esperado: 1 fila con role='admin' y status='active'.

**Nota:** una vez Microsoft sign-in funcione, este usuario inicial puede borrarse y rehacerse vía login real si se prefiere. Pero el rol admin debe propagarse al nuevo profile.

- [ ] **Step 1.6 — Commit**

```bash
git add app/supabase/migrations/2026_05_08_profiles_and_approval.sql
git commit -m "feat(db): profiles table + approval RPCs + auth triggers (fase 1 Entra)"
```

---

## Task 2 — Helper de permisos mínimo

**Files:**
- Create: `app/src/lib/permissions.js`

- [ ] **Step 2.1 — Crear helper**

Contenido de `app/src/lib/permissions.js`:

```js
// src/lib/permissions.js
// Helper central de permisos. Versión Fase 1: solo discrimina admin vs no-admin.
// La matriz completa (viewer/area_manager/cross_leader vs recurso/acción) llega en Plan 4.

export function isActive(profile) {
  return !!profile && profile.status === 'active';
}

export function isAdmin(profile) {
  return isActive(profile) && profile.role === 'admin';
}

export function isPending(profile) {
  return !!profile && profile.status === 'pending';
}

export function isSuspended(profile) {
  return !!profile && profile.status === 'suspended';
}

// Stub para Fase 4. Por ahora cualquier usuario activo puede leer/editar.
export function can(profile, _action, _resource) {
  return isActive(profile);
}
```

- [ ] **Step 2.2 — Commit**

```bash
git add app/src/lib/permissions.js
git commit -m "feat(auth): permissions helper module (admin/active/pending/suspended)"
```

---

## Task 3 — AppContext: profile + providerToken + signInWithMicrosoft

**Files:**
- Modify: `app/src/context/AppContext.jsx`

- [ ] **Step 3.1 — Reemplazar contenido completo de AppContext.jsx**

Contenido nuevo de `app/src/context/AppContext.jsx`:

```jsx
// src/context/AppContext.jsx
// Global app state: auth, profile, VTO, demo mode, language.
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { isAdmin } from '../lib/permissions'

const AppContext = createContext(null)

const DEMO_USER = {
  id: 'demo-user',
  email: 'admin@icconstructora.com',
}

const DEMO_PROFILE = {
  id: 'demo-user',
  email: 'admin@icconstructora.com',
  full_name: 'Admin IC',
  role: 'admin',
  status: 'active',
  area: 'Dirección',
}

const DEMO_VTO = {
  core_values: ['Integridad', 'Excelencia', 'Compromiso', 'Innovación', 'Trabajo en Equipo'],
  core_focus: 'Construir el futuro de la infraestructura con calidad y confianza.',
  niche: 'La constructora de mayor confianza para proyectos industriales en la región.',
  ten_year_target: '',
  marketing_strategy: '',
  three_year_picture: '',
  one_year_plan: '',
  quarterly_rocks_text: '',
  is_complete: false,
}

export function AppProvider({ children }) {
  const [user, setUser]                   = useState(null)
  const [profile, setProfile]             = useState(null)
  const [providerToken, setProviderToken] = useState(null)
  const [loading, setLoading]             = useState(true)
  const [vto, setVto]                     = useState(null)
  const [isDemoMode, setIsDemoMode]       = useState(false)
  const [lang, setLang]                   = useState('es')

  const isSupabaseConfigured = !!(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  )

  useEffect(() => {
    async function initAuth() {
      try {
        if (!isSupabaseConfigured || !supabase) {
          throw new Error('Supabase not configured')
        }

        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        setUser(session?.user ?? null)
        setProviderToken(session?.provider_token ?? null)

        if (session?.user) {
          await loadProfile(session.user.id)
        }
      } catch (err) {
        console.warn('EOS App: Starting in Demo Mode due to:', err.message)
        setIsDemoMode(true)
        setUser(DEMO_USER)
        setProfile(DEMO_PROFILE)
        setVto(DEMO_VTO)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          setUser(session?.user ?? null)
          setProviderToken(session?.provider_token ?? null)
          if (session?.user) {
            await loadProfile(session.user.id)
          } else {
            setProfile(null)
          }
        }
      )
      return () => subscription.unsubscribe()
    }
  }, [isSupabaseConfigured])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('Error loading profile:', error)
      setProfile(null)
      return
    }
    setProfile(data)
  }

  // Load VTO when user becomes active
  useEffect(() => {
    if (user && profile?.status === 'active' && isSupabaseConfigured) {
      loadVTO()
    }
  }, [user, profile?.status])

  async function loadVTO() {
    if (!isSupabaseConfigured) return
    const { data } = await supabase
      .from('vto')
      .select('*')
      .eq('company_id', 'ic-constructora')
      .single()
    if (data) setVto(data)
  }

  async function saveVTO(vtoData) {
    if (isDemoMode) {
      setVto(prev => ({ ...prev, ...vtoData }))
      return { success: true }
    }
    const { error } = await supabase
      .from('vto')
      .upsert({ ...vtoData, company_id: 'ic-constructora' })
    if (!error) await loadVTO()
    return { success: !error, error }
  }

  async function signInWithMicrosoft() {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'openid profile email User.Read User.Read.All offline_access',
        redirectTo: window.location.origin,
      },
    })
    return { error }
  }

  async function logout() {
    if (!isDemoMode && supabase) await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setProviderToken(null)
  }

  const value = {
    user,
    profile,
    providerToken,
    loading,
    vto,
    setVto,
    saveVTO,
    signInWithMicrosoft,
    logout,
    isDemoMode,
    lang,
    setLang,
    isSupabaseConfigured,
    // Derived
    isAdmin: isAdmin(profile) || isDemoMode,
    displayName: profile?.full_name || user?.email?.split('@')[0] || 'Usuario',
    refreshProfile: () => user && loadProfile(user.id),
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
```

- [ ] **Step 3.2 — Smoke test: Demo Mode sigue funcionando**

```bash
cd app
# Borrar VITE_SUPABASE_* del .env temporalmente o renombrarlas
mv .env .env.backup
npm run dev
```

Abrir `http://localhost:5173`. Esperado:
- Loading rápido.
- Aparece la app principal (Dashboard) sin pasar por LoginPage (porque DEMO_USER queda activo).
- En consola: warning "EOS App: Starting in Demo Mode".

Restaurar:

```bash
mv .env.backup .env
```

- [ ] **Step 3.3 — Commit**

```bash
git add app/src/context/AppContext.jsx
git commit -m "feat(auth): replace email/password with signInWithMicrosoft + profile state"
```

---

## Task 4 — LoginPage con botón Microsoft único

**Files:**
- Modify: `app/src/pages/LoginPage.jsx`

- [ ] **Step 4.1 — Reemplazar contenido completo**

Contenido nuevo de `app/src/pages/LoginPage.jsx`:

```jsx
// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useApp } from '../context/AppContext'

// SVG inline del logo Microsoft (4 cuadritos rojo/verde/azul/amarillo)
function MicrosoftLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
      <rect x="1"  y="1"  width="10" height="10" fill="#F25022" />
      <rect x="12" y="1"  width="10" height="10" fill="#7FBA00" />
      <rect x="1"  y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  )
}

export default function LoginPage() {
  const { signInWithMicrosoft, isDemoMode } = useApp()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setLoading(true)
    setError('')
    const { error: err } = await signInWithMicrosoft()
    if (err) {
      setError(err.message || 'No fue posible iniciar sesión.')
      setLoading(false)
    }
    // En éxito el navegador redirige a Entra y vuelve; no apagamos loading.
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 'var(--space-4)',
    }}>
      <div className="card-glass" style={{ width: '100%', maxWidth: 420, padding: 'var(--space-10)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div className="sidebar-logo-icon" style={{ margin: '0 auto var(--space-4)', width: 64, height: 64, fontSize: '2rem' }}>
            🏗️
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Tracción</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Sistema EOS de IC Constructora
          </p>
        </div>

        {isDemoMode && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid var(--status-warning, #f59e0b)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-6)',
            color: 'var(--status-warning, #f59e0b)',
            fontSize: '0.85rem',
          }}>
            Modo demo activo — datos no persistentes.
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--status-error)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-6)',
            color: 'var(--status-error)',
            fontSize: '0.85rem',
          }}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="btn"
          style={{
            width: '100%',
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: '#fff',
            color: '#5e5e5e',
            border: '1px solid #8c8c8c',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          <MicrosoftLogo size={20} />
          {loading ? 'Conectando con Microsoft...' : 'Iniciar sesión con Microsoft'}
        </button>

        <p style={{ marginTop: 'var(--space-6)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Solo cuentas <strong>@icconstructora.com</strong>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4.2 — Smoke test: aparece la pantalla**

Asegúrate que `app/.env` tiene las variables Supabase configuradas. Luego:

```bash
cd app && npm run dev
```

Abrir `http://localhost:5173`. Esperado:
- Pantalla de login con logo Tracción y un solo botón blanco con logo de Microsoft.
- Al hacer click → redirige a `login.microsoftonline.com`.

NO completes el login todavía (lo haremos en Task 8 después de tener PendingApprovalPage).

- [ ] **Step 4.3 — Commit**

```bash
git add app/src/pages/LoginPage.jsx
git commit -m "feat(auth): replace login form with single Microsoft sign-in button"
```

---

## Task 5 — Pantallas Pending y Suspended

**Files:**
- Create: `app/src/pages/PendingApprovalPage.jsx`
- Create: `app/src/pages/SuspendedPage.jsx`

- [ ] **Step 5.1 — Crear PendingApprovalPage**

Contenido de `app/src/pages/PendingApprovalPage.jsx`:

```jsx
// src/pages/PendingApprovalPage.jsx
import { useApp } from '../context/AppContext'
import { Clock, LogOut } from 'lucide-react'

export default function PendingApprovalPage() {
  const { profile, logout } = useApp()

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 'var(--space-4)',
    }}>
      <div className="card-glass" style={{ width: '100%', maxWidth: 480, padding: 'var(--space-10)', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto var(--space-6)',
          color: '#f59e0b',
        }}>
          <Clock size={32} />
        </div>

        <h1 style={{ fontSize: '1.4rem', marginBottom: 'var(--space-3)' }}>
          Hola{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h1>

        <p style={{ color: 'var(--text-secondary, var(--text-primary))', marginBottom: 'var(--space-3)' }}>
          Tu acceso a Tracción está en revisión.
        </p>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-8)', lineHeight: 1.5 }}>
          Hemos creado tu perfil con la información de tu cuenta corporativa.
          Un administrador debe asignarte un rol y un área antes de que puedas usar la aplicación.
          Esto suele tomar menos de 24 horas.
        </p>

        <button
          type="button"
          onClick={logout}
          className="btn btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5.2 — Crear SuspendedPage**

Contenido de `app/src/pages/SuspendedPage.jsx`:

```jsx
// src/pages/SuspendedPage.jsx
import { useApp } from '../context/AppContext'
import { Ban, LogOut } from 'lucide-react'

export default function SuspendedPage() {
  const { logout } = useApp()

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 'var(--space-4)',
    }}>
      <div className="card-glass" style={{ width: '100%', maxWidth: 480, padding: 'var(--space-10)', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto var(--space-6)',
          color: 'var(--status-error)',
        }}>
          <Ban size={32} />
        </div>

        <h1 style={{ fontSize: '1.4rem', marginBottom: 'var(--space-3)' }}>Acceso suspendido</h1>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-8)', lineHeight: 1.5 }}>
          Tu acceso a Tracción ha sido suspendido por un administrador.
          Si crees que es un error, contacta al equipo de TI.
        </p>

        <button
          type="button"
          onClick={logout}
          className="btn btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5.3 — Commit**

```bash
git add app/src/pages/PendingApprovalPage.jsx app/src/pages/SuspendedPage.jsx
git commit -m "feat(auth): pending approval and suspended pages"
```

---

## Task 6 — ProtectedRoute + integración en App.jsx

**Files:**
- Create: `app/src/components/auth/ProtectedRoute.jsx`
- Modify: `app/src/App.jsx`

- [ ] **Step 6.1 — Crear ProtectedRoute**

Contenido de `app/src/components/auth/ProtectedRoute.jsx`:

```jsx
// src/components/auth/ProtectedRoute.jsx
import { useApp } from '../../context/AppContext'
import { isAdmin } from '../../lib/permissions'
import LoginPage from '../../pages/LoginPage'
import PendingApprovalPage from '../../pages/PendingApprovalPage'
import SuspendedPage from '../../pages/SuspendedPage'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, loading, isDemoMode } = useApp()

  if (loading) return null

  if (!user) return <LoginPage />

  // Demo Mode bypasses todo (DEMO_PROFILE ya tiene status='active' role='admin')
  if (!isDemoMode) {
    if (!profile)                       return <PendingApprovalPage />
    if (profile.status === 'pending')   return <PendingApprovalPage />
    if (profile.status === 'suspended') return <SuspendedPage />
  }

  if (requireAdmin && !isAdmin(profile) && !isDemoMode) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <h2>Acceso denegado</h2>
        <p>Esta sección requiere rol de administrador.</p>
      </div>
    )
  }

  return children
}
```

- [ ] **Step 6.2 — Reemplazar App.jsx**

Contenido nuevo de `app/src/App.jsx`:

```jsx
// src/App.jsx — App shell: auth guard, layout, routes
import { useState, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import ProtectedRoute from './components/auth/ProtectedRoute'

import Sidebar from './components/layout/Sidebar'
import TopHeader from './components/layout/TopHeader'

const DashboardPage      = lazy(() => import('./pages/DashboardPage'))
const VisionPage         = lazy(() => import('./pages/VisionPage'))
const PersonasPage       = lazy(() => import('./pages/PersonasPage'))
const DatosPage          = lazy(() => import('./pages/DatosPage'))
const AsuntosPage        = lazy(() => import('./pages/AsuntosPage'))
const ProcesosPage       = lazy(() => import('./pages/ProcesosPage'))
const TraccionPage       = lazy(() => import('./pages/TraccionPage'))
const ReunionesPage      = lazy(() => import('./pages/ReunionesPage'))
const ConfiguracionPage  = lazy(() => import('./pages/ConfiguracionPage'))
const ImplementacionPage = lazy(() => import('./pages/ImplementacionPage'))
const BibliotecaPage     = lazy(() => import('./pages/BibliotecaPage'))
const RRHHPage           = lazy(() => import('./pages/RRHHPage'))
const LotesPage          = lazy(() => import('./pages/LotesPage'))
const JuridicoPage       = lazy(() => import('./pages/JuridicoPage'))
const AdminUsuariosPage  = lazy(() => import('./pages/AdminUsuariosPage'))

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid var(--border-medium)',
        borderTopColor: 'var(--brand-primary)',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 90,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <TopHeader onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className="page-content fade-in">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/"               element={<DashboardPage />} />
              <Route path="/vision"         element={<VisionPage />} />
              <Route path="/personas"       element={<PersonasPage />} />
              <Route path="/datos"          element={<DatosPage />} />
              <Route path="/asuntos"        element={<AsuntosPage />} />
              <Route path="/procesos"       element={<ProcesosPage />} />
              <Route path="/traccion"       element={<TraccionPage />} />
              <Route path="/reuniones"      element={<ReunionesPage />} />
              <Route path="/configuracion"  element={<ConfiguracionPage />} />
              <Route path="/implementacion" element={<ImplementacionPage />} />
              <Route path="/biblioteca"     element={<BibliotecaPage />} />
              <Route path="/rrhh"           element={<RRHHPage />} />
              <Route path="/lotes"          element={<LotesPage />} />
              <Route path="/juridico"       element={<JuridicoPage />} />
              <Route
                path="/admin/usuarios"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminUsuariosPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const { loading } = useApp()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg-base)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid var(--border-medium)',
            borderTopColor: 'var(--brand-primary)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  )
}
```

- [ ] **Step 6.3 — Smoke test sin login**

Asegurar que `app/.env` SÍ tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Borrar la sesión actual (DevTools → Application → Cookies → eliminar todas las del dominio localhost; también localStorage `sb-*`).

```bash
cd app && npm run dev
```

Abrir `http://localhost:5173`. Esperado: aparece LoginPage (porque no hay user). Sin error en consola.

- [ ] **Step 6.4 — Commit**

```bash
git add app/src/components/auth/ProtectedRoute.jsx app/src/App.jsx
git commit -m "feat(auth): ProtectedRoute guards based on profile.status"
```

---

## Task 7 — Hook useAdminUsers + componentes admin

**Files:**
- Create: `app/src/lib/useAdminUsers.js`
- Create: `app/src/components/admin/UserApproveModal.jsx`
- Create: `app/src/components/admin/PendingUsersPanel.jsx`
- Create: `app/src/pages/AdminUsuariosPage.jsx`

- [ ] **Step 7.1 — Crear useAdminUsers**

Contenido de `app/src/lib/useAdminUsers.js`:

```js
// src/lib/useAdminUsers.js
import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

export function useAdminUsers() {
  const { isDemoMode } = useApp()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    if (isDemoMode || !supabase) {
      setUsers([
        { id: 'demo-1', email: 'pending1@icconstructora.com', full_name: 'Pendiente Demo 1', role: 'pending', status: 'pending', area: '' },
        { id: 'demo-2', email: 'active1@icconstructora.com',  full_name: 'Activo Demo 1',    role: 'viewer',  status: 'active',  area: 'Operaciones' },
      ])
      setLoading(false)
      return
    }
    const { data, error: err } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError(err)
    else setUsers(data || [])
    setLoading(false)
  }, [isDemoMode])

  useEffect(() => { load() }, [load])

  async function approveUser({ targetId, role, area, managerId }) {
    if (isDemoMode || !supabase) {
      setUsers(prev => prev.map(u => u.id === targetId
        ? { ...u, role, area, status: 'active', manager_id: managerId }
        : u))
      return { error: null }
    }
    const { error: err } = await supabase.rpc('approve_user', {
      target_id: targetId,
      new_role: role,
      new_area: area,
      new_manager: managerId,
    })
    if (!err) await load()
    return { error: err }
  }

  async function suspendUser(targetId) {
    if (isDemoMode || !supabase) {
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, status: 'suspended' } : u))
      return { error: null }
    }
    const { error: err } = await supabase.rpc('suspend_user', { target_id: targetId })
    if (!err) await load()
    return { error: err }
  }

  async function reactivateUser(targetId) {
    if (isDemoMode || !supabase) {
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, status: 'active' } : u))
      return { error: null }
    }
    const { error: err } = await supabase.rpc('reactivate_user', { target_id: targetId })
    if (!err) await load()
    return { error: err }
  }

  async function changeUserRole(targetId, newRole) {
    if (isDemoMode || !supabase) {
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, role: newRole } : u))
      return { error: null }
    }
    const { error: err } = await supabase.rpc('change_user_role', {
      target_id: targetId,
      new_role: newRole,
    })
    if (!err) await load()
    return { error: err }
  }

  return { users, loading, error, reload: load, approveUser, suspendUser, reactivateUser, changeUserRole }
}
```

- [ ] **Step 7.2 — Crear UserApproveModal**

Contenido de `app/src/components/admin/UserApproveModal.jsx`:

```jsx
// src/components/admin/UserApproveModal.jsx
import { useState } from 'react'

const ROLES = [
  { value: 'viewer',        label: 'Visualizador' },
  { value: 'area_manager',  label: 'Gerente de Área' },
  { value: 'cross_leader',  label: 'Líder Transversal' },
  { value: 'admin',         label: 'Admin' },
]

const AREAS = [
  'Dirección', 'Experiencia', 'Construcción', 'Financiero',
  'Talento Humano', 'Control', 'Jurídico', 'TI', 'Desarrollo', 'Otra',
]

export default function UserApproveModal({ user, candidates, onClose, onSubmit }) {
  const [role, setRole]           = useState(user?.role !== 'pending' ? user.role : 'viewer')
  const [area, setArea]           = useState(user?.area || 'Operaciones')
  const [managerId, setManagerId] = useState(user?.manager_id || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const { error: err } = await onSubmit({
      targetId: user.id,
      role,
      area,
      managerId: managerId || null,
    })
    setSubmitting(false)
    if (err) setError(err.message || 'Error al aprobar')
    else onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, padding: 'var(--space-6)' }}>
        <h2 style={{ marginBottom: 'var(--space-2)' }}>Aprobar usuario</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-6)' }}>
          {user.email}
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-error)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)',
            color: 'var(--status-error)', fontSize: '0.85rem',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Rol</label>
            <select className="input" value={role} onChange={e => setRole(e.target.value)} required>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Área</label>
            <select className="input" value={area} onChange={e => setArea(e.target.value)} required>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Manager directo</label>
            <select className="input" value={managerId} onChange={e => setManagerId(e.target.value)}>
              <option value="">— sin manager —</option>
              {candidates
                .filter(c => c.id !== user.id && c.status === 'active')
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || c.email} {c.area ? `(${c.area})` : ''}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Aprobando...' : 'Aprobar y activar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 7.3 — Crear PendingUsersPanel**

Contenido de `app/src/components/admin/PendingUsersPanel.jsx`:

```jsx
// src/components/admin/PendingUsersPanel.jsx
import { useState, useMemo } from 'react'
import { useAdminUsers } from '../../lib/useAdminUsers'
import UserApproveModal from './UserApproveModal'
import { CheckCircle2, Ban, RotateCcw, UserCog } from 'lucide-react'

const STATUS_FILTERS = [
  { value: 'pending',   label: 'Pendientes' },
  { value: 'active',    label: 'Activos' },
  { value: 'suspended', label: 'Suspendidos' },
  { value: 'all',       label: 'Todos' },
]

const ROLE_LABELS = {
  pending:       'Pendiente',
  viewer:        'Visualizador',
  area_manager:  'Gerente de Área',
  cross_leader:  'Líder Transversal',
  admin:         'Admin',
}

export default function PendingUsersPanel() {
  const { users, loading, error, approveUser, suspendUser, reactivateUser, changeUserRole } = useAdminUsers()
  const [statusFilter, setStatusFilter] = useState('pending')
  const [search, setSearch]             = useState('')
  const [modalUser, setModalUser]       = useState(null)

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false
      const q = search.trim().toLowerCase()
      if (q && !u.email.toLowerCase().includes(q) && !(u.full_name || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [users, statusFilter, search])

  if (loading) return <p>Cargando usuarios…</p>
  if (error)   return <p style={{ color: 'var(--status-error)' }}>Error: {error.message}</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, flex: 1 }}>Usuarios</h1>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
        <select className="input" style={{ maxWidth: 220 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <input
          className="input"
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated, transparent)', textAlign: 'left' }}>
              <th style={{ padding: 'var(--space-3)' }}>Nombre</th>
              <th style={{ padding: 'var(--space-3)' }}>Email</th>
              <th style={{ padding: 'var(--space-3)' }}>Rol</th>
              <th style={{ padding: 'var(--space-3)' }}>Área</th>
              <th style={{ padding: 'var(--space-3)' }}>Estado</th>
              <th style={{ padding: 'var(--space-3)' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>Sin usuarios.</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} style={{ borderTop: '1px solid var(--border-medium)' }}>
                <td style={{ padding: 'var(--space-3)' }}>{u.full_name || '—'}</td>
                <td style={{ padding: 'var(--space-3)', fontSize: '0.85rem' }}>{u.email}</td>
                <td style={{ padding: 'var(--space-3)' }}>{ROLE_LABELS[u.role]}</td>
                <td style={{ padding: 'var(--space-3)' }}>{u.area || '—'}</td>
                <td style={{ padding: 'var(--space-3)' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 999, fontSize: '0.75rem',
                    background: u.status === 'pending'   ? 'rgba(245,158,11,0.15)'
                              : u.status === 'active'    ? 'rgba(16,185,129,0.15)'
                              :                            'rgba(239,68,68,0.15)',
                    color:      u.status === 'pending'   ? '#f59e0b'
                              : u.status === 'active'    ? '#10b981'
                              :                            'var(--status-error)',
                  }}>{u.status}</span>
                </td>
                <td style={{ padding: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {u.status === 'pending' && (
                      <button className="btn btn-sm btn-primary" onClick={() => setModalUser(u)}>
                        <CheckCircle2 size={14} /> Aprobar
                      </button>
                    )}
                    {u.status === 'active' && (
                      <>
                        <button className="btn btn-sm btn-ghost" onClick={() => setModalUser(u)} title="Editar rol/área">
                          <UserCog size={14} />
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => suspendUser(u.id)} title="Suspender">
                          <Ban size={14} />
                        </button>
                      </>
                    )}
                    {u.status === 'suspended' && (
                      <button className="btn btn-sm btn-ghost" onClick={() => reactivateUser(u.id)} title="Reactivar">
                        <RotateCcw size={14} /> Reactivar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalUser && (
        <UserApproveModal
          user={modalUser}
          candidates={users}
          onClose={() => setModalUser(null)}
          onSubmit={async (payload) => {
            // Si el usuario ya estaba activo, solo cambia el rol; si era pending o suspended, full approve.
            if (modalUser.status === 'active') {
              return await changeUserRole(modalUser.id, payload.role)
            }
            return await approveUser(payload)
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 7.4 — Crear AdminUsuariosPage wrapper**

Contenido de `app/src/pages/AdminUsuariosPage.jsx`:

```jsx
// src/pages/AdminUsuariosPage.jsx
import PendingUsersPanel from '../components/admin/PendingUsersPanel'

export default function AdminUsuariosPage() {
  return <PendingUsersPanel />
}
```

- [ ] **Step 7.5 — Smoke test en Demo Mode**

Mover `.env` a `.env.backup` para forzar Demo Mode. `npm run dev`. Navegar manualmente a `http://localhost:5173/admin/usuarios`. Esperado: ver tabla con dos usuarios mock (uno pending, uno active). Click "Aprobar" en el pending → modal abre con dropdowns de rol/área/manager. Submit → tabla se actualiza, status pasa a "active". Restaurar `.env`.

- [ ] **Step 7.6 — Commit**

```bash
git add app/src/lib/useAdminUsers.js app/src/components/admin/UserApproveModal.jsx app/src/components/admin/PendingUsersPanel.jsx app/src/pages/AdminUsuariosPage.jsx
git commit -m "feat(admin): users panel with approve/suspend/reactivate/change-role"
```

---

## Task 8 — Sidebar: entrada admin gated

**Files:**
- Modify: `app/src/components/layout/Sidebar.jsx`

Sidebar.jsx usa `NavLink` individuales (no un array `NAV_ITEMS`). Insertaremos una nueva sección "Administración" justo antes de "Herramientas", visible solo a admins.

- [ ] **Step 8.1 — Añadir import de `UserCog` y de helpers**

En `app/src/components/layout/Sidebar.jsx`, modificar la línea de imports de `lucide-react` (línea 5-9) para incluir `UserCog`:

```jsx
import {
  LayoutDashboard, Eye, Users, BarChart3, AlertTriangle,
  Settings2, Rocket, CalendarDays, Settings, LogOut, Globe,
  Map, BookOpen, UserCheck, Building, Scale, TrendingUp, ScanLine, ExternalLink, UserCog
} from 'lucide-react'
```

Añadir el import de `isAdmin` (no requiere cambios al import de `useApp`, ya está):

```jsx
import { isAdmin } from '../../lib/permissions'
```

- [ ] **Step 8.2 — Exponer profile desde useApp**

Modificar la línea actual:

```jsx
const { logout, displayName, isDemoMode } = useApp()
```

a:

```jsx
const { logout, displayName, isDemoMode, profile } = useApp()
const showAdmin = isDemoMode || isAdmin(profile)
```

- [ ] **Step 8.3 — Insertar sección Administración condicional**

Justo ANTES del bloque que abre la sección "Herramientas" (línea 144 aproximadamente, donde está el `<div>` con `Herramientas` en su contenido), insertar:

```jsx
{showAdmin && (
  <>
    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: 'var(--space-3) var(--space-4) var(--space-1)', marginTop: 'var(--space-2)' }}>
      Administración
    </div>

    <NavLink
      to="/admin/usuarios"
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      onClick={handleNavClick}
    >
      <UserCog size={18} className="nav-item-icon" style={{ color: 'var(--brand-primary)' }} />
      Usuarios
    </NavLink>
  </>
)}

{/* Herramientas externas */}
```

(El comentario `{/* Herramientas externas */}` es el que ya existía; queda inmediatamente después del bloque insertado.)

- [ ] **Step 8.3 — Smoke test**

`npm run dev` con `.env` real. Login con cuenta admin existente (sembrada en Task 1.5). Esperado: aparece "Admin · Usuarios" en el sidebar y abre `/admin/usuarios` correctamente.

Logout. Crear o usar una cuenta no-admin. Esperado: NO aparece la entrada en el sidebar.

- [ ] **Step 8.4 — Commit**

```bash
git add app/src/components/layout/Sidebar.jsx
git commit -m "feat(layout): show Admin · Users link only for admins"
```

---

## Task 9 — Verificación E2E manual del flujo completo

Esta tarea es de prueba, no produce código.

- [ ] **Step 9.1 — Preparar entorno limpio**

```bash
cd app
# Asegurar que .env tiene VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY apuntando al proyecto correcto
cat .env | grep VITE_SUPABASE
npm install
npm run dev
```

Esperado: dev server arriba en `http://localhost:5173`.

- [ ] **Step 9.2 — Test 1: primer login crea profile pending**

Con una cuenta @icconstructora.com **distinta** a la del admin sembrado (idealmente una cuenta de prueba sin uso previo en el proyecto), abrir `http://localhost:5173` en una ventana incógnito.

1. Click "Iniciar sesión con Microsoft".
2. Completar flujo en login.microsoftonline.com.
3. Volver a la app.

Esperado: ves la `PendingApprovalPage` con tu nombre y mensaje de "tu acceso está en revisión".

En SQL Editor de Supabase:

```sql
select id, email, full_name, role, status, azure_oid, created_at
from public.profiles
where email = '<tu-email-de-prueba>'
order by created_at desc;
```

Esperado: 1 fila con `role='pending'`, `status='pending'`, `azure_oid` no nulo.

**Si `azure_oid` aparece NULL:** el campo en `raw_user_meta_data` no es `provider_id`. Ajustar Task 1 — abrir SQL Editor y ejecutar:

```sql
select raw_user_meta_data
from auth.users
where email = '<tu-email-de-prueba>';
```

Identificar la clave que contiene el Object ID de Entra (típicamente uno de: `provider_id`, `sub`, `oid`). Re-aplicar `handle_new_user` cambiando `'provider_id'` por la clave correcta. Documentar el cambio en una nota al final del spec.

- [ ] **Step 9.3 — Test 2: admin aprueba al pending**

Logout (botón en PendingApprovalPage). Login con la cuenta admin sembrada en Task 1.5.

Navegar a `/admin/usuarios`. Esperado: ves la cuenta de prueba con estado "pending".

Click "Aprobar". En el modal: rol=Visualizador, área=Operaciones (o cualquiera), manager=admin. Submit.

Esperado: modal cierra, fila pasa a estado "active", rol "Visualizador".

En SQL Editor:

```sql
select email, role, status, area, approved_at, approved_by
from public.profiles
where email = '<tu-email-de-prueba>';
```

Esperado: `role='viewer'`, `status='active'`, `approved_at` con timestamp reciente, `approved_by` igual al id del admin.

- [ ] **Step 9.4 — Test 3: usuario aprobado entra a la app**

Logout admin. Login con la cuenta de prueba aprobada.

Esperado: ya NO ves PendingApprovalPage; entras al Dashboard normal de Tracción.

- [ ] **Step 9.5 — Test 4: usuario no-admin NO ve admin panel**

Con la cuenta de prueba (rol viewer) logueada, intentar:
- Verificar que en el sidebar NO aparece "Admin · Usuarios".
- Navegar manualmente a `http://localhost:5173/admin/usuarios`. Esperado: pantalla "Acceso denegado" (porque ProtectedRoute con requireAdmin valida).

- [ ] **Step 9.6 — Test 5: suspensión funciona**

Logout. Login admin. En `/admin/usuarios`, click ícono de Ban en la cuenta de prueba (suspender).

Logout admin. Login con la cuenta de prueba.

Esperado: ves SuspendedPage, no entras a la app.

Logout. Login admin. Click "Reactivar". Logout admin. Login cuenta de prueba. Esperado: vuelves a entrar al Dashboard.

- [ ] **Step 9.7 — Test 6: Demo Mode sigue funcionando**

```bash
mv .env .env.backup
npm run dev
```

Abrir `http://localhost:5173`. Esperado: entras directo a Dashboard sin login (DEMO_USER + DEMO_PROFILE), sidebar muestra "Admin · Usuarios" porque DEMO_PROFILE.role='admin'.

```bash
mv .env.backup .env
```

- [ ] **Step 9.8 — Documentar resultados**

Crear un comentario en el plan o un breve resumen con resultados pass/fail de cada test. Si algún test falla, no continuar hasta resolver.

---

## Task 10 — Cierre: lint, build, commit final

- [ ] **Step 10.1 — Lint**

```bash
cd app
npm run lint
```

Esperado: 0 errors. Si hay warnings que tu cambio introdujo, arreglarlos.

- [ ] **Step 10.2 — Build de producción**

```bash
npm run build
```

Esperado: build sin errores. Verificar en consola que no haya warnings de imports rotos o lazy chunks fallidos.

- [ ] **Step 10.3 — Commit del documento de plan ejecutado**

```bash
git add docs/superpowers/specs/2026-05-07-entra-id-integration-design.md docs/superpowers/plans/2026-05-08-entra-id-auth-fase1.md
git commit -m "docs: spec + plan fase 1 integración Entra ID"
```

(Si ya estaban commiteados antes, este paso se omite.)

- [ ] **Step 10.4 — Tag opcional**

```bash
git tag fase1-auth-entra-completa
```

---

## Criterio de "hecho" para Fase 1

- ✅ Cualquier empleado @icconstructora.com puede iniciar sesión con Microsoft.
- ✅ Un primer login crea un profile en estado `pending`.
- ✅ Usuarios pending ven `PendingApprovalPage` y no acceden a otras rutas.
- ✅ Un admin puede aprobar usuarios y asignarles rol+área+manager desde `/admin/usuarios`.
- ✅ Usuarios aprobados acceden al Dashboard normal.
- ✅ Admin puede suspender/reactivar usuarios.
- ✅ Sidebar muestra "Admin · Usuarios" solo a admins.
- ✅ Demo Mode automático cuando faltan env vars de Supabase.
- ✅ Lint y build pasan limpio.

## Riesgos y mitigaciones identificados durante la implementación

| Riesgo | Mitigación |
|--------|------------|
| `raw_user_meta_data->>'provider_id'` puede estar vacío en la versión actual de Supabase Azure provider | Test 9.2 lo detecta; fix es ajustar el trigger a la clave correcta y re-aplicar |
| Usuario admin sembrado a mano puede chocar con login real posterior con misma cuenta | Borrar manualmente el profile sembrado antes del primer login real, o aceptar que el primer login update existente |
| Algún componente que aún consume `useApp().login` (email/password) rompe en build | `npm run lint` y `npm run build` deben fallar y obligar a corregir antes de pasar |
| Site URL en Supabase apunta a un dominio que no es el real → callback rompe | Verificar Site URL antes de Test 9.2; agregar todos los redirect URLs necesarios |

## Siguiente plan

Cuando esta fase esté validada, escribir `2026-XX-XX-entra-id-graph-sync.md` (Plan 2: sync con Microsoft Graph + perfiles editables).
