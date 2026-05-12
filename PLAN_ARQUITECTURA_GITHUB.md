# Plan de Arquitectura: GitHub y Microsoft Entra ID

Este documento contiene la estrategia para compartimentalizar la aplicación "Main" (Landing Page) y conectarla con otros módulos creados por diferentes desarrolladores, manteniendo una única experiencia de inicio de sesión.

## Arquitectura: Múltiples Repositorios (Polyrepo)

Esta es la mejor estrategia para mantener tu código base privado y permitir que otros desarrolladores construyan sobre el sistema.

1. **Repo Principal (El "Cerebro" / Landing Page):**
   - Repositorio Privado donde **solo tú** tienes acceso.
   - Contiene el enrutador principal y la integración inicial con Microsoft Entra ID.

2. **Repositorios de Extensiones (Módulos):**
   - Repositorios separados (ej. `ic-modulo-finanzas`).
   - Los desarrolladores (colaboradores) solo tienen acceso a su módulo específico. No pueden ver el código del "Main".

## Parte 1: Pasos para subir el "Main" a GitHub

1. **Crear Repositorio en GitHub:**
   - Entra a [github.com](https://github.com/) y crea un nuevo repositorio (`ic-os-main`).
   - Hazlo **Privado (Private)**.
   - **No** inicialices con README, .gitignore o licencia (ya los tienes localmente).

2. **Enlazar Código Local:**
   - Abre la terminal y asegúrate de estar en la carpeta del proyecto.
   - Ejecuta los comandos que te proporciona GitHub (similares a estos):
     ```powershell
     git remote add origin https://github.com/TU_USUARIO/ic-os-main.git
     git branch -M main
     git push -u origin main
     ```

## Parte 2: Configuración de Single Sign-On (SSO) con Entra ID

Para que todos los módulos se comporten como una sola aplicación:

1. **Mismo App Registration:**
   - Todos los módulos (incluyendo el "Main") deben usar el **mismo `Client ID` y `Tenant ID`** de tu App Registration en Azure.

2. **URLs de Redirección:**
   - En el portal de Azure > App Registration > Authentication, debes agregar las URLs de todos los módulos.
   - Ejemplos: `https://main.ic-empresa.com`, `https://finanzas.ic-empresa.com`, `http://localhost:3000` (para desarrollo local).

3. **Flujo de Usuario:**
   - Enlazas los módulos desde el "Main" (ej. `<a href="https://finanzas.ic-empresa.com">Módulo Finanzas</a>`).
   - Al hacer clic, el usuario es redirigido al módulo.
   - El módulo verifica la sesión con Microsoft Entra ID.
   - Microsoft detecta la sesión activa (gracias al login en "Main") y autoriza automáticamente sin pedir contraseña.

## Siguientes Pasos (Para Mañana)

- [ ] Revisar el archivo `.gitignore` para asegurarse de no subir contraseñas o archivos pesados.
- [ ] Ejecutar los comandos de Git para subir el repositorio principal a GitHub.
- [ ] Configurar el App Registration en Azure con las URLs necesarias.
- [ ] Iniciar el primer repositorio de prueba para un módulo satélite.
