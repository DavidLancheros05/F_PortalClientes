/**
 * Normalizadores de respuestas del API
 *
 * El backend tiene inconsistencia en sus respuestas (data.data vs data vs root level).
 * Estos helpers extraen valores esperados de múltiples posibles estructuras.
 *
 * ⚠️ DEUDA TÉCNICA: El backend debería devolver siempre la misma estructura.
 * Ver: https://github.com/[repo]/issues/[issue] — estandarizar respuestas
 */

/**
 * Extrae solicitud_id de una respuesta de creación de solicitud
 * Maneja múltiples formatos de respuesta inconsistentes
 */
export function extractSolicitudId(response: any): number {
  const id =
    response?.data?.data?.solicitud_id ||
    response?.data?.solicitud_id ||
    response?.data?.sol_id ||
    response?.solicitud_id ||
    response?.sol_id;

  if (!id || isNaN(id)) {
    throw new Error(
      `No se pudo extraer solicitud_id de la respuesta. Respuesta completa: ${JSON.stringify(response)}`
    );
  }

  return Number(id);
}

/**
 * Extrae el payload de datos de una respuesta genérica del API
 * El backend envuelve datos en data.data, data, o root level
 */
export function extractResponseData(response: any): any {
  return response?.data?.data ?? response?.data ?? response;
}

/**
 * Normaliza una respuesta de creación a formato estándar
 * @returns { solicitud_id: number, [otros_campos]: any }
 */
export function normalizeSolicitudResponse(response: any) {
  const solicitudId = extractSolicitudId(response);
  const data = extractResponseData(response);

  return {
    solicitud_id: solicitudId,
    ...data,
  };
}
