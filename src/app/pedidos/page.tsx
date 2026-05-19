"use client";

import { useRouter } from "next/navigation";

export default function PedidosPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600 mt-2">
            Gestiona pedidos faltantes y consulta tus pedidos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/pedidos/faltantes")}
            className="text-left bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-amber-300 transition"
          >
            <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
              Submódulo
            </p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              Pedidos faltantes
            </h2>
            <p className="text-gray-600 mt-2 text-sm">
              Revisa pedidos pendientes por completar o gestionar.
            </p>
          </button>

          <button
            onClick={() => router.push("/pedidos/mis-pedidos")}
            className="text-left bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition"
          >
            <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
              Submódulo
            </p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              Mis pedidos
            </h2>
            <p className="text-gray-600 mt-2 text-sm">
              Consulta el historial y estado de tus pedidos.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
