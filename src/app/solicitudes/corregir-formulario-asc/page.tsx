"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { clientesService } from "@/services/clientes/clientes.service";
import type { ClienteListResponse } from "@/types/api.types";
import { ESTADOS, getEstadoBadgeClass } from "@/lib/workflow-labels";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Edit2, Eye, FileEdit, Search, X } from "lucide-react";
import { TablePagination } from "@/components/tables/TablePagination";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { ErrorModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { TableContainer } from "@/components/tables/TableContainer";

interface Solicitud {
  sol_id: number;
  sol_numero_solicitud: string;
  sol_cliente_id: number;
  cliente_nombre: string;
  sol_co_id: number;
  centro_operacion_nombre: string;
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

export default function CorregirFormularioASCPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clientes, setClientes] = useState<ClienteListResponse[]>([]);
  // Filtros y página inicializados desde la URL (?cliente=&numero=&pagina=)
  // para que "Ver"/"Corregir documentos" y volver restaure la búsqueda en
  // vez de reiniciarla — mismo patrón que gestion-auxiliar-servicio-al-cliente.
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(() => {
    const v = searchParams.get("cliente");
    return v ? Number(v) : null;
  });
  const [numeroFiltro, setNumeroFiltro] = useState(() => searchParams.get("numero") || "");
  const [hasSearched, setHasSearched] = useState(false);
  const [paginaActual, setPaginaActual] = useState(() => {
    const v = searchParams.get("pagina");
    return v ? Number(v) : 1;
  });
  const [pageSize, setPageSize] = useState(10);
  const autoBuscoRef = useRef(false);

  useEffect(() => {
    async function cargarClientes() {
      try {
        setLoadingClientes(true);
        const data = await clientesService.getAll();
        setClientes(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error cargando clientes:", error);
      } finally {
        setLoadingClientes(false);
      }
    }

    cargarClientes();
  }, []);

  const obtenerUsuarioId = () => {
    const directId = (user as any)?.usr_id ?? (user as any)?.id ?? (user as any)?.usuarioId;
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

  const calcularDiasRestantes = (fecha?: string | null) => {
    if (!fecha) return null;
    const hoy = new Date();
    const objetivo = new Date(fecha);
    const diffMs = objetivo.setHours(0, 0, 0, 0) - hoy.setHours(0, 0, 0, 0);
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const indiceInicio = (paginaActual - 1) * pageSize;
  const indiceFin = indiceInicio + pageSize;
  const solicitudesActuales = solicitudes.slice(indiceInicio, indiceFin);

  // Refleja los filtros/página actuales en la URL (sin agregar entradas al
  // historial) para que "Ver"/"Corregir documentos" los puedan restaurar al
  // volver.
  const sincronizarUrl = (pagina: number) => {
    const params = new URLSearchParams();
    params.set("buscado", "1");
    if (clienteSeleccionado) params.set("cliente", String(clienteSeleccionado));
    if (numeroFiltro.trim()) params.set("numero", numeroFiltro.trim());
    params.set("pagina", String(pagina));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const buscar = async (opts: { preservePagina?: boolean } = {}) => {
    try {
      setLoadingSolicitudes(true);
      const usuarioId = obtenerUsuarioId();

      if (!usuarioId) {
        setErrorMessage("No hay usuario autenticado");
        return;
      }

      // Buscar solicitudes con estado=3, etapa=3, resultado=3 (RECHAZADO)
      const data = await solicitudesService.getSolicitudesConFiltros(usuarioId, {
        estado_id: 3, // REVISIÓN
        etapa_id: 3, // ASC
        resultado_etapa_id: 3, // RECHAZADO
      });

      const numeroBuscado = numeroFiltro.trim().toLowerCase();

      const mapped = data
        .map((s: Solicitud) => ({
          ...s,
        }))
        .filter((s: Solicitud) => {
          const cumpleCliente = clienteSeleccionado ? s.sol_cliente_id === clienteSeleccionado : true;
          return cumpleCliente;
        })
        .filter((s: Solicitud) => {
          const cumpleNumero = numeroBuscado
            ? (s.sol_numero_solicitud || s.numero_solicitud || "").toLowerCase().includes(numeroBuscado)
            : true;
          return cumpleNumero;
        });

      setSolicitudes(mapped);
      setHasSearched(true);
      const paginaFinal = opts.preservePagina ? paginaActual : 1;
      if (!opts.preservePagina) setPaginaActual(1);
      sincronizarUrl(paginaFinal);
    } catch (error) {
      console.error("Error buscando solicitudes:", error);
      setErrorMessage("Error al cargar solicitudes");
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  // Si se vuelve desde "Ver"/"Corregir documentos" con una búsqueda ya hecha
  // (marcador "buscado=1" en la URL), repetirla automáticamente para
  // restaurar la tabla en vez de dejarla vacía pidiendo buscar de nuevo.
  useEffect(() => {
    if (autoBuscoRef.current) return;
    if (searchParams.get("buscado") !== "1") return;
    if (!user) return;
    autoBuscoRef.current = true;
    buscar({ preservePagina: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const limpiarFiltros = () => {
    setClienteSeleccionado(null);
    setNumeroFiltro("");
    setHasSearched(false);
    setSolicitudes([]);
    router.replace(pathname);
  };

  const irAPagina = (page: number) => {
    setPaginaActual(page);
    sincronizarUrl(page);
  };

  const cambiarPageSize = (size: number) => {
    setPageSize(size);
    irAPagina(1);
  };

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
      "Fecha Creación",
    ];
    const data = solicitudes.map((s) => [
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
      s.fecha_creacion ? new Date(s.fecha_creacion).toLocaleDateString("es-CO") : "-",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Corregir ASC");
    XLSX.writeFile(wb, `solicitudes-corregir-asc-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeaderCard
          icon={FileEdit}
          eyebrow="Solicitudes"
          title="Pendientes de Corrección por el Auxiliar"
          subtitle={`Revisa las solicitudes que fueron rechazadas con modo de solución "Auxiliar Actualiza" — el cliente no puede tocarlas, corrígelas tú aquí`}
          onBack={() => router.back()}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FilterField label="Cliente">
              <select
                value={clienteSeleccionado ?? ""}
                onChange={(e) => setClienteSeleccionado(e.target.value === "" ? null : Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                disabled={loadingClientes}>
                <option value="">Todos los clientes</option>
                {clientes.map((cliente, index) => (
                  <option key={`cliente-${cliente.cli_id}-${index}`} value={cliente.cli_id}>
                    {cliente.cli_razon_social}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Número de solicitud">
              <input
                type="text"
                value={numeroFiltro}
                onChange={(e) => setNumeroFiltro(e.target.value)}
                placeholder="Ej: 40"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={limpiarFiltros}
                disabled={loadingSolicitudes}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                <X className="h-4 w-4" />
                Limpiar
              </button>
              <button
                onClick={() => buscar()}
                disabled={loadingSolicitudes}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Search className="h-4 w-4" />
                {loadingSolicitudes ? "Buscando..." : "Buscar"}
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        <div className="mt-4">
          {loadingSolicitudes ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando solicitudes...</p>
            </div>
          ) : !hasSearched ? (
            <EmptyStateCard icon={FileEdit} title="Presiona Buscar para ver las solicitudes" />
          ) : solicitudes.length === 0 ? (
            <EmptyStateCard icon={FileEdit} title="No se encontraron solicitudes pendientes de corrección" />
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <ResultsToolbar count={solicitudes.length} onExport={exportarExcel} />
                <TableContainer>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <Th>Numero Solicitud</Th>
                          {/* <Th>Centro de Operacion</Th> */}
                          <Th>Cliente</Th>
                          <Th>Estado</Th>
                          <Th>Etapa Actual</Th>
                          <Th>Resultado Etapa</Th>
                          <Th>Consumo Proyectado (COP)</Th>
                          <Th>Observaciones Ejecutivo</Th>
                          <Th>Fecha Creación</Th>
                          <Th align="center">Ver</Th>
                          <Th align="center">Editar</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {solicitudesActuales.map((solicitud) => {
                          return (
                            <Tr key={solicitud.sol_id ?? solicitud.sa_sol_id}>
                              <Td className="whitespace-nowrap font-medium text-brand-600">
                                {solicitud.sol_numero_solicitud || solicitud.numero_solicitud}
                              </Td>
                              {/* <Td className="whitespace-nowrap">
                            {solicitud.centro_operacion_nombre}
                          </Td> */}
                              <Td className="whitespace-nowrap">{solicitud.cliente_nombre}</Td>
                              <Td className="whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                    (solicitud.sol_estado_id ?? solicitud.estado_id) === 1
                                      ? "bg-yellow-100 text-yellow-800"
                                      : (solicitud.sol_estado_id ?? solicitud.estado_id) === 2
                                        ? "bg-blue-100 text-blue-800"
                                        : (solicitud.sol_estado_id ?? solicitud.estado_id) === 3
                                          ? "bg-green-100 text-green-800"
                                          : (solicitud.sol_estado_id ?? solicitud.estado_id) === 4
                                            ? "bg-purple-100 text-purple-800"
                                            : "bg-gray-100 text-gray-800"
                                  }`}>
                                  {ESTADOS[solicitud.sol_estado_id ?? solicitud.estado_id] || "Desconocido"}
                                </span>
                              </Td>
                              <Td className="whitespace-nowrap">{solicitud.etapa_nombre || "-"}</Td>
                              <Td className="whitespace-nowrap">{solicitud.resultado_nombre || "-"}</Td>
                              <Td className="whitespace-nowrap">
                                {solicitud.consumo_mensual_proyectado
                                  ? `$${solicitud.consumo_mensual_proyectado.toLocaleString("es-CO", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}`
                                  : "-"}
                              </Td>
                              <Td className="whitespace-nowrap">{solicitud.observacionesComercial || "-"}</Td>
                              <Td className="whitespace-nowrap">
                                {solicitud.fecha_creacion
                                  ? new Date(solicitud.fecha_creacion).toLocaleDateString("es-CO")
                                  : "-"}
                              </Td>
                              <Td align="center" className="whitespace-nowrap">
                                <button
                                  onClick={() =>
                                    router.push(`/solicitudes/${solicitud.sol_id ?? solicitud.sa_sol_id}?mode=view`)
                                  }
                                  className="text-gray-600 hover:text-brand-600 transition-colors"
                                  title="Ver formulario">
                                  <Eye size={18} />
                                </button>
                              </Td>
                              <Td align="center" className="whitespace-nowrap">
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/solicitudes/mis-documentos?solicitudId=${solicitud.sol_id ?? solicitud.sa_sol_id}`,
                                    )
                                  }
                                  className="text-brand-600 hover:text-brand-700 transition-colors"
                                  title="Corregir documentos">
                                  <Edit2 size={18} />
                                </button>
                              </Td>
                            </Tr>
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

      <ErrorModal isOpen={!!errorMessage} message={errorMessage || ""} onAction={() => setErrorMessage(null)} />
    </div>
  );
}
