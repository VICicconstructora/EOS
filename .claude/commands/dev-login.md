# Dev Login — Cuenta fija de desarrollo

## Regla principal
**NUNCA crear usuarios nuevos durante pruebas.** Siempre usar la cuenta demo fija o el modo demo local:

| Campo    | Valor                        |
|----------|------------------------------|
| Email    | `admin@icconstructora.com`   |
| Alias    | `Admin IC`                   |
| Empresa  | `IC Constructora`            |
| company_id | `ic-constructora`          |

## Modo demo (sin Supabase configurado)
Si `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` no están definidos, la app entra en **demo mode** automáticamente (`isDemoMode = true`). En ese caso:
- El usuario activo es el `DEMO_USER` definido en `src/context/AppContext.jsx`.
- No se realizan llamadas reales a Supabase.
- Todos los datos provienen del estado local.

Usar demo mode para probar UI sin necesitar credenciales de Supabase.

## Antes de hacer cualquier prueba que requiera auth real:
1. Verificar que las env vars `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` están en `.env.local`.
2. Usar la cuenta `admin@icconstructora.com` — si no existe, crearla desde Supabase Dashboard > Authentication > Users.
3. Verificar que `isDemoMode` es `false` en el contexto antes de probar flujos de auth.

## Datos de referencia para pruebas
- Tabla `vto`, filtrada por `company_id = 'ic-constructora'`.
- Los valores demo están en `DEMO_VTO` dentro de `src/context/AppContext.jsx`.

## Limpieza
Para resetear el estado demo, recargar la app — el estado demo es efímero (no persiste en DB).
