"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { solicitudesService } from "@/services/solicitudes.service";

interface FormularioPregunta {
  fp_id: number;
  fp_descripcion: string;
}

type RespuestasState = {
  [fp_id: number]: {
    valor_texto?: string;
    valor_numero?: number;
    valor_fecha?: string;
    valor_opcion_id?: number | number[] | string;
  };
};

interface User {
  cliente_id?: number;
}

interface UsePrefillUltimaSolicitudParams {
  user?: User | null;
  preguntas: FormularioPregunta[];
  enabled: boolean;
}

export function usePrefillUltimaSolicitud({
  user,
  preguntas,
  enabled,
}: UsePrefillUltimaSolicitudParams) {
  const [respuestasPrefill, setRespuestasPrefill] = useState<RespuestasState>({});
  const [prefilledFieldIds, setPrefilledFieldIds] = useState<
    Record<number, true>
  >({});
  const [prefillSourceByFieldId, setPrefillSourceByFieldId] = useState<
    Record<number, "ultimoFormulario">
  >({});

  const preguntaIds = useMemo(
    () => preguntas.map((p) => p.fp_id).join(","),
    [preguntas],
  );

  const userRef = useRef(user);
  userRef.current = user;

  const preguntasRef = useRef(preguntas);
  preguntasRef.current = preguntas;

  useEffect(() => {
    if (!enabled || !user?.cliente_id || preguntas.length === 0) return;

    let active = true;
    const currentUser = userRef.current;
    const currentPreguntas = preguntasRef.current;

    const prefillFromLastSolicitud = async () => {
      try {
        const solicitudes = await solicitudesService.getAllByCliente(currentUser?.cliente_id!);
        const solicitudesArray = Array.isArray(solicitudes) ? solicitudes : [];
        if (solicitudesArray.length === 0) {
          return;
        }

        const ultimaSolicitud = solicitudesArray.sort(
          (a, b) =>
            new Date(b.fecha_creacion).getTime() -
            new Date(a.fecha_creacion).getTime(),
        )[0];

        const respuestasPrevias = await solicitudesService.getRespuestas(ultimaSolicitud.sol_id);
        const respuestasArray = Array.isArray(respuestasPrevias) ? respuestasPrevias : [];

        const currentPreguntaIds = new Set(currentPreguntas.map((p) => p.fp_id));
        const normalizar = (t?: string | null) =>
          (t || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
        const descToFpId = new Map<string, number>();
        currentPreguntas.forEach((p) => {
          const d = normalizar(p.fp_descripcion);
          if (d) descToFpId.set(d, p.fp_id);
        });

        const respuestasMap: RespuestasState = {};
        const sourceMap: Record<number, "ultimoFormulario"> = {};

        respuestasArray.forEach((r) => {
          let targetFpId: number | undefined;

          if (currentPreguntaIds.has(Number(r.fr_fp_id))) {
            targetFpId = Number(r.fr_fp_id);
          } else if (r.pregunta) {
            targetFpId = descToFpId.get(normalizar(r.pregunta));
          }

          if (!targetFpId) return;

          const valorOpcionCatalogo =
            r.fr_valor_catalogo_id !== null && r.fr_valor_catalogo_id !== undefined
              ? Number(r.fr_valor_catalogo_id)
              : undefined;

          const valorOpcion = r.fr_valor_opcion_id ?? valorOpcionCatalogo;

          const respuesta = {
            valor_texto: r.fr_valor_texto || undefined,
            valor_numero: r.fr_valor_numero || undefined,
            valor_fecha: r.fr_valor_fecha || undefined,
            valor_opcion_id: valorOpcion || undefined,
          };

          respuestasMap[targetFpId] = respuesta;
          if (
            respuesta.valor_texto !== undefined ||
            respuesta.valor_numero !== undefined ||
            respuesta.valor_fecha !== undefined ||
            respuesta.valor_opcion_id !== undefined
          ) {
            sourceMap[targetFpId] = "ultimoFormulario";
          }
        });

        if (!active) return;

        setRespuestasPrefill(respuestasMap);
        setPrefilledFieldIds(
          Object.keys(sourceMap).reduce((acc: Record<number, true>, key) => {
            acc[Number(key)] = true;
            return acc;
          }, {}),
        );
        setPrefillSourceByFieldId(sourceMap);
      } catch (error) {
        if (active) {
          console.error("Error en prefill de ultima solicitud:", error);
        }
      }
    };

    prefillFromLastSolicitud();
    return () => {
      active = false;
    };
  }, [enabled]);

  return {
    respuestasPrefill,
    prefilledFieldIds,
    prefillSourceByFieldId,
  };
}
