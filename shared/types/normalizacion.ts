export type NivelConfianza = 'alta' | 'baja'

export interface ResultadoNormalizacion {
  nombreNormalizado: string
  gradoDetectado: string | null
  confianza: NivelConfianza
}
