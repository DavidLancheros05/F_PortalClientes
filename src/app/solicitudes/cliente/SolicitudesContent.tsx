// src/app/solicitudes/cliente/SolicitudesContent.tsx
"use client";

import { useEffect, useState, useContext, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { solicitudesService } from "@/services/solicitudes.service";
import { AuthContext } from "@/context/AuthContext";
import { clientesService } from "@/services/clientes/clientes.service";
import { cachedRequest } from "@/services/core/requestCache";
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
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { TipoSolicitudBadge } from "@/components/badges/TipoSolicitudBadge";
import { getTipoSolicitud } from "@/lib/tipo-solicitud.util";

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

interface ClienteOpcion {
  cli_id: number;
  cli_razon_social: string;
  cli_nro_identificacion: string;
  ejng_id: number | null;
}

interface EjecutivoOpcion {
  ejecutivo_id: number;
  ejecutivo_nombre: string;
}

export default function SolicitudesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hoy = getTodayBogota();
  const { user } = useContext(AuthContext); // <-- Contexto de usuario
  const esCliente =
    String(user?.rol?.nombre || "")
      .toUpperCase()
      .trim() === "CLIENTE";
  const esEjecutivo =
    String(user?.rol?.nombre || "")
      .toUpperCase()
      .trim() === "EJECUTIVO";
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [ejecutivos, setEjecutivos] = useState<EjecutivoOpcion[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteOpcion | null>(null);
  // Capturados una sola vez al montar (antes de que el efecto de abajo
  // reescriba la URL sin estos parámetros) — permiten restaurar la
  // selección de ejecutivo/cliente cuando se vuelve de una página hija
  // (detalle, editar) en vez de perderla y caer de nuevo al selector.
  const [clienteIdDesdeUrl] = useState(() => {
    const raw = Number(searchParams.get("clienteId"));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  });
  const [ejecutivoId, setEjecutivoId] = useState(() => searchParams.get("ejecutivoId") ?? "");
  const [ejecutivoBusqueda, setEjecutivoBusqueda] = useState("");
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [mostrarEjecutivoLista, setMostrarEjecutivoLista] = useState(false);
  const [mostrarClienteLista, setMostrarClienteLista] = useState(false);
  const [cargandoSelectores, setCargandoSelectores] = useState(false);
  const ejecutivoContainerRef = useRef<HTMLDivElement>(null);
  const clienteContainerRef = useRef<HTMLDivElement>(null);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTermInput, setSearchTermInput] = useState(() => searchParams.get("q") ?? "");
  const [estadoFilterInput, setEstadoFilterInput] = useState<string>(() => searchParams.get("estado") ?? "todos");
  const [fechaDesdeInput, setFechaDesdeInput] = useState(() => searchParams.get("desde") ?? "");
  const [fechaHastaInput, setFechaHastaInput] = useState(() => searchParams.get("hasta") ?? "");
  const [tipoSolicitudInput, setTipoSolicitudInput] = useState(() => searchParams.get("tipo") ?? "");
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
    if (!esCliente && clienteSeleccionado) params.set("clienteId", String(clienteSeleccionado.cli_id));
    if (!esCliente && !esEjecutivo && ejecutivoId) params.set("ejecutivoId", ejecutivoId);
    if (searchTermInput.trim()) params.set("q", searchTermInput.trim());
    if (estadoFilterInput !== "todos") params.set("estado", estadoFilterInput);
    if (fechaDesdeInput) params.set("desde", fechaDesdeInput);
    if (fechaHastaInput) params.set("hasta", fechaHastaInput);
    if (tipoSolicitudInput) params.set("tipo", tipoSolicitudInput);
    if (currentPage > 1) params.set("page", String(currentPage));

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [
    esCliente,
    esEjecutivo,
    clienteSeleccionado,
    ejecutivoId,
    searchTermInput,
    estadoFilterInput,
    fechaDesdeInput,
    fechaHastaInput,
    tipoSolicitudInput,
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
    if (authUserReady(user) && !esCliente) {
      setCargandoSelectores(true);
      Promise.all([
        cachedRequest("listado-solicitudes-clientes", () => clientesService.getAll()),
        clientesService.getEjecutivosNegocio(),
      ])
        .then(([clientesData, ejecutivosData]: [any, any]) => {
          const clientesMapeados = Array.isArray(clientesData)
            ? clientesData.map((item: any) => ({
                cli_id: Number(item.cli_id ?? 0),
                cli_razon_social: String(item.cli_razon_social ?? ""),
                cli_nro_identificacion: String(
                  item.cli_nro_identificacion ?? "",
                ),
                ejng_id: item.ejng_id != null ? Number(item.ejng_id) : null,
              }))
            : [];
          setClientes(clientesMapeados.filter((cliente: ClienteOpcion) => cliente.cli_id > 0));
          const ejecutivosMapeados = Array.isArray(ejecutivosData)
            ? ejecutivosData.map((item: any) => ({
                ejecutivo_id: Number(item.ejng_id ?? 0),
                ejecutivo_nombre: String(item.ejng_nombre ?? ""),
              }))
            : [];
          setEjecutivos(ejecutivosMapeados.filter((ejecutivo: EjecutivoOpcion) => ejecutivo.ejecutivo_id > 0));
        })
        .catch((error) => {
          console.error("[SolicitudesContent] Error cargando selectores", error);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: "No se pudieron cargar los ejecutivos y clientes.",
          });
        })
        .finally(() => setCargandoSelectores(false));
    }
  }, [user, esCliente]);

  useEffect(() => {
    if (!esEjecutivo || !user?.ejng_id) return;
    setEjecutivoId(String(user.ejng_id));
    setEjecutivoBusqueda(user.nombre || "");
  }, [esEjecutivo, user]);

  // Restaura la selección de ejecutivo/cliente al volver de una página hija
  // (ver handleVerDetalle/handleEditar más abajo, que ahora incluyen
  // clienteId en la URL) — sin esto, como clienteSeleccionado vive solo en
  // estado de React, cualquier navegación fuera de esta página y de vuelta
  // remonta el componente y lo pierde, cayendo de nuevo al selector.
  useEffect(() => {
    if (esCliente || esEjecutivo || clienteSeleccionado) return;
    if (ejecutivoId && !ejecutivoBusqueda) {
      const ejecutivo = ejecutivos.find((e) => String(e.ejecutivo_id) === ejecutivoId);
      if (ejecutivo) setEjecutivoBusqueda(ejecutivo.ejecutivo_nombre);
    }
    if (clienteIdDesdeUrl) {
      const cliente = clientes.find((c) => c.cli_id === clienteIdDesdeUrl);
      if (cliente) {
        setClienteSeleccionado(cliente);
        setClienteBusqueda(cliente.cli_razon_social);
        if (!ejecutivoId && cliente.ejng_id) {
          const ejecutivo = ejecutivos.find((e) => e.ejecutivo_id === cliente.ejng_id);
          setEjecutivoId(String(cliente.ejng_id));
          if (ejecutivo) setEjecutivoBusqueda(ejecutivo.ejecutivo_nombre);
        }
      }
    }
  }, [esCliente, esEjecutivo, clienteSeleccionado, clienteIdDesdeUrl, ejecutivoId, ejecutivoBusqueda, clientes, ejecutivos]);

  useEffect(() => {
    if (!mostrarEjecutivoLista && !mostrarClienteLista) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (mostrarEjecutivoLista && ejecutivoContainerRef.current && !ejecutivoContainerRef.current.contains(target)) {
        setMostrarEjecutivoLista(false);
      }
      if (mostrarClienteLista && clienteContainerRef.current && !clienteContainerRef.current.contains(target)) {
        setMostrarClienteLista(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrarEjecutivoLista, mostrarClienteLista]);

  const ejecutivosFiltrados = ejecutivos.filter((ejecutivo) =>
    ejecutivo.ejecutivo_nombre.toLowerCase().includes(ejecutivoBusqueda.toLowerCase()),
  );
  const clientesFiltrados = clientes
    .filter((cliente) => (ejecutivoId ? String(cliente.ejng_id) === ejecutivoId : true))
    .filter((cliente) => {
      const term = clienteBusqueda.toLowerCase();
      return (
        cliente.cli_razon_social.toLowerCase().includes(term) ||
        cliente.cli_nro_identificacion.toLowerCase().includes(term)
      );
    });

  function authUserReady(currentUser: typeof user) {
    return Boolean(currentUser);
  }

  useEffect(() => {
    if (!user) return;
    const clienteId = esCliente ? user.cliente_id : clienteSeleccionado?.cli_id;
    if (!clienteId) {
      setLoading(false);
      return;
    }
    fetchSolicitudes();
  }, [user, esCliente, clienteSeleccionado]);

  async function fetchSolicitudes(filters?: {
    searchTerm?: string;
    estado?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }) {
    const requestSequence = ++fetchSequenceRef.current;

    try {
      const clienteId = esCliente ? user?.cliente_id : clienteSeleccionado?.cli_id;
      if (!clienteId) {
        throw new Error("No se encontró el cliente ID");
      }

      console.log("[SolicitudesContent] fetchSolicitudes -> cliente_id:", clienteId, "filters:", filters);
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

      const data = await solicitudesService.getAllByCliente(clienteId, params);
      console.log("[SolicitudesContent] fetchSolicitudes -> data recibida:", data);

      if (requestSequence !== fetchSequenceRef.current) {
        console.log("[SolicitudesContent] fetchSolicitudes -> respuesta obsoleta ignorada");
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
        message: error.message || "Error al cargar las solicitudes. Verifica tu conexión.",
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
    // Ya no entra directo al editor del formulario (/solicitudes/{id}/editar)
    // — pasa por /solicitudes/nueva, que ahora es la página de gestión del
    // proceso completo (Diligenciar/Firmar/Enviar vía FlujoSolicitud) y
    // decide desde ahí a dónde corresponde llevar al usuario según el
    // estado real de la solicitud (BORRADOR sigue redirigiendo sola al
    // editor, ver useUltimaSolicitud/page.tsx::tieneBorrador).
    const clienteId = esCliente ? undefined : clienteSeleccionado?.cli_id;
    router.push(
      clienteId ? `/solicitudes/nueva?clienteId=${clienteId}` : "/solicitudes/nueva",
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
          setSolicitudes((prev) => prev.filter((solicitud) => solicitud.sol_id !== id));
          await fetchSolicitudes();
        } catch (error: any) {
          if (error?.response?.status === 404) {
            setSolicitudes((prev) => prev.filter((solicitud) => solicitud.sol_id !== id));
            return;
          }

          console.error("[SolicitudesContent] Error eliminando solicitud:", error);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: error?.response?.data?.message || error?.message || "No fue posible eliminar la solicitud",
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

  useEffect(() => {
    setCurrentPage(1);
  }, [tipoSolicitudInput]);

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
    setTipoSolicitudInput("");
    fetchSolicitudes();
  };

  // Tipo de Solicitud no tiene contraparte en el backend como filtro (es un
  // booleano calculado por solicitud, es_ampliacion_cupo) — se filtra en
  // memoria, igual que en las bandejas de gestión.
  const solicitudesFiltradas = tipoSolicitudInput
    ? solicitudes.filter(
        (solicitud) =>
          getTipoSolicitud(solicitud.es_ampliacion_cupo) ===
          (tipoSolicitudInput === "AMPLIACION" ? "Ampliación de Cupo" : "Cliente Nuevo"),
      )
    : solicitudes;

  // 🔹 Paginación
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSolicitudes = solicitudesFiltradas.slice(startIndex, endIndex);

  if (!user) {
    return <LoadingModal isOpen message="Cargando usuario..." />;
  }

  if (!esCliente && !clienteSeleccionado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <PageHeaderCard
            icon={FileText}
            eyebrow="Solicitudes"
            title="Solicitudes por cliente"
            subtitle="Selecciona el ejecutivo y el cliente que deseas consultar."
            onBack={() => router.back()}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FilterField label="Ejecutivo de Negocios" className="relative" ref={ejecutivoContainerRef}>
                <input
                  type="text"
                  value={ejecutivoBusqueda}
                  placeholder="Buscar ejecutivo..."
                  disabled={esEjecutivo}
                  onFocus={() => setMostrarEjecutivoLista(true)}
                  onChange={(event) => {
                    setEjecutivoBusqueda(event.target.value);
                    setEjecutivoId("");
                    setClienteSeleccionado(null);
                    setClienteBusqueda("");
                    setMostrarEjecutivoLista(true);
                  }}
                  className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
                />
                {mostrarEjecutivoLista && !esEjecutivo && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-56 overflow-y-auto">
                    {ejecutivosFiltrados.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-500">Sin resultados</div>
                    ) : (
                      ejecutivosFiltrados.map((ejecutivo) => (
                        <button
                          type="button"
                          key={ejecutivo.ejecutivo_id}
                          onClick={() => {
                            setEjecutivoId(String(ejecutivo.ejecutivo_id));
                            setEjecutivoBusqueda(ejecutivo.ejecutivo_nombre);
                            setClienteBusqueda("");
                            setMostrarEjecutivoLista(false);
                          }}
                          className="block w-full px-3 py-2 text-left text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-100">
                          {ejecutivo.ejecutivo_nombre}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </FilterField>

              <FilterField label="Cliente" className="relative" ref={clienteContainerRef}>
                <input
                  type="text"
                  value={clienteBusqueda}
                  placeholder={ejecutivoId ? "Buscar cliente..." : "Selecciona primero un ejecutivo"}
                  disabled={!ejecutivoId || cargandoSelectores}
                  onFocus={() => setMostrarClienteLista(true)}
                  onChange={(event) => {
                    setClienteBusqueda(event.target.value);
                    setMostrarClienteLista(true);
                  }}
                  className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
                {mostrarClienteLista && ejecutivoId && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-56 overflow-y-auto">
                    {clientesFiltrados.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-500">Sin clientes para este ejecutivo</div>
                    ) : (
                      clientesFiltrados.map((cliente) => (
                        <button
                          type="button"
                          key={cliente.cli_id}
                          onClick={() => {
                            setClienteSeleccionado(cliente);
                            setClienteBusqueda(cliente.cli_razon_social);
                            setMostrarClienteLista(false);
                          }}
                          className="block w-full px-3 py-2 text-left text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-100">
                          <div>{cliente.cli_razon_social}</div>
                          {cliente.cli_nro_identificacion && (
                            <div className="text-[11px] text-gray-500">
                              NIT {cliente.cli_nro_identificacion}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </FilterField>
            </div>
          </PageHeaderCard>

          <EmptyStateCard
            icon={Search}
            title={
              cargandoSelectores
                ? "Cargando ejecutivos y clientes..."
                : "Selecciona un cliente para consultar sus solicitudes."
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <LoadingModal isOpen={loading} message="Cargando solicitudes..." />
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={FileText}
          eyebrow="Solicitudes"
          title="Mis Solicitudes"
          subtitle={
            !esCliente && clienteSeleccionado ? `Solicitudes de ${clienteSeleccionado.cli_razon_social}` : undefined
          }
          onBack={() => router.back()}
          actions={
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-semibold text-white border border-white/20 transition-colors">
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
              <button
                onClick={handleNuevaSolicitud}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-[#eef3ff] transition-colors">
                <Plus className="h-4 w-4" />
                Nueva Solicitud
              </button>
            </div>
          }>
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
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
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

            <FilterField label="Tipo de Solicitud">
              <select
                value={tipoSolicitudInput}
                onChange={(event) => setTipoSolicitudInput(event.target.value)}
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                <option value="NUEVO">Cliente Nuevo</option>
                <option value="AMPLIACION">Ampliación de Cupo</option>
              </select>
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={handleBuscar}
                className="inline-flex h-9 items-center justify-center gap-2 rounded text-xs font-semibold text-white bg-blue-600 px-3 hover:bg-blue-700 transition-colors">
                <Search className="h-4 w-4" />
                Buscar
              </button>
              <button
                onClick={handleLimpiar}
                className="inline-flex h-9 items-center justify-center gap-2 rounded text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-300 bg-white px-3 transition-colors">
                <RotateCcw className="h-4 w-4" />
                Limpiar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {solicitudesFiltradas.length === 0 ? (
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
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {[
                      "N° Solicitud",
                      "Tipo",
                      "Cliente",
                      "Fecha Creación",
                      "Última Actualización",
                      "Estado",
                      "Observaciones",
                      "Acciones",
                    ].map((th, idx) => (
                      <Th key={idx} className="whitespace-nowrap" sticky={th === "Acciones"}>
                        {th}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedSolicitudes.map((solicitud) => {
                    const estado = estadosMap[solicitud.sol_estado_id] || estadosMap[0];
                    const EstadoIcon = estado.icon;

                    return (
                      <Tr key={solicitud.sol_id}>
                        <Td className="whitespace-nowrap">
                          <div className="font-semibold text-blue-600 text-sm">{solicitud.sol_numero_solicitud}</div>
                        </Td>
                        <Td className="whitespace-nowrap">
                          <TipoSolicitudBadge esAmpliacionCupo={solicitud.es_ampliacion_cupo} />
                        </Td>
                        <Td className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {solicitud.cliente_nombre || `Cliente #${solicitud.sol_cliente_id}`}
                              </div>
                            </div>
                          </div>
                        </Td>
                        <Td className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-900">
                              {formatearFecha(solicitud.sol_fecha_creacion, true)}
                            </span>
                          </div>
                        </Td>
                        <Td className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-900">
                              {formatearFecha(solicitud.sol_updated_at || solicitud.sol_fecha_creacion, true)}
                            </span>
                          </div>
                        </Td>
                        <Td className="whitespace-nowrap">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${estado.color}`}>
                            <EstadoIcon className="w-3 h-3" />
                            <span>{estado.nombre}</span>
                          </div>
                        </Td>
                        <Td className="min-w-xs">
                          {solicitud.estado_codigo === ESTADO_SOLICITUD.PENDIENTE.codigo &&
                          solicitud.etapa_codigo === WORKFLOW_ETAPA.ASC.codigo &&
                          solicitud.resultado_codigo === WORKFLOW_RESULTADO.RECHAZADO.codigo ? (
                            <button
                              onClick={() => router.push("/solicitudes/mis-documentos")}
                              className="text-sm font-medium text-orange-700 bg-orange-50 px-3 py-1 rounded border border-orange-200 hover:bg-orange-100 transition-colors">
                              Corrija los documentos
                            </button>
                          ) : solicitud.estado_codigo === ESTADO_SOLICITUD.PENDIENTE.codigo &&
                            solicitud.etapa_codigo === WORKFLOW_ETAPA.CLI.codigo &&
                            solicitud.resultado_codigo === WORKFLOW_RESULTADO.PEND_DOCS.codigo ? (
                            <button
                              onClick={() =>
                                router.push(
                                  !esCliente && clienteSeleccionado
                                    ? `/solicitudes/nueva?clienteId=${clienteSeleccionado.cli_id}`
                                    : "/solicitudes/nueva",
                                )
                              }
                              className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded border border-blue-200 hover:bg-blue-100 transition-colors">
                              Faltan documentos por generar y subir
                            </button>
                          ) : solicitud.sol_observacion_cliente ? (
                            // Guardada por el backend en el evento que la origino
                            // (ver cambiarEstado() en solicitudes-workflow.service.ts).
                            // Los casos de abajo son respaldo para solicitudes
                            // viejas o transiciones que aun no la escriben.
                            <span className="text-sm text-gray-700">{solicitud.sol_observacion_cliente}</span>
                          ) : solicitud.estado_codigo === ESTADO_SOLICITUD.PENDIENTE.codigo ? (
                            <span className="text-sm text-emerald-700">
                              Formulario y documentos cargados correctamente. Puedes editar hasta que Cartonera revise
                              tu solicitud.
                            </span>
                          ) : solicitud.estado_codigo === ESTADO_SOLICITUD.RECHAZADA.codigo ? (
                            <span className="text-sm text-red-700">
                              Solicitud rechazada de forma definitiva
                              {solicitud.etapa_codigo === WORKFLOW_ETAPA.OFC.codigo ? " por Cumplimiento" : ""}. Revisa
                              el correo enviado para más detalle.
                            </span>
                          ) : solicitud.estado_codigo === ESTADO_SOLICITUD.REVISION.codigo ? (
                            <span className="text-sm text-blue-700">
                              Tu solicitud está en revisión. Te avisaremos por correo cuando haya una decisión.
                            </span>
                          ) : solicitud.estado_codigo === ESTADO_SOLICITUD.APROBADA.codigo ? (
                            <span className="text-sm text-emerald-700">
                              ¡Tu solicitud fue aprobada! Ya puedes operar con el cupo asignado.
                            </span>
                          ) : solicitud.estado_codigo === ESTADO_SOLICITUD.BORRADOR.codigo ? (
                            <span className="text-sm text-yellow-700">
                              Aún no has enviado tu solicitud. Complétala y envíala cuando estés listo.
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">Sin novedades por el momento.</span>
                          )}
                        </Td>
                        <Td sticky className="whitespace-nowrap">
                          <div className="text-sm font-medium flex gap-2">
                            <button
                              onClick={() => handleVerDetalle(solicitud.sol_id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Ver detalles">
                              <Eye className="w-4 h-4" />
                            </button>
                            {[ESTADO_SOLICITUD.BORRADOR.codigo, ESTADO_SOLICITUD.PENDIENTE.codigo].includes(
                              solicitud.estado_codigo,
                            ) &&
                              !(
                                solicitud.estado_codigo === ESTADO_SOLICITUD.PENDIENTE.codigo &&
                                solicitud.etapa_codigo === WORKFLOW_ETAPA.ASC.codigo &&
                                solicitud.resultado_codigo === WORKFLOW_RESULTADO.RECHAZADO.codigo
                              ) && (
                                <button
                                  onClick={() => handleEditar(solicitud.sol_id)}
                                  className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                                  title="Editar solicitud">
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                            {solicitud.estado_codigo === ESTADO_SOLICITUD.BORRADOR.codigo && (
                              <button
                                onClick={() => handleEliminar(solicitud.sol_id, solicitud.sol_numero_solicitud)}
                                disabled={deletingId === solicitud.sol_id}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Eliminar solicitud borrador">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </table>
            </TableContainer>

            <TablePagination
              page={currentPage}
              pageSize={itemsPerPage}
              totalItems={solicitudesFiltradas.length}
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

      <LoadingModal isOpen={navegandoNueva} message="Abriendo formulario de solicitud..." />
    </div>
  );
}
