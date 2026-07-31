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
  /** 'CLIENTE' (default, lo sube/descarga-firma el cliente) o
   * 'CARTA_APROBACION' (el sistema lo genera y envía solo al aprobar CC2 —
   * ver documentacion/mejoras/rediseno-gestionar-comite-credito.md). */
  origen: "CLIENTE" | "CARTA_APROBACION";
  /** Qué se dibuja en el encabezado del PDF. 'FORMATO_OFICIAL' (tabla
   * logo/código/página/revisión) solo está implementado para
   * origen='CLIENTE' con tipoPlantilla='TEXTO' (motor pdf-lib,
   * carta-pdf.util.ts) — para origen='CARTA_APROBACION' (motor pdfkit del
   * backend) sigue reservado sin implementar, ver comentario en
   * TipoDocumento.encabezadoTipo del lado del backend. */
  encabezadoTipo: "NINGUNO" | "IMAGEN" | "FORMATO_OFICIAL";
  encabezadoImagenUrl: string | null;
  /** Pie de página repetido en cada página del PDF — solo implementado
   * para origen='CLIENTE' con tipoPlantilla='TEXTO' (motor pdf-lib).
   * Independiente del bloque de "cierre" de una sola vez (texto fijo +
   * tabla de revisiones) que ya existe al final del documento. */
  piePaginaTipo: "NINGUNO" | "TEXTO" | "IMAGEN";
  piePaginaTexto: string | null;
  piePaginaImagenUrl: string | null;
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
  origen?: "CLIENTE" | "CARTA_APROBACION";
  encabezadoTipo?: "NINGUNO" | "IMAGEN" | "FORMATO_OFICIAL";
  piePaginaTipo?: "NINGUNO" | "TEXTO" | "IMAGEN";
  piePaginaTexto?: string;
}
