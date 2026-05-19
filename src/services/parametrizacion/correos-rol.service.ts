import api from "@/services/core/api";

export interface CorreoRol {
  id: number;
  rol_id: number;
  correo: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RolWithCorreo {
  rol_id: number;
  rol_nombre: string;
}

export const correosRolService = {
  getRoles: async (): Promise<RolWithCorreo[]> => {
    const res = await api.get("/parametrizacion/correos-por-rol/roles");
    return res.data;
  },

  getAll: async (): Promise<CorreoRol[]> => {
    const res = await api.get("/parametrizacion/correos-por-rol");
    return res.data;
  },

  create: async (payload: {
    rol_id: number;
    correo: string;
    activo?: boolean;
  }): Promise<CorreoRol> => {
    const res = await api.post("/parametrizacion/correos-por-rol", payload);
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<{
      rol_id: number;
      correo: string;
      activo: boolean;
    }>,
  ): Promise<CorreoRol> => {
    const res = await api.put(`/parametrizacion/correos-por-rol/${id}`, payload);
    return res.data;
  },

  toggleEstado: async (id: number, activo: boolean): Promise<CorreoRol> => {
    const res = await api.patch(`/parametrizacion/correos-por-rol/${id}/estado`, {
      activo,
    });
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/parametrizacion/correos-por-rol/${id}`);
  },
};
