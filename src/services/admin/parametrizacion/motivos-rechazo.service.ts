import api from "@/services/core/api";

export interface MotivoRechazo {
  id: number;
  descripcion: string;
  activo: boolean;
}

export const motivosRechazoService = {
  getAll: async (): Promise<MotivoRechazo[]> => {
    const res = await api.get("/motivos-rechazo");
    return res.data;
  },

  create: async (descripcion: string): Promise<MotivoRechazo> => {
    const res = await api.post("/motivos-rechazo", { descripcion });
    return res.data;
  },

  update: async (id: number, descripcion: string): Promise<MotivoRechazo> => {
    const res = await api.put(`/motivos-rechazo/${id}`, { descripcion });
    return res.data;
  },

  toggleActivo: async (id: number, activo: boolean): Promise<MotivoRechazo> => {
    const res = await api.patch(`/motivos-rechazo/${id}/estado`, { activo });
    return res.data;
  },
};
