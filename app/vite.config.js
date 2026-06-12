import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// SINGLEFILE=1 genera un único index.html autocontenido (todo JS/CSS embebido),
// que se puede abrir con doble clic (file://) en cualquier navegador.
const singleFile = process.env.SINGLEFILE === '1'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  // Lee el .env centralizado en la raíz del repo (un nivel arriba de app/).
  envDir: '..',
  plugins: [react(), ...(singleFile ? [viteSingleFile()] : [])],
})
