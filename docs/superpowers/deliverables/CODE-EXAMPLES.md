# Ejemplos de Código — Fase 1 Autenticación Entra ID

Fragmentos de código para entender cómo funciona la integración.

---

## 1. Flow de Login con Microsoft (AppContext)

```jsx
// app/src/context/AppContext.jsx

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

// Uso en LoginPage.jsx:
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
```

**¿Qué pasa?**
1. Click "Iniciar sesión con Microsoft"
2. `signInWithMicrosoft()` llama a `supabase.auth.signInWithOAuth({ provider: 'azure' })`
3. Supabase redirige a `login.microsoftonline.com` con Client ID y Redirect URL
4. Usuario autentica en Microsoft
5. Microsoft redirige a `redirectTo` (origin de la app) con código de autorización
6. Supabase canjea código por JWT
7. `onAuthStateChange` dispara con session
8. AppContext carga profile de BD
9. ProtectedRoute redirige según status del profile

---

## 2. Trigger SQL: Auto-creación de Profile

```sql
-- app/supabase/migrations/2026_05_08_profiles_and_approval.sql

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, azure_oid, full_name, role, status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'provider_id',  -- Object ID de Entra
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name',
             ''),                              -- Full name del Entra
    'pending',                                  -- Rol inicial
    'pending'                                   -- Status inicial
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Clave:** cada vez que Supabase inserta un usuario en `auth.users`, el trigger crea automáticamente un row en `profiles` con `status='pending'`.

---

## 3. RPC de Aprobación (SQL)

```sql
create or replace function public.approve_user(
  target_id   uuid,
  new_role    text,
  new_area    text,
  new_manager uuid
) returns void as $$
begin
  -- Validación: solo admin puede ejecutar
  if public.current_role_app() <> 'admin' then
    raise exception 'Only admins can approve users';
  end if;
  
  -- Validación: rol debe ser válido
  if new_role not in ('viewer','area_manager','cross_leader','admin') then
    raise exception 'Invalid role';
  end if;
  
  -- Actualización: set role, area, status=active, timestamps
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

**Seguridad:** 
- Solo ejecutable por admin (verificación en RPC, no en client)
- Valida rol antes de actualizar
- Registra quién y cuándo aprobó

---

## 4. Hook de Admin (React)

```jsx
// app/src/lib/useAdminUsers.js

export function useAdminUsers() {
  const { isDemoMode } = useApp()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    if (isDemoMode || !supabase) {
      // Demo Mode: retorna datos ficticios
      setUsers([
        { id: 'demo-1', email: 'pending@ic.com', full_name: 'Test Pending', 
          role: 'pending', status: 'pending', area: '' },
        { id: 'demo-2', email: 'active@ic.com',  full_name: 'Test Active',    
          role: 'viewer',  status: 'active',  area: 'Operaciones' },
      ])
      setLoading(false)
      return
    }

    // Prod: carga desde Supabase
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
      // Demo Mode: actualiza estado local
      setUsers(prev => prev.map(u => u.id === targetId
        ? { ...u, role, area, status: 'active', manager_id: managerId }
        : u))
      return { error: null }
    }

    // Prod: llama RPC en Supabase
    const { error: err } = await supabase.rpc('approve_user', {
      target_id: targetId,
      new_role: role,
      new_area: area,
      new_manager: managerId,
    })
    if (!err) await load()  // Recarga tabla
    return { error: err }
  }

  return { users, loading, error, reload: load, approveUser, suspendUser, ... }
}
```

**Uso en PendingUsersPanel:**
```jsx
const { users, loading, approveUser } = useAdminUsers()

// En click "Aprobar":
const { error } = await approveUser({
  targetId: user.id,
  role: 'viewer',
  area: 'Operaciones',
  managerId: managerId || null,
})
if (!error) {
  // Modal cierra, tabla se recarga automáticamente
}
```

---

## 5. ProtectedRoute: Guardias Condicionales

