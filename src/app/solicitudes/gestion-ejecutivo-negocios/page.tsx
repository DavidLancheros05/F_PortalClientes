"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import {
  centrosOperacionService,
  type CentroOperacion,
} from "@/services/centros-operacion/centros-operacion.service";
import { ESTADOS, getEstadoBadgeClass } from "@/lib/workflow-labels";
import { formatDate, formatDateTime } from "@/lib/date-utils";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Eye, FileText, PackageOpen, Search, X } from "lucide-react";
import { LoadingModal } from "@/components/modals";
import { TablePagination } from "@/components/tables/TablePagination";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { TableContainer } from "@/components/tables/TableContainer";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import {
  calcularDiasRestantes,
  DiasRestantesBadge,
} from "@/components/badges/DiasRestantesBadge";

interface Solicitud {
  sol_id: number;
  sol_numero_solicitud: string;
  cliente_nombre: string;
  co_id: number;
  centro_operacion_nombre: string;
  fecha_creacion: string;
  fecha_envio?: string | null;
  fecha_estimada_respuesta?: string | null;
  sol_estado_id: number;
  sol_etapa_actual_id?: number;
  sol_resultado_etapa_id?: number;
  etapa_nombre?: string;
  resultado_nombre?: string;
  consumo_mensual_proyectado: number | null;
  observacionesComercial: string | null;
  ejecutivo_nombre: string;
  sol_fecha_real_ejecutivo?: string | null;
  // Fallback fields for compatibility
  sa_sol_id?: number;
  numero_solicitud?: string;
  estado_id?: number;
}

interface SolicitudDetalle extends Solicitud {
  nuevoConsumo?: number;
  nuevasObservaciones?: string;
  guardando?: boolean;
}

