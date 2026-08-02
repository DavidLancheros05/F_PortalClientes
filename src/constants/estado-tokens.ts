import { ESTADO_SOLICITUD } from "./estado-solicitud";

// Tokens de color del sistema visual nuevo por estado de solicitud (ver
// design_handoff_portal_rediseños). Estaba duplicado byte a byte en
// gestion-comite-credito-1, gestion-comite-credito-2 y
// gestion-oficial-de-cumplimiento — un solo lugar ahora, con las claves
// referenciando ESTADO_SOLICITUD en vez de números sueltos.
export const ESTADO_TOKENS: Record<number, { color: string; bg: string }> = {
  [ESTADO_SOLICITUD.BORRADOR.id]: { color: "#b45309", bg: "#fffbeb" },
  [ESTADO_SOLICITUD.PENDIENTE.id]: { color: "#b45309", bg: "#fffbeb" },
  [ESTADO_SOLICITUD.REVISION.id]: { color: "#1d4ed8", bg: "#eff6ff" }, // estado normal en estas pantallas
  [ESTADO_SOLICITUD.APROBADA.id]: { color: "#047857", bg: "#ecfdf5" },
  [ESTADO_SOLICITUD.RECHAZADA.id]: { color: "#b91c1c", bg: "#fef2f2" },
};
