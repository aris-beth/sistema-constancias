// Palabras que a veces aparecen junto al nombre en el Excel pero que NO
// son un grado académico real (sección 6.4 de tus requerimientos:
// "ESTUDIANTE", "ALUMNO", "ALUMNA" y variantes se eliminan antes de
// generar la constancia).
export const PALABRAS_NO_GRADO = new Set<string>([
  'ESTUDIANTE',
  'ESTUDIANTES',
  'ALUMNO',
  'ALUMNA',
  'ALUMNOS',
  'ALUMNAS',
])
