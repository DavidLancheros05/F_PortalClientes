import { useEffect, useState } from "react";
import { solicitudesService } from "@/services/solicitudes.service";

interface HistorialItem {
  historialId: number;
  etapaCodigo?: string;
  etapaNombre: string;
  resultadoNombre?: string;
  estadoNombre?: string;
  fecha: string;
  fechaEstimadaInicio?: string | null;
  fechaEstimadaEtapaAnterior?: string | null;
  usuarioNombre?: string;
  comentario?: string;
}

export function useHistorialWorkflow(solicitudId: number | null) {
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!solicitudId) return;

    let cancelled = false;

    async function cargarHistorial() {
      try {
        setLoading(true);
        const response = await solicitudesService.obtenerHistorialWorkflow(solicitudId as number);
        if (cancelled) return;

        if (response?.historial && Array.isArray(response.historial)) {
          const historialFormateado = response.historial.map((h: any, index: number) => {
            const item = {
              historialId: h.historial_id ?? h.historialId ?? index,
              etapaCodigo: h.etapa_codigo ?? h.etapaCodigo,
              etapaNombre: h.etapa_nombre ?? h.etapaNombre ?? "Etapa desconocida",
              resultadoNombre: h.resultado_nombre ?? h.resultadoNombre,
              fecha: h.fecha,
              fechaEstimadaInicio: h.fecha_estimada_inicio ?? h.fechaEstimadaInicio,
              fechaEstimadaEtapaAnterior: h.fecha_estimada_etapa_anterior ?? h.fechaEstimadaEtapaAnterior,
              usuarioNombre: h.nombre ?? h.usuarioNombre,
              comentario: h.comentario,
            };
            return item;
          });

          setHistorial(historialFormateado);
        } else {
          setHistorial([]);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error cargando historial:", err);
        setError(err instanceof Error ? err.message : "Error al cargar historial");
        setHistorial([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    cargarHistorial();
    return () => {
      cancelled = true;
    };
  }, [solicitudId]);

  return { historial, loading, error };
}
