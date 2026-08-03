"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { parametrosService } from "@/services/parametros.service";
import {
  condicionesFinancierasService,
  FormaPago,
} from "@/services/condiciones-financieras/condiciones-financieras.service";
import HistorialSolicitud from "@/components/historial/HistorialSolicitud";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import { SoportesAnalisis } from "@/components/SoportesAnalisis";
import { AmpliacionCupoResumen } from "@/components/solicitudes/AmpliacionCupoResumen";
import { ConfirmModal, SuccessModal, ErrorModal } from "@/components/modals";
import { ESTADOS } from "@/lib/workflow-labels";
import { WORKFLOW_ETAPA } from "@/constants/workflow-etapas";
import { ESTADO_TOKENS } from "@/constants/estado-tokens";
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
  Check,
  X,
  Wallet,
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
  sol_cupo_solicitado?: number | null;
  sol_justificacion_ampliacion?: string | null;
  sol_cupo_actual_referencia?: number | null;
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
  recomendacion: "aprobado" | "rechazado" | "";
  guardando: boolean;
  // Condiciones Financieras
  cupo: string;
  cupoDisplay: string;
  plazoPago: string;
  formaPago: string;
  nombreAprueba: string;
  fecha: string;
  firma: string;
}

interface DiasRespuesta {
  [key: string]: number;
}

