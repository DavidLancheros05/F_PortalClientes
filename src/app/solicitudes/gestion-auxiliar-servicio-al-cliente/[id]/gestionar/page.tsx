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
import { ArrowLeft, FileText, CheckCircle2 } from "lucide-react";

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
  sol_fecha_envio: string | null;
  sol_fecha_real_respuesta_comercial: string | null;
  sol_consumo_mensual_proyectado: number | null;
  sol_toneladas_proyectadas?: number | null;
  sol_observaciones_comercial: string | null;
  sol_cupo_solicitado?: number | null;
  sol_justificacion_ampliacion?: string | null;
  sol_cupo_actual_referencia?: number | null;
  usuario_registro?: string;
  usuario_registro_id?: number;
  ejecutivo_nombre?: string;
  ejecutivo_id_nombre?: number;
  sol_fecha_gest_ejn?: string | null;
  usuario_revision?: string;
  fecha_revision?: string;
  fecha_creacion?: string;
  fecha_real_respuesta_comercial?: string | null;
  consumo_mensual_proyectado?: number | null;
  observacionesComercial?: string | null;
  sa_sol_id?: number;
  numero_solicitud?: string;
  cliente_id?: number;
  estado_id?: number;
}

interface GestionState {
  aprobado: boolean | undefined;
  modo_solucion: string | null;
  documentos_faltantes: number[];
  nuevaFechaReal: string | null;
  guardando: boolean;
}

