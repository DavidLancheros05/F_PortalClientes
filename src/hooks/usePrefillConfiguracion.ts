import { useEffect, useState } from "react";
import { FormularioPregunta, RespuestasState } from "@/app/solicitudes/nueva/types";

interface PrefillConfig {
  fuente: "cliente" | "ultima_solicitud" | "cliente_primero" | "ultima_primero" | null;
  campocliente?: string;
}

interface UsePrefillConfiguracionProps {
  preguntas: FormularioPregunta[];
  respuestasCliente?: RespuestasState;
  respuestasUltimaFormulario?: RespuestasState;
  // Misma última solicitud, indexada por fp_codigo en vez de fp_id — se
  // intenta primero porque sigue funcionando aunque la versión activa del
  // formulario haya cambiado desde que se respondió esa solicitud (el
  // fp_id cambia al clonar una versión nueva, el fp_codigo no). Ver
  // useUltimaSolicitudAprobada.
  respuestasUltimaPorCodigo?: Record<number | string, RespuestasState[number]>;
  datosCliente?: Record<string, any>;
  enabled?: boolean;
}

interface PrefillResult {
  respuestasPrecargadas: RespuestasState;
  fuentePorCampo: Record<number, "cliente" | "ultima_solicitud">;
}

export function usePrefillConfiguracion({
  preguntas,
  respuestasCliente: _respuestasCliente = {},
  respuestasUltimaFormulario = {},
  respuestasUltimaPorCodigo = {},
  datosCliente = {},
  enabled = true,
}: UsePrefillConfiguracionProps): PrefillResult {
  const [respuestasPrecargadas, setRespuestasPrecargadas] = useState<RespuestasState>({});
  const [fuentePorCampo, setFuentePorCampo] = useState<Record<number, "cliente" | "ultima_solicitud">>({});

  // Serialize objects to strings so the effect only re-runs when content changes,
  // not when the caller passes a new object reference on every render.
  const preguntasKey = JSON.stringify(preguntas);
  const respuestasUltimaKey = JSON.stringify(respuestasUltimaFormulario);
  const respuestasUltimaPorCodigoKey = JSON.stringify(respuestasUltimaPorCodigo);
  const datosClienteKey = JSON.stringify(datosCliente);

  // Busca la respuesta de la última solicitud primero por fp_codigo
  // (sobrevive a un cambio de versión del formulario) y solo si no hay
  // código o no aparece ahí, cae al fp_id directo (comportamiento previo,
  // sigue siendo correcto cuando la versión no cambió).
  const buscarUltimaSolicitud = (pregunta: FormularioPregunta) => {
    const porCodigo = pregunta.fp_codigo
      ? respuestasUltimaPorCodigo[pregunta.fp_codigo]
      : undefined;
    const encontrada = porCodigo ?? respuestasUltimaFormulario[pregunta.fp_id];
    if (!encontrada) return encontrada;

    // SELECT/MULTISELECT: el valor_opcion_id guardado es un fpo_id que
    // puede ser de otra versión del formulario y no significar nada aquí
    // (fpo_id cambia al clonar versión). Si la respuesta trae el código
    // estable de la(s) opción(es) (fpo_codigo, poblado solo cuando viene
    // de useUltimaSolicitudAprobada), se traduce al op_id vigente en esta
    // versión buscándolo en las opciones actuales de la pregunta.
    if (encontrada.valor_opcion_codigo && pregunta.opciones?.length) {
      const esMultiple = Array.isArray(encontrada.valor_opcion_codigo);
      const codigos = esMultiple
        ? (encontrada.valor_opcion_codigo as string[])
        : [encontrada.valor_opcion_codigo as string];
      const idsTraducidos = codigos
        .map(
          (codigo) =>
            pregunta.opciones?.find((o) => o.op_codigo === codigo)?.op_id,
        )
        .filter((id): id is number => id !== undefined);

      if (idsTraducidos.length > 0) {
        return {
          ...encontrada,
          valor_opcion_id: esMultiple ? idsTraducidos : idsTraducidos[0],
        };
      }
      // Ninguna opción vieja existe ya en esta versión: no dejar el
      // fpo_id viejo (no significaría nada acá), mejor sin selección.
      return { ...encontrada, valor_opcion_id: undefined };
    }

    return encontrada;
  };

  useEffect(() => {
    if (!enabled || preguntas.length === 0) {
      setRespuestasPrecargadas({});
      setFuentePorCampo({});
      return;
    }


    const resultado: RespuestasState = {};
    const fuentes: Record<number, "cliente" | "ultima_solicitud"> = {};

    preguntas.forEach((pregunta) => {
      const fuente = pregunta.fp_precarga_fuente as PrefillConfig["fuente"];
      const campoCliente = pregunta.fp_precarga_campo_cliente;

      // Debug: mostrar todas las preguntas que contienen "Razón" en la descripción


      if (!fuente) {
        return;
      }


      let valor: RespuestasState[number] | null = null;
      let fuenteUsada: "cliente" | "ultima_solicitud" | null = null;

      switch (fuente) {
        case "cliente":
          if (campoCliente) {
            const existe = !!datosCliente[campoCliente];
            const val = datosCliente[campoCliente];
            if (existe) {
              valor = normalizarValorCliente(val, pregunta, preguntas);
              fuenteUsada = "cliente";
            }
          }
          break;

        case "ultima_solicitud": {
          const encontrada = buscarUltimaSolicitud(pregunta);
          if (encontrada) {
            valor = encontrada;
            fuenteUsada = "ultima_solicitud";
          }
          break;
        }

        case "cliente_primero":
          if (campoCliente && datosCliente[campoCliente]) {
            valor = normalizarValorCliente(datosCliente[campoCliente], pregunta, preguntas);
            fuenteUsada = "cliente";
          } else {
            const encontrada = buscarUltimaSolicitud(pregunta);
            if (encontrada) {
              valor = encontrada;
              fuenteUsada = "ultima_solicitud";
            }
          }
          break;

        case "ultima_primero": {
          const encontrada = buscarUltimaSolicitud(pregunta);
          if (encontrada) {
            valor = encontrada;
            fuenteUsada = "ultima_solicitud";
          } else if (campoCliente && datosCliente[campoCliente]) {
            valor = normalizarValorCliente(datosCliente[campoCliente], pregunta, preguntas);
            fuenteUsada = "cliente";
          }
          break;
        }
      }

      if (valor && fuenteUsada) {
        resultado[pregunta.fp_id] = valor;
        fuentes[pregunta.fp_id] = fuenteUsada;
      }
    });

    setRespuestasPrecargadas(resultado);
    setFuentePorCampo(fuentes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    preguntasKey,
    respuestasUltimaKey,
    respuestasUltimaPorCodigoKey,
    datosClienteKey,
    enabled,
  ]);

  return {
    respuestasPrecargadas,
    fuentePorCampo,
  };
}

/**
 * Normaliza un valor del cliente a la estructura de respuesta esperada
 */
function normalizarValorCliente(
  valor: any,
  pregunta: FormularioPregunta,
  allPreguntas?: FormularioPregunta[],
): RespuestasState[number] | null {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const respuesta: RespuestasState[number] = {};

  switch (pregunta.fp_tipo) {
    case "TEXTO":
      respuesta.valor_texto = String(valor);
      break;

    case "NUMERO":
      respuesta.valor_numero = Number(valor);
      break;

    case "FECHA":
      // Asumir que viene en formato YYYY-MM-DD
      respuesta.valor_fecha = String(valor);
      break;

    case "SELECT":
    case "SELECT_CONDICIONAL":
    case "DOCUMENTOS_TABLA": {
      // El id de la opción es específico de ESTA pregunta (Formulario_pregunta_opcion),
      // no coincide con ids de otros catálogos (p.ej. tipos_identificacion). Por eso
      // primero se intenta emparejar por texto (aceptando uno o varios candidatos);
      // solo si eso falla y el valor no es texto, se asume que ya es el id correcto.
      const candidatos = Array.isArray(valor) ? valor : [valor];
      const normalizarComparacion = (texto: any) =>
        String(texto ?? "")
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .trim()
          .toLowerCase();

      let opcionCoincidencia: { op_id: number; op_descripcion: string } | undefined;
      for (const candidato of candidatos) {
        if (candidato === null || candidato === undefined || candidato === "") {
          continue;
        }
        const candidatoNorm = normalizarComparacion(candidato);
        opcionCoincidencia = pregunta.opciones?.find(
          (op) => normalizarComparacion(op.op_descripcion) === candidatoNorm,
        );
        if (opcionCoincidencia) break;
      }

      if (opcionCoincidencia) {
        respuesta.valor_opcion_id = opcionCoincidencia.op_id;
      } else if (!Array.isArray(valor) && typeof valor === "number") {
        respuesta.valor_opcion_id = valor;
      } else {
        return null;
      }
      break;
    }

    case "SELECT_TABLA":
      // SELECT_TABLA usa valor_numero (IDs de tablas catálogo: país, departamento, ciudad)
      respuesta.valor_numero = Number(valor);
      break;

    default:
      return null;
  }

  return respuesta;
}
