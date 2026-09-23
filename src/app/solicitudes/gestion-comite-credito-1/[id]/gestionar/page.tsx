"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { parametrosService } from "@/services/parametros.service";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import { SoportesAnalisis } from "@/components/SoportesAnalisis";
import { SolicitudInfoBlock } from "@/components/solicitudes/SolicitudInfoBlock";
import { EtapasPreviasBlock } from "@/components/solicitudes/EtapasPreviasBlock";
import { TablasCumplimientoModal } from "@/components/TablasCumplimientoModal";
import { ConfirmModal, SuccessModal, ErrorModal } from "@/components/modals";
import { DiasRestantesBadge } from "@/components/badges/DiasRestantesBadge";
import { WORKFLOW_ETAPA } from "@/constants/workflow-etapas";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { ArrowLeft, FileText, CheckCircle2, TrendingUp, MessageSquare } from "lucide-react";

interface Solicitud {
  sol_id: number;
  sol_numero: string;
  sol_cli_id: number;
  cliente_nombre: string;
  cliente_nit?: string;
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
  sol_observacion_ejn?: string | null;
  sol_cupo_solicitado?: number | null;
  sol_justificacion_ampliacion?: string | null;
  sol_cupo_actual_referencia?: number | null;
  usuario_registro?: string;
  usuario_registro_id?: number;
  ejecutivo_nombre?: string;
  sol_fecha_gest_ejn?: string | null;
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
  evaluacionRiesgo: string;
  limiteCreditoRecomendado: string;
  plazoRecomendado: string;
  observacionesComite: string;
  guardando: boolean;
}

interface DiasRespuesta {
  [key: string]: number;
}

