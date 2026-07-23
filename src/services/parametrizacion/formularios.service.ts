import api from "@/services/core/api";

export interface Formulario {
  frm_id: number;
  frm_nombre: string;
  frm_descripcion?: string;
  formulario_version: number;
  Formulario_versiones_totales?: number;
  created_at?: string;
  frm_activo?: boolean;
}

export interface Seccion {
  fs_id: number;
  fs_nombre: string;
  fs_descripcion?: string | null;
  fs_orden: number;
  fs_activo?: boolean;
  preguntas?: Pregunta[];
}

export interface TipoPregunta {
  fp_tipo_id: number;
  fp_tipo_nombre: string;
}

export interface Pregunta {
  fp_id: number;
  formulario_id: number;
  seccion_id?: number;
  fp_orden: number;
  fp_descripcion: string;
  fp_tipo: string;
  fp_version: number;
  seccion_nombre?: string;
  seccion_descripcion?: string;
  seccion_orden?: number;
}

export const formulariosService = {
  // Crear formulario
  async create(payload: {
    formulario_nombre: string;
    formulario_descripcion?: string | null;
  }): Promise<Formulario> {
    const res = await api.post("/parametrizacion/formularios", payload);
    return res.data;
  },

  // Listar formularios
  async listar(busqueda = "", estado = "TODOS"): Promise<Formulario[]> {
    try {
      const response = await api.get("/parametrizacion/formularios", {
        params: {
          ...(busqueda && { busqueda }),
          ...(estado !== "TODOS" && { estado }),
        },
      });
      return Array.isArray(response.data)
        ? response.data
        : (response.data?.data ?? response.data?.formularios ?? []);
    } catch (err) {
      console.error("Error cargando formularios:", err);
      return [];
    }
  },

  // Eliminar formulario. Lanza el mensaje del backend (ej. "es el
  // formulario activo" o "ya tiene solicitudes asociadas") para que la
  // pantalla se lo muestre al usuario en vez de fallar en silencio.
  async eliminar(id: number): Promise<boolean> {
    try {
      await api.delete(`/parametrizacion/formularios/${id}`);
      return true;
    } catch (error: any) {
      const mensaje =
        error?.response?.data?.message || "Error eliminando formulario";
      throw new Error(mensaje);
    }
  },

  // Obtener preguntas activas
  async getPreguntasActivas() {
    const response = await api.get(
      "/parametrizacion/formulario-preguntas/activas",
    );
    return response.data;
  },

  // Obtener secciones de un formulario
  async getSeccionesFormulario(formularioId: number) {
    const response = await api.get(`/formulario/${formularioId}/secciones`);
    return response.data;
  },

  // Obtener formulario con versiones
  async getFormularioVersiones(formularioId: number) {
    try {
      const res = await api.get(
        `/parametrizacion/formularios/${formularioId}/versiones`,
      );
      return res.data;
    } catch (error) {
      console.error("Error cargando versiones:", error);
      // Retornar estructura vacía para evitar bloqueo
      return { formulario: null, versiones: [] };
    }
  },

  // Obtener todas las secciones
  async getSecciones(): Promise<Seccion[]> {
    const res = await api.get("/parametrizacion/formulario-secciones");
    return res.data;
  },

  // Obtener tipos de pregunta
  async getTiposPregunta(
    includeInactivos: boolean = true,
  ): Promise<TipoPregunta[]> {
    const res = await api.get("/parametrizacion/formulario-tipos-pregunta", {
      params: { includeInactivos },
    });
    return res.data;
  },

  // Obtener todas las preguntas
  async getPreguntas(): Promise<Pregunta[]> {
    const res = await api.get("/parametrizacion/formulario-preguntas");
    return res.data;
  },

  // Obtener formulario activo
  async getFormularioActivo(): Promise<Formulario | null> {
    const res = await api.get("/parametrizacion/formularios/activo");
    return res.data;
  },

  // Obtener formulario completo (optimizado con endpoint único)
  async getFormularioCompleto(formularioId: number, version?: string) {
    try {
      const res = await api.get(
        `/parametrizacion/formularios/${formularioId}/completo`,
        version ? { params: { version } } : {},
      );
      return res.data;
    } catch (error) {
      console.error("Error cargando formulario completo:", error);
      return {
        formulario: null,
        secciones: [],
        preguntas: [],
        tiposPregunta: [],
      };
    }
  },

  // Cargar datos completos del formulario (mantenerlo para backwards compatibility)
  async cargarFormularioCompleto(
    formularioId: number | null,
    version: string | null,
  ) {
    if (!formularioId) {
      return {
        formulario: null,
        secciones: [],
        tiposPregunta: [],
        preguntas: [],
      };
    }

    // Usar el nuevo endpoint optimizado
    return this.getFormularioCompleto(formularioId, version || undefined);
  },
};
