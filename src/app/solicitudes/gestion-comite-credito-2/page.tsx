"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { clientesService } from "@/services/clientes/clientes.service";
import type { ClienteListResponse } from "@/types/api.types";
import { ESTADOS, getEstadoBadgeClass } from "@/lib/workflow-labels";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Landmark, PackageOpen } from "lucide-react";
import { TablePagination } from "@/components/tables/TablePagination";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { TableContainer } from "@/components/tables/TableContainer";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { ClienteFilterField } from "@/components/filters/ClienteFilterField";
import { SuggestField } from "@/components/filters/SuggestField";
import { FilterActions } from "@/components/filters/FilterActions";
import { calcularDiasRestantes, DiasRestantesBadge } from "@/components/badges/DiasRestantesBadge";
import { TipoSolicitudBadge } from "@/components/badges/TipoSolicitudBadge";
import { getTipoSolicitud } from "@/lib/tipo-solicitud.util";
import { ErrorModal } from "@/components/modals";

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
  sol_fecha_envio?: string | null;
  // Fecha en que Comité de Crédito 1 (etapa anterior a Comité de Crédito 2
  // en el flujo) registró su gestión.
  sol_fecha_real_comite_credito_1?: string | null;
  consumo_mensual_proyectado: number | null;
  observacionesComercial: string | null;
  sol_cupo_solicitado?: number | null;
  es_ampliacion_cupo?: boolean | number | null;
  sa_sol_id?: number;
  numero_solicitud?: string;
  cliente_id?: number;
  estado_id?: number;
}

