import api from "@/services/core/api";
import {
  ClienteListResponse,
  ClienteDetailResponse,
  ClienteCentroResponse,
  CentroOperacionResponse,
  TipoIdentificacionResponse,
  RolResponse,
  CorreoPorRolResponse,
} from "@/types/api.types";

export interface Usuario {
  usr_id: number;
  nombre: string;
}

/**
 * @deprecated Usar ClienteListResponse o ClienteDetailResponse
 */
export type Cliente = ClienteDetailResponse;

/**
 * @deprecated Usar CentroOperacionResponse de @/types/api.types
 */
export type CentroOperacion = CentroOperacionResponse;

/**
 * @deprecated Usar TipoIdentificacionResponse de @/types/api.types
 */
export type TipoIdentificacion = TipoIdentificacionResponse;

export const clientesService = {
  getAll: async (): Promise<ClienteListResponse[]> => {
    const res = await api.get("/clientes");
    return res.data;
  },

  getClientesByCentro: async (
    centroId: number,
  ): Promise<ClienteListResponse[]> => {
    const res = await api.get(`/clientes/centro/${centroId}`);
    return res.data;
  },

  getById: async (clienteId: number): Promise<ClienteDetailResponse> => {
    const res = await api.get(`/clientes/${clienteId}`);
    return res.data;
  },

  precargarSolicitud: async (
    clienteId: number,
  ): Promise<ClienteDetailResponse> => {
    const res = await api.get(`/clientes/${clienteId}/precarga-solicitud`);
    return res.data;
  },

  create: async (payload: {
    razonSocial: string;
    nitDocumento: string;
    tipoIdentificacion: number;
    direccion: string;
    correo?: string;
    habilitaAcceso?: boolean;
    ejecutivoId?: number;
    centro_operacion_ids: number[];
  }): Promise<ClienteDetailResponse> => {
    const res = await api.post("/clientes", payload);
    return res.data;
  },

  update: async (
    clienteId: number,
    payload: Partial<{
      razonSocial: string;
      nitDocumento: string;
      tipoIdentificacion: number;
      direccion: string;
      correo: string;
      habilitaAcceso: boolean;
      centro_operacion_ids: number[];
      ejecutivoId: number | null;
    }>,
  ): Promise<ClienteDetailResponse> => {
    const res = await api.put(`/clientes/${clienteId}`, payload);
    return res.data;
  },

  getCentrosOperacion: async (
    clienteId: number,
  ): Promise<ClienteCentroResponse[]> => {
    const res = await api.get(`/clientes/${clienteId}/centros-operacion`);
    return res.data;
  },

  getTiposIdentificacion: async (): Promise<TipoIdentificacionResponse[]> => {
    const res = await api.get("/tipos-identificacion");
    return res.data;
  },

  getAllCentrosOperacion: async (): Promise<CentroOperacionResponse[]> => {
    const res = await api.get("/centros-operacion");
    return res.data;
  },

  getEjecutivos: async (): Promise<Usuario[]> => {
    const res = await api.get("/usuarios/ejecutivos");
    return res.data;
  },

  habilitarAcceso: async (clienteId: number): Promise<void> => {
    await api.post(`/clientes/${clienteId}/habilitar-acceso`, {});
  },

  deshabilitarAcceso: async (clienteId: number): Promise<void> => {
    await api.post(`/clientes/${clienteId}/deshabilitar-acceso`, {});
  },
};
