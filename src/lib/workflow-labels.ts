// Centralized workflow labels to replace 8 hardcoded ESTADOS maps

import { ESTADO_SOLICITUD_POR_ID } from "@/constants/estado-solicitud";
import { ESTADO_TOKENS } from "@/constants/estado-tokens";

// Textos que este archivo mostraba distinto al label "canónico" de
// constants/estado-solicitud.ts (que usa "En revisión") — se preservan acá
// para no cambiar el texto visible en las páginas que ya usan ESTADOS.
const LABEL_OVERRIDES: Partial<Record<number, string>> = {
  3: "Revisión",
};

// Estado visible al cliente — deriva del catálogo real
// (constants/estado-solicitud.ts, que sí coincide con la tabla
// `solicitud_estados`) en vez de mantener una segunda copia hardcodeada de
// los mismos IDs que podía desincronizarse (ver
// documentacion/auditoria-valores-quemados-hardcodeados.md). El "0: Sin
// iniciar" no existe en el catálogo real, se mantiene como caso de UI
// aparte (defensivo, ningún sol_estado_id real es 0).
export const ESTADOS: Record<number, string> = {
  0: "Sin iniciar",
  ...Object.fromEntries(
    Object.values(ESTADO_SOLICITUD_POR_ID).map((estado) => [estado.id, LABEL_OVERRIDES[estado.id] ?? estado.label]),
  ),
};

export function getEstadoLabel(estadoId: number | undefined): string {
  if (!estadoId && estadoId !== 0) return "-";
  return ESTADOS[estadoId] || "Desconocido";
}

export function getEstadoBadgeClass(estadoId: number | undefined): string {
  if (!estadoId && estadoId !== 0) return "bg-gray-100 text-gray-800";
  return ESTADO_TOKENS[estadoId]?.className || "bg-gray-100 text-gray-800";
}
