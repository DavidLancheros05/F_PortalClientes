// Servicio especializado en workflow de solicitudes
import api from "@/services/core/api";

export const workflowSolicitudesService = {
  // Guardar concepto del ejecutivo
  async guardarGestionEjecutivo(
    id: number,
    data: {
      consumo_mensual_proyectado?: number | null;
      observacionesComercial?: string;
      usuario_modifica?: number;
      fecha_real_ejecutivo?: string;
    },
  ) {
    const response = await api.put(
      `/solicitudes/${id}/concepto-ejecutivo`,
      data,
    );
    return response.data;
  },

  // Registrar aprobación o desaprobación
  async registrarAprobacion(
    id: number,
    data: {
      aprobado: boolean;
      motivo_rechazo_id?: number | null;
      modo_solucion?: string | null;
      fecha_estimada_respuesta_comercial?: string | null;
      fecha_real_respuesta_comercial?: string | null;
      usuario_modifica?: number;
      documentos_faltantes?: number[];
    },
  ) {
    const response = await api.put(`/solicitudes/${id}/aprobacion`, data);
    return response.data;
  },

  // Guardar revisión de cumplimiento
  async guardarRevisionCumplimiento(
    id: number,
    data: {
      comentario: string;
      aprobado?: boolean;
      motivo_rechazo_id?: number | null;
    },
  ) {
    try {
      const response = await api.put(
        `/solicitudes/${id}/concepto-oficial-cumplimiento`,
        data,
      );
      return response.data;
    } catch (error) {
      console.error(
        "[workflowSolicitudesService] Error guardando revisión de cumplimiento:",
        error,
      );
      throw error;
    }
  },

  // Guardar concepto por rol (genérico)
  async guardarConceptoPorRol(
    rol: "comite-credito-1" | "comite-credito-2",
    id: number,
    data: { comentario: string; recomendacion?: string },
  ) {
    const response = await api.put(`/solicitudes/${id}/concepto-${rol}`, data);
    return response.data;
  },

  // Guardar concepto Comité de Crédito 1 (backward compatibility)
  async guardarConceptoComiteCredito1(
    id: number,
    data: { comentario: string; recomendacion?: string },
  ) {
    return this.guardarConceptoPorRol("comite-credito-1", id, data);
  },

  // Guardar concepto Comité de Crédito 2 (backward compatibility)
  async guardarConceptoComiteCredito2(
    id: number,
    data: {
      comentario: string;
      recomendacion?: string;
      cupo?: number;
      plazoPago?: number;
      formaPago?: string;
    },
  ) {
    const response = await api.put(
      `/solicitudes/${id}/concepto-comite-credito-2`,
      data,
    );
    return response.data;
  },

  // Obtener historial de workflow de una solicitud
  async obtenerHistorialWorkflow(solicitudId: number) {
    try {
      const response = await api.get(
        `/solicitudes/${solicitudId}/workflow-historial`,
      );
      return response.data;
    } catch (error) {
      console.warn(
        "[workflowSolicitudesService] Error obteniendo historial workflow:",
        error,
      );
      return null;
    }
  },

  // Obtener lista de etapas
  async getEtapas() {
    try {
      const response = await api.get("/solicitudes/workflow/etapas");
      return response.data;
    } catch (error) {
      console.error(
        "[workflowSolicitudesService] Error obteniendo etapas:",
        error,
      );
      return [];
    }
  },

  // Obtener lista de resultados
  async getResultados() {
    try {
      const response = await api.get("/solicitudes/workflow/resultados");
      return response.data;
    } catch (error) {
      console.error(
        "[workflowSolicitudesService] Error obteniendo resultados:",
        error,
      );
      return [];
    }
  },

  // Actualizar estado del flujo (genérico)
  async actualizarEstadoFlujo(
    id: number,
    data: {
      estado_id: number;
      etapa_actual_id: number;
      resultado_etapa_id: number;
      usuario_modifica: number;
    },
  ) {
    try {
      const response = await api.put(`/solicitudes/${id}/estado-flujo`, data);
      return response.data;
    } catch (error) {
      console.error(
        "[workflowSolicitudesService] Error actualizando estado de flujo:",
        error,
      );
      throw error;
    }
  },

  // Actualizar estado del flujo automático
  async actualizarEstadoFlujoAutomatico(
    id: number,
    data: {
      estadoCodigo: string;
      etapaCodigo: string;
      resultadoCodigo: string;
      usuario_modifica: number;
    },
  ) {
    try {
      const response = await api.put(
        `/solicitudes/${id}/estado-flujo-automatico`,
        data,
      );
      return response.data;
    } catch (error) {
      console.error(
        "[workflowSolicitudesService] Error actualizando estado de flujo automático:",
        error,
      );
      throw error;
    }
  },
};
