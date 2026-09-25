import api from "@/services/core/api";

// Los campos opcionales solo llegan a usuarios internos — el backend se los
// quita al rol CLIENTE (ver Backend_portal pedidos.service.ts::
// CAMPOS_VISIBLES_CLIENTE).
export interface PedidoClienteResponse {
  numeroDocumento: string;
  estado: string;
  fechaCreacion: string;
  fechaEntrega: string | null;
  ordenCompra: string | null;
  referencia: string;
  descripcionItem: string;
  cantidadPedida: number;
  cantidadRemisionada: number;
  cantidadPendiente: number;
  ciudad: string;
  precioUnitario: number;
  valorPendienteSubtotal: number;
  valorPendiente: number;
  direccion: string;
  valorNeto: number;
  notas: string | null;
  numero: number;

  // Solo internos.
  clientePortal?: string | null;
  clienteRazonSocial?: string;
  nit?: string;
  item?: number;
  cantidadDisponibleInsumo?: number;
  pesoPendiente?: number;
  volumenPendiente?: number;
  precioPeso?: number;
  plan003?: string | null;
  valorBrutoLocal?: number;
  pesoPedida?: number;
  cdv?: string | null;
  vendedor?: string;
}

export const pedidosService = {
  getPorCliente: async (cliId: number): Promise<PedidoClienteResponse[]> => {
    const res = await api.get(`/pedidos/cliente/${cliId}`);
    return res.data;
  },
  getPorEjecutivo: async (
    ejngId: number,
  ): Promise<PedidoClienteResponse[]> => {
    const res = await api.get(`/pedidos/ejecutivo/${ejngId}`);
    return res.data;
  },
};
