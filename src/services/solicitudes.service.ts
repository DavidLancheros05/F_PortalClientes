// src/services/solicitudes.service.ts
import api from "@/services/core/api";
import { formularioRespuestasService } from "@/services/formulario-respuestas.service";
import { workflowSolicitudesService } from "@/services/workflow-solicitudes.service";
import { ESTADO_SOLICITUD } from "@/constants/estado-solicitud";
import { AccionSolicitud } from "@/constants/acciones-solicitud";
import { extractSolicitudId } from "@/utils/response-normalizers";

export const solicitudesService = {
  // Crear nueva solicitud
  async create(data: any) {
    const response = await api.post("/solicitudes", data);
    return response.data;
  },

  // Obtener todas las solicitudes (sin filtros)
  async getAll() {
    try {
      const response = await api.get("/solicitudes");
      return response.data;
    } catch (error) {
      console.error(
        "[solicitudesService] Error obteniendo all solicitudes:",
        error,
      );
      throw error;
    }
  },

  // Obtener todas las solicitudes del cliente
  async getAllByCliente(clienteId: number, params?: any) {
    try {
      if (!clienteId) {
        throw new Error("No se proporcionó cliente ID");
      }
      const response = await api.get(`/solicitudes/cliente/${clienteId}`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error(
        "[solicitudesService] Error obteniendo solicitudes:",
        error,
      );
      throw error;
    }
  },

  // Obtener una solicitud específica
  async getById(id: number) {
    const response = await api.get(`/solicitudes/${id}`);
    return response.data;
  },

  // alias utilizado por varios componentes antiguos
  async getOne(id: number) {
    return this.getById(id);
  },

  // Obtener respuestas de una solicitud
  async getRespuestas(id: number) {
    const response = await api.get(`/solicitudes/${id}/respuestas`);
    return response.data;
  },

  // Cambiar estado de una solicitud
  async cambiarEstado(id: number, estadoId: number) {
    const response = await api.patch(`/solicitudes/${id}/estado`, { estadoId });
    return response.data;
  },

  // Actualizar respuestas del formulario de una solicitud
  async updateRespuestas(id: number, respuestas: any[]) {
    const response = await api.patch(
      `/solicitudes/${id}/respuestas`,
      respuestas,
    );
    return response.data;
  },

  // Probar conexión
  async testConnection() {
    const response = await api.get("/solicitudes/test");
    return response.data;
  },

  // Obtener solicitudes pendientes para un ejecutivo
  async getForEjecutivo(ejecutivoId: number) {
    console.log("solicitudesService.getForEjecutivo");
    try {
      console.log(
        "[solicitudesService] getForEjecutivo -> ejecutivoId:",
        ejecutivoId,
      );
      if (!ejecutivoId) throw new Error("No se proporcionó ejecutivoId");

      const response = await api.get(
        `/solicitudes/ejecutivo/${ejecutivoId}/pendientes`,
      );
      console.log(
        "[solicitudesService] response.data pendientes:",
        response.data,
      );
      return response.data;
    } catch (error) {
      console.error("[solicitudesService] Error obteniendo pendientes:", error);
      throw error;
    }
  },
  async getSolicitudesPendientes() {
    try {
      const response = await api.get(`/solicitudes/pendientes`);
      console.log(
        "[solicitudesService] response.data pendientes:",
        response.data,
      );
      return response.data;
    } catch (error) {
      console.error("[solicitudesService] Error obteniendo pendientes:", error);
      throw error;
    }
  },

  // Actualizar campos editables de una solicitud (solo si está pendiente)
  async update(id: number, data: any) {
    try {
      const response = await api.patch(`/solicitudes/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(
        "[solicitudesService] Error actualizando solicitud:",
        error,
      );
      throw error;
    }
  },

  async actualizarEjecutivo(
    id: number,
    data: {
      consumoMensualEjecutivo?: number;
      observacionesEjecutivo?: string;
      usuarioRegistroEjecutivo?: number;
    },
  ) {
    try {
      const response = await api.patch(`/solicitudes/${id}/ejecutivo`, data);
      return response.data;
    } catch (error) {
      console.error(
        "[solicitudesService] Error actualizando ejecutivo de solicitud:",
        error,
      );
      throw error;
    }
  },

  async remove(id: number) {
    try {
      const response = await api.delete(`/solicitudes/${id}`);
      return response.data;
    } catch (error) {
      console.error("[solicitudesService] Error eliminando solicitud:", error);
      throw error;
    }
  },

  async getListado(params?: any) {
    // console.log(
    //   "🟠 [FRONTEND-SERVICE] 3️⃣ getListado llamado con params:",
    //   params,
    // );
    try {
      const response = await api.get("/solicitudes/listado", { params });
      // console.log(
      //   "🟠 [FRONTEND-SERVICE] Respuesta obtenida, datos:",
      //   response.data?.length
      //     ? `${response.data.length} registros`
      //     : response.data,
      // );
      return response.data;
    } catch (error) {
      // console.error("🟠 [FRONTEND-SERVICE] Error en getListado:", error);
      throw error;
    }
  },

  // Obtener documentos de solicitudes
  async getDocumentos(params?: any) {
    const response = await api.get("/solicitudes/documentos", { params });
    return response.data;
  },

  // Obtener documentos requeridos de una solicitud
  async getDocumentosRequeridos(solicitudId: number) {
    const response = await api.get(
      `/solicitudes/${solicitudId}/documentos-requeridos`,
    );
    return response.data;
  },

  // Guardar concepto del ejecutivo (delegado a workflow service)
  async guardarGestionEjecutivo(
    id: number,
    data: {
      consumo_mensual_proyectado?: number;
      observacionesComercial?: string;
      usuario_modifica?: number;
    },
  ) {
    return workflowSolicitudesService.guardarGestionEjecutivo(id, data);
  },

  // Registrar aprobación o desaprobación (delegado a workflow service)
  async registrarAprobacion(
    id: number,
    data: {
      aprobado: boolean;
      motivo_rechazo_id?: number | null;
      fecha_estimada_respuesta_comercial?: string | null;
      fecha_real_respuesta_comercial?: string | null;
      usuario_modifica?: number;
    },
  ) {
    return workflowSolicitudesService.registrarAprobacion(id, data);
  },

  // Obtener solicitudes por centro de operación
  async getPorCentro(params?: any) {
    const response = await api.get("/solicitudes/por-centro-operacion", {
      params,
    });
    return response.data;
  },

  // Obtener solicitudes por rol (genérico)
  async getSolicitudesPorRol(
    rol:
      | "auxiliar-servicio-cliente"
      | "oc"
      | "comite-credito-1"
      | "comite-credito-2",
    usuarioId: number,
    params?: any,
  ) {
    // Mapeo de rol a filtros
    const filtrosPorRol = {
      "auxiliar-servicio-cliente": {
        etapa_id: 3,
        resultado_etapa_id: 1,
        estado_id: ESTADO_SOLICITUD.REVISION.id,
      },
      oc: {
        etapa_id: 4,
        resultado_etapa_id: 1,
        estado_id: ESTADO_SOLICITUD.REVISION.id,
      },
      "comite-credito-1": {
        etapa_id: 5,
        resultado_etapa_id: 1,
        estado_id: ESTADO_SOLICITUD.REVISION.id,
      },
      "comite-credito-2": {
        etapa_id: 6,
        resultado_etapa_id: 1,
        estado_id: ESTADO_SOLICITUD.REVISION.id,
      },
    };

    const filtros = filtrosPorRol[rol];
    const response = await api.get(`/solicitudes/listado/${usuarioId}`, {
      params: { ...filtros, ...params },
    });
    return response.data;
  },

  // Métodos específicos que usan el genérico (backward compatibility)
  async getSolicitudesPendientesAuxiliarServicioCliente(
    usuarioId: number,
    params?: any,
  ) {
    return this.getSolicitudesPorRol(
      "auxiliar-servicio-cliente",
      usuarioId,
      params,
    );
  },

  async getSolicitudesParaOC(usuarioId: number, params?: any) {
    return this.getSolicitudesPorRol("oc", usuarioId, params);
  },

  async getSolicitudesParaComiteCredito1(usuarioId: number, params?: any) {
    return this.getSolicitudesPorRol("comite-credito-1", usuarioId, params);
  },

  async getSolicitudesParaComiteCredito2(usuarioId: number, params?: any) {
    return this.getSolicitudesPorRol("comite-credito-2", usuarioId, params);
  },

  // Guardar concepto por rol (delegado a workflow service)
  async guardarConceptoPorRol(
    rol: "comite-credito-1" | "comite-credito-2",
    id: number,
    data: { comentario: string; recomendacion?: string },
  ) {
    return workflowSolicitudesService.guardarConceptoPorRol(rol, id, data);
  },

  // Guardar concepto Comité Crédito 1 (backward compatibility wrapper)
  async guardarConceptoComiteCredito1(
    id: number,
    data: { comentario: string; recomendacion?: string },
  ) {
    return workflowSolicitudesService.guardarConceptoComiteCredito1(id, data);
  },

  // Guardar concepto Comité Crédito 2 (backward compatibility wrapper)
  async guardarConceptoComiteCredito2(
    id: number,
    data: { comentario: string; recomendacion?: string },
  ) {
    return workflowSolicitudesService.guardarConceptoComiteCredito2(id, data);
  },

  // Descargar PDF de una solicitud
  async downloadPdf(id: number) {
    const response = await api.get(`/solicitudes/${id}/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },

  // Obtener última solicitud pendiente de un cliente
  async getUltimaSolicitudPendiente(clienteId: number) {
    const response = await api.get(
      `/solicitudes/cliente/${clienteId}/ultima-pendiente`,
    );
    return response.data;
  },

  // Obtener última solicitud completada (aprobada, rechazada, cancelada) con sus respuestas
  async getUltimaSolicitudCompletada(clienteId: number) {
    const response = await api.get(
      `/solicitudes/cliente/${clienteId}/ultima-completada`,
    );
    return response.data;
  },

  // Obtener última solicitud del cliente (independiente del estado) con respuestas
  async getUltimaSolicitud(clienteId: number) {
    const response = await api.get(`/solicitudes/cliente/${clienteId}/ultima`);
    return response.data;
  },

  // Obtener última solicitud con respuestas de un cliente
  async getUltimaSolicitudRespuestas(clienteId: number) {
    const response = await api.get(
      `/solicitudes/cliente/${clienteId}/ultima-respuestas`,
    );
    return response.data;
  },

  // Guardar respuestas de formulario
  async guardarRespuestasFormulario(solicitudId: number, respuestas: any[]) {
    const response = await api.post("/formulario/respuestas", {
      solicitud_id: solicitudId,
      respuestas,
    });
    return response.data;
  },

  // Guardar solicitud (unificado para BORRADOR y ENVIAR)
  async guardarSolicitud(
    solicitudId: number | null,
    respuestas: any,
    preguntas: any[],
    clienteId: number,
    usuarioId: number | null,
    accion: AccionSolicitud,
    hasValorEnRespuesta?: (r: any) => boolean,
    options?: { isCorrecionASC?: boolean },
  ) {
    let targetSolicitudId =
      solicitudId && !isNaN(solicitudId) ? solicitudId : null;

    const estado =
      accion === AccionSolicitud.BORRADOR
        ? ESTADO_SOLICITUD.BORRADOR
        : ESTADO_SOLICITUD.PENDIENTE;
    const soloConValor = accion === AccionSolicitud.BORRADOR;

    // Crear solicitud si es nueva
    if (!targetSolicitudId) {
      console.log("[guardarSolicitud] Usuario a usar:", { usuarioId, accion });

      const nuevaSolicitud = await this.create({
        cliente_id: clienteId,
        co_id: 1,
        usuario_crea: usuarioId,
        estado_id: estado.id,
      });

      console.log(
        "[guardarSolicitud] Respuesta de crear solicitud:",
        nuevaSolicitud,
      );

      targetSolicitudId = extractSolicitudId(nuevaSolicitud);

      // Si es nueva y es ENVIAR, cambiar estado a PENDIENTE
      if (accion === AccionSolicitud.ENVIAR) {
        await this.cambiarEstado(
          targetSolicitudId,
          ESTADO_SOLICITUD.PENDIENTE.id,
        );
      }
    } else {
      // Si es solicitud existente, cambiar estado según acción
      if (accion === AccionSolicitud.ENVIAR) {
        // Para corrección ASC: mantener estado REVISIÓN (3), etapa ASC (3), resultado PENDIENTE (1)
        // Para otros casos: cambiar a estado PENDIENTE (2)
        if (options?.isCorrecionASC) {
          // Ya se manejará en el paso siguiente con llamada a /resultado-pendiente
          console.log("[guardarSolicitud] Guardando corrección ASC - sin cambio de estado");
        } else {
          await this.cambiarEstado(
            targetSolicitudId,
            ESTADO_SOLICITUD.PENDIENTE.id,
          );
        }
      }
    }

    // Guardar respuestas y archivos
    const respuestasGuardadas =
      await formularioRespuestasService.guardarRespuestasYArchivos({
        solicitudId: targetSolicitudId,
        respuestas,
        preguntas,
        soloConValor,
        hasValorEnRespuesta: soloConValor ? hasValorEnRespuesta : undefined,
      });

    // Si es corrección ASC, actualizar resultado a PENDIENTE (1)
    if (options?.isCorrecionASC && targetSolicitudId) {
      try {
        await api.patch(`/solicitudes/${targetSolicitudId}/resultado-pendiente`);
      } catch (error) {
        console.error("Error actualizando resultado a pendiente:", error);
        // No lanzar error, solo registrar
      }
    }

    return { solicitudId: targetSolicitudId, respuestasGuardadas };
  },

  // Guardar solicitud completa (backward compatibility wrapper)
  async guardarSolicitudCompleta(
    solicitudId: number | null,
    respuestas: any,
    preguntas: any[],
    clienteId: number,
    usuarioId: number | null,
    options?: { isCorrecionASC?: boolean },
  ) {
    return this.guardarSolicitud(
      solicitudId,
      respuestas,
      preguntas,
      clienteId,
      usuarioId,
      AccionSolicitud.ENVIAR,
      undefined,
      options,
    );
  },

  // Guardar borrador de solicitud (backward compatibility wrapper)
  async guardarBorrador(
    solicitudId: number | null,
    respuestas: any,
    preguntas: any[],
    clienteId: number,
    usuarioId: number,
    hasValorEnRespuesta: (r: any) => boolean,
  ) {
    return this.guardarSolicitud(
      solicitudId,
      respuestas,
      preguntas,
      clienteId,
      usuarioId,
      AccionSolicitud.BORRADOR,
      hasValorEnRespuesta,
    );
  },

  // Guardar revisión de cumplimiento (delegado a workflow service)
  async guardarRevisionCumplimiento(
    id: number,
    data: {
      comentario: string;
      aprobado?: boolean;
      motivo_rechazo_id?: number | null;
    },
  ) {
    return workflowSolicitudesService.guardarRevisionCumplimiento(id, data);
  },

  // Obtener historial de workflow (delegado a workflow service)
  async obtenerHistorialWorkflow(solicitudId: number) {
    return workflowSolicitudesService.obtenerHistorialWorkflow(solicitudId);
  },

  // Obtener lista de etapas (delegado a workflow service)
  async getEtapas() {
    return workflowSolicitudesService.getEtapas();
  },

  // Obtener lista de resultados (delegado a workflow service)
  async getResultados() {
    return workflowSolicitudesService.getResultados();
  },

  // Actualizar estado del flujo (delegado a workflow service)
  async actualizarEstadoFlujo(
    id: number,
    data: {
      estado_id: number;
      etapa_actual_id: number;
      resultado_etapa_id: number;
      usuario_modifica: number;
    },
  ) {
    return workflowSolicitudesService.actualizarEstadoFlujo(id, data);
  },

  // Actualizar estado del flujo automático (delegado a workflow service)
  async actualizarEstadoFlujoAutomatico(
    id: number,
    data: {
      estadoCodigo: string;
      etapaCodigo: string;
      resultadoCodigo: string;
      usuario_modifica: number;
    },
  ) {
    return workflowSolicitudesService.actualizarEstadoFlujoAutomatico(id, data);
  },

  // Obtener solicitudes con filtros específicos
  async getSolicitudesConFiltros(
    usuarioId: number,
    filtros: {
      estado_id?: number;
      etapa_id?: number;
      resultado_etapa_id?: number;
    },
  ) {
    try {
      const params = new URLSearchParams();
      if (filtros.estado_id !== undefined) {
        params.append("estado_id", String(filtros.estado_id));
      }
      if (filtros.etapa_id !== undefined) {
        params.append("etapa_id", String(filtros.etapa_id));
      }
      if (filtros.resultado_etapa_id !== undefined) {
        params.append("resultado_etapa_id", String(filtros.resultado_etapa_id));
      }

      const response = await api.get(
        `/solicitudes/listado/${usuarioId}?${params.toString()}`,
      );
      return response.data;
    } catch (error) {
      console.error(
        "[solicitudesService] Error obteniendo solicitudes con filtros:",
        error,
      );
      throw error;
    }
  },
};
