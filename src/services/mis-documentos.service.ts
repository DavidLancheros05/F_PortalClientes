import api from "@/services/core/api";

export interface MiDocumento {
  sa_id: number;
  sa_sol_id: number;
  fp_id: number;
  sa_nombre_original: string;
  sa_nombre_guardado: string;
  sa_tamaño_bytes: number | null;
  sa_tipo_mime: string | null;
  sa_ruta_almacenamiento: string;
  estado: string;
  fecha_carga: string;
  sd_fecha_emision: string | null;
  sd_fecha_vencimiento: string | null;
  sd_requiere_cambio: boolean;
  tdo_id: number | null;
  tdo_nombre: string | null;
  tdo_vigencia_dias: number | null;
  tdo_regla_vigencia: "DIAS" | "ANIO" | null;
  tdo_anios_atras_permitidos: number | null;
  tdo_tiene_plantilla: boolean | null;
  tdo_plantilla_contenido: string | null;
  tdo_tipo_plantilla: "TEXTO" | "PDF_SOLICITUD" | null;
  tdo_formato_codigo?: string | null;
  tdo_formato_codigo_secundario?: string | null;
  tdo_revision?: string | null;
  tdo_paginas_total?: number | null;
}

export interface DocumentoDiferidoPendiente {
  tdo_id: number;
  tdo_nombre: string;
  tdo_plantilla_contenido: string | null;
  tdo_tipo_plantilla: "TEXTO" | "PDF_SOLICITUD";
  tdo_formato_codigo?: string | null;
  tdo_formato_codigo_secundario?: string | null;
  tdo_revision?: string | null;
  tdo_paginas_total?: number | null;
  fp_id: number;
}

export interface DocumentoDiferido extends DocumentoDiferidoPendiente {
  yaSubido: boolean;
  sa_id: number | null;
}

export interface MisDocumentosResponse {
  solicitud: {
    sol_id: number;
    sol_numero_solicitud: string;
    sol_estado_id: number;
    cliente_nombre?: string | null;
    cliente_nit?: string | null;
  } | null;
  documentos: MiDocumento[];
  puedeCorregir: boolean;
  rechazadoPorAuxiliar: boolean;
  documentosDiferidos: DocumentoDiferido[];
}

export const misDocumentosService = {
  /**
   * `solicitudId` es solo para personal interno (no CLIENTE) gestionando
   * documentos en nombre de un cliente — ver corregir-formulario-asc. Un
   * cliente autenticado siempre ve su propia última solicitud, sin importar
   * qué se pase acá; el backend ignora el parámetro para ese rol.
   */
  async getMisDocumentos(solicitudId?: number): Promise<MisDocumentosResponse> {
    const response = await api.get("/solicitudes/mis-documentos", {
      params: solicitudId ? { solicitudId } : undefined,
    });
    return response.data;
  },

  async getRepresentanteLegal(
    solicitudId: number,
  ): Promise<{ nombre: string; identificacion: string } | null> {
    const response = await api.get(
      `/solicitudes/${solicitudId}/representante-legal`,
    );
    return response.data.representanteLegal;
  },

  async enviarCorreccion(solicitudId: number) {
    const response = await api.patch(
      `/solicitudes/${solicitudId}/resultado-pendiente`,
    );
    return response.data;
  },

  async verificarDocumentosDiferidos(solicitudId: number) {
    const response = await api.patch(
      `/solicitudes/${solicitudId}/documentos-diferidos/verificar`,
    );
    return response.data as {
      ok: boolean;
      avanzo: boolean;
      documentosDiferidosFaltantes: DocumentoDiferidoPendiente[];
    };
  },
};