export default function GestionComiteCredito2Page() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const solicitudId = params?.id ? Number(params.id) : null;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [diasRespuesta, setDiasRespuesta] = useState<DiasRespuesta>({});
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const { historial: historialWorkflow } = useHistorialWorkflow(solicitudId);
  // Etapas previas a Comité de Crédito 2 — CC2 necesita ver qué se subió y
  // qué se comentó en cada una, no solo el formulario del cliente.
  // El concepto del Ejecutivo de Negocios se muestra en su propia
  // subsección (consumo + observación), por eso no se repite aquí.
  const etapasPrevias = [
    {
      codigo: WORKFLOW_ETAPA.OFC.codigo,
      wetId: WORKFLOW_ETAPA.OFC.id,
      nombre: "Oficial de Cumplimiento",
    },
    {
      codigo: WORKFLOW_ETAPA.CC1.codigo,
      wetId: WORKFLOW_ETAPA.CC1.id,
      nombre: "Comité de Crédito 1",
    },
  ];
  const [registro, setRegistro] = useState<RegistroState>({
    recomendacion: "",
    guardando: false,
    cupo: "",
    cupoDisplay: "",
    plazoPago: "",
    formaPago: "",
    nombreAprueba: user?.nombre || "",
    fecha: new Date().toISOString().split("T")[0],
    firma: "",
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Documentos que no se pudieron copiar hacia el archivo consolidado del
  // cliente (Cliente_archivo) al aprobar — la aprobación en sí sí se
  // completa igual; esto solo avisa que ese documento puntual no quedará
  // disponible para reutilizar en la próxima solicitud del cliente, para
  // que quien aprobó pueda darle seguimiento manual si hace falta.
  const [documentosArchivoConError, setDocumentosArchivoConError] = useState<
    { tdo_id: number; tdo_nombre: string; error: string }[]
  >([]);
  const {
    loading: loadingCupo,
    solicitaCredito,
    montoSolicitadoTexto,
    formaPagoSolicitada,
    tipoSolicitud,
  } = useSolicitudCupoSolicitado(solicitudId);

  useEffect(() => {
    async function cargarDatos() {
      if (!solicitudId) return;

      try {
        setLoading(true);
        const [solicitudData, dias, formas] = await Promise.all([
          solicitudesService.getById(solicitudId),
          parametrosService.getDiasRespuesta(),
          condicionesFinancierasService.getFormasPago(),
        ]);

        setSolicitud(solicitudData);
        setDiasRespuesta(dias);
        setFormasPago(formas);
      } catch (error) {
        console.error("Error cargando datos:", error);
        alert("Error al cargar la solicitud");
      } finally {
        setLoading(false);
      }
    }

    cargarDatos();
  }, [solicitudId]);

  const formatNumberWithThousands = (value: string): string => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) return "";
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleCupoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, "");
    setRegistro((prev) => ({
      ...prev,
      cupo: cleaned,
      cupoDisplay: formatNumberWithThousands(cleaned),
    }));
  };

  const puedeGuardar =
    registro.recomendacion !== "" &&
    (registro.recomendacion !== "aprobado" ||
      (registro.cupo.trim() !== "" &&
        registro.plazoPago.trim() !== "" &&
        registro.formaPago.trim() !== ""));

  const handleGuardarRevision = () => {
    if (!solicitud || !puedeGuardar) return;
    setShowConfirmModal(true);
  };

  const handleConfirmGuardarRevision = async () => {
    if (!solicitud) return;

    try {
      setRegistro((prev) => ({ ...prev, guardando: true }));

      const comentario = `DECISIÓN: ${registro.recomendacion.toUpperCase()}\nNOMBRE QUIEN APRUEBA: ${user?.nombre || registro.nombreAprueba}\nFECHA: ${registro.fecha}`;

      const payloadComite: any = {
        comentario,
        recomendacion: registro.recomendacion,
      };

      // Agregar condiciones financieras si se aprueba
      if (registro.recomendacion === "aprobado") {
        payloadComite.cupo = parseFloat(registro.cupo) || undefined;
        payloadComite.plazoPago = parseInt(registro.plazoPago) || undefined;
        payloadComite.formaPago = registro.formaPago || undefined;
      }

      const resultado = await solicitudesService.guardarConceptoComiteCredito2(
        solicitud.sol_id,
        payloadComite,
      );

      setDocumentosArchivoConError(
        (resultado as any)?.documentosArchivoConError || [],
      );
      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error guardando:", error);
      setErrorMessage(
        "No se pudo guardar la evaluación: " + ((error as any)?.message || "intenta de nuevo."),
      );
      setShowConfirmModal(false);
    } finally {
      setRegistro((prev) => ({ ...prev, guardando: false }));
    }
  };

  const fechaEstimada =
    (solicitud as any)?.sol_fecha_estimada_comite_credito_2 ||
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
                Gestión Comité Crédito 2
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
                </div>

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
                <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-4 mt-[22px]">
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

                  {/* Concepto del ejecutivo de negocios — mismo tratamiento
                      azul que los conceptos de OFC/CC1 de abajo: los tres
                      son bloques narrativos de solo lectura de una etapa
                      previa. Solo "Solicita cupo" se mantiene verde, porque
                      es un dato accionable/destacado, no un concepto. */}
                  <div className="rounded-2xl p-5 border border-[#dbeafe] bg-[#eff6ff]">
                    <p className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#1d4ed8] mb-3">
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
                        <p className="text-[11px] text-[#94a3b8] mb-0.5">Toneladas mensuales</p>
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
                )}

                {/* Conceptos de etapas previas (OFC, CC1) — contexto de
                    solo lectura, se mantienen con su color azul distintivo
                    para diferenciarlos de la decisión de este comité */}
                <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch gap-4 mt-4">
                  {etapasPrevias.map((etapa) => {
                    const comentario = historialWorkflow.find(
                      (h) => h.etapaCodigo === etapa.codigo,
                    )?.comentario;
                    return (
                      <div
                        key={etapa.codigo}
                        className="flex flex-col h-full rounded-2xl p-5 border border-[#dbeafe] bg-[#eff6ff] space-y-4"
                      >
                        <p className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#1d4ed8]">
                          Concepto de {etapa.nombre}
                        </p>
                        <SoportesAnalisis
                          solicitudId={solicitud.sol_id}
                          wetId={etapa.wetId}
                          titulo={`Soportes de ${etapa.nombre}`}
                          readOnly
                        />
                        {comentario && (
                          <div className="flex-1">
                            <p className="text-[11px] text-[#94a3b8] mb-0.5">Comentario</p>
                            <p className="text-[12.5px] text-[#334155] m-0 whitespace-pre-line">{comentario}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cuerpo: decisión + historial */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 p-7">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-[#0f172a] mb-4 flex items-center gap-[9px] tracking-[-0.01em]">
                    <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} strokeWidth={2.2} className="text-[#003d99]" />
                    </div>
                    Decisión Comité Crédito 2
                  </h2>

                  <div className="border border-[#eef1f6] bg-[#fafbfd] rounded-[18px] p-5 flex flex-col gap-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    {/* Decisión */}
                    <div>
                      <label className="block text-[13px] font-bold text-[#374151] mb-[9px]">
                        Decisión <span className="text-[#dc2626]">*</span>
                      </label>
                      <div className="flex flex-col gap-[9px]">
                        <label
                          className="flex items-center gap-3 cursor-pointer px-[15px] py-[13px] rounded-xl border-[1.5px] transition-[border-color,background,box-shadow] duration-150"
                          style={{
                            borderColor: registro.recomendacion === "aprobado" ? "#059669" : "#e5e7eb",
                            background: registro.recomendacion === "aprobado" ? "#ecfdf5" : "#fff",
                            boxShadow:
                              registro.recomendacion === "aprobado"
                                ? "0 4px 12px rgba(5,150,105,0.12)"
                                : "none",
                          }}
                        >
                          <input
                            type="radio"
                            name="recomendacion"
                            checked={registro.recomendacion === "aprobado"}
                            onChange={() =>
                              setRegistro((prev) => ({ ...prev, recomendacion: "aprobado" }))
                            }
                            className="w-4 h-4 accent-[#059669]"
                          />
                          <div className="w-[26px] h-[26px] rounded-lg bg-[#d1fae5] flex items-center justify-center flex-shrink-0">
                            <Check size={14} strokeWidth={2.6} className="text-[#059669]" />
                          </div>
                          <span className="text-[13.5px] font-semibold text-[#0f172a]">
                            Aprobado — cupo y condiciones financieras
                          </span>
                        </label>
                        <label
                          className="flex items-center gap-3 cursor-pointer px-[15px] py-[13px] rounded-xl border-[1.5px] transition-[border-color,background,box-shadow] duration-150"
                          style={{
                            borderColor: registro.recomendacion === "rechazado" ? "#dc2626" : "#e5e7eb",
                            background: registro.recomendacion === "rechazado" ? "#fef2f2" : "#fff",
                            boxShadow:
                              registro.recomendacion === "rechazado"
                                ? "0 4px 12px rgba(220,38,38,0.12)"
                                : "none",
                          }}
                        >
                          <input
                            type="radio"
                            name="recomendacion"
                            checked={registro.recomendacion === "rechazado"}
                            onChange={() =>
                              setRegistro((prev) => ({ ...prev, recomendacion: "rechazado" }))
                            }
                            className="w-4 h-4 accent-[#dc2626]"
                          />
                          <div className="w-[26px] h-[26px] rounded-lg bg-[#fee2e2] flex items-center justify-center flex-shrink-0">
                            <X size={14} strokeWidth={2.6} className="text-[#dc2626]" />
                          </div>
                          <span className="text-[13.5px] font-semibold text-[#0f172a]">
                            Negado
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Condiciones financieras — solo si es aprobado */}
                    {registro.recomendacion === "aprobado" && (
                      <div className="border border-[#a7f3d0] bg-[#ecfdf5] rounded-[14px] p-[18px]">
                        <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#065f46] mb-4">
                          <CreditCard size={15} strokeWidth={2.2} />
                          Condiciones financieras
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[12px] font-bold text-[#065f46] mb-1.5">
                              Cupo ($) <span className="text-[#dc2626]">*</span>
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={registro.cupoDisplay}
                              onChange={handleCupoChange}
                              placeholder="Ej: 50.000.000"
                              className="w-full border border-[#a7f3d0] rounded-[9px] px-3 py-2.5 text-[13px] outline-none font-sans bg-white focus:border-[#059669] focus:ring-[3px] focus:ring-[#059669]/[0.15]"
                            />
                          </div>

                          <div>
                            <label className="block text-[12px] font-bold text-[#065f46] mb-1.5">
                              Plazo de pago (días) <span className="text-[#dc2626]">*</span>
                            </label>
                            <input
                              type="number"
                              value={registro.plazoPago}
                              onChange={(e) =>
                                setRegistro((prev) => ({
                                  ...prev,
                                  plazoPago: e.target.value,
                                }))
                              }
                              placeholder="Ej: 90"
                              className="w-full border border-[#a7f3d0] rounded-[9px] px-3 py-2.5 text-[13px] outline-none font-sans bg-white focus:border-[#059669] focus:ring-[3px] focus:ring-[#059669]/[0.15]"
                            />
                          </div>

                          <div>
                            <label className="block text-[12px] font-bold text-[#065f46] mb-1.5">
                              Forma de pago <span className="text-[#dc2626]">*</span>
                            </label>
                            <select
                              value={registro.formaPago}
                              onChange={(e) =>
                                setRegistro((prev) => ({
                                  ...prev,
                                  formaPago: e.target.value,
                                }))
                              }
                              className="w-full border border-[#a7f3d0] rounded-[9px] px-3 py-2.5 text-[13px] outline-none font-sans bg-white focus:border-[#059669] focus:ring-[3px] focus:ring-[#059669]/[0.15]"
                            >
                              <option value="">Selecciona una forma de pago</option>
                              {formasPago.map((fp) => (
                                <option key={fp.fpg_id} value={fp.fpg_nombre}>
                                  {fp.fpg_nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <p className="text-[11px] text-[#059669] mt-3">
                          Estos campos son obligatorios para guardar una aprobación.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2.5">
                      <button
                        onClick={handleGuardarRevision}
                        disabled={!puedeGuardar || registro.guardando}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#003d99] hover:bg-[#0047b3] hover:-translate-y-px text-white rounded-[11px] p-3 text-[13.5px] font-bold transition-all shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      >
                        {registro.guardando ? "Guardando…" : "Guardar decisión"}
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
        title="Confirmar decisión"
        message={`¿Estás seguro de que deseas registrar esta decisión del Comité Crédito 2 como ${
          registro.recomendacion === "aprobado" ? "Aprobado" : "Negado"
        }? Esta acción no se puede deshacer.`}
        confirmText="Sí, guardar"
        cancelText="Cancelar"
        isDangerous={registro.recomendacion === "rechazado"}
        isLoading={registro.guardando}
        onConfirm={handleConfirmGuardarRevision}
        onCancel={() => setShowConfirmModal(false)}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        title="¡Éxito!"
        message={
          documentosArchivoConError.length > 0
            ? `La decisión del Comité Crédito 2 fue registrada correctamente. Aviso: no se pudo archivar para reutilización futura: ${documentosArchivoConError
                .map((d) => d.tdo_nombre)
                .join(
                  ", ",
                )}. El documento sigue disponible en esta solicitud, pero el cliente tendrá que volver a subirlo si crea una solicitud nueva.`
            : "La decisión del Comité Crédito 2 fue registrada correctamente. Serás redirigido a la lista de solicitudes."
        }
        actionText="Aceptar"
        autoClose={true}
        autoCloseDelay={documentosArchivoConError.length > 0 ? 8000 : 3000}
        onAction={() => router.push("/solicitudes/gestion-comite-credito-2")}
      />

      <ErrorModal
        isOpen={!!errorMessage}
        message={errorMessage || ""}
        onAction={() => setErrorMessage(null)}
      />
    </div>
  );
}
