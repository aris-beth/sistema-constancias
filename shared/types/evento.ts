export type Modalidad = 'Presencial CU' | 'Presencial CU2' | 'En línea' | 'Otro'
export type TipoPlantilla = 'regular' | 'graduacion'

export interface Evento {
  id: number
  folio: string
  nombreEvento: string
  fechaConstancia: string
  modalidad: Modalidad
  tipoPlantilla: TipoPlantilla
  generacion: string | null
  carrera: string | null
  rutaQr: string | null
}

// Para crear un evento nuevo todavía no existe el id (lo asigna SQLite).
export type EventoNuevo = Omit<Evento, 'id'>
