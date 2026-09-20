import api from "@/services/core/api";

export interface FormularioSeccion {
  fs_id: number;
  fs_nombre: string;
  fs_descripcion: string | null;
  fs_orden: number;
  fs_activo: boolean;
  fs_oculta_en_formulario: boolean;
}

export const formularioSeccionesService = {
  getAll: async (): Promise<FormularioSeccion[]> => {
    const res = await api.get("/parametrizacion/formulario-secciones");
    return res.data;
  },

  create: async (payload: {
    seccion_nombre: string;
    seccion_descripcion?: string;
    seccion_orden: number;
    seccion_oculta_en_formulario?: boolean;
  }): Promise<FormularioSeccion> => {
    const res = await api.post(
      "/parametrizacion/formulario-secciones",
      payload,
    );
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<{
      seccion_nombre: string;
      seccion_descripcion: string;
      seccion_orden: number;
      seccion_activo: boolean;
      seccion_oculta_en_formulario: boolean;
    }>,
  ): Promise<FormularioSeccion> => {
    const res = await api.put(
      `/parametrizacion/formulario-secciones/${id}`,
      payload,
    );
    return res.data;
  },

  // No existe un endpoint PATCH .../estado en el backend — el estado se
  // cambia con el mismo PUT de actualizar, mandando solo seccion_activo.
  toggleEstado: async (
    id: number,
    estado: boolean,
  ): Promise<FormularioSeccion> => {
    const res = await api.put(`/parametrizacion/formulario-secciones/${id}`, {
      seccion_activo: estado,
    });
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/parametrizacion/formulario-secciones/${id}`);
  },
};
