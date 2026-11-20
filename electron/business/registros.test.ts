import { describe, expect, it } from 'vitest'
import {
  actualizarNombreRegistro,
  registroAFilaCruda,
  registroAFilaCrudaGraduacion,
} from '../../src/utils/registros'
import type { RegistroExcel } from '../../src/pantallas/PantallaValidacion'

const registroBase: RegistroExcel = {
  idFila: '2',
  nombre: 'DRA. BALDERAS GUTIERREZ IVONNE',
  nombreOriginal: 'Dra. Ivonne Balderas Gutierrez',
  rol: 'Participante',
}

describe('conversión de nombres para revalidación', () => {
  it('revalida desde el texto original, no desde el orden ya normalizado', () => {
    expect(registroAFilaCruda(registroBase).nombreCompleto)
      .toBe('Dra. Ivonne Balderas Gutierrez')
    expect(registroAFilaCrudaGraduacion(registroBase).nombreCompleto)
      .toBe('Dra. Ivonne Balderas Gutierrez')
  })

  it('usa como fuente el nombre editado por el operador', () => {
    const editado = actualizarNombreRegistro(registroBase, 'Dra. Ivonne Balderas Gutiérrez')

    expect(registroAFilaCruda(editado).nombreCompleto)
      .toBe('Dra. Ivonne Balderas Gutiérrez')
    expect(registroAFilaCrudaGraduacion(editado).nombreCompleto)
      .toBe('Dra. Ivonne Balderas Gutiérrez')
  })

  it('conserva la duración de taller al reconstruir la fila para revalidación', () => {
    const registroConDuracion: RegistroExcel = {
      ...registroBase,
      duracion: '20 horas',
    }

    expect(registroAFilaCruda(registroConDuracion).duracion).toBe('20 horas')
  })
})
