"use client";

interface HistorialItem {
  historialId: number;
  etapaNombre: string;
  resultadoNombre?: string;
  estadoNombre?: string;
  fecha: string;
  usuarioNombre?: string;
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
  return (
    <div className="bg-gradient-to-br from-gray-50/50 to-blue-50/30 p-6 rounded-lg border border-gray-200">
      <h2 className="text-sm font-bold text-gray-900 mb-6">
        Historial de Solicitud
      </h2>

      {historial.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No hay historial disponible para esta solicitud</p>
        </div>
      ) : (
      <div className="space-y-4 text-xs">
        {historial.map((item, index) => {
          const isLast = index === historial.length - 1;

          return (
            <div key={item.historialId || index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-600 text-white font-semibold text-xs">
                  ✓
                </div>
                {!isLast && (
                  <div className="w-0.5 h-10 bg-gradient-to-b from-green-300 to-gray-300 mt-1" />
                )}
              </div>

              <div className="pt-0.5 flex-1">
                <p className="font-semibold text-gray-900">
                  {item.etapaNombre}
                </p>

                {item.fecha && (
                  <p className="text-gray-600 mt-0.5">
                    {formatearFecha(item.fecha)}
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
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
