"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { workflowSolicitudesService } from "@/services/workflow-solicitudes.service";
import HistorialSolicitud from "@/components/historial/HistorialSolicitud";
import { ArrowLeft } from "lucide-react";

interface HistorialItem {
  historialId: number;
  etapaNombre: string;
  resultadoNombre?: string;
  estadoNombre?: string;
  fecha: string;
  usuarioNombre?: string;
}

export default function SolicitudHistorialPage() {
  const router = useRouter();
  const params = useParams();
  const { loading: authLoading } = useContext(AuthContext);

  const solicitudId = Number(params?.id);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarHistorial() {
      if (!authLoading && solicitudId) {
        try {
          setLoading(true);
          const data = await workflowSolicitudesService.obtenerHistorialWorkflow(
            solicitudId,
          );

          // Manejar diferentes estructuras de respuesta
          let historialRaw: any[] = [];

          if (Array.isArray(data)) {
            historialRaw = data;
          } else if (data && typeof data === "object") {
            // Si es un objeto, buscar propiedades comunes
            if (Array.isArray(data.data)) {
              historialRaw = data.data;
            } else if (Array.isArray(data.historial)) {
              historialRaw = data.historial;
            } else if (Array.isArray(data.items)) {
              historialRaw = data.items;
            }
          }

          // Mapear de snake_case a camelCase
          const historialData: HistorialItem[] = historialRaw.map((item) => ({
            historialId: item.historial_id || item.historialId,
            etapaNombre:
              item.etapa_nombre || item.etapaNombre || "Etapa desconocida",
            resultadoNombre:
              item.resultado_nombre || item.resultadoNombre || undefined,
            estadoNombre: item.estado_nombre || item.estadoNombre || undefined,
            fecha: item.fecha,
            usuarioNombre:
              item.usuario_nombre || item.usuarioNombre || undefined,
          }));

          setHistorial(historialData);
        } catch (err) {
          console.error("Error cargando historial:", err);
          setError("No se pudo cargar el historial de la solicitud");
        } finally {
          setLoading(false);
        }
      }
    }

    cargarHistorial();
  }, [solicitudId, authLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
            <h1 className="text-2xl md:text-3xl font-bold text-blue-800 mb-6">
              Historial de Solicitud #{solicitudId}
            </h1>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            ) : (
              <HistorialSolicitud historial={historial} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
