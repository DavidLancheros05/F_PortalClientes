// Centralized workflow labels to replace 8 hardcoded ESTADOS maps

import { ESTADO_SOLICITUD_POR_ID } from "@/constants/estado-solicitud";

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
    Object.values(ESTADO_SOLICITUD_POR_ID).map((estado) => [
      estado.id,
      LABEL_OVERRIDES[estado.id] ?? estado.label,
    ]),
  ),
};

// Etapas del workflow
export const ETAPAS: Record<string, string> = {
  EJN: "Ejecutivo Negocios",
  ASC: "Auxiliar Servicio Cliente",
  OFC: "Oficial Cumplimiento",
  CC1: "Comité Crédito 1",
  CC2: "Comité Crédito 2",
};

// Resultados de etapa
export const RESULTADOS: Record<string, string> = {
  PD: "Pendiente",
  AP: "Aprobado",
  RZ: "Rechazado",
};

export function getEstadoLabel(estadoId: number | undefined): string {
  if (!estadoId && estadoId !== 0) return "-";
  return ESTADOS[estadoId] || "Desconocido";
}

export function getEtapaLabel(etapaCodigo: string | undefined): string {
  if (!etapaCodigo) return "-";
  return ETAPAS[etapaCodigo] || etapaCodigo;
}

export function getResultadoLabel(resultadoCodigo: string | undefined): string {
  if (!resultadoCodigo) return "-";
  return RESULTADOS[resultadoCodigo] || resultadoCodigo;
}

export function getEstadoBadgeClass(estadoId: number | undefined): string {
  if (!estadoId && estadoId !== 0) return "bg-gray-100 text-gray-800";

  switch (estadoId) {
    case 0: // Sin iniciar
      return "bg-gray-100 text-gray-800";
    case 1: // Borrador
      return "bg-yellow-100 text-yellow-800";
    case 2: // Pendiente
      return "bg-blue-100 text-blue-800";
    case 3: // Revisión
      return "bg-purple-100 text-purple-800";
    case 4: // Completada
      return "bg-green-100 text-green-800";
    case 5: // Aprobada
      return "bg-green-100 text-green-800";
    case 6: // Rechazada
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
