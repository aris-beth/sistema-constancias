/**
 * Ajusta mayúsculas y minúsculas sin inferir ni cambiar el orden recibido.
 * Las partículas se mantienen en minúsculas, igual que en la plantilla.
 */
export function formatearNombreGraduacion(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, ' ')
  const soloMayusculas = limpio === limpio.toLocaleUpperCase('es-MX')
  const soloMinusculas = limpio === limpio.toLocaleLowerCase('es-MX')
  if (!soloMayusculas && !soloMinusculas) return limpio

  const particulas = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e'])
  return limpio
    .toLocaleLowerCase('es-MX')
    .split(' ')
    .map((palabra, indice) =>
      indice > 0 && particulas.has(palabra)
        ? palabra
        : palabra.charAt(0).toLocaleUpperCase('es-MX') + palabra.slice(1),
    )
    .join(' ')
}
