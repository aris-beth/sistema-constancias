/**
 * Carga de recursos para las plantillas (fuentes, logo, firma, sello) y
 * conversión a data URI. No depende de Electron: recibe la carpeta
 * `resources/` como parámetro (ver `carpetaResources()` en generarPdf.ts).
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ConfiguracionSello } from '../../shared/types/configuracion'
import type { RecursosDocumento } from './plantillaDocumento'

const TIPOS_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

const FUENTES: Array<{ archivo: string; peso: number }> = [
  { archivo: 'source-sans-3-latin-400-normal.woff2', peso: 400 },
  { archivo: 'source-sans-3-latin-600-normal.woff2', peso: 600 },
  { archivo: 'source-sans-3-latin-700-normal.woff2', peso: 700 },
  { archivo: 'source-sans-3-latin-900-normal.woff2', peso: 900 },
]

export async function leerImagenComoDataUri(ruta: string): Promise<string | null> {
  const tipo = TIPOS_MIME[path.extname(ruta).toLowerCase()]
  if (!tipo) return null
  try {
    const contenido = await fs.readFile(ruta)
    return `data:${tipo};base64,${contenido.toString('base64')}`
  } catch {
    return null
  }
}

export interface RecursosBase {
  fuentesCss: string
  logo: string | null
  advertencias: string[]
}

let cacheBase: { carpeta: string; recursos: RecursosBase } | null = null

/** Fuentes + logo institucional. Se leen una vez y se reutilizan. */
export async function cargarRecursosBase(carpetaResources: string): Promise<RecursosBase> {
  if (cacheBase?.carpeta === carpetaResources) return cacheBase.recursos

  const advertencias: string[] = []
  const reglas: string[] = []
  for (const fuente of FUENTES) {
    try {
      const contenido = await fs.readFile(path.join(carpetaResources, 'fonts', fuente.archivo))
      reglas.push(
        `@font-face{font-family:'Source Sans Pro';font-weight:${fuente.peso};font-style:normal;` +
          `src:url(data:font/woff2;base64,${contenido.toString('base64')}) format('woff2');}`,
      )
    } catch {
      advertencias.push(`No se encontró la fuente ${fuente.archivo}; se usará una fuente de respaldo.`)
    }
  }

  let logo: string | null = null
  for (const nombre of ['logo-buap.svg', 'logo-buap.png']) {
    logo = await leerImagenComoDataUri(path.join(carpetaResources, nombre))
    if (logo) break
  }
  if (!logo) advertencias.push('No se encontró resources/logo-buap.svg ni logo-buap.png; el documento saldrá sin logo.')

  const recursos = { fuentesCss: reglas.join('\n'), logo, advertencias }
  // Solo se cachea si no faltó nada, para que corregir un archivo no exija reiniciar la app.
  if (advertencias.length === 0) cacheBase = { carpeta: carpetaResources, recursos }
  return recursos
}

export interface RecursosCompletos {
  recursos: RecursosDocumento
  advertencias: string[]
}

/** Recursos base + firma y sello de la configuración vigente. */
export async function armarRecursos(
  carpetaResources: string,
  sello: ConfiguracionSello | null,
): Promise<RecursosCompletos> {
  const base = await cargarRecursosBase(carpetaResources)
  const advertencias = [...base.advertencias]

  let selloConFirma: string | null = null
  let selloSinFirma: string | null = null
  if (sello) {
    selloConFirma = sello.rutaSelloConFirma ? await leerImagenComoDataUri(sello.rutaSelloConFirma) : null
    if (sello.rutaSelloConFirma && !selloConFirma) {
      advertencias.push(`No se pudo leer el sello con firma (${sello.rutaSelloConFirma}).`)
    }
    selloSinFirma = sello.rutaSelloSinFirma ? await leerImagenComoDataUri(sello.rutaSelloSinFirma) : null
    if (sello.rutaSelloSinFirma && !selloSinFirma) {
      advertencias.push(`No se pudo leer el sello en blanco (${sello.rutaSelloSinFirma}).`)
    }
  }

  return {
    recursos: { fuentesCss: base.fuentesCss, logo: base.logo, selloConFirma, selloSinFirma },
    advertencias,
  }
}
