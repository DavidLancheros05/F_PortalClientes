import api from "@/services/core/api";
import {
  TipoDocumento,
  TipoDocumentoPayload,
  TipoDocumentoRevision,
  TipoDocumentoRevisionPayload,
} from "./documentos.types";

export const documentosService = {
  getAll: async (): Promise<TipoDocumento[]> => {
    const res = await api.get("/parametrizacion/tipos-documentos");
    return res.data;
  },

  getById: async (id: number): Promise<TipoDocumento> => {
    const res = await api.get(`/parametrizacion/tipos-documentos/${id}`);
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

  getRevisiones: async (
    tipoDocumentoId: number,
  ): Promise<TipoDocumentoRevision[]> => {
    const res = await api.get(
      `/parametrizacion/tipos-documentos/${tipoDocumentoId}/revisiones`,
    );
    return res.data;
  },

  createRevision: async (
    tipoDocumentoId: number,
    payload: TipoDocumentoRevisionPayload,
  ): Promise<TipoDocumentoRevision> => {
    const res = await api.post(
      `/parametrizacion/tipos-documentos/${tipoDocumentoId}/revisiones`,
      payload,
    );
    return res.data;
  },

  updateRevision: async (
    tipoDocumentoId: number,
    revisionId: number,
    payload: Partial<TipoDocumentoRevisionPayload>,
  ): Promise<void> => {
    await api.patch(
      `/parametrizacion/tipos-documentos/${tipoDocumentoId}/revisiones/${revisionId}`,
      payload,
    );
  },

  deleteRevision: async (
    tipoDocumentoId: number,
    revisionId: number,
  ): Promise<void> => {
    await api.delete(
      `/parametrizacion/tipos-documentos/${tipoDocumentoId}/revisiones/${revisionId}`,
    );
  },

  subirEncabezadoImagen: async (
    tipoDocumentoId: number,
    file: File,
  ): Promise<TipoDocumento> => {
    const formData = new FormData();
    formData.append("archivo", file);
    const res = await api.post(
      `/parametrizacion/tipos-documentos/${tipoDocumentoId}/encabezado-imagen`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },

  subirPiePaginaImagen: async (
    tipoDocumentoId: number,
    file: File,
  ): Promise<TipoDocumento> => {
    const formData = new FormData();
    formData.append("archivo", file);
    const res = await api.post(
      `/parametrizacion/tipos-documentos/${tipoDocumentoId}/pie-pagina-imagen`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },
};
