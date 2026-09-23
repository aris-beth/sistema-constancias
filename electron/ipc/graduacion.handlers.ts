import { dialog, ipcMain } from 'electron'
import path from 'node:path'
import { leerArchivoExcelGraduacion } from '../excel/lectorExcelGraduacion'
import { normalizarNombre } from '../business/normalizarNombre'
import { construirMapaAbreviaturas } from '../business/catalogos/abreviaturasAcademicas'
import { formatearFechaConstancia } from '../business/validacion/validarFilaExcel'
import { validarFilaExcelGraduacion } from '../business/validacion/validarFilaExcelGraduacion'
import {
  generarTextoReconocimientoGraduacion,
  SUBTIPOS_GRADUACION_RECONOCIDOS,
} from '../business/reglasRedaccion/generarTextoReconocimientoGraduacion'
import { listarAbreviaturas } from '../db/repositories/abreviaturaAcademica.repository'
import { listarSubtiposGraduacion } from '../db/repositories/subtipoGraduacion.repository'
import type { FilaExcelCrudaGraduacion } from '../../shared/types/excel'
import type { FilaProcesadaGraduacion, ResultadoCargaGraduacion } from '../../shared/types/ipc'

function procesarFila(
  fila: FilaExcelCrudaGraduacion,
  catalogoAbreviaturas: Map<string, string>,
  subtipos: Array<{ nombreSubtipo: string; plantillaTexto: string }>,
): FilaProcesadaGraduacion {
  const base = {
    numeroFila: fila.numeroFila,
    nombreOriginal: fila.nombreCompleto,
    subtipo: fila.subtipo,
    generacion: fila.generacion,
    carrera: fila.carrera,
    fecha: formatearFechaConstancia(fila.fecha),
  }
  try {
    const validacion = validarFilaExcelGraduacion(
      fila,
      [...SUBTIPOS_GRADUACION_RECONOCIDOS, ...subtipos.map((subtipo) => subtipo.nombreSubtipo)],
    )
    if (!validacion.valida) throw new Error(validacion.errores.join(' '))

    const normalizado = normalizarNombre(fila.nombreCompleto, catalogoAbreviaturas)
    const subtipoCatalogado = subtipos.find(
      (subtipo) => subtipo.nombreSubtipo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() ===
        fila.subtipo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase(),
    )
    const texto = generarTextoReconocimientoGraduacion({
      subtipo: fila.subtipo,
      generacion: fila.generacion,
      carrera: fila.carrera,
      plantillaPersonalizada: subtipoCatalogado?.plantillaTexto,
    })
    return {
      ...base,
      nombreNormalizado: normalizado.nombreNormalizado,
      textoGenerado: texto.textoGenerado,
      confianza: normalizado.confianza,
      error: null,
    }
  } catch (error) {
    return {
      ...base,
      nombreNormalizado: null,
      textoGenerado: null,
      confianza: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export function registrarManejadorCargarGraduacion(): void {
  ipcMain.handle('excel:cargarGraduacion', async (): Promise<ResultadoCargaGraduacion | null> => {
    const dialogo = await dialog.showOpenDialog({
      title: 'Selecciona el archivo de graduación',
      filters: [{ name: 'Archivos de Excel', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile'],
    })
    if (dialogo.canceled || dialogo.filePaths.length === 0) return null

    const ruta = dialogo.filePaths[0]
    const filas = leerArchivoExcelGraduacion(ruta)
    const catalogo = construirMapaAbreviaturas(
      listarAbreviaturas().map((entrada) => ({
        formaEncontrada: entrada.formaEncontrada,
        abreviaturaAceptada: entrada.abreviaturaAceptada,
      })),
    )
    const subtipos = listarSubtiposGraduacion()
    return {
      nombreArchivo: path.basename(ruta),
      filas: filas.map((fila) => procesarFila(fila, catalogo, subtipos)),
    }
  })
}
