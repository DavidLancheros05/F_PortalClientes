"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import {
  carteraService,
  type SaldoClienteResponse,
} from "@/services/cartera/cartera.service";

export default function CarteraPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [saldos, setSaldos] = useState<SaldoClienteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [filtroNumero, setFiltroNumero] = useState("");
  const [soloVencidos, setSoloVencidos] = useState(false);

  useEffect(() => {
    if (!user?.cliente_id) return;

    async function cargarSaldos() {
      try {
        setLoading(true);
        setError(false);
        const data = await carteraService.getPorCliente(user!.cliente_id!);
        setSaldos(data);
      } catch (err) {
        console.error("Error cargando cartera:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    cargarSaldos();
  }, [user?.cliente_id]);

  const limpiarFiltros = () => {
    setFiltroNumero("");
    setSoloVencidos(false);
  };

  const saldosFiltrados = useMemo(() => {
    const numeroBuscado = filtroNumero.trim().toLowerCase();

    return saldos.filter((saldo) => {
      if (
        numeroBuscado &&
        !saldo.numeroDocumento?.toLowerCase().includes(numeroBuscado)
      ) {
        return false;
      }

      if (soloVencidos && saldo.diasVencidos <= 0) {
        return false;
      }

      return true;
    });
  }, [saldos, filtroNumero, soloVencidos]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-full mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/consultas")}
            className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver a consultas
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Resumen de saldos de clientes
          </h1>
          <p className="text-gray-600 mt-2">
            Consulta el estado de cartera de tu cuenta (edades de vencimiento).
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de documento
              </label>
              <input
                type="text"
                value={filtroNumero}
                onChange={(e) => setFiltroNumero(e.target.value)}
                placeholder="Ej: FEV-00098211"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input
                id="solo-vencidos"
                type="checkbox"
                checked={soloVencidos}
                onChange={(e) => setSoloVencidos(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="solo-vencidos" className="text-sm font-medium text-gray-700">
                Solo documentos vencidos
              </label>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={limpiarFiltros}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Saldos de cartera
            </h2>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {saldosFiltrados.length} de {saldos.length} registros
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-600">
              Cargando cartera...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              No se pudo cargar la cartera.
            </div>
          ) : saldos.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No se encontraron saldos pendientes.
            </div>
          ) : saldosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              Ningún documento coincide con los filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Documento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Auxiliar</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Vendedor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">C.O.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cupo de crédito</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Fecha documento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Fecha vencimiento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Plazo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Días vencidos</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Corriente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ven. 1-15</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ven. 16-30</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ven. 31-60</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ven. +60</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {saldosFiltrados.map((saldo, index) => (
                    <tr
                      key={`${saldo.numeroDocumento}-${index}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {saldo.numeroDocumento}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.razonSocialSucursal}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.auxiliar || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.vendedor || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.centroOperacion || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${saldo.cupoCredito || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.fechaDocumento || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.fechaVencimiento || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.plazo ?? "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            saldo.diasVencidos > 60
                              ? "bg-red-100 text-red-700"
                              : saldo.diasVencidos > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {saldo.diasVencidos}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${saldo.totalCorriente}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${saldo.vencido1a15}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${saldo.vencido16a30}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${saldo.vencido31a60}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${saldo.vencidoMas60}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">${saldo.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
