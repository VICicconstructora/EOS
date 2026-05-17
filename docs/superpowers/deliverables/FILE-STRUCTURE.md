# Estructura de Archivos — Fase 1 Autenticación Entra ID

Guía rápida de dónde vive cada componente y su propósito.

---

## Base de Datos (Supabase)

```
app/supabase/
├── migrations/
│   └── 2026_05_08_profiles_and_approval.sql   ← ÚNICA MIGRACIÓN
│       ├── Tabla profiles
│       ├── Functions: is_active_user, current_role_app
│       ├── Triggers: handle_new_user, guard_profile_sensitive_fields
│       ├── RPCs: approve_user, suspend_user, reactivate_user, change_user_role
│       └── RLS policies
└── schema.sql                                 ← referencia (no ejecutar directamente)
```

**Líneas de migración clave:**
- Tabla: líneas 7–30
- Triggers: líneas 47–96
- RPCs: líneas 99–230
- RLS: líneas 233–248

---

## Frontend — Context & State

```
app/src/
├── context/
│   └── AppContext.jsx
│       ├── DEMO_USER, DEMO_PROFILE (constantes)
│       ├── State: user, profile, providerToken, loading, vto, isDemoMode, lang
│       ├── Methods:
│       │   ├── signInWithMicrosoft()      ← inicio de flujo auth
│       │   ├── logout()                   ← cierre de sesión
│       │   ├── loadProfile(userId)        ← carga profile de BD
│       │   └── loadVTO(), saveVTO()       ← para datos EOS
│       ├── Hook useApp()                  ← acceso al context desde componentes
│       └── Derived values: isAdmin, displayName, refreshProfile
└── lib/
    └── permissions.js
        ├── isActive(profile)              ← status === 'active'
        ├── isAdmin(profile)               ← isActive && role === 'admin'
        ├── isPending(profile)             ← status === 'pending'
        ├── isSuspended(profile)           ← status === 'suspended'
        └── can(profile, action, resource) ← stub para Fase 4
```

**Punto de entrada:** `main.jsx` → `App.jsx` wrapped en `<AppProvider>`

---

## Frontend — Autenticación

```
app/src/
├── pages/
│   ├── LoginPage.jsx
│   │   ├── Botón "Iniciar sesión con Microsoft" (SVG logo)
│   │   ├── Manejo de errores
│   │   └── Botón oculto "Entrar en modo demo"
│   │
│   ├── PendingApprovalPage.jsx
│   │   ├── Mensaje: "Tu acceso está en revisión"
│   │   ├── Mostración del nombre del usuario
│   │   └── Botón Logout
│   │
│   └── SuspendedPage.jsx
│       ├── Mensaje: "Tu acceso ha sido suspendido"
│       └── Botón Logout
│
└── components/auth/
    └── ProtectedRoute.jsx
        ├── Validación de user (→ LoginPage si no hay)
        ├── Validación de profile.status:
        │   ├── null/pending → PendingApprovalPage
        │   ├── suspended → SuspendedPage
        │   └── active → children (ruta permitida)
        ├── Validación de requireAdmin (para /admin/usuarios)
        └── Integración con onboarding existente
```

**Flujo de ruteo:**
```
App.jsx
├── <ProtectedRoute> (global)
│   └── if loading → LoadingScreen
│   └── if !user → LoginPage
│   └── if status=pending → PendingApprovalPage
│   └── if status=suspended → SuspendedPage
│   └── else → AppLayout
│       └── <ProtectedRoute requireAdmin>
│           └── /admin/usuarios → AdminUsuariosPage
```

---

## Frontend — Panel Admin

