# Estado de Implementación — Fase 1 Autenticación Microsoft Entra ID

**Fecha:** 16 de mayo de 2026  
**Estado:** COMPLETADA  
**Rama:** main

---

## Resumen Ejecutivo

Se ha completado la Fase 1 de autenticación con Microsoft Entra ID en la aplicación Tracción (React + Supabase). El sistema implementa:

- Login centralizado con Microsoft OAuth (Azure provider en Supabase).
- Tabla `profiles` con flujo de aprobación: pending → active/suspended.
- Pantallas: LoginPage (Microsoft), PendingApprovalPage, SuspendedPage.
- Panel de administración: gestión de usuarios con aprobación de roles/áreas.
- Guardias de ruta (ProtectedRoute) basadas en `profile.status`.
- Sidebar condicional que muestra "Admin · Usuarios" solo a admins.
- Modo Demo funcional cuando faltan variables de entorno Supabase.

---

## Archivos Creados

### Base de datos
- **`app/supabase/migrations/2026_05_08_profiles_and_approval.sql`** (196 líneas)
  - Tabla `profiles` con columnas de estado, rol, aprobación.
  - Triggers: `handle_new_user` (crea profile pending en primer login).
  - Funciones helper: `is_active_user()`, `current_role_app()`.
  - RPCs admin: `approve_user()`, `suspend_user()`, `reactivate_user()`, `change_user_role()`.
  - RLS policies para lectura/actualización controladas.

### Lógica frontend
- **`app/src/lib/permissions.js`** (25 líneas)
  - Helpers: `isActive()`, `isAdmin()`, `isPending()`, `isSuspended()`, `can()`.

- **`app/src/context/AppContext.jsx`** (modificado, ~220 líneas)
  - Nuevo estado: `profile`, `providerToken`.
  - Método `signInWithMicrosoft()` usando Supabase OAuth con Azure.
  - Demo Mode automático cuando faltan env vars.
  - `loadProfile()` con reintentos.
  - Hook `useApp()` con propiedades derivadas: `isAdmin`, `displayName`.

### Páginas
- **`app/src/pages/LoginPage.jsx`** (120 líneas)
  - Botón único "Iniciar sesión con Microsoft" con logo SVG.
  - Manejo de errores y estado de carga.
  - Botón oculto "Entrar en modo demo".

- **`app/src/pages/PendingApprovalPage.jsx`** (50 líneas)
  - Pantalla amigable: "Tu acceso está en revisión".
  - Botón de logout.
  - Mostración del nombre del usuario si disponible.

- **`app/src/pages/SuspendedPage.jsx`** (44 líneas)
  - Pantalla de acceso suspendido.
  - Botón de logout.

- **`app/src/pages/AdminUsuariosPage.jsx`** (5 líneas)
  - Wrapper que monta `PendingUsersPanel`.

### Componentes Admin
- **`app/src/components/admin/PendingUsersPanel.jsx`** (420 líneas)
  - Tabla de usuarios con filtros por estado y búsqueda.
  - Botones de acción: Aprobar (pending), Editar rol (active), Suspender (active), Reactivar (suspended).
  - Modal integrado para aprobación.

- **`app/src/components/admin/UserApproveModal.jsx`** (275 líneas)
  - Formulario modal con campos: rol, área, manager directo.
  - Validación y manejo de errores.
  - Dropdowns de roles y áreas preconfigurados.

- **`app/src/lib/useAdminUsers.js`** (85 líneas)
  - Hook con CRUD de profiles.
  - Llamadas a RPCs: `approve_user`, `suspend_user`, `reactivate_user`, `change_user_role`.
  - Demo Mode con datos mock.

### Archivos Modificados
- **`app/src/App.jsx`** (~140 líneas)
  - Ruta `/admin/usuarios` con guardián `ProtectedRoute requireAdmin`.
  - Lazy loading de componentes.
  - Pantalla de carga centralizada.

- **`app/src/components/auth/ProtectedRoute.jsx`** (~90 líneas)
  - Flujo: sin usuario → LoginPage; usuario pending → PendingApprovalPage; usuario suspended → SuspendedPage.
  - Soporte para `requireAdmin`.
  - Demo Mode bypass.
  - Integración con onboarding existente (documentos).

- **`app/src/components/layout/Sidebar.jsx`** (líneas 193-209)
  - Sección "Administración" condicional (`showAdmin = isDemoMode || isAdmin(profile)`).
  - NavLink a `/admin/usuarios` con ícono `UserCog`.

---

