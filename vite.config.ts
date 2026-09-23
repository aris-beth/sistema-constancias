import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Leemos package.json para obtener la lista de dependencias de producción
// (react, better-sqlite3, etc.) y marcarlas todas como "externas": esto le
// dice a Rollup que NO intente empaquetar su código, sino dejarlas como un
// require() normal que Node resuelve en tiempo de ejecución. Es obligatorio
// para cualquier paquete con partes nativas compiladas (como better-sqlite3),
// porque un archivo .node binario no se puede "meter" dentro de un bundle.
const pkg = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf-8'))
const dependenciasExternas = Object.keys(pkg.dependencies ?? {})

// Este archivo conecta tres piezas:
// 1) el plugin de React, para que Vite entienda archivos .tsx
// 2) el plugin de Electron, que compila electron/main.ts y electron/preload.ts
//    y reinicia la ventana automáticamente cada vez que los editas
// 3) rutas de salida, para mantener separados el código del proceso "main"
//    (dist-electron/) del código del "renderer" (dist/)
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: dependenciasExternas,
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: dependenciasExternas,
            },
          },
        },
      },
      renderer: {},
    }),
  ],
})
