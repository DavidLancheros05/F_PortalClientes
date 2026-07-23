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

    async function cargarHistorial() {
      try {
        setLoading(true);
        const response =
          await solicitudesService.obtenerHistorialWorkflow(solicitudId as number);
        console.log("[useHistorialWorkflow] Response completo:", response);

        if (response?.historial && Array.isArray(response.historial)) {
          console.log(
            "[useHistorialWorkflow] Primer item del historial:",
            response.historial[0],
          );
          const historialFormateado = response.historial.map(
            (h: any, index: number) => {
              const item = {
                historialId: h.historial_id ?? h.historialId ?? index,
                etapaCodigo: h.etapa_codigo ?? h.etapaCodigo,
                etapaNombre:
                  h.etapa_nombre ?? h.etapaNombre ?? "Etapa desconocida",
                resultadoNombre: h.resultado_nombre ?? h.resultadoNombre,
                fecha: h.fecha,
                fechaEstimadaInicio:
                  h.fecha_estimada_inicio ?? h.fechaEstimadaInicio,
                fechaEstimadaEtapaAnterior:
                  h.fecha_estimada_etapa_anterior ??
                  h.fechaEstimadaEtapaAnterior,
                usuarioNombre: h.nombre ?? h.usuarioNombre,
                comentario: h.comentario,
              };
              if (index === 0)
                console.log("[useHistorialWorkflow] Item mapeado:", item);
              return item;
            },
          );
          console.log(
            "[useHistorialWorkflow] Historial formateado:",
            historialFormateado,
          );
          setHistorial(historialFormateado);
        } else {
          console.log(
            "[useHistorialWorkflow] No hay historial en la respuesta",
          );
          setHistorial([]);
        }
      } catch (err) {
        console.error("Error cargando historial:", err);
        setError(
          err instanceof Error ? err.message : "Error al cargar historial",
        );
        setHistorial([]);
      } finally {
        setLoading(false);
      }
    }

    cargarHistorial();
  }, [solicitudId]);

  return { historial, loading, error };
}
