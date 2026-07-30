import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // maplibre-gl loads its tile-parsing worker via a dynamic URL that Vite's
  // dep pre-bundler mangles (the worker chunk 404s, silently breaking all
  // vector-tile loading). Excluding it from optimizeDeps avoids that.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  server: {
    port: Number(process.env.PORT) || 5173,
  },
})
