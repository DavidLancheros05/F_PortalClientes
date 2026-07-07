import api from "@/services/core/api";

interface ParamDiasRespuesta {
  pdr_id: number;
  pdr_area: string;
  pdr_dias: number;
}

const DEFAULT_DIAS: Record<string, number> = {
  Creada: 0,
  Concepto: 1,
  Comercial: 2,
  Financiera: 1,
  Aprobada: 5,
};

export const parametrosService = {
  async getDiasRespuesta(): Promise<Record<string, number>> {
    try {
      const response = await api.get('/solicitudes/parametros/dias-respuesta');

      const dias: Record<string, number> = {};

      if (Array.isArray(response.data)) {
        response.data.forEach((param: ParamDiasRespuesta) => {
          dias[param.pdr_area] = param.pdr_dias;
        });
        return dias;
      }

      console.warn('⚠️ Respuesta inesperada:', response.data);
      return DEFAULT_DIAS;
    } catch (error) {
      console.error('❌ Error obteniendo parámetros de días:', error);
      console.warn('⚠️ Usando valores por defecto');
      return DEFAULT_DIAS;
    }
  },
};