export default function GestionComiteCredito2Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteListResponse[]>([]);
  // Filtros y página inicializados desde la URL (?cliente=&numero=&pagina=)
  // para que "Volver" desde /gestionar restaure la búsqueda en vez de
  // reiniciar el formulario — antes todo esto vivía solo en useState local,
  // que se perdía al desmontar/remontar la página (mismo patrón que
  // gestion-auxiliar-servicio-al-cliente/page.tsx).
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(() => {
    const v = searchParams.get("cliente");
    return v ? Number(v) : null;
  });
  const [numeroFiltro, setNumeroFiltro] = useState(() => searchParams.get("numero") || "");
  const [tipoSolicitudFiltro, setTipoSolicitudFiltro] = useState(() => searchParams.get("tipo") || "");
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

  // Refleja los filtros/página actuales en la URL (sin agregar entradas al
  // historial) para que "Volver" desde /gestionar los pueda restaurar.
  const sincronizarUrl = (pagina: number) => {
    const params = new URLSearchParams();
    params.set("buscado", "1");
    if (clienteSeleccionado) params.set("cliente", String(clienteSeleccionado));
    if (numeroFiltro.trim()) params.set("numero", numeroFiltro.trim());
    if (tipoSolicitudFiltro) params.set("tipo", tipoSolicitudFiltro);
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

      const data = await solicitudesService.getSolicitudesParaComiteCredito2(usuarioId);

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
        })
        .filter((s: Solicitud) => {
          const cumpleTipo = tipoSolicitudFiltro
            ? getTipoSolicitud(s.es_ampliacion_cupo) ===
              (tipoSolicitudFiltro === "AMPLIACION" ? "Ampliación de Cupo" : "Cliente Nuevo")
            : true;
          return cumpleTipo;
        });

      setSolicitudes(mapped);
      setHasSearched(true);
      const paginaFinal = opts.preservePagina ? paginaActual : 1;
      if (!opts.preservePagina) setPaginaActual(1);
      sincronizarUrl(paginaFinal);
    } catch (error) {
      // console.error("Error buscando solicitudes:", error);
      setErrorMessage("Error al cargar solicitudes");
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  // Si se vuelve desde /gestionar con una búsqueda ya hecha (marcador
  // "buscado=1" en la URL), repetirla automáticamente para restaurar la
  // tabla en vez de dejar el listado vacío pidiendo buscar de nuevo.
  useEffect(() => {
    if (autoBuscoRef.current) return;
    if (searchParams.get("buscado") !== "1") return;
    if (!user) return;
    autoBuscoRef.current = true;
    buscar({ preservePagina: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  // Pool crudo de sugerencias para el campo de número de solicitud — se
  // arma antes de aplicar el filtro de texto (buscar() ya filtra por
  // numeroFiltro al construir `solicitudes`, pero mientras no se haya
  // acotado por número, este array sigue siendo el listado completo).
  const numeroSugerencias = useMemo(
    () => solicitudes.map((s) => s.sol_numero_solicitud || s.numero_solicitud || ""),
    [solicitudes],
  );

  async function exportarExcel() {
    if (solicitudes.length === 0) return;

    const XLSX = await import("xlsx");
    const header = [
      "Numero Solicitud",
      "Tipo",
      "Centro de Operacion",
      "Cliente",
      "Estado",
      "Etapa Actual",
      "Resultado Etapa",
      "Consumo Proyectado (COP)",
      "Observaciones Ejecutivo",
      "Fecha de Envío",
      "Fecha Gestión Comité de Crédito 1",
      "Fecha Estimada Respuesta",
      "Dias Faltantes",
    ];
    const data = solicitudes.map((s) => {
      const fechaEstimada = (s as any).sol_fecha_estimada_comite_credito_2 || s.fecha_estimada_respuesta_comercial;
      const diasRestantes = calcularDiasRestantes(fechaEstimada);
      return [
        s.sol_numero_solicitud || s.numero_solicitud || "-",
        getTipoSolicitud(s.es_ampliacion_cupo),
        s.centro_operacion_nombre || "-",
        s.cliente_nombre || "-",
        ESTADOS[s.sol_estado_id ?? s.estado_id] || "Desconocido",
        s.etapa_nombre || "-",
        s.resultado_nombre || "-",
        s.consumo_mensual_proyectado
          ? `$${s.consumo_mensual_proyectado.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "-",
        s.observacionesComercial || "-",
        formatDateTime(s.sol_fecha_envio),
        formatDateTime(s.sol_fecha_real_comite_credito_1),
        formatDate(fechaEstimada),
        diasRestantes !== null ? diasRestantes : "-",
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comité Crédito 2");
    XLSX.writeFile(wb, `solicitudes-comite-credito-2-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-[115rem] mx-auto">
        <PageHeaderCard
          icon={Landmark}
          eyebrow="Solicitudes"
          title="Pendientes — Gestión Comité de Crédito 2"
          onBack={() => router.back()}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ClienteFilterField
              clientes={clientes}
              value={clienteSeleccionado ? String(clienteSeleccionado) : ""}
              onChange={(cliId) => setClienteSeleccionado(cliId ? Number(cliId) : null)}
              disabled={loadingClientes}
            />
            <SuggestField
              label="Numero de solicitud"
              placeholder="Ej: 40"
              value={numeroFiltro}
              onChange={setNumeroFiltro}
              suggestions={numeroSugerencias}
              onEnter={() => buscar()}
            />
            <FilterField label="Tipo de Solicitud">
              <select
                value={tipoSolicitudFiltro}
                onChange={(event) => setTipoSolicitudFiltro(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                <option value="NUEVO">Cliente Nuevo</option>
                <option value="AMPLIACION">Ampliación de Cupo</option>
              </select>
            </FilterField>
            <FilterActions className="col-span-full">
              <button
                onClick={() => buscar()}
                disabled={loadingSolicitudes}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Buscar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {loadingSolicitudes ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando solicitudes...</p>
          </div>
        ) : !hasSearched ? (
          <EmptyStateCard icon={PackageOpen} title="Presiona Buscar para cargar tus solicitudes pendientes." />
        ) : solicitudes.length === 0 ? (
          <EmptyStateCard icon={PackageOpen} title="No se encontraron solicitudes." />
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <ResultsToolbar count={solicitudes.length} onExport={exportarExcel} />
              <TableContainer>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <Th>Numero Solicitud</Th>
                        <Th>Tipo</Th>
                        {/* <Th>Centro de Operacion</Th> */}
                        <Th>Cliente</Th>
                        <Th>Estado</Th>
                        <Th>Etapa Actual</Th>
                        <Th>Resultado Etapa</Th>
                        <Th>Ver Formulario</Th>
                        <Th>Consumo Proyectado (COP)</Th>
                        <Th>Observaciones Ejecutivo</Th>
                        <Th>Fecha de Envío</Th>
                        <Th>Fecha Gestión Comité de Crédito 1</Th>
                        <Th>Fecha Estimada Respuesta</Th>
                        <Th>Dias Faltantes</Th>
                        <Th sticky align="right">
                          Acción
                        </Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {solicitudesActuales.map((solicitud) => {
                        const fechaEstimada =
                          (solicitud as any).sol_fecha_estimada_comite_credito_2 ||
                          solicitud.fecha_estimada_respuesta_comercial;

                        return (
                          <Tr key={solicitud.sol_id ?? solicitud.sa_sol_id}>
                            <Td className="whitespace-nowrap font-medium text-blue-600">
                              {solicitud.sol_numero_solicitud || solicitud.numero_solicitud}
                            </Td>
                            <Td className="whitespace-nowrap">
                              <TipoSolicitudBadge esAmpliacionCupo={solicitud.es_ampliacion_cupo} />
                            </Td>
                            {/* <Td className="whitespace-nowrap">
                            {solicitud.centro_operacion_nombre}
                          </Td> */}
                            <Td className="whitespace-nowrap">{solicitud.cliente_nombre}</Td>
                            <Td className="whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadgeClass(
                                  solicitud.sol_estado_id ?? solicitud.estado_id,
                                )}`}>
                                {ESTADOS[solicitud.sol_estado_id ?? solicitud.estado_id] || "Desconocido"}
                              </span>
                            </Td>
                            <Td className="whitespace-nowrap">{solicitud.etapa_nombre || "-"}</Td>
                            <Td className="whitespace-nowrap">{solicitud.resultado_nombre || "-"}</Td>
                            <Td className="whitespace-nowrap font-medium">
                              <button
                                onClick={() => router.push(`/solicitudes/${solicitud.sol_id ?? solicitud.sa_sol_id}`)}
                                className="text-blue-600 hover:text-blue-800 transition-colors">
                                Ver formulario
                              </button>
                            </Td>
                            <Td className="whitespace-nowrap">
                              {solicitud.consumo_mensual_proyectado
                                ? `$${solicitud.consumo_mensual_proyectado.toLocaleString("es-CO", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}`
                                : "-"}
                            </Td>
                            <Td className="whitespace-nowrap">{solicitud.observacionesComercial || "-"}</Td>
                            <Td className="whitespace-nowrap">{formatDateTime(solicitud.sol_fecha_envio)}</Td>
                            <Td className="whitespace-nowrap">
                              {formatDateTime(solicitud.sol_fecha_real_comite_credito_1)}
                            </Td>
                            <Td className="whitespace-nowrap">{formatDate(fechaEstimada)}</Td>
                            <Td className="whitespace-nowrap">
                              <DiasRestantesBadge fecha={fechaEstimada} />
                            </Td>
                            <Td sticky align="right" className="whitespace-nowrap font-medium">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/solicitudes/gestion-comite-credito-2/${solicitud.sol_id ?? solicitud.sa_sol_id}/gestionar`,
                                  )
                                }
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium">
                                Gestionar
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

      <ErrorModal isOpen={!!errorMessage} message={errorMessage || ""} onAction={() => setErrorMessage(null)} />
    </div>
  );
}
