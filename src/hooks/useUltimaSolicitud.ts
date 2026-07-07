import { useEffect, useState } from "react";
import { solicitudesService } from "@/services/solicitudes.service";
import { ESTADO_SOLICITUD } from "@/constants/estado-solicitud";
import { RespuestasState } from "@/app/solicitudes/nueva/types";

export interface UltimaSolicitud {
  sol_id: number;
  sol_numero_solicitud: string;
  sol_estado_id: number;
  sol_fecha_creacion: string;
  sol_fecha_envio: string | null;
  respuestas: RespuestasState;
}

interface UseUltimaSolicitudProps {
  clienteId?: number | null;
  enabled?: boolean;
}

interface UseUltimaSolicitudResult {
  ultimaSolicitud: UltimaSolicitud | null;
  loading: boolean;
  error: string | null;
  // Estados calculados
  noTieneSolicitudes: boolean;
  tieneActividad: boolean; // BORRADOR, PENDIENTE, REVISIÓN
  tieneBorrador: boolean;
  tienePendiente: boolean;
  tieneRevision: boolean;
  tieneCompletada: boolean;
  puedeCrearNueva: boolean;
}

export function useUltimaSolicitud({
  clienteId,
  enabled = true,
}: UseUltimaSolicitudProps): UseUltimaSolicitudResult {
  const [ultimaSolicitud, setUltimaSolicitud] = useState<UltimaSolicitud | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // console.log(`[🔴 EFECTO useUltimaSolicitud] NUEVA EJECUCIÓN - enabled=${enabled}, clienteId=${clienteId}, timestamp=${Date.now()}`);

    if (!enabled || !clienteId) {
      // console.log(`[⚪ EFECTO] Saltando - enabled=${enabled}, clienteId=${clienteId}`);
      setUltimaSolicitud(null);
      setError(null);
      return;
    }

    console.log(`[🟡 EFECTO] Iniciando fetch...`);
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`[🔵 useUltimaSolicitud] INICIANDO - cliente_id=${clienteId}`);
        const data = await solicitudesService.getUltimaSolicitud(clienteId);
        console.log(`[🟢 useUltimaSolicitud] RESPUESTA DEL API:`, data);

        if (cancelled) {
          console.log(`[⚪ useUltimaSolicitud] Request cancelado`);
          return;
        }

        if (data && data.sol_id) {
          // Transformar array de respuestas a objeto indexado por fr_fp_id
          const respuestasIndexadas: RespuestasState = {};
          if (Array.isArray(data.respuestas)) {
            data.respuestas.forEach((r: any) => {
              const fpId = Number(r.fr_fp_id);
              if (fpId) {
                respuestasIndexadas[fpId] = {
                  valor_texto: r.fr_valor_texto,
                  valor_numero: r.fr_valor_numero,
                  valor_fecha: r.fr_valor_fecha,
                  valor_opcion_id: r.fr_valor_opcion_id,
                };
              }
            });
          }

          console.log(`[✅ useUltimaSolicitud] Última solicitud encontrada:`, {
            sol_id: data.sol_id,
            sol_numero_solicitud: data.sol_numero_solicitud,
            sol_estado_id: data.sol_estado_id,
            respuestas_count: Object.keys(respuestasIndexadas).length,
          });

          setUltimaSolicitud({
            ...data,
            respuestas: respuestasIndexadas,
          });
        } else {
          console.log(`[⚠️ useUltimaSolicitud] No hay solicitud previa (data=${JSON.stringify(data)})`);
          setUltimaSolicitud(null);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMsg = (err as any)?.message || "Error al obtener última solicitud";
          console.error(`[❌ useUltimaSolicitud] ERROR:`, errorMsg, err);
          setError(errorMsg);
          setUltimaSolicitud(null);
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

  const noTieneSolicitudes = ultimaSolicitud === null;
  const estadoActual = ultimaSolicitud?.sol_estado_id ?? null;
  const tieneBorrador = estadoActual === ESTADO_SOLICITUD.BORRADOR.id;
  const tienePendiente = estadoActual === ESTADO_SOLICITUD.PENDIENTE.id;
  const tieneRevision = estadoActual === ESTADO_SOLICITUD.REVISION.id;
  const tieneCompletada = estadoActual !== null && estadoActual > ESTADO_SOLICITUD.REVISION.id;
  const tieneActividad = tieneBorrador || tienePendiente || tieneRevision;
  const puedeCrearNueva = noTieneSolicitudes || tieneCompletada;

  return {
    ultimaSolicitud,
    loading,
    error,
    noTieneSolicitudes,
    tieneActividad,
    tieneBorrador,
    tienePendiente,
    tieneRevision,
    tieneCompletada,
    puedeCrearNueva,
  };
}
