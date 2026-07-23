"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import {
  existenciasService,
  type ExistenciaClienteResponse,
} from "@/services/existencias/existencias.service";

function formatNumero(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "-";
  return valor.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatFecha(valor: string | null | undefined) {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleDateString("es-CO");
}

export default function ExistenciasPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [existencias, setExistencias] = useState<ExistenciaClienteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [filtroItem, setFiltroItem] = useState("");
  const [filtroBodega, setFiltroBodega] = useState("");
  const [filtroUbicacion, setFiltroUbicacion] = useState("");

  useEffect(() => {
    if (!user?.cliente_id) return;

    async function cargarExistencias() {
      try {
        setLoading(true);
        setError(false);
        const data = await existenciasService.getPorCliente(user!.cliente_id!);
        setExistencias(data);
      } catch (err) {
        console.error("Error cargando existencias:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    cargarExistencias();
  }, [user?.cliente_id]);

  const limpiarFiltros = () => {
    setFiltroItem("");
    setFiltroBodega("");
    setFiltroUbicacion("");
  };

  const existenciasFiltradas = useMemo(() => {
    const itemBuscado = filtroItem.trim().toLowerCase();
    const bodegaBuscada = filtroBodega.trim().toLowerCase();
    const ubicacionBuscada = filtroUbicacion.trim().toLowerCase();

    return existencias.filter((existencia) => {
      if (
        itemBuscado &&
        !existencia.item?.toLowerCase().includes(itemBuscado) &&
        !existencia.referencia?.toLowerCase().includes(itemBuscado) &&
        !existencia.descripcionItem?.toLowerCase().includes(itemBuscado)
      ) {
        return false;
      }

      if (
        bodegaBuscada &&
        !existencia.bodega?.toLowerCase().includes(bodegaBuscada)
      ) {
        return false;
      }

      if (
        ubicacionBuscada &&
        !existencia.ubicacion?.toLowerCase().includes(ubicacionBuscada)
      ) {
        return false;
      }

      return true;
    });
  }, [existencias, filtroItem, filtroBodega, filtroUbicacion]);

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
            Existencia a la fecha por bodega
          </h1>
          <p className="text-gray-600 mt-2">
            Consulta el inventario disponible de tus ítems por bodega.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ítem, referencia o descripción
              </label>
              <input
                type="text"
                value={filtroItem}
                onChange={(e) => setFiltroItem(e.target.value)}
                placeholder="Ej: CAJA CJ 3550"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bodega
              </label>
              <input
                type="text"
                value={filtroBodega}
                onChange={(e) => setFiltroBodega(e.target.value)}
                placeholder="Ej: 01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ubicación
              </label>
              <input
                type="text"
                value={filtroUbicacion}
                onChange={(e) => setFiltroUbicacion(e.target.value)}
                placeholder="Ej: A-01-03"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
              Existencia por bodega
            </h2>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {existenciasFiltradas.length} de {existencias.length} registros
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-600">
              Cargando existencias...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              No se pudieron cargar las existencias.
            </div>
          ) : existencias.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No se encontraron existencias.
            </div>
          ) : existenciasFiltradas.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              Ninguna existencia coincide con los filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ítem</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Referencia</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Lote</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Bodega</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ubicación</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Existencia</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Disponible</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Peso</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Volumen</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Fecha lote</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Última entrada</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ejecutivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {existenciasFiltradas.map((existencia, index) => (
                    <tr
                      key={`${existencia.item}-${existencia.lote}-${existencia.bodega}-${index}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {existencia.item}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{existencia.referencia}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{existencia.descripcionItem}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{existencia.cliente}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{existencia.lote || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{existencia.bodega}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{existencia.ubicacion || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(existencia.cantidadExistencia)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(existencia.cantidadDisponible)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(existencia.peso)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(existencia.volumen)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatFecha(existencia.fechaLote)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatFecha(existencia.fechaUltimaEntrada)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{existencia.ejecutivoNegocio || "-"}</td>
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
