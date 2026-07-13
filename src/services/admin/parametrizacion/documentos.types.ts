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
