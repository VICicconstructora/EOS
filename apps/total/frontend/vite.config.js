import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  // Lee el .env centralizado en la raíz del repo (tres niveles arriba).
  envDir: '../../..',
})
