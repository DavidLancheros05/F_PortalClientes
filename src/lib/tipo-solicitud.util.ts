// Clasificación derivada, no una columna propia. Hay DOS caminos distintos
// para que una solicitud sea "Ampliación de Cupo" (ver
// documentacion/Portal Clientes/Solicitudes/flujo-ampliacion-de-cupo.md):
// Camino 1 (cliente, formulario normal) y Camino 2 (Ejecutivo, página
// dedicada que no pasa por el formulario, pero cuyo backend simula la
// respuesta al guardar). Los dos terminan con una respuesta real a la
// pregunta "Tipo de solicitud" (fp_codigo TIPO_SOLICITUD) en
// Formulario_respuesta — esa es la única fuente confiable para los dos
// casos por igual. `sol_cupo_solicitado` (columna exclusiva de Camino 2) NO
// alcanza sola: deja fuera todas las del Camino 1. El backend ya resuelve
// esto en `es_ampliacion_cupo` (ver
// SolicitudesListadosService.ES_AMPLIACION_CUPO_SQL) — este helper solo
// traduce ese booleano a la etiqueta/color que se muestra.
export function getTipoSolicitud(
  esAmpliacionCupo?: boolean | number | null,
): "Ampliación de Cupo" | "Cliente Nuevo" {
  return esAmpliacionCupo ? "Ampliación de Cupo" : "Cliente Nuevo";
}

export const TIPO_SOLICITUD_BADGE_CLASS: Record<string, string> = {
  "Ampliación de Cupo": "text-emerald-800 bg-emerald-100",
  "Cliente Nuevo": "text-blue-800 bg-blue-100",
};
