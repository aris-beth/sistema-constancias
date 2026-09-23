export interface Rol {
  id: number
  nombreRol: string
  plantillaTexto: string
}

export type RolNuevo = Omit<Rol, 'id'>
