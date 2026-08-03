"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { clientesService } from "@/services/clientes/clientes.service";
import type { ClienteListResponse, ClienteDetailResponse } from "@/types/api.types";
import { solicitudesService } from "@/services/solicitudes.service";
import { ampliacionCupoService } from "@/services/ampliacion-cupo/ampliacion-cupo.service";
import {
  ArrowLeft,
  Search,
  X,
  DollarSign,
  FileText,
  MessageSquare,
  TrendingUp,
  Package,
} from "lucide-react";
import { ConfirmModal } from "@/components/modals";

interface UltimaSolicitud {
  sol_id: number;
  sol_numero_solicitud: string;
  sol_fecha_creacion: string;
  cliente_nombre: string;
  sol_consumo_mensual_proyectado?: number | null;
  sol_cupo_aprobado?: number | string | null;
  sol_estado_id: number;
  centro_operacion_nombre?: string;
}


interface FormData {
  clienteId: number | null;
  cupoActualManual: string;
  nuevoCupoSolicitado: string;
  justificacion: string;
  consumoMensualProyectado: string;
  toneladasProyectadas: string;
}

export default function AmpliacionCupoPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [clientes, setClientes] = useState<ClienteListResponse[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<ClienteDetailResponse | null>(null);
  const [ultimaSolicitud, setUltimaSolicitud] = useState<UltimaSolicitud | null>(null);
  const [cupoActual, setCupoActual] = useState<number | null>(null);

  const [formData, setFormData] = useState<FormData>({
    clienteId: null,
    cupoActualManual: "",
    nuevoCupoSolicitado: "",
    justificacion: "",
    consumoMensualProyectado: "",
    toneladasProyectadas: "",
  });

  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [showClientesList, setShowClientesList] = useState(false);
  const [clientesMenuPos, setClientesMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const clienteButtonRef = useRef<HTMLButtonElement>(null);
  const clienteMenuRef = useRef<HTMLDivElement>(null);
  const [guardando, setGuardando] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: "exito" | "error";
    texto: string;
  } | null>(null);

  // Cargar clientes al montar
  useEffect(() => {
    async function cargarClientes() {
      try {
        setLoading(true);
        const datos = await clientesService.getAprobados();
        setClientes(datos);
      } catch (error) {
        console.error("Error cargando clientes:", error);
        setMensaje({ tipo: "error", texto: "Error al cargar clientes" });
      } finally {
        setLoading(false);
      }
    }

    cargarClientes();
  }, []);

  // Cargar última solicitud cuando se selecciona cliente
  useEffect(() => {
    async function cargarUltimaSolicitud() {
      if (!selectedCliente?.cli_id) {
        setUltimaSolicitud(null);
        setCupoActual(null);
        return;
      }

      try {
        setLoading(true);
        const solicitudes = await solicitudesService.getAllByCliente(selectedCliente.cli_id);

        if (solicitudes && solicitudes.length > 0) {
          const ultima = solicitudes[0];
          setUltimaSolicitud(ultima);

          // Cargar cupo actual desde la solicitud
          if (ultima.sol_cupo_aprobado) {
            setCupoActual(Number(ultima.sol_cupo_aprobado));
          } else {
            setCupoActual(null);
          }
        } else {
          setUltimaSolicitud(null);
          setCupoActual(null);
        }
      } catch (error) {
        console.error("Error cargando última solicitud:", error);
        setMensaje({ tipo: "error", texto: "Error al cargar solicitud anterior" });
        setUltimaSolicitud(null);
        setCupoActual(null);
      } finally {
        setLoading(false);
      }
    }

    cargarUltimaSolicitud();
  }, [selectedCliente]);

  // Posición del dropdown de clientes: se calcula respecto al viewport y se
  // renderiza vía portal (ver abajo) para que no lo recorte el
  // `overflow-hidden` del card del formulario.
  useEffect(() => {
    if (!showClientesList) return;

    const updatePosition = () => {
      if (!clienteButtonRef.current) return;
      const rect = clienteButtonRef.current.getBoundingClientRect();
      setClientesMenuPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [showClientesList]);

  useEffect(() => {
    if (!showClientesList) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        clienteButtonRef.current &&
        !clienteButtonRef.current.contains(target) &&
        clienteMenuRef.current &&
        !clienteMenuRef.current.contains(target)
      ) {
        setShowClientesList(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showClientesList]);

  const clientesFiltrados = clientes.filter((cliente) =>
    cliente.cli_razon_social?.toLowerCase().includes(searchInput.toLowerCase())
  );

  const handleSeleccionarCliente = async (cliente: ClienteListResponse) => {
    try {
      // Obtener detalles completos del cliente
      const detalles = await clientesService.getById(cliente.cli_id);
      setSelectedCliente(detalles);
      setFormData({
        ...formData,
        clienteId: cliente.cli_id,
        cupoActualManual: "",
      });
      setShowClientesList(false);
      setSearchInput("");
    } catch (error) {
      console.error("Error cargando detalles del cliente:", error);
      setMensaje({ tipo: "error", texto: "Error al cargar datos del cliente" });
    }
  };

  const handleCancelar = () => {
    // TODO: "/solicitudes" no tiene page.tsx propio -> 404. Pendiente decidir
    // destino real (probablemente /solicitudes/listado-de-solicitudes).
    router.push("/solicitudes");
  };

  const handleLimpiar = () => {
    setSelectedCliente(null);
    setUltimaSolicitud(null);
    setCupoActual(null);
    setFormData({
      clienteId: null,
      cupoActualManual: "",
      nuevoCupoSolicitado: "",
      justificacion: "",
      consumoMensualProyectado: "",
      toneladasProyectadas: "",
    });
    setSearchInput("");
    setMensaje(null);
  };

  const handleGuardar = () => {
    if (!selectedCliente?.cli_id) {
      setMensaje({ tipo: "error", texto: "Debes seleccionar un cliente" });
      return;
    }

    if (!cupoActual && !formData.cupoActualManual.trim()) {
      setMensaje({ tipo: "error", texto: "Debes ingresar el cupo actual del cliente" });
      return;
    }

    if (!formData.nuevoCupoSolicitado.trim()) {
      setMensaje({ tipo: "error", texto: "Debes ingresar el nuevo cupo solicitado" });
      return;
    }

    if (!formData.justificacion.trim()) {
      setMensaje({ tipo: "error", texto: "Debes ingresar una justificación" });
      return;
    }

    if (
      !formData.consumoMensualProyectado.trim() ||
      Number(formData.consumoMensualProyectado) <= 0
    ) {
      setMensaje({
        tipo: "error",
        texto: "Debes ingresar el consumo mensual proyectado (mayor a 0)",
      });
      return;
    }

    if (
      !formData.toneladasProyectadas.trim() ||
      Number(formData.toneladasProyectadas) <= 0
    ) {
      setMensaje({
        tipo: "error",
        texto: "Debes ingresar las toneladas mensuales proyectadas (mayor a 0)",
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmarGuardar = async () => {
    if (!selectedCliente?.cli_id) return;

    try {
      setGuardando(true);

      const cupoActualReferencia =
        cupoActual ?? parseFloat(formData.cupoActualManual);

      await ampliacionCupoService.create({
        clienteId: selectedCliente.cli_id,
        nuevoCupo: parseFloat(formData.nuevoCupoSolicitado),
        justificacion: formData.justificacion,
        consumoMensualProyectado: parseFloat(formData.consumoMensualProyectado),
        toneladasProyectadas: parseFloat(formData.toneladasProyectadas),
        solicitudAnteriorId: ultimaSolicitud?.sol_id,
        cupoActualReferencia: Number.isFinite(cupoActualReferencia)
          ? cupoActualReferencia
          : undefined,
      });

      setShowConfirmModal(false);
      setMensaje({
        tipo: "exito",
        texto: "Ampliación de cupo registrada exitosamente"
      });

      // Limpiar formulario después de 2 segundos
      setTimeout(() => {
        handleLimpiar();
      }, 2000);
    } catch (error: any) {
      console.error("Error guardando ampliación de cupo:", error);
      setShowConfirmModal(false);
      setMensaje({
        tipo: "error",
        texto:
          error?.response?.data?.message || "Error al guardar ampliación de cupo",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-0">
      <div className="max-w-[90%] mx-auto mt-2 px-2">
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden m-0">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                // TODO: "/solicitudes" no tiene page.tsx propio -> 404. Pendiente decidir destino real.
                onClick={() => router.push("/solicitudes")}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-100 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeft size={16} />
                Volver
              </button>
              <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                <DollarSign className="text-white" size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-white">
                  Ampliación de Cupo
                </h1>
                <p className="text-xs md:text-sm text-blue-100 truncate">
                  Selecciona un cliente y registra la solicitud de ampliación de cupo
                </p>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          {mensaje && (
            <div
              className={`mx-6 mt-6 p-4 rounded-xl border ${
                mensaje.tipo === "exito"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {mensaje.texto}
            </div>
          )}

          {/* Selección de Cliente */}
          <div className="p-6 border-b border-gray-200">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Search size={18} className="text-blue-600" />
              Seleccionar Cliente *
            </label>
            <div className="relative">
              <button
                ref={clienteButtonRef}
                onClick={() => setShowClientesList(!showClientesList)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
              >
                <span className={selectedCliente ? "text-gray-900" : "text-gray-500"}>
                  {selectedCliente
                    ? `${selectedCliente.cli_razon_social} (${selectedCliente.cli_nro_identificacion})`
                    : "Buscar cliente..."}
                </span>
                <Search className="h-4 w-4 text-gray-400" />
              </button>

              {showClientesList &&
                createPortal(
                  <div
                    ref={clienteMenuRef}
                    className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
                    style={{
                      top: clientesMenuPos.top,
                      left: clientesMenuPos.left,
                      width: clientesMenuPos.width,
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Buscar por nombre o NIT..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full px-4 py-2 border-b border-gray-200 focus:outline-none sticky top-0 bg-white"
                      autoFocus
                    />
                    {clientesFiltrados.length > 0 ? (
                      <ul className="divide-y divide-gray-100">
                        {clientesFiltrados.map((cliente) => (
                          <li key={cliente.cli_id}>
                            <button
                              onClick={() => handleSeleccionarCliente(cliente)}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                            >
                              <div className="font-medium text-gray-900">
                                {cliente.cli_razon_social}
                              </div>
                              <div className="text-sm text-gray-500">
                                NIT: {cliente.cli_nro_identificacion}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-center text-gray-500 text-sm">
                        No se encontraron clientes
                      </div>
                    )}
                  </div>,
                  document.body,
                )}
            </div>
          </div>

          {/* Información de Última Solicitud */}
          {selectedCliente && (
            <div className="p-6 border-b border-gray-200 bg-white/50">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
                Información de Última Solicitud
              </h2>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : ultimaSolicitud ? (
                <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50/60 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">No. Solicitud</p>
                      <p className="text-base font-semibold text-gray-900">
                        {ultimaSolicitud.sol_numero_solicitud}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha Solicitud</p>
                      <p className="text-base font-semibold text-gray-900">
                        {ultimaSolicitud.sol_fecha_creacion
                          ? new Date(ultimaSolicitud.sol_fecha_creacion).toLocaleDateString("es-CO")
                          : "-"}
                      </p>
                    </div>
                    {cupoActual && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cupo Actual (Sistema)</p>
                        <p className="text-base font-bold text-emerald-900">
                          ${cupoActual.toLocaleString("es-CO")}
                        </p>
                      </div>
                    )}
                    {ultimaSolicitud.sol_consumo_mensual_proyectado && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Consumo Mensual Proyectado</p>
                        <p className="text-base font-semibold text-gray-900">
                          ${ultimaSolicitud.sol_consumo_mensual_proyectado.toLocaleString("es-CO")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                  No hay solicitudes anteriores para este cliente
                </div>
              )}
            </div>
          )}

          {/* Formulario de Ampliación */}
          {selectedCliente && (
            <div className="p-6">
              <div className="bg-blue-50/60 border-2 border-blue-200 rounded-2xl p-6 shadow-sm space-y-6">
                {!cupoActual && (
                  <div>
                    <label htmlFor="cupoActualManual" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <DollarSign size={18} className="text-blue-600" />
                      Cupo Actual (Si no aparece arriba) *
                    </label>
                    <input
                      id="cupoActualManual"
                      type="number"
                      placeholder="Ingresa el cupo actual del cliente"
                      value={formData.cupoActualManual}
                      onChange={(e) =>
                        setFormData({ ...formData, cupoActualManual: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Completa este campo si el cupo actual no se cargó automáticamente
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="nuevoCupo" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <DollarSign size={18} className="text-blue-600" />
                    Nuevo Cupo Solicitado *
                  </label>
                  <input
                    id="nuevoCupo"
                    type="number"
                    placeholder="Ingresa el nuevo cupo"
                    value={formData.nuevoCupoSolicitado}
                    onChange={(e) =>
                      setFormData({ ...formData, nuevoCupoSolicitado: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="consumoMensualProyectado" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <TrendingUp size={18} className="text-blue-600" />
                      Consumo Mensual Proyectado *
                    </label>
                    <input
                      id="consumoMensualProyectado"
                      type="number"
                      placeholder="Ej: 5000000"
                      value={formData.consumoMensualProyectado}
                      onChange={(e) =>
                        setFormData({ ...formData, consumoMensualProyectado: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="toneladasProyectadas" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <Package size={18} className="text-blue-600" />
                      Toneladas Mensuales Proyectadas *
                    </label>
                    <input
                      id="toneladasProyectadas"
                      type="number"
                      placeholder="Ej: 500"
                      value={formData.toneladasProyectadas}
                      onChange={(e) =>
                        setFormData({ ...formData, toneladasProyectadas: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="justificacion" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <MessageSquare size={18} className="text-blue-600" />
                    Justificación *
                  </label>
                  <textarea
                    id="justificacion"
                    placeholder="Explica los motivos de la ampliación de cupo"
                    value={formData.justificacion}
                    onChange={(e) =>
                      setFormData({ ...formData, justificacion: e.target.value })
                    }
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
            <button
              onClick={handleCancelar}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            {selectedCliente && (
              <button
                onClick={handleLimpiar}
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                <X className="h-4 w-4" />
                Limpiar
              </button>
            )}
            {selectedCliente && (
              <button
                onClick={handleGuardar}
                disabled={
                  guardando ||
                  !formData.nuevoCupoSolicitado ||
                  !formData.justificacion ||
                  !formData.consumoMensualProyectado ||
                  !formData.toneladasProyectadas
                }
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guardando ? "Guardando..." : "Guardar Ampliación"}
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar ampliación de cupo"
        message="¿Deseas registrar esta solicitud de ampliación de cupo?"
        confirmText="Sí, registrar"
        cancelText="Cancelar"
        isLoading={guardando}
        onConfirm={confirmarGuardar}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
