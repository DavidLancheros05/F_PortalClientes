import api from "@/services/core/api";
import { TipoVigencia, TipoVigenciaPayload } from "./tipos-vigencia.types";

export const tiposVigenciaService = {
  getAll: async (onlyActive?: boolean): Promise<TipoVigencia[]> => {
    const res = await api.get("/parametrizacion/tipos-vigencia", {
      params: onlyActive ? { activo: "1" } : undefined,
    });
    return res.data;
  },

  update: async (
    id: number,
    payload: TipoVigenciaPayload,
  ): Promise<TipoVigencia> => {
    const res = await api.patch(
      `/parametrizacion/tipos-vigencia/${id}`,
      payload,
    );
    return res.data;
  },
};
