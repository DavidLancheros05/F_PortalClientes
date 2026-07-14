// Estados de solicitud con sus códigos y IDs — debe coincidir con la tabla
// real `solicitud_estados` (ver BACKEND/FLUJO_ETAPAS.md); no hay estado
// CANCELADA en el catálogo real.
export const ESTADO_SOLICITUD = {
  BORRADOR: { id: 1, codigo: "BORRADOR", label: "Borrador" },
  PENDIENTE: { id: 2, codigo: "PENDIENTE", label: "Pendiente" },
  REVISION: { id: 3, codigo: "REVISION", label: "En revisión" },
  COMPLETADA: { id: 4, codigo: "COMPLETADA", label: "Completada" },
  APROBADA: { id: 5, codigo: "APROBADA", label: "Aprobada" },
  RECHAZADA: { id: 6, codigo: "RECHAZADA", label: "Rechazada" },
} as const;

// Tipo para el ID del estado
export type EstadoSolicitudId =
  (typeof ESTADO_SOLICITUD)[keyof typeof ESTADO_SOLICITUD]["id"];

// Tipo para el código del estado
export type EstadoSolicitudCodigo =
  (typeof ESTADO_SOLICITUD)[keyof typeof ESTADO_SOLICITUD]["codigo"];

// Mapa inverso de código a objeto de estado
export const ESTADO_SOLICITUD_POR_CODIGO: Record<
  EstadoSolicitudCodigo,
  (typeof ESTADO_SOLICITUD)[keyof typeof ESTADO_SOLICITUD]
> = {
  BORRADOR: ESTADO_SOLICITUD.BORRADOR,
  PENDIENTE: ESTADO_SOLICITUD.PENDIENTE,
  REVISION: ESTADO_SOLICITUD.REVISION,
  COMPLETADA: ESTADO_SOLICITUD.COMPLETADA,
  APROBADA: ESTADO_SOLICITUD.APROBADA,
  RECHAZADA: ESTADO_SOLICITUD.RECHAZADA,
};

// Mapa inverso de ID a objeto de estado
export const ESTADO_SOLICITUD_POR_ID: Record<
  EstadoSolicitudId,
  (typeof ESTADO_SOLICITUD)[keyof typeof ESTADO_SOLICITUD]
> = {
  1: ESTADO_SOLICITUD.BORRADOR,
  2: ESTADO_SOLICITUD.PENDIENTE,
  3: ESTADO_SOLICITUD.REVISION,
  4: ESTADO_SOLICITUD.COMPLETADA,
  5: ESTADO_SOLICITUD.APROBADA,
  6: ESTADO_SOLICITUD.RECHAZADA,
};