```jsx
// app/src/components/auth/ProtectedRoute.jsx

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, loading, isDemoMode } = useApp()

  if (loading) return null

  // Gate 1: Usuario no logueado
  if (!user) return <LoginPage />

  // Gate 2: Usuario logueado pero no activo (no es Demo Mode)
  if (!isDemoMode) {
    if (!profile)                       return <PendingApprovalPage />
    if (profile.status === 'pending')   return <PendingApprovalPage />
    if (profile.status === 'suspended') return <SuspendedPage />
  }

  // Gate 3: Requiere ser admin
  if (requireAdmin && !isAdmin(profile) && !isDemoMode) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <h2>Acceso denegado</h2>
        <p>Esta sección requiere rol de administrador.</p>
      </div>
    )
  }

  // Acceso permitido
  return children
}
```

**Uso en App.jsx:**
```jsx
// Ruta admin protegida
<Route
  path="/admin/usuarios"
  element={
    <ProtectedRoute requireAdmin>
      <AdminUsuariosPage />
    </ProtectedRoute>
  }
/>

// Ruta normal (requiere active, pero no admin)
<Route path="/vision" element={<VisionPage />} />
// Envuelta en <ProtectedRoute> global en App root
```

---

## 6. Tabla de Usuarios con Filtros

```jsx
// app/src/components/admin/PendingUsersPanel.jsx

const [statusFilter, setStatusFilter] = useState('pending')
const [search, setSearch] = useState('')

const filtered = useMemo(() => {
  return users.filter(u => {
    // Filtro por status
    if (statusFilter !== 'all' && u.status !== statusFilter) return false
    
    // Búsqueda por email o nombre
    const q = search.trim().toLowerCase()
    if (q && 
        !u.email.toLowerCase().includes(q) && 
        !(u.full_name || '').toLowerCase().includes(q)) 
      return false
    
    return true
  })
}, [users, statusFilter, search])

return (
  <>
    {/* Dropdowns de filtro */}
    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
      <option value="pending">Pendientes</option>
      <option value="active">Activos</option>
      <option value="suspended">Suspendidos</option>
      <option value="all">Todos</option>
    </select>

    <input
      placeholder="Buscar por nombre o email…"
      value={search}
      onChange={e => setSearch(e.target.value)}
    />

    {/* Tabla */}
    <table>
      <tbody>
        {filtered.map(u => (
          <tr key={u.id}>
            <td>{u.full_name}</td>
            <td>{u.email}</td>
            <td>{u.role}</td>
            <td>{u.area}</td>
            <td>{u.status}</td>
            <td>
              {u.status === 'pending' && (
                <button onClick={() => setModalUser(u)}>Aprobar</button>
              )}
              {u.status === 'active' && (
                <button onClick={() => suspendUser(u.id)}>Suspender</button>
              )}
              {u.status === 'suspended' && (
                <button onClick={() => reactivateUser(u.id)}>Reactivar</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </>
)
```

---

## 7. Modal de Aprobación

```jsx
// app/src/components/admin/UserApproveModal.jsx

const ROLES = [
  { value: 'viewer',        label: 'Visualizador' },
  { value: 'area_manager',  label: 'Gerente de Área' },
  { value: 'cross_leader',  label: 'Líder Transversal' },
  { value: 'admin',         label: 'Admin' },
]

const AREAS = ['Dirección', 'Experiencia', 'Construcción', 'Financiero', ...]

export default function UserApproveModal({ user, candidates, onSubmit, onClose }) {
  const [role, setRole] = useState('viewer')
  const [area, setArea] = useState('Operaciones')
  const [managerId, setManagerId] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await onSubmit({
      targetId: user.id,
      role,
      area,
      managerId: managerId || null,
    })
    if (!error) onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)' }}>
      <div className="card" style={{ maxWidth: 480 }}>
        <h2>Aprobar usuario</h2>
        <p>{user.email}</p>

        <form onSubmit={handleSubmit}>
          <label>Rol</label>
          <select value={role} onChange={e => setRole(e.target.value)}>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          <label>Área</label>
          <select value={area} onChange={e => setArea(e.target.value)}>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <label>Manager directo</label>
          <select value={managerId} onChange={e => setManagerId(e.target.value)}>
            <option value="">— sin manager —</option>
            {candidates
              .filter(c => c.id !== user.id && c.status === 'active')
              .map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.area})
                </option>
              ))}
          </select>

          <button type="submit">Aprobar y activar</button>
        </form>
      </div>
    </div>
  )
}
```

