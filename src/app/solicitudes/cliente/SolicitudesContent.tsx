// src/app/solicitudes/cliente/SolicitudesContent.tsx
"use client";

import { useEffect, useState, useContext, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { solicitudesService } from "@/services/solicitudes.service";
import { AuthContext } from "@/context/AuthContext";
import {
  Eye,
  Edit,
  ArrowLeft,
  FileText,
  Calendar,
  User,
  Building,
  TrendingUp,
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
import { ConfirmModal, LoadingModal } from "@/components/modals";

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
  const { user } = useContext(AuthContext); // <-- Contexto de usuario
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTermInput, setSearchTermInput] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [estadoFilterInput, setEstadoFilterInput] = useState<string>(
    () => searchParams.get("estado") ?? "todos",
  );
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = Number(searchParams.get("page") ?? "1");
    return Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [navegandoNueva, setNavegandoNueva] = useState(false);
  const fetchSequenceRef = useRef(0);
  const itemsPerPage = 5;
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
    if (currentPage > 1) params.set("page", String(currentPage));

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [searchTermInput, estadoFilterInput, currentPage, pathname, router]);

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
    });
  };

  const handleLimpiar = () => {
    setSearchTermInput("");
    setEstadoFilterInput("todos");
    fetchSolicitudes();
  };

  // 🔹 Paginación
  const totalPages = Math.ceil(solicitudes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSolicitudes = solicitudes.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <LoadingModal isOpen={loading} message="Cargando solicitudes..." />
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <p className="text-2xl md:text-3xl font-bold text-blue-800 leading-tight">
                  Mis Solicitudes
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualizar
                </button>
                <button
                  onClick={handleNuevaSolicitud}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Solicitud
                </button>
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-blue-200 via-blue-300 to-transparent mb-6" />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Buscar solicitud
                </label>
                <input
                  type="text"
                  value={searchTermInput}
                  onChange={(event) => setSearchTermInput(event.target.value)}
                  placeholder="Numero, cliente o centro..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Estado
                </label>
                <select
                  value={estadoFilterInput}
                  onChange={(event) => setEstadoFilterInput(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="todos">Todos</option>
                  <option value="0">Sin iniciar</option>
                  <option value="5">Borrador</option>
                  <option value="1">Pendiente</option>
                  <option value="2">Revision Comercial</option>
                  <option value="3">Aprobado</option>
                  <option value="4">Rechazado</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={handleBuscar}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
                <button
                  onClick={handleLimpiar}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de solicitudes */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-blue-100 via-blue-100 to-blue-50 sticky top-0">
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
                        className={`px-4 sm:px-6 py-3 text-left text-xs font-bold text-blue-900 uppercase tracking-wider whitespace-nowrap border-b border-blue-200 ${
                          th === "Acciones" ? "sticky right-0 bg-gradient-to-r from-blue-100 via-blue-100 to-blue-50 z-10" : ""
                        }`}
                      >
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {solicitudes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 sm:px-6 py-12 text-center"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="w-16 h-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No hay solicitudes
                          </h3>
                          <p className="text-gray-500 mb-4">
                            {searchTermInput || estadoFilterInput !== "todos"
                              ? "No se encontraron solicitudes con los filtros aplicados"
                              : "Aún no has creado ninguna solicitud"}
                          </p>
                          {!searchTermInput &&
                            estadoFilterInput === "todos" && (
                              <button
                                onClick={handleNuevaSolicitud}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Crear mi primera solicitud
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedSolicitudes.map((solicitud) => {
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
                            {solicitud.sol_estado_id === 2 &&
                            solicitud.sol_etapa_actual_id === 3 &&
                            solicitud.sol_resultado_etapa_id === 3 ? (
                              <button
                                onClick={() =>
                                  router.push("/solicitudes/mis-documentos")
                                }
                                className="text-sm font-medium text-orange-700 bg-orange-50 px-3 py-1 rounded border border-orange-200 hover:bg-orange-100 transition-colors"
                              >
                                Corrija los documentos
                              </button>
                            ) : solicitud.sol_estado_id === 2 &&
                              solicitud.sol_etapa_actual_id === 1 &&
                              solicitud.sol_resultado_etapa_id === 5 ? (
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
                            ) : solicitud.sol_estado_id === 2 ? (
                              <span className="text-sm text-emerald-700">
                                Formulario y documentos cargados
                                correctamente. Puedes editar hasta que
                                Cartonera revise tu solicitud.
                              </span>
                            ) : solicitud.sol_estado_id === 6 ? (
                              <span className="text-sm text-red-700">
                                Solicitud rechazada de forma definitiva
                                {solicitud.sol_etapa_actual_id === 4
                                  ? " por Cumplimiento"
                                  : ""}
                                . Revisa el correo enviado para más detalle.
                              </span>
                            ) : solicitud.sol_estado_id === 3 ? (
                              <span className="text-sm text-blue-700">
                                Tu solicitud está en revisión.
                                Te avisaremos por correo cuando haya una
                                decisión.
                              </span>
                            ) : solicitud.sol_estado_id === 5 ? (
                              <span className="text-sm text-emerald-700">
                                ¡Tu solicitud fue aprobada! Ya puedes operar
                                con el cupo asignado.
                              </span>
                            ) : solicitud.sol_estado_id === 1 ? (
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
                              {[1, 2].includes(solicitud.sol_estado_id) &&
                                !(
                                  solicitud.sol_estado_id === 2 &&
                                  solicitud.sol_etapa_actual_id === 3 &&
                                  solicitud.sol_resultado_etapa_id === 3
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
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {solicitudes.length > 0 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Mostrando{" "}
                    <span className="font-medium">
                      {startIndex + 1} -{" "}
                      {Math.min(endIndex, solicitudes.length)}
                    </span>{" "}
                    de <span className="font-medium">{solicitudes.length}</span>{" "}
                    solicitudes
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 border rounded text-sm transition-colors ${
                            currentPage === page
                              ? "bg-blue-50 text-blue-600 border-blue-200"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      ),
                    )}

                    <button
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[
              {
                title: "Total Solicitudes",
                count: solicitudes.length,
                icon: FileText,
                color: "text-blue-500",
              },
              {
                title: "Pendientes",
                count: solicitudes.filter((s) => s.sol_estado_id === 1).length,
                icon: Clock,
                color: "text-yellow-500",
              },
              {
                title: "Aprobadas",
                count: solicitudes.filter((s) => s.sol_estado_id === 3).length,
                icon: CheckCircle,
                color: "text-green-500",
              },
              {
                title: "Rechazadas",
                count: solicitudes.filter((s) => s.sol_estado_id === 4).length,
                icon: XCircle,
                color: "text-red-500",
              },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                      <p className={`text-3xl font-bold ${stat.color}`}>
                        {stat.count}
                      </p>
                    </div>
                    <Icon className={`w-10 h-10 ${stat.color}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
