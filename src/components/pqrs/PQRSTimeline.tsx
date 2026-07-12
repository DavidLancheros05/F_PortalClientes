"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";

interface TimelineEvent {
  id: number;
  tipo_evento?: string;
  tipo?: string;
  fecha_evento?: string;
  fecha?: string;
  mensaje?: string;
  description?: string;
  estado_anterior?: string;
  estado_nuevo?: string;
}

interface PQRSTimelineProps {
  eventos: TimelineEvent[];
}

const getIconForEventType = (tipo?: string) => {
  const type = (tipo || "").toLowerCase();
  if (type.includes("cambio") || type.includes("estado"))
    return <CheckCircle className="h-5 w-5 text-blue-500" />;
  if (type.includes("error") || type.includes("rechazo"))
    return <XCircle className="h-5 w-5 text-red-500" />;
  if (type.includes("comentario") || type.includes("respuesta"))
    return <AlertCircle className="h-5 w-5 text-amber-500" />;
  return <Clock className="h-5 w-5 text-gray-500" />;
};

const formatEventDate = (dateString?: string) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return format(date, "PPp", { locale: es });
  } catch {
    return dateString;
  }
};

export function PQRSTimeline({ eventos }: PQRSTimelineProps) {
  if (!eventos || eventos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No hay eventos registrados aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {eventos.map((evento, index) => (
        <div key={evento.id || index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
              {getIconForEventType(evento.tipo_evento || evento.tipo)}
            </div>
            {index < eventos.length - 1 && (
              <div className="w-0.5 h-12 bg-gray-300 mt-2" />
            )}
          </div>

          <div className="flex-1 pb-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900">
                  {evento.tipo_evento || evento.tipo || "Evento"}
                </h4>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                  {formatEventDate(evento.fecha_evento || evento.fecha)}
                </span>
              </div>

              {evento.mensaje && (
                <p className="text-sm text-gray-600 mb-2">{evento.mensaje}</p>
              )}
              {evento.description && (
                <p className="text-sm text-gray-600 mb-2">
                  {evento.description}
                </p>
              )}

              {evento.estado_anterior && evento.estado_nuevo && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <span className="text-gray-600">
                    {evento.estado_anterior}
                  </span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-semibold text-blue-600">
                    {evento.estado_nuevo}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
