"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import { ConfirmModal, SuccessModal, ErrorModal } from "@/components/modals";
import { SolicitudInfoBlock } from "@/components/solicitudes/SolicitudInfoBlock";
import { EtapasPreviasBlock } from "@/components/solicitudes/EtapasPreviasBlock";
import { DiasRestantesBadge } from "@/components/badges/DiasRestantesBadge";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { ArrowLeft, CheckCircle2, FileText, DollarSign, Package, MessageSquare } from "lucide-react";

interface Solicitud {
  sol_id: number;
  sol_numero: string;
  sol_cli_id: number;
  cliente_nombre: string;
  cliente_nit?: string | null;
  sol_co_id: number;
  centro_operacion_nombre: string;
  sol_ses_id: number;
  sol_wet_id?: number;
  sol_wee_id?: number;
  etapa_nombre?: string;
  resultado_nombre?: string;
  sol_fecha_creacion: string;
  sol_consumo_mensual_proyectado: number | null;
  sol_toneladas_proyectadas?: number | null;
  cliente_consumo_mensual_proyectado?: number | null;
  cliente_toneladas_proyectadas?: number | null;
  sol_cupo_solicitado?: number | null;
  sol_justificacion_ampliacion?: string | null;
  sol_cupo_actual_referencia?: number | null;
  usuario_registro?: string;
  usuario_registro_id?: number;
  ejecutivo_nombre?: string;
  usuario_revision?: string;
  fecha_revision?: string;
  fecha_creacion?: string;
  consumo_mensual_proyectado?: number | null;
  sa_sol_id?: number;
  numero_solicitud?: string;
  cliente_id?: number;
  estado_id?: number;
}

interface RegistroState {
  consumoMensual: number | null;
  consumoMensualDisplay: string;
  toneladasProyectadas: number | null;
  toneladasProyectadasDisplay: string;
  observaciones: string;
  guardando: boolean;
}

