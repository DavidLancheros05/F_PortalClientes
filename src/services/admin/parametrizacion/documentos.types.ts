// src/services/admin/parametrizacion/documentos.types.ts

export interface TipoDocumento {
  tipoDocumentoId: number;
  nombre: string;
  descripcion: string;
  obligatorio: boolean;
  aplicaFechaEmision: boolean;
  vigenciaDias: number | null;
  aplicaZonaFranca: boolean;
  estado: boolean;
}

export interface TipoDocumentoPayload {
  nombre: string;
  descripcion: string;
  obligatorio: boolean;
  aplicaFechaEmision: boolean;
  vigenciaDias?: number;
  aplicaZonaFranca: boolean;
  estado: boolean;
}
