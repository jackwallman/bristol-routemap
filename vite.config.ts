import path from 'node:path'
import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In a git worktree, node_modules resolves to the main checkout — outside the
// Vite root, so the raw /@fs/ URLs used for the un-prebundled maplibre-gl below
// fall outside the default fs.allow list and 403. That 403 hits maplibre's tile
// worker, which fails silently: the basemap never loads and the map renders
// blank. Walk up from the resolved package to whichever node_modules holds it.
const depsRoot = path.resolve(
  createRequire(import.meta.url).resolve('maplibre-gl/package.json'),
  '../../..',
)

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
    fs: { allow: [process.cwd(), depsRoot] },
  },
})
