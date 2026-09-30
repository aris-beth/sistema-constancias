import { describe, expect, it } from 'vitest'
import { generarTextoConstancia } from './generarTextoConstancia'

const datosBase = {
  participaComo: 'Organizador',
  nombreEvento: 'Congreso 2026',
  modalidad: 'Presencial CU' as const,
  nombrePonencia: null,
  textoPersonalizado: null,
  universidadOrigen: 'BUAP',
}

describe('generarTextoConstancia', () => {
  it('conserva la sede normal para participantes BUAP', () => {
    expect(generarTextoConstancia(datosBase).textoGenerado).toBe(
      'Por participar como Organizador, en el evento Congreso 2026, en la Facultad de Ciencias de la Computación.',
    )
  })

  it.each([null, '', '   '])(
    'trata una universidad de origen vacía como BUAP (%s)',
    (universidadOrigen) => {
      expect(
        generarTextoConstancia({
          ...datosBase,
          universidadOrigen,
        }),
      ).toEqual({
        textoGenerado:
          'Por participar como Organizador, en el evento Congreso 2026, en la Facultad de Ciencias de la Computación.',
        esPersonalizado: false,
        universidadExterna: null,
      })
    },
  )

  it.each(['Presencial CU', 'Presencial CU2', 'En línea', 'Otro'] as const)(
    'elimina la sede para una universidad externa con modalidad %s',
    (modalidad) => {
    const resultado = generarTextoConstancia({
      ...datosBase,
      universidadOrigen: 'Universidad Iberoamericana',
      modalidad,
    })

    expect(resultado.textoGenerado.endsWith('en el evento Congreso 2026.')).toBe(true)
    expect(resultado.textoGenerado).not.toContain('Facultad de Ciencias de la Computación')
    },
  )

  it('conserva intacto el texto personalizado de una universidad externa', () => {
    const textoPersonalizado = 'Texto completo escrito por la coordinación.'

    expect(
      generarTextoConstancia({
        ...datosBase,
        universidadOrigen: 'Universidad Iberoamericana',
        textoPersonalizado,
      }).textoGenerado,
    ).toBe(textoPersonalizado)
  })

  it('mantiene JURADO como texto fijo sin sustituirlo por el valor de PARTICIPA COMO', () => {
    const resultado = generarTextoConstancia({
      ...datosBase,
      participaComo: 'Jurado',
    })

    expect(resultado.textoGenerado).toContain('jurado')
    expect(resultado.textoGenerado).not.toContain('Jurado calificador')
  })

  it('usa GANADOR como descripción libre de lo obtenido', () => {
    expect(
      generarTextoConstancia({
        ...datosBase,
        participaComo: 'Ganador',
        nombrePonencia: 'mejor proyecto integrador',
      }).textoGenerado,
    ).toBe(
      'Por ser mejor proyecto integrador en el evento Congreso 2026, en la Facultad de Ciencias de la Computación.',
    )
  })
})
