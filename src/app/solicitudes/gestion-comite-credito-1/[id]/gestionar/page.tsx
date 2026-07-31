"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { parametrosService } from "@/services/parametros.service";
import HistorialSolicitud from "@/components/historial/HistorialSolicitud";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import { SoportesAnalisis } from "@/components/SoportesAnalisis";
import { ConfirmModal, SuccessModal, ErrorModal } from "@/components/modals";
import { ESTADOS } from "@/lib/workflow-labels";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { useSolicitudCupoSolicitado } from "@/hooks/useSolicitudCupoSolicitado";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  CreditCard,
  TrendingUp,
  MessageSquare,
} from "lucide-react";

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
  sol_fecha_creacion: string;
  sol_fecha_estimada_respuesta_comercial: string | null;
  sol_consumo_mensual_proyectado: number | null;
  sol_toneladas_proyectadas?: number | null;
  sol_observacion_ejn?: string | null;
  usuario_registro?: string;
  usuario_registro_id?: number;
  ejecutivo_nombre?: string;
  usuario_revision?: string;
  fecha_revision?: string;
  fecha_creacion?: string;
  fecha_estimada_respuesta_comercial?: string | null;
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

// Mismos códigos de estado que ESTADOS (workflow-labels.ts), con los
// tokens de color del sistema visual nuevo (ver design_handoff_portal_rediseños).
const ESTADO_TOKENS: Record<number, { color: string; bg: string }> = {
  1: { color: "#b45309", bg: "#fffbeb" }, // Borrador
  2: { color: "#b45309", bg: "#fffbeb" }, // Pendiente
  3: { color: "#1d4ed8", bg: "#eff6ff" }, // En revisión (estado normal en esta pantalla)
  5: { color: "#047857", bg: "#ecfdf5" }, // Aprobada
  6: { color: "#b91c1c", bg: "#fef2f2" }, // Rechazada
};

