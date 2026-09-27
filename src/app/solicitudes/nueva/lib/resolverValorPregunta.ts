import type { FormularioPregunta, RespuestasState } from "../types";

// Resuelve el valor textual actual de la respuesta a una pregunta
// disparadora (padre), sin importar su fp_tipo — usado por cualquier
// mecanismo que condicione otra pregunta a esta respuesta (límite de filas
// de TABLA, filtro dinámico de catálogo de SELECT_TABLA, etc.).
export function resolverValorPreguntaDisparadora(
  preguntaDisparadora: FormularioPregunta | undefined,
  respuestas: RespuestasState,
): string {
  if (!preguntaDisparadora) return "";
  const respuesta = respuestas[preguntaDisparadora.fp_id];
  if (!respuesta) return "";

  if (
    ["SELECT", "SELECT_TABLA", "MULTISELECT"].includes(preguntaDisparadora.fp_tipo)
  ) {
    const valorOpcionId = respuesta.valor_opcion_id;
    const id = Array.isArray(valorOpcionId) ? valorOpcionId[0] : valorOpcionId;
    const opcion = preguntaDisparadora.opciones?.find(
      (o: any) => Number(o.op_id ?? o.fpo_id) === Number(id),
    );
    return String((opcion as any)?.op_descripcion ?? (opcion as any)?.fpo_valor ?? "");
  }

  if (preguntaDisparadora.fp_tipo === "NUMERO") {
    return respuesta.valor_numero != null ? String(respuesta.valor_numero) : "";
  }
  if (preguntaDisparadora.fp_tipo === "FECHA") {
    return respuesta.valor_fecha || "";
  }
  return respuesta.valor_texto || "";
}

// fpo_codigo de TODAS las opciones elegidas en la pregunta disparadora (una
// MULTISELECT puede tener varias). Vacío si no es de opciones o no tiene
// respuesta. Las condiciones entre preguntas van por este código, no por el
// texto de la opción (Fase 5 de plan-correccion-modelo-datos-formulario.md):
// corregir el texto de una opción ya no las rompe.
export function codigosOpcionElegidos(
  preguntaDisparadora: FormularioPregunta | undefined,
  respuestas: RespuestasState,
): string[] {
  if (!preguntaDisparadora) return [];
  const valorOpcionId = respuestas[preguntaDisparadora.fp_id]?.valor_opcion_id;
  if (valorOpcionId == null) return [];
  const ids = Array.isArray(valorOpcionId) ? valorOpcionId : [valorOpcionId];
  return ids
    .map((id) => {
      const opcion = preguntaDisparadora.opciones?.find(
        (o: any) => Number(o.op_id ?? o.fpo_id) === Number(id),
      ) as any;
      return (opcion?.op_codigo ?? opcion?.fpo_codigo ?? null) as string | null;
    })
    .filter((c): c is string => Boolean(c));
}

// Regla de límite de filas / filtro de catálogo ({ valor, opcion_codigo? }):
// por código de opción si la regla lo trae; si no (padre de texto, número o
// catálogo), por texto como antes.
export function reglaCoincide(
  regla: { valor?: string; opcion_codigo?: string | null },
  codigosElegidos: string[],
  valorActualNormalizado: string,
): boolean {
  if (regla.opcion_codigo) return codigosElegidos.includes(regla.opcion_codigo);
  return (regla.valor || "").trim().toLowerCase() === valorActualNormalizado;
}
