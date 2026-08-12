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
