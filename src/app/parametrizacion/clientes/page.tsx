"use client";

import { useRouter } from "next/navigation";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import { clientesService } from "@/services/clientes/clientes.service";

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
  ShieldCheck,
} from "lucide-react";
import { ConfirmModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { TableContainer } from "@/components/tables/TableContainer";
import { TablePagination } from "@/components/tables/TablePagination";

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

  const handleDownloadExcel = async () => {
    if (filteredClientes.length === 0) {
      setModalOpen(true);
      return;
    }

    const XLSX = await import("xlsx");

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

  if (loading && clientes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <PageHeaderCard icon={Building} eyebrow="Parametrización" title="Clientes" subtitle="Gestiona los clientes del sistema" />
          <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-200 shadow-lg">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-brand-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando clientes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <PageHeaderCard icon={Building} eyebrow="Parametrización" title="Clientes" subtitle="Gestiona los clientes del sistema" />
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
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
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={Building}
          eyebrow="Parametrización"
          title="Listado de clientes"
          subtitle="Gestiona y administra los clientes del sistema"
          actions={
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 rounded-lg bg-white/14 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
              <button
                onClick={() => router.push("/parametrizacion/clientes/acceso")}
                className="inline-flex items-center gap-2 rounded-lg bg-white/14 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                <ShieldCheck className="w-4 h-4" />
                Gestionar Acceso
              </button>
              <button
                onClick={() => router.push("/parametrizacion/clientes/nuevo")}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
              >
                <UserPlus className="w-4 h-4" />
                Nuevo Cliente
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FilterField label="Centro de Operación">
              <select
                value={centroSeleccionado ?? ""}
                onChange={(e) => {
                  setCentroSeleccionado(
                    e.target.value ? Number(e.target.value) : undefined,
                  );
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los centros</option>
                {centros.map((centro, index) => (
                  <option key={centro.cop_id || `centro-${index}`} value={centro.cop_id}>
                    {centro.cop_nombre}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Razón Social">
              <input
                type="text"
                placeholder="Ej: Cartonera..."
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>

            <FilterField label="NIT / Documento">
              <input
                type="text"
                placeholder="Ej: 123456789..."
                value={filterNit}
                onChange={(e) => setFilterNit(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>

            <FilterField label="Dirección">
              <input
                type="text"
                placeholder="Ej: Calle..."
                value={filterDireccion}
                onChange={(e) => setFilterDireccion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>

            <FilterActions className="col-span-full">
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
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
              >
                Limpiar filtros
              </button>
              <button
                onClick={() => {
                  setSearchTerm(searchInputValue);
                  handleSearch();
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {/* Tabla */}
        {!hasSearched ? (
          <EmptyStateCard
            icon={Search}
            title="Ingresa los criterios de búsqueda"
            subtitle='Completa los filtros y haz clic en "Buscar" para ver los resultados'
          />
        ) : filteredClientes.length === 0 ? (
          <EmptyStateCard
            icon={Building}
            title={
              clientes.length === 0
                ? "No hay clientes registrados"
                : "No se encontraron resultados"
            }
            subtitle={
              clientes.length === 0
                ? "Comienza creando tu primer cliente"
                : "Intenta con otros términos de búsqueda"
            }
            action={
              clientes.length === 0 ? (
                <button
                  onClick={() => router.push("/parametrizacion/clientes/nuevo")}
                  className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
                >
                  Crear Primer Cliente
                </button>
              ) : undefined
            }
          />
        ) : (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <ResultsToolbar
                count={filteredClientes.length}
                label="cliente(s)"
                onExport={handleDownloadExcel}
              />
                  <TableContainer>
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
                                    className="p-2 bg-blue-50 text-brand-600 rounded-lg hover:bg-blue-100 transition"
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
                                    className="p-2 bg-blue-50 text-brand-600 rounded-lg hover:bg-blue-100 transition"
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
                  </TableContainer>

                  <TablePagination
                    page={currentPage}
                    pageSize={itemsPerPage}
                    totalItems={filteredClientes.length}
                    pageSizeOptions={[itemsPerPage]}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={() => {}}
                  />
            </div>
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
