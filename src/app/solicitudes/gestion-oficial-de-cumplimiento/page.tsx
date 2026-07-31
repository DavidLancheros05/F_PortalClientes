"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { clientesService } from "@/services/clientes/clientes.service";
import {
  centrosOperacionService,
  type CentroOperacion,
} from "@/services/centros-operacion/centros-operacion.service";
import type { ClienteListResponse } from "@/types/api.types";
import { ESTADOS, getEstadoBadgeClass } from "@/lib/workflow-labels";
import { formatDate } from "@/lib/date-utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PackageOpen, ShieldCheck } from "lucide-react";
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
  sol_cliente_id: number;
  cliente_nombre: string;
  sol_co_id: number;
  centro_operacion_nombre: string;
  sol_ejecutivo_id?: number | null;
  ejecutivo_nombre?: string | null;
  sol_estado_id: number;
  sol_etapa_actual_id?: number;
  sol_resultado_etapa_id?: number;
  etapa_nombre?: string;
  resultado_nombre?: string;
  fecha_creacion: string;
  fecha_estimada_respuesta_comercial: string | null;
  fecha_real_respuesta_comercial: string | null;
  consumo_mensual_proyectado: number | null;
  observacionesComercial: string | null;
  sa_sol_id?: number;
  numero_solicitud?: string;
  cliente_id?: number;
  estado_id?: number;
}

interface EjecutivoNegocio {
  ejng_id: number;
  ejng_nombre: string;
}

