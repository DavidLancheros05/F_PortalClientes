import api from "@/services/core/api";

export interface CentroOperacion {
  cop_id: number;
  cop_nombre: string;
  cop_estado?: string;
}

export const centrosOperacionService = {
  getAll: async (): Promise<CentroOperacion[]> => {
    const res = await api.get("/centros-operacion");
    return res.data;
  },

  getById: async (centroId: number): Promise<CentroOperacion> => {
    const res = await api.get(`/centros-operacion/${centroId}`);
    return res.data;
  },
};
