import { describe, expect, it } from 'vitest'
import { generarTextoReconocimientoGraduacion } from './generarTextoReconocimientoGraduacion'

describe('generarTextoReconocimientoGraduacion', () => {
  it('no requiere carrera para Labor docente', () => {
    expect(
      generarTextoReconocimientoGraduacion({
        subtipo: 'Labor docente',
        generacion: '2019 - 2026',
        carrera: '',
      }).textoGenerado,
    ).toBe('Por su destacada labor docente, en favor de\nla Generación 2019 - 2026.')
  })

  it.each([
    [
      'Madrina de generación',
      'Por la excelencia de su labor docente, gran calidad profesional y humana\nque inspiran a la comunidad universitaria a distinguirla como\nMADRINA de la Generación 2019 - 2026',
    ],
    [
      'Padrino de generación',
      'Por la excelencia de su labor docente, gran calidad profesional y humana\nque inspiran a la comunidad universitaria a distinguirlo como\nPADRINO de la Generación 2019 - 2026',
    ],
  ])('genera el texto de %s con el formato solicitado', (subtipo, esperado) => {
    expect(
      generarTextoReconocimientoGraduacion({
        subtipo,
        generacion: '2019 - 2026',
        carrera: '',
      }).textoGenerado,
    ).toBe(esperado)
  })

  it('sigue requiriendo carrera para subtipos cuya plantilla la utiliza', () => {
    expect(() =>
      generarTextoReconocimientoGraduacion({
        subtipo: 'Integrante de generación',
        generacion: '2019 - 2026',
        carrera: '',
      }),
    ).toThrow(/falta la carrera/i)
  })
})
