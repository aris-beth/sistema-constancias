import { ipcMain } from 'electron'
import {
  guardarCorreccionConstancia,
  listarConstanciasParaCorreccion,
} from '../db/repositories/correccion.repository'
import type { GuardarCorreccionConstanciaEntrada } from '../../shared/types/ipc'

export function registrarManejadoresCorrecciones(): void {
  ipcMain.handle('constancia:listarCorrecciones', (_evento, folioEvento: string) =>
    listarConstanciasParaCorreccion(folioEvento),
  )

  ipcMain.handle(
    'constancia:guardarCorreccion',
    (_evento, entrada: GuardarCorreccionConstanciaEntrada) =>
      guardarCorreccionConstancia(entrada),
  )
}