export default function GestionComiteCredito1Page() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const solicitudId = params?.id ? Number(params.id) : null;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [diasRespuesta, setDiasRespuesta] = useState<DiasRespuesta>({});
  const { historial: historialWorkflow } = useHistorialWorkflow(solicitudId);
  const comentarioOFC = historialWorkflow.find((h) => h.etapaCodigo === "OFC")?.comentario;
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
  const { solicitaCredito, montoSolicitadoTexto, formaPagoSolicitada } = useSolicitudCupoSolicitado(solicitudId);

  useEffect(() => {
    async function cargarDatos() {
      if (!solicitudId) return;

      try {
        setLoading(true);
        const [solicitudData, dias] = await Promise.all([
          solicitudesService.getById(solicitudId),
          parametrosService.getDiasRespuesta(),
        ]);

        setSolicitud(solicitudData);
        setDiasRespuesta(dias);
      } catch (error) {
        console.error("Error cargando datos:", error);
        alert("Error al cargar la solicitud");
      } finally {
        setLoading(false);
      }
    }

    cargarDatos();
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
      alert("No hay usuario autenticado para registrar la revisión.");
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

  const fechaEstimada =
    (solicitud as any)?.sol_fecha_estimada_comite_credito_1 ||
    solicitud?.sol_fecha_estimada_respuesta_comercial ||
    solicitud?.fecha_estimada_respuesta_comercial;

  const estadoId = solicitud?.sol_estado_id ?? solicitud?.estado_id ?? 1;
  const estadoTokens = ESTADO_TOKENS[estadoId] || ESTADO_TOKENS[1];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f8fc] to-[#eef1f7] font-sans text-[#0f172a]">
      <div className="max-w-[1240px] mx-auto px-5 pt-7 pb-[70px]">
        <div className="bg-white border border-[#e9ecf2] rounded-[22px] overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)]">
          {/* Header */}
          <div className="bg-[linear-gradient(120deg,#003d99_0%,#0050c7_100%)] px-7 py-[22px] flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="w-[34px] h-[34px] rounded-[10px] bg-white/[0.14] hover:bg-white/[0.26] flex items-center justify-center text-white flex-shrink-0 transition-colors"
            >
              <ArrowLeft size={15} strokeWidth={2.3} />
            </button>
            <div className="w-[42px] h-[42px] rounded-xl bg-white/[0.16] flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[19px] font-extrabold text-white tracking-[-0.01em] m-0">
                Gestión Comité Crédito 1
              </h1>
              {solicitud && (
                <p className="text-[12.5px] text-[#c3d5f5] mt-[3px] m-0 truncate">
                  Solicitud{" "}
                  <span className="font-bold text-white">
                    {solicitud.sol_numero_solicitud || solicitud.numero_solicitud}
                  </span>
                </p>
              )}
            </div>
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
              <div className="px-7 py-[26px] border-b border-[#eef1f6]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-1">
                      Cliente
                    </p>
                    <p className="text-sm font-bold text-[#0f172a] m-0">{solicitud.cliente_nombre}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-1">
                      Centro de operación
                    </p>
                    <p className="text-sm font-bold text-[#0f172a] m-0">{solicitud.centro_operacion_nombre}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-1">
                      Estado
                    </p>
                    <span
                      className="inline-flex items-center gap-1.5 text-[12.5px] font-bold px-[11px] py-1 rounded-full"
                      style={{ color: estadoTokens.color, background: estadoTokens.bg }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: estadoTokens.color }} />
                      {ESTADOS[estadoId] || "Desconocido"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-4 mt-[22px]">
                  {/* Solicita cupo de crédito */}
                  <div
                    className="rounded-2xl p-5 border"
                    style={{
                      borderColor: solicitaCredito ? "#a7f3d0" : "#dfe5ee",
                      background: solicitaCredito ? "#ecfdf5" : "#f8fafc",
                    }}
                  >
                    <div className="flex items-center gap-[9px] mb-2.5">
                      <div className="w-[26px] h-[26px] rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <CreditCard
                          size={14}
                          strokeWidth={2.2}
                          style={{ color: solicitaCredito ? "#059669" : "#94a3b8" }}
                        />
                      </div>
                      <span
                        className="text-[11.5px] font-bold uppercase tracking-[0.04em]"
                        style={{ color: solicitaCredito ? "#059669" : "#94a3b8" }}
                      >
                        Solicita cupo de crédito
                      </span>
                    </div>
                    {solicitaCredito ? (
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="text-[25px] font-extrabold text-[#065f46] whitespace-nowrap tracking-[-0.01em]">
                          {montoSolicitadoTexto || "Monto no especificado"}
                        </span>
                        {formaPagoSolicitada && (
                          <span className="inline-block text-[11.5px] font-bold text-[#065f46] bg-white border border-[#a7f3d0] px-[11px] py-1 rounded-full whitespace-nowrap leading-tight">
                            {formaPagoSolicitada}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-[#94a3b8] m-0">No</p>
                    )}
                  </div>

                  {/* Concepto del ejecutivo de negocios */}
                  <div className="rounded-2xl p-5 border border-[#eef1f6] bg-[#f8fafc]">
                    <p className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#475569] mb-3">
                      Concepto del ejecutivo de negocios
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2.5">
                      <div>
                        <p className="text-[11px] text-[#94a3b8] mb-0.5">Consumo mensual proyectado</p>
                        <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                          {solicitud.sol_consumo_mensual_proyectado || solicitud.consumo_mensual_proyectado
                            ? `$${(
                                solicitud.sol_consumo_mensual_proyectado || solicitud.consumo_mensual_proyectado
                              )?.toLocaleString("es-CO", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#94a3b8] mb-0.5">Toneladas mensuales Proyectadas</p>
                        <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                          {solicitud.sol_toneladas_proyectadas
                            ? `${solicitud.sol_toneladas_proyectadas.toLocaleString("es-CO")} Ton`
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] mb-0.5">Observaciones</p>
                    <p className="text-[12.5px] text-[#334155] m-0 whitespace-pre-wrap">
                      {solicitud.sol_observacion_ejn || "-"}
                    </p>
                  </div>
                </div>

                {/* Concepto de Oficial de Cumplimiento — contexto de solo
                    lectura de otra etapa, se mantiene con su color azul
                    distintivo para diferenciarlo de la gestión de este comité */}
                <div className="mt-4 rounded-2xl p-5 border border-blue-200 bg-blue-50/60 space-y-4">
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-blue-700">
                    Concepto de Oficial de Cumplimiento
                  </p>
                  <SoportesAnalisis
                    solicitudId={solicitud.sol_id}
                    wetId={4}
                    titulo="Soportes de Oficial de Cumplimiento"
                    readOnly
                  />
                  {comentarioOFC && (
                    <div>
                      <p className="text-[11px] text-[#94a3b8] mb-0.5">Comentario</p>
                      <p className="text-[12.5px] text-[#334155] m-0 whitespace-pre-line">{comentarioOFC}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cuerpo: evaluación + historial */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 p-7">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-[#0f172a] mb-4 flex items-center gap-[9px] tracking-[-0.01em]">
                    <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} strokeWidth={2.2} className="text-[#003d99]" />
                    </div>
                    Evaluación Comité Crédito 1
                  </h2>

                  <div className="border border-[#eef1f6] bg-[#fafbfd] rounded-[18px] p-5 flex flex-col gap-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    {/* Evaluación de riesgo */}
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
                        className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans bg-white focus:border-[#003d99] focus:ring-[3px] focus:ring-[#003d99]/[0.12]"
                      >
                        <option value="">Selecciona una evaluación</option>
                        <option value="bajo">Riesgo bajo</option>
                        <option value="medio">Riesgo medio</option>
                        <option value="alto">Riesgo alto</option>
                        <option value="muy-alto">Riesgo muy alto</option>
                      </select>
                    </div>

                    {/* Límite de crédito recomendado */}
                    <div>
                      <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
                        <TrendingUp size={15} strokeWidth={2} className="text-[#003d99]" />
                        Límite de crédito recomendado (COP)
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
                        className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans focus:border-[#003d99] focus:ring-[3px] focus:ring-[#003d99]/[0.12]"
                      />
                    </div>

                    {/* Plazo recomendado */}
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
                        className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans focus:border-[#003d99] focus:ring-[3px] focus:ring-[#003d99]/[0.12]"
                      />
                    </div>

                    {/* Observaciones */}
                    <div>
                      <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
                        <MessageSquare size={15} strokeWidth={2} className="text-[#003d99]" />
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
                        className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none resize-none font-sans leading-normal focus:border-[#003d99] focus:ring-[3px] focus:ring-[#003d99]/[0.12]"
                      />
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        onClick={handleGuardarRevision}
                        disabled={!puedeGuardar || registro.guardando}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#003d99] hover:bg-[#0047b3] hover:-translate-y-px text-white rounded-[11px] p-3 text-[13.5px] font-bold transition-all shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      >
                        {registro.guardando ? "Enviando…" : "Enviar revisión a Comité Crédito 2"}
                      </button>
                      <button
                        onClick={() => router.back()}
                        disabled={registro.guardando}
                        className="bg-white text-[#475569] border-[1.5px] border-[#dfe5ee] rounded-[11px] px-[18px] py-3 text-[13.5px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>

                  <div className="mt-[18px]">
                    <DocumentosCargadosSolicitud solicitudId={solicitud.sol_id} />
                  </div>
                </div>

                <div className="min-w-0">
                  <h2 className="text-[13px] font-bold text-[#374151] mb-3">Historial de la solicitud</h2>
                  <HistorialSolicitud historial={historialWorkflow} />
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

      <ErrorModal
        isOpen={!!errorMessage}
        message={errorMessage || ""}
        onAction={() => setErrorMessage(null)}
      />
    </div>
  );
}