```
app/src/
├── pages/
│   ├── AdminUsuariosPage.jsx              ← wrapper simple
│   │   └── monta PendingUsersPanel
│   │
├── components/admin/
│   ├── PendingUsersPanel.jsx
│   │   ├── Tabla de usuarios
│   │   ├── Filtros: status (pending/active/suspended/all)
│   │   ├── Búsqueda: por nombre o email
│   │   ├── Columnas: nombre, email, rol, área, estado
│   │   ├── Botones de acción:
│   │   │   ├── Pending → "Aprobar" → abre modal
│   │   │   ├── Active → "Editar" (UserCog) + "Suspender" (Ban)
│   │   │   └── Suspended → "Reactivar"
│   │   └── Modal integrado UserApproveModal
│   │
│   ├── UserApproveModal.jsx
│   │   ├── Dropdown Rol: viewer, area_manager, cross_leader, admin
│   │   ├── Dropdown Área: Dirección, Experiencia, Construcción, etc.
│   │   ├── Dropdown Manager: lista de usuarios activos
│   │   ├── Botón "Aprobar y activar"
│   │   └── Validación y error handling
│   │
│   └── (No requerido en Fase 1, pero útil para Fase 2):
│       └── UserEditModal.jsx (para editar después de aprobación)
│
└── lib/
    └── useAdminUsers.js
        ├── Hook personalizado
        ├── State: users[], loading, error
        ├── Methods:
        │   ├── load()                     ← carga lista de profiles
        │   ├── approveUser(targetId, role, area, managerId)
        │   ├── suspendUser(targetId)
        │   ├── reactivateUser(targetId)
        │   └── changeUserRole(targetId, newRole)
        ├── Llamadas a RPCs de Supabase
        └── Demo Mode: retorna datos mock
```

**Architektur de datos:**
```
PendingUsersPanel
├── Hook useAdminUsers()
│   ├── Carga profiles de Supabase
│   └── Expone métodos approve/suspend/reactivate
├── Renderiza tabla
├── Click "Aprobar" → setModalUser(user)
└── UserApproveModal
    ├── onSubmit → approveUser()
    ├── onClose → modal cierra, tabla recarga
```

---

## Frontend — Layout & Navigation

```
app/src/
├── App.jsx
│   ├── Routes definidas:
│   │   ├── / → DashboardPage
│   │   ├── /vision, /personas, /datos, /asuntos, /procesos, /traccion
│   │   ├── /reuniones, /configuracion, /implementacion, /biblioteca
│   │   ├── /rrhh, /lotes, /juridico, /kpis
│   │   └── /admin/usuarios → ProtectedRoute requireAdmin + AdminUsuariosPage
│   ├── Lazy loading de todos los Pages
│   └── Fallback PageFallback (spinner)
│
├── components/layout/
│   ├── Sidebar.jsx
│   │   ├── EOS_MODULES array → NavLinks automáticos
│   │   ├── Sección "EOS Toolkit" (Implementación, Biblioteca)
│   │   ├── Sección "IC Constructora" (Alarmas, Tareas, RRHH, Lotes, Jurídico, KPIs)
│   │   ├── Sección "Administración" (CONDICIONAL)
│   │   │   ├── Visible si: isDemoMode || isAdmin(profile)
│   │   │   └── NavLink a /admin/usuarios con ícono UserCog
│   │   ├── Sección "Herramientas" (links externos Indicadores, Análisis de Planos)
│   │   └── Footer: logout, idioma toggle, demo mode badge
│   │
│   ├── TopHeader.jsx
│   │   ├── Menú hamburguesa (mobile)
│   │   ├── Título de página
│   │   └── User dropdown (logout, etc.)
│   │
│   └── WelcomeModal.jsx (existente, no tocada en Fase 1)
```

**Imports clave en Sidebar:**
```javascript
import { isAdmin } from '../../lib/permissions'
// Línea 26: const showAdmin = isDemoMode || isAdmin(profile)
// Líneas 194-209: sección Administración condicional
```

---

## Archivo de Configuración

```
app/
├── .env (GIT-IGNORED)
│   ├── VITE_SUPABASE_URL=https://zbjwasufengayvmutypr.supabase.co
│   ├── VITE_SUPABASE_ANON_KEY=...
│   └── (Opcional) VITE_INDICADORES_URL, VITE_TOTAL_URL
│
└── .env.example (EN GIT, SIN VALORES)
    └── Documentar variables con comentarios
```

---

## Archivos Documentación (Este Proyecto)

