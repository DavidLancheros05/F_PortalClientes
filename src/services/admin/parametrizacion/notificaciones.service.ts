import api from '@/services/core/api';

export type PlantillaNotificacion = {
  plantilla_id: number;
  codigo_evento: string;
  nombre: string;
  asunto: string;
  cuerpo_html: string;
  destinatarios_to: string | null;
  destinatarios_cc: string | null;
  activa: boolean;
  updated_at: string;
};

const API_BASE = "notificaciones/plantillas";

export const notificacionesService = {
  async getAll(): Promise<PlantillaNotificacion[]> {
    const response = await api.get<PlantillaNotificacion[]>(API_BASE);
    return response.data;
  },

  async update(
    codigo: string,
    data: {
      nombre?: string;
      asunto?: string;
      cuerpo_html?: string;
      destinatarios_to?: string;
      destinatarios_cc?: string;
      activa?: boolean;
    }
  ) {
    const response = await api.put(`${API_BASE}/${encodeURIComponent(codigo)}`, data);
    return response.data;
  },

  async create(data: {
    codigo_evento: string;
    nombre: string;
    asunto: string;
    cuerpo_html: string;
    destinatarios_to?: string;
    destinatarios_cc?: string;
    activa?: boolean;
  }) {
    const response = await api.put(
      `${API_BASE}/${encodeURIComponent(data.codigo_evento)}`,
      {
        nombre: data.nombre,
        asunto: data.asunto,
        cuerpo_html: data.cuerpo_html,
        destinatarios_to: data.destinatarios_to || '',
        destinatarios_cc: data.destinatarios_cc || '',
        activa: data.activa ?? true,
      }
    );
    return response.data;
  },
};
