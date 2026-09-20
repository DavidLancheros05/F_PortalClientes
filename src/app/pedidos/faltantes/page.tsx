"use client";

import { useRouter } from "next/navigation";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";

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
                  <Th>Pedido</Th>
                  <Th>Cliente</Th>
                  <Th>Producto</Th>
                  <Th>Cantidad</Th>
                  <Th>Prioridad</Th>
                  <Th>Fecha límite</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pedidosFaltantes.map((pedido) => (
                  <Tr key={pedido.pedido_id}>
                    <Td className="font-medium text-gray-900">
                      {pedido.pedido_id}
                    </Td>
                    <Td>{pedido.cliente}</Td>
                    <Td>{pedido.producto}</Td>
                    <Td>{pedido.cantidad.toLocaleString("es-CO")}</Td>
                    <Td>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          pedido.prioridad === "Alta"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {pedido.prioridad}
                      </span>
                    </Td>
                    <Td>{pedido.fecha_limite}</Td>
                  </Tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
