"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { clientesService } from "@/services/clientes/clientes.service";
import { modulosService } from "@/services/modulos.service";
import { ESTADOS, getEstadoBadgeClass } from "@/lib/workflow-labels";
import { formatDate, formatDateTime } from "@/lib/date-utils";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Eye, FileText, PackageOpen, Search, X } from "lucide-react";
import { LoadingModal, ErrorModal } from "@/components/modals";
import { TablePagination } from "@/components/tables/TablePagination";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { TableContainer } from "@/components/tables/TableContainer";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
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

interface EjecutivoNegocio {
  ejng_id: number;
  ejng_nombre: string;
}

export default function ConceptoEjecutivoPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // El usuario logueado es él mismo un Ejecutivo de Negocios (tiene ejng_id
  // propio) — en ese caso el campo "Ejecutivo de Negocios" queda bloqueado
  // mostrando su nombre y la búsqueda siempre trae su propia bandeja. Si NO
  // es un ejecutivo pero tiene permiso de editar sobre esta página (ej. un
  // coordinador), puede elegir libremente cuál ejecutivo consultar.
  const esEjecutivo = Boolean(user?.ejng_id);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [ejecutivos, setEjecutivos] = useState<EjecutivoNegocio[]>([]);
  const [ejecutivoSeleccionado, setEjecutivoSeleccionado] = useState<
    number | null
  >(() => {
    const v = searchParams.get("ejecutivo");
    return v ? Number(v) : null;
  });

  useEffect(() => {
    const modulo = modulosService
      .getAll()
      .flatMap(function aplanar(m): typeof m[] {
        return [m, ...(m.subModulos ? m.subModulos.flatMap(aplanar) : [])];
      })
      .find((m) => m.mod_ruta === pathname);
    setPuedeEditar(Boolean(modulo?.permisos?.editar));
  }, [pathname]);

  useEffect(() => {
    if (esEjecutivo || !puedeEditar) return;
    async function cargarEjecutivos() {
      try {
        const data = await clientesService.getEjecutivosNegocio();
        setEjecutivos(data || []);
      } catch (error) {
        console.error("Error cargando ejecutivos:", error);
      }
    }
    cargarEjecutivos();
  }, [esEjecutivo, puedeEditar]);

  // Filtros inicializados desde la URL (?cliente=&desde=&hasta=) para que
  // "Volver" desde /registrar restaure la búsqueda en vez de reiniciar el
  // formulario — antes todo esto vivía solo en useState local, que se
  // perdía al desmontar/remontar la página (ver mismo patrón en
  // gestion-auxiliar-servicio-al-cliente/page.tsx).
  const [clienteFiltro, setClienteFiltro] = useState(
    () => searchParams.get("cliente") || "",
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

  const solicitudesFiltradas = useMemo(
    () =>
      solicitudes.filter((solicitud) => {
        // Solo mostrar solicitudes con estado "Pendiente" (estado_id = 2)
        if ((solicitud.sol_estado_id ?? solicitud.estado_id) !== 2)
          return false;

        const matchCliente =
          !clienteFiltro || solicitud.cliente_nombre === clienteFiltro;

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

        return matchCliente && matchFecha;
      }),
    [solicitudes, clienteFiltro, fechaInicio, fechaFin],
  );

  // La página se reinicia cuando cambian los filtros o llega una nueva
  // búsqueda — evita quedar en una página que ya no existe.
  useEffect(() => {
    setPage(1);
  }, [clienteFiltro, fechaInicio, fechaFin, solicitudes]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return solicitudesFiltradas.slice(start, start + pageSize);
  }, [solicitudesFiltradas, page, pageSize]);

  // Clientes únicos dentro de la bandeja ya cargada (no todos los clientes
  // del sistema) — esta página siempre está acotada a un solo ejecutivo, así
  // que solo tiene sentido dejar elegir entre los clientes que de verdad
  // tienen una solicitud pendiente en esa bandeja.
  const clientesDisponibles = useMemo(() => {
    const nombres = new Set(
      solicitudes.map((s) => s.cliente_nombre).filter(Boolean),
    );
    return Array.from(nombres).sort((a, b) => a.localeCompare(b));
  }, [solicitudes]);

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

  // Si es Ejecutivo, siempre puede buscar su propia bandeja. Si no lo es,
  // solo puede buscar una vez que tenga permiso de editar Y haya elegido un
  // ejecutivo — el backend no tiene ninguna otra bandeja que mostrarle.
  const canSearch = esEjecutivo || (puedeEditar && Boolean(ejecutivoSeleccionado));

  // Refleja los filtros actuales en la URL (sin agregar entradas al
  // historial) para que "Volver" desde /registrar los pueda restaurar.
  function sincronizarUrl(filtros: {
    cliente: string;
    desde: string;
    hasta: string;
  }) {
    const params = new URLSearchParams();
    params.set("buscado", "1");
    if (filtros.cliente) params.set("cliente", filtros.cliente);
    if (filtros.desde) params.set("desde", filtros.desde);
    if (filtros.hasta) params.set("hasta", filtros.hasta);
    if (!esEjecutivo && ejecutivoSeleccionado)
      params.set("ejecutivo", String(ejecutivoSeleccionado));
    router.replace(`${pathname}?${params.toString()}`);
  }

  function limpiarFiltros() {
    setClienteFiltro("");
    setFechaInicio("");
    setFechaFin("");
    setEjecutivoSeleccionado(null);
    setHasSearched(false);
    router.replace(pathname);
  }

  async function handleBuscar() {
    // console.log(
    //   "🚀 handleBuscar Buscando solicitudes pendientes del ejecutivo con filtros...",
    // );
    try {
      if (!user?.usr_id) {
        setErrorMessage("No hay usuario autenticado");
        return;
      }
      if (!esEjecutivo && !ejecutivoSeleccionado) {
        setErrorMessage("Selecciona un ejecutivo de negocios");
        return;
      }
      setLoading(true);
      console.log("user.usr_id: ", user.usr_id);
      const data = await solicitudesService.getForEjecutivo(
        user.usr_id,
        esEjecutivo ? undefined : (ejecutivoSeleccionado ?? undefined),
      );
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
      setHasSearched(true);
      sincronizarUrl({
        cliente: clienteFiltro,
        desde: fechaInicio,
        hasta: fechaFin,
      });
    } catch (error) {
      // console.error("Error buscando solicitudes:", error);
      setErrorMessage("Error al buscar solicitudes");
    } finally {
      setLoading(false);
    }
  }

  // Si se vuelve desde /registrar con una búsqueda ya hecha (marcador
  // "buscado=1" en la URL), repetirla automáticamente para restaurar la
  // tabla en vez de dejarla vacía pidiendo buscar de nuevo. Si el usuario no
  // es Ejecutivo, se espera a que se resuelva el permiso de editar (y, si
  // aplica, el ejecutivo ya seleccionado desde la URL) antes de disparar.
  useEffect(() => {
    if (autoBuscoRef.current) return;
    if (searchParams.get("buscado") !== "1") return;
    if (!user?.usr_id) return;
    if (!esEjecutivo && !canSearch) return;
    autoBuscoRef.current = true;
    handleBuscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, esEjecutivo, canSearch]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <LoadingModal isOpen={loading} message="Cargando solicitudes..." />
      <ErrorModal
        isOpen={!!errorMessage}
        message={errorMessage || ""}
        onAction={() => setErrorMessage(null)}
      />
      <div className="max-w-[115rem] mx-auto">
        <PageHeaderCard
          icon={FileText}
          eyebrow="Solicitudes"
          title="Pendientes — Concepto Ejecutivo de Negocios"
          // TODO: "/solicitudes" no tiene page.tsx propio -> 404. Pendiente decidir destino real.
          onBack={() => router.push("/solicitudes")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <FilterField label="Ejecutivo de Negocios">
              {esEjecutivo ? (
                <input
                  type="text"
                  value={user?.nombre || ""}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              ) : puedeEditar ? (
                <select
                  value={ejecutivoSeleccionado ?? ""}
                  onChange={(event) =>
                    setEjecutivoSeleccionado(
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona un ejecutivo</option>
                  {ejecutivos.map((ejecutivo) => (
                    <option key={ejecutivo.ejng_id} value={ejecutivo.ejng_id}>
                      {ejecutivo.ejng_nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value=""
                  disabled
                  placeholder="No aplica"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              )}
            </FilterField>

            <FilterField label="Cliente">
              <select
                value={clienteFiltro}
                onChange={(event) => setClienteFiltro(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los clientes</option>
                {clientesDisponibles.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Fecha inicio">
              <input
                type="date"
                value={fechaInicio}
                onChange={(event) => setFechaInicio(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>

            <FilterField label="Fecha fin">
              <input
                type="date"
                value={fechaFin}
                onChange={(event) => setFechaFin(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>

            <FilterActions className="col-span-full">
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
            </FilterActions>
          </div>
        </PageHeaderCard>

        {!hasSearched ? (
          <EmptyStateCard
            icon={PackageOpen}
            title="Presiona Buscar para cargar tus solicitudes pendientes."
            subtitle="Opcionalmente puedes filtrar por cliente o fecha."
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
                      <Th>No. solicitud</Th>
                      {/* <Th>Centro de operación</Th> */}
                      <Th>Cliente</Th>
                      <Th>Estado</Th>
                      <Th>Fecha diligenciamiento</Th>
                      <Th>Fecha de envío</Th>
                      <Th>Ver formulario</Th>
                      <Th>Fecha estimada respuesta</Th>
                      <Th>Días faltantes</Th>
                      <Th sticky align="right">
                        Acción
                      </Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {paginatedRows.map((solicitud) => {
                      return (
                          <Tr key={solicitud.sol_id ?? solicitud.sa_sol_id}>
                            <Td className="whitespace-nowrap font-semibold text-blue-700">
                              {solicitud.sol_numero_solicitud ||
                                solicitud.numero_solicitud}
                            </Td>

                            {/* <Td className="whitespace-nowrap">
                              {solicitud.centro_operacion_nombre}
                            </Td> */}

                            <Td className="whitespace-nowrap">
                              {solicitud.cliente_nombre}
                            </Td>

                            <Td className="whitespace-nowrap">
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
                            </Td>

                            <Td className="whitespace-nowrap">
                              {formatDateTime(solicitud.fecha_creacion)}
                            </Td>

                            <Td className="whitespace-nowrap">
                              {formatDateTime(solicitud.fecha_envio)}
                            </Td>

                            <Td className="whitespace-nowrap">
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
                            </Td>

                            <Td className="whitespace-nowrap">
                              {formatDate(solicitud.fecha_estimada_respuesta)}
                            </Td>

                            <Td className="whitespace-nowrap">
                              <DiasRestantesBadge
                                fecha={solicitud.fecha_estimada_respuesta}
                              />
                            </Td>

                            <Td sticky align="right" className="whitespace-nowrap font-medium">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/solicitudes/gestion-ejecutivo-negocios/${solicitud.sol_id ?? solicitud.sa_sol_id}/registrar`,
                                  )
                                }
                                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
                              >
                                Registrar Concepto
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
