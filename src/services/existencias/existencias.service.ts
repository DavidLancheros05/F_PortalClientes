import api from "@/services/core/api";

export interface ExistenciaClienteResponse {
  item: string;
  referencia: string;
  descripcionItem: string;
  cliente: string;
  lote: string | null;
  cantidadExistencia: number;
  cantidadDisponible: number;
  peso: number;
  volumen: number;
  fechaLote: string | null;
  fechaUltimaEntrada: string | null;
  ubicacion: string | null;
  bodega: string;
  ejecutivoNegocio: string | null;
}

export const existenciasService = {
  getPorCliente: async (cliId: number): Promise<ExistenciaClienteResponse[]> => {
    const res = await api.get(`/existencias/cliente/${cliId}`);
    return res.data;
  },
};
