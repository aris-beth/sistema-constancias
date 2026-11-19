import { describe, expect, it } from 'vitest'
import { generarTextoConstancia, ROLES_RECONOCIDOS } from './generarTextoConstancia'

const datosBase = {
  participaComo: 'Organizador',
  nombreEvento: 'Congreso 2026',
  modalidad: 'Presencial CU' as const,
  fechaConstancia: '3 de diciembre de 2026',
  nombrePonencia: null,
  textoPersonalizado: null,
  universidadOrigen: 'BUAP',
}

describe('generarTextoConstancia', () => {
  it('define Participante con la redacción confirmada', () => {
    expect(
      generarTextoConstancia({
        ...datosBase,
        participaComo: 'Participante',
        nombreEvento: 'Congreso 2026',
        articuloEvento: 'del',
      }).textoGenerado,
    ).toBe('Por su participación del Congreso 2026, llevado a cabo el 3 de diciembre de 2026, en la Facultad de Ciencias de la Computación de la BUAP.')
  })

  it.each([
    ['Ganadora', 'Por ser mejor proyecto en el Congreso 2026'],
    ['Ganadores', 'Por ser mejor proyecto en el Congreso 2026'],
    ['Ganadoras', 'Por ser mejor proyecto en el Congreso 2026'],
    ['Jurados', 'Por participar como jurados en el Congreso 2026'],
    ['Asistentes', 'Por asistir en el Congreso 2026'],
    ['Moderador', 'Por participar como moderador en el Congreso 2026'],
  ])('reconoce y genera el rol variante %s', (participaComo, textoEsperado) => {
    expect(ROLES_RECONOCIDOS).toContain(participaComo.toLocaleUpperCase('es-MX'))
    expect(
      generarTextoConstancia({
        ...datosBase,
        participaComo,
        nombrePonencia: 'mejor proyecto',
      }).textoGenerado,
    ).toContain(textoEsperado)
  })

  it('conserva la sede normal para participantes BUAP', () => {
    expect(generarTextoConstancia(datosBase).textoGenerado).toBe(
      'Por su valiosa labor como Organizador, del Congreso 2026, llevado a cabo el 3 de diciembre de 2026, en la Facultad de Ciencias de la Computación de la BUAP.',
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
            'Por su valiosa labor como Organizador, del Congreso 2026, llevado a cabo el 3 de diciembre de 2026, en la Facultad de Ciencias de la Computación de la BUAP.',
        esPersonalizado: false,
        universidadExterna: null,
      })
    },
  )

  it.each(['Presencial CU', 'Presencial CU2', 'En línea', 'Otro'] as const)(
    'conserva la sede para una universidad externa con modalidad %s',
    (modalidad) => {
    const resultado = generarTextoConstancia({
      ...datosBase,
      universidadOrigen: 'Universidad Iberoamericana',
      modalidad,
    })

    expect(resultado.textoGenerado.endsWith('en la Facultad de Ciencias de la Computación de la BUAP.')).toBe(true)
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

  describe('artículo del evento ("del" / "de la")', () => {
    it('conserva del/de la para organizadores y colaboradores', () => {
      expect(
        generarTextoConstancia({
          ...datosBase,
          participaComo: 'Colaborador',
          nombreEvento: '5.º Taller de Experiencias',
          articuloEvento: 'de la',
        }).textoGenerado,
      ).toContain(', de la 5.º Taller de Experiencias,')
      expect(
        generarTextoConstancia({
          ...datosBase,
          participaComo: 'Organizador',
          nombreEvento: '3.ª Jornada de Computación',
          articuloEvento: 'de la',
        }).textoGenerado,
      ).toContain(', de la 3.ª Jornada de Computación,')
      expect(
        generarTextoConstancia({
          ...datosBase,
          participaComo: 'Colaborador',
          nombreEvento: '5.º Taller de Experiencias',
        }).textoGenerado,
      ).toContain('Por su participación como Colaborador, del 5.º Taller de Experiencias,')
    })

    it('usa en el/en la para las demás plantillas, usando la forma elegida o inferida', () => {
      expect(
        generarTextoConstancia({
          ...datosBase,
          participaComo: 'Asistente',
          nombreEvento: '5.º Taller de Experiencias',
        }).textoGenerado,
      ).toContain('Por asistir en el 5.º Taller de Experiencias,')
      expect(
        generarTextoConstancia({
          ...datosBase,
          participaComo: 'Asistente',
          nombreEvento: '5.º Taller de Experiencias',
          articuloEvento: 'en la',
        }).textoGenerado,
      ).toContain('Por asistir en la 5.º Taller de Experiencias,')
    })

    it('si no puede decidir y la plantilla lo necesita, pide elegirlo', () => {
      expect(() =>
        generarTextoConstancia({ ...datosBase, nombreEvento: 'La Noche de los Investigadores' }),
      ).toThrow(/elige una forma/i)
    })

    it('los roles que nombran el evento piden elegir una forma si no se puede inferir', () => {
      expect(() =>
        generarTextoConstancia({
          ...datosBase,
          participaComo: 'Asistente',
          nombreEvento: 'La Noche de los Investigadores',
        }),
      ).toThrow(/elige una forma/i)
    })
  })

  it('genera el texto de asistente al taller con duración', () => {
    expect(
      generarTextoConstancia({
        ...datosBase,
        participaComo: 'Asistente al taller',
        nombrePonencia: 'Diseño de interfaces',
        fechaConstancia: '7 al 9 de diciembre de 2026',
        duracion: '8 horas',
      }).textoGenerado,
    ).toBe(
      'Por su asistencia al taller “Diseño de interfaces”, impartido en el marco del Congreso 2026, realizado del 7 al 9 de diciembre de 2026, con una duración de 8 horas, en la Facultad de Ciencias de la Computación de la BUAP.',
    )
  })

  it('usa GANADOR como descripción libre y omite "en el evento"', () => {
    expect(
      generarTextoConstancia({
        ...datosBase,
        participaComo: 'Ganador',
        nombrePonencia: 'mejor proyecto integrador',
      }).textoGenerado,
    ).toBe(
      'Por ser mejor proyecto integrador en el Congreso 2026, llevado a cabo el 3 de diciembre de 2026, en la Facultad de Ciencias de la Computación de la BUAP.',
    )
  })

  it.each([
    'Asistente',
    'Ponente conferencia',
    'Ponente',
    'Jurado',
    'Moderador de panel',
    'Ganador',
    'Comité revisor',
  ])('usa «en el Congreso» sin decir «en el evento» para %s', (participaComo) => {
    const texto = generarTextoConstancia({
      ...datosBase,
      participaComo,
      nombrePonencia: 'tema de prueba',
    }).textoGenerado

    expect(texto).toContain('en el Congreso 2026')
    expect(texto).not.toContain('en el evento')
  })

  it('conserva «emanado del Congreso» en la construcción gramatical de revisor de libro', () => {
    const texto = generarTextoConstancia({
      ...datosBase,
      participaComo: 'Revisor de libro',
      nombrePonencia: 'una reseña',
    }).textoGenerado

    expect(texto).toContain('emanado del Congreso 2026')
    expect(texto).not.toContain('en el evento')
  })
})
