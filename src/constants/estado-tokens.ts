import { ESTADO_SOLICITUD } from "./estado-solicitud";

// Tokens de color del sistema visual nuevo por estado de solicitud (ver
// design_handoff_portal_rediseños). Estaba duplicado byte a byte en
// gestion-comite-credito-1, gestion-comite-credito-2 y
// gestion-oficial-de-cumplimiento — un solo lugar ahora, con las claves
// referenciando ESTADO_SOLICITUD en vez de números sueltos.
export const ESTADO_TOKENS: Record<number, { color: string; bg: string; className: string }> = {
  0: {
    color: "#1f2937",
    bg: "#f3f4f6",
    className: "bg-gray-100 text-gray-800",
  },
  [ESTADO_SOLICITUD.BORRADOR.id]: {
    color: "#b45309",
    bg: "#fffbeb",
    className: "bg-yellow-100 text-yellow-800",
  },
  [ESTADO_SOLICITUD.PENDIENTE.id]: {
    color: "#b45309",
    bg: "#fffbeb",
    className: "bg-blue-100 text-blue-800",
  },
  [ESTADO_SOLICITUD.REVISION.id]: {
    color: "#1d4ed8",
    bg: "#eff6ff",
    className: "bg-purple-100 text-purple-800",
  },
  [ESTADO_SOLICITUD.COMPLETADA.id]: {
    color: "#047857",
    bg: "#ecfdf5",
    className: "bg-green-100 text-green-800",
  },
  [ESTADO_SOLICITUD.APROBADA.id]: {
    color: "#047857",
    bg: "#ecfdf5",
    className: "bg-green-100 text-green-800",
  },
  [ESTADO_SOLICITUD.RECHAZADA.id]: {
    color: "#b91c1c",
    bg: "#fef2f2",
    className: "bg-red-100 text-red-800",
  },
};
