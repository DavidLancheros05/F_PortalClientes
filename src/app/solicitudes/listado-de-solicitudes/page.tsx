"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { getTodayBogota } from "@/lib/date-utils";
import { useSearching } from "@/context/SearchingContext";
import { cachedRequest } from "@/services/core/requestCache";

import { ClipboardList, Eye, PackageOpen, Search, Trash2, X, Timer } from "lucide-react";
import { clientesService } from "@/services/clientes/clientes.service";
import { solicitudesService } from "@/services/solicitudes.service";
import { ESTADOS, getEstadoBadgeClass } from "@/lib/workflow-labels";
import { ConfirmModal } from "@/components/modals";
import { VerSlaModal } from "@/components/solicitudes/VerSlaModal";
import { TablePagination } from "@/components/tables/TablePagination";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { TableContainer } from "@/components/tables/TableContainer";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { TipoSolicitudBadge } from "@/components/badges/TipoSolicitudBadge";
import { getTipoSolicitud } from "@/lib/tipo-solicitud.util";

interface Cliente {
  cli_id: number;
  cli_razon_social: string;
  cli_nro_identificacion: string;
  ejng_id: number | null;
}

interface Ejecutivo {
  ejecutivo_id: number;
  ejecutivo_nombre: string;
}

interface SolicitudListado {
  sol_id: number;
  sol_numero_solicitud: string;
  sol_cli_id: number | null;
  cliente_nombre: string | null;
  sol_ejng_id: number | null;
  ejecutivo_nombre: string | null;
  ejecutivo_area?: string | null;
  auxiliar_id?: number | null;
  auxiliar_nombre?: string | null;
  auxiliar_area?: string | null;
  sol_fecha_creacion: string;
  sol_fecha_envio?: string | null;
  sol_fecha_aprobacion?: string | null;
  sol_ses_id: number;
  sol_wet_id?: number;
  sol_wee_id?: number;
  etapa_nombre?: string;
  resultado_nombre?: string;
  sol_formulario_version: number | null;
  sol_fecha_estimada_respuesta_comercial: string | null;
  sol_fecha_est_gest_oc: string | null;
  sol_fecha_gest_oc: string | null;
  sol_fecha_est_gest_cc1: string | null;
  sol_fecha_gest_cc1: string | null;
  sol_fecha_est_gest_cc2: string | null;
  sol_fecha_gest_cc2: string | null;
  sol_fecha_est_gest_ejn?: string | null;
  sol_fecha_gest_ejn?: string | null;
  sol_fecha_est_gest_asc?: string | null;
  sol_fecha_gest_asc?: string | null;
  sol_cupo_aprobado?: number | null;
  sol_cupo_solicitado?: number | null;
  es_ampliacion_cupo?: boolean | number | null;
  sol_plazo_pago?: number | null;
  sol_forma_pago?: string | null;
  sol_usr_id_apr_cond?: number | null;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const dateStr = date.toLocaleDateString("es-CO");
  const timeStr = date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${dateStr} ${timeStr}`;
}

function csvEscape(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

export default function SolicitudesListadoDeSolicitudesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useContext(AuthContext);
  const { startSearching, stopSearching } = useSearching();
  const esAdmin = user?.rol?.nombre === "ADMIN";
  const esEjecutivo = user?.rol?.nombre === "EJECUTIVO";

  const hoy = getTodayBogota();

  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [etapas, setEtapas] = useState<Array<{ wet_id: number; wet_nombre: string }>>([]);
  const [resultados, setResultados] = useState<Array<{ wee_id: number; wee_nombre: string }>>([]);
  const [rows, setRows] = useState<SolicitudListado[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [hasSearched, setHasSearched] = useState(false);
  const [solicitudAEliminar, setSolicitudAEliminar] = useState<{
    sol_id: number;
    numero: string;
  } | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [mostrarClienteLista, setMostrarClienteLista] = useState(false);
  const clienteContainerRef = useRef<HTMLDivElement>(null);
  const [ejecutivoId, setEjecutivoId] = useState("");
  const [ejecutivoBusqueda, setEjecutivoBusqueda] = useState("");
  const [mostrarEjecutivoLista, setMostrarEjecutivoLista] = useState(false);
  const ejecutivoContainerRef = useRef<HTMLDivElement>(null);
  const [estadoId, setEstadoId] = useState("");
  const [etapaId, setEtapaId] = useState("");
  const [resultadoId, setResultadoId] = useState("");
  const [tipoSolicitud, setTipoSolicitud] = useState("");
  const [slaSolicitud, setSlaSolicitud] = useState<{ numero: string } | null>(null);

  useEffect(() => {
    // Esperar a que se resuelva el usuario antes de restaurar filtros desde
    // la URL — así "esEjecutivo" ya es confiable y un ejecutivo no alcanza
    // a disparar una búsqueda con un ejecutivo_id ajeno tomado de una URL
    // manipulada o de una sesión anterior.
    if (authLoading) return;

    const params = new URLSearchParams(searchParams.toString());
    const hasParams = params.size > 0;

    if (params.has("fecha_desde")) setFechaDesde(params.get("fecha_desde") || "");
    if (params.has("fecha_hasta")) setFechaHasta(params.get("fecha_hasta") || "");
    if (params.has("cliente_id")) setClienteId(params.get("cliente_id") || "");
    if (esEjecutivo && user?.ejng_id) {
      params.set("ejecutivo_id", String(user.ejng_id));
      setEjecutivoId(String(user.ejng_id));
      setEjecutivoBusqueda(user.nombre || "");
    } else if (params.has("ejecutivo_id")) {
      setEjecutivoId(params.get("ejecutivo_id") || "");
    }
    if (params.has("estado_id")) setEstadoId(params.get("estado_id") || "");
    if (params.has("etapa_id")) setEtapaId(params.get("etapa_id") || "");
    if (params.has("resultado_etapa_id")) setResultadoId(params.get("resultado_etapa_id") || "");
    if (params.has("tipo_solicitud")) setTipoSolicitud(params.get("tipo_solicitud") || "");

    const wasSearched = params.get("hasSearched") === "true";
    if (wasSearched) setHasSearched(true);

    if (hasParams && wasSearched) {
      ejecutarBusquedaConUrlParams(params);
    }
  }, [searchParams, authLoading, esEjecutivo, user]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [clientesData, etapasData, resultadosData, ejecutivosData] = await Promise.all([
          // Solo se usa como picklist de filtro en esta página — se
          // cachea por sesión para no repetir la carga completa de
          // clientes (la más pesada de las 4) cada vez que se visita.
          cachedRequest("listado-solicitudes-clientes", () => clientesService.getAll()),
          solicitudesService.getEtapas(),
          solicitudesService.getResultados(),
          clientesService.getEjecutivosNegocio(),
        ]);

        setEtapas(etapasData || []);
        setResultados(resultadosData || []);

        const mappedClientes = Array.isArray(clientesData)
          ? clientesData.map((item: any) => ({
              cli_id: Number(item.cli_id ?? item.id ?? 0),
              cli_razon_social: String(item.cli_razon_social ?? ""),
              cli_nro_identificacion: String(item.cli_nro_identificacion ?? ""),
              ejng_id: item.ejng_id != null ? Number(item.ejng_id) : null,
            }))
          : [];
        setClientes(mappedClientes.filter((item: Cliente) => item.cli_id > 0));

        const mappedEjecutivos = Array.isArray(ejecutivosData)
          ? ejecutivosData.map((item: any) => ({
              ejecutivo_id: Number(item.ejng_id ?? 0),
              ejecutivo_nombre: String(item.ejng_nombre ?? ""),
            }))
          : [];
        setEjecutivos(mappedEjecutivos.filter((item: Ejecutivo) => item.ejecutivo_id > 0));
      } catch (error) {
        console.error("[SolicitudesListadoDeSolicitudesPage] Error cargando catálogos", error);
      }
    }

    if (!authLoading) {
      loadInitialData();
    }
  }, [authLoading]);

  // Un ejecutivo solo puede ver sus propias solicitudes — el filtro de
  // Ejecutivo se precarga con su propio ejng_id y queda bloqueado (ver
  // input deshabilitado más abajo) para que no pueda buscar las de otro.
  useEffect(() => {
    if (!esEjecutivo || !user?.ejng_id) return;
    setEjecutivoId(String(user.ejng_id));
    setEjecutivoBusqueda(user.nombre || "");
  }, [esEjecutivo, user]);

  // Si se cambia el ejecutivo del filtro y el cliente ya seleccionado no es
  // suyo, se limpia la selección para no dejar un filtro inconsistente.
  useEffect(() => {
    if (!clienteId) return;
    if (!ejecutivoId) return;
    const cliente = clientes.find((c) => String(c.cli_id) === clienteId);
    if (cliente && String(cliente.ejng_id) !== String(ejecutivoId)) {
      setClienteId("");
      setClienteBusqueda("");
    }
  }, [ejecutivoId, clientes]);

  async function ejecutarBusquedaConUrlParams(urlParams: URLSearchParams) {
    try {
      setLoading(true);
      const params: any = {};
      if (urlParams.has("fecha_desde")) params.fecha_desde = urlParams.get("fecha_desde");
      if (urlParams.has("fecha_hasta")) params.fecha_hasta = urlParams.get("fecha_hasta");
      if (urlParams.has("cliente_id")) params.cliente_id = urlParams.get("cliente_id");
      if (urlParams.has("ejecutivo_id")) params.ejecutivo_id = urlParams.get("ejecutivo_id");
      if (urlParams.has("estado_id")) params.estado_id = urlParams.get("estado_id");
      if (urlParams.has("etapa_id")) params.etapa_id = urlParams.get("etapa_id");
      if (urlParams.has("resultado_etapa_id")) params.resultado_etapa_id = urlParams.get("resultado_etapa_id");
      if (urlParams.has("tipo_solicitud")) params.tipo_solicitud = urlParams.get("tipo_solicitud");

      const data = await solicitudesService.getListado(params);
      setRows(data);
      setCurrentPage(1);
    } catch (error) {
      console.error("[SolicitudesListadoDeSolicitudesPage] Error consultando listado", error);
    } finally {
      setLoading(false);
    }
  }

  const clientesFiltrados = useMemo(() => {
    const porEjecutivo = ejecutivoId
      ? clientes.filter((cliente) => String(cliente.ejng_id) === String(ejecutivoId))
      : clientes;
    if (!clienteBusqueda) return porEjecutivo;
    const term = clienteBusqueda.toLowerCase();
    return porEjecutivo.filter(
      (cliente) =>
        cliente.cli_razon_social.toLowerCase().includes(term) ||
        cliente.cli_nro_identificacion.toLowerCase().includes(term),
    );
  }, [clientes, clienteBusqueda, ejecutivoId]);

  const ejecutivosFiltrados = useMemo(() => {
    if (!ejecutivoBusqueda) return ejecutivos;
    return ejecutivos.filter((ejecutivo) =>
      ejecutivo.ejecutivo_nombre.toLowerCase().includes(ejecutivoBusqueda.toLowerCase()),
    );
  }, [ejecutivos, ejecutivoBusqueda]);

  // Cierra los desplegables de Cliente/Ejecutivo al hacer clic afuera. No basta
  // con `onBlur` del input: el clic sobre un ítem de la lista dispara blur
  // antes que el click, y el ítem nunca llega a seleccionarse.
  useEffect(() => {
    if (!mostrarClienteLista && !mostrarEjecutivoLista) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (mostrarClienteLista && clienteContainerRef.current && !clienteContainerRef.current.contains(target)) {
        setMostrarClienteLista(false);
      }
      if (mostrarEjecutivoLista && ejecutivoContainerRef.current && !ejecutivoContainerRef.current.contains(target)) {
        setMostrarEjecutivoLista(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrarClienteLista, mostrarEjecutivoLista]);

  const canSearch = useMemo(() => {
    if (fechaDesde && fechaHasta) {
      return fechaDesde <= fechaHasta;
    }
    return true;
  }, [fechaDesde, fechaHasta]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  async function buscar() {
    try {
      startSearching();
      setLoading(true);
      setHasSearched(true);
      const params: any = {};

      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      if (clienteId) params.cliente_id = clienteId;
      if (ejecutivoId) params.ejecutivo_id = ejecutivoId;
      if (estadoId) params.estado_id = estadoId;
      if (etapaId) params.etapa_id = etapaId;
      if (resultadoId) params.resultado_etapa_id = resultadoId;
      if (tipoSolicitud) params.tipo_solicitud = tipoSolicitud;

      const data = await solicitudesService.getListado(params);

      setRows(data);
      setCurrentPage(1);

      const urlParams = new URLSearchParams();
      if (fechaDesde) urlParams.set("fecha_desde", fechaDesde);
      if (fechaHasta) urlParams.set("fecha_hasta", fechaHasta);
      if (clienteId) urlParams.set("cliente_id", clienteId);
      if (ejecutivoId) urlParams.set("ejecutivo_id", ejecutivoId);
      if (estadoId) urlParams.set("estado_id", estadoId);
      if (etapaId) urlParams.set("etapa_id", etapaId);
      if (resultadoId) urlParams.set("resultado_etapa_id", resultadoId);
      if (tipoSolicitud) urlParams.set("tipo_solicitud", tipoSolicitud);
      urlParams.set("hasSearched", "true");
      window.history.replaceState(null, "", `?${urlParams.toString()}`);
    } catch (error) {
      console.error("[SolicitudesListadoDeSolicitudesPage] Error consultando listado", error);
    } finally {
      setLoading(false);
      stopSearching();
    }
  }

  function limpiarFiltros() {
    setFechaDesde("");
    setFechaHasta("");
    setClienteId("");
    setClienteBusqueda("");
    // Un ejecutivo no puede limpiar su propio filtro — solo ve lo suyo.
    if (!esEjecutivo) {
      setEjecutivoId("");
      setEjecutivoBusqueda("");
    }
    setEstadoId("");
    setEtapaId("");
    setResultadoId("");
    setTipoSolicitud("");
    setRows([]);
    setCurrentPage(1);
    setHasSearched(false);
    window.history.replaceState(null, "", "?");
  }

  async function exportarExcelCsv() {
    if (rows.length === 0) return;

    const XLSX = await import("xlsx");

    const header = [
      "No. solicitud",
      "Tipo",
      "Cliente",
      "Ejecutivo de negocios",
      "Área Ejecutivo",
      "Auxiliar Serv. Cliente",
      "Área Auxiliar",
      "Fecha de envío",
      "Fecha de aprobación",
      "Estado",
      "Etapa Actual",
      "Resultado Etapa",
      "Cupo Aprobado",
      "Plazo Pago",
      "Forma Pago",
      "F. Real Ejecutivo de Negocios",
      "F. Real Auxiliar Servicio al Cliente",
      "Fecha real oficial cumplimiento",
    ];

    const data = rows.map((row) => [
      row.sol_numero_solicitud,
      getTipoSolicitud(row.es_ampliacion_cupo),
      row.cliente_nombre || "-",
      row.ejecutivo_nombre || "-",
      row.ejecutivo_area || "-",
      row.auxiliar_nombre || "-",
      row.auxiliar_area || "-",
      formatDateTime(row.sol_fecha_envio),
      formatDateTime(row.sol_fecha_aprobacion),
      ESTADOS[row.sol_ses_id] || "Desconocido",
      row.etapa_nombre || "-",
      row.resultado_nombre || "-",
      row.sol_cupo_aprobado ? `$${row.sol_cupo_aprobado.toLocaleString("es-CO")}` : "-",
      row.sol_plazo_pago || "-",
      row.sol_forma_pago || "-",
      formatDateTime(row.sol_fecha_gest_ejn),
      formatDateTime(row.sol_fecha_gest_asc),
      formatDateTime(row.sol_fecha_gest_oc),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Solicitudes");

    XLSX.writeFile(wb, `listado-solicitudes-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function confirmarEliminar() {
    if (!solicitudAEliminar) return;
    try {
      setEliminando(true);
      setErrorEliminar(null);
      await solicitudesService.remove(solicitudAEliminar.sol_id);
      setRows((prev) => prev.filter((r) => r.sol_id !== solicitudAEliminar.sol_id));
      setSolicitudAEliminar(null);
    } catch (error: any) {
      setErrorEliminar(error?.response?.data?.message || error?.message || "No fue posible eliminar la solicitud");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-[115rem] mx-auto">
        <PageHeaderCard
          icon={ClipboardList}
          eyebrow="Solicitudes"
          title="Listado de solicitudes"
          // TODO: "/solicitudes" no tiene page.tsx propio -> 404. Pendiente decidir destino real.
          onBack={() => router.push("/solicitudes")}>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <FilterField label="Ejecutivo" className="relative" ref={ejecutivoContainerRef}>
              <input
                type="text"
                placeholder="Buscar ejecutivo..."
                value={ejecutivoBusqueda}
                onFocus={() => setMostrarEjecutivoLista(true)}
                onChange={(event) => {
                  setEjecutivoBusqueda(event.target.value);
                  setMostrarEjecutivoLista(true);
                }}
                disabled={esEjecutivo}
                title={esEjecutivo ? "Solo puedes ver tus propias solicitudes" : undefined}
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
              />
              {!esEjecutivo && mostrarEjecutivoLista && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                  <div
                    onClick={() => {
                      setEjecutivoId("");
                      setEjecutivoBusqueda("");
                      setMostrarEjecutivoLista(false);
                    }}
                    className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-200">
                    Limpiar selección
                  </div>
                  {ejecutivosFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">Sin resultados</div>
                  ) : (
                    ejecutivosFiltrados.map((ejecutivo) => (
                      <div
                        key={ejecutivo.ejecutivo_id}
                        onClick={() => {
                          setEjecutivoId(String(ejecutivo.ejecutivo_id));
                          setEjecutivoBusqueda(ejecutivo.ejecutivo_nombre);
                          setMostrarEjecutivoLista(false);
                        }}
                        className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-100">
                        {ejecutivo.ejecutivo_nombre}
                      </div>
                    ))
                  )}
                </div>
              )}
            </FilterField>

