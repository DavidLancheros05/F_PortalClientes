"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { clientesService } from "@/services/clientes/clientes.service";
import { centrosOperacionService, type CentroOperacion } from "@/services/centros-operacion/centros-operacion.service";
import type { ClienteListResponse } from "@/types/api.types";
import { ESTADOS, getEstadoBadgeClass } from "@/lib/workflow-labels";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";

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
  solicitud_id?: number;
  numero_solicitud?: string;
  cliente_id?: number;
  estado_id?: number;
}

export default function AprobacionDesaprobacionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [loadingCentros, setLoadingCentros] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [centros, setCentros] = useState<CentroOperacion[]>([]);
  const [clientes, setClientes] = useState<ClienteListResponse[]>([]);
  const [centroSeleccionado, setCentroSeleccionado] = useState<number | null>(
    null,
  );
  const [clienteSeleccionado, setClienteSeleccionado] = useState<number | null>(
    null,
  );
  const [numeroFiltro, setNumeroFiltro] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 5;

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

  const calcularDiasRestantes = (fecha?: string | null) => {
    if (!fecha) return null;
    const hoy = new Date();
    const objetivo = new Date(fecha);
    const diffMs = objetivo.setHours(0, 0, 0, 0) - hoy.setHours(0, 0, 0, 0);
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const totalPaginas = Math.ceil(solicitudes.length / itemsPorPagina);
  const indiceInicio = (paginaActual - 1) * itemsPorPagina;
  const indiceFin = indiceInicio + itemsPorPagina;
  const solicitudesActuales = solicitudes.slice(indiceInicio, indiceFin);

  if (loadingCentros) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando centros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft size={20} />
            Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Listado solicitudes pendientes de Aprobación / Desaprobación de Formulario - gestion auxiliar de serviocio al cliente
          </h1>
          <p className="text-gray-600">
            Revisa y gestiona las solicitudes asignadas a tu centro de operación
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente
              </label>
              <select
                value={clienteSeleccionado ?? ""}
                onChange={(e) =>
                  setClienteSeleccionado(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!centroSeleccionado || loadingClientes}
              >
                <option value="">Todos los clientes</option>
                {clientes.map((cliente, index) => (
                  <option
                    key={`cliente-${cliente.cli_id}-${index}`}
                    value={cliente.cli_id}
                  >
                    {cliente.cli_razon_social}
                  </option>
                ))}
              </select>
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
                onClick={async () => {
                  try {
                    setLoadingSolicitudes(true);
                    const usuarioId = obtenerUsuarioId();

                    if (!usuarioId) {
                      alert("No hay usuario autenticado");
                      return;
                    }
                    // console.log("Buscando solicitudes para usuarioId:", usuarioId);

                    const data = await solicitudesService.getSolicitudesPendientesAuxiliarServicioCliente(
                      usuarioId,
                    );
                    // console.log("Solicitudes obtenidas:", data);

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
                        const cumpleNumero = numeroBuscado
                          ? (s.sol_numero_solicitud || s.numero_solicitud || "")
                              .toLowerCase()
                              .includes(numeroBuscado)
                          : true;
                        return cumpleNumero;
                      });

                    setSolicitudes(mapped);
                    setHasSearched(true);
                    setPaginaActual(1);
                  } catch (error) {
                    // console.error("Error buscando solicitudes:", error);
                    alert("Error al cargar solicitudes");
                  } finally {
                    setLoadingSolicitudes(false);
                  }
                }}
                disabled={loadingSolicitudes}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>

        {loadingSolicitudes ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando solicitudes...</p>
          </div>
        ) : !hasSearched ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-2">
              Selecciona un centro y presiona Buscar para ver las solicitudes.
            </p>
            <p className="text-sm text-gray-500">
              El centro de operacion es obligatorio.
            </p>
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">No se encontraron solicitudes</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
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
                        Consumo Proyectado (USD)
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
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                        Accion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {solicitudesActuales.map((solicitud) => {
                      const fechaEstimada =
                        (solicitud as any).sol_fecha_estimada_auxiliar_servicio_cliente ||
                        solicitud.fecha_estimada_respuesta_comercial;
                      const diasRestantes = fechaEstimada
                        ? Math.max(0, calcularDiasRestantes(fechaEstimada) ?? 0)
                        : null;

                      return (
                        <tr
                          key={solicitud.sol_id ?? solicitud.solicitud_id}
                          className="hover:bg-gray-50 transition-colors"
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
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                (solicitud.sol_estado_id ??
                                  solicitud.estado_id) === 1
                                  ? "bg-yellow-100 text-yellow-800"
                                  : (solicitud.sol_estado_id ??
                                        solicitud.estado_id) === 2
                                    ? "bg-blue-100 text-blue-800"
                                    : (solicitud.sol_estado_id ??
                                          solicitud.estado_id) === 3
                                      ? "bg-green-100 text-green-800"
                                      : (solicitud.sol_estado_id ??
                                            solicitud.estado_id) === 4
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-gray-100 text-gray-800"
                              }`}
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
                                  `/solicitudes/${solicitud.sol_id ?? solicitud.solicitud_id}`,
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
                            {fechaEstimada
                              ? new Date(fechaEstimada).toLocaleDateString(
                                  "es-CO",
                                )
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {diasRestantes !== null ? diasRestantes : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() =>
                                router.push(
                                  `/solicitudes/gestion-auxiliar-servicio-al-cliente/${solicitud.sol_id ?? solicitud.solicitud_id}/gestionar`,
                                )
                              }
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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
            </div>
            <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
              <div>
                Mostrando {indiceInicio + 1} -{" "}
                {Math.min(indiceFin, solicitudes.length)} de{" "}
                {solicitudes.length} solicitudes
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaginaActual(Math.max(1, paginaActual - 1))}
                  disabled={paginaActual === 1}
                  className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setPaginaActual(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        paginaActual === page
                          ? "bg-blue-600 text-white"
                          : "border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}
                <button
                  onClick={() =>
                    setPaginaActual(Math.min(totalPaginas, paginaActual + 1))
                  }
                  disabled={paginaActual === totalPaginas}
                  className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
