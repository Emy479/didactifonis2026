import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),

    // MEDIO-1: Sirve client/dev-stubs/ como rutas /__dev-stubs/* SOLO en el dev-server.
    // Este plugin NO existe en el build de producción — los archivos de dev-stubs nunca
    // llegan a dist/ porque no están en /public ni son importados por el grafo de módulos.
    // Criterio de aceptación: `npm run build` no incluye sdk-stub.html en dist/.
    {
      name: 'dev-stubs-middleware',
      apply: 'serve',  // solo activo en `vite dev`, no en `vite build`
      configureServer(server) {
        const stubsDir = path.resolve(__dirname, 'dev-stubs')
        server.middlewares.use('/__dev-stubs', (req, res, next) => {
          // Sanitizar la ruta para evitar path traversal
          const fileName = path.basename(req.url.split('?')[0])
          const filePath = path.join(stubsDir, fileName)

          if (!filePath.startsWith(stubsDir)) {
            res.statusCode = 403
            res.end('Forbidden')
            return
          }

          fs.readFile(filePath, (err, data) => {
            if (err) {
              next()
              return
            }
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(data)
          })
        })
      },
    },
  ],

  resolve: {
    alias: {
      // Permite importar desde '/shared' sin salir del root de Vite.
      // Usado por GameHost.jsx para consumir EVENT_TYPES, CONTRACT_VERSION
      // y EVENTS_INGEST_CAP sin duplicar los literales (ADR-SDK-05, DEP-3).
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },

  // MEDIO-2: Acotar server.fs.allow a la ruta mínima necesaria.
  // El único módulo fuera de /client que se importa es @shared (alias arriba).
  // Antes era ['..'] (todo el monorepo) — reducido a solo el directorio /shared.
  server: {
    fs: {
      allow: [path.resolve(__dirname, '../shared')],
    },
  },
})
