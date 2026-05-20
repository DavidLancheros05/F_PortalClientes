import api from "@/services/core/api";
import { CentroOperacionResponse } from "@/types/api.types";

/**
 * @deprecated Usar CentroOperacionResponse de @/types/api.types
 */
export type CentroOperacion = CentroOperacionResponse;

export const centrosOperacionService = {
  getAll: async (): Promise<CentroOperacionResponse[]> => {
    const res = await api.get("/centros-operacion");
    return res.data;
  },

  getById: async (centroId: number): Promise<CentroOperacionResponse> => {
    const res = await api.get(`/centros-operacion/${centroId}`);
    return res.data;
  },
};
