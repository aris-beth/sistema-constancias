import { describe, expect, it } from 'vitest'
import { generarTextoConstancia } from '../../electron/business/reglasRedaccion/generarTextoConstancia'
import { esUniversidadBUAP } from '../../electron/business/reglasRedaccion/generarTextoConstancia'

const datosBase = {
  participaComo: 'Organizador',
  nombreEvento: 'Congreso 2026',
  modalidad: 'Presencial CU' as const,
  nombrePonencia: null,
  textoPersonalizado: null,
  universidadOrigen: 'BUAP',
}

describe('generarTextoConstancia', () => {
  it.each([
    'BUAP',
    'buap',
    'B.U.A.P.',
    'Benemérita Universidad Autónoma de Puebla',
    'BENEMERITA UNIVERSIDAD AUTONOMA DE PUEBLA',
    'benemerita universidad autonoma de puebla',
    'Benemérita Universidad Autónoma de Puebla (BUAP)',
    'Benemérita Universidad de Puebla',
    'Universidad Autónoma de Puebla',
    'Universidad de Puebla',
  ])('reconoce como BUAP la universidad "%s"', (universidad) => {
    expect(esUniversidadBUAP(universidad)).toBe(true)
  })

  it('considera externa una universidad distinta de BUAP y trata el campo vacío como BUAP', () => {
    expect(esUniversidadBUAP('Universidad Nacional Autónoma de México')).toBe(false)
    expect(esUniversidadBUAP(null)).toBe(true)
    expect(esUniversidadBUAP(undefined)).toBe(true)
    expect(esUniversidadBUAP('   ')).toBe(true)
  })

  it.each([null, '', '   '])(
    'usa el comportamiento BUAP cuando la universidad de origen está vacía (%s)',
    (universidadOrigen) => {
      expect(
        generarTextoConstancia({
          ...datosBase,
          universidadOrigen,
        }),
      ).toEqual({
        textoGenerado:
          'Por haber participado como Organizador, del Congreso 2026, en la Facultad de Ciencias de la Computación.',
        esPersonalizado: false,
        universidadExterna: null,
      })
    },
  )

  it('no marca como externa a una persona con texto personalizado y universidad vacía', () => {
    expect(
      generarTextoConstancia({
        ...datosBase,
        universidadOrigen: null,
        textoPersonalizado: 'Texto institucional capturado por la coordinación.',
      }).universidadExterna,
    ).toBeNull()
  })

  it('genera el texto de un rol y resuelve la sede', () => {
    expect(generarTextoConstancia(datosBase)).toEqual({
      textoGenerado:
        'Por haber participado como Organizador, del Congreso 2026, en la Facultad de Ciencias de la Computación.',
      esPersonalizado: false,
      universidadExterna: null,
    })
  })

  it('usa texto personalizado sin intentar resolver una plantilla', () => {
    expect(
      generarTextoConstancia({
        ...datosBase,
        participaComo: 'Ganador con ponencia',
        textoPersonalizado: 'Texto institucional capturado por la coordinación.',
      }),
    ).toEqual({
      textoGenerado: 'Texto institucional capturado por la coordinación.',
      esPersonalizado: true,
      universidadExterna: null,
    })
  })

  it('conserva el texto personalizado exactamente, quitando solo espacios externos', () => {
    expect(
      generarTextoConstancia({
        ...datosBase,
        textoPersonalizado: '  Texto institucional capturado por la coordinación.  ',
        modalidad: 'modalidad inválida' as never,
      }),
    ).toEqual({
      textoGenerado: 'Texto institucional capturado por la coordinación.',
      esPersonalizado: true,
      universidadExterna: null,
    })
  })

  it('requiere ponencia para roles que la utilizan', () => {
    expect(() => generarTextoConstancia({ ...datosBase, participaComo: 'Jurado' })).not.toThrow()
    expect(() =>
      generarTextoConstancia({ ...datosBase, participaComo: 'Ponente' }),
    ).toThrow('requiere un valor')
  })

  it('acepta roles femeninos y cualquier combinación de mayúsculas', () => {
    expect(
      generarTextoConstancia({
        ...datosBase,
        participaComo: 'ORGANIZADORA',
        modalidad: 'presencial cu' as never,
      }).textoGenerado,
    ).toContain('ORGANIZADORA')

    expect(
      generarTextoConstancia({
        ...datosBase,
        participaComo: 'ReVisOrA De LiBrO',
        nombrePonencia: 'una reseña',
      }).textoGenerado,
    ).toContain('ReVisOrA De LiBrO')
  })

  it('marca la institución externa y conserva la sede institucional', () => {
    expect(
      generarTextoConstancia({
        ...datosBase,
        universidadOrigen: 'Universidad Nacional',
      }),
    ).toEqual({
        textoGenerado:
          'Por haber participado como Organizador, del Congreso 2026, en la Facultad de Ciencias de la Computación.',
      esPersonalizado: false,
      universidadExterna: 'Universidad Nacional',
    })
  })

  it('conserva la sede para una persona externa', () => {
    const resultado = generarTextoConstancia({
      ...datosBase,
      universidadOrigen: 'Universidad Iberoamericana',
      modalidad: 'Presencial CU' as const,
    })

    expect(resultado.textoGenerado.endsWith('en la Facultad de Ciencias de la Computación.')).toBe(true)
  })

  it('conserva sin cambios el texto personalizado de una universidad externa', () => {
    const textoPersonalizado = 'Texto completo escrito por la coordinación.'

    expect(
      generarTextoConstancia({
        ...datosBase,
        universidadOrigen: 'Universidad Iberoamericana',
        textoPersonalizado,
      }).textoGenerado,
    ).toBe(textoPersonalizado)
  })
})