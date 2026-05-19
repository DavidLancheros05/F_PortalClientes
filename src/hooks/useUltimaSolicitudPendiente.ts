import { useEffect, useState } from "react";
import { solicitudesService } from "@/services/solicitudes.service";
import { RespuestasState } from "@/app/solicitudes/nueva/types";

interface UseUltimaSolicitudPendienteProps {
  clienteId?: number | null;
  enabled?: boolean;
}

interface UseUltimaSolicitudPendienteResult {
  respuestasUltima: RespuestasState;
  loading: boolean;
}

export function useUltimaSolicitudPendiente({
  clienteId,
  enabled = true,
}: UseUltimaSolicitudPendienteProps): UseUltimaSolicitudPendienteResult {
  const [respuestasUltima, setRespuestasUltima] = useState<RespuestasState>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !clienteId) {
      setRespuestasUltima({});
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        console.log(`[useUltimaSolicitudPendiente] buscando última solicitud pendiente para cliente_id=${clienteId}`);
        const data = await solicitudesService.getUltimaSolicitudPendiente(clienteId);

        if (cancelled) return;

        if (!data.sol_id || !Array.isArray(data.respuestas)) {
          console.log(`[useUltimaSolicitudPendiente] cliente_id=${clienteId} → no hay solicitud pendiente`);
          setRespuestasUltima({});
          return;
        }

        // Convierte el array de respuestas a RespuestasState indexado por fr_fp_id
        const indexed: RespuestasState = {};
        for (const r of data.respuestas) {
          const fpId = Number(r.fr_fp_id);
          if (!fpId) continue;
          const entrada: RespuestasState[number] = {};
          if (r.fr_valor_texto != null) entrada.valor_texto = r.fr_valor_texto;
          if (r.fr_valor_numero != null) entrada.valor_numero = r.fr_valor_numero;
          if (r.fr_valor_fecha != null) entrada.valor_fecha = r.fr_valor_fecha;
          if (r.fr_valor_opcion_id != null) entrada.valor_opcion_id = r.fr_valor_opcion_id;
          indexed[fpId] = entrada;
        }

        console.log(
          `[useUltimaSolicitudPendiente] sol_id=${data.sol_id}, ${data.respuestas.length} respuesta(s) cargada(s):`,
          indexed,
        );

        setRespuestasUltima(indexed);
      } catch (err) {
        if (!cancelled) {
          console.error("[useUltimaSolicitudPendiente] Error al obtener última solicitud pendiente:", err);
          setRespuestasUltima({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [clienteId, enabled]);

  return { respuestasUltima, loading };
}