export default function ConceptoEjecutivoPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [centros, setCentros] = useState<CentroOperacion[]>([]);
  // Filtros inicializados desde la URL (?centro=&buscar=&desde=&hasta=) para
  // que "Volver" desde /registrar restaure la búsqueda en vez de reiniciar
  // el formulario — antes todo esto vivía solo en useState local, que se
  // perdía al desmontar/remontar la página (ver mismo patrón en
  // gestion-auxiliar-servicio-al-cliente/page.tsx).
  const [centroFiltro, setCentroFiltro] = useState<number | null>(() => {
    const v = searchParams.get("centro");
    return v ? Number(v) : null;
  });
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get("buscar") || "",
  );
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("buscar") || "",
  );
  const [hasSearched, setHasSearched] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(
    () => searchParams.get("desde") || "",
  );
  const [fechaFin, setFechaFin] = useState(
    () => searchParams.get("hasta") || "",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const autoBuscoRef = useRef(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    async function cargarCentros() {
      try {
        const data = await centrosOperacionService.getAll();
        setCentros(data);
      } catch (error) {
        console.error("Error cargando centros:", error);
      }
    }

    cargarCentros();
  }, []);

  const solicitudesFiltradas = useMemo(
    () =>
      solicitudes.filter((solicitud) => {
        // Solo mostrar solicitudes con estado "Pendiente" (estado_id = 2)
        if ((solicitud.sol_estado_id ?? solicitud.estado_id) !== 2)
          return false;

        const matchCentro = !centroFiltro || solicitud.co_id === centroFiltro;
        const term = searchTerm.toLowerCase();
        const matchSearch =
          (solicitud.sol_numero_solicitud || solicitud.numero_solicitud)
            ?.toLowerCase()
            .includes(term) ||
          solicitud.cliente_nombre?.toLowerCase().includes(term) ||
          solicitud.centro_operacion_nombre?.toLowerCase().includes(term);

        let matchFecha = true;
        if (fechaInicio || fechaFin) {
          const fechaCreacion = new Date(solicitud.fecha_creacion);
          if (fechaInicio) {
            const inicio = new Date(fechaInicio);
            matchFecha = matchFecha && fechaCreacion >= inicio;
          }
          if (fechaFin) {
            const fin = new Date(fechaFin);
            fin.setHours(23, 59, 59, 999);
            matchFecha = matchFecha && fechaCreacion <= fin;
          }
        }

        return matchCentro && matchSearch && matchFecha;
      }),
    [solicitudes, centroFiltro, searchTerm, fechaInicio, fechaFin],
  );

  // La página se reinicia cuando cambian los filtros o llega una nueva
  // búsqueda — evita quedar en una página que ya no existe.
  useEffect(() => {
    setPage(1);
  }, [centroFiltro, searchTerm, fechaInicio, fechaFin, solicitudes]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return solicitudesFiltradas.slice(start, start + pageSize);
  }, [solicitudesFiltradas, page, pageSize]);

  async function exportarExcel() {
    if (solicitudesFiltradas.length === 0) return;

    const XLSX = await import("xlsx");
    const header = [
      "No. solicitud",
      "Centro de operación",
      "Cliente",
      "Estado",
      "Fecha diligenciamiento",
      "Fecha de envío",
      "Fecha estimada respuesta",
      "Días faltantes",
    ];
    const data = solicitudesFiltradas.map((s) => {
      const diasRestantes = s.fecha_estimada_respuesta
        ? calcularDiasRestantes(s.fecha_estimada_respuesta)
        : null;
      return [
        s.sol_numero_solicitud || s.numero_solicitud || "-",
        s.centro_operacion_nombre || "-",
        s.cliente_nombre || "-",
        ESTADOS[s.sol_estado_id ?? s.estado_id] || "Desconocido",
        formatDateTime(s.fecha_creacion),
        formatDateTime(s.fecha_envio),
        formatDate(s.fecha_estimada_respuesta),
        diasRestantes !== null ? diasRestantes : "-",
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pendientes EJN");
    XLSX.writeFile(
      wb,
      `solicitudes-pendientes-ejn-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  const canSearch = true;

  // Refleja los filtros actuales en la URL (sin agregar entradas al
  // historial) para que "Volver" desde /registrar los pueda restaurar.
  function sincronizarUrl(filtros: {
    centro: number | null;
    buscar: string;
    desde: string;
    hasta: string;
  }) {
    const params = new URLSearchParams();
    params.set("buscado", "1");
    if (filtros.centro) params.set("centro", String(filtros.centro));
    if (filtros.buscar.trim()) params.set("buscar", filtros.buscar.trim());
    if (filtros.desde) params.set("desde", filtros.desde);
    if (filtros.hasta) params.set("hasta", filtros.hasta);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function limpiarFiltros() {
    setCentroFiltro(null);
    setSearchInput("");
    setSearchTerm("");
    setFechaInicio("");
    setFechaFin("");
    setHasSearched(false);
    router.replace(pathname);
  }

  async function handleBuscar() {
    // console.log(
    //   "🚀 handleBuscar Buscando solicitudes pendientes del ejecutivo con filtros...",
    // );
    try {
      if (!user?.usr_id) {
        alert("No hay usuario autenticado");
        return;
      }
      setLoading(true);
      console.log("user.usr_id: ", user.usr_id);
      const data = await solicitudesService.getForEjecutivo(user.usr_id);
      console.log(
        "📊 Resultado de búsqueda del ejecutivo de negocios desde Nest David:",
        data,
      );
      setSolicitudes(
        data.map((s: any) => ({
          ...s,
          co_id: s.sol_co_id ?? s.co_id,
          cliente_id: s.sol_cliente_id ?? s.cliente_id,
          fecha_creacion: s.fecha_creacion ?? s.sol_fecha_creacion ?? null,
          fecha_envio: s.fecha_envio ?? s.sol_fecha_envio ?? null,
          fecha_estimada_respuesta:
            s.fecha_estimada_respuesta ??
            (s as any).fecha_estimada_respuesta_comercial ??
            (s as any).sol_fecha_estimada_ejecutivo ??
            null,
          nuevoConsumo: s.consumo_mensual_proyectado ?? undefined,
          nuevasObservaciones: s.observacionesComercial ?? "",
        })),
      );
      setSearchTerm(searchInput.trim());
      setHasSearched(true);
      sincronizarUrl({
        centro: centroFiltro,
        buscar: searchInput,
        desde: fechaInicio,
        hasta: fechaFin,
      });
    } catch (error) {
      // console.error("Error buscando solicitudes:", error);
      alert("Error al buscar solicitudes");
    } finally {
      setLoading(false);
    }
  }

  // Si se vuelve desde /registrar con una búsqueda ya hecha (marcador
  // "buscado=1" en la URL), repetirla automáticamente para restaurar la
  // tabla en vez de dejarla vacía pidiendo buscar de nuevo.
  useEffect(() => {
    if (autoBuscoRef.current) return;
    if (searchParams.get("buscado") !== "1") return;
    if (!user?.usr_id) return;
    autoBuscoRef.current = true;
    handleBuscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f8fc,#eef1f7)] p-4 sm:p-6 lg:p-8">
      <LoadingModal isOpen={loading} message="Cargando solicitudes..." />
      <div className="max-w-[115rem] mx-auto">
        <PageHeaderCard
          icon={FileText}
          eyebrow="Solicitudes"
          title="Pendientes — Concepto Ejecutivo de Negocios"
          // TODO: "/solicitudes" no tiene page.tsx propio -> 404. Pendiente decidir destino real.
          onBack={() => router.push("/solicitudes")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Centro de operación
              </label>
              <select
                value={centroFiltro ?? ""}
                onChange={(event) =>
                  setCentroFiltro(
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {centros.map((item, index) => (
                  <option
                    key={item.cop_id || index}
                    value={String(item.cop_id)}
                  >
                    {item.cop_nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Buscar
              </label>
              <input
                type="text"
                placeholder="No. solicitud, cliente o centro"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Fecha inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(event) => setFechaInicio(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Fecha fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(event) => setFechaFin(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end justify-end gap-2">
              <button
                onClick={limpiarFiltros}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
              >
                <X className="h-4 w-4" />
                Limpiar
              </button>
              <button
                onClick={handleBuscar}
                disabled={!canSearch}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </div>
          </div>
        </PageHeaderCard>

        {!hasSearched ? (
          <EmptyStateCard
            icon={PackageOpen}
            title="Presiona Buscar para cargar tus solicitudes pendientes."
            subtitle="Opcionalmente puedes filtrar por centro, fecha o número de solicitud."
          />
        ) : solicitudesFiltradas.length === 0 ? (
          <EmptyStateCard
            icon={PackageOpen}
            title="No se encontraron solicitudes."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <ResultsToolbar
                count={solicitudesFiltradas.length}
                onExport={exportarExcel}
              />

              <TableContainer>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        No. solicitud
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Centro de operación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Fecha diligenciamiento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Fecha de envío
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Ver formulario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Fecha estimada respuesta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Días faltantes
                      </th>
                      <th className="sticky right-0 z-10 bg-gray-50 px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {paginatedRows.map((solicitud) => {
                      return (
                          <tr
                            key={solicitud.sol_id ?? solicitud.sa_sol_id}
                            className="group hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700">
                              {solicitud.sol_numero_solicitud ||
                                solicitud.numero_solicitud}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {solicitud.centro_operacion_nombre}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {solicitud.cliente_nombre}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadgeClass(
                                  solicitud.sol_estado_id ??
                                    solicitud.estado_id,
                                )}`}
                              >
                                {ESTADOS[
                                  solicitud.sol_estado_id ?? solicitud.estado_id
                                ] || "Desconocido"}
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDateTime(solicitud.fecha_creacion)}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDateTime(solicitud.fecha_envio)}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/solicitudes/${solicitud.sol_id ?? solicitud.sa_sol_id}`,
                                  )
                                }
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <Eye className="h-4 w-4" />
                                Ver
                              </button>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDate(solicitud.fecha_estimada_respuesta)}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              <DiasRestantesBadge
                                fecha={solicitud.fecha_estimada_respuesta}
                              />
                            </td>

                            <td className="sticky right-0 z-10 bg-white group-hover:bg-gray-50 px-6 py-4 whitespace-nowrap text-sm font-medium text-right shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/solicitudes/gestion-ejecutivo-negocios/${solicitud.sol_id ?? solicitud.sa_sol_id}/registrar`,
                                  )
                                }
                                className="px-4 py-2 bg-[#003d99] text-white rounded-lg hover:bg-[#0047b3] transition-colors text-sm font-medium"
                              >
                                Registrar Concepto
                              </button>
                            </td>
                          </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </TableContainer>

              <TablePagination
                page={page}
                pageSize={pageSize}
                totalItems={solicitudesFiltradas.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>
  );
}
