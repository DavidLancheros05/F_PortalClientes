import { useEffect, useState } from "react";
import { solicitudesService } from "@/services/solicitudes.service";
import { RespuestasState, FormularioPregunta } from "@/app/solicitudes/nueva/types";
import { agruparUltimaRespuestaPorPregunta } from "@/lib/agruparUltimaRespuestaPorPregunta";

export interface UltimaSolicitudAprobada {
  sol_id: number;
  sol_numero_solicitud: string;
  sol_estado_id: number;
  sol_fecha_creacion: string;
  sol_fecha_envio: string | null;
  // Indexadas por fp_id de la versión en que se respondieron — solo sirve
  // como precarga directa si esa versión coincide con la activa.
  respuestas: RespuestasState;
  // Las mismas respuestas, indexadas por fp_codigo (identidad estable de
  // la pregunta entre versiones — ver
  // migrations/20260727_backfill_fp_codigo_identidad_entre_versiones.sql).
  // Esta es la que debe usarse para precargar, porque sigue funcionando
  // aunque la versión activa del formulario haya cambiado desde que se
  // aprobó esta solicitud (el fp_id cambia al clonar una versión, el
  // fp_codigo no).
  respuestasPorCodigo: Record<string, RespuestasState[number]>;
}

interface UseUltimaSolicitudAprobadaProps {
  clienteId?: number | null;
  enabled?: boolean;
  // Necesarias para saber cuáles fp_id son MULTISELECT y armar su valor
  // como arreglo en vez de quedarse con una sola opción — ver
  // agruparUltimaRespuestaPorPregunta.
  preguntas?: Pick<FormularioPregunta, "fp_id" | "fp_tipo">[];
}

interface UseUltimaSolicitudAprobadaResult {
  ultimaSolicitudAprobada: UltimaSolicitudAprobada | null;
  loading: boolean;
  error: string | null;
}

// Igual que useUltimaSolicitud pero solo considera la última solicitud
// APROBADA del cliente — se usa para decidir si preseleccionar "Ampliación
// de Cupo" y para precargar respuestas, en vez de mirar la última
// solicitud sin importar su estado (que podría estar rechazada/cancelada).
export function useUltimaSolicitudAprobada({
  clienteId,
  enabled = true,
  preguntas = [],
}: UseUltimaSolicitudAprobadaProps): UseUltimaSolicitudAprobadaResult {
  const [ultimaSolicitudAprobada, setUltimaSolicitudAprobada] =
    useState<UltimaSolicitudAprobada | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo dispara el fetch cuando ya hay preguntas cargadas (necesarias para
  // distinguir MULTISELECT al armar la precarga) — evita una carrera donde
  // la respuesta llega antes que las preguntas y todo se agrupa como valor
  // simple.
  const listo = enabled && !!clienteId && preguntas.length > 0;

  useEffect(() => {
    if (!listo) {
      setUltimaSolicitudAprobada(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data =
          await solicitudesService.getUltimaSolicitudAprobada(clienteId);

        if (cancelled) return;

        if (data && data.sol_id) {
          const filasRespuestas: any[] = Array.isArray(data.respuestas)
            ? data.respuestas
            : [];

          const multiselectFpIds = new Set(
            preguntas
              .filter((p) => p.fp_tipo === "MULTISELECT")
              .map((p) => p.fp_id),
          );
          const respuestasIndexadas = agruparUltimaRespuestaPorPregunta(
            filasRespuestas,
            multiselectFpIds,
          );

          // fp_codigo es constante por fp_id dentro de esta misma
          // solicitud (viene del JOIN a Formulario_pregunta) — basta
          // tomarlo de cualquier fila de ese fp_id.
          const codigoPorFpId = new Map<number, string>();
          filasRespuestas.forEach((r: any) => {
            if (r.fp_codigo) {
              codigoPorFpId.set(Number(r.fr_fp_id), r.fp_codigo);
            }
          });

          const respuestasPorCodigo: Record<string, RespuestasState[number]> =
            {};
          Object.entries(respuestasIndexadas).forEach(([fpId, valor]) => {
            const codigo = codigoPorFpId.get(Number(fpId));
            if (codigo) {
              respuestasPorCodigo[codigo] = valor;
            }
          });

          setUltimaSolicitudAprobada({
            ...data,
            respuestas: respuestasIndexadas,
            respuestasPorCodigo,
          });
        } else {
          setUltimaSolicitudAprobada(null);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMsg =
            (err as any)?.message ||
            "Error al obtener última solicitud aprobada";
          setError(errorMsg);
          setUltimaSolicitudAprobada(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, listo]);

  return { ultimaSolicitudAprobada, loading, error };
}
