import api from "@/services/core/api";

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

export interface RolModulo {
  mod_id: number;
  permisos: Permisos;
  subModulos?: RolModulo[];
}

export interface Rol {
  rol_id: number;
  rol_nombre: string;
  rol_descripcion: string;
  rol_activo: boolean;
  modulos: Modulo[];
}

export const rolesService = {
  getAll: async (): Promise<Rol[]> => {
    const res = await api.get("/seguridad/roles");
    return res.data;
  },

  getById: async (rolId: number): Promise<Rol> => {
    const res = await api.get(`/seguridad/roles/${rolId}`);
    return res.data;
  },

  create: async (payload: {
    rol_nombre: string;
    rol_descripcion: string;
    rol_codigo?: string;
    modulos?: RolModulo[];
  }): Promise<Rol> => {
    const res = await api.post("/seguridad/roles", payload);
    return res.data;
  },

  update: async (
    rolId: number,
    payload: {
      rol_nombre: string;
      rol_descripcion: string;
      modulos?: RolModulo[];
    },
  ): Promise<Rol> => {
    const res = await api.put(`/seguridad/roles/${rolId}`, payload);
    return res.data;
  },

  delete: async (rolId: number): Promise<void> => {
    await api.delete(`/seguridad/roles/${rolId}`);
  },
};
