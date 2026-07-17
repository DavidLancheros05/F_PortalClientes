"use client";

import { useRouter } from "next/navigation";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import { clientesService } from "@/services/clientes/clientes.service";
import * as XLSX from "xlsx";

import {
  Building,
  FileText,
  MapPin,
  UserPlus,
  Loader2,
  Eye,
  Edit,
  Search,
  RefreshCw,
  AlertCircle,
  Users,
  Download,
} from "lucide-react";
import { ConfirmModal } from "@/components/modals";

const FILTROS_STORAGE_KEY = "parametrizacion:clientes:filtros";

export default function ClientesPage() {
  const router = useRouter();
  const { loading: authLoading } = useContext(AuthContext);
  const [centroSeleccionado, setCentroSeleccionado] = useState<
    number | undefined
  >(undefined);
  const [clientes, setClientes] = useState<any[]>([]);
  const [centros, setCentros] = useState<
    Array<{ cop_id: number; cop_nombre: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInputValue, setSearchInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterNit, setFilterNit] = useState("");
  const [filterDireccion, setFilterDireccion] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [modalOpen, setModalOpen] = useState(false);

  const fetchCentros = async () => {
    try {
      setLoading(true);
      const centrosData = await clientesService.getAllCentrosOperacion();
      setCentros(
        Array.isArray(centrosData)
          ? centrosData.map((c: any) => ({
              cop_id: c.cop_id,
              cop_nombre: c.cop_nombre,
            }))
          : [],
      );
    } catch (err) {
      console.error("Error cargando centros:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientesList = async (centro: number | undefined) => {
    try {
      setLoading(true);
      setError(null);
      const clientesData = centro
        ? await clientesService.getClientesByCentro(centro)
        : await clientesService.getAll();
      setClientes(clientesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    fetchCentros();

    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(FILTROS_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setCentroSeleccionado(saved.centroSeleccionado);
      setSearchInputValue(saved.searchInputValue ?? "");
      setSearchTerm(saved.searchTerm ?? "");
      setFilterNit(saved.filterNit ?? "");
      setFilterDireccion(saved.filterDireccion ?? "");
      setCurrentPage(saved.currentPage ?? 1);
      // Repite la busqueda con los filtros guardados (ej. venimos de editar un
      // cliente) en vez de restaurar la tabla vieja, para no mostrar datos
      // obsoletos ni depender de que la lista cacheada siga siendo valida.
      if (saved.hasSearched) {
        fetchClientesList(saved.centroSeleccionado).then(() =>
          setHasSearched(true),
        );
      }
    } catch {
      // sessionStorage corrupto o no disponible: arranca limpio, sin filtros restaurados.
    }
  }, [authLoading]);

  const skipNextPersistRef = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // La primera pasada (montaje) coincide con el efecto que restaura desde
    // sessionStorage; si escribimos aqui, guardamos los valores por defecto
    // (aun no actualizados) y pisamos lo que se acaba de restaurar.
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    sessionStorage.setItem(
      FILTROS_STORAGE_KEY,
      JSON.stringify({
        centroSeleccionado,
        searchInputValue,
        searchTerm,
        filterNit,
        filterDireccion,
        hasSearched,
        currentPage,
      }),
    );
  }, [
    centroSeleccionado,
    searchInputValue,
    searchTerm,
    filterNit,
    filterDireccion,
    hasSearched,
    currentPage,
  ]);

  const refetch = () => {
    setSearchTerm(searchInputValue);
    handleSearch();
  };

  const handleSearch = async () => {
    await fetchClientesList(centroSeleccionado);
    setHasSearched(true);
    setCurrentPage(1);
  };

  const handleDownloadExcel = () => {
    if (filteredClientes.length === 0) {
      setModalOpen(true);
      return;
    }

    const datos = filteredClientes.map((cliente) => ({
      ID: cliente.cli_id,
      "Razón Social": cliente.cli_razon_social,
      "NIT/Documento": cliente.cli_nro_identificacion,
      Dirección: cliente.cli_direccion || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

    // Ajustar ancho de columnas
    worksheet["!cols"] = [{ wch: 8 }, { wch: 30 }, { wch: 18 }, { wch: 40 }];

    XLSX.writeFile(
      workbook,
      `Clientes_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  // Filtrar clientes
  const filteredClientes = clientes.filter((cliente) => {
    // Filtro por búsqueda (razón social)
    const matchesSearch =
      searchTerm === "" ||
      (cliente.cli_razon_social ?? "").toLowerCase().includes(searchTerm.toLowerCase());

    // Filtro por NIT
    const matchesNit =
      filterNit === "" ||
      (cliente.cli_nro_identificacion ?? "").toLowerCase().includes(filterNit.toLowerCase());

    // Filtro por Dirección
    const matchesDireccion =
      filterDireccion === "" ||
      (cliente.cli_direccion ?? "")
        .toLowerCase()
        .includes(filterDireccion.toLowerCase());

    return matchesSearch && matchesNit && matchesDireccion;
  });

  // Calcular número total de páginas
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const visiblePages = 5; // Máximo de botones de página a mostrar
  let pageStart = Math.max(1, currentPage - Math.floor(visiblePages / 2));
  let pageEnd = Math.min(totalPages, pageStart + visiblePages - 1);
  if (pageEnd - pageStart + 1 < visiblePages) {
    pageStart = Math.max(1, pageEnd - visiblePages + 1);
  }

  // Estadísticas
  const totalClientes = clientes.length;

  if (loading && clientes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
              <p className="text-gray-600 mt-2">
                Gestiona los clientes del sistema
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center h-64 bg-white rounded-2xl shadow-lg">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando clientes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
              <p className="text-gray-600 mt-2">
                Gestiona los clientes del sistema
              </p>
            </div>
          </div>
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
            <div className="flex">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => refetch()}
                  className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Listado de clientes
            </h1>
            <p className="text-gray-600 mt-2">
              Gestiona y administra los clientes del sistema
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => refetch()}
              className="flex items-center px-4 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 shadow border border-gray-200 transition"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Actualizar
            </button>
            <button
              onClick={() => router.push("/parametrizacion/clientes/nuevo")}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Nuevo Cliente
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Filtros de búsqueda
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Centro de Operación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building className="w-4 h-4 inline mr-1" />
                Centro de Operación
              </label>
              <select
                value={centroSeleccionado ?? ""}
                onChange={(e) => {
                  setCentroSeleccionado(
                    e.target.value ? Number(e.target.value) : undefined,
                  );
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los centros</option>
                {centros.map((centro, index) => (
                  <option key={centro.cop_id || `centro-${index}`} value={centro.cop_id}>
                    {centro.cop_nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Búsqueda por Razón Social */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Search className="w-4 h-4 inline mr-1" />
                Razón Social
              </label>
              <input
                type="text"
                placeholder="Ej: Cartonera..."
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro por NIT */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="w-4 h-4 inline mr-1" />
                NIT / Documento
              </label>
              <input
                type="text"
                placeholder="Ej: 123456789..."
                value={filterNit}
                onChange={(e) => setFilterNit(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro por Dirección */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Dirección
              </label>
              <input
                type="text"
                placeholder="Ej: Calle..."
                value={filterDireccion}
                onChange={(e) => setFilterDireccion(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setSearchInputValue("");
                setSearchTerm("");
                setFilterNit("");
                setFilterDireccion("");
                setCentroSeleccionado(undefined);
                setHasSearched(false);
                setCurrentPage(1);
              }}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium"
            >
              Limpiar filtros
            </button>
            {hasSearched && filteredClientes.length > 0 && (
              <button
                onClick={handleDownloadExcel}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center font-medium"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Excel
              </button>
            )}
            <button
              onClick={() => {
                setSearchTerm(searchInputValue);
                handleSearch();
              }}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center font-medium"
            >
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </button>
          </div>
        </div>

        {/* Tabla */}
        {!hasSearched ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Ingresa los criterios de búsqueda
            </h3>
            <p className="text-gray-500">
              Completa los filtros y haz clic en "Buscar" para ver los
              resultados
            </p>
          </div>
        ) : (
          <>
            {filteredClientes.length > 0 && (
              <div className="mb-4 text-sm text-gray-600">
                <span className="font-semibold">Total Clientes:</span>{" "}
                {filteredClientes.length}
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {filteredClientes.length === 0 ? (
                <div className="text-center py-16">
                  <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    {clientes.length === 0
                      ? "No hay clientes registrados"
                      : "No se encontraron resultados"}
                  </h3>
                  <p className="text-gray-500">
                    {clientes.length === 0
                      ? "Comienza creando tu primer cliente"
                      : "Intenta con otros términos de búsqueda"}
                  </p>
                  {clientes.length === 0 && (
                    <button
                      onClick={() =>
                        router.push("/parametrizacion/clientes/nuevo")
                      }
                      className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Crear Primer Cliente
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Cliente
                          </th>
                          <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Documento
                          </th>
                          <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Dirección
                          </th>
                          <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Ejecutivo
                          </th>
                          <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredClientes
                          .slice(
                            (currentPage - 1) * itemsPerPage,
                            currentPage * itemsPerPage,
                          )
                          .map((cliente) => (
                            <tr
                              key={cliente.cli_id}
                              className="hover:bg-gray-50 transition"
                            >
                              <td className="py-4 px-6">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center mr-4">
                                    <Building className="w-5 h-5 text-gray-700" />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {cliente.cli_razon_social}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center">
                                  <FileText className="w-4 h-4 text-gray-400 mr-2" />
                                  <span className="font-mono text-sm">
                                    {cliente.cli_nro_identificacion || "-"}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                                  <span className="text-sm">
                                    {cliente.cli_direccion || "-"}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                {cliente.ejecutivo ? (
                                  <div className="flex items-center">
                                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                                      <Users className="w-4 h-4 text-gray-700" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                      {cliente.ejecutivo.nombre}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400 italic">
                                    Sin asignar
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/parametrizacion/clientes/${cliente.cli_id}`,
                                      )
                                    }
                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                                    title="Ver detalles"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/parametrizacion/clientes/${cliente.cli_id}/editar`,
                                      )
                                    }
                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                                    title="Editar"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginador mejorado */}
                  <div className="border-t border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600 whitespace-nowrap">
                      <span className="font-semibold">
                        {Math.min(
                          (currentPage - 1) * itemsPerPage + 1,
                          filteredClientes.length,
                        )}
                      </span>
                      {" – "}
                      <span className="font-semibold">
                        {Math.min(
                          currentPage * itemsPerPage,
                          filteredClientes.length,
                        )}
                      </span>
                      {" de "}
                      <span className="font-semibold">{filteredClientes.length}</span>
                      {" cliente"}
                      {filteredClientes.length !== 1 ? "s" : ""}
                    </div>

                    <div className="flex gap-2 items-center flex-wrap justify-center">
                      {/* Botón Anterior */}
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white transition text-sm font-medium text-gray-700"
                      >
                        ← Anterior
                      </button>

                      {/* Botones de página */}
                      <div className="flex items-center gap-1">
                        {/* Primera página si no está visible */}
                        {pageStart > 1 && (
                          <>
                            <button
                              onClick={() => setCurrentPage(1)}
                              className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                            >
                              1
                            </button>
                            {pageStart > 2 && (
                              <span className="px-2 text-gray-400">…</span>
                            )}
                          </>
                        )}

                        {/* Páginas visibles */}
                        {Array.from(
                          { length: pageEnd - pageStart + 1 },
                          (_, i) => pageStart + i,
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                              page === currentPage
                                ? "bg-blue-600 text-white shadow-md"
                                : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                        {/* Última página si no está visible */}
                        {pageEnd < totalPages && (
                          <>
                            {pageEnd < totalPages - 1 && (
                              <span className="px-2 text-gray-400">…</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(totalPages)}
                              className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                            >
                              {totalPages}
                            </button>
                          </>
                        )}
                      </div>

                      {/* Botón Siguiente */}
                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white transition text-sm font-medium text-gray-700"
                      >
                        Siguiente →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={modalOpen}
        title="Sin datos para descargar"
        message="No hay clientes para descargar. Por favor, realiza una búsqueda primero."
        confirmText="Aceptar"
        isDangerous={false}
        onConfirm={() => setModalOpen(false)}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}