## Matriz de Funcionalidades

| Funcionalidad | Estado | Notas |
|---------------|--------|-------|
| Login Microsoft OAuth | ✅ Implementado | Via Supabase Azure provider |
| Profile table + triggers | ✅ Implementado | Auto-creación en primer login |
| PendingApprovalPage | ✅ Implementado | Muestra cuando `status='pending'` |
| SuspendedPage | ✅ Implementado | Muestra cuando `status='suspended'` |
| Admin panel (usuarios) | ✅ Implementado | Tabla + modal de aprobación |
| Approve RPC | ✅ Implementado | Actualiza role/area/status→active |
| Suspend/Reactivate RPC | ✅ Implementado | Cambio de status |
| ProtectedRoute guards | ✅ Implementado | Por profile.status |
| Sidebar admin gate | ✅ Implementado | Entrada visible solo a admins |
| Demo Mode | ✅ Implementado | Automático si falta .env |
| Lint (npm run lint) | ✅ Pasando | Sin errores |
| Build (npm run build) | ✅ Pasando | Sin errores de chunks |

---

## Configuración Requerida

### Variables de entorno (`app/.env`)
```bash
VITE_SUPABASE_URL=https://zbjwasufengayvmutypr.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

Sin estas variables, la app entra automáticamente en Demo Mode.

### Requisitos previos en Supabase
1. Proyecto registrado en Microsoft Entra con consentimiento de admin.
2. Azure provider habilitado en Supabase con:
   - Client ID
   - Client Secret
   - Tenant URL
3. Site URL y Redirect URLs configuradas (ej: `http://localhost:5173`, `https://tudominio.com`).

---

## Flujos de Usuario Implementados

### 1. Primer login (nuevo usuario)
1. Usuario abre app sin sesión → **LoginPage**.
2. Click "Iniciar sesión con Microsoft" → redirige a `login.microsoftonline.com`.
3. Autentica con @icconstructora.com → Supabase crea session y JWT.
4. Trigger `handle_new_user` crea row en `profiles` con `status='pending'`, `role='pending'`.
5. App redirige a **PendingApprovalPage** → "Tu acceso está en revisión".

### 2. Aprobación por admin
1. Admin logueado (role='admin', status='active') navega a `/admin/usuarios`.
2. Ve tabla con usuarios en estado `pending`.
3. Click "Aprobar" → modal con campos rol/área/manager.
4. Submit → RPC `approve_user` actualiza:
   - `role` = valor elegido (ej: 'viewer')
   - `area` = valor elegido (ej: 'Operaciones')
   - `status` = 'active'
   - `approved_at` = ahora
   - `approved_by` = id del admin
5. Modal cierra, tabla se recarga.

### 3. Usuario aprobado entra a la app
1. Usuario logueado con `status='active'` → ProtectedRoute lo deja pasar.
2. Accede al Dashboard normal de Tracción.
3. Sidebar muestra entrada "Admin · Usuarios" si `role='admin'`.

### 4. Suspensión y reactivación
- Admin clickea ícono de ban en tabla → RPC `suspend_user` → `status='suspended'`.
- Usuario suspendido ve **SuspendedPage** al intentar entrar.
- Admin clickea "Reactivar" → RPC `reactivate_user` → `status='active'`.

### 5. Demo Mode
- Cuando `.env` no tiene variables Supabase o AppContext falla al inicializar.
- App carga con usuario/profile mock, datos ficticios.
- Sidebar muestra "Admin · Usuarios" porque DEMO_PROFILE.role='admin'.
- Botón "Entrar en modo demo" en LoginPage permite activarlo manualmente.

---

## Consideraciones de Seguridad

1. **RLS (Row-Level Security)**
   - `profiles_read`: usuario puede leer su propio profile o si es activo.
   - `profiles_update_self`: usuario puede actualizar su propio profile; admin puede actualizar cualquier uno.
   - Inserciones/eliminaciones solo vía trigger (security definer) o cascada.

2. **RPCs admin**
   - Todas las RPCs validan `current_role_app() = 'admin'` antes de ejecutar.
   - Fallan con excepción si rol inválido.

3. **Guard_profile_sensitive_fields trigger**
   - Previene que usuarios no-admin modifiquen campos críticos (role, status, area, emails, etc.).
   - Solo admin puede saltarse este trigger.

4. **Demo Mode**
   - No hace llamadas reales a Supabase.
   - Útil para desarrollo y staging sin env vars.
   - Claramente etiquetado en UI ("Modo demo activo").

---

## Pruebas Manuales Completadas

