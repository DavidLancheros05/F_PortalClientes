import { useEffect, useState } from "react";
import { modulosService, Modulo } from "@/services/modulos.service";

export type { Modulo };

export function useModulos() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchModulos() {
      try {
        const data = await modulosService.getAll();
        setModulos(data);
      } catch (err) {
        console.error("[useModulos] Error:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }

    fetchModulos();
  }, []);

  // Agrupar módulos por padre
  const modulosPorPadre = (padreId: number | null = null) => {
    return modulos
      .filter((m) => m.mod_padre_id === padreId)
      .sort((a, b) => a.mod_posicion - b.mod_posicion);
  };

  // Obtener hijos de un módulo
  const getHijos = (moduloId: number) => {
    return modulosPorPadre(moduloId);
  };

  return {
    modulos,
    loading,
    error,
    modulosPrincipales: modulosPorPadre(null),
    modulosPorPadre,
    getHijos,
  };
}
