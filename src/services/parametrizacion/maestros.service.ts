import api from '@/services/core/api';

export interface DocumentoCatalogo {
  tdo_id: number;
  tdo_nombre: string;
  tdo_vigencia_dias: number | null;
}

export const maestrosService = {
  async getCatalogoBases(): Promise<string[]> {
    const res = await api.get("/maestros/catalogo-esquema", { params: { mode: "databases" } });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getCatalogoTablas(baseDatos?: string): Promise<string[]> {
    const params: Record<string, string> = { mode: "tables" };
    if (baseDatos?.trim()) params.base_datos = baseDatos.trim();
    const res = await api.get("/maestros/catalogo-esquema", { params });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getCatalogoColumnas(tabla: string, baseDatos?: string): Promise<string[]> {
    if (!tabla?.trim()) return [];
    const params: Record<string, string> = { mode: "columns", tabla: tabla.trim() };
    if (baseDatos?.trim()) params.base_datos = baseDatos.trim();
    const res = await api.get("/maestros/catalogo-esquema", { params });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getCatalogoValores(
    tabla: string,
    baseDatos?: string,
    columnaDescripcion?: string,
    columnaId?: string,
    columnaFiltro?: string,
    valorFiltro?: number | string,
  ): Promise<{ op_id: number; op_descripcion: string }[]> {
    if (!tabla?.trim()) return [];
    const params: Record<string, string> = { tabla: tabla.trim() };
    if (baseDatos?.trim()) params.base_datos = baseDatos.trim();
    if (columnaDescripcion?.trim()) params.columna_descripcion = columnaDescripcion.trim();
    if (columnaId?.trim()) params.columna_id = columnaId.trim();
    if (columnaFiltro?.trim() && valorFiltro !== undefined && valorFiltro !== null && valorFiltro !== "") {
      params.columna_filtro = columnaFiltro.trim();
      params.valor_filtro = String(valorFiltro);
    }
    const res = await api.get("/maestros/catalogo", { params });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getCatalogoDocumentos(): Promise<DocumentoCatalogo[]> {
    try {
      const fullRes = await api.get("/maestros/catalogo-documentos", { params: { mode: "full" } });
      if (Array.isArray(fullRes.data) && fullRes.data.length > 0) {
        return fullRes.data;
      }
    } catch {
      // ignore
    }

    const optionsRes = await api.get("/maestros/catalogo-documentos");
    const optionsData = optionsRes.data as Array<{ op_id: number; op_descripcion: string }>;

    return Array.isArray(optionsData)
      ? optionsData
          .filter((item) => item?.op_id && item?.op_descripcion)
          .map((item) => ({
            tdo_id: Number(item.op_id),
            tdo_nombre: String(item.op_descripcion),
            tdo_vigencia_dias: null,
          }))
      : [];
  },
};
