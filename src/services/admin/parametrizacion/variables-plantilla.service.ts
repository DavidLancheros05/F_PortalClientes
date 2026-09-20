import api from "@/services/core/api";

export type AmbitoVariable = "FIJA" | "CARTA_APROBACION";
export type TablaOrigen = "solicitudes" | "clientes";
export type FormatoVariable = "TEXTO" | "MONEDA" | "DIAS" | "FECHA";

export interface VariablePlantilla {
  pvp_id: number;
  pvp_placeholder: string;
  pvp_etiqueta: string;
  pvp_ambito: AmbitoVariable;
  pvp_resuelta: boolean;
  pvp_estado: boolean;
  pvp_tabla_origen: TablaOrigen | null;
  pvp_columna_origen: string | null;
  pvp_formato: FormatoVariable;
  pvp_created_at: string;
}

export const variablesPlantillaService = {
  getAll: async (): Promise<VariablePlantilla[]> => {
    const res = await api.get("/parametrizacion/variables-plantilla");
    return res.data;
  },

  getColumnas: async (tabla: TablaOrigen): Promise<string[]> => {
    const res = await api.get("/parametrizacion/variables-plantilla/columnas", {
      params: { tabla },
    });
    return res.data;
  },

  resolverParaSolicitud: async (
    solicitudId: number,
  ): Promise<Record<string, string>> => {
    const res = await api.get("/parametrizacion/variables-plantilla/resolver", {
      params: { solicitud_id: solicitudId },
    });
    return res.data;
  },

  create: async (data: {
    pvp_placeholder: string;
    pvp_etiqueta: string;
    pvp_ambito: AmbitoVariable;
    pvp_resuelta?: boolean;
    pvp_tabla_origen?: TablaOrigen;
    pvp_columna_origen?: string;
    pvp_formato?: FormatoVariable;
  }) => {
    const res = await api.post("/parametrizacion/variables-plantilla", data);
    return res.data;
  },

  update: async (
    id: number,
    data: Partial<{
      pvp_etiqueta: string;
      pvp_ambito: AmbitoVariable;
      pvp_resuelta: boolean;
      pvp_tabla_origen: TablaOrigen | null;
      pvp_columna_origen: string | null;
      pvp_formato: FormatoVariable;
    }>,
  ) => {
    const res = await api.put(`/parametrizacion/variables-plantilla/${id}`, data);
    return res.data;
  },

  toggleEstado: async (id: number, estado: boolean) => {
    const res = await api.patch(
      `/parametrizacion/variables-plantilla/${id}/estado`,
      { pvp_estado: estado },
    );
    return res.data;
  },

  remove: async (id: number) => {
    const res = await api.delete(`/parametrizacion/variables-plantilla/${id}`);
    return res.data;
  },
};
