"use client";

import { useState, useEffect, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Eye,
  RefreshCw,
  Search,
  Filter,
  X,
} from "lucide-react";
import { AuthContext } from "@/context/AuthContext";
import { pqrsService } from "@/services/pqrs.service";

interface PQRS {
  pqrs_id: number;
  pqrs_numero: string;
  pqrs_titulo: string;
  pqrs_descripcion?: string;
  pqrs_fecha_creacion: string;
  pqrs_pe_id: number;
  pqrs_pt_id: number;
  tipo?: { pt_id: number; pt_nombre: string };
  estado?: { pe_id: number; pe_nombre: string; pe_color?: string };
}

interface EstadoOption {
  pe_id: number;
  pe_nombre: string;
  pe_color?: string;
}

const ITEMS_PER_PAGE = 10;

export default function MisPQRSPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);

  const [pqrsList, setPqrsList] = useState<PQRS[]>([]);
  const [estados, setEstados] = useState<EstadoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEstados, setSelectedEstados] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadPQRS();
    loadEstados();
  }, [user]);

  const loadPQRS = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const data = await pqrsService.getListado();
      setPqrsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando PQRS:", err);
      setError("No se pudieron cargar las PQRS");
      setPqrsList([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEstados = async () => {
    try {
      const data = await pqrsService.getEstados();
      setEstados(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando estados:", err);
    }
  };

  // Filtrar y buscar
  const filteredPQRS = useMemo(() => {
    return pqrsList.filter((pqrs) => {
      const matchesSearch =
        pqrs.pqrs_numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pqrs.pqrs_titulo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEstado =
        selectedEstados.length === 0 ||
        selectedEstados.includes(pqrs.pqrs_pe_id);

      return matchesSearch && matchesEstado;
    });
  }, [pqrsList, searchTerm, selectedEstados]);

  // Paginación
  const totalPages = Math.ceil(filteredPQRS.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPQRS = filteredPQRS.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-CO");
    } catch {
      return "-";
    }
  };

  const toggleEstadoFilter = (estadoId: number) => {
    setSelectedEstados((prev) =>
      prev.includes(estadoId)
        ? prev.filter((id) => id !== estadoId)
        : [...prev, estadoId],
    );
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedEstados([]);
    setCurrentPage(1);
  };

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <button
                onClick={() => router.push("/pqrs")}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>
              <h1 className="text-3xl font-bold text-blue-800">Mis PQRS</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona tus peticiones, quejas, reclamaciones y sugerencias
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadPQRS}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Actualizar
              </button>
              <button
                onClick={() => router.push("/pqrs/nueva")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nueva PQRS
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <LoadingSkeleton />
          ) : pqrsList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tienes PQRS creadas
              </h3>
              <p className="text-gray-600 mb-6">
                Comienza creando una nueva petición, queja, reclamación o
                sugerencia
              </p>
              <button
                onClick={() => router.push("/pqrs/nueva")}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Crear primera PQRS
              </button>
            </div>
          ) : (
            <>
              {/* Búsqueda y Filtros */}
              <div className="mb-6 space-y-4">
                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por número o asunto..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* Filtros por estado */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filtrar por estado
                    </label>
                    {selectedEstados.length > 0 && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {estados.map((estado) => (
                      <button
                        key={estado.pe_id}
                        onClick={() => toggleEstadoFilter(estado.pe_id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedEstados.includes(estado.pe_id)
                            ? "ring-2 ring-offset-1"
                            : "opacity-70 hover:opacity-100"
                        }`}
                        style={{
                          backgroundColor: estado.pe_color || "#6B7280",
                          color: "white",
                        }}
                      >
                        {estado.pe_nombre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resultado de filtrado */}
                <div className="text-sm text-gray-600">
                  Mostrando{" "}
                  <span className="font-semibold text-gray-900">
                    {paginatedPQRS.length}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold text-gray-900">
                    {filteredPQRS.length}
                  </span>{" "}
                  PQRS
                </div>
              </div>

              {/* Tabla */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Número
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Asunto
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedPQRS.map((pqrs) => (
                        <tr
                          key={pqrs.pqrs_id}
                          className="hover:bg-blue-50/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-blue-600">
                              {pqrs.pqrs_numero}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900 font-medium">
                              {pqrs.pqrs_titulo}
                            </p>
                            {pqrs.pqrs_descripcion && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                                {pqrs.pqrs_descripcion}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700">
                              {pqrs.tipo?.pt_nombre || "-"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className="inline-flex px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                              style={{
                                backgroundColor:
                                  pqrs.estado?.pe_color || "#6B7280",
                              }}
                            >
                              {pqrs.estado?.pe_nombre || "Desconocido"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">
                              {formatDate(pqrs.pqrs_fecha_creacion)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() =>
                                router.push(`/pqrs/${pqrs.pqrs_id}`)
                              }
                              className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 transition-all hover:shadow-md"
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer con info */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Total:{" "}
                    <span className="font-semibold">{pqrsList.length}</span>{" "}
                    PQRS
                  </p>
                  <p className="text-xs text-gray-500">
                    Página {currentPage} de {totalPages || 1}
                  </p>
                </div>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>

                  <div className="flex gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      const isNearCurrent =
                        Math.abs(pageNum - currentPage) <= 1;
                      const isFirst = pageNum === 1;
                      const isLast = pageNum === totalPages;

                      if (!isFirst && !isLast && !isNearCurrent) {
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return (
                            <span
                              key={pageNum}
                              className="px-2 py-2 text-gray-400"
                            >
                              ...
                            </span>
                          );
                        }
                        return null;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? "bg-blue-600 text-white"
                              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
