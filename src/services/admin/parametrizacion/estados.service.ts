import api from "@/services/core/api";

export interface Estado {
  estado_id: number;
  codigo: string;
  descripcion: string;
  orden: number;
}

export const estadosService = {
  getAll: async (): Promise<Estado[]> => {
    const res = await api.get("/parametrizacion/estados");
    return res.data;
  },

  create: async (data: {
    codigo: string;
    descripcion: string;
    orden: number;
  }) => {
    const res = await api.post("/parametrizacion/estados", data);
    return res.data;
  },

  update: async (
    estado_id: number,
    data: { codigo: string; descripcion: string; orden: number },
  ) => {
    const res = await api.put(`/parametrizacion/estados/${estado_id}`, data);
    return res.data;
  },

  remove: async (estado_id: number) => {
    const res = await api.delete(`/parametrizacion/estados/${estado_id}`);
    return res.data;
  },
};
