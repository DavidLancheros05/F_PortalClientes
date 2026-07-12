import api from "@/services/core/api";

export type Area = string;

export interface DiaRespuesta {
  pdr_id: number;
  pdr_area: Area;
  pdr_dias: number;
  pdr_estado: boolean;
  pdr_created_at: string;
}

export const diasRespuestaService = {
  getAll: async (): Promise<DiaRespuesta[]> => {
    const res = await api.get("/parametrizacion/dias-respuesta");
    return res.data;
  },

  create: async (data: {
    pdr_area: Area;
    pdr_dias: number;
    pdr_estado: boolean;
  }) => {
    const res = await api.post("/parametrizacion/dias-respuesta", data);
    return res.data;
  },

  update: async (id: number, data: { pdr_dias: number }) => {
    const res = await api.put(`/parametrizacion/dias-respuesta/${id}`, data);
    return res.data;
  },

  toggleEstado: async (id: number, estado: boolean) => {
    const res = await api.patch(
      `/parametrizacion/dias-respuesta/${id}/estado`,
      {
        pdr_estado: estado,
      },
    );
    return res.data;
  },

  search: async (filters: {
    area?: Area;
    estado?: boolean;
    dias?: number;
  }): Promise<DiaRespuesta[]> => {
    const res = await api.get("/parametrizacion/dias-respuesta/search", {
      params: filters,
    });
    return res.data;
  },

  getAreas: async (): Promise<Area[]> => {
    const res = await api.get("/parametrizacion/dias-respuesta/areas");
    return res.data;
  },
};
