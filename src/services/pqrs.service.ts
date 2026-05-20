import api from "@/services/core/api";

interface CreatePQRSPayload {
  pqrs_pt_id: number;
  pqrs_titulo: string;
  pqrs_descripcion: string;
  pqrs_pri_id?: number;
}

export type PqrsEstado =
  | "RECIBIDO"
  | "EN_CLASIFICACION"
  | "ASIGNADO"
  | "EN_GESTION"
  | "RESPONDIDO"
  | "CERRADO"
  | "ESCALADO";

export interface PqrsDetalle {
  pqrs_id: number;
  radicado: string;
  asunto: string;
  tipo: string;
  estado: PqrsEstado;
  prioridad: string;
  sla_estado?: string;
  horas_para_vencimiento?: number;
  solicitante_nombre: string;
  solicitante_email: string;
  descripcion: string;
}

export interface PqrsSeguimiento {
  seguimiento_id: number;
  tipo_evento: string;
  fecha_evento: string;
  mensaje: string;
  estado_anterior?: string;
  estado_nuevo?: string;
}

export const pqrsService = {
  async getTipos() {
    try {
      const response = await api.get("/pqrs/tipos");
      return response.data;
    } catch (error) {
      console.error("Error obteniendo tipos de PQRS:", error);
      throw error;
    }
  },

  async getEstados() {
    try {
      const response = await api.get("/pqrs/estados");
      return response.data;
    } catch (error) {
      console.error("Error obteniendo estados de PQRS:", error);
      throw error;
    }
  },

  async create(payload: CreatePQRSPayload) {
    try {
      const response = await api.post("/pqrs", payload);
      return response.data;
    } catch (error) {
      console.error("Error creando PQRS:", error);
      throw error;
    }
  },

  async getListado(params?: any) {
    try {
      const response = await api.get("/pqrs", { params });
      return response.data;
    } catch (error) {
      console.error("Error obteniendo listado de PQRS:", error);
      throw error;
    }
  },

  async getById(id: number) {
    try {
      const response = await api.get(`/pqrs/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error obteniendo PQRS:", error);
      throw error;
    }
  },

  async update(id: number, payload: Partial<CreatePQRSPayload>) {
    try {
      const response = await api.put(`/pqrs/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error("Error actualizando PQRS:", error);
      throw error;
    }
  },

  async addComentario(
    pqrsId: number,
    comentario: string,
    esInterno: boolean = false,
  ) {
    try {
      const response = await api.post(`/pqrs/${pqrsId}/comentarios`, {
        pc_comentario: comentario,
        pc_es_interno: esInterno,
      });
      return response.data;
    } catch (error) {
      console.error("Error añadiendo comentario:", error);
      throw error;
    }
  },

  async getComentarios(pqrsId: number) {
    try {
      const response = await api.get(`/pqrs/${pqrsId}/comentarios`);
      return response.data;
    } catch (error) {
      console.error("Error obteniendo comentarios:", error);
      throw error;
    }
  },

  async getHistorial(pqrsId: number) {
    try {
      const response = await api.get(`/pqrs/${pqrsId}/historial`);
      return response.data;
    } catch (error) {
      console.error("Error obteniendo historial:", error);
      throw error;
    }
  },

  async obtener(id: number): Promise<PqrsDetalle> {
    try {
      const response = await api.get(`/pqrs/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error obteniendo PQRS:", error);
      throw error;
    }
  },

  async listarSeguimiento(pqrsId: number): Promise<PqrsSeguimiento[]> {
    try {
      const response = await api.get(`/pqrs/${pqrsId}/historial`);
      return response.data;
    } catch (error) {
      console.error("Error obteniendo seguimiento:", error);
      throw error;
    }
  },

  async cambiarEstado(
    id: number,
    payload: {
      estadoId: number;
      comentario?: string;
      usr_id?: number;
      nombre?: string;
    },
  ) {
    try {
      const response = await api.put(`/pqrs/${id}`, {
        pqrs_pe_id: payload.estadoId,
      });
      return response.data;
    } catch (error) {
      console.error("Error cambiando estado:", error);
      throw error;
    }
  },

  async responder(
    id: number,
    payload: {
      mensaje: string;
      cambiar_estado_a?: PqrsEstado;
      usr_id?: number;
      nombre?: string;
    },
  ) {
    try {
      const response = await api.post(`/pqrs/${id}/comentarios`, {
        pc_comentario: payload.mensaje,
        pc_es_interno: false,
      });

      if (payload.cambiar_estado_a) {
        await this.cambiarEstado(id, {
          estado: payload.cambiar_estado_a,
          comentario: `Respuesta registrada: ${payload.mensaje}`,
          usr_id: payload.usr_id,
          nombre: payload.nombre,
        });
      }

      return response.data;
    } catch (error) {
      console.error("Error respondiendo PQRS:", error);
      throw error;
    }
  },

  async asignar(id: number, usuarioAsignado: number) {
    try {
      const response = await api.put(`/pqrs/${id}/asignar`, {
        pqrs_usr_asignado_id: usuarioAsignado,
      });
      return response.data;
    } catch (error) {
      console.error("Error asignando PQRS:", error);
      throw error;
    }
  },
};
