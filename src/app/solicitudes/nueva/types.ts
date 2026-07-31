import type {
  FormularioPreguntaResponse,
  FormularioPreguntaOpcion,
} from "@/types/api.types";

export type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  type?: "text" | "number" | "date";
  custom?: (value: any) => string | null;
};

// Re-export desde api.types (fuente única de verdad)
export type FormularioPregunta = FormularioPreguntaResponse;
export type Opcion = FormularioPreguntaOpcion;

export interface DocumentoCatalogo {
  tdo_id: number;
  tdo_nombre: string;
  tdo_descripcion?: string | null;
  tdo_vigencia_dias: number | null;
  tdo_permite_vencimiento?: boolean | null;
  tdo_regla_vigencia?: "DIAS" | "ANIO" | null;
  tdo_anios_atras_permitidos?: number | null;
  tdo_tiene_plantilla?: boolean;
  tdo_plantilla_contenido?: string | null;
}

export interface Seccion {
  seccion_id: number;
  seccion_nombre: string;
  seccion_descripcion?: string | null;
  seccion_orden: number;
  preguntas: FormularioPregunta[];
}

export type RespuestasState = {
  [fp_id: number]: {
    valor_texto?: string;
    valor_numero?: number;
    valor_fecha?: string;
    valor_opcion_id?: number | number[] | string;
    // Código(s) estable(s) (fpo_codigo) de la(s) opción(es) que estaban
    // seleccionadas — solo viene poblado cuando el origen es la precarga
    // de Ampliación de Cupo (ver agruparUltimaRespuestaPorPregunta /
    // usePrefillConfiguracion). Se usa para traducir a valor_opcion_id
    // vigente cuando el fpo_id guardado es de una versión de formulario
    // distinta a la activa (fpo_id cambia al clonar versión, fpo_codigo
    // no).
    valor_opcion_codigo?: string | string[];
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
