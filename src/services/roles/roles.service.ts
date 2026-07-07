import api from "@/services/core/api";

export interface Rol {
  rolId: number;
  rolNombre: string;
  rolCodigo: string;
  rolDescripcion?: string;
  activo: boolean;
}

export const rolesService = {
  getAll: async (): Promise<Rol[]> => {
    const res = await api.get("/roles");
    return res.data;
  },

  getById: async (rolId: number): Promise<Rol> => {
    const res = await api.get(`/roles/${rolId}`);
    return res.data;
  },
};
