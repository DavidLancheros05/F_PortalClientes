export type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  type?: "text" | "number" | "date";
  custom?: (value: any) => string | null;
};

export interface Opcion {
  op_id: number;
  op_descripcion: string;
}

export interface FormularioPregunta {
  fp_id: number;
  fp_descripcion: string;
  fp_codigo?: string | null;
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
  fp_requerida?: boolean;
  fp_minimo?: number;
  fp_maximo?: number;
  fp_subtipo?: string;
  fp_patron?: string;
  seccion_id?: number;
  seccion_nombre?: string;
  seccion_descripcion?: string;
  seccion_orden?: number;
  opciones?: Opcion[];
  fp_opcion_disparadora?: string;
  fp_descripcion_adicional?: string;
  fp_validacion_adicional?: string;
  fp_pregunta_padre_id?: number;
  fp_valor_padre_disparador?: string;
  fp_catalogo_base_datos?: string | null;
  fp_catalogo_tabla?: string | null;
  fp_catalogo_columna?: string | null;
  fp_tipo_documento_id?: number | null;
  fp_version?: number;
  fp_precarga_fuente?: "cliente" | "ultima_solicitud" | "cliente_primero" | "ultima_primero" | null;
  fp_precarga_campo_cliente?: string | null;
}

export interface DocumentoCatalogo {
  tdo_id: number;
  tdo_nombre: string;
  tdo_descripcion?: string | null;
  tdo_vigencia_dias: number | null;
}

export interface Seccion {
  seccion_id: number;
  seccion_nombre: string;
  seccion_descripcion?: string;
  seccion_orden: number;
  preguntas: FormularioPregunta[];
}

export type RespuestasState = {
  [fp_id: number]: {
    valor_texto?: string;
    valor_numero?: number;
    valor_fecha?: string;
    valor_opcion_id?: number | number[] | string;
    archivo?: File;
    nombre_archivo?: string;
    vista_previa_url?: string;
  };
};

export interface SolicitudFormContentProps {
  solicitudId?: number;
  readOnly?: boolean;
  returnTo?: string;
}
