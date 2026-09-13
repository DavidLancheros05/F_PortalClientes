// src/app/solicitudes/cliente/SolicitudesContent.tsx
"use client";

import { useEffect, useState, useContext, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { solicitudesService } from "@/services/solicitudes.service";
import { AuthContext } from "@/context/AuthContext";
import { getTodayBogota } from "@/lib/date-utils";
import {
  Eye,
  Edit,
  FileText,
  Calendar,
  User,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RotateCcw,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ESTADOS as ESTADOS_MAP } from "@/lib/workflow-labels";
import { ESTADO_SOLICITUD } from "@/constants/estado-solicitud";
import { WORKFLOW_ETAPA } from "@/constants/workflow-etapas";
import { WORKFLOW_RESULTADO } from "@/constants/workflow-resultados";
import { ConfirmModal, LoadingModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { TableContainer } from "@/components/tables/TableContainer";
import { TablePagination } from "@/components/tables/TablePagination";
import { EmptyStateCard } from "@/components/EmptyStateCard";

const formatearFecha = (fecha?: string | null, conHora = false): string => {
  if (!fecha) return "—";
  try {
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...(conHora && { hour: "2-digit", minute: "2-digit" }),
    });
  } catch {
    return "—";
  }
};

export default function SolicitudesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hoy = getTodayBogota();
  const { user } = useContext(AuthContext); // <-- Contexto de usuario
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTermInput, setSearchTermInput] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [estadoFilterInput, setEstadoFilterInput] = useState<string>(
    () => searchParams.get("estado") ?? "todos",
  );
  const [fechaDesdeInput, setFechaDesdeInput] = useState(
    () => searchParams.get("desde") ?? "",
  );
  const [fechaHastaInput, setFechaHastaInput] = useState(
    () => searchParams.get("hasta") ?? "",
  );
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = Number(searchParams.get("page") ?? "1");
    return Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [navegandoNueva, setNavegandoNueva] = useState(false);
  const fetchSequenceRef = useRef(0);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "error" | "confirm";
    title: string;
    message: string;
    action?: () => void;
    numeroSolicitud?: string;
  }>({
    isOpen: false,
    type: "error",
    title: "",
    message: "",
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTermInput.trim()) params.set("q", searchTermInput.trim());
    if (estadoFilterInput !== "todos") params.set("estado", estadoFilterInput);
    if (fechaDesdeInput) params.set("desde", fechaDesdeInput);
    if (fechaHastaInput) params.set("hasta", fechaHastaInput);
    if (currentPage > 1) params.set("page", String(currentPage));

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [
    searchTermInput,
    estadoFilterInput,
    fechaDesdeInput,
    fechaHastaInput,
    currentPage,
    pathname,
    router,
  ]);

  // Map de estados con iconos y colores
  const estadosMap: {
    [key: number]: { nombre: string; color: string; icon: any };
  } = {
    0: {
      nombre: ESTADOS_MAP[0],
      color: "bg-gray-100 text-gray-800",
      icon: Clock,
    },
    1: {
      nombre: ESTADOS_MAP[1],
      color: "bg-yellow-100 text-yellow-800",
      icon: Clock,
    },
    2: {
      nombre: ESTADOS_MAP[2],
      color: "bg-blue-100 text-blue-800",
      icon: Eye,
    },
    3: {
      nombre: ESTADOS_MAP[3],
      color: "bg-purple-100 text-purple-800",
      icon: MessageSquare,
    },
    4: {
      nombre: ESTADOS_MAP[4],
      color: "bg-green-100 text-green-800",
      icon: CheckCircle,
    },
    5: {
      nombre: ESTADOS_MAP[5],
      color: "bg-emerald-100 text-emerald-800",
      icon: CheckCircle,
    },
    6: {
      nombre: ESTADOS_MAP[6],
      color: "bg-red-100 text-red-800",
      icon: XCircle,
    },
  };

  useEffect(() => {
    console.log("[SolicitudesContent] useEffect -> user:", user);
    if (user) {
      fetchSolicitudes();
    }
  }, [user]);

  async function fetchSolicitudes(filters?: {
    searchTerm?: string;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }) {
    const requestSequence = ++fetchSequenceRef.current;

    try {
      if (!user?.cliente_id) {
        throw new Error("No se encontró el cliente ID");
      }

      console.log(
        "[SolicitudesContent] fetchSolicitudes -> cliente_id:",
        user.cliente_id,
        "filters:",
        filters,
      );
      setLoading(true);

      const params: any = {};
      if (filters?.searchTerm?.trim()) {
        params.searchTerm = filters.searchTerm.trim();
      }
      if (filters?.estado && filters.estado !== "todos") {
        params.estado = filters.estado;
      }
      if (filters?.fechaDesde) {
        params.fechaDesde = filters.fechaDesde;
      }
      if (filters?.fechaHasta) {
        params.fechaHasta = filters.fechaHasta;
      }

      const data = await solicitudesService.getAllByCliente(
        user.cliente_id,
        params,
      );
      console.log(
        "[SolicitudesContent] fetchSolicitudes -> data recibida:",
        data,
      );

      if (requestSequence !== fetchSequenceRef.current) {
        console.log(
          "[SolicitudesContent] fetchSolicitudes -> respuesta obsoleta ignorada",
        );
        return;
      }

      setSolicitudes(data);
    } catch (error: any) {
      if (requestSequence !== fetchSequenceRef.current) {
        return;
      }

      console.error("[SolicitudesContent] Error cargando solicitudes:", error);
      setModalState({
        isOpen: true,
        type: "error",
        title: "Error",
        message:
          error.message ||
          "Error al cargar las solicitudes. Verifica tu conexión.",
      });
    } finally {
      if (requestSequence === fetchSequenceRef.current) {
        setLoading(false);
      }
    }
  }

  const handleVerDetalle = (id: number) => {
    console.log("[SolicitudesContent] handleVerDetalle -> sa_sol_id:", id);
    router.push(`/solicitudes/${id}`);
  };

  const handleEditar = (id: number) => {
    console.log("[SolicitudesContent] handleEditar -> sa_sol_id:", id);
    const query = new URLSearchParams();
    if (searchTermInput.trim()) query.set("q", searchTermInput.trim());
    if (estadoFilterInput !== "todos") query.set("estado", estadoFilterInput);
    if (currentPage > 1) query.set("page", String(currentPage));

    const returnTo = query.toString()
      ? `${pathname}?${query.toString()}`
      : pathname;

    router.push(
      `/solicitudes/${id}/editar?returnTo=${encodeURIComponent(returnTo)}`,
    );
  };

  const handleNuevaSolicitud = () => {
    console.log("[SolicitudesContent] handleNuevaSolicitud");
    // Feedback inmediato: el formulario de nueva solicitud tarda en abrir
    // y sin esto el clic parece no hacer nada
    setNavegandoNueva(true);
    // new solicitud page lives at /solicitudes/nueva
    router.push("/solicitudes/nueva");
  };

  const handleEliminar = (id: number, numeroSolicitud?: string) => {
    setModalState({
      isOpen: true,
      type: "confirm",
      title: "Eliminar solicitud",
      message: `¿Deseas eliminar la solicitud ${numeroSolicitud || `#${id}`}? Esta acción no se puede deshacer.`,
      numeroSolicitud,
      action: async () => {
        try {
          setDeletingId(id);
          await solicitudesService.remove(id);
          setSolicitudes((prev) =>
            prev.filter((solicitud) => solicitud.sol_id !== id),
          );
          await fetchSolicitudes();
        } catch (error: any) {
          if (error?.response?.status === 404) {
            setSolicitudes((prev) =>
              prev.filter((solicitud) => solicitud.sol_id !== id),
            );
            return;
          }

          console.error(
            "[SolicitudesContent] Error eliminando solicitud:",
            error,
          );
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message:
              error?.response?.data?.message ||
              error?.message ||
              "No fue posible eliminar la solicitud",
          });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const handleRefresh = () => {
    console.log("[SolicitudesContent] handleRefresh");
    fetchSolicitudes();
  };

  const handleBuscar = () => {
    fetchSolicitudes({
      searchTerm: searchTermInput,
      estado: estadoFilterInput,
      fechaDesde: fechaDesdeInput,
      fechaHasta: fechaHastaInput,
    });
  };

  const handleLimpiar = () => {
    setSearchTermInput("");
    setEstadoFilterInput("todos");
    setFechaDesdeInput("");
    setFechaHastaInput("");
    fetchSolicitudes();
  };

  // 🔹 Paginación
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSolicitudes = solicitudes.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <LoadingModal isOpen={loading} message="Cargando solicitudes..." />
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={FileText}
          eyebrow="Solicitudes"
          title="Mis Solicitudes"
          onBack={() => router.back()}
          actions={
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-semibold text-white border border-white/20 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
              <button
                onClick={handleNuevaSolicitud}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-[#eef3ff] transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nueva Solicitud
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
            <FilterField label="Buscar solicitud" className="lg:col-span-2">
              <input
                type="text"
                value={searchTermInput}
                onChange={(event) => setSearchTermInput(event.target.value)}
                placeholder="Numero, cliente o centro..."
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>

            <FilterField label="Estado">
              <select
                value={estadoFilterInput}
                onChange={(event) => setEstadoFilterInput(event.target.value)}
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todos</option>
                {Object.entries(ESTADOS_MAP).map(([id, nombre]) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Fecha de creación desde">
              <input
                type="date"
                value={fechaDesdeInput}
                onChange={(event) => setFechaDesdeInput(event.target.value)}
                max={hoy}
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>

            <FilterField label="Fecha de creación hasta">
              <input
                type="date"
                value={fechaHastaInput}
                onChange={(event) => setFechaHastaInput(event.target.value)}
                max={hoy}
                min={fechaDesdeInput || undefined}
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={handleBuscar}
                className="inline-flex h-9 items-center justify-center gap-2 rounded text-xs font-semibold text-white bg-blue-600 px-3 hover:bg-blue-700 transition-colors"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
              <button
                onClick={handleLimpiar}
                className="inline-flex h-9 items-center justify-center gap-2 rounded text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-300 bg-white px-3 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {solicitudes.length === 0 ? (
          <EmptyStateCard
            icon={FileText}
            title="No hay solicitudes"
            subtitle={
              searchTermInput || estadoFilterInput !== "todos"
                ? "No se encontraron solicitudes con los filtros aplicados"
                : "Aún no has creado ninguna solicitud"
            }
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <TableContainer>
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-blue-100 sticky top-0">
                  <tr>
                    {[
                      "N° Solicitud",
                      "Cliente",
                      "Fecha Creación",
                      "Última Actualización",
                      "Estado",
                      "Observaciones",
                      "Acciones",
                    ].map((th, idx) => (
                      <th
                        key={idx}
                        className={`px-4 sm:px-6 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider whitespace-nowrap border-b border-blue-200 ${
                          th === "Acciones"
                            ? "sticky right-0 bg-blue-100 z-10"
                            : ""
                        }`}
                      >
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedSolicitudes.map((solicitud) => {
                    const estado =
                      estadosMap[solicitud.sol_estado_id] || estadosMap[0];
                    const EstadoIcon = estado.icon;

                    return (
                      <tr
                        key={solicitud.sol_id}
                        className="hover:bg-blue-50/40 transition-colors border-b"
                      >
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                          <div className="font-semibold text-blue-600 text-sm">
                            {solicitud.sol_numero_solicitud}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {solicitud.cliente_nombre ||
                                  `Cliente #${solicitud.sol_cliente_id}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-900">
                              {formatearFecha(solicitud.sol_fecha_creacion, true)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-900">
                              {formatearFecha(
                                solicitud.sol_updated_at ||
                                  solicitud.sol_fecha_creacion,
                                true,
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${estado.color}`}
                          >
                            <EstadoIcon className="w-3 h-3" />
                            <span>{estado.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 min-w-xs">
                          {solicitud.sol_estado_id ===
                            ESTADO_SOLICITUD.PENDIENTE.id &&
                          solicitud.sol_etapa_actual_id ===
                            WORKFLOW_ETAPA.ASC.id &&
                          solicitud.sol_resultado_etapa_id ===
                            WORKFLOW_RESULTADO.RECHAZADO.id ? (
                            <button
                              onClick={() =>
                                router.push("/solicitudes/mis-documentos")
                              }
                              className="text-sm font-medium text-orange-700 bg-orange-50 px-3 py-1 rounded border border-orange-200 hover:bg-orange-100 transition-colors"
                            >
                              Corrija los documentos
                            </button>
                          ) : solicitud.sol_estado_id ===
                              ESTADO_SOLICITUD.PENDIENTE.id &&
                            solicitud.sol_etapa_actual_id ===
                              WORKFLOW_ETAPA.CLI.id &&
                            solicitud.sol_resultado_etapa_id ===
                              WORKFLOW_RESULTADO.PEND_DOCS.id ? (
                            <button
                              onClick={() =>
                                router.push("/solicitudes/mis-documentos")
                              }
                              className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                            >
                              Faltan documentos por generar y subir
                            </button>
                          ) : solicitud.sol_observacion_cliente ? (
                            // Guardada por el backend en el evento que la origino
                            // (ver cambiarEstado() en solicitudes-workflow.service.ts).
                            // Los casos de abajo son respaldo para solicitudes
                            // viejas o transiciones que aun no la escriben.
                            <span className="text-sm text-gray-700">
                              {solicitud.sol_observacion_cliente}
                            </span>
                          ) : solicitud.sol_estado_id ===
                            ESTADO_SOLICITUD.PENDIENTE.id ? (
                            <span className="text-sm text-emerald-700">
                              Formulario y documentos cargados
                              correctamente. Puedes editar hasta que
                              Cartonera revise tu solicitud.
                            </span>
                          ) : solicitud.sol_estado_id ===
                            ESTADO_SOLICITUD.RECHAZADA.id ? (
                            <span className="text-sm text-red-700">
                              Solicitud rechazada de forma definitiva
                              {solicitud.sol_etapa_actual_id ===
                              WORKFLOW_ETAPA.OFC.id
                                ? " por Cumplimiento"
                                : ""}
                              . Revisa el correo enviado para más detalle.
                            </span>
                          ) : solicitud.sol_estado_id ===
                            ESTADO_SOLICITUD.REVISION.id ? (
                            <span className="text-sm text-blue-700">
                              Tu solicitud está en revisión.
                              Te avisaremos por correo cuando haya una
                              decisión.
                            </span>
                          ) : solicitud.sol_estado_id ===
                            ESTADO_SOLICITUD.APROBADA.id ? (
                            <span className="text-sm text-emerald-700">
                              ¡Tu solicitud fue aprobada! Ya puedes operar
                              con el cupo asignado.
                            </span>
                          ) : solicitud.sol_estado_id ===
                            ESTADO_SOLICITUD.BORRADOR.id ? (
                            <span className="text-sm text-yellow-700">
                              Aún no has enviado tu solicitud. Complétala
                              y envíala cuando estés listo.
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">
                              Sin novedades por el momento.
                            </span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap sticky right-0 bg-white z-10">
                          <div className="text-sm font-medium flex gap-2">
                            <button
                              onClick={() =>
                                handleVerDetalle(solicitud.sol_id)
                              }
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {[
                              ESTADO_SOLICITUD.BORRADOR.id,
                              ESTADO_SOLICITUD.PENDIENTE.id,
                            ].includes(solicitud.sol_estado_id) &&
                              !(
                                solicitud.sol_estado_id ===
                                  ESTADO_SOLICITUD.PENDIENTE.id &&
                                solicitud.sol_etapa_actual_id ===
                                  WORKFLOW_ETAPA.ASC.id &&
                                solicitud.sol_resultado_etapa_id ===
                                  WORKFLOW_RESULTADO.RECHAZADO.id
                              ) && (
                                <button
                                  onClick={() =>
                                    handleEditar(solicitud.sol_id)
                                  }
                                  className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                                  title="Editar solicitud"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                            {solicitud.sol_estado_id ===
                              ESTADO_SOLICITUD.BORRADOR.id && (
                              <button
                                onClick={() =>
                                  handleEliminar(
                                    solicitud.sol_id,
                                    solicitud.sol_numero_solicitud,
                                  )
                                }
                                disabled={deletingId === solicitud.sol_id}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Eliminar solicitud borrador"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableContainer>

            <TablePagination
              page={currentPage}
              pageSize={itemsPerPage}
              totalItems={solicitudes.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {modalState.type === "error" && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          confirmText="Aceptar"
          isDangerous={true}
          onConfirm={() => setModalState({ ...modalState, isOpen: false })}
          onCancel={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}

      {modalState.type === "confirm" && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          title={modalState.title}
          message={modalState.message}
          confirmText="Eliminar"
          isDangerous={true}
          onConfirm={async () => {
            if (modalState.action) await modalState.action();
            setModalState({ ...modalState, isOpen: false });
          }}
          onCancel={() => setModalState({ ...modalState, isOpen: false })}
        />
      )}

      <LoadingModal
        isOpen={navegandoNueva}
        message="Abriendo formulario de solicitud..."
      />
    </div>
  );
}
