export type TipoDocumento = 'constancia' | 'reconocimiento'

/**
 * 'generada': el registro de la constancia ya quedó persistido con su texto
 * final decidido — se asigna en el momento en que se guarda exitosamente en
 * la base de datos, no cuando el archivo PDF físico se escribe en disco.
 * Esto es lo que debe usar el conteo de la 7ª constancia (sección 5.3 de
 * requerimientos): dentro de un mismo lote, cada fila válida debe contar
 * para las siguientes filas de la misma persona en el mismo evento tan
 * pronto se procesa, sin esperar a que termine el renderizado de PDFs de
 * todo el lote.
 *
 * 'pendiente' queda reservado para el caso, poco común, de que la escritura
 * del PDF falle DESPUÉS de que el registro ya se creó (por ejemplo, un
 * problema de disco durante printToPDF): esa constancia puede marcarse de
 * vuelta a 'pendiente' para reintentarse sin haber contado ya hacia el
 * conteo de otra persona. Las filas que ni siquiera pasan la validación del
 * Excel (rol no reconocido, dato faltante, etc.) nunca llegan a crear un
 * registro aquí — se reportan como pendientes solo en la vista previa,
 * conforme al criterio de aceptación #8.
 */
export type EstadoConstancia = 'pendiente' | 'generada'

export interface Constancia {
  id: number
  eventoId: number
  rolId: number
  ponencia: string | null
  textoGenerado: string
  esPersonalizado: boolean
  tipoDocumento: TipoDocumento
  numeroParaPersonaEvento: number
  fechaGeneracion: string
  /** Identificador único por documento (sección 2.1 de requerimientos),
   * distinto del folio del evento. Formato: "{folioEvento}-{consecutivo}". */
  folioInterno: string
  estado: EstadoConstancia
}

export type ConstanciaNueva = Omit<Constancia, 'id'>

// Al crear una constancia hay que decir a qué participantes pertenece
// (uno solo en el caso normal; varios cuando la fila del Excel tenía
// varios nombres separados por comas).
export interface ConstanciaConParticipantes {
  constancia: ConstanciaNueva
  participanteIds: number[]
}
