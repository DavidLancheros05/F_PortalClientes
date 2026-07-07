"use client";

import { useEffect, useState } from "react";

interface FormularioPreguntaLite {
  fp_id: number;
  fp_subtipo: string | null;
}

type RespuestasState = {
  [fp_id: number]: {
    valor_texto?: string;
    valor_numero?: number;
    valor_fecha?: string;
    valor_opcion_id?: number | number[] | string;
    archivo?: File;
    nombre_archivo?: string;
    vista_previa_url?: string;
  };
};

interface UseRespuestasFormularioParams {
  preguntas: FormularioPreguntaLite[];
}

export function useRespuestasFormulario({
  preguntas,
}: UseRespuestasFormularioParams) {
  const [respuestas, setRespuestas] = useState<RespuestasState>({});

  useEffect(() => {
    return () => {
      Object.values(respuestas).forEach((respuesta) => {
        if (respuesta?.vista_previa_url) {
          URL.revokeObjectURL(respuesta.vista_previa_url);
        }
      });
    };
  }, [respuestas]);

  const handleInputChange = (fp_id: number, value: any, tipo: string) => {
    const pregunta = preguntas.find((p) => p.fp_id === fp_id);
    if (pregunta?.fp_subtipo === "NOMBRE" && tipo === "TEXTO") {
      const valorLimpio = String(value ?? "").replace(/[0-9]/g, "");
      value = valorLimpio;
    }

    setRespuestas((prev) => {
      const respuestaActual = prev[fp_id];

      // Para tipos con un único valor "core" (texto/numero/fecha/opcion),
      // limpiar los demás antes de asignar el nuevo: si esta pregunta
      // alguna vez quedó con un valor de otro tipo pegado (p.ej. un
      // valor_opcion_id fantasma en una pregunta de TEXTO), el backend
      // lo detecta como conflicto y descarta el valor real al guardar.
      const valoresCore =
        tipo === "ARCHIVO"
          ? {}
          : {
              valor_texto: undefined,
              valor_numero: undefined,
              valor_fecha: undefined,
              valor_opcion_id: undefined,
            };

      const next: RespuestasState = {
        ...prev,
        [fp_id]: {
          ...respuestaActual,
          ...valoresCore,
          ...(tipo === "TEXTO" && { valor_texto: value }),
          ...(tipo === "TABLA" && { valor_texto: value }),
          ...(tipo === "NUMERO" && { valor_numero: value }),
          ...(tipo === "FECHA" && { valor_fecha: value }),
          ...(tipo === "SELECT" && { valor_opcion_id: value }),
          ...(tipo === "SELECT_TABLA" && { valor_numero: value }),
          ...(tipo === "DOCUMENTOS_TABLA" && { valor_opcion_id: value }),
          ...(tipo === "MULTISELECT" && { valor_opcion_id: value }),
          ...(tipo === "ARCHIVO" && {
            archivo: value,
            nombre_archivo: value?.name || undefined,
            vista_previa_url: value
              ? URL.createObjectURL(value)
              : respuestaActual?.vista_previa_url,
          }),
        },
      };

      if (
        tipo === "ARCHIVO" &&
        respuestaActual?.vista_previa_url &&
        respuestaActual.vista_previa_url !== next[fp_id].vista_previa_url
      ) {
        URL.revokeObjectURL(respuestaActual.vista_previa_url);
      }

      return next;
    });
  };

  return {
    respuestas,
    setRespuestas,
    handleInputChange,
  };
}
