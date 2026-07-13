"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { getTodayBogota } from "@/lib/date-utils";
import { useSearching } from "@/context/SearchingContext";
import * as XLSX from "xlsx";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Search,
  X,
} from "lucide-react";
import {
  centrosOperacionService,
  type CentroOperacion,
} from "@/services/centros-operacion/centros-operacion.service";
import { clientesService } from "@/services/clientes/clientes.service";
import { solicitudesService } from "@/services/solicitudes.service";
import { ESTADOS, getEstadoBadgeClass } from "@/lib/workflow-labels";

const PAGE_SIZE = 10;

interface Cliente {
  cli_id: number;
  cli_razon_social: string;
}

interface Ejecutivo {
  ejecutivo_id: number;
  ejecutivo_nombre: string;
}

interface SolicitudListado {
  sol_id: number;
  sol_numero_solicitud: string;
  sol_cliente_id: number | null;
  cliente_nombre: string | null;
  sol_ejecutivo_id: number | null;
  ejecutivo_nombre: string | null;
  ejecutivo_area?: string | null;
  auxiliar_id?: number | null;
  auxiliar_nombre?: string | null;
  auxiliar_area?: string | null;
  sol_co_id: number | null;
  centro_operacion_nombre: string | null;
  sol_fecha_creacion: string;
  sol_estado_id: number;
  sol_etapa_actual_id?: number;
  sol_resultado_etapa_id?: number;
  etapa_nombre?: string;
  resultado_nombre?: string;
  sol_formulario_version: number | null;
  sol_fecha_estimada_respuesta_comercial: string | null;
  sol_fecha_real_respuesta_comercial: string | null;
  sol_fecha_estimada_respuesta_financiera: string | null;
  sol_fecha_real_respuesta_financiera: string | null;
  sol_fecha_estimada_oficial_cumplimiento: string | null;
  sol_fecha_real_oficial_cumplimiento: string | null;
  sol_fecha_estimada_comite_credito_1: string | null;
  sol_fecha_real_comite_credito_1: string | null;
  sol_fecha_estimada_comite_credito_2: string | null;
  sol_fecha_real_comite_credito_2: string | null;
  sol_fecha_estimada_ejecutivo?: string | null;
  sol_fecha_real_ejecutivo?: string | null;
  sol_fecha_estimada_auxiliar_servicio_cliente?: string | null;
  sol_fecha_real_auxiliar_servicio_cliente?: string | null;
  sol_fecha_estimada_comite_credito_1_ejecutivo?: string | null;
  sol_fecha_real_comite_credito_1_ejecutivo?: string | null;
  sol_fecha_estimada_comite_credito_2_ejecutivo?: string | null;
  sol_fecha_real_comite_credito_2_ejecutivo?: string | null;
  sol_fecha_estimada_comite_credito_1_auxiliar?: string | null;
  sol_fecha_real_comite_credito_1_auxiliar?: string | null;
  sol_fecha_estimada_comite_credito_2_auxiliar?: string | null;
  sol_fecha_real_comite_credito_2_auxiliar?: string | null;
  sol_cupo_aprobado?: number | null;
  sol_plazo_pago?: number | null;
  sol_forma_pago?: string | null;
  sol_usuario_aprueba_condiciones?: number | null;
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
  const { loading: authLoading } = useContext(AuthContext);
  const { startSearching, stopSearching } = useSearching();

  const hoy = getTodayBogota();

