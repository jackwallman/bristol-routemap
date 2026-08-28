import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)

// In a git worktree, node_modules resolves to the main checkout — outside the
// Vite root, so the raw /@fs/ URLs used for the un-prebundled maplibre-gl below
// fall outside the default fs.allow list and 403. That 403 hits maplibre's tile
// worker, which fails silently: the basemap never loads and the map renders
// blank. Walk up from the resolved package to whichever node_modules holds it.
// `.` is export-mapped to ESM only, so CJS-style resolution has to go via the
// (explicitly exported) package.json to find the package root.
const maplibreRoot = path.dirname(require.resolve('maplibre-gl/package.json'))
const depsRoot = path.resolve(maplibreRoot, '../..')

// Both the emitted worker path below and maplibre's own relative URL resolution
// depend on this matching Vite's assetsDir.
const assetsDir = 'assets'

// At runtime maplibre spawns its tile-parsing worker from
// `new URL('./maplibre-gl-worker.mjs', import.meta.url)` — resolved against the
// bundle, i.e. /assets/. That template-literal URL is invisible to Vite's static
// asset analysis, so the worker is never emitted and 404s in a build; the map
// then renders markers over a blank basemap with no error. Dev only works
// because the file happens to sit next to the module in node_modules. Copy it
// (and the shared chunk it imports) next to the bundle ourselves.
function maplibreWorker(): Plugin {
  const dist = path.join(maplibreRoot, 'dist')
  return {
    name: 'maplibre-worker-assets',
    apply: 'build',
    generateBundle(_options, _bundle) {
      for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
        this.emitFile({
          type: 'asset',
          fileName: `${assetsDir}/${file}`,
          source: fs.readFileSync(path.join(dist, file), 'utf8'),
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), maplibreWorker()],
  build: { assetsDir },
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