            <FilterField label="Cliente" className="relative" ref={clienteContainerRef}>
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={clienteBusqueda}
                onFocus={() => setMostrarClienteLista(true)}
                onChange={(event) => {
                  setClienteBusqueda(event.target.value);
                  setMostrarClienteLista(true);
                }}
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {mostrarClienteLista && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                  <div
                    onClick={() => {
                      setClienteId("");
                      setClienteBusqueda("");
                      setMostrarClienteLista(false);
                    }}
                    className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-200">
                    Limpiar selección
                  </div>
                  {clientesFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">Sin resultados</div>
                  ) : (
                    clientesFiltrados.map((cliente) => (
                      <div
                        key={cliente.cli_id}
                        onClick={() => {
                          setClienteId(String(cliente.cli_id));
                          setClienteBusqueda(cliente.cli_razon_social);
                          setMostrarClienteLista(false);
                        }}
                        className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-100">
                        <div>{cliente.cli_razon_social}</div>
                        {cliente.cli_nro_identificacion && (
                          <div className="text-[11px] text-gray-500">NIT {cliente.cli_nro_identificacion}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </FilterField>

            <FilterField label="Fecha de envío desde">
              <input
                type="date"
                value={fechaDesde}
                onChange={(event) => setFechaDesde(event.target.value)}
                max={hoy}
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>

            <FilterField label="Fecha de envío hasta">
              <input
                type="date"
                value={fechaHasta}
                onChange={(event) => setFechaHasta(event.target.value)}
                max={hoy}
                min={fechaDesde || undefined}
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>

            <FilterField label="Estado">
              <select
                value={estadoId}
                onChange={(event) => setEstadoId(event.target.value)}
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                {Object.entries(ESTADOS).map(([id, nombre]) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Etapa Actual">
              <select
                value={etapaId}
                onChange={(event) => setEtapaId(event.target.value)}
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                {etapas.map((item) => (
                  <option key={item.wet_id} value={item.wet_id}>
                    {item.wet_nombre}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Resultado Etapa">
              <select
                value={resultadoId}
                onChange={(event) => setResultadoId(event.target.value)}
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                {resultados.map((item) => (
                  <option key={item.wee_id} value={item.wee_id}>
                    {item.wee_nombre}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Tipo de Solicitud">
              <select
                value={tipoSolicitud}
                onChange={(event) => setTipoSolicitud(event.target.value)}
                className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                <option value="NUEVO">Cliente Nuevo</option>
                <option value="AMPLIACION">Ampliación de Cupo</option>
              </select>
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={limpiarFiltros}
                className="px-6 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded border border-gray-300 bg-white transition-colors inline-flex items-center justify-center gap-2">
                <X className="h-4 w-4" />
                Limpiar
              </button>
              <button
                onClick={buscar}
                disabled={!canSearch || loading}
                className="px-6 py-2 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2">
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </FilterActions>
          </div>

          <div className="flex gap-2 mt-0 justify-end hidden">
            <button
              onClick={limpiarFiltros}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white">
              <X className="h-4 w-4" />
              Limpiar
            </button>
            <button
              onClick={buscar}
              disabled={!canSearch || loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Search className="h-4 w-4" />
              Buscar
            </button>
          </div>
        </PageHeaderCard>

        {!hasSearched ? (
          <EmptyStateCard
            icon={Search}
            title='Selecciona los filtros y haz clic en "Buscar" para ver los resultados.'
          />
        ) : rows.length === 0 ? (
          <EmptyStateCard icon={PackageOpen} title="No hay resultados para los filtros seleccionados." />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <ResultsToolbar count={rows.length} label="solicitud(es) encontrada(s)" onExport={exportarExcelCsv} />
            <TableContainer>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-100">
                  <thead className="bg-gray-50 sticky top-0 z-20">
                    <tr>
                      <Th>No. solicitud</Th>
                      <Th>Tipo</Th>
                      <Th>Ejecutivo</Th>
                      <Th>Cliente</Th>
                      <Th>Fecha de envío</Th>
                      <Th>Fecha de aprobación</Th>
                      <Th>Estado</Th>
                      <Th>Etapa Actual</Th>
                      <Th>Resultado Etapa</Th>
                      <Th>F. Real Ejecutivo de Negocios</Th>
                      <Th>F. Real Auxiliar Servicio al Cliente</Th>
                      <Th>F. Real Cumplimiento</Th>
                      <Th>F. Real Crédito 1</Th>
                      <Th>F. Real Crédito 2</Th>
                      <Th>Cupo Aprobado</Th>
                      <Th>Plazo Pago</Th>
                      <Th>Forma Pago</Th>
                      <Th sticky align="right">
                        Acciones
                      </Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedRows.map((row) => (
                      <Tr key={row.sol_id}>
                        <Td>{row.sol_numero_solicitud || "-"}</Td>
                        <Td>
                          <TipoSolicitudBadge esAmpliacionCupo={row.es_ampliacion_cupo} />
                        </Td>
                        <Td>{row.ejecutivo_nombre || "-"}</Td>
                        <Td>{row.cliente_nombre || "-"}</Td>
                        <Td>{formatDateTime(row.sol_fecha_envio)}</Td>
                        <Td>{formatDateTime(row.sol_fecha_aprobacion)}</Td>
                        <Td>{ESTADOS[row.sol_ses_id] || "Desconocido"}</Td>
                        <Td>{row.etapa_nombre || "-"}</Td>
                        <Td>{row.resultado_nombre || "-"}</Td>
                        <Td>{formatDateTime(row.sol_fecha_gest_ejn)}</Td>
                        <Td>{formatDateTime(row.sol_fecha_gest_asc)}</Td>
                        <Td>{formatDateTime(row.sol_fecha_gest_oc)}</Td>
                        <Td>{formatDateTime(row.sol_fecha_gest_cc1)}</Td>
                        <Td>{formatDateTime(row.sol_fecha_gest_cc2)}</Td>
                        <Td>
                          {row.sol_cupo_aprobado ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                              ${row.sol_cupo_aprobado.toLocaleString("es-CO")}
                            </span>
                          ) : (
                            "-"
                          )}
                        </Td>
                        <Td>{row.sol_plazo_pago || "-"}</Td>
                        <Td>{row.sol_forma_pago || "-"}</Td>
                        <Td sticky align="right" className="border-l border-gray-100">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/solicitudes/${row.sol_id}/detalle`)}
                              aria-label="Ver detalle completo"
                              title="Ver detalle"
                              className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 transition-colors hover:bg-blue-100">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setSlaSolicitud({ numero: row.sol_numero_solicitud })}
                              aria-label="Ver SLA"
                              title="Ver SLA"
                              className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-700 transition-colors hover:bg-amber-100">
                              <Timer className="h-4 w-4" />
                            </button>
                            {esAdmin && (
                              <button
                                onClick={() =>
                                  setSolicitudAEliminar({
                                    sol_id: row.sol_id,
                                    numero: row.sol_numero_solicitud,
                                  })
                                }
                                aria-label="Eliminar solicitud"
                                title="Eliminar solicitud"
                                className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 transition-colors hover:bg-red-100">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TableContainer>

            <TablePagination
              page={currentPage}
              pageSize={pageSize}
              totalItems={rows.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}

        {hasSearched && (
          <div className="grid grid-cols-1 gap-4 mt-6">
            <div className="bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Total resultados</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{rows.length}</p>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!solicitudAEliminar}
        title="Eliminar solicitud"
        message={
          errorEliminar
            ? errorEliminar
            : `¿Deseas eliminar la solicitud ${solicitudAEliminar?.numero || ""}? Esta acción no se puede deshacer: se borran también sus documentos e historial, y el cliente deberá iniciar el proceso nuevamente desde cero (quedará como "Cliente Nuevo", no como Ampliación de Cupo).`
        }
        confirmText="Eliminar"
        isDangerous
        isLoading={eliminando}
        onConfirm={confirmarEliminar}
        onCancel={() => {
          setSolicitudAEliminar(null);
          setErrorEliminar(null);
        }}
      />

      {slaSolicitud && <VerSlaModal numero={slaSolicitud.numero} onClose={() => setSlaSolicitud(null)} />}
    </div>
  );
}
