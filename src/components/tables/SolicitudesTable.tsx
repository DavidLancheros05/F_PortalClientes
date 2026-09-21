"use client";

interface Solicitud {
  id: number;
  cliente: string;
  estado: string;
  fechaCreacion: string;
  fechaEstimadaRespuesta: string;
}

interface Props {
  solicitudes: Solicitud[];
}

export function SolicitudesTable({ solicitudes }: Props) {
  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      {/* Vista tabla — visible en sm+ */}
      <table className="w-full border-collapse hidden sm:table">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50">ID</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50">Cliente</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50">Estado</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50">Fecha Creación</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 bg-gray-50">Fecha Estimada</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((s) => (
            <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{s.id}</td>
              <td className="px-3 py-2.5 text-sm text-gray-700">{s.cliente}</td>
              <td className="px-3 py-2.5 text-sm text-gray-700">{s.estado}</td>
              <td className="px-3 py-2.5 text-sm text-gray-500">{s.fechaCreacion}</td>
              <td className="px-3 py-2.5 text-sm text-gray-500">{s.fechaEstimadaRespuesta}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Vista tarjetas — visible en móvil (< sm) */}
      <div className="sm:hidden space-y-2 px-2">
        {solicitudes.map((s) => (
          <div
            key={s.id}
            className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-900">#{s.id}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {s.estado}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-800 truncate">{s.cliente}</p>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Creada: {s.fechaCreacion}</span>
              <span>Estimada: {s.fechaEstimadaRespuesta}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