```
docs/superpowers/
├── specs/
│   └── 2026-05-07-entra-id-integration-design.md  ← diseño arquitectónico
│
├── plans/
│   └── 2026-05-08-entra-id-auth-fase1.md          ← plan con 10 tasks detalladas
│
├── implementation-status/
│   └── 2026-05-16-entra-id-fase1-status.md        ← estado completo implementación
│
├── configuration/
│   └── entra-id-fase1-setup-checklist.md          ← checklist para despliegue
│
└── deliverables/
    ├── FASE-1-SUMMARY.md                           ← resumen ejecutivo
    └── FILE-STRUCTURE.md                           ← este archivo
```

---

## Git History

Commits relevantes (en orden):

1. `feat(db): profiles table + approval RPCs + auth triggers (fase 1 Entra)`
   - Archivo: `app/supabase/migrations/2026_05_08_profiles_and_approval.sql`

2. `feat(auth): permissions helper module (admin/active/pending/suspended)`
   - Archivo: `app/src/lib/permissions.js`

3. `feat(auth): replace email/password with signInWithMicrosoft + profile state`
   - Archivo: `app/src/context/AppContext.jsx`

4. `feat(auth): replace login form with single Microsoft sign-in button`
   - Archivo: `app/src/pages/LoginPage.jsx`

5. `feat(auth): pending approval and suspended pages`
   - Archivos: `app/src/pages/PendingApprovalPage.jsx`, `app/src/pages/SuspendedPage.jsx`

6. `feat(auth): ProtectedRoute guards based on profile.status`
   - Archivos: `app/src/components/auth/ProtectedRoute.jsx`, `app/src/App.jsx`

7. `feat(admin): users panel with approve/suspend/reactivate/change-role`
   - Archivos: `app/src/lib/useAdminUsers.js`, `app/src/components/admin/*`, `app/src/pages/AdminUsuariosPage.jsx`

8. `feat(layout): show Admin · Users link only for admins`
   - Archivo: `app/src/components/layout/Sidebar.jsx`

---

## Dependencias Relevantes

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "react": "^19.x",
    "react-router-dom": "^7.x",
    "react-i18next": "^14.x",
    "lucide-react": "^0.x"
  }
}
```

**No se agregaron nuevas dependencias en Fase 1** — todo usa lo que ya estaba.

---

## Dónde Editar Según Necesidad

| Necesidad | Archivo | Líneas |
|-----------|---------|--------|
| Agregar nuevo rol | `2026_05_08_profiles_and_approval.sql` | 76 (check role in...) |
| Cambiar campos de profile | SQL migration | 7-26 (tabla) |
| Cambiar campos en modal de aprobación | `UserApproveModal.jsx` | 179-262 (inputs del form) |
| Agregar nuevas áreas a dropdown | `UserApproveModal.jsx` | 186-189 (AREAS array) |
| Cambiar logic de guardias | `ProtectedRoute.jsx` | 49-53 (status checks) |
| Agregar nuevo link en sidebar | `Sidebar.jsx` | insertar NavLink antes de "Herramientas" |
| Cambiar logic de isAdmin | `permissions.js` | línea 9 (función isAdmin) |
| Cambiar flujo de login | `AppContext.jsx` | línea 172-182 (signInWithMicrosoft) |

---

## Checklist de Review para PR

- [ ] Migración SQL ejecuta sin errores en Supabase
- [ ] AppContext imports `permissions.js` correctamente
- [ ] ProtectedRoute valida status en orden correcto: pending → suspended → requireAdmin
- [ ] LoginPage muestra botón Microsoft sin errores
- [ ] PendingApprovalPage y SuspendedPage tienen logout button
- [ ] AdminUsuariosPage es accesible solo a admins
- [ ] Sidebar solo muestra "Administración" si `showAdmin=true`
- [ ] npm run lint pasa sin errores nuevos
- [ ] npm run build genera bundle sin errores
- [ ] Demo Mode funciona sin `.env`

---

## Contacto para Dudas de Estructura

- **Autenticación:** revisar AppContext + ProtectedRoute
- **Panel Admin:** revisar useAdminUsers + PendingUsersPanel + UserApproveModal
- **Base de datos:** revisar archivo SQL + triggers
- **Permisos:** revisar permissions.js + ProtectedRoute requireAdmin
- **Routing:** revisar App.jsx routes + Sidebar NavLinks
