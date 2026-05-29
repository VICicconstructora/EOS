# Tracción – Localhost Demo

Esta carpeta contiene una página estática de ejemplo (*index.html*) que puedes servir localmente para desarrollar y probar tus dashboards o documentación.

## Opciones para ejecutar el servidor local

### 1. **Usar Python (recomendado si tienes Python instalado)**
```powershell
# Navega al directorio del proyecto
cd "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\traccion_localhost"

# Ejecuta el servidor HTTP en el puerto 3000 (puedes cambiar el puerto)
python -m http.server 3000
```
Abre tu navegador y visita `http://localhost:3000`.

### 2. **Usar Node.js + http-server**
```powershell
# Instala http-server globalmente (requiere Node.js y npm)
npm install -g http-server

# Navega al directorio
cd "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\traccion_localhost"

# Inicia el servidor en el puerto 3000
http-server -p 3000
```
Visita `http://localhost:3000`.

### 3. **Usar la extensión "Live Server" de VS Code**
1. Abre la carpeta `traccion_localhost` en VS Code.
2. Haz clic derecho sobre `index.html` y selecciona **"Open with Live Server"**.
3. La página se abrirá automáticamente en tu navegador.

## Personaliza la página
Edita `index.html` para agregar tus propios componentes, gráficos o enlaces. La hoja de estilo está incluida en el mismo archivo y usa colores modernos con un diseño de tipo *glassmorphism*.

---
*© 2026 Tracción – Todos los derechos reservados.*
