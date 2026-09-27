import api from "@/services/core/api";

export interface FormularioSeccion {
  fs_id: number;
  fs_nombre: string;
  fs_descripcion: string | null;
  fs_orden: number;
  fs_activo: boolean;
  fs_oculta_en_formulario: boolean;
  fs_fv_id?: number | null;
}

export const formularioSeccionesService = {
  // Sin filtro: las secciones de todas las versiones (sirve para buscar
  // por fs_id). Con formulario + versión: solo las de esa versión.
  getAll: async (filtro?: {
    formularioId: number;
    version: number;
  }): Promise<FormularioSeccion[]> => {
    const res = await api.get("/parametrizacion/formulario-secciones", {
      params: filtro,
    });
    return res.data;
  },

  // Secciones de la versión activa del formulario activo (nueva solicitud),
  // sin tener que resolver antes la versión.
  getFormularioActivo: async (): Promise<FormularioSeccion[]> => {
    const res = await api.get("/parametrizacion/formulario-secciones/formulario-activo");
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
