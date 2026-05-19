/**
 * Tipos e interfaces relacionados con Roles y Seguridad
 */

export interface Rol {
  rolId: number;
  rolNombre: string;
  rolDescripcion?: string;
  rolCodigo: string;
  rolActivo: boolean;
  rolCreatedAt: string;
  rolUpdatedAt?: string;
  modulos?: RolModulo[];
}

export interface RolModulo {
  rmRolId: number;
  rmModId: number;
  rmVer: boolean;
  rmCrear: boolean;
  rmEditar: boolean;
  rmEliminar: boolean;
  rmAprobar: boolean;
  rmActivo: boolean;
  createdBy?: number;
  rmCreatedAt?: string;
  updatedAt?: string;
}

export interface CreateRolDto {
  rolNombre: string;
  rolDescripcion?: string;
  rolCodigo: string;
  rolActivo?: boolean;
}

export interface UpdateRolDto extends Partial<CreateRolDto> {}

export interface AssignModuleDto {
  modId: number;
  ver?: boolean;
  crear?: boolean;
  editar?: boolean;
  eliminar?: boolean;
  aprobar?: boolean;
}

export interface PermisoModulo {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  aprobar: boolean;
}
