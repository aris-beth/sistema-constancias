export type Modalidad = 'Presencial CU' | 'Presencial CU2' | 'En línea' | 'Otro'
export type TipoPlantilla = 'regular' | 'graduacion'

/** Formas de insertar el nombre del evento según el rol y su redacción. */
export const ARTICULOS_EVENTO = ['del', 'de la', 'de los', 'de las', 'en el', 'en la'] as const
export type ArticuloEvento = (typeof ARTICULOS_EVENTO)[number]

export const FORMAS_EN_EVENTO = ['en el', 'en la'] as const
export type FormaEnEvento = (typeof FORMAS_EN_EVENTO)[number]

export interface Evento {
  id: number
  folio: string
  nombreEvento: string
  fechaConstancia: string
  modalidad: Modalidad
  tipoPlantilla: TipoPlantilla
  generacion: string | null
  carrera: string | null
  /** Forma confirmada para insertar el nombre del evento; null si no se eligió. */
  articuloEvento?: ArticuloEvento | null
}

// Para crear un evento nuevo todavía no existe el id (lo asigna SQLite).
export type EventoNuevo = Omit<Evento, 'id'>
