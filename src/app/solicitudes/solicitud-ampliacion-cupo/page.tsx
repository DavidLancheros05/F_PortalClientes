"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { clientesService } from "@/services/clientes/clientes.service";
import type { ClienteListResponse, ClienteDetailResponse } from "@/types/api.types";
import { solicitudesService } from "@/services/solicitudes.service";
import { ampliacionCupoService } from "@/services/ampliacion-cupo/ampliacion-cupo.service";
import { Search, X, DollarSign, MessageSquare, TrendingUp, Package } from "lucide-react";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { ConfirmModal, SuccessModal, ErrorModal } from "@/components/modals";

interface UltimaSolicitud {
  sol_id: number;
  sol_numero: string;
  sol_fecha_creacion: string;
  cliente_nombre: string;
  sol_consumo_mensual_proyectado?: number | null;
  sol_cupo_aprobado?: number | string | null;
  sol_ses_id: number;
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar clientes al montar
  useEffect(() => {
    async function cargarClientes() {
      try {
        setLoading(true);
        const datos = await clientesService.getAprobados();
        setClientes(datos);
      } catch (error) {
        console.error("Error cargando clientes:", error);
        setErrorMessage("Error al cargar clientes");
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
        setErrorMessage("Error al cargar solicitud anterior");
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
    cliente.cli_razon_social?.toLowerCase().includes(searchInput.toLowerCase()),
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
      setErrorMessage("Error al cargar datos del cliente");
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
  };

  const handleGuardar = () => {
    if (!selectedCliente?.cli_id) {
      setErrorMessage("Debes seleccionar un cliente");
      return;
    }

    if (!cupoActual && !formData.cupoActualManual.trim()) {
      setErrorMessage("Debes ingresar el cupo actual del cliente");
      return;
    }

    if (!formData.nuevoCupoSolicitado.trim()) {
      setErrorMessage("Debes ingresar el nuevo cupo solicitado");
      return;
    }

    if (!formData.justificacion.trim()) {
      setErrorMessage("Debes ingresar una justificación");
      return;
    }

    if (!formData.consumoMensualProyectado.trim() || Number(formData.consumoMensualProyectado) <= 0) {
      setErrorMessage("Debes ingresar el consumo mensual proyectado (mayor a 0)");
      return;
    }

    if (!formData.toneladasProyectadas.trim() || Number(formData.toneladasProyectadas) <= 0) {
      setErrorMessage("Debes ingresar las toneladas mensuales proyectadas (mayor a 0)");
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmarGuardar = async () => {
    if (!selectedCliente?.cli_id) return;

    try {
      setGuardando(true);

      const cupoActualReferencia = cupoActual ?? parseFloat(formData.cupoActualManual);

      await ampliacionCupoService.create({
        clienteId: selectedCliente.cli_id,
        nuevoCupo: parseFloat(formData.nuevoCupoSolicitado),
        justificacion: formData.justificacion,
        consumoMensualProyectado: parseFloat(formData.consumoMensualProyectado),
        toneladasProyectadas: parseFloat(formData.toneladasProyectadas),
        solicitudAnteriorId: ultimaSolicitud?.sol_id,
        cupoActualReferencia: Number.isFinite(cupoActualReferencia) ? cupoActualReferencia : undefined,
      });

      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("Error guardando ampliación de cupo:", error);
      setShowConfirmModal(false);
      setErrorMessage(error?.response?.data?.message || "Error al guardar ampliación de cupo");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to font-sans text-[#0f172a]">
      <div className="max-w-[820px] mx-auto px-5 pt-7 pb-[70px]">
        <PageHeaderCard
          icon={DollarSign}
          title="Ampliación de Cupo"
          subtitle="Selecciona un cliente y registra la solicitud de ampliación de cupo"
          onBack={handleCancelar}
        />

        <div className="bg-white border border-[#e9ecf2] rounded-[22px] overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)]">
          {/* Selección de Cliente */}
          <div className="px-7 py-[26px] border-b border-[#eef1f6]">
            <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
              <Search size={15} strokeWidth={2} className="text-brand-600" />
              Seleccionar Cliente <span className="text-[#dc2626]">*</span>
            </label>
            <div className="relative">
              <button
                ref={clienteButtonRef}
                onClick={() => setShowClientesList(!showClientesList)}
                className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] text-left bg-white hover:bg-[#f8fafc] outline-none focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12] flex items-center justify-between transition-colors">
                <span className={selectedCliente ? "text-[#0f172a]" : "text-[#94a3b8]"}>
                  {selectedCliente
                    ? `${selectedCliente.cli_razon_social} (${selectedCliente.cli_nro_identificacion})`
                    : "Buscar cliente..."}
                </span>
                <Search className="h-4 w-4 text-[#94a3b8]" />
              </button>

              {showClientesList &&
                createPortal(
                  <div
                    ref={clienteMenuRef}
                    className="fixed bg-white border border-[#e9ecf2] rounded-[12px] shadow-[0_20px_50px_rgba(15,23,42,0.15)] z-50 max-h-64 overflow-y-auto"
                    style={{
                      top: clientesMenuPos.top,
                      left: clientesMenuPos.left,
                      width: clientesMenuPos.width,
                    }}>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o NIT..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full px-4 py-2 border-b border-[#eef1f6] outline-none sticky top-0 bg-white text-[13.5px]"
                      autoFocus
                    />
                    {clientesFiltrados.length > 0 ? (
                      <ul className="divide-y divide-[#eef1f6]">
                        {clientesFiltrados.map((cliente) => (
                          <li key={cliente.cli_id}>
                            <button
                              onClick={() => handleSeleccionarCliente(cliente)}
                              className="w-full text-left px-4 py-3 hover:bg-[#eef4ff] transition-colors">
                              <div className="text-[13.5px] font-semibold text-[#0f172a]">
                                {cliente.cli_razon_social}
                              </div>
                              <div className="text-[11.5px] text-[#94a3b8] mt-0.5">
                                NIT: {cliente.cli_nro_identificacion}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-center text-[#94a3b8] text-[12.5px]">
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
            <div className="px-7 py-[22px] border-b border-[#eef1f6]">
              <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-3">
                Información de Última Solicitud
              </p>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600" />
                </div>
              ) : ultimaSolicitud ? (
                <div className="rounded-[16px] border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-1">
                        No. Solicitud
                      </p>
                      <p className="text-[13.5px] font-bold text-[#0f172a] m-0">{ultimaSolicitud.sol_numero}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-1">
                        Fecha Solicitud
                      </p>
                      <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                        {ultimaSolicitud.sol_fecha_creacion
                          ? new Date(ultimaSolicitud.sol_fecha_creacion).toLocaleDateString("es-CO")
                          : "-"}
                      </p>
                    </div>
                    {cupoActual && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-1">
                          Cupo Actual (Sistema)
                        </p>
                        <p className="text-[15px] font-extrabold text-emerald-800 m-0">
                          ${cupoActual.toLocaleString("es-CO")}
                        </p>
                      </div>
                    )}
                    {ultimaSolicitud.sol_consumo_mensual_proyectado && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-1">
                          Consumo Mensual Proyectado
                        </p>
                        <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                          ${ultimaSolicitud.sol_consumo_mensual_proyectado.toLocaleString("es-CO")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
                  No hay solicitudes anteriores para este cliente
                </div>
              )}
            </div>
          )}

          {/* Formulario de Ampliación */}
          {selectedCliente && (
            <div className="p-7">
              <div className="border border-[#eef1f6] bg-[#fafbfd] rounded-[18px] p-5 flex flex-col gap-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                {!cupoActual && (
                  <div>
                    <label
                      htmlFor="cupoActualManual"
                      className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
                      <DollarSign size={15} strokeWidth={2} className="text-brand-600" />
                      Cupo Actual (Si no aparece arriba) <span className="text-[#dc2626]">*</span>
                    </label>
                    <input
                      id="cupoActualManual"
                      type="number"
                      placeholder="Ingresa el cupo actual del cliente"
                      value={formData.cupoActualManual}
                      onChange={(e) => setFormData({ ...formData, cupoActualManual: e.target.value })}
                      className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]"
                    />
                    <p className="text-[11.5px] text-[#94a3b8] mt-1.5">
                      Completa este campo si el cupo actual no se cargó automáticamente
                    </p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="nuevoCupo"
                    className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
                    <DollarSign size={15} strokeWidth={2} className="text-brand-600" />
                    Nuevo Cupo Solicitado <span className="text-[#dc2626]">*</span>
                  </label>
                  <input
                    id="nuevoCupo"
                    type="number"
                    placeholder="Ingresa el nuevo cupo"
                    value={formData.nuevoCupoSolicitado}
                    onChange={(e) => setFormData({ ...formData, nuevoCupoSolicitado: e.target.value })}
                    className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-[18px]">
                  <div>
                    <label
                      htmlFor="consumoMensualProyectado"
                      className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
                      <TrendingUp size={15} strokeWidth={2} className="text-brand-600" />
                      Consumo Mensual Proyectado <span className="text-[#dc2626]">*</span>
                    </label>
                    <input
                      id="consumoMensualProyectado"
                      type="number"
                      placeholder="Ej: 5000000"
                      value={formData.consumoMensualProyectado}
                      onChange={(e) => setFormData({ ...formData, consumoMensualProyectado: e.target.value })}
                      className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="toneladasProyectadas"
                      className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
                      <Package size={15} strokeWidth={2} className="text-brand-600" />
                      Toneladas Mensuales Proyectadas <span className="text-[#dc2626]">*</span>
                    </label>
                    <input
                      id="toneladasProyectadas"
                      type="number"
                      placeholder="Ej: 500"
                      value={formData.toneladasProyectadas}
                      onChange={(e) => setFormData({ ...formData, toneladasProyectadas: e.target.value })}
                      className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="justificacion"
                    className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
                    <MessageSquare size={15} strokeWidth={2} className="text-brand-600" />
                    Justificación <span className="text-[#dc2626]">*</span>
                  </label>
                  <textarea
                    id="justificacion"
                    placeholder="Explica los motivos de la ampliación de cupo"
                    value={formData.justificacion}
                    onChange={(e) => setFormData({ ...formData, justificacion: e.target.value })}
                    rows={5}
                    className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none resize-none font-sans leading-normal focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]"
                  />
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2.5">
                  <button
                    onClick={handleGuardar}
                    disabled={
                      guardando ||
                      !formData.nuevoCupoSolicitado ||
                      !formData.justificacion ||
                      !formData.consumoMensualProyectado ||
                      !formData.toneladasProyectadas
                    }
                    className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 hover:-translate-y-px text-white rounded-[11px] p-3 text-[13.5px] font-bold transition-all shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                    {guardando ? "Guardando..." : "Guardar Ampliación"}
                  </button>
                  <button
                    onClick={handleLimpiar}
                    disabled={guardando}
                    className="inline-flex items-center gap-2 bg-white text-[#475569] border-[1.5px] border-[#dfe5ee] rounded-[11px] px-[18px] py-3 text-[13.5px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                    <X className="h-4 w-4" />
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          )}

          {!selectedCliente && (
            <div className="px-7 py-[22px] flex justify-end">
              <button
                onClick={handleCancelar}
                className="bg-white text-[#475569] border-[1.5px] border-[#dfe5ee] rounded-[11px] px-[18px] py-3 text-[13.5px] font-semibold">
                Cancelar
              </button>
            </div>
          )}
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

      <SuccessModal
        isOpen={showSuccessModal}
        title="¡Éxito!"
        message="La ampliación de cupo fue registrada exitosamente."
        actionText="Aceptar"
        autoClose={true}
        autoCloseDelay={2000}
        onAction={() => {
          setShowSuccessModal(false);
          handleLimpiar();
        }}
      />

      <ErrorModal isOpen={!!errorMessage} message={errorMessage || ""} onAction={() => setErrorMessage(null)} />
    </div>
  );
}
