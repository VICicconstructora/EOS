# Plan de Implementación: Deploy a Azure Static Web Apps

El objetivo es alojar la aplicación React + Vite en **Azure Static Web Apps (SWA)**. Esta plataforma provee hosting global, certificados SSL gratuitos, y se integra perfectamente con flujos de trabajo de CI/CD (GitHub Actions o Azure DevOps).

## User Review Required

> [!IMPORTANT]
> Para proceder con la manera más estándar y automatizada de Azure SWA, se asume que el código fuente está o estará alojado en **GitHub** o **Azure DevOps**. ¿Está el código en alguno de estos repositorios, o prefieres hacer un despliegue puramente manual desde tu computadora local?

> [!WARNING]
> Necesitaremos configurar las variables de entorno de Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) dentro del portal de Azure una vez creado el recurso para que la aplicación funcione en producción.

---

## Cambios Propuestos / Pasos de Implementación

### 1. Configuración de Rutas (SPA Fallback)
Como es una aplicación de una sola página (SPA) construida con React Router, necesitamos decirle a Azure que redirija todas las rutas al `index.html`.
#### [NEW] `app/staticwebapp.config.json`
Se creará este archivo en la raíz del frontend (`app/`) con la siguiente configuración:
```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

### 2. Creación del Recurso en Azure
Este paso se realiza en el portal de Azure:
1. Ir a **Azure Portal** > Crear recurso > **Static Web App**.
2. Conectar la cuenta de **GitHub** (o Azure DevOps).
3. Seleccionar el repositorio y la rama principal (`main` o `master`).
4. Detalles de compilación:
   - Presets de compilación: **React** o **Custom**
   - App location: `/app` (o la carpeta donde esté el package.json)
   - Api location: (Dejar en blanco si no usamos Azure Functions)
   - Output location: `dist`

### 3. Configuración de Variables de Entorno
En el portal de Azure, bajo la sección **Environment variables** del Static Web App recién creado, añadir:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 4. Automatización (CI/CD)
Al completar el paso 2, Azure automáticamente creará un archivo de workflow de GitHub Actions (ej. `.github/workflows/azure-static-web-apps-*.yml`) en el repositorio. Cada vez que hagas `git push`, la aplicación se construirá y desplegará sola.

---

## Open Questions

1. **¿Usas GitHub, GitLab, o Azure DevOps para guardar tu código?** Azure SWA tiene flujos de trabajo nativos para GitHub y Azure DevOps.
2. **¿Pudiste crear la App Registration en Azure AD que mencionamos anteriormente?** Si no, podemos hacer el despliegue de la app primero y conectar la autenticación después.

## Verification Plan

### Manual Verification
1. Accederemos a la URL pública provista por Azure (e.g., `gentle-ground-0123.azurestaticapps.net`).
2. Verificaremos que la aplicación cargue la página inicial.
3. Navegaremos por distintas rutas y recargaremos la página (F5) para asegurarnos de que el ruteo interno (SPA fallback) esté funcionando correctamente.
4. Validaremos que la conexión a Supabase funcione (ej. listando datos).
