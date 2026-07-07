import api from "@/services/core/api";

export interface FormularioSeccion {
  fse_id: number;
  formulario_id: number;
  fse_nombre: string;
  fse_descripcion?: string;
  fse_orden: number;
  fse_estado: boolean;
  created_at?: string;
  updated_at?: string;
}

export const formularioSeccionesService = {
  getAll: async (params?: { formulario_id?: number }): Promise<FormularioSeccion[]> => {
    const res = await api.get("/parametrizacion/formulario-secciones", {
      params,
    });
    return res.data;
  },

  create: async (payload: {
    formulario_id: number;
    fse_nombre: string;
    fse_descripcion?: string;
    fse_orden: number;
    fse_estado?: boolean;
  }): Promise<FormularioSeccion> => {
    const res = await api.post("/parametrizacion/formulario-secciones", payload);
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<{
      fse_nombre: string;
      fse_descripcion: string;
      fse_orden: number;
      fse_estado: boolean;
    }>,
  ): Promise<FormularioSeccion> => {
    const res = await api.put(
      `/parametrizacion/formulario-secciones/${id}`,
      payload,
    );
    return res.data;
  },

  toggleEstado: async (id: number, estado: boolean): Promise<FormularioSeccion> => {
    const res = await api.patch(
      `/parametrizacion/formulario-secciones/${id}/estado`,
      { fse_estado: estado },
    );
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/parametrizacion/formulario-secciones/${id}`);
  },
};
