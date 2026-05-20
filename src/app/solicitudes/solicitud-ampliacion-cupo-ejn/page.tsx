"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { clientesService } from "@/services/clientes/clientes.service";
import type { ClienteListResponse, ClienteDetailResponse } from "@/types/api.types";
import { solicitudesService } from "@/services/solicitudes.service";
import { ampliacionCupoService } from "@/services/ampliacion-cupo/ampliacion-cupo.service";
import { ArrowLeft, Search, X } from "lucide-react";

interface UltimaSolicitud {
  sol_id: number;
  sol_numero_solicitud: string;
  fecha_creacion: string;
  cliente_nombre: string;
  consumo_mensual_proyectado?: number | null;
  observaciones?: string;
  sol_estado_id: number;
  centro_operacion_nombre?: string;
}


interface FormData {
  clienteId: number | null;
  cupoActualManual: string;
  nuevoCupoSolicitado: string;
  justificacion: string;
}

export default function AmpliacionCupoEJNPage() {
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
  });

  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [showClientesList, setShowClientesList] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{
    tipo: "exito" | "error";
    texto: string;
  } | null>(null);

  // Cargar clientes al montar
  useEffect(() => {
    async function cargarClientes() {
      try {
        setLoading(true);
        const datos = await clientesService.getAll();
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
      if (!selectedCliente?.cliId) {
        setUltimaSolicitud(null);
        setCupoActual(null);
        return;
      }

      try {
        setLoading(true);
        const solicitudes = await solicitudesService.getAllByCliente(selectedCliente.cliId);

        if (solicitudes && solicitudes.length > 0) {
          const ultima = solicitudes[0];
          setUltimaSolicitud(ultima);

          // Cargar cupo actual desde la solicitud
          if ((ultima as any).cupoAprobado || (ultima as any).sol_cupo_aprobado) {
            setCupoActual(Number((ultima as any).cupoAprobado || (ultima as any).sol_cupo_aprobado));
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

  const clientesFiltrados = clientes.filter((cliente) =>
    cliente.razonSocial?.toLowerCase().includes(searchInput.toLowerCase())
  );

  const handleSeleccionarCliente = async (cliente: ClienteListResponse) => {
    try {
      // Obtener detalles completos del cliente
      const detalles = await clientesService.getById(cliente.cliId);
      setSelectedCliente(detalles);
      setFormData({
        ...formData,
        clienteId: cliente.cliId,
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
    });
    setSearchInput("");
    setMensaje(null);
  };

  const handleGuardar = async () => {
    if (!selectedCliente?.cliId) {
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

    try {
      setGuardando(true);

      await ampliacionCupoService.create({
        clienteId: selectedCliente.cliId,
        nuevoCupo: parseFloat(formData.nuevoCupoSolicitado),
        justificacion: formData.justificacion,
        solicitudAnteriorId: ultimaSolicitud?.sol_id,
      });

      setMensaje({
        tipo: "exito",
        texto: "Ampliación de cupo registrada exitosamente"
      });

      // Limpiar formulario después de 2 segundos
      setTimeout(() => {
        handleLimpiar();
      }, 2000);
    } catch (error) {
      console.error("Error guardando ampliación de cupo:", error);
      setMensaje({
        tipo: "error",
        texto: "Error al guardar ampliación de cupo"
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <button
              onClick={() => router.push("/solicitudes")}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a solicitudes
            </button>
            <h1 className="text-3xl font-bold text-blue-800 mb-2">
              Ampliación de Cupo
            </h1>
            <p className="text-gray-600">
              Selecciona un cliente y registra la solicitud de ampliación de cupo
            </p>
          </div>
        </div>

        {/* Mensajes */}
        {mensaje && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              mensaje.tipo === "exito"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Selección de Cliente */}
          <div className="p-6 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Seleccionar Cliente *
            </label>
            <div className="relative">
              <button
                onClick={() => setShowClientesList(!showClientesList)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
              >
                <span className={selectedCliente ? "text-gray-900" : "text-gray-500"}>
                  {selectedCliente
                    ? `${selectedCliente.razonSocial} (${selectedCliente.nitDocumento})`
                    : "Buscar cliente..."}
                </span>
                <Search className="h-4 w-4 text-gray-400" />
              </button>

              {showClientesList && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                  <input
                    type="text"
                    placeholder="Buscar por nombre o NIT..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full px-4 py-2 border-b border-gray-200 focus:outline-none"
                    autoFocus
                  />
                  {clientesFiltrados.length > 0 ? (
                    <ul className="divide-y divide-gray-100">
                      {clientesFiltrados.map((cliente) => (
                        <li key={cliente.cliId}>
                          <button
                            onClick={() => handleSeleccionarCliente(cliente)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                          >
                            <div className="font-medium text-gray-900">
                              {cliente.razonSocial}
                            </div>
                            <div className="text-sm text-gray-500">
                              NIT: {cliente.nitDocumento}
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
                </div>
              )}
            </div>
          </div>

          {/* Información de Última Solicitud */}
          {selectedCliente && (
            <div className="p-6 border-b border-gray-200 bg-blue-50/50">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Información de Última Solicitud
              </h2>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : ultimaSolicitud ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">No. Solicitud</p>
                    <p className="text-base font-semibold text-gray-900">
                      {ultimaSolicitud.sol_numero_solicitud}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha Solicitud</p>
                    <p className="text-base font-semibold text-gray-900">
                      {ultimaSolicitud.fecha_creacion
                        ? new Date(ultimaSolicitud.fecha_creacion).toLocaleDateString("es-CO")
                        : "-"}
                    </p>
                  </div>
                  {cupoActual && (
                    <div>
                      <p className="text-sm text-gray-600">Cupo Actual (Sistema)</p>
                      <p className="text-base font-semibold text-green-700">
                        ${cupoActual.toLocaleString("es-CO")}
                      </p>
                    </div>
                  )}
                  {ultimaSolicitud.consumo_mensual_proyectado && (
                    <div>
                      <p className="text-sm text-gray-600">Consumo Mensual Proyectado</p>
                      <p className="text-base font-semibold text-gray-900">
                        ${ultimaSolicitud.consumo_mensual_proyectado.toLocaleString("es-CO")}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                  No hay solicitudes anteriores para este cliente
                </div>
              )}
            </div>
          )}

          {/* Formulario de Ampliación */}
          {selectedCliente && (
            <div className="p-6 space-y-6">
              {!cupoActual && (
                <div>
                  <label htmlFor="cupoActualManual" className="block text-sm font-semibold text-gray-700 mb-2">
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Completa este campo si el cupo actual no se cargó automáticamente
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="nuevoCupo" className="block text-sm font-semibold text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="justificacion" className="block text-sm font-semibold text-gray-700 mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
            <button
              onClick={handleCancelar}
              className="px-6 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            {selectedCliente && (
              <button
                onClick={handleLimpiar}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Limpiar
              </button>
            )}
            {selectedCliente && (
              <button
                onClick={handleGuardar}
                disabled={guardando || !formData.nuevoCupoSolicitado || !formData.justificacion}
                className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {guardando ? "Guardando..." : "Guardar Ampliación"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
