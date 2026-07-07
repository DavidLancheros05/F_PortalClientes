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
  getAll: async () => {
    const res = await api.get("/seguridad/roles");
    return res.data;
  },

  getById: async (rolId: number) => {
    const res = await api.get(`/seguridad/roles/${rolId}`);
    return res.data;
  },

  create: async (payload: {
    rolNombre: string;
    rolDescripcion?: string;
    rolCodigo: string;
    rolActivo?: boolean;
  }) => {
    // Convertir camelCase a snake_case para el backend
    const backendPayload = {
      rol_nombre: payload.rolNombre,
      rol_descripcion: payload.rolDescripcion,
      rol_codigo: payload.rolCodigo,
      rol_activo: payload.rolActivo ?? true,
    };
    const res = await api.post("/seguridad/roles", backendPayload);
    return res.data;
  },

  update: async (rolId: number, payload: {
    rolNombre?: string;
    rolDescripcion?: string;
    rolCodigo?: string;
    rolActivo?: boolean;
  }) => {
    const backendPayload: any = {};
    if (payload.rolNombre !== undefined) backendPayload.rol_nombre = payload.rolNombre;
    if (payload.rolDescripcion !== undefined) backendPayload.rol_descripcion = payload.rolDescripcion;
    if (payload.rolCodigo !== undefined) backendPayload.rol_codigo = payload.rolCodigo;
    if (payload.rolActivo !== undefined) backendPayload.rol_activo = payload.rolActivo;

    const res = await api.put(`/seguridad/roles/${rolId}`, backendPayload);
    return res.data;
  },

  delete: async (rolId: number): Promise<void> => {
    await api.delete(`/seguridad/roles/${rolId}`);
  },

  getModulesByRole: async (rolId: number) => {
    const res = await api.get(`/seguridad/roles/${rolId}/modules`);
    return res.data;
  },

  assignModule: async (rolId: number, payload: {
    modId: number;
    ver?: boolean;
    crear?: boolean;
    editar?: boolean;
    eliminar?: boolean;
    aprobar?: boolean;
  }) => {
    const backendPayload = {
      mod_id: payload.modId,
      rm_ver: payload.ver,
      rm_crear: payload.crear,
      rm_editar: payload.editar,
      rm_eliminar: payload.eliminar,
      rm_aprobar: payload.aprobar,
    };
    const res = await api.post(`/seguridad/roles/${rolId}/modules`, backendPayload);
    return res.data;
  },

  removeModule: async (rolId: number, modId: number): Promise<void> => {
    await api.delete(`/seguridad/roles/${rolId}/modules/${modId}`);
  },
};
