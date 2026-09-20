// Variables reconocidas dentro del contenido de una plantilla de tipo de
// documento ({{cliente_nombre}}, {{pregunta|...}}, etc.) — compartido entre
// DocumentosForm.tsx (editor de la plantilla, con chips de colores) y
// PlantillaEditor.tsx (el editor en sí), para que ambos usen exactamente la
// misma regex y las mismas etiquetas legibles.
//
// El catálogo de variables "fijas" (cliente_nombre, cupo_aprobado, etc.) ya
// NO vive hardcodeado acá — se administra desde Parametrización > Variables
// de Plantilla (`param_variables_plantilla`, ver
// services/admin/parametrizacion/variables-plantilla.service.ts). Este
// archivo solo construye la regex/etiquetas a partir de la lista que le
// pasen, y sigue resolviendo por su cuenta los placeholders dinámicos
// {{pregunta|...}}, que no son parte del catálogo (salen de
// Formulario_pregunta, no se crean/borran desde esa pantalla).

export interface VariableCatalogo {
  label: string;
  placeholder: string;
}

// Nota: excluye a propósito {{size:N}} / {{/size}} (marcador de tamaño de
// letra puntual, ver botón "Tamaño") — esos se muestran como texto plano en
// el editor, no como variable/chip.
export function buildRegexVariablePlantilla(
  variables: VariableCatalogo[],
): RegExp {
  // Los nombres ya están validados en el backend como [a-z][a-z0-9_]* (ver
  // CreateVariablePlantillaDto), así que no hace falta escapar regex.
  const nombres = variables
    .map((v) => v.placeholder.replace(/^\{\{|\}\}$/g, ""))
    .filter(Boolean);
  const alternativas = [...nombres, String.raw`pregunta\|[^{}]*`].join("|");
  return new RegExp(String.raw`\{\{(?:${alternativas})\}\}`, "g");
}

/** Nombre legible para mostrar en el chip / en "Usadas en esta plantilla".
 * `etiquetaPorCodigo` traduce los placeholders anclados a fp_codigo
 * ({{pregunta|cod:REP_LEGAL_TABLA|...}}) al nombre actual de esa pregunta
 * en el formulario activo. */
export function construirEtiquetaVariable(
  placeholder: string,
  seccionPorId: Map<string, string>,
  etiquetaPorCodigo: Map<string, string> | undefined,
  variables: VariableCatalogo[],
): string {
  const delCatalogo = variables.find((v) => v.placeholder === placeholder);
  if (delCatalogo) return delCatalogo.label;

  const matchCodigo = placeholder.match(
    /^\{\{pregunta\|cod:([A-Za-z0-9_-]+)(?:\|col:([^|{}]*))?\}\}$/,
  );
  if (matchCodigo) {
    const [, codigo, columna] = matchCodigo;
    const etiqueta = etiquetaPorCodigo?.get(codigo) || codigo;
    return columna ? `${etiqueta} → ${columna}` : etiqueta;
  }

  const match = placeholder.match(
    /^\{\{pregunta\|(\d+)\|([^|{}]*)(?:\|col:([^|{}]*))?\}\}$/,
  );
  if (match) {
    const [, seccionId, descripcion, columna] = match;
    const seccionNombre = seccionPorId.get(seccionId) || "Sección desconocida";
    return columna
      ? `${seccionNombre} › ${descripcion} → ${columna}`
      : `${seccionNombre} › ${descripcion}`;
  }

  return placeholder;
}
