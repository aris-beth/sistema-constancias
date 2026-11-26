import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { obtenerBaseDeDatos, cerrarBaseDeDatos } from './db/connection'
import { registrarManejadoresExcel } from './ipc/excel.handlers'
import { registrarManejadorCargarGraduacion } from './ipc/graduacion.handlers'
import { ipcMain } from 'electron'
import { guardarLoteGraduacion } from './db/repositories/graduacion.repository'
import type { GuardarGraduacionEntrada } from '../shared/types/ipc'
import { registrarManejadorGuardarLote } from './ipc/guardarLote.handlers'
import { registrarManejadorGenerarPdfs } from './ipc/pdf.handlers'
import { registrarManejadoresEvento } from './ipc/evento.handlers'
import { registrarManejadoresConfiguracion } from './ipc/configuracion.handlers'
import { registrarManejadorEstadisticas } from './ipc/estadisticas.handlers'
import { registrarManejadoresCorrecciones } from './ipc/correcciones.handlers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Sin esto, un error que ocurra fuera de un try/catch (por ejemplo, dentro
// de un evento de Electron) puede matar el proceso completo sin mostrar
// nada en la terminal. Vale la pena dejarlo permanentemente, no solo para
// depurar: es la red de seguridad que evita fallos silenciosos en producción.
process.on('uncaughtException', (error) => {
  console.error('[main] Excepción no capturada:', error)
})
process.on('unhandledRejection', (motivo) => {
  console.error('[main] Promesa rechazada sin manejar:', motivo)
})

// En desarrollo, Vite sirve el renderer en esta URL (servidor local).
// En producción (app empaquetada), cargamos el HTML ya compilado desde disco.
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let ventanaPrincipal: BrowserWindow | null = null

function crearVentanaPrincipal(): void {
  ventanaPrincipal = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      // preload.js corre ANTES de que se cargue la página web, con acceso
      // limitado y controlado a Node.js. Es el único puente permitido
      // entre el renderer (React) y el main (sistema operativo).
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // aísla el contexto de la página del contexto de Node
      nodeIntegration: false, // el renderer NUNCA debe poder hacer require() directo
    },
  })

  ventanaPrincipal.webContents.on('did-fail-load', (_evento, codigo, descripcion) => {
    console.error(`[main] La ventana falló al cargar contenido: (${codigo}) ${descripcion}`)
  })

  if (VITE_DEV_SERVER_URL) {
    ventanaPrincipal.loadURL(VITE_DEV_SERVER_URL)
    ventanaPrincipal.webContents.openDevTools()
  } else {
    ventanaPrincipal.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  try {
    obtenerBaseDeDatos()
  } catch (error) {
    // Sin base de datos la app no puede operar: lo dejamos visible en
    // consola. Más adelante (módulo de UI) esto se mostrará también
    // como un diálogo de error al usuario en vez de solo en consola.
    console.error('[main] Error al inicializar la base de datos:', error)
  }

  registrarManejadoresExcel()
  registrarManejadorCargarGraduacion()
  ipcMain.handle('excel:guardarGraduacion', (_evento, entrada: GuardarGraduacionEntrada) => {
    if (!entrada || typeof entrada !== 'object' || !Array.isArray(entrada.filas)) {
      throw new Error('La solicitud de guardado de graduación no es válida.')
    }
    if (entrada.folioEvento != null && typeof entrada.folioEvento !== 'string') {
      throw new Error('El folio del evento no es válido.')
    }
    if (entrada.modo !== undefined && !['nuevo', 'agregar', 'reemplazar'].includes(entrada.modo)) {
      throw new Error('El modo de guardado no es válido.')
    }
    return guardarLoteGraduacion(entrada.folioEvento, entrada.filas, entrada.modo)
  })
  registrarManejadorGuardarLote()
  registrarManejadorGenerarPdfs()
  registrarManejadoresEvento()
  registrarManejadoresConfiguracion()
  registrarManejadorEstadisticas()
  registrarManejadoresCorrecciones()

  crearVentanaPrincipal()

  app.on('activate', () => {
    // Comportamiento estándar en macOS; en Windows no afecta.
    if (BrowserWindow.getAllWindows().length === 0) {
      crearVentanaPrincipal()
    }
  })
})

app.on('window-all-closed', () => {
  cerrarBaseDeDatos()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
