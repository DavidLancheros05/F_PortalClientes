/**
 * Tipos e interfaces relacionados con Roles y Seguridad
 */

export interface Permisos {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  aprobar: boolean;
}

export interface Modulo {
  mod_id: number;
  mod_nombre: string;
  mod_ruta?: string;
  mod_icono?: string;
  mod_padre_id?: number | null;
  permisos: Permisos;
  subModulos?: Modulo[];
}

export interface Rol {
  rolId: number;
  rolNombre: string;
  rolDescripcion?: string;
  rolCodigo: string;
  rolActivo: boolean;
  rolCreatedAt: string;
  rolUpdatedAt?: string;
  modulos?: Modulo[];
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
