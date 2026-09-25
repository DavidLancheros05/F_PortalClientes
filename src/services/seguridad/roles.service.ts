import api from "@/services/core/api";
export type {
  Rol,
  Modulo,
  Permisos,
  CreateRolDto,
  UpdateRolDto,
  RolModulo,
  AssignModuleDto,
  PermisoModulo,
} from "./roles.types";

export const rolesService = {
  // Por defecto solo roles activos (pantallas que asignan roles). La
  // pantalla de Roles pide también los inactivos para poder reactivarlos.
  getAll: async (incluirInactivos = false) => {
    const res = await api.get("/seguridad/roles", {
      params: incluirInactivos ? { incluirInactivos: true } : undefined,
    });
    return res.data;
  },

  create: async (payload: {
    rolNombre: string;
    rolDescripcion?: string;
    rolCodigo: string;
    rolActivo?: boolean;
    modulos?: any[];
  }) => {
    // Convertir camelCase a snake_case para el backend
    const backendPayload = {
      rol_nombre: payload.rolNombre,
      rol_descripcion: payload.rolDescripcion,
      rol_codigo: payload.rolCodigo,
      rol_activo: payload.rolActivo ?? true,
      modulos: payload.modulos,
    };
    const res = await api.post("/seguridad/roles", backendPayload);
    return res.data;
  },

  update: async (rolId: number, payload: {
    rolNombre?: string;
    rolDescripcion?: string;
    rolCodigo?: string;
    rolActivo?: boolean;
    modulos?: any[];
  }) => {
    const backendPayload: any = {};
    if (payload.rolNombre !== undefined) backendPayload.rol_nombre = payload.rolNombre;
    if (payload.rolDescripcion !== undefined) backendPayload.rol_descripcion = payload.rolDescripcion;
    if (payload.rolCodigo !== undefined) backendPayload.rol_codigo = payload.rolCodigo;
    if (payload.rolActivo !== undefined) backendPayload.rol_activo = payload.rolActivo;
    // El backend espera el árbol completo de módulos seleccionados (con
    // permisos) para reconciliar pc_rol_modulo — sin esto, RolModal deja
    // marcar los checkboxes de permisos pero nunca se guardaban (bug real,
    // encontrado al conectar el permiso "eliminar" de Solicitudes a esta
    // pantalla).
    if (payload.modulos !== undefined) backendPayload.modulos = payload.modulos;

    const res = await api.put(`/seguridad/roles/${rolId}`, backendPayload);
    return res.data;
  },

  delete: async (rolId: number): Promise<void> => {
    await api.delete(`/seguridad/roles/${rolId}`);
  },

  // Los permisos por módulo se guardan dentro de `update` (campo `modulos`).
  // getById/getModulesByRole/assignModule/removeModule se eliminaron: apuntaban
  // a rutas que el backend no tiene (daban 404) y ninguna página las usaba.
};
