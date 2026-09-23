export type Categoria = 'Maestro BUAP' | 'Alumno BUAP' | 'Externo'

export interface Participante {
  id: number
  nombreOriginal: string
  nombreNormalizado: string
  gradoAcademico: string | null
  categoria: Categoria | null
  universidadOrigen: string | null
}

export type ParticipanteNuevo = Omit<Participante, 'id'>
