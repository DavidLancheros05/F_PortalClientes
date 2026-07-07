import { useEffect, useState } from "react";
import { clientesService } from "@/services/clientes/clientes.service";
import type { ClienteResponse } from "@/types/api.types";

/**
 * Normalización de datos del cliente para compatibilidad con formularios
 */
interface ClienteData {
  cliente_id: number;
  cliente_nombre: string;
  cliente_razon_social: string;
  cliente_direccion: string;
  cliente_email: string;
  cliente_nit_documento: string;
  cliente_tipo_identificacion: number;
  [key: string]: any;
}

interface UseClienteDataProps {
  clienteId?: number | null;
  enabled?: boolean;
}

interface UseClienteDataResult {
  clienteData: ClienteData | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook para obtener datos completos del cliente desde la API
 * Convierte ClienteResponse al formato esperado por los formularios
 */
export function useClienteData({
  clienteId,
  enabled = true,
}: UseClienteDataProps): UseClienteDataResult {
  const [clienteData, setClienteData] = useState<ClienteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !clienteId) {
      setClienteData(null);
      setError(null);
      return;
    }

    const fetchClienteData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data: ClienteResponse = await clientesService.getById(clienteId);

        // Mapear desde ClienteResponse al formato esperado por formularios
        const normalizado: ClienteData = {
          cliente_id: data.cli_id,
          cliente_nombre: data.cli_razon_social,
          cliente_razon_social: data.cli_razon_social,
          cliente_direccion: data.cli_direccion || "",
          cliente_email: data.cli_correo || "",
          cliente_nit_documento: data.cli_nro_identificacion,
          cliente_tipo_identificacion: data.cli_tipo_identificacion,
          pai_id: (data as any).pai_id ?? undefined,
          dpto_id: (data as any).dpto_id ?? undefined,
          ciu_id: (data as any).ciu_id ?? undefined,
        };

        setClienteData(normalizado);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Error fetching cliente data")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchClienteData();
  }, [clienteId, enabled]);

  return {
    clienteData,
    loading,
    error,
  };
}
