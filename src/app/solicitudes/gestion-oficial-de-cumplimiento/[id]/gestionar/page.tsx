"use client";
import { solicitudesService, type TablaPersonaResuelta } from "@/services/solicitudes.service";
import { motivosRechazoService, type MotivoRechazo } from "@/services/admin/parametrizacion/motivos-rechazo.service";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import { SoportesAnalisis } from "@/components/SoportesAnalisis";
import { TablaPersonaConEvidencia } from "@/components/TablaPersonaConEvidencia";
import { SolicitudInfoBlock } from "@/components/solicitudes/SolicitudInfoBlock";
import { EtapasPreviasBlock } from "@/components/solicitudes/EtapasPreviasBlock";
import { ConfirmModal, SuccessModal, ErrorModal } from "@/components/modals";
import { DiasRestantesBadge } from "@/components/badges/DiasRestantesBadge";
import { WORKFLOW_ETAPA } from "@/constants/workflow-etapas";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { ArrowLeft, FileText, CheckCircle2, MessageSquare, Check, X } from "lucide-react";

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
  sol_fecha_est_gest_oc?: string | null;
  sol_fecha_envio?: string | null;
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
  observacionesCumplimiento: string;
  resultado: "aprobado" | "rechazado" | null;
  motivoRechazoId: number | null;
  guardando: boolean;
}

