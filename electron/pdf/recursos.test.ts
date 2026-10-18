import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { ConfiguracionSello } from '../../shared/types/configuracion'
import { armarRecursos } from './recursos'

const carpetasTemporales: string[] = []

afterEach(async () => {
  await Promise.all(carpetasTemporales.splice(0).map((carpeta) =>
    fs.rm(carpeta, { recursive: true, force: true }),
  ))
})

async function crearImagen(nombre: string, contenido: string): Promise<string> {
  const carpeta = await fs.mkdtemp(path.join(os.tmpdir(), 'recursos-sello-'))
  carpetasTemporales.push(carpeta)
  const ruta = path.join(carpeta, nombre)
  await fs.writeFile(ruta, contenido)
  return ruta
}

function configuracionSello(
  rutaConFirma: string,
  rutaSinFirma: string,
  selloActivoId: number,
): ConfiguracionSello {
  return {
    personaFirmante: 'Directora',
    cargoFirmante: 'Directora',
    rutaSelloConFirma: rutaConFirma,
    rutaSelloSinFirma: rutaSinFirma,
    selloActivoId,
    sellos: [
      {
        id: 1,
        nombre: 'Con firma',
        rutaImagen: rutaConFirma,
        incluyeFirma: true,
        fechaActualizacion: '',
      },
      {
        id: 2,
        nombre: 'En blanco',
        rutaImagen: rutaSinFirma,
        incluyeFirma: false,
        fechaActualizacion: '',
      },
    ],
  }
}

describe('armarRecursos', () => {
  it('carga únicamente el sello activo aunque haya otro con firma disponible', async () => {
    const rutaConFirma = await crearImagen('con-firma.png', 'imagen-firmada')
    const rutaSinFirma = await crearImagen('sin-firma.png', 'imagen-en-blanco')
    const { recursos } = await armarRecursos(
      path.join(os.tmpdir(), 'resources-no-disponibles'),
      configuracionSello(rutaConFirma, rutaSinFirma, 2),
    )

    expect(recursos.selloConFirma).toBeNull()
    expect(recursos.selloSinFirma).toBe(
      `data:image/png;base64,${Buffer.from('imagen-en-blanco').toString('base64')}`,
    )
  })

  it('no sustituye un sello activo ausente por otro sello del catálogo', async () => {
    const rutaConFirma = await crearImagen('con-firma.png', 'imagen-firmada')
    const rutaSinFirma = await crearImagen('sin-firma.png', 'imagen-en-blanco')
    const configuracion = configuracionSello(rutaConFirma, rutaSinFirma, 99)
    const { recursos, advertencias } = await armarRecursos(
      path.join(os.tmpdir(), 'resources-no-disponibles'),
      configuracion,
    )

    expect(recursos.selloConFirma).toBeNull()
    expect(recursos.selloSinFirma).toBeNull()
    expect(advertencias).toContain(
      'El sello activo no se encontró en el catálogo; revisa la configuración de plantillas.',
    )
  })
})
