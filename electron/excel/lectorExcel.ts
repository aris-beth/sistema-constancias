import * as XLSX from 'xlsx'
import fs from 'node:fs'
import type { FilaExcelCruda } from '../../shared/types/excel'

/**
 * Encabezados esperados, ya normalizados (mayúsculas, sin acentos, un solo
 * espacio entre palabras) → nombre del campo interno. Incluye alias comunes
 * porque en la práctica los encabezados varían ligeramente entre archivos
 * de distintos eventos (con/sin espacios alrededor de "/", con/sin acento).
 */
const MAPA_ENCABEZADOS: Record<string, keyof FilaExcelCruda> = {
  'GRADO ACADEMICO/NOMBRE COMPLETO': 'nombreCompleto',
  'GRADO ACADEMICO / NOMBRE COMPLETO': 'nombreCompleto',
  'NOMBRE COMPLETO': 'nombreCompleto',
  'PARTICIPA COMO': 'participaComo',
  'NOMBRE DE LA PONENCIA': 'nombrePonencia',
  'NOMBRE DEL EVENTO': 'nombreEvento',
  'FECHA DE LA CONSTANCIA': 'fechaConstancia',
  'UNIVERSIDAD DE ORIGEN': 'universidadOrigen',
  MODALIDAD: 'modalidad',
  'TEXTO / CONSTANCIA PERSONALIZADA': 'textoPersonalizado',
  'TEXTO/CONSTANCIA PERSONALIZADA': 'textoPersonalizado',
  CATEGORIA: 'categoria',
}

// Sin estas columnas, no podemos ni validar ni generar la constancia —
// las demás (ponencia, universidad de origen, texto personalizado,
// categoría) son legítimamente opcionales según tu tabla de mapeo.
const CAMPOS_OBLIGATORIOS: Array<keyof FilaExcelCruda> = [
  'nombreCompleto',
  'participaComo',
  'nombreEvento',
  'fechaConstancia',
  'universidadOrigen',
  'modalidad',
  'categoria',
]

function normalizarEncabezado(encabezado: string): string {
  return encabezado
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function convertirFechaACadena(valor: unknown): string {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10)
  }

  if (typeof valor === 'number' && Number.isFinite(valor)) {
    const fecha = XLSX.SSF.parse_date_code(valor)
    if (fecha) {
      return [fecha.y, String(fecha.m).padStart(2, '0'), String(fecha.d).padStart(2, '0')].join('-')
    }
  }

  return String(valor ?? '').trim()
}

/**
 * Lee un archivo .xlsx y lo convierte en un arreglo de filas tipadas.
 * Lanza errores descriptivos (en vez de devolver datos a medias) cuando
 * el archivo no existe, no es un Excel válido, o le faltan columnas
 * obligatorias — así el resto del sistema nunca procesa datos incompletos
 * sin que la persona operadora se entere.
 */
export function leerArchivoExcel(rutaArchivo: string): FilaExcelCruda[] {
  if (!fs.existsSync(rutaArchivo)) {
    throw new Error(`No se encontró el archivo: ${rutaArchivo}`)
  }

  let libro: XLSX.WorkBook
  try {
    libro = XLSX.readFile(rutaArchivo, { cellDates: true })
  } catch (error) {
    throw new Error(
      `El archivo no pudo leerse como Excel válido: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }

  const nombreHoja = libro.SheetNames[0]
  if (!nombreHoja) {
    throw new Error('El archivo de Excel no contiene ninguna hoja.')
  }
  const hoja = libro.Sheets[nombreHoja]

  // header: 1 → cada fila como arreglo de celdas en vez de objetos con
  // llaves adivinadas por SheetJS. Nos da control total sobre el mapeo
  // de columnas, en vez de depender de que SheetJS interprete bien los
  // encabezados por su cuenta.
  const filasCrudas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: '' })

  if (filasCrudas.length === 0) {
    throw new Error('El archivo de Excel está vacío.')
  }

  const encabezadosOriginales = filasCrudas[0] as unknown[]
  const indicePorCampo = new Map<keyof FilaExcelCruda, number>()

  encabezadosOriginales.forEach((encabezado, indice) => {
    const clave = normalizarEncabezado(String(encabezado ?? ''))
    const campo = MAPA_ENCABEZADOS[clave]
    if (campo) {
      indicePorCampo.set(campo, indice)
    }
  })

  const camposFaltantes = CAMPOS_OBLIGATORIOS.filter((campo) => !indicePorCampo.has(campo))
  if (camposFaltantes.length > 0) {
    throw new Error(
      `El archivo de Excel no tiene las columnas esperadas: ${camposFaltantes.join(', ')}. ` +
        'Revisa que los encabezados coincidan con la plantilla estándar del evento.',
    )
  }

  const filas: FilaExcelCruda[] = []

  for (let i = 1; i < filasCrudas.length; i++) {
    const filaCruda = filasCrudas[i] as unknown[]
    const numeroFila = i + 1 // +1 porque la fila 1 (índice 0) es el encabezado

    // Filas completamente vacías (frecuentes al final del archivo) se
    // ignoran en silencio; no son un error, solo relleno del Excel.
    const estaVacia = filaCruda.every((celda) => String(celda ?? '').trim() === '')
    if (estaVacia) continue

    const obtenerCelda = (campo: keyof FilaExcelCruda): string => {
      const indice = indicePorCampo.get(campo)
      if (indice === undefined) return ''
      const valor = filaCruda[indice]
      return campo === 'fechaConstancia' ? convertirFechaACadena(valor) : String(valor ?? '').trim()
    }

    filas.push({
      numeroFila,
      nombreCompleto: obtenerCelda('nombreCompleto'),
      participaComo: obtenerCelda('participaComo'),
      nombrePonencia: obtenerCelda('nombrePonencia') || null,
      nombreEvento: obtenerCelda('nombreEvento'),
      fechaConstancia: obtenerCelda('fechaConstancia'),
      universidadOrigen: obtenerCelda('universidadOrigen') || null,
      modalidad: obtenerCelda('modalidad'),
      textoPersonalizado: obtenerCelda('textoPersonalizado') || null,
      categoria: obtenerCelda('categoria') || null,
    })
  }

  return filas
}
