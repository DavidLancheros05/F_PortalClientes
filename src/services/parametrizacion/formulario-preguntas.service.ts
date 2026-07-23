import api from '@/services/core/api';

function extraerMensajeError(error: any, fallback: string): string {
  return error?.response?.data?.message || fallback;
}

export interface FormularioPregunta {
  fp_id?: number;
  fp_descripcion: string;
  fp_tipo: string;
  fp_subtipo?: string;
  fp_patron?: string | null;
  seccion_id?: number | null;
  fp_estado?: boolean;
  fp_requerida?: boolean;
  fp_orden?: number;
  fp_version?: number;
  formulario_id?: number;
  fp_pregunta_padre_id?: number | null;
  fp_valor_padre_disparador?: string | null;
  fp_catalogo_base_datos?: string | null;
  fp_catalogo_tabla?: string | null;
  fp_catalogo_columna?: string | null;
  fp_tipo_documento_id?: number | null;
  fp_precarga_fuente?: string | null;
  fp_precarga_campo_cliente?: string | null;
  seccion_nombre?: string | null;
  seccion_orden?: number | null;
  fp_tabla_columnas?: string | null;
}

export interface Opcion {
  fpo_id: number;
  fpo_valor?: string; // campo actual en BD
  op_descripcion?: string; // fallback para compatibilidad
  fpo_estado: boolean;
}

export const formularioPreguntasService = {
  async getAll(): Promise<FormularioPregunta[]> {
    const res = await api.get("/parametrizacion/formulario-preguntas");
    return res.data;
  },

  // Preguntas del formulario activo (última versión), para el selector de
  // variables al editar la plantilla de un tipo de documento.
  async getFormularioActivo(): Promise<FormularioPregunta[]> {
    const res = await api.get(
      "/parametrizacion/formulario-preguntas/formulario-activo",
    );
    return res.data;
  },

  async create(payload: FormularioPregunta): Promise<any> {
    const res = await api.post("/parametrizacion/formulario-preguntas", payload);
    return res.data;
  },

  async update(fpId: number, payload: Partial<FormularioPregunta>): Promise<any> {
    try {
      const res = await api.put(`/parametrizacion/formulario-preguntas/${fpId}`, payload);
      return res.data;
    } catch (error) {
      throw new Error(extraerMensajeError(error, "Error al editar la pregunta"));
    }
  },

  async delete(fpId: number): Promise<void> {
    try {
      await api.delete(`/parametrizacion/formulario-preguntas/${fpId}`);
    } catch (error) {
      throw new Error(extraerMensajeError(error, "Error al eliminar la pregunta"));
    }
  },

  async getOpciones(fpId: number): Promise<Opcion[]> {
    const res = await api.get(`/parametrizacion/formulario-preguntas/${fpId}/opciones`);
    return res.data;
  },

  async createOpcion(fpId: number, valor: string): Promise<Opcion> {
    const res = await api.post(
      `/parametrizacion/formulario-preguntas/${fpId}/opciones`,
      { fpo_valor: valor },
    );
    return res.data;
  },

  async updateOpcion(
    fpId: number,
    fpoId: number,
    payload: { fpo_valor?: string; fpo_estado?: boolean },
  ): Promise<Opcion> {
    try {
      const res = await api.put(
        `/parametrizacion/formulario-preguntas/${fpId}/opciones/${fpoId}`,
        payload,
      );
      return res.data;
    } catch (error) {
      throw new Error(extraerMensajeError(error, "Error al editar la opción"));
    }
  },

  async deleteOpcion(fpId: number, fpoId: number): Promise<void> {
    try {
      await api.delete(
        `/parametrizacion/formulario-preguntas/${fpId}/opciones/${fpoId}`,
      );
    } catch (error) {
      throw new Error(extraerMensajeError(error, "Error al eliminar la opción"));
    }
  },

  async syncOpciones(
    fpId: number,
    opcionesTarget: string[],
  ): Promise<void> {
    const normalizarOpciones = (values: string[]) =>
      Array.from(new Set(values.map((v) => v.trim()).filter((v) => v)));

    const objetivo = normalizarOpciones(opcionesTarget);
    const actuales = await this.getOpciones(fpId);

    const actualesMap = new Map(
      actuales
        .filter((item) => item.fpo_estado)
        .map((item) => [(item.fpo_valor || item.op_descripcion || "").trim(), item.fpo_id]),
    );
    const objetivoSet = new Set(objetivo);
    const paraCrear = objetivo.filter((item) => !actualesMap.has(item));
    const paraEliminar = actuales
      .filter((item) => item.fpo_estado && !objetivoSet.has((item.fpo_valor || item.op_descripcion || "").trim()))
      .map((item) => item.fpo_id);

    if (paraCrear.length > 0) {
      await Promise.all(
        paraCrear.map((opcion) => this.createOpcion(fpId, opcion)),
      );
    }
    if (paraEliminar.length > 0) {
      await Promise.all(
        paraEliminar.map((opcionId) => this.deleteOpcion(fpId, opcionId)),
      );
    }
  },
};
