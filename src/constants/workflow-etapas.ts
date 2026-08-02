// Etapas del workflow con su ID real — debe coincidir con la tabla
// `workflow_etapas` (confirmado en vivo 2026-08-02). Mismo propósito que
// constants/estado-solicitud.ts: reemplazar los IDs quemados sueltos
// (ej. `wetId={4}` repetido en 3 páginas de gestión) por una referencia con
// nombre a un único lugar verificado contra la base.
export const WORKFLOW_ETAPA = {
  CLI: { id: 1, codigo: "CLI", nombre: "Cliente" },
  EJN: { id: 2, codigo: "EJN", nombre: "Ejecutivo Negocios" },
  ASC: { id: 3, codigo: "ASC", nombre: "Auxiliar Servicio Cliente" },
  OFC: { id: 4, codigo: "OFC", nombre: "Oficial Cumplimiento" },
  CC1: { id: 5, codigo: "CC1", nombre: "Comité Crédito 1" },
  CC2: { id: 6, codigo: "CC2", nombre: "Comité Crédito 2" },
} as const;
