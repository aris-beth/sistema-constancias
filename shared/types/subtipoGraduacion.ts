/**
 * Catálogo de subtipos de reconocimientos de graduación (sección 5.2/6.5 de
 * requerimientos): Integrante de generación, Distinción al Mérito
 * Académico, Labor docente. Determina la plantilla de texto a usar — vive
 * en base de datos, igual que `Rol`, para que el equipo de la facultad
 * pueda ajustar el texto sin depender de un desarrollador (requisito de
 * mantenibilidad, sección 8 de requerimientos).
 */
export interface SubtipoGraduacion {
  id: number
  nombreSubtipo: string
  plantillaTexto: string
}

export type SubtipoGraduacionNuevo = Omit<SubtipoGraduacion, 'id'>
