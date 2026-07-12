"use client";

import { useRouter } from "next/navigation";

const misPedidos = [
  {
    pedido_id: "PED-20260320-115",
    producto: "Cajas estándar #5",
    cantidad: 500,
    estado: "Entregado",
    fecha_creacion: "2026-03-20",
  },
  {
    pedido_id: "PED-20260322-141",
    producto: "Plancha microcorrugado",
    cantidad: 2400,
    estado: "En producción",
    fecha_creacion: "2026-03-22",
  },
  {
    pedido_id: "PED-20260324-006",
    producto: "Empaque plegadizo premium",
    cantidad: 900,
    estado: "Registrado",
    fecha_creacion: "2026-03-24",
  },
];

export default function MisPedidosPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/pedidos")}
            className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver a pedidos
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Mis pedidos</h1>
          <p className="text-gray-600 mt-2">
            Consulta y seguimiento de los pedidos asociados a tu usuario.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Mis pedidos</h2>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {misPedidos.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Pedido
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Fecha creación
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {misPedidos.map((pedido) => (
                  <tr key={pedido.pedido_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {pedido.pedido_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {pedido.producto}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {pedido.cantidad.toLocaleString("es-CO")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          pedido.estado === "Entregado"
                            ? "bg-green-100 text-green-700"
                            : pedido.estado === "En producción"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {pedido.fecha_creacion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
