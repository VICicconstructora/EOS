# Setup Checklist — Fase 1 Autenticación Entra ID

**Para:** Equipo de TI (Luis Miguel Serrano) / Admin de Supabase  
**Propósito:** Verificar configuración previa a despliegue en staging

---

## Pre-requisitos (Debe estar HECHO antes de empezar)

- [ ] Aplicación `Traccion-IC` registrada en Azure Entra ID
- [ ] Admin consent dado en Entra ID
- [ ] Azure provider habilitado en Supabase project `zbjwasufengayvmutypr`
  - [ ] Client ID obtenido
  - [ ] Client Secret obtenido
  - [ ] Tenant URL configurado (ej: `https://login.microsoftonline.com/{tenant-id}`)

---

## Configuración en Supabase Dashboard

### 1. Verificar Azure Provider

**Path:** Authentication → Providers → Azure

- [ ] Proveedor habilitado (toggle ON)
- [ ] Client ID: `[debe estar lleno]`
- [ ] Client Secret: `[debe estar lleno, oculto]`
- [ ] Tenant URL: `https://login.microsoftonline.com/{tenant-id}`
- [ ] Redirect URL: debe incluir (agregar si falta):
  - `http://localhost:5173` (desarrollo)
  - `http://localhost:3000` (si aplica)
  - `https://staging-domain.com` (staging, reemplazar)
  - `https://prod-domain.com` (producción, reemplazar)

**Acción:** Si alguno está vacío o falso, contactar Andrés Arango (quien configuró en Entra).

### 2. Verificar Site URL

**Path:** Settings → General → Site URL

- [ ] URL correcta para entorno actual:
  - Dev: `http://localhost:5173`
  - Staging: `https://staging-domain.com`
  - Prod: `https://tudominio.com`

**Nota:** Site URL es donde Supabase redirecciona después de auth; debe coincidir con donde vive la app.

### 3. Aplicar Migración SQL

**Path:** SQL Editor

Copiar y ejecutar:

```bash
# Comando local (si tienes CLI Supabase)
supabase db push
```

O en Dashboard SQL Editor:

1. Abrir `app/supabase/migrations/2026_05_08_profiles_and_approval.sql`
2. Copiar todo el contenido
3. Pegar en SQL Editor
4. Click "Run"
5. Esperado: "Success. No rows returned."

**Verificación post-SQL:**

```sql
-- Tabla existe
select count(*) from public.profiles;

-- Funciones existen
select proname from pg_proc 
where proname in ('is_active_user','current_role_app','approve_user','suspend_user');

-- Triggers existen
select tgname from pg_trigger 
where tgname in ('on_auth_user_created','profiles_guard_sensitive');
```

Esperado: 
- profiles: 0 rows (tabla vacía, datos llegarán con primeros logins)
- Functions: 4 filas
- Triggers: 2 filas

### 4. Crear Usuario Admin Inicial (Manual, ONCE)

En SQL Editor:

```sql
-- Primero, crear el usuario en Supabase Dashboard o via login real
-- Luego, actualizar su profile:
update public.profiles
   set role = 'admin',
       status = 'active',
       full_name = 'Juan Paulo McAllister',
       area = 'Dirección',
       approved_at = now()
 where email = 'jpmcallister@icconstructora.com';  -- cambiar email

-- Verificar
select id, email, role, status, approved_at from public.profiles;
```

Esperado: 1 fila con role='admin', status='active'.

---

## Configuración en Aplicación

### 1. Variables de Entorno

**Archivo:** `app/.env`

```bash
VITE_SUPABASE_URL=https://zbjwasufengayvmutypr.supabase.co
VITE_SUPABASE_ANON_KEY=[copiar de Supabase Dashboard → Settings → API → anon key]

# Opcional (si existe)
VITE_INDICADORES_URL=http://localhost:8501
VITE_TOTAL_URL=http://localhost:5174
```

**Verificación:**

```bash
cd app
cat .env | grep VITE_SUPABASE
# Debe imprimir las dos líneas sin estar vacías
```

### 2. Instalar Dependencias

```bash
cd app
npm install
```

### 3. Test Dev Server

```bash
npm run dev
# Esperado: servidor levanta en http://localhost:5173 sin errores
```

Abrir en navegador:
- [ ] Aparece LoginPage
- [ ] Botón "Iniciar sesión con Microsoft" visible
- [ ] Click botón → redirige a `login.microsoftonline.com` (no error)

### 4. Lint

```bash
npm run lint
```

Esperado: 0 errors, 0 warnings introducidos por los cambios.

### 5. Build

```bash
npm run build
```

Esperado:
- Sin errores
- Chunks creados correctamente
- Archivo `dist/index.html` existe

---

## Flujo de Testing (Staging)

### Escenario 1: Primer login crea profile pending

1. **Setup:**
   - App desplegada en staging
   - SQLEditor de Supabase listo
   - Cuenta de prueba: `prueba.entra@icconstructora.com` (crear en Entra si no existe)

2. **Test:**
   - Abrir app en navegador incógnito/privado
   - Click "Iniciar sesión con Microsoft"
   - Login con `prueba.entra@icconstructora.com`
   - **Esperado:** PendingApprovalPage aparece con "Tu acceso está en revisión"

3. **Verificación BD:**
   ```sql
   select id, email, full_name, role, status, azure_oid
   from public.profiles
   where email = 'prueba.entra@icconstructora.com';
   ```
   - role='pending' ✅
   - status='pending' ✅
   - azure_oid no nulo ✅

4. **Resultado:** ✅ PASS o ❌ FAIL

