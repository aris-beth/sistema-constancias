import { ipcMain } from 'electron'
import { listarEventosReimprimibles } from '../db/repositories/evento.repository'
import type { TipoPlantilla } from '../../shared/types/evento'

export function registrarManejadoresEvento(): void {
  ipcMain.handle('evento:listarReimprimibles', (_evento, tipoPlantilla: TipoPlantilla) => {
    if (tipoPlantilla !== 'regular' && tipoPlantilla !== 'graduacion') {
      throw new Error('El tipo de evento solicitado no es válido.')
    }
    return listarEventosReimprimibles(tipoPlantilla)
  })
}