  const [loading, setLoading] = useState(false);
  const [centros, setCentros] = useState<CentroOperacion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ejecutivos, setEjecutivos] = useState<Ejecutivo[]>([]);
  const [etapas, setEtapas] = useState<
    Array<{ wet_id: number; wet_nombre: string }>
  >([]);
  const [resultados, setResultados] = useState<
    Array<{ wee_id: number; wee_nombre: string }>
  >([]);
  const [rows, setRows] = useState<SolicitudListado[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [centroOperacionId, setCentroOperacionId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [ejecutivoId, setEjecutivoId] = useState("");
  const [ejecutivoBusqueda, setEjecutivoBusqueda] = useState("");
  const [estadoId, setEstadoId] = useState("");
  const [etapaId, setEtapaId] = useState("");
  const [resultadoId, setResultadoId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const hasParams = params.size > 0;

    if (params.has("fecha_desde"))
      setFechaDesde(params.get("fecha_desde") || "");
    if (params.has("fecha_hasta"))
      setFechaHasta(params.get("fecha_hasta") || "");
    if (params.has("co_id"))
      setCentroOperacionId(params.get("co_id") || "");
    if (params.has("cliente_id"))
      setClienteId(params.get("cliente_id") || "");
    if (params.has("ejecutivo_id"))
      setEjecutivoId(params.get("ejecutivo_id") || "");
    if (params.has("estado_id"))
      setEstadoId(params.get("estado_id") || "");
    if (params.has("etapa_id"))
      setEtapaId(params.get("etapa_id") || "");
    if (params.has("resultado_etapa_id"))
      setResultadoId(params.get("resultado_etapa_id") || "");

    const wasSearched = params.get("hasSearched") === "true";
    if (wasSearched) setHasSearched(true);

    if (hasParams && wasSearched) {
      ejecutarBusquedaConUrlParams(params);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [centrosData, clientesData, etapasData, resultadosData] =
          await Promise.all([
            centrosOperacionService.getAll(),
            clientesService.getAll(),
            solicitudesService.getEtapas(),
            solicitudesService.getResultados(),
          ]);
        console.log("📋 Respuestas iniciales:", {
          centrosData,
          clientesData,
          etapasData,
          resultadosData,
        });
        setCentros(centrosData);
        setEtapas(etapasData || []);
        setResultados(resultadosData || []);

        const mappedClientes = Array.isArray(clientesData)
          ? clientesData.map((item: any) => ({
              cli_id: Number(item.cli_id ?? item.id ?? 0),
              cli_razon_social: String(item.cli_razon_social ?? ""),
            }))
          : [];
        setClientes(mappedClientes.filter((item: Cliente) => item.cli_id > 0));
      } catch (error) {
        console.error(
          "[SolicitudesListadoDeSolicitudesPage] Error cargando catálogos",
          error,
        );
      }
    }

    if (!authLoading) {
      loadInitialData();
    }
  }, [authLoading]);

  async function ejecutarBusquedaConUrlParams(
    urlParams: URLSearchParams,
  ) {
    try {
      setLoading(true);
      const params: any = {};
      if (urlParams.has("fecha_desde"))
        params.fecha_desde = urlParams.get("fecha_desde");
      if (urlParams.has("fecha_hasta"))
        params.fecha_hasta = urlParams.get("fecha_hasta");
      if (urlParams.has("co_id")) params.co_id = urlParams.get("co_id");
      if (urlParams.has("cliente_id"))
        params.cliente_id = urlParams.get("cliente_id");
      if (urlParams.has("ejecutivo_id"))
        params.ejecutivo_id = urlParams.get("ejecutivo_id");
      if (urlParams.has("estado_id")) params.estado_id = urlParams.get("estado_id");
      if (urlParams.has("etapa_id")) params.etapa_id = urlParams.get("etapa_id");
      if (urlParams.has("resultado_etapa_id"))
        params.resultado_etapa_id = urlParams.get("resultado_etapa_id");

      console.log("🔵 [FRONTEND] Ejecutando búsqueda con URL params:", params);
      const data = await solicitudesService.getListado(params);
      console.log("🔵 [FRONTEND] Resultado de búsqueda con URL params:", data);
      setRows(data);
      setCurrentPage(1);
    } catch (error) {
      console.error(
        "[SolicitudesListadoDeSolicitudesPage] Error consultando listado",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  const clientesFiltrados = useMemo(() => {
    if (!clienteBusqueda) return clientes;
    return clientes.filter((cliente) =>
      cliente.cli_razon_social
        .toLowerCase()
        .includes(clienteBusqueda.toLowerCase())
    );
  }, [clientes, clienteBusqueda]);

  const ejecutivosFiltrados = useMemo(() => {
    if (!ejecutivoBusqueda) return ejecutivos;
    return ejecutivos.filter((ejecutivo) =>
      ejecutivo.ejecutivo_nombre
        .toLowerCase()
        .includes(ejecutivoBusqueda.toLowerCase())
    );
  }, [ejecutivos, ejecutivoBusqueda]);

  const canSearch = useMemo(() => {
    if (fechaDesde && fechaHasta) {
      return fechaDesde <= fechaHasta;
    }
    return true;
  }, [fechaDesde, fechaHasta]);

  const totalPages = useMemo(() => {
    if (rows.length === 0) return 1;
    return Math.ceil(rows.length / PAGE_SIZE);
  }, [rows.length]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, currentPage]);

  const startRow = rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(currentPage * PAGE_SIZE, rows.length);

  async function buscar() {
    console.log("🔴 [FRONTEND] Iniciando búsqueda con filtros:", {
      fechaDesde,
      fechaHasta,
      centroOperacionId,
      clienteId,
      ejecutivoId,
      estadoId,
      etapaId,
      resultadoId,
    });
    try {
      console.log("✅ BOTÓN BUSCAR PRESIONADO");
      startSearching();
      setLoading(true);
      setHasSearched(true);
      const params: any = {};

      console.log("🔴 [FRONTEND] 1️⃣ Iniciando buscar...");
      // console.log("🔴 [FRONTEND] Valores actuales:", {
      //   fechaDesde,
      //   fechaHasta,
      //   centroOperacionId,
      //   clienteId,
      //   ejecutivoId,
      //   estadoId,
      //   etapaId,
      //   resultadoId,
      // });

      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      if (centroOperacionId) params.co_id = centroOperacionId;
      if (clienteId) params.cliente_id = clienteId;
      if (ejecutivoId) params.ejecutivo_id = ejecutivoId;
      if (estadoId) params.estado_id = estadoId;
      if (etapaId) params.etapa_id = etapaId;
      if (resultadoId) params.resultado_etapa_id = resultadoId;

      // console.log("🔴 [FRONTEND] 2️⃣ Parámetros construidos:", params);

      const data = await solicitudesService.getListado(params);
      console.log("📊 DATOS RECIBIDOS DEL BACKEND:", data);
      console.log("📊 CANTIDAD DE REGISTROS:", Array.isArray(data) ? data.length : "NO ES ARRAY");
      setRows(data);
      setCurrentPage(1);

      const urlParams = new URLSearchParams();
      if (fechaDesde) urlParams.set("fecha_desde", fechaDesde);
      if (fechaHasta) urlParams.set("fecha_hasta", fechaHasta);
      if (centroOperacionId) urlParams.set("co_id", centroOperacionId);
      if (clienteId) urlParams.set("cliente_id", clienteId);
      if (ejecutivoId) urlParams.set("ejecutivo_id", ejecutivoId);
      if (estadoId) urlParams.set("estado_id", estadoId);
      if (etapaId) urlParams.set("etapa_id", etapaId);
      if (resultadoId) urlParams.set("resultado_etapa_id", resultadoId);
      urlParams.set("hasSearched", "true");
      window.history.replaceState(null, "", `?${urlParams.toString()}`);
    } catch (error) {
      console.error(
        "[SolicitudesListadoDeSolicitudesPage] Error consultando listado",
        error,
      );
    } finally {
      setLoading(false);
      stopSearching();
    }
  }

  function limpiarFiltros() {
    setFechaDesde("");
    setFechaHasta("");
    setCentroOperacionId("");
    setClienteId("");
    setClienteBusqueda("");
    setEjecutivoId("");
    setEjecutivoBusqueda("");
    setEstadoId("");
    setEtapaId("");
    setResultadoId("");
    setRows([]);
    setCurrentPage(1);
    setHasSearched(false);
    window.history.replaceState(null, "", "?");
  }

  function exportarExcelCsv() {
    if (rows.length === 0) return;

    const header = [
      "No. solicitud",
      "Cliente",
      "Ejecutivo de negocios",
      "Área Ejecutivo",
      "Auxiliar Serv. Cliente",
      "Área Auxiliar",
      "Centro de operación",
      "Fecha de creación",
      "Estado",
      "Etapa Actual",
      "Resultado Etapa",
      "Cupo Aprobado",
      "Plazo Pago",
      "Forma Pago",
      "F. Est. Ejecutivo de Negocios",
      "F. Real Ejecutivo de Negocios",
      "F. Est. Auxiliar Servicio al Cliente",
      "F. Real Auxiliar Servicio al Cliente",
      "Fecha estimada de respuesta financiera",
      "Fecha real de respuesta financiera",
      "Fecha estimada oficial cumplimiento",
      "Fecha real oficial cumplimiento",
    ];

    const data = rows.map((row) => [
      row.sol_numero_solicitud,
      row.cliente_nombre || "-",
      row.ejecutivo_nombre || "-",
      row.ejecutivo_area || "-",
      row.auxiliar_nombre || "-",
      row.auxiliar_area || "-",
      row.centro_operacion_nombre || "-",
      formatDateTime(row.sol_fecha_creacion),
      ESTADOS[row.sol_estado_id] || "Desconocido",
      row.etapa_nombre || "-",
      row.resultado_nombre || "-",
      row.sol_cupo_aprobado ? `$${row.sol_cupo_aprobado.toLocaleString("es-CO")}` : "-",
      row.sol_plazo_pago || "-",
      row.sol_forma_pago || "-",
      formatDateTime(row.sol_fecha_estimada_ejecutivo),
      formatDateTime(row.sol_fecha_real_ejecutivo),
      formatDateTime(row.sol_fecha_estimada_auxiliar_servicio_cliente),
      formatDateTime(row.sol_fecha_real_auxiliar_servicio_cliente),
      formatDateTime(row.sol_fecha_estimada_respuesta_financiera),
      formatDateTime(row.sol_fecha_real_respuesta_financiera),
      formatDateTime(row.sol_fecha_estimada_oficial_cumplimiento),
      formatDateTime(row.sol_fecha_real_oficial_cumplimiento),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Solicitudes");

    XLSX.writeFile(wb, `listado-solicitudes-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-[95rem] mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg mb-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <button
                onClick={() => router.push("/solicitudes")}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-3"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a solicitudes
              </button>
              <p className="text-2xl md:text-3xl font-bold text-blue-800 mb-4 leading-tight">
                Listado de solicitudes 1
              </p>
            </div>

            <div className="px-6 py-4 bg-blue-50/40">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Centro de operación
                  </label>
                  <select
                    value={centroOperacionId}
                    onChange={(event) =>
                      setCentroOperacionId(event.target.value)
                    }
                    className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    {centros.map((item) => (
                      <option key={item.cop_id} value={item.cop_id}>
                        {item.cop_nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Cliente
                  </label>
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={clienteBusqueda}
                    onChange={(event) => setClienteBusqueda(event.target.value)}
                    className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {clienteBusqueda && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                      <div
                        onClick={() => {
                          setClienteId("");
                          setClienteBusqueda("");
                        }}
                        className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-200"
                      >
                        Limpiar selección
                      </div>
                      {clientesFiltrados.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-500">
                          Sin resultados
                        </div>
                      ) : (
                        clientesFiltrados.map((cliente) => (
                          <div
                            key={cliente.cli_id}
                            onClick={() => {
                              setClienteId(String(cliente.cli_id));
                              setClienteBusqueda(cliente.cli_razon_social);
                            }}
                            className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                          >
                            {cliente.cli_razon_social}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Ejecutivo
                  </label>
                  <input
                    type="text"
                    placeholder="Buscar ejecutivo..."
                    value={ejecutivoBusqueda}
                    onChange={(event) => setEjecutivoBusqueda(event.target.value)}
                    className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {ejecutivoBusqueda && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                      <div
                        onClick={() => {
                          setEjecutivoId("");
                          setEjecutivoBusqueda("");
                        }}
                        className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-200"
                      >
                        Limpiar selección
                      </div>
                      {ejecutivosFiltrados.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-500">
                          Sin resultados
                        </div>
                      ) : (
                        ejecutivosFiltrados.map((ejecutivo) => (
                          <div
                            key={ejecutivo.ejecutivo_id}
                            onClick={() => {
                              setEjecutivoId(String(ejecutivo.ejecutivo_id));
                              setEjecutivoBusqueda(ejecutivo.ejecutivo_nombre);
                            }}
                            className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                          >
                            {ejecutivo.ejecutivo_nombre}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Fecha desde
                  </label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(event) => setFechaDesde(event.target.value)}
                    max={hoy}
                    className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Fecha hasta
                  </label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(event) => setFechaHasta(event.target.value)}
                    max={hoy}
                    min={fechaDesde || undefined}
                    className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Estado
                  </label>
                  <select
                    value={estadoId}
                    onChange={(event) => setEstadoId(event.target.value)}
                    className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    {Object.entries(ESTADOS).map(([id, nombre]) => (
                      <option key={id} value={id}>
                        {nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Etapa Actual
                  </label>
                  <select
                    value={etapaId}
                    onChange={(event) => setEtapaId(event.target.value)}
                    className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    {etapas.map((item) => (
                      <option key={item.wet_id} value={item.wet_id}>
                        {item.wet_nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Resultado Etapa
                  </label>
                  <select
                    value={resultadoId}
                    onChange={(event) => setResultadoId(event.target.value)}
                    className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    {resultados.map((item) => (
                      <option key={item.wee_id} value={item.wee_id}>
                        {item.wee_nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 md:col-span-3 lg:col-span-4 flex flex-col gap-2 justify-center">
                  <label className="block text-xs font-semibold text-gray-600 mb-2 text-center">
                    &nbsp;
                  </label>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={limpiarFiltros}
                      className="px-6 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded border border-gray-300 bg-white transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Limpiar
                    </button>
                    <button
                      onClick={buscar}
                      disabled={!canSearch || loading}
                      className="px-6 py-2 text-xs font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <Search className="h-4 w-4" />
                      Buscar
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-0 justify-end hidden">
                <button
                  onClick={limpiarFiltros}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </button>
                <button
                  onClick={buscar}
                  disabled={!canSearch || loading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
              </div>
            </div>
          </div>

          {!hasSearched ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-400">🔍</span>
              </div>
              <p className="text-gray-600">
                Selecciona los filtros y haz clic en "Buscar" para ver los
                resultados.
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-400">📭</span>
              </div>
              <p className="text-gray-600">
                No hay resultados para los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50/40">
                
                <p className="text-sm text-slate-500 mt-0.5">
                  {rows.length} solicitud{rows.length !== 1 ? "es" : ""}{" "}
                  encontrada{rows.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-100">
                  <thead className="bg-blue-100 sticky top-0 z-20">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Centro de operación
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        No. solicitud
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Fecha y Hora de creación
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Etapa Actual
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Resultado Etapa
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        F. Est. Ejecutivo de Negocios
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        F. Real Ejecutivo de Negocios
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        F. Est. Auxiliar Servicio al Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        F. Real Auxiliar Servicio al Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        F. Est. Cumplimiento
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        F. Real Cumplimiento
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        F. Est. Crédito 1
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        F. Real Crédito 1
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        F. Est. Crédito 2
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        F. Real Crédito 2
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Cupo Aprobado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Plazo Pago
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Forma Pago
                      </th>
                      <th className="sticky right-0 z-10 px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200 bg-blue-100">
                        Detalle Solicitud
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedRows.map((row) => (
                      <tr key={row.sol_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row.centro_operacion_nombre || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row.sol_numero_solicitud || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row.cliente_nombre || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateTime(row.sol_fecha_creacion)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {ESTADOS[row.sol_estado_id] || "Desconocido"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row.etapa_nombre || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row.resultado_nombre || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateTime(row.sol_fecha_estimada_ejecutivo)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateTime(row.sol_fecha_real_ejecutivo)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateTime(
                            row.sol_fecha_estimada_auxiliar_servicio_cliente,
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateTime(
                            row.sol_fecha_real_auxiliar_servicio_cliente,
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateTime(
                            row.sol_fecha_estimada_oficial_cumplimiento,
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateTime(
                            row.sol_fecha_real_oficial_cumplimiento,
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateTime(
                            row.sol_fecha_estimada_comite_credito_1,
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateTime(row.sol_fecha_real_comite_credito_1)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateTime(
                            row.sol_fecha_estimada_comite_credito_2,
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateTime(row.sol_fecha_real_comite_credito_2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row.sol_cupo_aprobado ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                              ${row.sol_cupo_aprobado.toLocaleString("es-CO")}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row.sol_plazo_pago || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {row.sol_forma_pago || "-"}
                        </td>
                        <td className="sticky right-0 z-10 px-4 py-3 text-sm bg-white border-l border-gray-100">
                          <button
                            onClick={() =>
                              router.push(`/solicitudes/${row.sol_id}/detalle`)
                            }
                            aria-label="Ver detalle completo"
                            title="Ver detalle"
                            className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 transition-colors hover:bg-blue-100"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Mostrando {startRow} - {endRow} de {rows.length} resultados
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </button>
                  <span className="text-sm font-semibold text-gray-700 px-2">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-slate-50 flex justify-end">
                <button
                  onClick={exportarExcelCsv}
                  disabled={rows.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar a Excel
                </button>
              </div>
            </div>
          )}

          {hasSearched && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Total resultados
                </p>
                <p className="text-2xl font-semibold text-slate-800 mt-1">
                  {rows.length}
                </p>
              </div>
              <div className="bg-white/80 border border-emerald-100 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wider text-emerald-600 font-semibold">
                  Con cliente
                </p>
                <p className="text-2xl font-semibold text-emerald-700 mt-1">
                  {rows.filter((row) => !!row.cliente_nombre).length}
                </p>
              </div>
              <div className="bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Con ejecutivo
                </p>
                <p className="text-2xl font-semibold text-slate-700 mt-1">
                  {rows.filter((row) => !!row.ejecutivo_nombre).length}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
