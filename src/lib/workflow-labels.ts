// Centralized workflow labels to replace 8 hardcoded ESTADOS maps

// Estado visible al cliente
export const ESTADOS: Record<number, string> = {
  0: "Sin iniciar",
  1: "Borrador",
  2: "Pendiente",
  3: "Revisión",
  4: "Completada",
  5: "Aprobada",
  6: "Rechazada",
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
