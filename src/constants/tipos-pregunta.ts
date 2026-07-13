/**
 * Tipos de preguntas disponibles en el formulario
 * Centralizado para evitar hardcoding distribuido
 */

export const TIPOS_PREGUNTA = {
  FECHA_HORA_ACTUAL: 'FECHA_HORA_ACTUAL',
  TEXTO: 'TEXTO',
  NUMERO: 'NUMERO',
  FECHA: 'FECHA',
  NOTA: 'NOTA',
  SELECT: 'SELECT',
  SELECT_TABLA: 'SELECT_TABLA',
  DOCUMENTOS_TABLA: 'DOCUMENTOS_TABLA',
  MULTISELECT: 'MULTISELECT',
  SELECT_CONDICIONAL: 'SELECT_CONDICIONAL',
  ARCHIVO: 'ARCHIVO',
  TABLA: 'TABLA',
  IMAGEN: 'IMAGEN',
  ESPACIO_FIRMA: 'ESPACIO_FIRMA',
} as const;

export type TipoPregunta = typeof TIPOS_PREGUNTA[keyof typeof TIPOS_PREGUNTA];
