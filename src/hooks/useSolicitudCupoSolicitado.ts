import { useEffect, useState } from "react";
import { solicitudesService } from "@/services/solicitudes.service";

export interface SolicitudCupoSolicitado {
  loading: boolean;
  // null = la pregunta no fue respondida
  solicitaCredito: boolean | null;
  // Ya formateado por el backend (ej. "$50.000.000") — mismo criterio que
  // usa el PDF de la solicitud para preguntas NUMERO/MONEDA.
  montoSolicitadoTexto: string | null;
  formaPagoSolicitada: string | null;
}

export function useSolicitudCupoSolicitado(
  solicitudId: number | null | undefined,
): SolicitudCupoSolicitado {
  const [loading, setLoading] = useState(true);
  const [solicitaCredito, setSolicitaCredito] = useState<boolean | null>(
    null,
  );
  const [montoSolicitadoTexto, setMontoSolicitadoTexto] = useState<
    string | null
  >(null);
  const [formaPagoSolicitada, setFormaPagoSolicitada] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!solicitudId) {
      setSolicitaCredito(null);
      setMontoSolicitadoTexto(null);
      setFormaPagoSolicitada(null);
      setLoading(false);
      return;
    }

    let cancelado = false;
    setLoading(true);

    // Resuelto vía formulario-renderizable (por fp_codigo, no fp_id fijo):
    // ese endpoint ya filtra por la VERSION real con la que se respondió
    // esta solicitud puntual, a diferencia de fp_id hardcodeados que solo
    // existían en la versión 9 — cualquier solicitud diligenciada contra
    // una versión más nueva quedaba con solicitaCredito=null, y el render
    // (`solicitaCredito ? ... : "No"`) lo mostraba como "No" aunque el
    // cliente hubiera respondido "Sí" (ver Registrar Concepto Ejecutivo).
    solicitudesService
      .getFormularioRenderizable(solicitudId)
      .then((renderizable) => {
        if (cancelado) return;
        const preguntas = renderizable?.preguntas || [];

        const pSolicita = preguntas.find(
          (p) => p.fp_codigo === "SOLICITA_CREDITO",
        );
        const textoSolicita = (pSolicita?.valor_resuelto || "")
          .trim()
          .toLowerCase();
        const respondioSi = pSolicita?.tiene_respuesta
          ? textoSolicita === "si" || textoSolicita === "sí"
          : null;
        setSolicitaCredito(respondioSi);

        if (respondioSi) {
          const pMonto = preguntas.find(
            (p) => p.fp_codigo === "CUPO_SOLICITADO",
          );
          setMontoSolicitadoTexto(
            pMonto?.tiene_respuesta ? pMonto.valor_resuelto : null,
          );

          const pForma = preguntas.find(
            (p) => p.fp_codigo === "FORMA_PAGO_SOLICITADA",
          );
          setFormaPagoSolicitada(
            pForma?.tiene_respuesta ? pForma.valor_resuelto : null,
          );
        } else {
          setMontoSolicitadoTexto(null);
          setFormaPagoSolicitada(null);
        }
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

  return {
    loading,
    solicitaCredito,
    montoSolicitadoTexto,
    formaPagoSolicitada,
  };
}
