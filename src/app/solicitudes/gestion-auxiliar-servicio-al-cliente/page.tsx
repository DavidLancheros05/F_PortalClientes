"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { clientesService } from "@/services/clientes/clientes.service";
import {
  centrosOperacionService,
  type CentroOperacion,
} from "@/services/centros-operacion/centros-operacion.service";
import type { ClienteListResponse } from "@/types/api.types";
import { ESTADOS, getEstadoBadgeClass } from "@/lib/workflow-labels";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";
import { LoadingModal } from "@/components/modals";

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

export default function AprobacionDesaprobacionPage() {
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
  // Filtros y página inicializados desde la URL (?centro=&cliente=&numero=&pagina=)
  // para que "Volver" desde /gestionar restaure la búsqueda en vez de
  // reiniciar el formulario — antes todo esto vivía solo en useState local,
  // que se perdía al desmontar/remontar la página.
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
  const [numeroFiltro, setNumeroFiltro] = useState(
    () => searchParams.get("numero") || "",
  );
  const [hasSearched, setHasSearched] = useState(false);
  const [paginaActual, setPaginaActual] = useState(() => {
    const v = searchParams.get("pagina");
    return v ? Number(v) : 1;
  });
  const itemsPorPagina = 5;
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

  // Refleja los filtros/página actuales en la URL (sin agregar entradas al
  // historial) para que "Volver" desde /gestionar los pueda restaurar.
  const sincronizarUrl = (pagina: number) => {
    const params = new URLSearchParams();
    params.set("buscado", "1");
    if (centroSeleccionado) params.set("centro", String(centroSeleccionado));
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
        alert("No hay usuario autenticado");
        return;
      }

      const data =
        await solicitudesService.getSolicitudesPendientesAuxiliarServicioCliente(
          usuarioId,
        );

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
      const paginaFinal = opts.preservePagina ? paginaActual : 1;
      if (!opts.preservePagina) setPaginaActual(1);
      sincronizarUrl(paginaFinal);
    } catch (error) {
      alert("Error al cargar solicitudes");
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  // Si se vuelve desde /gestionar con una búsqueda ya hecha (marcador
  // "buscado=1" en la URL), repetirla automáticamente para restaurar la
  // tabla en vez de dejar el listado vacío pidiendo buscar de nuevo.
  // El centro es opcional en la búsqueda (buscar() no lo exige), así que
  // no podemos condicionar esto a que centroSeleccionado tenga valor: si el
  // usuario buscó sin centro (o no tiene centro por defecto), esa condición
  // nunca se cumplía y el auto-restore no disparaba. Solo esperamos a que
  // termine de resolverse el centro por defecto cuando sabemos que va a
  // llegar (usuario con co_id); si el usuario no tiene co_id, no hay nada
  // que esperar.
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
    return <LoadingModal isOpen message="Cargando centros..." />;
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
            Solicitudes pendientes gestión auxiliar de servicio al cliente
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
                onClick={() => buscar()}
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
                      <th className="sticky right-0 px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider bg-gray-50 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">
                        Accion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {solicitudesActuales.map((solicitud) => {
                      const fechaEstimada =
                        (solicitud as any)
                          .sol_fecha_estimada_auxiliar_servicio_cliente ||
                        solicitud.fecha_estimada_respuesta_comercial;
                      const diasRestantes = fechaEstimada
                        ? Math.max(0, calcularDiasRestantes(fechaEstimada) ?? 0)
                        : null;

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
                            {fechaEstimada
                              ? new Date(fechaEstimada).toLocaleDateString(
                                  "es-CO",
                                )
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {diasRestantes !== null ? diasRestantes : "-"}
                          </td>
                          <td className="sticky right-0 px-6 py-4 whitespace-nowrap text-sm font-medium bg-white group-hover:bg-gray-50 transition-colors shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">
                            <button
                              onClick={() =>
                                router.push(
                                  `/solicitudes/gestion-auxiliar-servicio-al-cliente/${solicitud.sol_id ?? solicitud.sa_sol_id}/gestionar`,
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
                  onClick={() => irAPagina(Math.max(1, paginaActual - 1))}
                  disabled={paginaActual === 1}
                  className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => irAPagina(page)}
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
                  onClick={() => irAPagina(Math.min(totalPaginas, paginaActual + 1))}
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
