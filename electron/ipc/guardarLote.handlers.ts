import { ipcMain } from 'electron'
import { guardarLoteRegular } from '../db/repositories/lote.repository'
import type { GuardarLoteEntrada, GuardarLoteResultado } from '../../shared/types/ipc'

function validarEntrada(entrada: GuardarLoteEntrada): void {
  if (!entrada || typeof entrada !== 'object') {
    throw new Error('La solicitud de guardado no es válida.')
  }
  if (typeof entrada.folioEvento !== 'string' || !entrada.folioEvento.trim()) {
    throw new Error('El folio del evento es obligatorio.')
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
}