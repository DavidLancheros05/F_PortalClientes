"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import {
  centrosOperacionService,
  type CentroOperacion,
} from "@/services/centros-operacion/centros-operacion.service";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Check, Eye, FileX, Info, Search, X } from "lucide-react";
import { LoadingModal, InfoModal } from "@/components/modals";
import { TablePagination } from "@/components/tables/TablePagination";
import { ExportExcelButton } from "@/components/tables/ExportExcelButton";

interface SolicitudRechazada {
  sol_id: number;
  sol_numero_solicitud: string;
  sol_co_id: number;
  sol_fecha_creacion: string;
  sol_gestion_rechazo_finalizada: boolean;
  cliente_nombre: string;
  centro_operacion_nombre: string;
  motivo_rechazo: string | null;
  etapa_rechazo_codigo: string | null;
  etapa_rechazo_nombre: string | null;
  usuario_rechazo_nombre: string | null;
  fecha_rechazo: string | null;
  comentario_rechazo: string | null;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function SolicitudesRechazadasEjecutivoPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudRechazada[]>([]);
  const [loading, setLoading] = useState(false);
  const [centros, setCentros] = useState<CentroOperacion[]>([]);
  // Filtros inicializados desde la URL — mismo patrón que
  // gestion-ejecutivo-negocios/page.tsx, para que "Volver" desde el detalle
  // restaure la búsqueda en vez de reiniciar el formulario.
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showInfoModal, setShowInfoModal] = useState(false);

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
        const matchCentro = !centroFiltro || solicitud.sol_co_id === centroFiltro;
        const term = searchTerm.toLowerCase();
        const matchSearch =
          solicitud.sol_numero_solicitud?.toLowerCase().includes(term) ||
          solicitud.cliente_nombre?.toLowerCase().includes(term) ||
          solicitud.centro_operacion_nombre?.toLowerCase().includes(term);

        return matchCentro && matchSearch;
      }),
    [solicitudes, centroFiltro, searchTerm],
  );

  // La página se reinicia cuando cambia el filtro de centro o el resultado
  // de una nueva búsqueda — evita quedar en una página que ya no existe.
  useEffect(() => {
    setPage(1);
  }, [centroFiltro, searchTerm, solicitudes]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return solicitudesFiltradas.slice(start, start + pageSize);
  }, [solicitudesFiltradas, page, pageSize]);

  // Refleja los filtros actuales en la URL (sin agregar entradas al
  // historial) para que "Volver" desde el detalle los pueda restaurar.
  function sincronizarUrl(filtros: { centro: number | null; buscar: string }) {
    const params = new URLSearchParams();
    params.set("buscado", "1");
    if (filtros.centro) params.set("centro", String(filtros.centro));
    if (filtros.buscar.trim()) params.set("buscar", filtros.buscar.trim());
    router.replace(`${pathname}?${params.toString()}`);
  }

  function limpiarFiltros() {
    setCentroFiltro(null);
    setSearchInput("");
    setSearchTerm("");
    setHasSearched(false);
    setSolicitudes([]);
    router.replace(pathname);
  }

  async function handleBuscar() {
    try {
      if (!user?.usr_id) {
        alert("No hay usuario autenticado");
        return;
      }
      setLoading(true);
      const data = await solicitudesService.getRechazadasParaEjecutivo(
        user.usr_id,
      );
      setSolicitudes(data);
      setSearchTerm(searchInput.trim());
      setHasSearched(true);
      sincronizarUrl({ centro: centroFiltro, buscar: searchInput });
    } catch (error) {
      alert("Error al buscar solicitudes");
    } finally {
      setLoading(false);
    }
  }

  async function exportarExcel() {
    if (solicitudesFiltradas.length === 0) return;

    const XLSX = await import("xlsx");

    const header = [
      "Centro de operación",
      "No. solicitud",
      "Cliente",
      "Rechazado en",
      "Rechazado por",
      "Fecha rechazo",
      "Motivo",
    ];

    const data = solicitudesFiltradas.map((s) => [
      s.centro_operacion_nombre || "-",
      s.sol_numero_solicitud,
      s.cliente_nombre,
      s.etapa_rechazo_nombre || "-",
      s.usuario_rechazo_nombre || "-",
      formatDateTime(s.fecha_rechazo),
      s.motivo_rechazo || "-",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rechazadas");
    XLSX.writeFile(
      wb,
      `solicitudes-rechazadas-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f8fc] to-[#eef1f7] font-sans text-[#0f172a]">
      <LoadingModal isOpen={loading} message="Cargando solicitudes..." />
      <div className="max-w-[1400px] mx-auto px-5 pt-7 pb-16">
        {/* Header */}
        <div className="bg-white border border-[#e9ecf2] rounded-[22px] overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)] mb-6">
          <div className="bg-[linear-gradient(120deg,#003d99_0%,#0050c7_100%)] px-7 py-[22px] flex items-center gap-4">
            <button
              onClick={() => router.push("/solicitudes")}
              className="w-[34px] h-[34px] rounded-[10px] bg-white/[0.14] hover:bg-white/[0.26] flex items-center justify-center text-white flex-shrink-0 transition-colors"
            >
              <ArrowLeft size={15} strokeWidth={2.3} />
            </button>
            <div className="w-[42px] h-[42px] rounded-xl bg-white/[0.16] flex items-center justify-center flex-shrink-0">
              <FileX size={20} className="text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[19px] font-extrabold text-white tracking-[-0.01em] m-0">
                Gestion Solicitudes Rechazadas
              </h1>
              <p className="text-[12.5px] text-[#c3d5f5] mt-[3px] m-0 truncate">
                Pendientes de gestión con el cliente
              </p>
            </div>
            <button
              onClick={() => setShowInfoModal(true)}
              aria-label="Información sobre esta pantalla"
              className="w-[34px] h-[34px] rounded-[10px] bg-white/[0.14] hover:bg-white/[0.26] flex items-center justify-center text-white flex-shrink-0 transition-colors"
            >
              <Info size={16} strokeWidth={2.3} />
            </button>
          </div>

          {/* Filtros */}
          <div className="px-7 py-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-1">
                  Centro de operación
                </label>
                <select
                  value={centroFiltro ?? ""}
                  onChange={(event) =>
                    setCentroFiltro(
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0050c7] focus:border-transparent"
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
                <label className="block text-xs font-semibold text-[#64748b] mb-1">
                  Buscar
                </label>
                <input
                  type="text"
                  placeholder="No. solicitud, cliente o centro"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0050c7] focus:border-transparent"
                />
              </div>

              <div className="flex items-end justify-end gap-2 lg:col-start-4">
                <button
                  onClick={limpiarFiltros}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-lg transition-colors border border-[#e2e8f0] bg-white"
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </button>
                <button
                  onClick={handleBuscar}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#003d99] rounded-lg hover:bg-[#0050c7] transition-colors"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </div>

        {!hasSearched ? (
          <div className="bg-white border border-[#e7ecf3] rounded-[16px] p-12 text-center">
            <p className="text-[#475569] mb-2">
              Presiona Buscar para cargar tus solicitudes rechazadas.
            </p>
            <p className="text-sm text-[#94a3b8]">
              Opcionalmente puedes filtrar por centro o número de
              solicitud.
            </p>
          </div>
        ) : solicitudesFiltradas.length === 0 ? (
          <div className="bg-white border border-[#e7ecf3] rounded-[16px] p-12 text-center">
            <div className="w-16 h-16 bg-[#ecfdf5] rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={28} strokeWidth={2.4} className="text-[#059669]" />
            </div>
            <p className="text-[#475569]">
              No tienes solicitudes rechazadas pendientes de gestión.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#e7ecf3] rounded-[16px] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#eef1f6] bg-[#f8fafc] flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#64748b]">
                Mostrando{" "}
                <span className="font-semibold text-[#0f172a]">
                  {solicitudesFiltradas.length}
                </span>{" "}
                solicitud(es)
              </p>
              <ExportExcelButton onClick={exportarExcel} />
            </div>

            {/* Sub-tarjeta de la tabla, separada de los bordes de la
                tarjeta contenedora */}
            <div className="border border-[#eef1f6] rounded-[12px] mx-5 my-4 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#eef1f6]">
                  <thead className="bg-[#f8fafc]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#0f172a] uppercase tracking-wider">
                        Centro de operación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#0f172a] uppercase tracking-wider">
                        No. solicitud
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#0f172a] uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#0f172a] uppercase tracking-wider">
                        Rechazado en
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#0f172a] uppercase tracking-wider">
                        Rechazado por
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#0f172a] uppercase tracking-wider">
                        Fecha rechazo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#0f172a] uppercase tracking-wider">
                        Motivo
                      </th>
                      <th className="sticky right-0 z-10 bg-[#f8fafc] px-6 py-3 text-left text-xs font-semibold text-[#0f172a] uppercase tracking-wider shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#eef1f6]">
                    {paginatedRows.map((solicitud) => (
                      <tr
                        key={solicitud.sol_id}
                        className="group hover:bg-[#f8fafc] transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0f172a]">
                          {solicitud.centro_operacion_nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#b91c1c]">
                          {solicitud.sol_numero_solicitud}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0f172a]">
                          {solicitud.cliente_nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold px-[11px] py-1 rounded-full bg-[#fef2f2] text-[#b91c1c]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#b91c1c]" />
                            {solicitud.etapa_rechazo_nombre || "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748b]">
                          {solicitud.usuario_rechazo_nombre || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748b]">
                          {formatDateTime(solicitud.fecha_rechazo)}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#64748b] max-w-xs truncate">
                          {solicitud.motivo_rechazo || "-"}
                        </td>
                        <td className="sticky right-0 z-10 bg-white group-hover:bg-[#f8fafc] px-6 py-4 whitespace-nowrap text-sm font-medium shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.1)]">
                          <button
                            onClick={() =>
                              router.push(
                                `/solicitudes/rechazadas-ejecutivo/${solicitud.sol_id}`,
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#fecaca] text-[#b91c1c] text-xs font-semibold hover:bg-[#fef2f2] transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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

      <InfoModal
        isOpen={showInfoModal}
        title="Solicitudes rechazadas"
        message={`Solicitudes rechazadas de forma definitiva por Oficial de Cumplimiento o Comité de Crédito 2. El cliente no fue notificado automáticamente — te corresponde gestionar el seguimiento y marcar "Finalizar" cuando termines.`}
        onClose={() => setShowInfoModal(false)}
      />
    </div>
  );
}
