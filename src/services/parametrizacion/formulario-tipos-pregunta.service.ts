import api from "@/services/core/api";

export interface TipoPregunta {
  fti_id: number;
  fti_codigo: string;
  fti_descripcion: string;
  fti_estado: boolean;
}

export const formularioTiposPreguntaService = {
  async getAll(includeInactivos: boolean = true): Promise<TipoPregunta[]> {
    const res = await api.get("/parametrizacion/formulario-tipos-pregunta", {
      params: { includeInactivos },
    });
    return res.data;
  },

  async create(payload: {
    fti_codigo: string;
    fti_descripcion: string;
    fti_estado?: boolean;
  }): Promise<TipoPregunta> {
    const res = await api.post(
      "/parametrizacion/formulario-tipos-pregunta",
      payload,
    );
    return res.data;
  },

  async update(
    ftiId: number,
    payload: {
      fti_codigo: string;
      fti_descripcion: string;
      fti_estado: boolean;
    },
  ): Promise<TipoPregunta> {
    const res = await api.put(
      `/parametrizacion/formulario-tipos-pregunta/${ftiId}`,
      payload,
    );
    return res.data;
  },

  async updateStatus(ftiId: number, estado: boolean): Promise<TipoPregunta> {
    const res = await api.patch(
      `/parametrizacion/formulario-tipos-pregunta/${ftiId}`,
      {
        fti_estado: estado,
      },
    );
    return res.data;
  },
};
