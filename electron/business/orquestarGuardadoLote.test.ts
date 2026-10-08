import { describe, expect, it } from 'vitest'
import { orquestarGuardadoLote, type FilaLoteResuelta } from './orquestarGuardadoLote'

function fila(universidadOrigen: string | null): FilaLoteResuelta {
  return {
    numeroFila: 2,
    nombreEvento: 'Evento de prueba',
    fechaConstancia: '10 de Diciembre de 2025',
    modalidad: 'Presencial CU',
    participaComo: 'Asistente',
    rolId: 1,
    nombrePonencia: null,
    textoGenerado: 'Por asistir al evento de prueba.',
    esPersonalizado: false,
    universidadOrigen,
    participantes: [{ id: 1, nombreNormalizado: 'PEREZ JUAN', conteoPrevio: 0 }],
  }
}

describe('universidad de origen en constancia', () => {
  it('conserva la universidad del lote actual, incluyendo que venga vacía', () => {
    const conUniversidad = orquestarGuardadoLote([fila('Colegio de Postgraduados')], 'EVT-001')
    const sinUniversidad = orquestarGuardadoLote([fila(null)], 'EVT-002')

    expect(conUniversidad.constancias[0].universidadOrigen).toBe('Colegio de Postgraduados')
    expect(sinUniversidad.constancias[0].universidadOrigen).toBeNull()
  })
})
