import api from "@/services/core/api";

export interface SaldoClienteResponse {
  auxiliar: string | null;
  nit: string;
  razonSocialSucursal: string;
  vendedor: string | null;
  centroOperacion: string | null;
  cupoCredito: string | null;
  numeroDocumento: string;
  fechaDocumento: string | null;
  fechaVencimiento: string | null;
  plazo: number | null;
  diasVencidos: number;
  totalCorriente: string;
  vencido1a15: string;
  vencido16a30: string;
  vencido31a60: string;
  vencidoMas60: string;
  total: string;
}

export const carteraService = {
  getPorCliente: async (cliId: number): Promise<SaldoClienteResponse[]> => {
    const res = await api.get(`/cartera/cliente/${cliId}`);
    return res.data;
  },
};
