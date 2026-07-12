import api from "@/services/core/api";

export interface AmpliacionCupoPayload {
  clienteId: number;
  nuevoCupo: number;
  justificacion: string;
  solicitudAnteriorId?: number;
}

export interface AmpliacionCupo {
  id: number;
  clienteId: number;
  nuevoCupo: number;
  justificacion: string;
  solicitudAnteriorId?: number;
  fechaCreacion: string;
  estado?: string;
}

export const ampliacionCupoService = {
  create: async (payload: AmpliacionCupoPayload): Promise<AmpliacionCupo> => {
    const res = await api.post("/ampliacion-cupo", payload);
    return res.data;
  },

  getById: async (id: number): Promise<AmpliacionCupo> => {
    const res = await api.get(`/ampliacion-cupo/${id}`);
    return res.data;
  },

  getByCliente: async (clienteId: number): Promise<AmpliacionCupo[]> => {
    const res = await api.get(`/ampliacion-cupo/cliente/${clienteId}`);
    return res.data;
  },

  getAll: async (): Promise<AmpliacionCupo[]> => {
    const res = await api.get("/ampliacion-cupo");
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<AmpliacionCupoPayload>,
  ): Promise<AmpliacionCupo> => {
    const res = await api.put(`/ampliacion-cupo/${id}`, payload);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/ampliacion-cupo/${id}`);
  },
};
