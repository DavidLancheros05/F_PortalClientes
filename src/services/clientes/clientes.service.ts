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

  getEjecutivosNegocio: async (): Promise<
    { ejng_id: number; ejng_nombre: string }[]
  > => {
    const res = await api.get("/clientes/ejecutivos-negocio");
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
    paisId: number;
    departamentoId: number;
    ciudadId: number;
    centro_operacion_ids: number[];
  }): Promise<ClienteDetailResponse> => {
    const res = await api.post("/clientes", {
      cli_razon_social: payload.razonSocial,
      cli_nro_identificacion: payload.nitDocumento,
      cli_tipo_identificacion: payload.tipoIdentificacion,
      cli_direccion: payload.direccion,
      cli_correo: payload.correo,
      cli_acceso_portal_clientes: payload.habilitaAcceso,
      ejng_id: payload.ejecutivoId,
      pai_id: payload.paisId,
      dpto_id: payload.departamentoId,
      ciu_id: payload.ciudadId,
      centro_operacion_ids: payload.centro_operacion_ids,
    });
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
      paisId: number;
      departamentoId: number;
      ciudadId: number;
    }>,
  ): Promise<ClienteDetailResponse> => {
    const body: Record<string, unknown> = {};
    if (payload.razonSocial !== undefined)
      body.cli_razon_social = payload.razonSocial;
    if (payload.nitDocumento !== undefined)
      body.cli_nro_identificacion = payload.nitDocumento;
    if (payload.tipoIdentificacion !== undefined)
      body.cli_tipo_identificacion = payload.tipoIdentificacion;
    if (payload.direccion !== undefined) body.cli_direccion = payload.direccion;
    if (payload.correo !== undefined) body.cli_correo = payload.correo;
    if (payload.habilitaAcceso !== undefined)
      body.cli_acceso_portal_clientes = payload.habilitaAcceso;
    if (payload.ejecutivoId !== undefined) body.ejng_id = payload.ejecutivoId;
    if (payload.paisId !== undefined) body.pai_id = payload.paisId;
    if (payload.departamentoId !== undefined)
      body.dpto_id = payload.departamentoId;
    if (payload.ciudadId !== undefined) body.ciu_id = payload.ciudadId;
    if (payload.centro_operacion_ids !== undefined)
      body.centro_operacion_ids = payload.centro_operacion_ids;

    const res = await api.put(`/clientes/${clienteId}`, body);
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