---

## 8. Sidebar Condicional para Admin

```jsx
// app/src/components/layout/Sidebar.jsx

import { isAdmin } from '../../lib/permissions'

export default function Sidebar({ isOpen, onClose }) {
  const { logout, displayName, isDemoMode, profile } = useApp()
  const showAdmin = isDemoMode || isAdmin(profile)

  return (
    <aside className="sidebar">
      {/* ... nav items ... */}

      {/* Sección Administración (condicional) */}
      {showAdmin && (
        <>
          <div className="nav-section-label">Administración</div>
          <NavLink
            to="/admin/usuarios"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <UserCog size={18} />
            Usuarios
          </NavLink>
        </>
      )}

      {/* ... resto de nav ... */}
    </aside>
  )
}
```

---

## 9. Helpers de Permisos

```jsx
// app/src/lib/permissions.js

export function isActive(profile) {
  return !!profile && profile.status === 'active'
}

export function isAdmin(profile) {
  return isActive(profile) && profile.role === 'admin'
}

export function isPending(profile) {
  return !!profile && profile.status === 'pending'
}

export function isSuspended(profile) {
  return !!profile && profile.status === 'suspended'
}

// Uso en componentes:
import { isAdmin } from '../lib/permissions'
const { profile } = useApp()
if (isAdmin(profile)) {
  // mostrar panel admin
}
```

---

## 10. Mantener Demo Mode Actualizado

```jsx
// app/src/context/AppContext.jsx

const DEMO_USER = {
  id: 'demo-user',
  email: 'admin@icconstructora.com',
}

const DEMO_PROFILE = {
  id: 'demo-user',
  email: 'admin@icconstructora.com',
  full_name: 'Admin IC',
  role: 'admin',            // ← importante para showAdmin
  status: 'active',         // ← importante para ProtectedRoute
  area: 'Dirección',
  // ... otros campos ...
}

function enterDemoMode() {
  setIsDemoMode(true)
  setUser(DEMO_USER)
  setProfile(DEMO_PROFILE)  // ← proporciona profile válido
  setVto(DEMO_VTO)
  setLoading(false)
}
```

**Si Fase 2 agrega campos a `profiles`, actualizar `DEMO_PROFILE` también.**

---

## SQL Query Útil: Ver Estado de Usuarios

```sql
-- Todos los usuarios
select id, email, full_name, role, status, area, created_at, approved_at
from public.profiles
order by created_at desc;

-- Solo pendientes
select email, full_name
from public.profiles
where status = 'pending';

-- Solo admins
select email, full_name, role
from public.profiles
where role = 'admin';

-- Ver quién aprobó a quién
select p.email as user_email, 
       approver.email as approved_by_email,
       p.approved_at, p.role
from public.profiles p
left join public.profiles approver on p.approved_by = approver.id
where p.approved_at is not null;
```

---

## Testing Manual: Comandos útiles

```bash
# Limpiar sesión local (fuerza nuevo login)
# DevTools → Application → Cookies → eliminar todos
# DevTools → Application → LocalStorage → borrar sb-* y sb_*

# Rebuild y reinicia dev server
cd app
rm -rf node_modules/.vite
npm run dev

# Test completo
npm run lint && npm run build

# Ver logs de Supabase
supabase logs push --project-id zbjwasufengayvmutypr
```

---

**Fin de ejemplos de código.**

Para más contexto, revisar los archivos reales en `app/src/`.
