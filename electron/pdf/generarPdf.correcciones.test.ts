import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Evento } from '../../shared/types/evento'
import type {
  ConfiguracionFirmantesGraduacion,
  ConfiguracionSello,
} from '../../shared/types/configuracion'
import type { DocumentoCorreccionPdf } from './generarPdf'

const rutas = vi.hoisted(() => ({
  raiz: `${process.cwd()}\\.tmp-pdf-correcciones`,
  paginasDesbordadas: [] as number[],
  impresiones: 0,
}))

vi.mock('electron', () => ({
  app: {
    getAppPath: () => path.join(rutas.raiz, 'app'),
    getPath: () => path.join(rutas.raiz, 'temp'),
  },
  BrowserWindow: class {
    webContents = {
      executeJavaScript: vi.fn(async () => {
        rutas.impresiones += 1
        return rutas.paginasDesbordadas
      }),
      printToPDF: vi.fn(async () => Buffer.from('pdf')),
    }
    loadFile = vi.fn(async () => undefined)
    isDestroyed = () => false
    destroy = vi.fn()
  },
}))

import { generarPdfsCorrecciones } from './generarPdf'

const evento: Evento = {
  id: 1,
  folio: 'EVT/001',
  nombreEvento: 'Evento de prueba',
  fechaConstancia: '19 de Octubre de 2026',
  modalidad: 'Presencial CU',
  tipoPlantilla: 'regular',
  generacion: null,
  carrera: null,
}

function documento(id: number, folioInterno: string): DocumentoCorreccionPdf {
  return {
    id,
    rol: 'Asistente',
    folioInterno,
    encabezado: 'CONSTANCIA',
    nombre: 'PEREZ JUAN',
    institucion: null,
    ponencia: null,
    texto: 'Texto corregido.',
    fecha: '19 de Octubre de 2026',
  }
}

const sello = {
  personaFirmante: '',
  cargoFirmante: '',
  rutaSelloConFirma: null,
  rutaSelloSinFirma: null,
} as unknown as ConfiguracionSello
const firmantes = {} as ConfiguracionFirmantesGraduacion

describe('generación de PDF de correcciones', () => {
  beforeEach(() => {
    fs.rmSync(rutas.raiz, { recursive: true, force: true })
    fs.mkdirSync(path.join(rutas.raiz, 'temp'), { recursive: true })
    rutas.paginasDesbordadas = []
    rutas.impresiones = 0
  })

  afterEach(() => {
    fs.rmSync(rutas.raiz, { recursive: true, force: true })
  })

  it('genera un solo PDF con todas las constancias bajo Correcciones y avisa desbordamientos', async () => {
    rutas.paginasDesbordadas = [0]
    const resultado = await generarPdfsCorrecciones(
      evento,
      [
        documento(12, 'EVT/001-0001'),
        documento(13, 'EVT/001-0002'),
      ],
      path.join(rutas.raiz, 'salida'),
      sello,
      firmantes,
    )

    expect(resultado.carpetaCorrecciones).toContain(`${path.sep}Correcciones`)
    expect(resultado.rutas).toHaveLength(1)
    expect(resultado.rutas.every((ruta) => fs.existsSync(ruta))).toBe(true)
    expect(resultado.rutas.every((ruta) => !ruta.includes(`${path.sep}PDFs${path.sep}`))).toBe(true)
    expect(path.basename(resultado.rutas[0])).toBe('Correcciones.pdf')
    expect(rutas.impresiones).toBe(1)
    expect(resultado.advertencias).toContain(
      'La corrección del folio interno "EVT/001-0001" del rol "Asistente" ' +
        'desborda el espacio disponible y podría aparecer recortada. Revisa el PDF.',
    )
    expect(resultado.errores).toHaveLength(0)
  })
})
