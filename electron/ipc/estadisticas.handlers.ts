import { ipcMain } from 'electron'
import { consultarEstadisticas } from '../db/repositories/estadisticas.repository'
import type { EstadisticasEntrada, EstadisticasResultado, FiltrosEstadisticas } from '../../shared/types/ipc'

function filtrosVacios(): FiltrosEstadisticas {
  return { fechaDesde: null, fechaHasta: null, folioEvento: null }
}

export function registrarManejadorEstadisticas(): void {
  ipcMain.handle(
    'estadisticas:consultar',
    (_evento, entrada?: EstadisticasEntrada): EstadisticasResultado => {
      const filtros = entrada?.filtros ?? filtrosVacios()
      const comparacion = entrada?.comparacion
        ? {
            periodoA: consultarEstadisticas({ ...filtros, ...entrada.comparacion.periodoA, folioEvento: null }),
            periodoB: consultarEstadisticas({ ...filtros, ...entrada.comparacion.periodoB, folioEvento: null }),
          }
        : null
      return { actual: consultarEstadisticas(filtros), comparacion }
    },
  )
}