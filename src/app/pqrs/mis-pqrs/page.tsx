"use client";

import { useState, useEffect, useContext, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Plus,
  Eye,
  RefreshCw,
  Search,
  Filter,
  ClipboardList,
  X,
} from "lucide-react";
import { AuthContext } from "@/context/AuthContext";
import { pqrsService } from "@/services/pqrs.service";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { SuggestField } from "@/components/filters/SuggestField";
import { FilterActions } from "@/components/filters/FilterActions";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useContext(AuthContext);

  const [pqrsList, setPqrsList] = useState<PQRS[]>([]);
  const [estados, setEstados] = useState<EstadoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Filtros, página y "hasSearched" inicializados desde la URL
  // (?buscar=&estados=&pagina=&buscado=) para que "Ver detalle" y volver
  // restaure la búsqueda en vez de reiniciarla — mismo patrón que las
  // páginas de gestión de solicitudes.
  const [hasSearched, setHasSearched] = useState(
    () => searchParams.get("buscado") === "1",
  );

  // Filtros y búsqueda — searchTermInput es lo que se escribe, searchTerm es
  // lo aplicado (solo cambia al presionar Buscar/Limpiar).
  const [searchTermInput, setSearchTermInput] = useState(
    () => searchParams.get("buscar") || "",
  );
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("buscar") || "",
  );
  const [selectedEstados, setSelectedEstados] = useState<number[]>(() => {
    const raw = searchParams.get("estados");
    if (!raw) return [];
    return raw
      .split(",")
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id));
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const v = searchParams.get("pagina");
    return v ? Number(v) : 1;
  });

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

  // Pool crudo de sugerencias — combina número y asunto, ya que el campo
  // único de búsqueda filtra por ambas columnas a la vez.
  const searchSugerencias = useMemo(
    () => [
      ...pqrsList.map((p) => p.pqrs_numero ?? ""),
      ...pqrsList.map((p) => p.pqrs_titulo ?? ""),
    ],
    [pqrsList],
  );

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

  // Refleja los filtros/página actuales en la URL (sin agregar entradas al
  // historial) para que "Ver detalle" los pueda restaurar al volver.
  const sincronizarUrl = (overrides: {
    buscar?: string;
    estados?: number[];
    pagina?: number;
    buscado?: boolean;
  }) => {
    const params = new URLSearchParams();
    const buscado = overrides.buscado ?? hasSearched;
    if (buscado) params.set("buscado", "1");
    const buscar = overrides.buscar ?? searchTerm;
    if (buscar.trim()) params.set("buscar", buscar.trim());
    const estadosIds = overrides.estados ?? selectedEstados;
    if (estadosIds.length > 0) params.set("estados", estadosIds.join(","));
    const pagina = overrides.pagina ?? currentPage;
    params.set("pagina", String(pagina));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const toggleEstadoFilter = (estadoId: number) => {
    const nuevosEstados = selectedEstados.includes(estadoId)
      ? selectedEstados.filter((id) => id !== estadoId)
      : [...selectedEstados, estadoId];
    setSelectedEstados(nuevosEstados);
    setHasSearched(true);
    setCurrentPage(1);
    sincronizarUrl({ estados: nuevosEstados, pagina: 1, buscado: true });
  };

  const handleBuscar = () => {
    setSearchTerm(searchTermInput);
    setHasSearched(true);
    setCurrentPage(1);
    sincronizarUrl({ buscar: searchTermInput, pagina: 1, buscado: true });
  };

  const clearFilters = () => {
    setSearchTermInput("");
    setSearchTerm("");
    setHasSearched(false);
    setSelectedEstados([]);
    setCurrentPage(1);
    router.replace(pathname);
  };

  const irAPagina = (page: number) => {
    setCurrentPage(page);
    sincronizarUrl({ pagina: page });
  };

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={ClipboardList}
          eyebrow="PQRS"
          title="Mis PQRS"
          subtitle="Gestiona tus peticiones, quejas, reclamaciones y sugerencias"
          onBack={() => router.push("/pqrs")}
          actions={
            <div className="flex gap-2">
              <button
                onClick={loadPQRS}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-white/14 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Actualizar
              </button>
              <button
                onClick={() => router.push("/pqrs/nueva")}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
              >
                <Plus className="h-4 w-4" />
                Nueva PQRS
              </button>
            </div>
          }
        >
          {!(loading || pqrsList.length === 0) && (
            <div className="space-y-4">
              <SuggestField
                label="Buscar por número o asunto"
                placeholder="Buscar por número o asunto..."
                value={searchTermInput}
                onChange={setSearchTermInput}
                suggestions={searchSugerencias}
                onEnter={handleBuscar}
              />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtrar por estado
                </label>
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

              <FilterActions>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </button>
                <button
                  onClick={handleBuscar}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
              </FilterActions>
            </div>
          )}
        </PageHeaderCard>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <LoadingSkeleton />
          ) : pqrsList.length === 0 ? (
            <EmptyStateCard
              icon={ClipboardList}
              title="No tienes PQRS creadas"
              subtitle="Comienza creando una nueva petición, queja, reclamación o sugerencia"
              action={
                <button
                  onClick={() => router.push("/pqrs/nueva")}
                  className="px-6 py-2 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors"
                >
                  Crear primera PQRS
                </button>
              }
            />
          ) : !hasSearched ? (
            <EmptyStateCard
              icon={Search}
              title="Presiona Buscar para ver tus PQRS"
              subtitle="Opcionalmente puedes filtrar antes de buscar."
            />
          ) : (
            <>
              <div className="text-sm text-gray-600 mb-3">
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

              {/* Tabla */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <Th>Número</Th>
                        <Th>Asunto</Th>
                        <Th>Tipo</Th>
                        <Th>Estado</Th>
                        <Th>Fecha</Th>
                        <Th align="center" sticky>
                          Acción
                        </Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedPQRS.map((pqrs) => (
                        <Tr key={pqrs.pqrs_id}>
                          <Td>
                            <span className="text-sm font-semibold text-brand-600">
                              {pqrs.pqrs_numero}
                            </span>
                          </Td>
                          <Td>
                            <p className="text-sm text-gray-900 font-medium">
                              {pqrs.pqrs_titulo}
                            </p>
                            {pqrs.pqrs_descripcion && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                                {pqrs.pqrs_descripcion}
                              </p>
                            )}
                          </Td>
                          <Td>
                            <span className="text-sm text-gray-700">
                              {pqrs.tipo?.pt_nombre || "-"}
                            </span>
                          </Td>
                          <Td>
                            <span
                              className="inline-flex px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                              style={{
                                backgroundColor:
                                  pqrs.estado?.pe_color || "#6B7280",
                              }}
                            >
                              {pqrs.estado?.pe_nombre || "Desconocido"}
                            </span>
                          </Td>
                          <Td>
                            <span className="text-sm text-gray-600">
                              {formatDate(pqrs.pqrs_fecha_creacion)}
                            </span>
                          </Td>
                          <Td align="center" sticky>
                            <button
                              onClick={() =>
                                router.push(`/pqrs/${pqrs.pqrs_id}`)
                              }
                              className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 p-2 text-brand-600 hover:bg-blue-100 transition-all hover:shadow-md"
                              title="Ver detalle"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </Td>
                        </Tr>
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
                    onClick={() => irAPagina(Math.max(1, currentPage - 1))}
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
                          onClick={() => irAPagina(pageNum)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? "bg-brand-600 text-white"
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
                      irAPagina(Math.min(totalPages, currentPage + 1))
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
  );
}
