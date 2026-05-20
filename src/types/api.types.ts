/**
 * TIPOS API - Fuente única de verdad para interfaces
 * Basado en auditoría de respuestas reales del backend
 */

// ============================================
// CLIENTES
// ============================================

export interface ClienteListResponse {
  cliId: number;
  razonSocial: string;
  nitDocumento: string;
  correo?: string;
  estado: string;
  ejecutivoId?: number;
  ejecutivo?: { nombre: string } | null;
}

export interface ClienteDetailResponse {
  cliId: number;
  razonSocial: string;
  nitDocumento: string;
  tipoIdentificacion: number;
  direccion: string;
  correo?: string;
  habilitaAcceso: boolean;
  estado: string;
  ejecutivoId?: number;
  ejecutivo?: { nombre: string } | null;
  centroOperacionIds?: number[];
}

/**
 * @deprecated Usar ClienteListResponse o ClienteDetailResponse según sea apropiado
 */
export type ClienteResponse = ClienteDetailResponse;

/**
 * Centro de operación del cliente
 * Endpoint: GET /clientes/:id/centros-operacion
 * Nota: Este endpoint mapea cop_id → id, cop_nombre → nombre
 */
export interface ClienteCentroResponse {
  id: number;
  nombre: string;
}

// ============================================
// CENTROS DE OPERACIÓN
// ============================================

/**
 * Centro de Operación completo
 * Endpoint: GET /centros-operacion
 */
export interface CentroOperacionResponse {
  cop_id: number;
  cop_nombre: string;
  cop_estado: string;
  cop_fecha_usr?: Date;
  cop_usuario?: string;
  f285_id?: string;
}

// ============================================
// CORREOS POR ROL
// ============================================

/**
 * Rol básico para selectores
 * Endpoint: GET /parametrizacion/correos-por-rol/roles
 */
export interface RolResponse {
  rol_id: number;
  rol_nombre: string;
  rol_codigo: string;
}

/**
 * Correo por Rol completo
 * Endpoint: GET /parametrizacion/correos-por-rol
 */
export interface CorreoPorRolResponse {
  correo_id: number;
  rol_id: number;
  rol_nombre: string;
  rol_codigo: string;
  email: string;
  activo: boolean;
  created_at: string;
  updated_at?: string | null;
}

// ============================================
// TIPOS DE IDENTIFICACIÓN
// ============================================

export interface TipoIdentificacionResponse {
  id: number;
  codigo: string;
  nombre: string;
}

// ============================================
// FORMULARIOS (Canonical FormularioPregunta)
// ============================================

/**
 * Opción de pregunta con SelectType
 * Endpoint: GET /formulario-preguntas/{id}/opciones
 */
export interface FormularioPreguntaOpcion {
  op_id: number;
  op_descripcion: string;
}

/**
 * Pregunta de Formulario
 * Entity: Formulario_pregunta
 * CRÍTICO: Campos sin "?" son SIEMPRE presentes en respuestas (pueden ser null)
 * Endpoint: GET /formulario-preguntas/{id}
 */
export interface FormularioPreguntaResponse {
  // Campos de la Entity (siempre presentes)
  fp_id: number;
  fp_descripcion: string;
  fp_codigo: string | null;
  fp_tipo:
    | "NOTA"
    | "FECHA_HORA_ACTUAL"
    | "TEXTO"
    | "NUMERO"
    | "FECHA"
    | "SELECT"
    | "SELECT_TABLA"
    | "DOCUMENTOS_TABLA"
    | "MULTISELECT"
    | "SELECT_CONDICIONAL"
    | "ARCHIVO"
    | "TABLA";
  fp_estado: boolean;
  fp_orden: number;
  fp_version: number;
  fp_created_at?: Date;
  fp_requerida: boolean;
  fp_minimo: number | null;
  fp_maximo: number | null;
  fp_subtipo: string | null;
  fp_patron: string | null;
  fp_precarga_fuente: string | null;
  fp_precarga_campo_cliente: string | null;
  formulario_id: number | null;
  seccion_id: number | null;
  fp_catalogo_base_datos: string | null;
  fp_catalogo_tabla: string | null;
  fp_catalogo_columna: string | null;
  fp_catalogo_pk_column?: string | null;
  fp_tipo_documento_id: number | null;
  fp_pregunta_padre_id: number | null;
  fp_valor_padre_disparador: string | null;

  // Campos agregados en respuesta DTO (pueden no venir en la respuesta)
  seccion_nombre?: string;
  seccion_descripcion?: string | null;
  seccion_orden?: number;
  opciones?: FormularioPreguntaOpcion[];
  fp_opcion_disparadora?: string;
  fp_descripcion_adicional?: string;
  fp_validacion_adicional?: string;
}

/** @deprecated Usar FormularioPreguntaResponse */
export type FormularioPregunta = FormularioPreguntaResponse;