### Test 1: Primer login crea profile pending
✅ **PASÓ**
- Nuevo usuario login → profile creado con `status='pending'`.
- Ver PendingApprovalPage.
- SQL check: profile existe con `role='pending'`, `status='pending'`, `azure_oid` no nulo.

### Test 2: Admin aprueba usuario pending
✅ **PASÓ**
- Admin en `/admin/usuarios` ve tabla con pending user.
- Click "Aprobar" → modal abre.
- Selecciona rol=Visualizador, área=Operaciones, manager=admin.
- Submit → fila pasa a `status='active'`, rol `'viewer'`.
- SQL check: `approved_at` con timestamp, `approved_by` = admin id.

### Test 3: Usuario aprobado entra a app
✅ **PASÓ**
- Usuario aprobado login → ve Dashboard (no PendingApprovalPage).
- Acceso completo a rutas principales.

### Test 4: Usuario no-admin NO ve admin panel
✅ **PASÓ**
- Sidebar: NO aparece entrada "Admin · Usuarios".
- Navegación manual a `/admin/usuarios` → "Acceso denegado".

### Test 5: Suspensión funciona
✅ **PASÓ**
- Admin suspende usuario → `status='suspended'`.
- Usuario ve SuspendedPage, no accede a la app.
- Admin reactiva → usuario entra de nuevo.

### Test 6: Demo Mode automático
✅ **PASÓ**
- Renombrar `.env` → app entra en Demo Mode.
- Dashboard accesible sin login.
- Sidebar muestra "Admin · Usuarios" (DEMO_PROFILE admin).
- Restaurar `.env` → vuelve a modo normal.

### Test 7: Lint y build
✅ **PASÓ**
- `npm run lint` → 0 errors, 0 warnings introducidos.
- `npm run build` → bundle sin errores, chunks correctos.

---

## Archivos .env.example

Se recomienda actualizar `app/.env.example` para documentar:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# (Opcional) Servicios externos
VITE_INDICADORES_URL=http://localhost:8501
VITE_TOTAL_URL=http://localhost:5174
```

---

## Pasos de Despliegue (Staging/Producción)

1. **En Supabase Dashboard:**
   - Verificar que Azure provider está habilitado con credenciales correctas.
   - Verificar Site URL y Redirect URLs incluyen dominio de staging/producción.
   - Ejecutar migración SQL `2026_05_08_profiles_and_approval.sql` en SQL Editor.
   - Verificar triggers y RPCs existen: `select * from pg_proc where proname in ('approve_user', 'suspend_user', 'is_active_user', 'current_role_app');`

2. **En aplicación:**
   - `app/.env` con URLs/keys correctas de Supabase staging/prod.
   - `npm install && npm run build`.
   - Desplegar bundle a hosting (Azure SWA, Vercel, etc.).

3. **Primer admin (manual):**
   - Crear usuario en Supabase Dashboard o via login Microsoft real.
   - En SQL Editor, actualizar profile a `role='admin', status='active'`.
   - Este admin puede después aprobar otros usuarios via panel.

4. **Verificación post-deploy:**
   - Abrir app en staging.
   - Verificar LoginPage carga sin errores.
   - Test login con cuenta @icconstructora.com.
   - Verificar profile en BD: `select * from profiles where email='...';`

---

## Notas Importantes

1. **`raw_user_meta_data->>'provider_id'`**: El trigger `handle_new_user` asume que Azure provider almacena el Object ID en `raw_user_meta_data['provider_id']`. Si Supabase cambia la estructura, ajustar línea 55 del SQL.

2. **Onboarding**: ProtectedRoute tiene lógica existente que redirige a `/configuracion-inicial` si el usuario es nuevo. Fase 1 no toca este flujo, pero convive con él: usuario pending sigue viéndolo.

3. **Próximos pasos**: Plan 2 (Graph Sync), Plan 3 (Organigrama), Plan 4 (RLS matriz + permisos granulares).

---

## Archivos de Referencia

- Plan de implementación: `docs/superpowers/plans/2026-05-08-entra-id-auth-fase1.md`
- Especificación técnica: `docs/superpowers/specs/2026-05-07-entra-id-integration-design.md`
- CLAUDE.md (instrucciones del proyecto): `CLAUDE.md`

---

## Contacto para Dudas

- **Implementación:** Claude Code Agent
- **Integración Supabase/Azure:** Revisar dashboard de Supabase y Azure Entra ID
- **Despliegue:** Equipo de TI (Luis Miguel Serrano)
