import { ipcMain, dialog } from 'electron'
import path from 'node:path'
import { leerArchivoExcel } from '../excel/lectorExcel'
import { normalizarNombre } from '../business/normalizarNombre'
import { construirMapaAbreviaturas } from '../business/catalogos/abreviaturasAcademicas'
import { listarAbreviaturas } from '../db/repositories/abreviaturaAcademica.repository'
import {
  formatearFechaConstancia,
  validarFilaExcel,
} from '../business/validacion/validarFilaExcel'
import {
  generarTextoConstancia,
  ROLES_RECONOCIDOS,
} from '../business/reglasRedaccion/generarTextoConstancia'
import { inferirArticuloEvento } from '../business/reglasRedaccion/articuloEvento'
import type { FilaExcelCruda } from '../../shared/types/excel'
import type { FilaProcesada, ResultadoCargaExcel } from '../../shared/types/ipc'

/**
 * Normaliza una sola fila cruda. Si normalizarNombre lanza un error (por
 * ejemplo, nombre vacío después de quitar palabras no válidas), la fila
 * se devuelve marcada con ese error en vez de detener el resto del lote
 * — así una fila problemática no bloquea las otras 542.
 */
function procesarFila(
  filaCruda: FilaExcelCruda,
  catalogo: Map<string, string>,
  rolesReconocidos: Iterable<string>,
): FilaProcesada {
  const base = {
    numeroFila: filaCruda.numeroFila,
    nombreOriginal: filaCruda.nombreCompleto,
    participaComo: filaCruda.participaComo,
    nombrePonencia: filaCruda.nombrePonencia,
    nombreEvento: filaCruda.nombreEvento,
    fechaConstancia: formatearFechaConstancia(filaCruda.fechaConstancia),
    duracion: filaCruda.duracion,
    universidadOrigen: filaCruda.universidadOrigen,
    modalidad: filaCruda.modalidad,
    textoPersonalizado: filaCruda.textoPersonalizado,
    categoria: filaCruda.categoria,
    // El artículo elegido en pantalla manda; si no hay, se propone por el nombre.
    articuloEvento: filaCruda.articuloEvento ?? inferirArticuloEvento(filaCruda.nombreEvento),
    textoGenerado: null,
    esPersonalizado: false,
    universidadExterna: null,
  }

  try {
    const resultadoValidacion = validarFilaExcel(filaCruda, rolesReconocidos)
    if (!resultadoValidacion.valida) {
      throw new Error(resultadoValidacion.errores.join(' '))
    }

    const normalizado = normalizarNombre(filaCruda.nombreCompleto, catalogo)
    const texto = generarTextoConstancia({
      participaComo: filaCruda.participaComo,
      nombreEvento: filaCruda.nombreEvento,
      articuloEvento: base.articuloEvento,
      modalidad: filaCruda.modalidad as Parameters<typeof generarTextoConstancia>[0]['modalidad'],
      nombrePonencia: filaCruda.nombrePonencia,
      fechaConstancia: filaCruda.fechaConstancia,
      duracion: filaCruda.duracion,
      textoPersonalizado: filaCruda.textoPersonalizado,
      universidadOrigen: filaCruda.universidadOrigen,
    })
    return {
      ...base,
      nombreNormalizado: normalizado.nombreNormalizado,
      gradoDetectado: normalizado.gradoDetectado,
      textoGenerado: texto.textoGenerado,
      esPersonalizado: texto.esPersonalizado,
      universidadExterna: texto.universidadExterna,
      confianza: normalizado.confianza,
      error: null,
    }
  } catch (error) {
    return {
      ...base,
      nombreNormalizado: null,
      gradoDetectado: null,
      textoGenerado: null,
      esPersonalizado: false,
      universidadExterna: null,
      confianza: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/** Abreviaturas vigentes para normalizar los nombres de participantes. */
function obtenerContextoRegular(): { catalogo: Map<string, string> } {
  const catalogo = construirMapaAbreviaturas(
    listarAbreviaturas().map((entrada) => ({
      formaEncontrada: entrada.formaEncontrada,
      abreviaturaAceptada: entrada.abreviaturaAceptada,
    })),
  )
  return { catalogo }
}

/**
 * Registra el canal IPC "excel:cargar". Se llama una sola vez al arrancar
 * la app (ver main.ts) — después, React lo invoca cada vez que la persona
 * usuaria hace clic en "Cargar Excel".
 */
export function registrarManejadoresExcel(): void {
  ipcMain.handle('excel:cargar', async (): Promise<ResultadoCargaExcel | null> => {
    const resultadoDialogo = await dialog.showOpenDialog({
      title: 'Selecciona el archivo de Excel del evento',
      filters: [{ name: 'Archivos de Excel', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile'],
    })

    if (resultadoDialogo.canceled || resultadoDialogo.filePaths.length === 0) {
      return null
    }

    const rutaArchivo = resultadoDialogo.filePaths[0]
    const filasCrudas = leerArchivoExcel(rutaArchivo)

    // Las abreviaturas guardadas complementan el catálogo base. Los roles
    // reconocidos se derivan de las plantillas que el generador puede usar.
    const entradasGuardadas = listarAbreviaturas().map((entrada) => ({
      formaEncontrada: entrada.formaEncontrada,
      abreviaturaAceptada: entrada.abreviaturaAceptada,
    }))
    const catalogo = construirMapaAbreviaturas(entradasGuardadas)

    const filas = filasCrudas.map((filaCruda) =>
      procesarFila(filaCruda, catalogo, ROLES_RECONOCIDOS),
    )

    return {
      nombreArchivo: path.basename(rutaArchivo),
      filas,
    }
  })

  // Vuelve a validar/normalizar filas ya cargadas después de que la persona
  // las corrigió en pantalla ("Actualizar cambios").
  ipcMain.handle('excel:revalidar', (_evento, filas: FilaExcelCruda[]): FilaProcesada[] => {
    if (!Array.isArray(filas)) throw new Error('La solicitud de revalidación no es válida.')
    const { catalogo } = obtenerContextoRegular()
    return filas.map((fila) => procesarFila(fila, catalogo, ROLES_RECONOCIDOS))
  })
}
