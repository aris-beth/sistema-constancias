import type { FilaProcesada, FilaProcesadaGraduacion } from '../../shared/types/ipc'
import type { FilaExcelCruda, FilaExcelCrudaGraduacion } from '../../shared/types/excel'
import type { RegistroExcel, ErrorValidacion } from '../pantallas/PantallaValidacion'

function textoOpcional(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null
}

function errorDeFila(registro: RegistroExcel, errores: ErrorValidacion[]): string | null {
  return errores.find((error) => error.idFila === registro.idFila)?.mensaje ?? null
}

export function actualizarNombreRegistro(registro: RegistroExcel, nombre: string): RegistroExcel {
  return { ...registro, nombre, nombreOriginal: nombre }
}

/**
 * Reconstruye la fila que entiende el backend a partir del registro que la
 * UI mantiene (y que el usuario pudo haber editado en la validación).
 */
export function registroAFila(registro: RegistroExcel, errores: ErrorValidacion[] = []): FilaProcesada {
  return {
    numeroFila: Number(registro.idFila),
    nombreOriginal: registro.nombreOriginal ?? registro.nombre,
    nombreNormalizado: registro.nombre,
    gradoDetectado: registro.gradoDetectado ?? null,
    textoGenerado: registro.textoGenerado ?? null,
    esPersonalizado: Boolean(registro.esPersonalizado),
    universidadExterna: registro.universidadExterna ?? null,
    confianza: registro.confianza ?? null,
    error: errorDeFila(registro, errores),
    participaComo: registro.rol,
    nombrePonencia: textoOpcional(registro.nombrePonencia),
    nombreEvento: registro.nombreEvento ?? '',
    fechaConstancia: registro.fechaConstancia ?? '',
    duracion: textoOpcional(registro.duracion),
    universidadOrigen: textoOpcional(registro.universidadOrigen),
    modalidad: registro.modalidad ?? '',
    textoPersonalizado: textoOpcional(registro.textoPersonalizado),
    categoria: textoOpcional(registro.categoria),
    articuloEvento: registro.articuloEvento ?? null,
  }
}

export function registroAFilaGraduacion(
  registro: RegistroExcel,
  errores: ErrorValidacion[] = [],
): FilaProcesadaGraduacion {
  return {
    numeroFila: Number(registro.idFila),
    nombreOriginal: registro.nombreOriginal ?? registro.nombre,
    nombreNormalizado: registro.nombre,
    subtipo: registro.rol,
    generacion: registro.generacion ?? '',
    carrera: registro.carrera ?? '',
    fecha: registro.fechaConstancia ?? '',
    textoGenerado: registro.textoGenerado ?? null,
    confianza: registro.confianza ?? null,
    error: errorDeFila(registro, errores),
  }
}

/** Fila cruda (lo que el backend valida) a partir de lo que hay en pantalla. */
export function registroAFilaCruda(registro: RegistroExcel): FilaExcelCruda {
  return {
    numeroFila: Number(registro.idFila),
    nombreCompleto: registro.nombreOriginal ?? registro.nombre ?? '',
    participaComo: registro.rol ?? '',
    nombrePonencia: textoOpcional(registro.nombrePonencia),
    nombreEvento: registro.nombreEvento ?? '',
    fechaConstancia: registro.fechaConstancia ?? '',
    universidadOrigen: textoOpcional(registro.universidadOrigen),
    modalidad: registro.modalidad ?? '',
    textoPersonalizado: textoOpcional(registro.textoPersonalizado),
    categoria: textoOpcional(registro.categoria),
    articuloEvento: registro.articuloEvento ?? null,
  }
}

export function registroAFilaCrudaGraduacion(registro: RegistroExcel): FilaExcelCrudaGraduacion {
  return {
    numeroFila: Number(registro.idFila),
    nombreCompleto: registro.nombreOriginal ?? registro.nombre ?? '',
    subtipo: registro.rol ?? '',
    generacion: registro.generacion ?? '',
    carrera: registro.carrera ?? '',
    fecha: registro.fechaConstancia ?? '',
  }
}
