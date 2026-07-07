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
  datosCliente = {},
  enabled = true,
}: UsePrefillConfiguracionProps): PrefillResult {
  const [respuestasPrecargadas, setRespuestasPrecargadas] = useState<RespuestasState>({});
  const [fuentePorCampo, setFuentePorCampo] = useState<Record<number, "cliente" | "ultima_solicitud">>({});

  // Serialize objects to strings so the effect only re-runs when content changes,
  // not when the caller passes a new object reference on every render.
  const preguntasKey = JSON.stringify(preguntas);
  const respuestasUltimaKey = JSON.stringify(respuestasUltimaFormulario);
  const datosClienteKey = JSON.stringify(datosCliente);

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

        case "ultima_solicitud":
          if (respuestasUltimaFormulario[pregunta.fp_id]) {
            valor = respuestasUltimaFormulario[pregunta.fp_id];
            fuenteUsada = "ultima_solicitud";
          }
          break;

        case "cliente_primero":
          if (campoCliente && datosCliente[campoCliente]) {
            valor = normalizarValorCliente(datosCliente[campoCliente], pregunta, preguntas);
            fuenteUsada = "cliente";
          } else if (respuestasUltimaFormulario[pregunta.fp_id]) {
            valor = respuestasUltimaFormulario[pregunta.fp_id];
            fuenteUsada = "ultima_solicitud";
          }
          break;

        case "ultima_primero":
          if (respuestasUltimaFormulario[pregunta.fp_id]) {
            valor = respuestasUltimaFormulario[pregunta.fp_id];
            fuenteUsada = "ultima_solicitud";
          } else if (campoCliente && datosCliente[campoCliente]) {
            valor = normalizarValorCliente(datosCliente[campoCliente], pregunta, preguntas);
            fuenteUsada = "cliente";
          }
          break;
      }

      if (valor && fuenteUsada) {
        resultado[pregunta.fp_id] = valor;
        fuentes[pregunta.fp_id] = fuenteUsada;
      }
    });

    setRespuestasPrecargadas(resultado);
    setFuentePorCampo(fuentes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntasKey, respuestasUltimaKey, datosClienteKey, enabled]);

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
