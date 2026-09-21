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

// Acortar labels largos del backend
const RESULTADO_LABELS: Record<string, string> = {
  "Solicitud aprobada": "Aprobado",
  "Solicitud rechazada": "Rechazado",
  "Solicitud cancelada": "Cancelado",
  "Solicitud pendiente": "Pendiente",
};

const ESTADO_LABELS: Record<string, string> = {
  "Solicitud aprobada en Auxiliar Servicio Cliente": "Aprobado",
  "Solicitud aprobada en Oficial de Cumplimiento": "Aprobado",
  "Solicitud aprobada en Comité de Crédito 1": "Aprobado",
  "Solicitud aprobada en Comité de Crédito 2": "Aprobado",
  "Solicitud rechazada en Auxiliar Servicio Cliente": "Rechazado",
  "Solicitud rechazada en Oficial de Cumplimiento": "Rechazado",
  "Solicitud rechazada en Comité de Crédito 1": "Rechazado",
  "Solicitud rechazada en Comité de Crédito 2": "Rechazado",
};

function limpiarLabel(nombre?: string, mapa?: Record<string, string>): string | undefined {
  if (!nombre) return undefined;
  if (mapa && mapa[nombre]) return mapa[nombre];
  return nombre;
}

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
          className="flex items-center gap-1 px-3 py-3 bg-white border border-[#e2e8f0] rounded-xl text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="ml-auto w-full max-w-xs bg-white p-6 rounded-2xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-2 mb-6">
        <h2 className="text-[13px] font-extrabold text-[#0f172a]">
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
        <div className="text-center py-8 text-[#94a3b8]">
          <p className="text-[12px]">No hay historial disponible para esta solicitud</p>
        </div>
      ) : (
      <div className="space-y-4 text-xs">
        {historial.map((item, index) => {
          const isLast = index === historial.length - 1;
          const resultadoEraPendiente = Boolean(
            item.resultadoNombre?.toLowerCase().startsWith("pendiente"),
          );
          const esPendiente = isLast && resultadoEraPendiente;
          const fechaMostrada =
            !isLast && resultadoEraPendiente
              ? historial[index + 1]?.fecha || item.fecha
              : item.fecha;

          return (
            <div key={item.historialId || index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-full text-white font-semibold text-xs shadow-sm ${
                    esPendiente ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                >
                  {esPendiente ? "…" : "✓"}
                </div>
                {!isLast && (
                  <div className="w-0.5 h-10 bg-gradient-to-b from-emerald-300 to-gray-200 mt-1" />
                )}
              </div>

              <div className="pt-0.5 flex-1">
                <p className="font-bold text-[#0f172a] text-[12px]">
                  {item.etapaNombre}
                </p>

                {fechaMostrada && (
                  <p className="text-[#64748b] mt-0.5 text-[11px]">
                    {esPendiente ? "Pendiente desde" : "Gestionado"}:{" "}
                    {formatearFecha(fechaMostrada)}
                  </p>
                )}

                {item.fechaEstimadaInicio && (
                  <p className="text-amber-700 mt-0.5 text-[11px]">
                    Fecha estimada desde inicio:{" "}
                    {formatearFecha(item.fechaEstimadaInicio)}
                  </p>
                )}

                {item.fechaEstimadaEtapaAnterior && (
                  <p className="text-amber-700 mt-0.5 text-[11px]">
                    Fecha estimada desde etapa anterior:{" "}
                    {formatearFecha(item.fechaEstimadaEtapaAnterior)}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {item.resultadoNombre && (
                    <span className="font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wide inline-block">
                      {!isLast && resultadoEraPendiente
                        ? "Gestionado"
                        : limpiarLabel(item.resultadoNombre, RESULTADO_LABELS)}
                    </span>
                  )}
                  {item.estadoNombre && (
                    <span className="font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wide inline-block">
                      {limpiarLabel(item.estadoNombre, ESTADO_LABELS)}
                    </span>
                  )}
                </div>

                {item.usuarioNombre && (
                  <p className="text-[#334155] mt-1.5 font-semibold text-[11px]">
                    {item.usuarioNombre}
                  </p>
                )}

                {item.comentario && (
                  <p className="text-[#475569] mt-1.5 whitespace-pre-wrap break-words bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-2 text-[11px] leading-relaxed">
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
