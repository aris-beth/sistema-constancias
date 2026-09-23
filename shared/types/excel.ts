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
}

export interface FilaExcelCrudaGraduacion {
  numeroFila: number
  nombreCompleto: string
  subtipo: string
  generacion: string
  carrera: string
  fecha: string
}
