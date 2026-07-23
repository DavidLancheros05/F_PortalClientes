// src/services/admin/parametrizacion/documentos.types.ts

export interface TipoDocumento {
  tipoDocumentoId: number;
  nombre: string;
  descripcion: string;
  obligatorio: boolean;
  aplicaFechaEmision: boolean;
  vigenciaDias: number | null;
  reglaVigencia: "DIAS" | "ANIO" | null;
  aniosAtrasPermitidos: number | null;
  aplicaZonaFranca: boolean;
  estado: boolean;
  tienePlantilla: boolean;
  tipoPlantilla: "TEXTO" | "PDF_SOLICITUD";
  plantillaContenido: string | null;
  formatoCodigo: string | null;
  formatoCodigoSecundario: string | null;
  revision: string | null;
  paginasTotal: number | null;
}

export interface TipoDocumentoRevision {
  tdrId: number;
  tipoDocumentoId: number;
  revision: string;
  descripcionCambio: string;
  /** ISO yyyy-MM-dd (columna DATE del backend). */
  fecha: string;
  orden: number;
  estado: boolean;
}

export interface TipoDocumentoRevisionPayload {
  revision: string;
  descripcionCambio: string;
  fecha: string;
  orden?: number;
}

export interface TipoDocumentoPayload {
  nombre: string;
  descripcion: string;
  obligatorio: boolean;
  aplicaFechaEmision: boolean;
  vigenciaDias?: number;
  reglaVigencia?: "DIAS" | "ANIO" | "";
  aniosAtrasPermitidos?: number;
  aplicaZonaFranca: boolean;
  estado: boolean;
  tienePlantilla?: boolean;
  tipoPlantilla?: "TEXTO" | "PDF_SOLICITUD";
  plantillaContenido?: string;
  formatoCodigo?: string;
  formatoCodigoSecundario?: string;
  revision?: string;
  paginasTotal?: number;
}
