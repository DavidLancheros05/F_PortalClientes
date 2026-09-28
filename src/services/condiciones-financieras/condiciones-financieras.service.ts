import api from "@/services/core/api";

export interface CondicionFinanciera {
  condicion_id: number;
  sa_sol_id: number;
  cupo: number;
  plazo_pago: number;
  forma_pago: string;
  usuario_aprueba: number;
}

export interface CondicionPago {
  cp_id: number;
  cp_descripcion: string;
}

export const condicionesFinancierasService = {
  getCondicionesPago: async (): Promise<CondicionPago[]> => {
    const res = await api.get("/condiciones-financieras/condiciones-pago");
    return res.data;
  },

  getBySolicitud: async (
    solicitudId: number,
  ): Promise<CondicionFinanciera[]> => {
    const res = await api.get(
      `/condiciones-financieras/solicitud/${solicitudId}`,
    );
    return res.data;
  },

  getAll: async (): Promise<CondicionFinanciera[]> => {
    const res = await api.get("/condiciones-financieras");
    return res.data;
  },

  getById: async (id: number): Promise<CondicionFinanciera> => {
    const res = await api.get(`/condiciones-financieras/${id}`);
    return res.data;
  },
};
