import { useEffect, useState } from "react";
import { solicitudesService } from "@/services/solicitudes.service";
import { formularioPreguntasService } from "@/services/parametrizacion/formulario-preguntas.service";

// IDs fijos de las preguntas del formulario (sección "SOLICITUD DE CREDITO",
// versión activa) que capturan si el cliente pide cupo de crédito y el
// monto. Mismo patrón de fp_id hardcodeado que ya usa SolicitudFormContent
// para la pregunta "Tipo de solicitud" (fp_id=1171).
const FP_ID_SOLICITA_CREDITO = 2249;
const FP_ID_CUPO_SOLICITADO = 1217;

export interface SolicitudCupoSolicitado {
  loading: boolean;
  // null = la pregunta no fue respondida
  solicitaCredito: boolean | null;
  montoSolicitado: number | null;
}

export function useSolicitudCupoSolicitado(
  solicitudId: number | null | undefined,
): SolicitudCupoSolicitado {
  const [loading, setLoading] = useState(true);
  const [solicitaCredito, setSolicitaCredito] = useState<boolean | null>(
    null,
  );
  const [montoSolicitado, setMontoSolicitado] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (!solicitudId) {
      setSolicitaCredito(null);
      setMontoSolicitado(null);
      setLoading(false);
      return;
    }

    let cancelado = false;
    setLoading(true);

    Promise.all([
      solicitudesService.getRespuestas(solicitudId),
      formularioPreguntasService
        .getOpciones(FP_ID_SOLICITA_CREDITO)
        .catch(() => []),
    ])
      .then(([respuestas, opciones]) => {
        if (cancelado) return;

        const respuestasArr = Array.isArray(respuestas) ? respuestas : [];
        const respuestaSolicita = respuestasArr.find(
          (r: any) => Number(r.fr_fp_id) === FP_ID_SOLICITA_CREDITO,
        );
        const respuestaMonto = respuestasArr.find(
          (r: any) => Number(r.fr_fp_id) === FP_ID_CUPO_SOLICITADO,
        );

        let respondioSi: boolean | null = null;
        if (respuestaSolicita?.fr_valor_opcion_id != null) {
          const opcion = (opciones as any[]).find(
            (o) =>
              String(o.fpo_id ?? o.op_id) ===
              String(respuestaSolicita.fr_valor_opcion_id),
          );
          const texto = (opcion?.fpo_valor ?? opcion?.op_descripcion ?? "")
            .toString()
            .trim()
            .toLowerCase();
          respondioSi = texto === "si" || texto === "sí";
        }

        setSolicitaCredito(respondioSi);
        setMontoSolicitado(
          respondioSi && respuestaMonto?.fr_valor_numero != null
            ? Number(respuestaMonto.fr_valor_numero)
            : null,
        );
      })
      .catch((err) => {
        console.error("Error obteniendo cupo solicitado:", err);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [solicitudId]);

  return { loading, solicitaCredito, montoSolicitado };
}
