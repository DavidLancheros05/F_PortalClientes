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
  // "Cliente Nuevo" | "Ampliación de Cupo" | null (pregunta TIPO_SOLICITUD
  // sin responder — no debería pasar en la práctica, ver
  // documentacion/flujo-ampliacion-de-cupo.md). Solo cubre el Camino 1
  // (cliente auto-detectado); el Camino 2 (Ejecutivo) no pasa por el
  // formulario dinámico y se identifica en el propio objeto `solicitud`
  // por `sol_cupo_solicitado != null` — ver quien consume este hook.
  tipoSolicitud: string | null;
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
  const [tipoSolicitud, setTipoSolicitud] = useState<string | null>(null);

  useEffect(() => {
    if (!solicitudId) {
      setSolicitaCredito(null);
      setMontoSolicitadoTexto(null);
      setFormaPagoSolicitada(null);
      setTipoSolicitud(null);
      setLoading(false);
      return;
    }

    let cancelado = false;
    setLoading(true);

    // Resuelto por fp_codigo (no fp_id fijo): sigue funcionando sin importar
    // la VERSION real con la que se respondió esta solicitud puntual, igual
    // que antes cuando esto salía de formulario-renderizable — pero ese
    // endpoint resuelve las ~85-100 preguntas del formulario completo, y
    // este hook solo necesita 4. getRespuestasPorCodigo pide exactamente
    // esas 4 en una sola query filtrada — era la causa real de que este
    // bloque tardara mucho más que el resto de la página en aparecer.
    solicitudesService
      .getRespuestasPorCodigo(solicitudId, [
        "TIPO_SOLICITUD",
        "SOLICITA_CREDITO",
        "CUPO_SOLICITADO",
        "FORMA_PAGO_SOLICITADA",
      ])
      .then((respuestas) => {
        if (cancelado) return;
        const preguntas = respuestas || [];

        const pTipo = preguntas.find((p) => p.fp_codigo === "TIPO_SOLICITUD");
        const textoTipo = (pTipo?.valor_resuelto || "").trim().toLowerCase();
        setTipoSolicitud(
          !pTipo?.tiene_respuesta
            ? null
            : textoTipo.includes("ampliacion") || textoTipo.includes("ampliación")
              ? "Ampliación de Cupo"
              : "Cliente Nuevo",
        );

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
    tipoSolicitud,
  };
}
