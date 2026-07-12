// Estados de solicitud con sus códigos y IDs
export const ESTADO_SOLICITUD = {
  BORRADOR: { id: 1, codigo: "BOR", label: "Borrador" },
  PENDIENTE: { id: 2, codigo: "PEN", label: "Pendiente" },
  REVISION: { id: 3, codigo: "REV", label: "En revisión" },
  APROBADA: { id: 4, codigo: "APR", label: "Aprobada" },
  RECHAZADA: { id: 5, codigo: "REC", label: "Rechazada" },
  CANCELADA: { id: 6, codigo: "CAN", label: "Cancelada" },
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
  BOR: ESTADO_SOLICITUD.BORRADOR,
  PEN: ESTADO_SOLICITUD.PENDIENTE,
  REV: ESTADO_SOLICITUD.REVISION,
  APR: ESTADO_SOLICITUD.APROBADA,
  REC: ESTADO_SOLICITUD.RECHAZADA,
  CAN: ESTADO_SOLICITUD.CANCELADA,
};

// Mapa inverso de ID a objeto de estado
export const ESTADO_SOLICITUD_POR_ID: Record<
  EstadoSolicitudId,
  (typeof ESTADO_SOLICITUD)[keyof typeof ESTADO_SOLICITUD]
> = {
  1: ESTADO_SOLICITUD.BORRADOR,
  2: ESTADO_SOLICITUD.PENDIENTE,
  3: ESTADO_SOLICITUD.REVISION,
  4: ESTADO_SOLICITUD.APROBADA,
  5: ESTADO_SOLICITUD.RECHAZADA,
  6: ESTADO_SOLICITUD.CANCELADA,
};
