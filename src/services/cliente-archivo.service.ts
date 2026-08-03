import api from "@/services/core/api";

export interface ClienteArchivoDocumento {
  ca_id: number;
  ca_tdo_id: number;
  tdo_nombre: string;
  ca_nombre_original: string;
  ca_ruta_almacenamiento: string;
  ca_tipo_mime: string | null;
  ca_fecha_emision: string | null;
  ca_fecha_vencimiento: string | null;
  ca_created_at: string;
}

export const clienteArchivoService = {
  // Documentos vigentes que el cliente ya tiene en su archivo consolidado
  // (Cliente_archivo) — ofrecidos para reutilizar en una solicitud nueva en
  // vez de volver a pedirlos.
  async obtenerArchivoCliente(
    clienteId: number,
  ): Promise<ClienteArchivoDocumento[]> {
    const response = await api.get(`/cliente-archivo/cliente/${clienteId}`);
    return Array.isArray(response.data) ? response.data : [];
  },
};
