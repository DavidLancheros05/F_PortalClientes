import api from "@/services/core/api";
import { cachedRequest } from "@/services/core/requestCache";

export interface AreaKPI {
  area: string;
  label: string;
  total: number;
  a_tiempo: number;
  vencidas: number;
  dias_promedio_real: number;
  dias_promedio_estimado: number;
  pct_cumplimiento: number;
}

export interface MesTendencia {
  mes: string;
  total: number;
  aprobadas: number;
  rechazadas: number;
}

export interface AreaTimeline {
  area: string;
  label: string;
  fecha_estimada: string | null;
  fecha_real: string | null;
  dias_meta: number | null;
  dias_reales: number | null;
  procesada: boolean;
  vencida: boolean;
}

export interface SlaGeneral {
  fecha_estimada: string | null;
  fecha_real: string | null;
  dias_meta: number | null;
  dias_reales: number | null;
  procesada: boolean;
  vencida: boolean;
}

export interface SolicitudTimeline {
  sol_id: number;
  numero_solicitud: string;
  razon_social: string;
  nit: string;
  fecha_envio: string;
  centro_operacion: string;
  estado: string;
  sla_general: SlaGeneral;
  areas: AreaTimeline[];
}

export interface SolicitudDetalle {
  sol_id: number;
  numero_solicitud: string;
  razon_social: string;
  fecha_envio: string;
  fecha_estimada: string;
  fecha_real: string;
  dias_reales: number;
  dias_estimados: number;
  diferencia: number;
  estado: "a_tiempo" | "vencida";
}

export interface SolicitudSlaListado {
  sol_id: number;
  numero_solicitud: string;
  razon_social: string;
  fecha_envio: string;
  estado: string;
  sla_general: SlaGeneral;
  pct_cumplimiento: number;
  en_riesgo: boolean;
}

export interface DashboardData {
  resumen: {
    total_solicitudes: number;
    aprobadas: number;
    rechazadas: number;
    pendientes: number;
    pct_a_tiempo_global: number;
  };
  por_area: AreaKPI[];
  por_mes: MesTendencia[];
}

export const indicadoresService = {
  getDashboard: async (params?: {
    fecha_desde?: string;
    fecha_hasta?: string;
    co_id?: string;
  }): Promise<DashboardData> => {
    const res = await api.get("/indicadores/cumplimiento", { params });
    return res.data;
  },

  getSolicitudTimeline: async (params: {
    numero?: string;
    sol_id?: string;
  }): Promise<SolicitudTimeline | null> => {
    const res = await api.get("/indicadores/solicitud", { params });
    if (res.data?.message) return null;
    return res.data;
  },

  getListadoSla: async (params?: {
    numero?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    estado?: string;
    sla?: "vencida" | "en_riesgo" | "a_tiempo";
  }): Promise<SolicitudSlaListado[]> => {
    const res = await api.get("/indicadores/solicitudes", { params });
    return Array.isArray(res.data) ? res.data : [];
  },

  getDetalleArea: async (params: {
    area: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    co_id?: string;
  }): Promise<SolicitudDetalle[]> => {
    const res = await api.get("/indicadores/detalle", { params });
    return res.data;
  },

  getCentros: async () => {
    return cachedRequest("centros-operacion", async () => {
      const res = await api.get("/centros-operacion");
      return res.data;
    });
  },
};
