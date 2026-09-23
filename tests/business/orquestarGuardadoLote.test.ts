import { describe, expect, it } from 'vitest'
import { orquestarGuardadoLote } from '../../electron/business/orquestarGuardadoLote'

function fila(numeroFila: number, participantes: Array<{ id: number; conteoPrevio: number }>) {
  return {
    numeroFila,
    nombreEvento: 'Evento de prueba',
    fechaConstancia: '10 de Diciembre de 2025',
    modalidad: 'Presencial CU' as const,
    participaComo: 'Asistente',
    rolId: 3,
    nombrePonencia: null,
    textoGenerado: 'Por asistir al evento Evento de prueba.',
    esPersonalizado: false,
    participantes: participantes.map((participante) => ({
      ...participante,
      nombreNormalizado: `PERSONA ${participante.id}`,
    })),
  }
}

describe('orquestarGuardadoLote', () => {
  it('activa reconocimiento si cualquier integrante llega a la séptima constancia', () => {
    const resultado = orquestarGuardadoLote(
      [fila(2, [{ id: 1, conteoPrevio: 6 }, { id: 2, conteoPrevio: 2 }])],
      'EVT-001',
    )

    expect(resultado.constancias).toEqual([
      expect.objectContaining({
        tipoDocumento: 'reconocimiento',
        numeroParaPersonaEvento: 7,
        participanteIds: [1, 2],
      }),
    ])
  })

  it('omite ninguna fila válida y toma los datos del evento de la primera', () => {
    const resultado = orquestarGuardadoLote([fila(2, [{ id: 1, conteoPrevio: 0 }])], ' EVT-002 ')

    expect(resultado.evento.folio).toBe('EVT-002')
    expect(resultado.constancias).toHaveLength(1)
    expect(resultado.filasOmitidas).toEqual([])
  })

  it('acepta diferencias de mayúsculas, espacios y formato equivalente de fecha', () => {
    const resultado = orquestarGuardadoLote(
      [
        fila(2, [{ id: 1, conteoPrevio: 0 }]),
        {
          ...fila(3, [{ id: 2, conteoPrevio: 0 }]),
          nombreEvento: '  EVENTO DE PRUEBA  ',
          fechaConstancia: '10/12/2025',
          modalidad: 'presencial cu',
        },
      ],
      'EVT-004',
    )

    expect(resultado.constancias).toHaveLength(2)
  })

  it('usa la primera fila como evento sin bloquear las demás filas válidas', () => {
    const resultado = orquestarGuardadoLote(
      [
        fila(2, [{ id: 1, conteoPrevio: 0 }]),
        {
          ...fila(3, [{ id: 2, conteoPrevio: 0 }]),
          nombreEvento: 'Evento capturado con otra escritura',
          fechaConstancia: '2026-01-15',
          modalidad: 'Otro',
        },
      ],
      'EVT-005',
    )

    expect(resultado.evento.nombreEvento).toBe('Evento de prueba')
    expect(resultado.constancias).toHaveLength(2)
  })

  it('rechaza un lote sin folio o sin filas', () => {
    expect(() => orquestarGuardadoLote([], 'EVT-003')).toThrow('No hay filas válidas')
    expect(() => orquestarGuardadoLote([fila(2, [{ id: 1, conteoPrevio: 0 }])], ' ')).toThrow(
      'folio del evento',
    )
  })
})