export default function GestionOCPage() {
  const router = useRouter();
  const params = useParams();
  const solicitudId = params?.id ? Number(params.id) : null;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [motivosRechazo, setMotivosRechazo] = useState<MotivoRechazo[]>([]);
  const [registro, setRegistro] = useState<RegistroState>({
    observacionesCumplimiento: "",
    resultado: null,
    motivoRechazoId: null,
    guardando: false,
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tablasCumplimiento, setTablasCumplimiento] = useState<{
    representanteLegal: TablaPersonaResuelta | null;
    representantesSuplentes: TablaPersonaResuelta | null;
    accionistas: TablaPersonaResuelta | null;
  } | null>(null);
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

  useEffect(() => {
    let cancelled = false;

    motivosRechazoService
      .getActivos()
      .then((data) => {
        if (!cancelled) setMotivosRechazo(data);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Error cargando motivos de rechazo:", error);
        setMotivosRechazo([]);
        // Sin esto, el select de "Motivo del rechazo" queda vacío y el
        // usuario no puede rechazar la solicitud sin saber por qué.
        setErrorMessage(
          "No se pudo cargar el catálogo de motivos de rechazo. Recarga la página antes de intentar rechazar.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!solicitudId) return;

    let cancelled = false;

    solicitudesService
      .getTablasCumplimiento(solicitudId)
      .then((data) => {
        if (!cancelled) setTablasCumplimiento(data);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Error cargando tablas de cumplimiento:", error);
        setTablasCumplimiento(null);
      });

    return () => {
      cancelled = true;
    };
  }, [solicitudId]);

  const observacionesLength = registro.observacionesCumplimiento.trim().length;

  const puedeGuardar =
    observacionesLength >= 10 &&
    registro.resultado !== null &&
    (registro.resultado !== "rechazado" || registro.motivoRechazoId !== null);

  const handleGuardarRevision = () => {
    if (!solicitud || !puedeGuardar) return;
    setShowConfirmModal(true);
  };

  const handleConfirmGuardarRevision = async () => {
    if (!solicitud) return;

    try {
      setRegistro((prev) => ({ ...prev, guardando: true }));

      const solicitudId = solicitud.sol_id ?? solicitud.sa_sol_id;
      const esRechazado = registro.resultado === "rechazado";
      const motivoSeleccionado = motivosRechazo.find((m) => m.id === registro.motivoRechazoId);
      // El backend solo guarda un comentario por transición (historial +
      // correo al ejecutivo) — el motivo de rechazo se anexa ahí para no
      // perderlo, además del motivo_rechazo_id real (antes quedaba
      // hardcodeado a 1 sin importar lo que el oficial seleccionara).
      const comentario = esRechazado
        ? `${registro.observacionesCumplimiento}\n\nMotivo de rechazo: ${motivoSeleccionado?.descripcion ?? ""}`
        : registro.observacionesCumplimiento;

      await solicitudesService.guardarRevisionCumplimiento(solicitudId, {
        comentario,
        aprobado: registro.resultado === "aprobado",
        motivo_rechazo_id: esRechazado ? registro.motivoRechazoId : null,
      });

      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error guardando revisión:", error);
      setErrorMessage("No se pudo guardar la revisión de cumplimiento. Intenta de nuevo.");
      setShowConfirmModal(false);
    } finally {
      setRegistro((prev) => ({ ...prev, guardando: false }));
    }
  };

  const fechaEstimada = solicitud?.sol_fecha_est_gest_oc;

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
                Gestión Oficial de Cumplimiento
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
                etapaActual="OFC"
              />

              {/* Cuerpo: revisión + historial abajo */}
              <div className="grid grid-cols-1 gap-6 p-7">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-[#0f172a] mb-4 flex items-center gap-[9px] tracking-[-0.01em]">
                    <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} strokeWidth={2.2} className="text-brand-600" />
                    </div>
                    Revisión de cumplimiento
                  </h2>

                  <div className="border border-[#eef1f6] bg-[#fafbfd] rounded-[18px] p-5 flex flex-col gap-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    <SoportesAnalisis solicitudId={solicitud.sol_id} wetId={WORKFLOW_ETAPA.OFC.id} />

                    <TablaPersonaConEvidencia
                      solicitudId={solicitud.sol_id}
                      fpId={tablasCumplimiento?.representanteLegal?.fp_id ?? null}
                      titulo="Representante legal principal"
                      columnas={tablasCumplimiento?.representanteLegal?.columnas ?? []}
                      filas={tablasCumplimiento?.representanteLegal?.filas ?? []}
                    />

                    <TablaPersonaConEvidencia
                      solicitudId={solicitud.sol_id}
                      fpId={tablasCumplimiento?.representantesSuplentes?.fp_id ?? null}
                      titulo="Representantes suplentes"
                      columnas={tablasCumplimiento?.representantesSuplentes?.columnas ?? []}
                      filas={tablasCumplimiento?.representantesSuplentes?.filas ?? []}
                    />

                    <TablaPersonaConEvidencia
                      solicitudId={solicitud.sol_id}
                      fpId={tablasCumplimiento?.accionistas?.fp_id ?? null}
                      titulo="Composición accionaria (relación de accionistas)"
                      columnas={tablasCumplimiento?.accionistas?.columnas ?? []}
                      filas={tablasCumplimiento?.accionistas?.filas ?? []}
                    />

                    {/* Observaciones de cumplimiento */}
                    <div>
                      <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#374151] mb-2">
                        <MessageSquare size={15} strokeWidth={2} className="text-brand-600" />
                        Observaciones del análisis <span className="text-[#dc2626]">*</span>
                      </label>
                      <textarea
                        value={registro.observacionesCumplimiento}
                        onChange={(e) =>
                          setRegistro((prev) => ({
                            ...prev,
                            observacionesCumplimiento: e.target.value,
                          }))
                        }
                        placeholder="Describe los hallazgos y observaciones de la revisión de cumplimiento…"
                        rows={5}
                        className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none resize-none font-sans leading-normal focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]"
                      />
                      <p
                        className="text-[11.5px] mt-1.5"
                        style={{
                          color: observacionesLength > 0 && observacionesLength < 10 ? "#dc2626" : "#94a3b8",
                        }}>
                        {observacionesLength >= 10 || observacionesLength === 0
                          ? "Mínimo 10 caracteres requeridos."
                          : `Faltan ${10 - observacionesLength} caracteres.`}
                      </p>
                    </div>

                    {/* Resultado de cumplimiento */}
                    <div>
                      <label className="block text-[13px] font-bold text-[#374151] mb-[9px]">
                        Resultado de cumplimiento <span className="text-[#dc2626]">*</span>
                      </label>
                      <div className="flex flex-col gap-[9px]">
                        <label
                          className="flex items-center gap-3 cursor-pointer px-[15px] py-[13px] rounded-xl border-[1.5px] transition-[border-color,background,box-shadow] duration-150"
                          style={{
                            borderColor: registro.resultado === "aprobado" ? "#059669" : "#e5e7eb",
                            background: registro.resultado === "aprobado" ? "#ecfdf5" : "#fff",
                            boxShadow: registro.resultado === "aprobado" ? "0 4px 12px rgba(5,150,105,0.12)" : "none",
                          }}>
                          <input
                            type="radio"
                            name="resultado"
                            checked={registro.resultado === "aprobado"}
                            onChange={() =>
                              setRegistro((prev) => ({
                                ...prev,
                                resultado: "aprobado",
                                motivoRechazoId: null,
                              }))
                            }
                            className="w-4 h-4 accent-[#059669]"
                          />
                          <div className="w-[26px] h-[26px] rounded-lg bg-[#d1fae5] flex items-center justify-center flex-shrink-0">
                            <Check size={14} strokeWidth={2.6} className="text-[#059669]" />
                          </div>
                          <span className="text-[13.5px] font-semibold text-[#0f172a]">
                            Aprobado — cumple con todos los requisitos
                          </span>
                        </label>
                        <label
                          className="flex items-center gap-3 cursor-pointer px-[15px] py-[13px] rounded-xl border-[1.5px] transition-[border-color,background,box-shadow] duration-150"
                          style={{
                            borderColor: registro.resultado === "rechazado" ? "#dc2626" : "#e5e7eb",
                            background: registro.resultado === "rechazado" ? "#fef2f2" : "#fff",
                            boxShadow: registro.resultado === "rechazado" ? "0 4px 12px rgba(220,38,38,0.12)" : "none",
                          }}>
                          <input
                            type="radio"
                            name="resultado"
                            checked={registro.resultado === "rechazado"}
                            onChange={() => setRegistro((prev) => ({ ...prev, resultado: "rechazado" }))}
                            className="w-4 h-4 accent-[#dc2626]"
                          />
                          <div className="w-[26px] h-[26px] rounded-lg bg-[#fee2e2] flex items-center justify-center flex-shrink-0">
                            <X size={14} strokeWidth={2.6} className="text-[#dc2626]" />
                          </div>
                          <span className="text-[13.5px] font-semibold text-[#0f172a]">
                            Rechazado — no cumple con los requisitos
                          </span>
                        </label>
                      </div>
                    </div>

                    {registro.resultado === "rechazado" && (
                      <div className="border border-[#fecaca] bg-[#fef2f2] rounded-[10px] p-[14px] flex flex-col gap-3">
                        <div>
                          <label className="block text-[13px] font-bold text-[#991b1b] mb-2">
                            Motivo del rechazo <span className="text-[#dc2626]">*</span>
                          </label>
                          <select
                            value={registro.motivoRechazoId ?? ""}
                            onChange={(e) =>
                              setRegistro((prev) => ({
                                ...prev,
                                motivoRechazoId: e.target.value ? Number(e.target.value) : null,
                              }))
                            }
                            className="w-full border border-[#fca5a5] rounded-[9px] px-3 py-2.5 text-[13px] outline-none font-sans bg-white">
                            <option value="">Selecciona un motivo…</option>
                            {motivosRechazo.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.descripcion}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2.5">
                      <button
                        onClick={handleGuardarRevision}
                        disabled={!puedeGuardar || registro.guardando}
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 hover:-translate-y-px text-white rounded-[11px] p-3 text-[13.5px] font-bold transition-all shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                        {registro.guardando ? "Guardando…" : "Guardar revisión"}
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
        title="Confirmar revisión de cumplimiento"
        message={`¿Deseas registrar esta revisión como ${
          registro.resultado === "aprobado" ? "Aprobado" : "Rechazado"
        }? Esta acción no se puede deshacer.`}
        confirmText="Sí, guardar"
        cancelText="Cancelar"
        isDangerous={registro.resultado === "rechazado"}
        isLoading={registro.guardando}
        onConfirm={handleConfirmGuardarRevision}
        onCancel={() => setShowConfirmModal(false)}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        title="¡Éxito!"
        message="La revisión de cumplimiento fue registrada correctamente. Serás redirigido a la lista de solicitudes."
        actionText="Aceptar"
        autoClose={true}
        autoCloseDelay={3000}
        onAction={() => router.push("/solicitudes/gestion-oficial-de-cumplimiento")}
      />

      <ErrorModal isOpen={!!errorMessage} message={errorMessage || ""} onAction={() => setErrorMessage(null)} />
    </div>
  );
}
