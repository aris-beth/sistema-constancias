import { describe, expect, it } from 'vitest'
import { normalizarNombre } from '../../electron/business/normalizarNombre'
import { construirMapaAbreviaturas } from '../../electron/business/catalogos/abreviaturasAcademicas'

const catalogo = construirMapaAbreviaturas()

describe('normalizarNombre', () => {
  it('reconoce el grado con separador "/" y reordena apellidos primero', () => {
    const resultado = normalizarNombre('DOCTOR/JUAN PEREZ', catalogo)
    expect(resultado.gradoDetectado).toBe('Dr.')
    expect(resultado.nombreNormalizado).toBe('Dr. PEREZ JUAN')
    expect(resultado.confianza).toBe('alta')
  })

  it('reconoce el grado abreviado con minúsculas y punto ("dr.")', () => {
    const resultado = normalizarNombre('dr. Juan Perez', catalogo)
    expect(resultado.gradoDetectado).toBe('Dr.')
    expect(resultado.nombreNormalizado).toBe('Dr. PEREZ JUAN')
  })

  it('elimina "ESTUDIANTE" sin tratarlo como grado académico', () => {
    const resultado = normalizarNombre('ESTUDIANTE JUAN PEREZ', catalogo)
    expect(resultado.gradoDetectado).toBeNull()
    expect(resultado.nombreNormalizado).toBe('PEREZ JUAN')
  })

  it('normaliza un nombre simple sin grado', () => {
    const resultado = normalizarNombre('JUAN PEREZ', catalogo)
    expect(resultado.nombreNormalizado).toBe('PEREZ JUAN')
    expect(resultado.confianza).toBe('alta')
  })

  it('es insensible a mayúsculas/minúsculas mezcladas', () => {
    const resultado = normalizarNombre('Juan PEREZ', catalogo)
    expect(resultado.nombreNormalizado).toBe('PEREZ JUAN')
  })

  it('marca confianza baja cuando el nombre tiene un solo token', () => {
    const resultado = normalizarNombre('Madonna', catalogo)
    expect(resultado.confianza).toBe('baja')
  })

  it('marca confianza baja ante un nombre con demasiados tokens', () => {
    const resultado = normalizarNombre('Juan Carlos Perez Lopez Garcia Ruiz', catalogo)
    expect(resultado.confianza).toBe('baja')
  })

  it('marca confianza baja con seis palabras aunque incluya un grado académico', () => {
    const resultado = normalizarNombre(
      'Dr. Juan Carlos de la Torre García López',
      catalogo,
    )
    expect(resultado.gradoDetectado).toBe('Dr.')
    expect(resultado.confianza).toBe('baja')
  })

  it('mantiene confianza alta con exactamente cinco palabras', () => {
    const resultado = normalizarNombre('Juan Carlos de la Torre', catalogo)
    expect(resultado.confianza).toBe('alta')
  })

  it('reordena correctamente dos nombres y dos apellidos', () => {
    const resultado = normalizarNombre('Maria Jose Lopez Garcia', catalogo)
    expect(resultado.nombreNormalizado).toBe('LOPEZ GARCIA MARIA JOSE')
    expect(resultado.confianza).toBe('alta')
  })

  it('lanza un error si el nombre está vacío', () => {
    expect(() => normalizarNombre('', catalogo)).toThrow()
  })

  it('separa una abreviatura pegada al nombre sin espacio ("dr.Ernesto")', () => {
    const resultado = normalizarNombre('dr.Ernesto Gomez Diaz', catalogo)
    expect(resultado.gradoDetectado).toBe('Dr.')
    expect(resultado.nombreNormalizado).toBe('Dr. GOMEZ DIAZ ERNESTO')
  })

  it('no rompe la abreviatura compuesta "M.C." al separar abreviaturas pegadas', () => {
    const resultado = normalizarNombre('M.C. Juan Perez', catalogo)
    expect(resultado.gradoDetectado).toBe('M.C.')
    expect(resultado.nombreNormalizado).toBe('M.C. PEREZ JUAN')
  })

  it('normaliza un grupo de 3 personas separadas por comas', () => {
    const resultado = normalizarNombre(
      'Estudiante/Mauricio Espinosa Romero, Estudiante/Mauricio Espinosa Romero, Doctora Rosa Michel Zaragoza Melo',
      catalogo,
    )
    expect(resultado.nombreNormalizado).toBe(
      'ESPINOSA ROMERO MAURICIO, ESPINOSA ROMERO MAURICIO, Dra. ZARAGOZA MELO ROSA MICHEL',
    )
  })

  it('conserva "y" dentro de una celda porque solo la coma agrupa personas', () => {
    const resultado = normalizarNombre(
      'Dra. Erika Beatriz Etcheverry Doger, Dra. Jennifer Antón Sarabia y Dra. Karla Marisol Teutli Mellado',
      catalogo,
    )
    expect(resultado.nombreNormalizado).toBe(
      'Dra. ETCHEVERRY DOGER ERIKA BEATRIZ, Dra. JENNIFER ANTON SARABIA Y KARLA MARISOL TEUTLI MELLADO',
    )
  })

  it('trata una celda sin comas como una sola persona', () => {
    const resultado = normalizarNombre('Juan Perez y Ana Lopez', catalogo)
    expect(resultado.nombreNormalizado).toBe('ANA LOPEZ JUAN PEREZ Y')
  })
})