### Escenario 2: Admin aprueba usuario pending

1. **Setup:**
   - Admin account (`jpmcallister@icconstructora.com`) logueado
   - Usuario de prueba aún en pending

2. **Test:**
   - Navegar a `/admin/usuarios`
   - **Esperado:** Tabla carga, ve fila con `prueba.entra@icconstructora.com`, status "pending"
   - Click "Aprobar"
   - Modal abre con campos rol/área/manager
   - Selecciona: rol=Visualizador, área=Operaciones, manager=[admin]
   - Submit
   - **Esperado:** Modal cierra, fila cambia a status "active", rol "Visualizador"

3. **Verificación BD:**
   ```sql
   select role, status, area, approved_at, approved_by
   from public.profiles
   where email = 'prueba.entra@icconstructora.com';
   ```
   - role='viewer' ✅
   - status='active' ✅
   - area='Operaciones' ✅
   - approved_at no nulo ✅
   - approved_by = admin's id ✅

4. **Resultado:** ✅ PASS o ❌ FAIL

### Escenario 3: Usuario aprobado accede a app

1. **Setup:**
   - Usuario de prueba aprobado (status='active')
   - Logout del admin

2. **Test:**
   - Logout si estás logueado
   - Abrir nueva ventana incógnito
   - Login con `prueba.entra@icconstructora.com`
   - **Esperado:** Dashboard de Tracción aparece (NO PendingApprovalPage)
   - Navega a `/vision`, `/personas`, etc.
   - **Esperado:** Acceso normal, datos cargan

3. **Resultado:** ✅ PASS o ❌ FAIL

### Escenario 4: Usuario no-admin no ve admin panel

1. **Setup:**
   - Usuario de prueba logueado (viewer, no admin)

2. **Test:**
   - Revisar Sidebar: NO debe aparecer entrada "Admin · Usuarios"
   - Intentar navegar a `http://staging-domain.com/admin/usuarios`
   - **Esperado:** Mensaje "Acceso denegado"

3. **Resultado:** ✅ PASS o ❌ FAIL

### Escenario 5: Admin suspende usuario

1. **Setup:**
   - Admin logueado
   - Usuario de prueba en status='active'

2. **Test:**
   - En `/admin/usuarios`, tabla muestra usuario de prueba
   - Hover sobre botones acción → aparece ícono ban (suspender)
   - Click ban
   - **Esperado:** Fila cambia a status "suspended"

3. **Verificación:**
   - Logout admin
   - Logout usuario prueba (si estaba abierto otra pestaña)
   - Login con usuario prueba
   - **Esperado:** SuspendedPage ("Tu acceso ha sido suspendido")

4. **Resultado:** ✅ PASS o ❌ FAIL

### Escenario 6: Admin reactiva usuario

1. **Setup:**
   - Usuario suspendido, admin logueado

2. **Test:**
   - En `/admin/usuarios`, filtrar status → "Suspendidos"
   - Ver usuario prueba
   - Click "Reactivar"
   - **Esperado:** Fila cambia a status "active"

3. **Verificación:**
   - Logout admin
   - Login usuario prueba
   - **Esperado:** Dashboard normal

4. **Resultado:** ✅ PASS or ❌ FAIL

### Escenario 7: Demo Mode

1. **Setup:**
   - `.env` renombrado a `.env.backup` (simula variables faltantes)
   - Dev server reiniciado

2. **Test:**
   - Abrir `http://localhost:5173`
   - **Esperado:** Dashboard carga SIN login
   - Sidebar muestra "Admin · Usuarios"
   - Top header muestra "Admin IC (Demo)"
   - Puede navegar a `/admin/usuarios`, tabla muestra usuarios mock

3. **Verificación:**
   - No se hacen llamadas reales a BD (revisar Network tab del navegador)

4. **Resultado:** ✅ PASS o ❌ FAIL

5. **Cleanup:**
   - Restaurar `.env`: `mv .env.backup .env`

---

## Troubleshooting Común

| Problema | Causa | Solución |
|----------|-------|----------|
| "Iniciar sesión con Microsoft" no funciona | Azure provider no configurado o Site URL incorrecto | Revisar Supabase Dashboard → Auth → Azure → Site URL |
| Profile no se crea automáticamente en BD | Trigger `handle_new_user` no existe | Re-ejecutar migración SQL en SQL Editor |
| `azure_oid` es NULL en profile | Campo en `raw_user_meta_data` diferente | Revisar SQL de trigger, cambiar `'provider_id'` por clave correcta (ej: `'oid'`) |
| Admin panel muestra "Acceso denegado" para admin real | RLS policy no permite lectura de profiles | Verificar que user tiene `status='active'` y `role='admin'` |
| Login redirige infinito | Site URL mismatch con dominio de despliegue | Actualizar Site URL en Supabase Dashboard |
| Build fallida con "chunk X could not be fetched" | Lazy loading no funciona | Revisar bundle, asegurar que `dist/` tiene todos los archivos |

---

## Sign-Off

Cuando todos los tests pasen:

- [ ] Firma: _______________________________  (Admin/TI)
- [ ] Fecha: ________________________________
- [ ] Aprobado para staging: SÍ / NO
- [ ] Aprobado para producción: SÍ / NO (hacer después de 1 semana en staging)

---

## Documentación Adicional

- Spec técnico: `docs/superpowers/specs/2026-05-07-entra-id-integration-design.md`
- Plan implementación: `docs/superpowers/plans/2026-05-08-entra-id-auth-fase1.md`
- Estado actual: `docs/superpowers/implementation-status/2026-05-16-entra-id-fase1-status.md`
