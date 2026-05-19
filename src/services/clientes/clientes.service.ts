import api from "@/services/core/api";

export interface Usuario {
  usr_id: number;
  usuario_nombre: string;
}

export interface Cliente {
  cli_id: number;
  razonSocial: string;
  nitDocumento: string;
  direccion?: string;
}

export interface CentroOperacion {
  id: number;
  nombre: string;
}

export interface TipoIdentificacion {
  codigo: string;
  nombre: string;
}

export const clientesService = {
  getAll: async (): Promise<Cliente[]> => {
    const res = await api.get("/clientes");
    return res.data;
  },

  getClientesByCentro: async (centroId: number): Promise<Cliente[]> => {
    const res = await api.get(`/clientes/centro/${centroId}`);
    return res.data;
  },

  getById: async (clienteId: number): Promise<Cliente> => {
    const res = await api.get(`/clientes/${clienteId}`);
    return res.data;
  },

  precargarSolicitud: async (clienteId: number): Promise<Cliente> => {
    const res = await api.get(`/clientes/${clienteId}/precarga-solicitud`);
    return res.data;
  },

  create: async (payload: {
    razonSocial: string;
    tipoIdentificacion: string;
    nit: string;
    direccion: string;
    telefono: string;
    correo: string;
    habilita_acceso: boolean;
    centroOperacionIds: number[];
  }): Promise<Cliente> => {
    const res = await api.post("/clientes", payload);
    return res.data;
  },

  update: async (
    clienteId: number,
    payload: Partial<{
      razonSocial: string;
      tipoIdentificacion: string;
      nitDocumento: string;
      direccion: string;
      telefono: string;
      correo: string;
      habilitaAcceso: boolean;
      centroOperacionIds: number[];
      ejecutivoId: number | null;
    }>,
  ): Promise<Cliente> => {
    const res = await api.put(`/clientes/${clienteId}`, payload);
    return res.data;
  },

  getCentrosOperacion: async (clienteId: number): Promise<CentroOperacion[]> => {
    const res = await api.get(`/clientes/${clienteId}/centros-operacion`);
    return res.data;
  },

  getTiposIdentificacion: async (): Promise<TipoIdentificacion[]> => {
    const res = await api.get("/tipos-identificacion");
    return res.data;
  },

  getAllCentrosOperacion: async (): Promise<CentroOperacion[]> => {
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
