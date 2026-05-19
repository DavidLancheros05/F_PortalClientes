import api from "@/services/core/api";
import { TipoDocumento, TipoDocumentoPayload } from "./documentos.types";

export const documentosService = {
  getAll: async (): Promise<TipoDocumento[]> => {
    const res = await api.get("/parametrizacion/tipos-documentos");
    return res.data;
  },

  create: async (payload: TipoDocumentoPayload): Promise<TipoDocumento> => {
    const res = await api.post("/parametrizacion/tipos-documentos", payload);
    return res.data;
  },

  update: async (
    id: number,
    payload: Partial<TipoDocumentoPayload>,
  ): Promise<TipoDocumento> => {
    const res = await api.patch(
      `/parametrizacion/tipos-documentos/${id}`,
      payload,
    );
    return res.data;
  },

  delete: async (id: number) => {
    await api.delete(`/parametrizacion/tipos-documentos/${id}`);
  },
};
