"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { ESTADOS } from "@/lib/workflow-labels";
import { ESTADO_TOKENS } from "@/constants/estado-tokens";
import HistorialSolicitud from "@/components/historial/HistorialSolicitud";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import { ConfirmModal, SuccessModal } from "@/components/modals";
import { AmpliacionCupoResumen } from "@/components/solicitudes/AmpliacionCupoResumen";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { useSolicitudCupoSolicitado } from "@/hooks/useSolicitudCupoSolicitado";
import { ArrowLeft, FileText, CheckCircle2, Wallet } from "lucide-react";

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
  usuario_revision?: string;
  fecha_revision?: string;
  fecha_creacion?: string;
  fecha_estimada_respuesta_comercial?: string | null;
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
  const { historial: historialWorkflow } = useHistorialWorkflow(solicitudId);
  const [gestion, setGestion] = useState<GestionState>({
    aprobado: undefined,
    modo_solucion: null,
    documentos_faltantes: [],
    nuevaFechaReal: null,
    guardando: false,
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [hayDocumentosVencidos, setHayDocumentosVencidos] = useState(false);
  const {
    loading: loadingCupo,
    solicitaCredito,
    montoSolicitadoTexto,
    formaPagoSolicitada,
    tipoSolicitud,
  } = useSolicitudCupoSolicitado(solicitudId);

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
    async function cargarDatos() {
      if (!solicitudId) return;

      try {
        setLoading(true);
        const solicitudData = await solicitudesService.getById(solicitudId);
        setSolicitud(solicitudData);
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

  const handleGuardarDecision = () => {
    if (!solicitud) return;

    const usuarioId = obtenerUsuarioId();
    if (!usuarioId) {
      alert("No hay usuario autenticado para registrar la decision.");
      return;
    }

    if (!gestion.aprobado && !gestion.modo_solucion) {
      alert("Selecciona un modo de solución.");
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
      const fechaReal =
        gestion.nuevaFechaReal ||
        solicitud.fecha_real_respuesta_comercial ||
        ahora;

      await solicitudesService.registrarAprobacion(
        solicitud.sol_id ?? solicitud.sa_sol_id!,
        {
          aprobado: gestion.aprobado === true,
          modo_solucion: gestion.modo_solucion,
          fecha_estimada_respuesta_comercial:
            solicitud.fecha_estimada_respuesta_comercial,
          fecha_real_respuesta_comercial: fechaReal,
          usuario_modifica: usuarioId,
          documentos_faltantes: gestion.documentos_faltantes,
        },
      );

      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Error al guardar");
      setShowConfirmModal(false);
    } finally {
      setGestion((prev) => ({ ...prev, guardando: false }));
    }
  };

  const fechaEstimada =
    (solicitud as any)?.sol_fecha_estimada_auxiliar_servicio_cliente ||
    (solicitud as any)?.fecha_estimada_auxiliar_servicio_cliente;

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
                Gestión Auxiliar Servicio al Cliente
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
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
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
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-1">
                      Tipo de Solicitud
                    </p>
                    {solicitud.sol_cupo_solicitado ? (
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold px-[11px] py-1 rounded-full text-emerald-800 bg-emerald-100">
                        Ampliación de Cupo
                      </span>
                    ) : loadingCupo ? (
                      <div className="h-5 w-24 bg-gray-200 rounded-full animate-pulse" />
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 text-[12.5px] font-bold px-[11px] py-1 rounded-full ${
                          tipoSolicitud === "Ampliación de Cupo"
                            ? "text-emerald-800 bg-emerald-100"
                            : "text-blue-800 bg-blue-100"
                        }`}
                      >
                        {tipoSolicitud || "Cliente Nuevo"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-1">
                      Fecha estimada respuesta
                    </p>
                    <p className="text-sm font-bold text-[#0f172a] m-0">
                      {fechaEstimada
                        ? new Date(fechaEstimada).toLocaleDateString("es-CO")
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* Solicita Cupo — el dato que más pesa en esta gestión, por
                    eso destacado aparte del grid y no como una celda más */}
                {solicitud.sol_cupo_solicitado ? (
                  <div className="mt-[22px]">
                    <AmpliacionCupoResumen
                      cupoActualReferencia={solicitud.sol_cupo_actual_referencia}
                      cupoSolicitado={solicitud.sol_cupo_solicitado}
                      justificacion={solicitud.sol_justificacion_ampliacion}
                      consumoMensualProyectado={solicitud.sol_consumo_mensual_proyectado}
                      toneladasProyectadas={solicitud.sol_toneladas_proyectadas}
                    />
                  </div>
                ) : (
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
                          <Wallet
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
                        {solicitud.observacionesComercial || solicitud.sol_observaciones_comercial || "-"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cuerpo: documentos + decisión | historial */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 p-7">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-[#0f172a] mb-4 flex items-center gap-[9px] tracking-[-0.01em]">
                    <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} strokeWidth={2.2} className="text-[#003d99]" />
                    </div>
                    Revisión de documentos
                  </h2>

                  <div className="mb-[18px]">
                    <DocumentosCargadosSolicitud
                      solicitudId={solicitud.sol_id}
                      editable
                      documentosMarcados={gestion.documentos_faltantes}
                      onToggleMarcado={(tdoId) =>
                        setGestion((prev) => ({
                          ...prev,
                          documentos_faltantes:
                            prev.documentos_faltantes.includes(tdoId)
                              ? prev.documentos_faltantes.filter(
                                  (id) => id !== tdoId,
                                )
                              : [...prev.documentos_faltantes, tdoId],
                        }))
                      }
                      onEstadoDocumentos={({ hayVencidos }) =>
                        setHayDocumentosVencidos(hayVencidos)
                      }
                    />
                  </div>

                  <div className="border border-[#eef1f6] bg-[#fafbfd] rounded-[18px] p-5 flex flex-col gap-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    {hayDocumentosVencidos && !hayDocumentosMarcados && (
                      <p className="text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 m-0">
                        Hay documentos vencidos. Marca los que correspondan
                        con "Solicitar cambio" en la tabla de arriba para
                        poder rechazar la solicitud.
                      </p>
                    )}
                    {hayDocumentosMarcados && (
                      <p className="text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 m-0">
                        Hay documentos marcados con "Solicitar cambio" — no
                        se puede aprobar hasta resolverlos.
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
                          }`}
                        >
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
                              ? "Marca al menos un documento con \"Solicitar cambio\" antes de rechazar"
                              : undefined
                          }
                          className={`flex-1 px-5 py-3 rounded-[11px] text-[13.5px] font-bold border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            gestion.aprobado === false
                              ? "bg-[#dc2626] text-white border-[#dc2626]"
                              : "border-red-300 text-red-700 hover:bg-red-50"
                          }`}
                        >
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
                          className="w-full border border-[#cbd5e1] rounded-[10px] px-[13px] py-[11px] text-[13.5px] outline-none font-sans bg-white focus:border-[#003d99] focus:ring-[3px] focus:ring-[#003d99]/[0.12]"
                        >
                          <option value="">
                            Selecciona un modo de solución...
                          </option>
                          <option value="cliente_actualiza">
                            Cliente Actualiza
                          </option>
                          <option value="auxiliar_actualiza">
                            Auxiliar Actualiza
                          </option>
                        </select>
                      </div>
                    )}

                    <div className="flex gap-2.5">
                      <button
                        onClick={handleGuardarDecision}
                        disabled={
                          gestion.aprobado === undefined || gestion.guardando
                        }
                        className="flex-1 flex items-center justify-center gap-2 bg-[#003d99] hover:bg-[#0047b3] hover:-translate-y-px text-white rounded-[11px] p-3 text-[13.5px] font-bold transition-all shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      >
                        {gestion.guardando ? "Guardando..." : "Guardar Decisión"}
                      </button>
                      <button
                        onClick={() => router.back()}
                        disabled={gestion.guardando}
                        className="bg-white text-[#475569] border-[1.5px] border-[#dfe5ee] rounded-[11px] px-[18px] py-3 text-[13.5px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </button>
                    </div>
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
        onAction={() =>
          router.push("/solicitudes/gestion-auxiliar-servicio-al-cliente")
        }
      />
    </div>
  );
}
