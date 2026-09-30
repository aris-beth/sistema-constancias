import { describe, expect, it } from 'vitest'
import { separarParticipantes } from './separarParticipantes'
import { actualizarNombreRegistro, registroAFila } from '../../src/utils/registros'
import type { RegistroExcel } from '../../src/pantallas/PantallaValidacion'

describe('actualizarNombreRegistro', () => {
  it('mantiene alineados los nombres originales y normalizados al editar un grupo', () => {
    const registro: RegistroExcel = {
      idFila: '3',
      nombre: 'CARRASCO HATA MARIJOSE',
      nombreOriginal: 'CARRASCO HATA MARIJOSE',
      rol: 'Participante',
    }

    const actualizado = actualizarNombreRegistro(
      registro,
      'VICTOR ANTONIO LIMON VAZQUEZ, NAVARRETE CALERO FRANKLIN',
    )
    const filaParaGuardar = registroAFila(actualizado)

    expect(separarParticipantes(filaParaGuardar.nombreOriginal)).toHaveLength(2)
    expect(separarParticipantes(filaParaGuardar.nombreNormalizado ?? '')).toHaveLength(2)
    expect(filaParaGuardar.nombreOriginal).toBe(filaParaGuardar.nombreNormalizado)
  })
})
