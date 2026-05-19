"use client";

import { useState, useEffect } from "react";
import { clientesService } from "@/services/clientes/clientes.service";
import { centrosOperacionService } from "@/services/centros-operacion/centros-operacion.service";

export interface CentroOperacion {
  cop_id: number;
  cop_nombre: string;
  cop_estado?: string;
}

export interface Cliente {
  id: number;
  razonSocial: string;
  nitDocumento: string;
  direccion?: string;
  telefono?: string;
  habilitaAcceso?: boolean;
}

export function useClientes(centroId?: number) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [centros, setCentros] = useState<CentroOperacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCentros, setLoadingCentros] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCentros();
  }, []);

  useEffect(() => {
    fetchClientes(centroId);
  }, [centroId]);

  const fetchCentros = async () => {
    setLoadingCentros(true);
    try {
      console.log("[useClientes] Cargando centros...");
      const data = await centrosOperacionService.getAll();
      const mapped: CentroOperacion[] = data.map((c: any) => ({
        cop_id: c.cop_id,
        cop_nombre: c.cop_nombre,
        cop_estado: c.cop_estado,
      }));
      console.log("[useClientes] Centros cargados:", mapped);
      setCentros(mapped);
    } catch (err: any) {
      console.error("[useClientes] Error cargando centros:", err.message);
      setError(err.message || "Error cargando centros");
    } finally {
      setLoadingCentros(false);
    }
  };

  const fetchClientes = async (cId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await clientesService.getAll();
      const mapped: Cliente[] = data
        .filter((c: any) => !cId || c.cli_id === cId)
        .map((c: any) => ({
          id: c.cli_id ?? c.id,
          razonSocial: c.razonSocial,
          nitDocumento: c.nitDocumento ?? "",
          direccion: c.direccion ?? "",
          telefono: c.telefono ?? "",
          habilitaAcceso: c.habilitaAcceso ?? false,
        }));
      console.log("[useClientes] Clientes mapeados:", mapped);
      setClientes(mapped);
    } catch (err: any) {
      console.error("[useClientes] Error:", err.message);
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return {
    clientes,
    centros,
    loading,
    loadingCentros,
    error,
    refetch: (cId?: number) => fetchClientes(cId ?? centroId),
    refetchCentros: fetchCentros,
  };
}
