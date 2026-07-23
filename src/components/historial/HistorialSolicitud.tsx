"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HistorialItem {
  historialId: number;
  etapaNombre: string;
  resultadoNombre?: string;
  estadoNombre?: string;
  fecha: string;
  fechaEstimadaInicio?: string | null;
  fechaEstimadaEtapaAnterior?: string | null;
  usuarioNombre?: string;
  comentario?: string;
}

interface HistorialSolicitudProps {
  historial: HistorialItem[];
}

const formatearFecha = (fecha?: string): string => {
  if (!fecha) return "No disponible";
  try {
    const date = new Date(fecha);
    const fechaFormato = date.toLocaleDateString("es-CO", {
      month: "short",
      day: "numeric",
    });
    const horaFormato = date.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${fechaFormato} ${horaFormato}`;
  } catch {
    return "No disponible";
  }
};

export default function HistorialSolicitud({
  historial = [],
}: HistorialSolicitudProps) {
  const [colapsado, setColapsado] = useState(false);

  if (colapsado) {
    return (
      <div className="ml-auto">
        <button
          type="button"
          onClick={() => setColapsado(false)}
          title="Mostrar historial de solicitud"
          className="flex items-center gap-1 px-2 py-3 bg-white border border-gray-200 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="ml-auto w-full max-w-xs bg-gradient-to-br from-gray-50/50 to-blue-50/30 p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between gap-2 mb-6">
        <h2 className="text-sm font-bold text-gray-900">
          Historial de Solicitud
        </h2>
        <button
          type="button"
          onClick={() => setColapsado(true)}
          title="Ocultar historial de solicitud"
          className="flex-shrink-0 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {historial.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No hay historial disponible para esta solicitud</p>
        </div>
      ) : (
      <div className="space-y-4 text-xs">
        {historial.map((item, index) => {
          const isLast = index === historial.length - 1;
          const resultadoEraPendiente = Boolean(
            item.resultadoNombre?.toLowerCase().startsWith("pendiente"),
          );
          // Una fila solo puede seguir "pendiente" si es la última del
          // historial (la etapa donde está la solicitud ahora mismo). Si
          // existe una fila posterior, esta etapa ya quedó resuelta —
          // aunque su propio resultado se haya grabado como "Pendiente" en
          // el momento en que la solicitud ENTRÓ a esa etapa (así se
          // registra cada transición: al entrar, no al salir).
          const esPendiente = isLast && resultadoEraPendiente;
          // Para una etapa ya resuelta, la fecha real de gestión es cuando
          // se disparó la siguiente transición (la fecha de la fila
          // siguiente), no la fecha de esta fila (que es cuándo entró a
          // la etapa, no cuándo la resolvió).
          const fechaMostrada =
            !isLast && resultadoEraPendiente
              ? historial[index + 1]?.fecha || item.fecha
              : item.fecha;

          return (
            <div key={item.historialId || index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-full text-white font-semibold text-xs ${
                    esPendiente ? "bg-amber-500" : "bg-green-600"
                  }`}
                >
                  {esPendiente ? "…" : "✓"}
                </div>
                {!isLast && (
                  <div className="w-0.5 h-10 bg-gradient-to-b from-green-300 to-gray-300 mt-1" />
                )}
              </div>

              <div className="pt-0.5 flex-1">
                <p className="font-semibold text-gray-900">
                  {item.etapaNombre}
                </p>

                {fechaMostrada && (
                  <p className="text-gray-600 mt-0.5">
                    {esPendiente ? "Pendiente desde" : "Gestionado"}:{" "}
                    {formatearFecha(fechaMostrada)}
                  </p>
                )}

                {item.fechaEstimadaInicio && (
                  <p className="text-amber-700 mt-0.5">
                    Fecha estimada desde inicio:{" "}
                    {formatearFecha(item.fechaEstimadaInicio)}
                  </p>
                )}

                {item.fechaEstimadaEtapaAnterior && (
                  <p className="text-amber-700 mt-0.5">
                    Fecha estimada desde etapa anterior:{" "}
                    {formatearFecha(item.fechaEstimadaEtapaAnterior)}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-1.5">
                  {item.resultadoNombre && (
                    <span className="font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded inline-block">
                      {item.resultadoNombre}
                    </span>
                  )}
                  {item.estadoNombre && (
                    <span className="font-semibold bg-purple-50 text-purple-600 px-2 py-1 rounded inline-block">
                      {item.estadoNombre}
                    </span>
                  )}
                </div>

                {item.usuarioNombre && (
                  <p className="text-gray-700 mt-1.5 font-medium">
                    {item.usuarioNombre}
                  </p>
                )}

                {item.comentario && (
                  <p className="text-gray-600 mt-1.5 whitespace-pre-wrap break-words bg-white/70 border border-gray-200 rounded px-2 py-1.5">
                    {item.comentario}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
