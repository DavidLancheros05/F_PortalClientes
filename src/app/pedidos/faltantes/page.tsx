"use client";

import { useRouter } from "next/navigation";

const pedidosFaltantes = [
  {
    pedido_id: "PED-20260324-001",
    cliente: "Alimentos Andinos S.A.",
    producto: "Cartón corrugado 200x300",
    cantidad: 1200,
    prioridad: "Alta",
    fecha_limite: "2026-03-26",
  },
  {
    pedido_id: "PED-20260324-004",
    cliente: "Empaques del Valle",
    producto: "Lámina kraft 1.2mm",
    cantidad: 850,
    prioridad: "Media",
    fecha_limite: "2026-03-29",
  },
  {
    pedido_id: "PED-20260323-019",
    cliente: "Distribuciones Norte",
    producto: "Cajas troqueladas #7",
    cantidad: 3000,
    prioridad: "Alta",
    fecha_limite: "2026-03-27",
  },
];

export default function PedidosFaltantesPage() {
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
          <h1 className="text-3xl font-bold text-gray-900">
            Pedidos faltantes
          </h1>
          <p className="text-gray-600 mt-2">
            Visualiza los pedidos pendientes por atender.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pendientes</h2>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              {pedidosFaltantes.length} pedidos
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
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Prioridad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase">
                    Fecha límite
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pedidosFaltantes.map((pedido) => (
                  <tr key={pedido.pedido_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {pedido.pedido_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{pedido.cliente}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{pedido.producto}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{pedido.cantidad.toLocaleString("es-CO")}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          pedido.prioridad === "Alta"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {pedido.prioridad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{pedido.fecha_limite}</td>
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
