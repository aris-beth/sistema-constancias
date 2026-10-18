/**
 * Una fila del Excel de entrada, después de mapear los encabezados de
 * columna a nombres de campo (ver la tabla "Mapeo de archivos de entrada"
 * de tu TDD). Todos los valores son texto tal como vinieron del Excel —
 * la limpieza/normalización pasa en el siguiente paso (normalizarNombre,
 * validarFila, etc.), no aquí.
 */
export interface FilaExcelCruda {
  /** Número de fila real en el archivo Excel (para mensajes de error). */
  numeroFila: number
  nombreCompleto: string
  participaComo: string
  nombrePonencia: string | null
  nombreEvento: string
  fechaConstancia: string
  universidadOrigen: string | null
  modalidad: string
  textoPersonalizado: string | null
  categoria: string | null
  /**
   * Artículo elegido para el nombre del evento ("del", "de la"…). Es un dato
   * del lote, no del Excel: si viene vacío el sistema lo propone a partir del
   * nombre (ver `inferirArticuloEvento`).
   */
  articuloEvento?: import('./evento').ArticuloEvento | null
}

export interface FilaExcelCrudaGraduacion {
  numeroFila: number
  nombreCompleto: string
  subtipo: string
  generacion: string
  carrera: string
  fecha: string
}
