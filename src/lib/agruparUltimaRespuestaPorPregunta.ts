import { RespuestasState } from "@/app/solicitudes/nueva/types";

// guardarRespuesta guarda una fila por opción marcada en preguntas
// MULTISELECT, y el historial puede traer guardados anteriores de la misma
// pregunta. Agrupamos por fp_id y nos quedamos solo con el guardado más
// reciente (incluyendo TODAS sus filas, para no perder opciones al armar
// el arreglo). Compartido entre useSolicitudEdicion (reabrir una solicitud
// propia) y useUltimaSolicitudAprobada (precargar desde la última
// aprobada) — misma forma de fila (fr_fp_id/fr_valor_*/fr_created_at) en
// ambos casos.
export function agruparUltimaRespuestaPorPregunta(
  respuestasDataArray: any[],
  multiselectFpIds: Set<number>,
): RespuestasState {
  const filasPorPregunta = new Map<number, any[]>();
  respuestasDataArray.forEach((respuesta: any) => {
    const lista = filasPorPregunta.get(respuesta.fr_fp_id) ?? [];
    lista.push(respuesta);
    filasPorPregunta.set(respuesta.fr_fp_id, lista);
  });

  const respuestasMap: RespuestasState = {};

  filasPorPregunta.forEach((filas, fpId) => {
    const conFecha = filas.map((f) => ({
      fila: f,
      tiempo: new Date(f.fr_created_at ?? 0).getTime(),
    }));
    const maxTiempo = Math.max(...conFecha.map((f) => f.tiempo));
    // Tolerancia de 2s: las opciones de un mismo guardado MULTISELECT se
    // insertan en un loop, cada una con su propio GETDATE(), a milisegundos
    // de diferencia entre sí.
    const filasDelUltimoGuardado = conFecha
      .filter((f) => maxTiempo - f.tiempo < 2000)
      .map((f) => f.fila);

    const opcionesIds = filasDelUltimoGuardado
      .map((f) => f.fr_valor_opcion_id)
      .filter((id: any) => id !== null && id !== undefined);

    // fpo_codigo (identidad estable de la opción entre versiones) solo
    // viene poblado cuando el llamador es useUltimaSolicitudAprobada (usa
    // obtenerRespuestasConCodigoPregunta) — para useSolicitudEdicion
    // (obtenerRespuestas, sin ese JOIN) simplemente no aparece y esto
    // queda vacío, sin efecto.
    const opcionesCodigos = filasDelUltimoGuardado
      .map((f) => f.fpo_codigo)
      .filter((c: any) => c !== null && c !== undefined);

    // Usamos la fila más reciente como base para texto/número/fecha.
    const respuesta = filasDelUltimoGuardado.reduce((latest, f) =>
      new Date(f.fr_created_at ?? 0).getTime() >
      new Date(latest.fr_created_at ?? 0).getTime()
        ? f
        : latest,
    );

    const valorFechaNormalizado =
      typeof respuesta.fr_valor_fecha === "string" &&
      respuesta.fr_valor_fecha.trim() !== ""
        ? respuesta.fr_valor_fecha.slice(0, 10)
        : undefined;

    const valorOpcionCatalogo =
      respuesta.fr_valor_catalogo_id !== null &&
      respuesta.fr_valor_catalogo_id !== undefined
        ? Number(respuesta.fr_valor_catalogo_id)
        : undefined;

    // Para MULTISELECT el valor siempre debe quedar como arreglo, aunque
    // se haya marcado una sola opción (isAnswered() y el checklist de la UI
    // solo reconocen un MULTISELECT como respondido si es Array.isArray).
    const valor_opcion = multiselectFpIds.has(fpId)
      ? opcionesIds
      : opcionesIds.length > 1
        ? opcionesIds
        : (opcionesIds[0] ?? valorOpcionCatalogo);

    const valor_opcion_codigo = multiselectFpIds.has(fpId)
      ? opcionesCodigos
      : opcionesCodigos[0];

    respuestasMap[fpId] = {
      valor_texto: respuesta.fr_valor_texto || undefined,
      valor_numero: respuesta.fr_valor_numero || undefined,
      valor_fecha: valorFechaNormalizado,
      valor_opcion_id: valor_opcion || undefined,
      valor_opcion_codigo:
        Array.isArray(valor_opcion_codigo) && valor_opcion_codigo.length === 0
          ? undefined
          : valor_opcion_codigo || undefined,
    };
  });

  return respuestasMap;
}
