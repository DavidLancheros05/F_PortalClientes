import { useEffect, useState } from "react";
import { solicitudesService } from "@/services/solicitudes.service";

export interface Solicitud {
  sol_id: number;
  sol_numero_solicitud: string;
  sol_estado_id: number;
  sol_cliente_id: number;
  sol_fecha_creacion: string;
  sol_created_at: string;
  sol_updated_at: string;
  sol_razon_social?: string;
  cliente_nombre?: string;
}

interface UseClienteSolicitudesProps {
  clienteId?: number | null;
  enabled?: boolean;
}

interface UseClienteSolicitudesResult {
  solicitudes: Solicitud[];
  loading: boolean;
  error: string | null;
  tieneSolicitudesPrevias: boolean;
  tieneSolicitudActiva: boolean;
  solicitudActiva: Solicitud | null;
}

export function useClienteSolicitudes({
  clienteId,
  enabled = true,
}: UseClienteSolicitudesProps): UseClienteSolicitudesResult {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !clienteId) {
      setSolicitudes([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`[useClienteSolicitudes] Obteniendo solicitudes para cliente ${clienteId}`);
        const data = await solicitudesService.getAllByCliente(clienteId);

        if (cancelled) return;

        const solicitudesArray = Array.isArray(data) ? data : (data?.data ?? []);
        setSolicitudes(solicitudesArray);
        console.log(`[useClienteSolicitudes] ${solicitudesArray.length} solicitud(es) encontrada(s)`);
      } catch (err) {
        if (!cancelled) {
          const errorMsg = (err as any)?.message || "Error al obtener solicitudes";
          console.error("[useClienteSolicitudes] Error:", errorMsg);
          setError(errorMsg);
          setSolicitudes([]);
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

  // Estados activos (no completados/cerrados): 1=borrador, 2=revision, 3=pending, etc.
  // Estados inactivos (completados): 4=aprobado, 5=rechazado, 6=cancelado
  const estadosActivos = [1, 2, 3]; // borrador, revision, pending

  const tieneSolicitudesPrevias = solicitudes.length > 0;

  const solicitudActiva = solicitudes.find((s) =>
    estadosActivos.includes(s.sol_estado_id)
  ) || null;

  const tieneSolicitudActiva = solicitudActiva !== null;

  return {
    solicitudes,
    loading,
    error,
    tieneSolicitudesPrevias,
    tieneSolicitudActiva,
    solicitudActiva,
  };
}
