"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { parametrosService } from "@/services/parametros.service";
import HistorialSolicitud from "@/components/historial/HistorialSolicitud";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import { SoportesAnalisis } from "@/components/SoportesAnalisis";
import { ConfirmModal, SuccessModal } from "@/components/modals";
import { ESTADOS } from "@/lib/workflow-labels";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { useSolicitudCupoSolicitado } from "@/hooks/useSolicitudCupoSolicitado";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  MessageSquare,
  TrendingUp,
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

export default function GestionComiteCredito1Page() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const solicitudId = params?.id ? Number(params.id) : null;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [diasRespuesta, setDiasRespuesta] = useState<DiasRespuesta>({});
  const { historial: historialWorkflow } = useHistorialWorkflow(solicitudId);
  const comentarioOFC = historialWorkflow.find(
    (h) => h.etapaCodigo === "OFC",
  )?.comentario;
  const [registro, setRegistro] = useState<RegistroState>({
    evaluacionRiesgo: "",
    limiteCreditoRecomendado: "",
    plazoRecomendado: "",
    observacionesComite: "",
    guardando: false,
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { solicitaCredito, montoSolicitadoTexto, formaPagoSolicitada } =
    useSolicitudCupoSolicitado(solicitudId);

  useEffect(() => {
    async function cargarDatos() {
      if (!solicitudId) return;

      try {
        setLoading(true);
        const [solicitudData, dias] = await Promise.all([
          solicitudesService.getById(solicitudId),
          parametrosService.getDiasRespuesta(),
        ]);

        console.log(
          "[Gestión Comité Crédito 1] Datos de solicitud recibidos:",
          solicitudData,
        );
        console.log("[Gestión Comité Crédito 1] Días de respuesta:", dias);
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

  const handleGuardarRevision = () => {
    if (!solicitud) return;

    const usuarioId = obtenerUsuarioId();
    if (!usuarioId) {
      alert("No hay usuario autenticado para registrar la revisión.");
      return;
    }

    if (!registro.evaluacionRiesgo.trim()) {
      alert("La evaluación de riesgo es obligatoria.");
      return;
    }

    if (!registro.observacionesComite.trim()) {
      alert("Las observaciones del comité son obligatorias.");
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
      alert("Error al guardar la evaluación");
      setShowConfirmModal(false);
    } finally {
      setRegistro((prev) => ({ ...prev, guardando: false }));
    }
  };

  const fechaEstimada =
    (solicitud as any)?.sol_fecha_estimada_comite_credito_1 ||
    solicitud?.sol_fecha_estimada_respuesta_comercial ||
    solicitud?.fecha_estimada_respuesta_comercial;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-0">
      <div className="max-w-[90%] mx-auto mt-2 px-2">
        {/* Main Card */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden m-0">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-100 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeft size={16} />
                Volver
              </button>
              <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                <FileText className="text-white" size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-white">
                  Gestión Comité Crédito 1
                </h1>
                {solicitud && (
                  <p className="text-xs md:text-sm text-blue-100 truncate">
                    Solicitud:{" "}
                    <span className="font-semibold text-white">
                      {solicitud.sol_numero_solicitud ||
                        solicitud.numero_solicitud}
                    </span>
                  </p>
                )}
              </div>
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
          {/* Información de la solicitud */}
          <div className="px-8 py-6 border-b border-gray-200 bg-white/50">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
              Información de la Solicitud
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Cliente
                </p>
                <p className="font-semibold text-gray-900">
                  {solicitud.cliente_nombre}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Centro de Operación
                </p>
                <p className="font-semibold text-gray-900">
                  {solicitud.centro_operacion_nombre}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Estado
                </p>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    (solicitud.sol_estado_id ?? solicitud.estado_id) === 1
                      ? "bg-yellow-100 text-yellow-800"
                      : (solicitud.sol_estado_id ?? solicitud.estado_id) === 2
                        ? "bg-blue-100 text-blue-800"
                        : (solicitud.sol_estado_id ?? solicitud.estado_id) === 3
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                  }`}
                >
                  {ESTADOS[solicitud.sol_estado_id ?? solicitud.estado_id] ||
                    "Desconocido"}
                </span>
              </div>
            </div>

            {/* Solicita Cupo — el dato que más pesa en esta gestión, por
                eso destacado aparte del grid y no como una celda más */}
            <div
              className={`mt-4 rounded-xl border-2 p-4 ${
                solicitaCredito
                  ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50/60"
                  : "border-gray-200 bg-gray-50/60"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={`rounded-full p-1.5 ${solicitaCredito ? "bg-emerald-100" : "bg-gray-200"}`}
                >
                  <Wallet
                    className={`h-4 w-4 ${solicitaCredito ? "text-emerald-700" : "text-gray-500"}`}
                  />
                </div>
                <p
                  className={`text-xs font-bold uppercase tracking-wide ${solicitaCredito ? "text-emerald-800" : "text-gray-500"}`}
                >
                  Solicita Cupo de Crédito
                </p>
              </div>
              {solicitaCredito ? (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 pl-1">
                  <span className="text-2xl font-bold text-emerald-900">
                    {montoSolicitadoTexto || "Monto no especificado"}
                  </span>
                  {formaPagoSolicitada && (
                    <span className="inline-flex items-center rounded-full bg-white border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      {formaPagoSolicitada}
                    </span>
                  )}
                </div>
              ) : (
                <p className="pl-1 text-sm font-medium text-gray-500">No</p>
              )}
            </div>

            {/* Concepto del Ejecutivo de Negocios — agrupado aparte para
                que quede claro que estos datos vienen de esa etapa */}
            <div className="mt-4 bg-blue-50/60 border border-blue-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">
                Concepto del Ejecutivo de Negocios
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Consumo Mensual Proyectado
                  </p>
                  <p className="font-semibold text-gray-900">
                    {solicitud.sol_consumo_mensual_proyectado ||
                    solicitud.consumo_mensual_proyectado
                      ? `$${(
                          solicitud.sol_consumo_mensual_proyectado ||
                          solicitud.consumo_mensual_proyectado
                        )?.toLocaleString("es-CO", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Observaciones
                  </p>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {solicitud.sol_observacion_ejn || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contenido en dos columnas */}
          <div className="grid grid-cols-3 gap-6 px-8 py-8">
            {/* Formulario de evaluación - Izquierda */}
            <div className="col-span-2">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle size={24} className="text-blue-600" />
                Evaluación Comité Crédito 1
              </h2>

              <div className="space-y-6">
                {/* Subsección: lo que corresponde exactamente a esta
                    gestión (Comité Crédito 1) — ubicada antes de
                    documentos */}
                <div className="border-2 border-blue-200 bg-blue-50/40 rounded-xl p-5 space-y-6">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                    Registrar tu Evaluación
                  </p>

                  {/* Evaluación de Riesgo */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Evaluación de Riesgo *
                    </label>
                    <select
                      value={registro.evaluacionRiesgo}
                      onChange={(e) =>
                        setRegistro((prev) => ({
                          ...prev,
                          evaluacionRiesgo: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    >
                      <option value="">Selecciona una evaluación</option>
                      <option value="bajo">Riesgo Bajo</option>
                      <option value="medio">Riesgo Medio</option>
                      <option value="alto">Riesgo Alto</option>
                      <option value="muy-alto">Riesgo Muy Alto</option>
                    </select>
                  </div>

                  {/* Límite de Crédito */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <TrendingUp size={18} className="text-blue-600" />
                      Límite de Crédito Recomendado (USD)
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    />
                  </div>

                  {/* Plazo Recomendado */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Plazo Recomendado (días)
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    />
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <MessageSquare size={18} className="text-blue-600" />
                      Observaciones del Comité *
                    </label>
                    <textarea
                      value={registro.observacionesComite}
                      onChange={(e) =>
                        setRegistro((prev) => ({
                          ...prev,
                          observacionesComite: e.target.value,
                        }))
                      }
                      placeholder="Escribe las observaciones del análisis de crédito..."
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none bg-white"
                    />
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleGuardarRevision}
                      disabled={
                        !registro.evaluacionRiesgo ||
                        !registro.observacionesComite.trim() ||
                        registro.guardando
                      }
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {registro.guardando
                        ? "Enviando..."
                        : "Enviar Revisión a Comité Crédito 2"}
                    </button>
                    <button
                      onClick={() => router.back()}
                      disabled={registro.guardando}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>

                {/* Subsección: contexto/referencia dejado por el Oficial
                    de Cumplimiento en su etapa — de solo lectura, no es
                    parte de la gestión del Comité */}
                <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 space-y-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
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
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        Comentario
                      </p>
                      <p className="text-gray-900 whitespace-pre-line">
                        {comentarioOFC}
                      </p>
                    </div>
                  )}
                </div>

                <DocumentosCargadosSolicitud solicitudId={solicitud.sol_id} />
              </div>
            </div>

            {/* Historial - Derecha */}
            <div className="col-span-1">
              <HistorialSolicitud historial={historialWorkflow} />
            </div>
          </div>
          </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Envío"
        message="¿Estás seguro de que deseas enviar esta revisión del Comité Crédito 1? La solicitud pasará a Comité Crédito 2."
        confirmText="Sí, Enviar"
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
    </div>
  );
}
