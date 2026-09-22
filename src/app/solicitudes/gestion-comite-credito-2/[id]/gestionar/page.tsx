"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { parametrosService } from "@/services/parametros.service";
import {
  condicionesFinancierasService,
  FormaPago,
} from "@/services/condiciones-financieras/condiciones-financieras.service";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import { SoportesAnalisis } from "@/components/SoportesAnalisis";
import { SolicitudInfoBlock } from "@/components/solicitudes/SolicitudInfoBlock";
import { EtapasPreviasBlock } from "@/components/solicitudes/EtapasPreviasBlock";
import { ConfirmModal, SuccessModal, ErrorModal } from "@/components/modals";
import { DiasRestantesBadge } from "@/components/badges/DiasRestantesBadge";
import { WORKFLOW_ETAPA } from "@/constants/workflow-etapas";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { ArrowLeft, FileText, CheckCircle2, CreditCard, Check, X } from "lucide-react";

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
  useEffect(() => {
    let cancelled = false;

    async function cargarDatos(id: number) {
      try {
        setLoading(true);
        const [solicitudData, dias, formas] = await Promise.all([
          solicitudesService.getById(id),
          parametrosService.getDiasRespuesta(),
          condicionesFinancierasService.getFormasPago(),
        ]);
        if (cancelled) return;

        setSolicitud(solicitudData);
        setDiasRespuesta(dias);
        setFormasPago(formas);
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
      (registro.cupo.trim() !== "" && registro.plazoPago.trim() !== "" && registro.formaPago.trim() !== ""));

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

      const resultado = await solicitudesService.guardarConceptoComiteCredito2(solicitud.sol_id, payloadComite);

      setDocumentosArchivoConError((resultado as any)?.documentosArchivoConError || []);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error guardando:", error);
      setErrorMessage("No se pudo guardar la evaluación: " + ((error as any)?.message || "intenta de nuevo."));
      setShowConfirmModal(false);
    } finally {
      setRegistro((prev) => ({ ...prev, guardando: false }));
    }
  };

  const fechaEstimada = (solicitud as any)?.sol_fecha_est_gest_cc2;

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
              <h1 className="text-[19px] font-extrabold text-white tracking-[-0.01em] m-0">Gestión Comité Crédito 2</h1>
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
                etapaActual="CC2"
              />

              {/* Cuerpo: decisión + historial abajo */}
              <div className="grid grid-cols-1 gap-6 p-7">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold text-[#0f172a] mb-4 flex items-center gap-[9px] tracking-[-0.01em]">
                    <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} strokeWidth={2.2} className="text-brand-600" />
                    </div>
                    Decisión Comité Crédito 2
                  </h2>

                  <div className="border border-[#eef1f6] bg-[#fafbfd] rounded-[18px] p-5 flex flex-col gap-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                    <SoportesAnalisis solicitudId={solicitud.sol_id} wetId={WORKFLOW_ETAPA.CC2.id} />

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
                              registro.recomendacion === "aprobado" ? "0 4px 12px rgba(5,150,105,0.12)" : "none",
                          }}>
                          <input
                            type="radio"
                            name="recomendacion"
                            checked={registro.recomendacion === "aprobado"}
                            onChange={() => setRegistro((prev) => ({ ...prev, recomendacion: "aprobado" }))}
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
                              registro.recomendacion === "rechazado" ? "0 4px 12px rgba(220,38,38,0.12)" : "none",
                          }}>
                          <input
                            type="radio"
                            name="recomendacion"
                            checked={registro.recomendacion === "rechazado"}
                            onChange={() => setRegistro((prev) => ({ ...prev, recomendacion: "rechazado" }))}
                            className="w-4 h-4 accent-[#dc2626]"
                          />
                          <div className="w-[26px] h-[26px] rounded-lg bg-[#fee2e2] flex items-center justify-center flex-shrink-0">
                            <X size={14} strokeWidth={2.6} className="text-[#dc2626]" />
                          </div>
                          <span className="text-[13.5px] font-semibold text-[#0f172a]">Negado</span>
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
                              className="w-full border border-[#a7f3d0] rounded-[9px] px-3 py-2.5 text-[13px] outline-none font-sans bg-white focus:border-[#059669] focus:ring-[3px] focus:ring-[#059669]/[0.15]">
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
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 hover:-translate-y-px text-white rounded-[11px] p-3 text-[13.5px] font-bold transition-all shadow-[0_6px_16px_rgba(0,61,153,0.22)] hover:shadow-[0_8px_20px_rgba(0,61,153,0.28)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                        {registro.guardando ? "Guardando…" : "Guardar decisión"}
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

      <ErrorModal isOpen={!!errorMessage} message={errorMessage || ""} onAction={() => setErrorMessage(null)} />
    </div>
  );
}