export default function GestionComiteCredito1Page() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const solicitudId = params?.id ? Number(params.id) : null;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [diasRespuesta, setDiasRespuesta] = useState<DiasRespuesta>({});
  const { historial: historialWorkflow } = useHistorialWorkflow(solicitudId);
  const [registro, setRegistro] = useState<RegistroState>({
    evaluacionRiesgo: "",
    limiteCreditoRecomendado: "",
    plazoRecomendado: "",
    observacionesComite: "",
    guardando: false,
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mostrarTablasCumplimiento, setMostrarTablasCumplimiento] = useState(false);
  useEffect(() => {
    let cancelled = false;

    async function cargarDatos(id: number) {
      try {
        setLoading(true);
        const [solicitudData, dias] = await Promise.all([
          solicitudesService.getById(id),
          parametrosService.getDiasRespuesta(),
        ]);
        if (cancelled) return;

        setSolicitud(solicitudData);
        setDiasRespuesta(dias);
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

  const puedeGuardar = registro.evaluacionRiesgo.trim() !== "" && registro.observacionesComite.trim() !== "";

  const handleGuardarRevision = () => {
    if (!solicitud || !puedeGuardar) return;

    const usuarioId = obtenerUsuarioId();
    if (!usuarioId) {
      setErrorMessage("No hay usuario autenticado para registrar la revisión.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmGuardarRevision = async () => {
    if (!solicitud) return;

    try {
      setRegistro((prev) => ({ ...prev, guardando: true }));

      const comentario = `EVALUACIÓN DE RIESGO: ${registro.evaluacionRiesgo}\n\nLÍMITE CRÉDITO RECOMENDADO: ${registro.limiteCreditoRecomendado}\n\nPLAZO RECOMENDADO: ${registro.plazoRecomendado}\n\nOBSERVACIONES: ${registro.observacionesComite}`;

      await solicitudesService.guardarConceptoComiteCredito1(solicitud.sol_id, {
        comentario,
      });

      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error guardando:", error);
      setErrorMessage("No se pudo guardar la evaluación. Intenta de nuevo.");
      setShowConfirmModal(false);
    } finally {
      setRegistro((prev) => ({ ...prev, guardando: false }));
    }
  };

  const fechaEstimada = (solicitud as any)?.sol_fecha_est_gest_cc1;

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
              <h1 className="text-[19px] font-extrabold text-white tracking-[-0.01em] m-0">Gestión Comité Crédito 1</h1>
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
                historial={historialWorkflow}
                etapaActual="CC1"
                onOpenTablasCumplimiento={() => setMostrarTablasCumplimiento(true)}
              />

              {/* Cuerpo: evaluación + historial abajo */}
              <div className="grid grid-cols-1 gap-6 p-7">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-[#0f172a] mb-4 flex items-center gap-[9px] tracking-[-0.01em]">
                    <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} strokeWidth={2.2} className="text-brand-600" />
                    </div>
                    Evaluación Comité Crédito 1
                  </h2>

                  <div className="border border-[#eef1f6] bg-[#fafbfd] rounded-[18px] p-5 flex flex-col gap-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    {/* Evaluación de riesgo + condiciones recomendadas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[13px] font-bold text-[#374151] mb-2">
                          Evaluación de riesgo <span className="text-[#dc2626]">*</span>
                        </label>
                        <select
                          value={registro.evaluacionRiesgo}
                          onChange={(e) =>
                            setRegistro((prev) => ({
                              ...prev,
                              evaluacionRiesgo: e.target.value,
                            }))
                          }
                          className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans bg-white focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]">
                          <option value="">Selecciona una evaluación</option>
                          <option value="bajo">Riesgo bajo</option>
                          <option value="medio">Riesgo medio</option>
                          <option value="alto">Riesgo alto</option>
                          <option value="muy-alto">Riesgo muy alto</option>
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
                          <TrendingUp size={15} strokeWidth={2} className="text-brand-600" />
                          Límite recomendado (COP)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={registro.limiteCreditoRecomendado}
                          onChange={(e) => {
                            const valor = e.target.value.replace(/\D/g, "");
                            setRegistro((prev) => ({
                              ...prev,
                              limiteCreditoRecomendado: valor,
                            }));
                          }}
                          placeholder="Ej: 50000000"
                          className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]"
                        />
                      </div>

                      <div>
                        <label className="block text-[13px] font-bold text-[#374151] mb-2">
                          Plazo recomendado (días)
                        </label>
                        <input
                          type="number"
                          value={registro.plazoRecomendado}
                          onChange={(e) =>
                            setRegistro((prev) => ({
                              ...prev,
                              plazoRecomendado: e.target.value,
                            }))
                          }
                          placeholder="Ej: 90"
                          className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]"
                        />
                      </div>
                    </div>

                    {/* Observaciones */}
                    <div>
                      <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
                        <MessageSquare size={15} strokeWidth={2} className="text-brand-600" />
                        Observaciones del comité <span className="text-[#dc2626]">*</span>
                      </label>
                      <textarea
                        value={registro.observacionesComite}
                        onChange={(e) =>
                          setRegistro((prev) => ({
                            ...prev,
                            observacionesComite: e.target.value,
                          }))
                        }
                        placeholder="Escribe las observaciones del análisis de crédito…"
                        rows={5}
                        className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none resize-none font-sans leading-normal focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]"
                      />
                    </div>

                    <SoportesAnalisis solicitudId={solicitud.sol_id} wetId={WORKFLOW_ETAPA.CC1.id} />

                    <div className="flex gap-2.5">
                      <button
                        onClick={handleGuardarRevision}
                        disabled={!puedeGuardar || registro.guardando}
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 hover:-translate-y-px text-white rounded-[11px] p-3 text-[13.5px] font-bold transition-all shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                        {registro.guardando ? "Guardando…" : "Guardar evaluación"}
                      </button>
                      <button
                        onClick={() => router.back()}
                        disabled={registro.guardando}
                        className="bg-white text-[#475569] border-[1.5px] border-[#dfe5ee] rounded-[11px] px-[18px] py-3 text-[13.5px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                        Cancelar
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
        title="Confirmar envío"
        message="¿Estás seguro de que deseas enviar esta revisión del Comité Crédito 1? La solicitud pasará a Comité Crédito 2. Esta acción no se puede deshacer."
        confirmText="Sí, enviar"
        cancelText="Cancelar"
        isLoading={registro.guardando}
        onConfirm={handleConfirmGuardarRevision}
        onCancel={() => setShowConfirmModal(false)}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        title="¡Éxito!"
        message="La revisión del Comité Crédito 1 fue enviada correctamente a Comité Crédito 2. Serás redirigido a la lista de solicitudes."
        actionText="Aceptar"
        autoClose={true}
        autoCloseDelay={3000}
        onAction={() => router.push("/solicitudes/gestion-comite-credito-1")}
      />

      <ErrorModal isOpen={!!errorMessage} message={errorMessage || ""} onAction={() => setErrorMessage(null)} />

      {mostrarTablasCumplimiento && solicitud && (
        <TablasCumplimientoModal solicitudId={solicitud.sol_id} onClose={() => setMostrarTablasCumplimiento(false)} />
      )}
    </div>
  );
}