export default function GestionOficialCumplimientoPage() {
  console.log(
    "[GestionOficial] Página renderizada en:",
    new Date().toISOString(),
  );
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [loadingCentros, setLoadingCentros] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [centros, setCentros] = useState<CentroOperacion[]>([]);
  const [clientes, setClientes] = useState<ClienteListResponse[]>([]);
  const [ejecutivos, setEjecutivos] = useState<EjecutivoNegocio[]>([]);
  // Filtros y página inicializados desde la URL (?centro=&cliente=&ejecutivo=&numero=&pagina=)
  // para que "Volver" desde /gestionar restaure la búsqueda en vez de
  // reiniciar el formulario — antes todo esto vivía solo en useState local,
  // que se perdía al desmontar/remontar la página (mismo patrón que
  // gestion-auxiliar-servicio-al-cliente/page.tsx).
  const [centroSeleccionado, setCentroSeleccionado] = useState<number | null>(
    () => {
      const v = searchParams.get("centro");
      return v ? Number(v) : null;
    },
  );
  const [clienteSeleccionado, setClienteSeleccionado] = useState<
    number | null
  >(() => {
    const v = searchParams.get("cliente");
    return v ? Number(v) : null;
  });
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [ejecutivoSeleccionado, setEjecutivoSeleccionado] = useState<
    number | null
  >(() => {
    const v = searchParams.get("ejecutivo");
    return v ? Number(v) : null;
  });
  const [ejecutivoBusqueda, setEjecutivoBusqueda] = useState("");
  const [numeroFiltro, setNumeroFiltro] = useState(
    () => searchParams.get("numero") || "",
  );
  const [hasSearched, setHasSearched] = useState(false);
  const [paginaActual, setPaginaActual] = useState(() => {
    const v = searchParams.get("pagina");
    return v ? Number(v) : 1;
  });
  const [pageSize, setPageSize] = useState(10);
  const autoBuscoRef = useRef(false);

  useEffect(() => {
    async function cargarCentros() {
      try {
        setLoadingCentros(true);
        const data = await centrosOperacionService.getAll();
        setCentros(data);
      } catch (error) {
        console.error("Error cargando centros:", error);
      } finally {
        setLoadingCentros(false);
      }
    }

    cargarCentros();
  }, []);

  useEffect(() => {
    if (!user?.co_id) return;
    if (centroSeleccionado !== null) return;
    const centroId = Number(user.co_id);
    if (!isNaN(centroId)) {
      setCentroSeleccionado(centroId);
    }
  }, [user?.co_id, centroSeleccionado]);

  useEffect(() => {
    async function cargarClientes() {
      if (!centroSeleccionado) {
        setClientes([]);
        setClienteSeleccionado(null);
        setClienteBusqueda("");
        return;
      }

      try {
        setLoadingClientes(true);
        const data = await clientesService.getAll();
        const filtered = (Array.isArray(data) ? data : []).filter((c: any) => {
          const centroIds = c.centro_operacion_ids || [];
          return centroIds.includes(centroSeleccionado);
        });
        setClientes(filtered);
      } catch (error) {
        console.error("Error cargando clientes:", error);
      } finally {
        setLoadingClientes(false);
      }
    }

    cargarClientes();
  }, [centroSeleccionado]);

  useEffect(() => {
    async function cargarEjecutivos() {
      try {
        const data = await clientesService.getEjecutivosNegocio();
        setEjecutivos(data || []);
      } catch (error) {
        console.error("Error cargando ejecutivos:", error);
      }
    }

    cargarEjecutivos();
  }, []);

  // Si el cliente/ejecutivo llegó preseleccionado desde la URL (?cliente=&
  // ejecutivo=, al volver desde /gestionar), una vez cargado el catálogo
  // correspondiente se resuelve el texto a mostrar en el buscador.
  useEffect(() => {
    if (!clienteSeleccionado || clienteBusqueda) return;
    const match = clientes.find(
      (c) => Number(c.cli_id) === clienteSeleccionado,
    );
    if (match) setClienteBusqueda(match.cli_razon_social);
  }, [clientes, clienteSeleccionado, clienteBusqueda]);

  useEffect(() => {
    if (!ejecutivoSeleccionado || ejecutivoBusqueda) return;
    const match = ejecutivos.find((e) => e.ejng_id === ejecutivoSeleccionado);
    if (match) setEjecutivoBusqueda(match.ejng_nombre);
  }, [ejecutivos, ejecutivoSeleccionado, ejecutivoBusqueda]);

  const clientesFiltrados = useMemo(() => {
    if (!clienteBusqueda) return clientes;
    return clientes.filter((c) =>
      c.cli_razon_social.toLowerCase().includes(clienteBusqueda.toLowerCase()),
    );
  }, [clientes, clienteBusqueda]);

  const ejecutivosFiltrados = useMemo(() => {
    if (!ejecutivoBusqueda) return ejecutivos;
    return ejecutivos.filter((e) =>
      e.ejng_nombre.toLowerCase().includes(ejecutivoBusqueda.toLowerCase()),
    );
  }, [ejecutivos, ejecutivoBusqueda]);

  const obtenerUsuarioId = () => {
    const directId =
      (user as any)?.usr_id ?? (user as any)?.id ?? (user as any)?.usuarioId;
    if (directId) return directId;

    if (typeof window === "undefined") return null;
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    try {
      const parsed = JSON.parse(storedUser);
      return parsed?.usr_id ?? parsed?.id ?? parsed?.usuarioId ?? null;
    } catch {
      return null;
    }
  };

  // Refleja los filtros/página actuales en la URL (sin agregar entradas al
  // historial) para que "Volver" desde /gestionar los pueda restaurar.
  const sincronizarUrl = (pagina: number) => {
    const params = new URLSearchParams();
    params.set("buscado", "1");
    if (centroSeleccionado) params.set("centro", String(centroSeleccionado));
    if (clienteSeleccionado)
      params.set("cliente", String(clienteSeleccionado));
    if (ejecutivoSeleccionado)
      params.set("ejecutivo", String(ejecutivoSeleccionado));
    if (numeroFiltro.trim()) params.set("numero", numeroFiltro.trim());
    params.set("pagina", String(pagina));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const buscar = async (opts: { preservePagina?: boolean } = {}) => {
    try {
      setLoadingSolicitudes(true);
      const usuarioId = obtenerUsuarioId();

      if (!usuarioId) {
        alert("No hay usuario autenticado");
        return;
      }

      const data = await solicitudesService.getSolicitudesParaOC(usuarioId);

      const numeroBuscado = numeroFiltro.trim().toLowerCase();

      const mapped = data
        .map((s: Solicitud) => ({
          ...s,
        }))
        .filter((s: Solicitud) => {
          const cumpleCentro = centroSeleccionado
            ? s.sol_co_id === centroSeleccionado
            : true;
          return cumpleCentro;
        })
        .filter((s: Solicitud) => {
          const cumpleCliente = clienteSeleccionado
            ? s.sol_cliente_id === clienteSeleccionado
            : true;
          return cumpleCliente;
        })
        .filter((s: Solicitud) => {
          const cumpleEjecutivo = ejecutivoSeleccionado
            ? s.sol_ejecutivo_id === ejecutivoSeleccionado
            : true;
          return cumpleEjecutivo;
        })
        .filter((s: Solicitud) => {
          const cumpleNumero = numeroBuscado
            ? (s.sol_numero_solicitud || s.numero_solicitud || "")
                .toLowerCase()
                .includes(numeroBuscado)
            : true;
          return cumpleNumero;
        });

      setSolicitudes(mapped);
      setHasSearched(true);
      const paginaFinal = opts.preservePagina ? paginaActual : 1;
      if (!opts.preservePagina) setPaginaActual(1);
      sincronizarUrl(paginaFinal);
    } catch (error) {
      // console.error("Error buscando solicitudes:", error);
      alert("Error al cargar solicitudes");
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  // Si se vuelve desde /gestionar con una búsqueda ya hecha (marcador
  // "buscado=1" en la URL), repetirla automáticamente para restaurar la
  // tabla en vez de dejar el listado vacío pidiendo buscar de nuevo. El
  // centro es obligatorio para esta búsqueda, así que esperamos a que
  // termine de resolverse el centro por defecto (usuario con co_id) antes de
  // disparar; si el usuario no tiene co_id, no hay nada que esperar.
  useEffect(() => {
    if (autoBuscoRef.current) return;
    if (searchParams.get("buscado") !== "1") return;
    if (!user) return;
    if (centroSeleccionado === null && user?.co_id) return;
    autoBuscoRef.current = true;
    buscar({ preservePagina: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, centroSeleccionado]);

  const irAPagina = (page: number) => {
    setPaginaActual(page);
    sincronizarUrl(page);
  };

  const cambiarPageSize = (size: number) => {
    setPageSize(size);
    irAPagina(1);
  };

  const indiceInicio = (paginaActual - 1) * pageSize;
  const indiceFin = indiceInicio + pageSize;
  const solicitudesActuales = solicitudes.slice(indiceInicio, indiceFin);

  async function exportarExcel() {
    if (solicitudes.length === 0) return;

    const XLSX = await import("xlsx");
    const header = [
      "Numero Solicitud",
      "Centro de Operacion",
      "Cliente",
      "Estado",
      "Etapa Actual",
      "Resultado Etapa",
      "Consumo Proyectado (COP)",
      "Observaciones Ejecutivo",
      "Fecha Estimada Respuesta",
      "Dias Faltantes",
    ];
    const data = solicitudes.map((s) => {
      const fechaEstimada =
        (s as any).sol_fecha_estimada_oficial_cumplimiento ||
        s.fecha_estimada_respuesta_comercial;
      const diasRestantes = calcularDiasRestantes(fechaEstimada);
      return [
        s.sol_numero_solicitud || s.numero_solicitud || "-",
        s.centro_operacion_nombre || "-",
        s.cliente_nombre || "-",
        ESTADOS[s.sol_estado_id ?? s.estado_id] || "Desconocido",
        s.etapa_nombre || "-",
        s.resultado_nombre || "-",
        s.consumo_mensual_proyectado
          ? `$${s.consumo_mensual_proyectado.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "-",
        s.observacionesComercial || "-",
        formatDate(fechaEstimada),
        diasRestantes !== null ? diasRestantes : "-",
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Oficial Cumplimiento");
    XLSX.writeFile(
      wb,
      `solicitudes-oficial-cumplimiento-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  if (loadingCentros) {
    return <LoadingModal isOpen message="Cargando centros..." />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f8fc,#eef1f7)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-[115rem] mx-auto">
        <PageHeaderCard
          icon={ShieldCheck}
          eyebrow="Solicitudes"
          title="Pendientes — Gestión Oficial de Cumplimiento"
          onBack={() => router.back()}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Centro de operacion *
              </label>
              <select
                value={centroSeleccionado ? String(centroSeleccionado) : ""}
                onChange={(e) =>
                  setCentroSeleccionado(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona un centro</option>
                {centros.map((centro, index) => (
                  <option
                    key={`centro-${centro.cop_id}-${index}`}
                    value={String(centro.cop_id)}
                  >
                    {centro.cop_nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <input
                type="text"
                placeholder={
                  !centroSeleccionado
                    ? "Selecciona un centro primero"
                    : "Buscar cliente..."
                }
                value={clienteBusqueda}
                onChange={(e) => {
                  setClienteBusqueda(e.target.value);
                  setClienteSeleccionado(null);
                }}
                disabled={!centroSeleccionado || loadingClientes}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
              />
              {clienteBusqueda && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                  <div
                    onClick={() => {
                      setClienteSeleccionado(null);
                      setClienteBusqueda("");
                    }}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-200"
                  >
                    Limpiar selección
                  </div>
                  {clientesFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Sin resultados
                    </div>
                  ) : (
                    clientesFiltrados.map((cliente) => (
                      <div
                        key={cliente.cli_id}
                        onClick={() => {
                          setClienteSeleccionado(Number(cliente.cli_id));
                          setClienteBusqueda(cliente.cli_razon_social);
                        }}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                      >
                        {cliente.cli_razon_social}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ejecutivo
              </label>
              <input
                type="text"
                placeholder="Buscar ejecutivo..."
                value={ejecutivoBusqueda}
                onChange={(e) => {
                  setEjecutivoBusqueda(e.target.value);
                  setEjecutivoSeleccionado(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {ejecutivoBusqueda && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                  <div
                    onClick={() => {
                      setEjecutivoSeleccionado(null);
                      setEjecutivoBusqueda("");
                    }}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-200"
                  >
                    Limpiar selección
                  </div>
                  {ejecutivosFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Sin resultados
                    </div>
                  ) : (
                    ejecutivosFiltrados.map((ejecutivo) => (
                      <div
                        key={ejecutivo.ejng_id}
                        onClick={() => {
                          setEjecutivoSeleccionado(ejecutivo.ejng_id);
                          setEjecutivoBusqueda(ejecutivo.ejng_nombre);
                        }}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                      >
                        {ejecutivo.ejng_nombre}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numero de solicitud
              </label>
              <input
                type="text"
                value={numeroFiltro}
                onChange={(e) => setNumeroFiltro(e.target.value)}
                placeholder="Ej: SOL-00123"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end justify-end">
              <button
                onClick={() => buscar()}
                disabled={loadingSolicitudes}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buscar
              </button>
            </div>
          </div>
        </PageHeaderCard>

        {loadingSolicitudes ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando solicitudes...</p>
          </div>
        ) : !hasSearched ? (
          <EmptyStateCard
            icon={PackageOpen}
            title="Selecciona un centro y presiona Buscar para ver las solicitudes."
            subtitle="El centro de operación es obligatorio."
          />
        ) : solicitudes.length === 0 ? (
          <EmptyStateCard icon={PackageOpen} title="No se encontraron solicitudes." />
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <ResultsToolbar
                count={solicitudes.length}
                onExport={exportarExcel}
              />
              <TableContainer>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Numero Solicitud
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Centro de Operacion
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Etapa Actual
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Resultado Etapa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Ver Formulario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Consumo Proyectado (COP)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Observaciones Ejecutivo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Fecha Estimada Respuesta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Dias Faltantes
                      </th>
                      <th className="sticky right-0 z-10 bg-gray-50 px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {solicitudesActuales.map((solicitud) => {
                      const fechaEstimada =
                        (solicitud as any)
                          .sol_fecha_estimada_oficial_cumplimiento ||
                        solicitud.fecha_estimada_respuesta_comercial;

                      return (
                        <tr
                          key={solicitud.sol_id ?? solicitud.sa_sol_id}
                          className="group hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {solicitud.sol_numero_solicitud ||
                              solicitud.numero_solicitud}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {solicitud.centro_operacion_nombre}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {solicitud.cliente_nombre}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadgeClass(
                                solicitud.sol_estado_id ?? solicitud.estado_id,
                              )}`}
                            >
                              {ESTADOS[
                                solicitud.sol_estado_id ?? solicitud.estado_id
                              ] || "Desconocido"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {solicitud.etapa_nombre || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {solicitud.resultado_nombre || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() =>
                                router.push(
                                  `/solicitudes/${solicitud.sol_id ?? solicitud.sa_sol_id}`,
                                )
                              }
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              Ver formulario
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {solicitud.consumo_mensual_proyectado
                              ? `$${solicitud.consumo_mensual_proyectado.toLocaleString(
                                  "es-CO",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}`
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {solicitud.observacionesComercial || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(fechaEstimada)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <DiasRestantesBadge fecha={fechaEstimada} />
                          </td>
                          <td className="sticky right-0 z-10 bg-white group-hover:bg-gray-50 px-6 py-4 whitespace-nowrap text-sm font-medium text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">
                            <button
                              onClick={() =>
                                router.push(
                                  `/solicitudes/gestion-oficial-de-cumplimiento/${solicitud.sol_id ?? solicitud.sa_sol_id}/gestionar`,
                                )
                              }
                              className="px-4 py-2 bg-[#003d99] text-white rounded-lg hover:bg-[#0047b3] transition-colors text-sm font-medium"
                            >
                              Gestionar
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
                page={paginaActual}
                pageSize={pageSize}
                totalItems={solicitudes.length}
                onPageChange={irAPagina}
                onPageSizeChange={cambiarPageSize}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