export default function GestionarSolicitudPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const solicitudId = params?.id ? Number(params.id) : null;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [gestion, setGestion] = useState<GestionState>({
    aprobado: undefined,
    modo_solucion: null,
    documentos_faltantes: [],
    nuevaFechaReal: null,
    guardando: false,
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hayDocumentosVencidos, setHayDocumentosVencidos] = useState(false);
  const { historial } = useHistorialWorkflow(solicitudId);
  const hayDocumentosMarcados = gestion.documentos_faltantes.length > 0;
  const hayProblemasDocumentos = hayDocumentosVencidos || hayDocumentosMarcados;

  // Si aparece un problema en los documentos después de haber elegido
  // Aprobar (ej. el gestor marca uno como "no corresponde" luego de
  // seleccionar la decisión), invalidar esa elección para que no quede
  // aprobada una solicitud con documentos con problemas.
  useEffect(() => {
    if (hayProblemasDocumentos && gestion.aprobado === true) {
      setGestion((prev) => ({ ...prev, aprobado: undefined }));
    }
  }, [hayProblemasDocumentos, gestion.aprobado]);

  // El auxiliar solo revisa documentos (fechas y que correspondan) — sin
  // al menos uno marcado con "Solicitar cambio" no hay motivo para
  // rechazar. Si se desmarca el último documento después de haber elegido
  // Rechazar, invalidar esa elección también.
  useEffect(() => {
    if (!hayDocumentosMarcados && gestion.aprobado === false) {
      setGestion((prev) => ({ ...prev, aprobado: undefined, modo_solucion: null }));
    }
  }, [hayDocumentosMarcados, gestion.aprobado]);

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

  const handleGuardarDecision = () => {
    if (!solicitud) return;

    const usuarioId = obtenerUsuarioId();
    if (!usuarioId) {
      setErrorMessage("No hay usuario autenticado para registrar la decisión.");
      return;
    }

    if (!gestion.aprobado && !gestion.modo_solucion) {
      setErrorMessage("Selecciona un modo de solución.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmGuardarDecision = async () => {
    if (!solicitud) return;

    const usuarioId = obtenerUsuarioId();
    if (!usuarioId) return;

    try {
      setGestion((prev) => ({ ...prev, guardando: true }));

      const ahora = new Date().toISOString();
      const fechaReal = gestion.nuevaFechaReal || solicitud.fecha_real_respuesta_comercial || ahora;

      await solicitudesService.registrarAprobacion(solicitud.sol_id ?? solicitud.sa_sol_id!, {
        aprobado: gestion.aprobado === true,
        modo_solucion: gestion.modo_solucion,
        fecha_real_respuesta_comercial: fechaReal,
        usuario_modifica: usuarioId,
        documentos_faltantes: gestion.documentos_faltantes,
      });

      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error guardando:", error);
      setErrorMessage("No se pudo guardar la decisión. Intenta de nuevo.");
      setShowConfirmModal(false);
    } finally {
      setGestion((prev) => ({ ...prev, guardando: false }));
    }
  };

  const fechaEstimada =
    (solicitud as any)?.sol_fecha_est_gest_asc || (solicitud as any)?.fecha_estimada_auxiliar_servicio_cliente;

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
                Gestión Auxiliar Servicio al Cliente
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
                etapaActual="ASC"
              />

              {/* Cuerpo: documentos + decisión, historial abajo */}
              <div className="grid grid-cols-1 gap-6 p-7">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-[#0f172a] mb-4 flex items-center gap-[9px] tracking-[-0.01em]">
                    <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} strokeWidth={2.2} className="text-brand-600" />
                    </div>
                    Revisión de documentos
                  </h2>

                  <div className="mb-[18px]">
                    <DocumentosCargadosSolicitud
                      solicitudId={solicitud.sol_id}
                      mostrarTitulo={false}
                      editable
                      documentosMarcados={gestion.documentos_faltantes}
                      onToggleMarcado={(tdoId) =>
                        setGestion((prev) => ({
                          ...prev,
                          documentos_faltantes: prev.documentos_faltantes.includes(tdoId)
                            ? prev.documentos_faltantes.filter((id) => id !== tdoId)
                            : [...prev.documentos_faltantes, tdoId],
                        }))
                      }
                      onEstadoDocumentos={({ hayVencidos }) => setHayDocumentosVencidos(hayVencidos)}
                    />
                  </div>

                  <div className="border border-[#eef1f6] bg-[#fafbfd] rounded-[18px] p-5 flex flex-col gap-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    {hayDocumentosVencidos && !hayDocumentosMarcados && (
                      <p className="text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 m-0">
                        Hay documentos vencidos. Marca los que correspondan con "Solicitar cambio" en la tabla de arriba
                        para poder rechazar la solicitud.
                      </p>
                    )}
                    {hayDocumentosMarcados && (
                      <p className="text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 m-0">
                        Hay documentos marcados con "Solicitar cambio" — no se puede aprobar hasta resolverlos.
                      </p>
                    )}

                    {/* Botones Aprobar/Rechazar */}
                    <div>
                      <label className="block text-[13px] font-bold text-[#374151] mb-2">
                        Decisión <span className="text-[#dc2626]">*</span>
                      </label>
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            setGestion((prev) => ({
                              ...prev,
                              aprobado: true,
                              modo_solucion: null,
                            }))
                          }
                          disabled={hayProblemasDocumentos}
                          title={
                            hayProblemasDocumentos
                              ? "Hay documentos vencidos o marcados como no corresponde"
                              : undefined
                          }
                          className={`flex-1 px-5 py-3 rounded-[11px] text-[13.5px] font-bold border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            gestion.aprobado === true
                              ? "bg-[#059669] text-white border-[#059669]"
                              : "border-[#a7f3d0] text-[#059669] hover:bg-emerald-50"
                          }`}>
                          ✓ Aprobar
                        </button>
                        <button
                          onClick={() =>
                            setGestion((prev) => ({
                              ...prev,
                              aprobado: false,
                            }))
                          }
                          disabled={!hayDocumentosMarcados}
                          title={
                            !hayDocumentosMarcados
                              ? 'Marca al menos un documento con "Solicitar cambio" antes de rechazar'
                              : undefined
                          }
                          className={`flex-1 px-5 py-3 rounded-[11px] text-[13.5px] font-bold border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            gestion.aprobado === false
                              ? "bg-[#dc2626] text-white border-[#dc2626]"
                              : "border-red-300 text-red-700 hover:bg-red-50"
                          }`}>
                          ✗ Rechazar
                        </button>
                      </div>
                    </div>

                    {/* Modo de solución (si está rechazada) */}
                    {gestion.aprobado === false && (
                      <div>
                        <label className="block text-[13px] font-bold text-[#374151] mb-2">
                          Modo de solución <span className="text-[#dc2626]">*</span>
                        </label>
                        <select
                          value={gestion.modo_solucion || ""}
                          onChange={(e) =>
                            setGestion((prev) => ({
                              ...prev,
                              modo_solucion: e.target.value || null,
                            }))
                          }
                          className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans bg-white focus:border-brand-600 focus:ring-[3px] focus:ring-brand-600/[0.12]">
                          <option value="">Selecciona un modo de solución...</option>
                          <option value="cliente_actualiza">Cliente Actualiza</option>
                          <option value="auxiliar_actualiza">Auxiliar Actualiza</option>
                        </select>
                      </div>
                    )}

                    <div className="flex gap-2.5">
                      <button
                        onClick={handleGuardarDecision}
                        disabled={gestion.aprobado === undefined || gestion.guardando}
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 hover:-translate-y-px text-white rounded-[11px] p-3 text-[13.5px] font-bold transition-all shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                        {gestion.guardando ? "Guardando..." : "Guardar Decisión"}
                      </button>
                      <button
                        onClick={() => router.back()}
                        disabled={gestion.guardando}
                        className="bg-white text-[#475569] border-[1.5px] border-[#dfe5ee] rounded-[11px] px-[18px] py-3 text-[13.5px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Decisión"
        message={`¿Estás seguro de que deseas ${gestion.aprobado ? "aprobar" : "rechazar"} esta solicitud?`}
        confirmText="Sí, Confirmar"
        cancelText="Cancelar"
        isDangerous={!gestion.aprobado}
        isLoading={gestion.guardando}
        onConfirm={handleConfirmGuardarDecision}
        onCancel={() => setShowConfirmModal(false)}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        title="¡Éxito!"
        message={`Solicitud ${gestion.aprobado ? "aprobada" : "rechazada"} correctamente. Serás redirigido a la lista de solicitudes.`}
        actionText="Aceptar"
        autoClose={true}
        autoCloseDelay={3000}
        onAction={() => router.push("/solicitudes/gestion-auxiliar-servicio-al-cliente")}
      />

      <ErrorModal isOpen={!!errorMessage} message={errorMessage || ""} onAction={() => setErrorMessage(null)} />
    </div>
  );
}
