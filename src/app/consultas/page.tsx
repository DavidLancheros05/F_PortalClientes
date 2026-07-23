"use client";

import { useRouter } from "next/navigation";

export default function ConsultasPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Consultas</h1>
          <p className="text-gray-600 mt-2">
            Consulta información comercial asociada a tu cuenta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/consultas/remisiones")}
            className="text-left bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition"
          >
            <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
              Submódulo
            </p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              Remisiones y devoluciones
            </h2>
            <p className="text-gray-600 mt-2 text-sm">
              Consulta el historial de remisiones y devoluciones asociadas a tu cuenta.
            </p>
          </button>

          <button
            onClick={() => router.push("/consultas/facturas")}
            className="text-left bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition"
          >
            <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
              Submódulo
            </p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              Facturas y notas
            </h2>
            <p className="text-gray-600 mt-2 text-sm">
              Consulta el historial de facturas y notas asociadas a tu cuenta.
            </p>
          </button>

          <button
            onClick={() => router.push("/consultas/existencias")}
            className="text-left bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition"
          >
            <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
              Submódulo
            </p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              Existencia por bodega
            </h2>
            <p className="text-gray-600 mt-2 text-sm">
              Consulta el inventario disponible de tus ítems a la fecha, por bodega.
            </p>
          </button>

          <button
            onClick={() => router.push("/consultas/cartera")}
            className="text-left bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition"
          >
            <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
              Submódulo
            </p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              Resumen de saldos
            </h2>
            <p className="text-gray-600 mt-2 text-sm">
              Consulta el estado de cartera de tu cuenta (edades de vencimiento).
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
