import api from "@/services/core/api";

export interface CartaPdfVinculacion {
  cpv_id: number;
  cpv_nombre: string;
  cpv_contenido: string;
  cpv_activo: boolean;
}

export const cartaPdfVinculacionService = {
  getAll: async (): Promise<CartaPdfVinculacion[]> => {
    const res = await api.get("/parametrizacion/carta-pdf-vinculacion");
    return res.data;
  },

  getById: async (id: number): Promise<CartaPdfVinculacion> => {
    const res = await api.get(`/parametrizacion/carta-pdf-vinculacion/${id}`);
    return res.data;
  },

  create: async (data: { nombre: string; contenido: string }): Promise<CartaPdfVinculacion> => {
    const res = await api.post("/parametrizacion/carta-pdf-vinculacion", data);
    return res.data;
  },

  update: async (id: number, data: { nombre?: string; contenido?: string }): Promise<CartaPdfVinculacion> => {
    const res = await api.put(`/parametrizacion/carta-pdf-vinculacion/${id}`, data);
    return res.data;
  },

  toggleActivo: async (id: number, activo: boolean): Promise<CartaPdfVinculacion> => {
    const res = await api.patch(`/parametrizacion/carta-pdf-vinculacion/${id}/estado`, { activo });
    return res.data;
  },
};