export default function RegistrarConceptoPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const solicitudId = params?.id ? Number(params.id) : null;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [registro, setRegistro] = useState<RegistroState>({
    consumoMensual: null,
    consumoMensualDisplay: "",
    toneladasProyectadas: null,
    toneladasProyectadasDisplay: "",
    observaciones: "",
    guardando: false,
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { historial } = useHistorialWorkflow(solicitudId);
  useEffect(() => {
    let cancelled = false;

    async function cargarDatos(id: number) {
      try {
        setLoading(true);
        const solicitudData = await solicitudesService.getById(id);
        if (cancelled) return;
        setSolicitud(solicitudData);
      } catch (error) {
        if (cancelled) return;
        console.error("Error cargando datos:", error);
        setErrorMessage("No se pudo cargar la solicitud. Intenta de nuevo.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (solicitudId) {
      cargarDatos(solicitudId);
    }
    return () => {
      cancelled = true;
    };
  }, [solicitudId]);

  const formatNumberWithThousands = (value: string): string => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) return "";
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseFormattedNumber = (formatted: string): number | null => {
    const cleaned = formatted.replace(/\./g, "");
    return cleaned ? Number(cleaned) : null;
  };

  const handleConsumoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatNumberWithThousands(input);
    const numericValue = parseFormattedNumber(formatted);

    setRegistro((prev) => ({
      ...prev,
      consumoMensualDisplay: formatted,
      consumoMensual: numericValue,
    }));
  };

  const handleToneladasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatNumberWithThousands(input);
    const numericValue = parseFormattedNumber(formatted);

    setRegistro((prev) => ({
      ...prev,
      toneladasProyectadasDisplay: formatted,
      toneladasProyectadas: numericValue,
    }));
  };

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

  const handleGuardarConcepto = () => {
    if (!solicitud) return;

    const usuarioId = obtenerUsuarioId();
    if (!usuarioId) {
      setErrorMessage("No hay usuario autenticado para registrar el concepto.");
      return;
    }

    if (!registro.consumoMensual || registro.consumoMensual <= 0) {
      setErrorMessage("El consumo mensual proyectado es obligatorio y debe ser mayor a 0.");
      return;
    }

    if (!registro.toneladasProyectadas || registro.toneladasProyectadas <= 0) {
      setErrorMessage("Las toneladas mensuales proyectadas son obligatorias y deben ser mayores a 0.");
      return;
    }

    if (!registro.observaciones.trim()) {
      setErrorMessage("Las observaciones son obligatorias.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmGuardar = async () => {
    if (!solicitud) return;

    const usuarioId = obtenerUsuarioId();
    if (!usuarioId) return;

    try {
      setRegistro((prev) => ({ ...prev, guardando: true }));

      await solicitudesService.guardarGestionEjecutivo(solicitud.sol_id ?? solicitud.sa_sol_id!, {
        consumo_mensual_proyectado: registro.consumoMensual,
        toneladas_proyectadas: registro.toneladasProyectadas,
        observacionesComercial: registro.observaciones,
        usuario_modifica: usuarioId,
      });

      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error guardando:", error);
      setErrorMessage("No se pudo guardar el concepto. Intenta de nuevo.");
      setShowConfirmModal(false);
    } finally {
      setRegistro((prev) => ({ ...prev, guardando: false }));
    }
  };

  const fechaEstimada = (solicitud as any)?.sol_fecha_est_gest_ejn;

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to font-sans text-[#0f172a]">
      <div className="max-w-[1240px] mx-auto px-5 pt-7 pb-[70px]">
        <div className="bg-white border border-[#e9ecf2] rounded-[22px] overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)]">
          {/* Header */}
          <div className="bg-brand-gradient px-7 py-[22px] flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-[34px] h-[34px] rounded-[10px] bg-white/[0.14] hover:bg-white/[0.26] flex items-center justify-center text-white flex-shrink-0 transition-colors">
              <ArrowLeft size={15} strokeWidth={2.3} />
            </button>
            <div className="w-[42px] h-[42px] rounded-xl bg-white/[0.16] flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[19px] font-extrabold text-white tracking-[-0.01em] m-0">
                Gestión de Concepto Ejecutivo de Negocios
              </h1>
              {solicitud && (
                <p className="text-[12.5px] text-[#c3d5f5] mt-[3px] m-0 truncate">
                  Solicitud{" "}
                  <span className="font-bold text-white">{solicitud.sol_numero || solicitud.numero_solicitud}</span>
                </p>
              )}
            </div>
            {fechaEstimada && (
              <div className="ml-auto flex-shrink-0 bg-white/[0.14] border border-white/[0.18] rounded-2xl px-5 py-2.5 text-right">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#c3d5f5] m-0 mb-1">
                  Fecha estimada respuesta
                </p>
                <div className="flex items-center justify-end gap-2.5">
                  <p className="text-[17px] font-extrabold text-white m-0 leading-none">
                    {new Date(fechaEstimada).toLocaleDateString("es-CO")}
                  </p>
                  <DiasRestantesBadge fecha={fechaEstimada} />
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="px-8 py-6 animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="h-10 bg-gray-100 rounded" />
                <div className="h-10 bg-gray-100 rounded" />
                <div className="h-10 bg-gray-100 rounded" />
                <div className="h-10 bg-gray-100 rounded" />
              </div>
              <div className="h-48 bg-gray-100 rounded" />
            </div>
          ) : !solicitud ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No se encontró la solicitud</p>
            </div>
          ) : (
            <>
              {/* Info block */}
              <SolicitudInfoBlock solicitud={solicitud} fechaEstimada={fechaEstimada} />

              {/* Etapas previas */}
              <EtapasPreviasBlock
                solicitud={solicitud}
                historial={historial}
                etapaActual="EJN"
              />

              {/* Cuerpo: registro + historial abajo */}
              <div className="grid grid-cols-1 gap-5 px-7 pt-4 pb-7">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-[#0f172a] mb-3 flex items-center gap-[9px] tracking-[-0.01em]">
                    <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} strokeWidth={2.2} className="text-brand-600" />
                    </div>
                    Registrar Concepto
                  </h2>

                  <div className="border border-[#eef1f6] bg-[#fafbfd] rounded-[18px] p-5 grid grid-cols-1 md:grid-cols-2 gap-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px] md:col-span-2">
                      {/* Consumo Mensual Proyectado */}
                      <div>
                        <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
                          <DollarSign size={15} strokeWidth={2} className="text-brand-600" />
                          Consumo Mensual Proyectado (COP) <span className="text-[#dc2626]">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={registro.consumoMensualDisplay}
                          onChange={handleConsumoChange}
                          placeholder="Ej: 5.000.000"
                          className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]"
                        />
                        {solicitud.cliente_consumo_mensual_proyectado != null && (
                          <p className="mt-1.5 text-[11.5px] text-[#94a3b8]">
                            El cliente declaró en el formulario: $
                            {solicitud.cliente_consumo_mensual_proyectado.toLocaleString("es-CO")}
                          </p>
                        )}
                      </div>

                      {/* Toneladas Mensuales Proyectadas */}
                      <div>
                        <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
                          <Package size={15} strokeWidth={2} className="text-brand-600" />
                          Toneladas Mensuales Proyectadas <span className="text-[#dc2626]">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={registro.toneladasProyectadasDisplay}
                          onChange={handleToneladasChange}
                          placeholder="Ej: 500"
                          className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]"
                        />
                        {solicitud.cliente_toneladas_proyectadas != null && (
                          <p className="mt-1.5 text-[11.5px] text-[#94a3b8]">
                            El cliente declaró en el formulario:{" "}
                            {solicitud.cliente_toneladas_proyectadas.toLocaleString("es-CO")} toneladas
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Observaciones */}
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
                        <MessageSquare size={15} strokeWidth={2} className="text-brand-600" />
                        Observaciones <span className="text-[#dc2626]">*</span>
                      </label>
                      <textarea
                        value={registro.observaciones}
                        onChange={(e) =>
                          setRegistro((prev) => ({
                            ...prev,
                            observaciones: e.target.value,
                          }))
                        }
                        placeholder="Escribe tus observaciones aquí..."
                        rows={5}
                        className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none resize-none font-sans leading-normal focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]"
                      />
                    </div>

                    {/* Botones de acción */}
                    <div className="flex w-full justify-center gap-2.5 md:col-span-2">
                      <button
                        onClick={handleGuardarConcepto}
                        disabled={
                          !registro.consumoMensual ||
                          !registro.toneladasProyectadas ||
                          !registro.observaciones.trim() ||
                          registro.guardando
                        }
                        className="min-w-[180px] flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 hover:-translate-y-px text-white rounded-[11px] px-5 py-3 text-[13.5px] font-bold transition-all shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                        {registro.guardando ? "Guardando..." : "Guardar Concepto"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-[18px]">
                    <DocumentosCargadosSolicitud solicitudId={solicitud.sol_id} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Registro de Concepto"
        message={`¿Estás seguro de que deseas registrar el concepto con un consumo mensual de $${registro.consumoMensual?.toLocaleString("es-CO")} y ${registro.toneladasProyectadas?.toLocaleString("es-CO")} toneladas mensuales proyectadas?`}
        confirmText="Sí, Guardar"
        cancelText="Cancelar"
        isLoading={registro.guardando}
        onConfirm={handleConfirmGuardar}
        onCancel={() => setShowConfirmModal(false)}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        title="¡Éxito!"
        message="El concepto fue generado con éxito. Serás redirigido a la lista de solicitudes."
        actionText="Aceptar"
        autoClose={true}
        autoCloseDelay={3000}
        onAction={() => router.push("/solicitudes/gestion-ejecutivo-negocios")}
      />

      <ErrorModal isOpen={!!errorMessage} message={errorMessage || ""} onAction={() => setErrorMessage(null)} />
    </div>
  );
}
