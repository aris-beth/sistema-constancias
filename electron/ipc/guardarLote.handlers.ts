import { ipcMain } from 'electron'
import { guardarLoteRegular } from '../db/repositories/lote.repository'
import { generarFolioAutomatico } from '../db/repositories/folio.repository'
import type { GuardarLoteEntrada, GuardarLoteResultado, PrevisualizarFolioEntrada } from '../../shared/types/ipc'

function validarEntrada(entrada: GuardarLoteEntrada): void {
  if (!entrada || typeof entrada !== 'object') {
    throw new Error('La solicitud de guardado no es válida.')
  }
  if (entrada.folioEvento != null && typeof entrada.folioEvento !== 'string') {
    throw new Error('El folio del evento no es válido.')
  }
  if (!Array.isArray(entrada.filas)) {
    throw new Error('La solicitud no contiene filas para guardar.')
  }
}

export function registrarManejadorGuardarLote(): void {
  ipcMain.handle(
    'excel:guardarLote',
    async (_evento, entrada: GuardarLoteEntrada): Promise<GuardarLoteResultado> => {
      validarEntrada(entrada)
      try {
        return guardarLoteRegular(entrada.folioEvento, entrada.filas)
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    },
  )

  // Vista previa (sin guardar nada) del folio que se generaría para un evento.
  ipcMain.handle('folio:previsualizar', (_evento, entrada: PrevisualizarFolioEntrada): string | null => {
    const nombre = entrada?.nombreEvento?.trim()
    const fecha = entrada?.fecha?.trim()
    if (!nombre || !fecha) return null
    try {
      return generarFolioAutomatico(nombre, fecha)
    } catch {
      return null // fecha sin año reconocible, etc.
    }
  })
}
