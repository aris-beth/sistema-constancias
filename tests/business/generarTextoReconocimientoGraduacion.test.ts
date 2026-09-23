import { describe, expect, it } from 'vitest'
import { generarTextoReconocimientoGraduacion } from '../../electron/business/reglasRedaccion/generarTextoReconocimientoGraduacion'

describe('generarTextoReconocimientoGraduacion', () => {
  it('genera el texto de "Integrante de generación" sustituyendo generación y carrera', () => {
    const resultado = generarTextoReconocimientoGraduacion({
      subtipo: 'Integrante de generación',
      generacion: '2021-2026',
      carrera: 'Licenciatura en Ingeniería en Ciencias de la Computación',
    })
    expect(resultado.textoGenerado).toBe(
      'Por ser integrante de la Generación 2021-2026 de la Licenciatura en Ingeniería en Ciencias de la Computación.',
    )
  })

  it('genera el texto de "Distinción al Mérito Académico"', () => {
    const resultado = generarTextoReconocimientoGraduacion({
      subtipo: 'Distinción al Mérito Académico',
      generacion: '2021-2026',
      carrera: 'Licenciatura en Ciencias de la Computación',
    })
    expect(resultado.textoGenerado).toBe(
      'Por obtener la Distinción al Mérito Académico en la Licenciatura en Ciencias de la Computación, 2021-2026.',
    )
  })

  it('genera el texto de "Labor docente"', () => {
    const resultado = generarTextoReconocimientoGraduacion({
      subtipo: 'Labor docente',
      generacion: '2021-2026',
      carrera: 'Licenciatura en Ciencias de la Computación',
    })
    expect(resultado.textoGenerado).toBe(
      'Por su destacada labor docente, en favor de la Generación 2021-2026.',
    )
  })

  it('es insensible a mayúsculas/acentos en el nombre del subtipo', () => {
    const resultado = generarTextoReconocimientoGraduacion({
      subtipo: 'distincion al merito academico',
      generacion: '2020-2025',
      carrera: 'Ingeniería en Sistemas',
    })
    expect(resultado.textoGenerado).toContain('Distinción al Mérito Académico')
  })

  it('usa la plantilla personalizada cuando se provee (subtipo del catálogo extensible en BD)', () => {
    const resultado = generarTextoReconocimientoGraduacion({
      subtipo: 'Mención honorífica',
      generacion: '2018-2023',
      carrera: 'Maestría en Ciencias de la Computación',
      plantillaPersonalizada: 'Por obtener Mención Honorífica en la {CARRERA}, generación {GENERACION}.',
    })
    expect(resultado.textoGenerado).toBe(
      'Por obtener Mención Honorífica en la Maestría en Ciencias de la Computación, generación 2018-2023.',
    )
  })

  it('rechaza un subtipo que no está ni en el catálogo fijo ni con plantilla personalizada', () => {
    expect(() =>
      generarTextoReconocimientoGraduacion({
        subtipo: 'Subtipo inventado',
        generacion: '2021-2026',
        carrera: 'Licenciatura en Ciencias de la Computación',
      }),
    ).toThrow(/no está en el catálogo/)
  })

  it('rechaza datos incompletos (falta generación)', () => {
    expect(() =>
      generarTextoReconocimientoGraduacion({
        subtipo: 'Integrante de generación',
        generacion: '   ',
        carrera: 'Licenciatura en Ciencias de la Computación',
      }),
    ).toThrow(/generación/)
  })
})
