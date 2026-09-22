// Resultados de etapa con su ID real — debe coincidir con la tabla
// `workflow_estado_etapa` (confirmado en vivo 2026-08-02; no existe fila
// con id 4, quedó libre). Mismo propósito que constants/estado-solicitud.ts.
export const WORKFLOW_RESULTADO = {
  PENDIENTE: { id: 1, codigo: "PENDIENTE", nombre: "Pendiente" },
  APROBADO: { id: 2, codigo: "APROBADO", nombre: "Aprobado" },
  RECHAZADO: { id: 3, codigo: "RECHAZADO", nombre: "Rechazado" },
  PEND_FIRMA: {
    id: 5,
    codigo: "PEND_FIRMA",
    nombre: "Pendiente de firma",
  },
} as const;
