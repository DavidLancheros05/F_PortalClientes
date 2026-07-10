export type Seccion = {
  fs_id: number;
  fs_nombre: string;
  fs_descripcion?: string;
  fs_orden: number;
  fs_activo: boolean;
  // Aliases para compatibilidad con código existente
  seccion_id?: number;
  seccion_nombre?: string;
  seccion_descripcion?: string;
  seccion_orden?: number;
  seccion_activo?: boolean;
};

export type Pregunta = {
  fp_id: number;
  fp_descripcion: string;
  fp_codigo?: string | null;
  fp_tipo:
    | "FECHA_HORA_ACTUAL"
    | "TEXTO"
    | "NUMERO"
    | "FECHA"
    | "NOTA"
    | "SELECT"
    | "SELECT_TABLA"
    | "DOCUMENTOS_TABLA"
    | "MULTISELECT"
    | "ARCHIVO"
    | "TABLA"
    | "IMAGEN";
  fp_orden: number;
  fp_estado: boolean;
  fp_requerida?: boolean;
  fp_subtipo?: string | null;
  seccion_id?: number;
  seccion_nombre?: string;
  fp_pregunta_padre_id?: number | null;
  fp_valor_padre_disparador?: string | null;
  fp_catalogo_base_datos?: string | null;
  fp_catalogo_tabla?: string | null;
  fp_catalogo_columna?: string | null;
  fp_catalogo_pk_column?: string | null;
  fp_tipo_documento_id?: number | null;
  fp_precarga_fuente?: string | null;
  fp_precarga_campo_cliente?: string | null;
  fp_tabla_columnas?: string | null;
  fp_ancho_completo?: boolean;
  fp_maximo?: number | null;
  fp_tabla_limite_modo?: string | null;
  fp_tabla_limite_pregunta_id?: number | null;
  fp_tabla_limite_reglas?: string | null;
  opciones?: Opcion[];
};

export type DocumentoCatalogo = {
  tdo_id: number;
  tdo_nombre: string;
  tdo_vigencia_dias: number | null;
};

export type Formulario = {
  frm_id: number;
  frm_nombre: string;
  frm_descripcion: string;
  // Aliases para compatibilidad con código existente
  formulario_id?: number;
  formulario_nombre?: string;
  formulario_descripcion?: string;
};

export type TipoPreguntaCatalogo = {
  fti_id: number;
  fti_codigo: Pregunta["fp_tipo"];
  fti_descripcion?: string | null;
  fti_estado: boolean;
};

export type Opcion = {
  fpo_id: number;
  fpo_valor?: string;
  op_descripcion?: string;
  fpo_estado: boolean;
};

export type ColumnaTabla = {
  nombre: string;
  tipo: "TEXTO" | "SI_NO" | "CATALOGO";
  catalogo_base_datos?: string;
  catalogo_tabla?: string;
  catalogo_columna?: string;
  catalogo_pk_column?: string;
};

export type ReglaLimiteTabla = {
  valor: string;
  limite: string; // vacío = sin límite; en el form siempre es texto, se parsea al guardar
};

export type FormPreguntaState = {
  descripcion: string;
  codigo?: string | null;
  tipo: Pregunta["fp_tipo"];
  subtipo: string;
  seccion_id: number | null;
  requerida: boolean;
  tipo_documento_id: number | null;
  catalogo_base_datos: string;
  catalogo_tabla: string;
  catalogo_columna: string;
  catalogo_pk_column: string;
  dependiente: boolean;
  dependencia_seccion_id: number | null;
  dependencia_pregunta_id: number | null;
  dependencia_valor: string;
  precarga_fuente: string;
  precarga_campo_cliente: string;
  precarga_base_datos: string;
  precarga_tabla: string;
  precarga_columna: string;
  tabla_columnas: ColumnaTabla[];
  ancho_completo: boolean;
  tabla_limite_modo: "SIN_LIMITE" | "FIJO" | "CONDICIONAL";
  tabla_limite_fijo: string;
  tabla_limite_seccion_id: number | null;
  tabla_limite_pregunta_id: number | null;
  tabla_limite_reglas: ReglaLimiteTabla[];
};
