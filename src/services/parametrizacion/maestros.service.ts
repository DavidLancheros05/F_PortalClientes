import api from '@/services/core/api';

export interface DocumentoCatalogo {
  tdo_id: number;
  tdo_nombre: string;
  tdo_vigencia_dias: number | null;
}

export const maestrosService = {
  // Tablas/columnas siempre de la base actual: el backend ya no lista otras
  // bases ni acepta navegar sus tablas.
  async getCatalogoTablas(): Promise<string[]> {
    const res = await api.get("/maestros/catalogo-esquema", { params: { mode: "tables" } });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getCatalogoColumnas(tabla: string): Promise<string[]> {
    if (!tabla?.trim()) return [];
    const params: Record<string, string> = { mode: "columns", tabla: tabla.trim() };
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
    columnaCondicion?: string,
    valorCondicion?: string,
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
    if (columnaCondicion?.trim() && valorCondicion?.trim()) {
      params.columna_condicion = columnaCondicion.trim();
      params.valor_condicion = valorCondicion.trim();
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
