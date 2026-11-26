import * as XLSX from 'xlsx'
import fs from 'node:fs'
import type { FilaExcelCrudaGraduacion } from '../../shared/types/excel'

const MAPA_ENCABEZADOS: Record<string, keyof FilaExcelCrudaGraduacion> = {
  'NOMBRE COMPLETO': 'nombreCompleto',
  'SUBTIPO': 'subtipo',
  'GENERACION': 'generacion',
  'CARRERA': 'carrera',
  'FECHA': 'fecha',
  'FECHA DE RECONOCIMIENTO': 'fecha',
}

const CAMPOS_OBLIGATORIOS: Array<keyof FilaExcelCrudaGraduacion> = [
  'nombreCompleto',
  'subtipo',
  'generacion',
  'fecha',
]

function normalizarEncabezado(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function convertirFechaACadena(valor: unknown): string {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10)
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    const fecha = XLSX.SSF.parse_date_code(valor)
    if (fecha) {
      return `${fecha.y}-${String(fecha.m).padStart(2, '0')}-${String(fecha.d).padStart(2, '0')}`
    }
  }
  return String(valor ?? '').trim()
}

export function leerArchivoExcelGraduacion(rutaArchivo: string): FilaExcelCrudaGraduacion[] {
  if (!fs.existsSync(rutaArchivo)) throw new Error(`No se encontró el archivo: ${rutaArchivo}`)

  let libro: XLSX.WorkBook
  try {
    libro = XLSX.readFile(rutaArchivo, { cellDates: true })
  } catch (error) {
    throw new Error(`El archivo no pudo leerse como Excel válido: ${error instanceof Error ? error.message : String(error)}`)
  }

  const nombreHoja = libro.SheetNames[0]
  if (!nombreHoja) throw new Error('El archivo de Excel no contiene ninguna hoja.')
  const filas = XLSX.utils.sheet_to_json<unknown[]>(libro.Sheets[nombreHoja], {
    header: 1,
    defval: '',
  })
  if (filas.length === 0) throw new Error('El archivo de Excel está vacío.')

  const indices = new Map<keyof FilaExcelCrudaGraduacion, number>()
  ;(filas[0] as unknown[]).forEach((encabezado, indice) => {
    const campo = MAPA_ENCABEZADOS[normalizarEncabezado(String(encabezado ?? ''))]
    if (campo) indices.set(campo, indice)
  })

  const faltantes = CAMPOS_OBLIGATORIOS.filter((campo) => !indices.has(campo))
  if (faltantes.length > 0) {
    throw new Error(`El Excel de graduación no tiene las columnas esperadas: ${faltantes.join(', ')}.`)
  }

  const resultado: FilaExcelCrudaGraduacion[] = []
  for (let indiceFila = 1; indiceFila < filas.length; indiceFila += 1) {
    const fila = filas[indiceFila] as unknown[]
    if (fila.every((celda) => String(celda ?? '').trim() === '')) continue
    const obtener = (campo: keyof FilaExcelCrudaGraduacion): string => {
      const indice = indices.get(campo)
      if (indice === undefined) return ''
      const valor = fila[indice]
      return campo === 'fecha' ? convertirFechaACadena(valor) : String(valor ?? '').trim()
    }
    resultado.push({
      numeroFila: indiceFila + 1,
      nombreCompleto: obtener('nombreCompleto'),
      subtipo: obtener('subtipo'),
      generacion: obtener('generacion'),
      carrera: obtener('carrera'),
      fecha: obtener('fecha'),
    })
  }
  return resultado
}
