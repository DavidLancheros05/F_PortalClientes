import api from "@/services/core/api";
import { CorreoPorRolResponse, RolResponse } from "@/types/api.types";

/**
 * @deprecated Usar CorreoPorRolResponse de @/types/api.types
 */
export type CorreoRol = CorreoPorRolResponse;

/**
 * @deprecated Usar RolResponse de @/types/api.types
 */
export type RolWithCorreo = RolResponse;

export const correosRolService = {
  getRoles: async (): Promise<RolResponse[]> => {
    const res = await api.get("/parametrizacion/correos-por-rol/roles");
    return res.data;
  },

  getAll: async (): Promise<CorreoPorRolResponse[]> => {
    const res = await api.get("/parametrizacion/correos-por-rol");
    return res.data;
  },

  create: async (payload: {
    rol_id: number;
    email: string;
    activo?: boolean;
  }): Promise<CorreoPorRolResponse> => {
    const res = await api.post("/parametrizacion/correos-por-rol", payload);
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<{
      rol_id: number;
      email: string;
      activo: boolean;
    }>,
  ): Promise<CorreoPorRolResponse> => {
    const res = await api.put(
      `/parametrizacion/correos-por-rol/${id}`,
      payload,
    );
    return res.data;
  },

  toggleEstado: async (
    id: number,
    activo: boolean,
  ): Promise<CorreoPorRolResponse> => {
    const res = await api.patch(
      `/parametrizacion/correos-por-rol/${id}/estado`,
      {
        activo,
      },
    );
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/parametrizacion/correos-por-rol/${id}`);
  },
};
