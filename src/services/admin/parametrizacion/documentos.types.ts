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
}
