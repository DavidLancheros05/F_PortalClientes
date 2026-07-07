import api from "@/services/core/api";

export interface CentroOperacion {
  uco_id: number;
  co_id: number;
  nombre: string;
  activo: boolean;
  es_default: boolean;
  created_at: string;
}

export const usuariosCentrosService = {
  getCentrosByUsuario: async (userId: number): Promise<CentroOperacion[]> => {
    const res = await api.get(`/usuarios/${userId}/centros`);
    return res.data;
  },

  assignCentro: async (
    userId: number,
    centroId: number,
    esDefault: boolean = false,
  ) => {
    const res = await api.post(`/usuarios/${userId}/centros`, {
      co_id: centroId,
      es_default: esDefault,
    });
    return res.data;
  },

  assignMultipleCentros: async (
    userId: number,
    centros: Array<{ co_id: number; es_default?: boolean }>,
  ) => {
    const res = await api.post(`/usuarios/${userId}/centros/multiple`, {
      centros,
    });
    return res.data;
  },

  setDefaultCentro: async (userId: number, centroId: number) => {
    const res = await api.patch(`/usuarios/${userId}/centros/default`, {
      co_id: centroId,
    });
    return res.data;
  },

  removeCentro: async (userId: number, centroId: number) => {
    const res = await api.delete(`/usuarios/${userId}/centros/${centroId}`);
    return res.data;
  },
};
