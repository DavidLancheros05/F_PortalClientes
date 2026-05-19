import { useEffect, useState } from "react";
import { clientesService } from "@/services/clientes/clientes.service";

interface ClienteData {
  cliente_id?: number;
  cliente_nombre?: string;
  cliente_razon_social?: string;
  cliente_direccion?: string;
  cliente_telefono?: string;
  cliente_email?: string;
  cliente_nit_documento?: string;
  cliente_tipo_identificacion?: string;
  cliente_numero_identificacion?: string;
  cliente_sitio_web?: string;
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
 * Útil para precarga de formularios y personalización basada en cliente
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
      // console.log("[useClienteData] ❌ Disabled or no clienteId:", { enabled, clienteId });
      setClienteData(null);
      setError(null);
      return;
    }

    const fetchClienteData = async () => {
      // // console.log("[useClienteData] 📡 Fetching client data for ID:", clienteId);
      setLoading(true);
      setError(null);

      try {
        const data = await clientesService.getById(clienteId);
        // console.log("[useClienteData] ✅ API Response:", data);

        // Normalizar campos: mapear desde el formato retornado por la API (camelCase)
        const nitDocumento =
          data.nitDocumento ||
          data.cliente_nit_documento ||
          data.cli_nro_identificacion;
        const normalizado: ClienteData = {
          cliente_id: data.cli_id || clienteId,
          cliente_nombre:
            data.razonSocial ||
            data.cliente_nombre ||
            data.cli_nombre ||
            data.cliente_razon_social,
          cliente_razon_social: data.razonSocial || data.cliente_razon_social,
          cliente_direccion: data.direccion || data.cliente_direccion || data.cli_direccion,
          cliente_telefono: data.telefono || data.cliente_telefono || data.cli_telefono,
          cliente_email: data.email || data.correo || data.cliente_email || data.cli_email || data.cli_correo,
          cliente_nit_documento: nitDocumento,
          cliente_tipo_identificacion:
            data.tipoIdentificacion ||
            data.cliente_tipo_identificacion ||
            data.cli_tipo_identificacion ||
            data.tipo_identificacion,
          cliente_numero_identificacion:
            data.nitDocumento ||
            data.cliente_numero_identificacion ||
            data.cli_numero_identificacion ||
            data.numero_identificacion ||
            nitDocumento,
          cliente_sitio_web: data.cliente_sitio_web || data.cli_sitio_web,
        };

        // console.log("[useClienteData] ✨ Normalized data:", normalizado);
        setClienteData(normalizado);
      } catch (err) {
        // console.error(`[useClienteData] ❌ Error fetching cliente data for ${clienteId}:`, err);
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
