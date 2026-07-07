"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { centrosOperacionService, type CentroOperacion } from "@/services/centros-operacion/centros-operacion.service";
import { ESTADOS, getEstadoBadgeClass } from "@/lib/workflow-labels";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Eye, Search, X } from "lucide-react";

interface Solicitud {
  sol_id: number;
  sol_numero_solicitud: string;
  cliente_nombre: string;
  co_id: number;
  centro_operacion_nombre: string;
  fecha_creacion: string;
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
  solicitud_id?: number;
  numero_solicitud?: string;
  estado_id?: number;
}

interface SolicitudDetalle extends Solicitud {
  nuevoConsumo?: number;
  nuevasObservaciones?: string;
  guardando?: boolean;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-CO");
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

function getDiasRestantesDisplay(diasRestantes: number | null) {
  if (diasRestantes === null) {
    return {
      text: "-",
      className: "bg-slate-100 text-slate-600",
    };
  }

  if (diasRestantes < 0) {
    const diasVencidos = Math.abs(diasRestantes);
    return {
      text: `Vencido hace ${diasVencidos} día${diasVencidos === 1 ? "" : "s"}`,
      className: "bg-red-100 text-red-700",
    };
  }

  if (diasRestantes === 0) {
    return {
      text: "Vence hoy",
      className: "bg-amber-100 text-amber-800",
    };
  }

  if (diasRestantes <= 3) {
    return {
      text: `${diasRestantes} día${diasRestantes === 1 ? "" : "s"}`,
      className: "bg-amber-100 text-amber-800",
    };
  }

  return {
    text: `${diasRestantes} día${diasRestantes === 1 ? "" : "s"}`,
    className: "bg-emerald-100 text-emerald-700",
  };
}

export default function ConceptoEjecutivoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [centros, setCentros] = useState<CentroOperacion[]>([]);
  const [centroFiltro, setCentroFiltro] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    setLoading(false);
  }, []);

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
        // Solo mostrar solicitudes con estado "Pendiente" (estado_id = 2)
        if ((solicitud.sol_estado_id ?? solicitud.estado_id) !== 2) return false;

        const matchCentro = !centroFiltro || solicitud.co_id === centroFiltro;
        const term = searchTerm.toLowerCase();
        const matchSearch =
          (solicitud.sol_numero_solicitud || solicitud.numero_solicitud)?.toLowerCase().includes(term) ||
          solicitud.cliente_nombre?.toLowerCase().includes(term) ||
          solicitud.centro_operacion_nombre?.toLowerCase().includes(term);

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

        return matchCentro && matchSearch && matchFecha;
      }),
    [solicitudes, centroFiltro, searchTerm, fechaInicio, fechaFin],
  );

  const canSearch = true;

  const calcularDiasRestantes = (fecha?: string | null) => {
    if (!fecha) return null;
    const hoy = new Date();
    const objetivo = new Date(fecha);
    const diffMs = objetivo.setHours(0, 0, 0, 0) - hoy.setHours(0, 0, 0, 0);
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  function limpiarFiltros() {
    setCentroFiltro(null);
    setSearchInput("");
    setSearchTerm("");
    setFechaInicio("");
    setFechaFin("");
    setHasSearched(false);
  }

  async function handleBuscar() {
    // console.log(
    //   "🚀 handleBuscar Buscando solicitudes pendientes del ejecutivo con filtros...",
    // );
    try {
      if (!user?.usr_id) {
        alert("No hay usuario autenticado");
        return;
      }
      setLoading(true);
      console.log("user.usr_id: ", user.usr_id);
      const data = await solicitudesService.getForEjecutivo(user.usr_id);
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
          fecha_estimada_respuesta:
            s.fecha_estimada_respuesta ??
            (s as any).fecha_estimada_respuesta_comercial ??
            (s as any).sol_fecha_estimada_ejecutivo ??
            null,
          nuevoConsumo: s.consumo_mensual_proyectado ?? undefined,
          nuevasObservaciones: s.observacionesComercial ?? "",
        })),
      );
      setSearchTerm(searchInput.trim());
      setHasSearched(true);
    } catch (error) {
      // console.error("Error buscando solicitudes:", error);
      alert("Error al buscar solicitudes");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-[115rem] mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-10 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Cargando solicitudes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[115rem] mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <button
                onClick={() => router.push("/solicitudes")}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a solicitudes
              </button>
              <p className="text-2xl md:text-3xl font-bold text-blue-800 mb-3 leading-tight">
                Listado Solicitudes Pendientes - Concepto Ejecutivo de Negocios
              </p>
              <div className="h-px w-full bg-gradient-to-r from-blue-200 via-blue-300 to-transparent mb-4" />
              <h1 className="text-xl md:text-2xl font-semibold text-gray-800">
                Registro de concepto comercial
              </h1>
              <p className="text-gray-600 mt-1">
                Registra consumo mensual proyectado y observaciones para cada
                solicitud.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg mb-4">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50/40">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Centro de operación
                  </label>
                  <select
                    value={centroFiltro ?? ""}
                    onChange={(event) =>
                      setCentroFiltro(
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    {centros.map((item, index) => (
                      <option key={item.cop_id || index} value={String(item.cop_id)}>
                        {item.cop_nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Buscar
                  </label>
                  <input
                    type="text"
                    placeholder="No. solicitud, cliente o centro"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(event) => setFechaInicio(event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Fecha fin
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(event) => setFechaFin(event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-end justify-end gap-2">
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
                </div>
              </div>
            </div>
          </div>

          {!hasSearched ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
              <p className="text-gray-600 mb-2">
                Presiona Buscar para cargar tus solicitudes pendientes.
              </p>
              <p className="text-sm text-gray-500">
                Opcionalmente puedes filtrar por centro, fecha o número de solicitud.
              </p>
            </div>
          ) : solicitudesFiltradas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-400">📭</span>
              </div>
              <p className="text-gray-600">
                No hay solicitudes pendientes para los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50/40">
                <p className="text-sm text-gray-600">
                  Mostrando{" "}
                  <span className="font-semibold">
                    {solicitudesFiltradas.length}
                  </span>{" "}
                  solicitud(es)
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        No. solicitud
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Centro de operación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Fecha diligenciamiento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Ver formulario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Fecha estimada respuesta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Días faltantes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Accion
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {solicitudesFiltradas.map((solicitud) =>
                      (() => {
                        const diasRestantes = solicitud.fecha_estimada_respuesta
                          ? calcularDiasRestantes(
                              solicitud.fecha_estimada_respuesta,
                            )
                          : null;
                        const diasDisplay =
                          getDiasRestantesDisplay(diasRestantes);

                        return (
                          <tr
                            key={solicitud.sol_id ?? solicitud.solicitud_id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700">
                              {solicitud.sol_numero_solicitud || solicitud.numero_solicitud}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {solicitud.centro_operacion_nombre}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {solicitud.cliente_nombre}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadgeClass(
                                  solicitud.sol_estado_id ?? solicitud.estado_id,
                                )}`}
                              >
                                {ESTADOS[(solicitud.sol_estado_id ?? solicitud.estado_id)] || "Desconocido"}
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDateTime(solicitud.fecha_creacion)}
                            </td>


                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/solicitudes/${solicitud.sol_id ?? solicitud.solicitud_id}`,
                                  )
                                }
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <Eye className="h-4 w-4" />
                                Ver
                              </button>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDate(solicitud.fecha_estimada_respuesta)}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${diasDisplay.className}`}
                              >
                                {diasDisplay.text}
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/solicitudes/gestion-ejecutivo-negocios/${solicitud.sol_id ?? solicitud.solicitud_id}/registrar`,
                                  )
                                }
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                              >
                                Registrar Concepto
                              </button>
                            </td>
                          </tr>
                        );
                      })(),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
