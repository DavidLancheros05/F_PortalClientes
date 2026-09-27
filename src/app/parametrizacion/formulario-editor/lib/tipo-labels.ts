import type { Pregunta, TipoPreguntaCatalogo } from "../hooks/types";

export const fallbackTipoLabels: Record<Pregunta["fp_tipo"], string> = {
  FECHA_HORA_ACTUAL: "Visualizador fecha y hora actual",
  TEXTO: "Texto",
  NUMERO: "Número",
  FECHA: "Fecha",
  NOTA: "Nota informativa",
  SELECT: "Selección única (solo una opción)",
  SELECT_TABLA: "Selección desde tabla",
  DOCUMENTOS_TABLA: "Documentos desde tabla",
  MULTISELECT: "Selección múltiple (checkbox, varias opciones)",
  ARCHIVO: "Archivo / Documento",
  TABLA: "Tabla",
  IMAGEN: "Imagen (firma, logo, etc.)",
  ESPACIO_FIRMA: "Espacio en blanco para firma manual",
};

export const getTipoLabel = (tipo: TipoPreguntaCatalogo) => {
  if (tipo.fti_codigo === "SELECT") return "Selección única (solo una opción)";
  if (tipo.fti_codigo === "MULTISELECT")
    return "Selección múltiple (checkbox, varias opciones)";
  if (tipo.fti_descripcion?.trim()) return tipo.fti_descripcion;
  return fallbackTipoLabels[tipo.fti_codigo] ?? tipo.fti_codigo;
};
