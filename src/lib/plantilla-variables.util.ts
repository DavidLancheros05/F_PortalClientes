// Variables reconocidas dentro del contenido de una plantilla de tipo de
// documento ({{cliente_nombre}}, {{pregunta|...}}, etc.) — compartido entre
// DocumentosForm.tsx (editor de la plantilla, con chips de colores) y
// PlantillaEditor.tsx (el editor en sí), para que ambos usen exactamente la
// misma regex y las mismas etiquetas legibles.

export const VARIABLES_FIJAS = [
  { label: "Nombre del cliente", placeholder: "{{cliente_nombre}}" },
  { label: "NIT del cliente", placeholder: "{{cliente_nit}}" },
  { label: "Número de solicitud", placeholder: "{{numero_solicitud}}" },
  {
    label: "Nombre representante legal",
    placeholder: "{{representante_legal_nombre}}",
  },
  {
    label: "Cédula representante legal",
    placeholder: "{{representante_legal_cedula}}",
  },
];

// Nota: excluye a propósito {{size:N}} / {{/size}} (marcador de tamaño de
// letra puntual, ver botón "Tamaño") — esos se muestran como texto plano en
// el editor, no como variable/chip.
export const REGEX_VARIABLE_PLANTILLA =
  /\{\{(?:cliente_nombre|cliente_nit|numero_solicitud|representante_legal_nombre|representante_legal_cedula|pregunta\|[^{}]*)\}\}/g;

/** Nombre legible para mostrar en el chip / en "Usadas en esta plantilla".
 * `etiquetaPorCodigo` traduce los placeholders anclados a fp_codigo
 * ({{pregunta|cod:REP_LEGAL_TABLA|...}}) al nombre actual de esa pregunta
 * en el formulario activo. */
export function construirEtiquetaVariable(
  placeholder: string,
  seccionPorId: Map<string, string>,
  etiquetaPorCodigo?: Map<string, string>,
): string {
  const fija = VARIABLES_FIJAS.find((v) => v.placeholder === placeholder);
  if (fija) return fija.label;

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
