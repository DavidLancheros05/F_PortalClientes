"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { parametrosService } from "@/services/parametros.service";
import HistorialSolicitud from "@/components/historial/HistorialSolicitud";
import { ConfirmModal, SuccessModal, LoadingModal } from "@/components/modals";
import { ESTADOS } from "@/lib/workflow-labels";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { ArrowLeft, FileText, CheckCircle, AlertCircle, MessageSquare } from "lucide-react";

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
  usuario_registro?: string;
  usuario_registro_id?: number;
  ejecutivo_nombre?: string;
  usuario_revision?: string;
  fecha_revision?: string;
  fecha_creacion?: string;
  fecha_estimada_respuesta_comercial?: string | null;
  consumo_mensual_proyectado?: number | null;
  solicitud_id?: number;
  numero_solicitud?: string;
  cliente_id?: number;
  estado_id?: number;
}

interface RegistroState {
  observacionesCumplimiento: string;
  resultado: "aprobado" | "rechazado" | null;
  motivoRechazo: string;
  guardando: boolean;
}

interface DiasRespuesta {
  [key: string]: number;
}

export default function GestionOCPage() {
  const router = useRouter();
  const params = useParams();
  const solicitudId = params?.id ? Number(params.id) : null;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [diasRespuesta, setDiasRespuesta] = useState<DiasRespuesta>({});
  const { historial: historialWorkflow } = useHistorialWorkflow(solicitudId);
  const [registro, setRegistro] = useState<RegistroState>({
    observacionesCumplimiento: "",
    resultado: null,
    motivoRechazo: "",
    guardando: false,
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    async function cargarDatos() {
      if (!solicitudId) return;

      try {
        setLoading(true);
        const [solicitudData, dias] = await Promise.all([
          solicitudesService.getById(solicitudId),
          parametrosService.getDiasRespuesta(),
        ]);

        console.log("[Gestión OC] Datos de solicitud recibidos:", solicitudData);
        console.log("[Gestión OC] Días de respuesta:", dias);
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

  const handleGuardarRevision = () => {
    if (!solicitud) return;

    if (!registro.observacionesCumplimiento.trim()) {
      alert("Las observaciones de cumplimiento son obligatorias.");
      return;
    }

    if (!registro.resultado) {
      alert("Debes seleccionar si el cumplimiento es aprobado o rechazado.");
      return;
    }

    if (registro.resultado === "rechazado" && !registro.motivoRechazo.trim()) {
      alert("Debes indicar el motivo del rechazo.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmGuardarRevision = async () => {
    if (!solicitud) return;

    try {
      setRegistro((prev) => ({ ...prev, guardando: true }));

      const solicitudId = solicitud.sol_id ?? solicitud.solicitud_id;
      await solicitudesService.guardarRevisionCumplimiento(solicitudId, {
        comentario: registro.observacionesCumplimiento,
        aprobado: registro.resultado === "aprobado",
        motivo_rechazo_id: registro.resultado === "rechazado" ? 1 : null,
      });

      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error guardando revisión:", error);
      alert("Error al guardar la revisión de cumplimiento");
      setShowConfirmModal(false);
    } finally {
      setRegistro((prev) => ({ ...prev, guardando: false }));
    }
  };

  if (loading) {
    return <LoadingModal isOpen message="Cargando solicitud..." />;
  }

  if (!solicitud) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft size={20} />
            Volver
          </button>
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No se encontró la solicitud</p>
          </div>
        </div>
      </div>
    );
  }

  const fechaEstimada =
    (solicitud as any).sol_fecha_estimada_oficial_cumplimiento ||
    solicitud.sol_fecha_estimada_respuesta_comercial ||
    solicitud.fecha_estimada_respuesta_comercial;

  const pasos = [
    {
      id: "creada",
      nombre: "Creada",
      estado: "completado" as const,
      fecha: solicitud.sol_fecha_creacion || solicitud.fecha_creacion,
      usuario: solicitud.usuario_registro,
      dias: diasRespuesta["Creada"] ?? 0,
    },
    {
      id: "concepto",
      nombre: "Concepto",
      estado: "completado" as const,
      fecha: new Date().toISOString(),
      usuario: solicitud.ejecutivo_nombre || "-",
      dias: diasRespuesta["Concepto"] ?? 1,
    },
    {
      id: "cumplimiento",
      nombre: "Cumplimiento",
      estado: "en_curso" as const,
      fecha: new Date().toISOString(),
      usuario: "-",
      dias: diasRespuesta["Cumplimiento"] ?? 1,
    },
    {
      id: "aprobada",
      nombre: "Aprobada",
      estado: "pendiente" as const,
      dias: diasRespuesta["Aprobada"] ?? 5,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-0">
      <div className="max-w-full mx-auto mt-2 px-2">
        {/* Main Card */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden m-0">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-1 text-xs font-medium text-purple-100 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeft size={16} />
                Volver
              </button>
              <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                <FileText className="text-white" size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-white">
                  Gestión Oficial de Cumplimiento
                </h1>
                <p className="text-xs md:text-sm text-purple-100 truncate">
                  Solicitud:{" "}
                  <span className="font-semibold text-white">
                    {solicitud.sol_numero_solicitud || solicitud.numero_solicitud}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Información de la solicitud */}
          <div className="px-8 py-6 border-b border-gray-200 bg-white/50">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
              Información de la Solicitud
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  {ESTADOS[
                    solicitud.sol_estado_id ?? solicitud.estado_id
                  ] || "Desconocido"}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Consumo Proyectado
                </p>
                <p className="font-semibold text-gray-900">
                  {solicitud.sol_consumo_mensual_proyectado || solicitud.consumo_mensual_proyectado
                    ? `$${(solicitud.sol_consumo_mensual_proyectado || solicitud.consumo_mensual_proyectado)?.toLocaleString(
                        "es-CO",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}`
                    : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Contenido en dos columnas */}
          <div className="grid grid-cols-3 gap-6 px-8 py-8">
            {/* Formulario de revisión - Izquierda */}
            <div className="col-span-2">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle size={24} className="text-purple-600" />
                Revisión de Cumplimiento
              </h2>

              <div className="space-y-6">
                {/* Ver Formulario */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900 mb-2">
                        Revisar Formulario Completo
                      </p>
                      <p className="text-sm text-blue-700 mb-3">
                        Accede al formulario de la solicitud para revisar todas las respuestas y documentos.
                      </p>
                      <button
                        onClick={() =>
                          router.push(
                            `/solicitudes/${solicitud.sol_id ?? solicitud.solicitud_id}`,
                          )
                        }
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Ver Formulario Completo →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Observaciones de Cumplimiento */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <MessageSquare size={18} className="text-purple-600" />
                    Observaciones de Cumplimiento *
                  </label>
                  <textarea
                    value={registro.observacionesCumplimiento}
                    onChange={(e) =>
                      setRegistro((prev) => ({
                        ...prev,
                        observacionesCumplimiento: e.target.value,
                      }))
                    }
                    placeholder="Describe los hallazgos y observaciones de la revisión de cumplimiento..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Mínimo 10 caracteres requeridos
                  </p>
                </div>

                {/* Resultado de Cumplimiento */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Resultado de Cumplimiento *
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-green-50 transition-colors" style={{ borderColor: registro.resultado === "aprobado" ? "#22c55e" : "inherit", backgroundColor: registro.resultado === "aprobado" ? "rgba(34, 197, 94, 0.05)" : "inherit" }}>
                      <input
                        type="radio"
                        name="resultado"
                        value="aprobado"
                        checked={registro.resultado === "aprobado"}
                        onChange={() =>
                          setRegistro((prev) => ({
                            ...prev,
                            resultado: "aprobado",
                            motivoRechazo: "",
                          }))
                        }
                        className="w-5 h-5 text-green-600"
                      />
                      <span className="text-sm font-semibold text-gray-900">
                        ✓ Aprobado - Cumple con todos los requisitos
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-red-50 transition-colors" style={{ borderColor: registro.resultado === "rechazado" ? "#ef4444" : "inherit", backgroundColor: registro.resultado === "rechazado" ? "rgba(239, 68, 68, 0.05)" : "inherit" }}>
                      <input
                        type="radio"
                        name="resultado"
                        value="rechazado"
                        checked={registro.resultado === "rechazado"}
                        onChange={() =>
                          setRegistro((prev) => ({
                            ...prev,
                            resultado: "rechazado",
                          }))
                        }
                        className="w-5 h-5 text-red-600"
                      />
                      <span className="text-sm font-semibold text-gray-900">
                        ✗ Rechazado - No cumple con los requisitos
                      </span>
                    </label>
                  </div>
                </div>

                {/* Motivo de Rechazo - Solo si está rechazado */}
                {registro.resultado === "rechazado" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Motivo del Rechazo *
                    </label>
                    <textarea
                      value={registro.motivoRechazo}
                      onChange={(e) =>
                        setRegistro((prev) => ({
                          ...prev,
                          motivoRechazo: e.target.value,
                        }))
                      }
                      placeholder="Describe por qué se rechaza la solicitud..."
                      rows={4}
                      className="w-full px-4 py-3 border border-red-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      Mínimo 10 caracteres requeridos
                    </p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleGuardarRevision}
                    disabled={
                      !registro.observacionesCumplimiento.trim() ||
                      registro.observacionesCumplimiento.length < 10 ||
                      !registro.resultado ||
                      (registro.resultado === "rechazado" && (!registro.motivoRechazo.trim() || registro.motivoRechazo.length < 10)) ||
                      registro.guardando
                    }
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registro.guardando ? "Guardando..." : "Guardar Revisión"}
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
            </div>

            {/* Historial - Derecha */}
            <div className="col-span-1">
              <HistorialSolicitud historial={historialWorkflow} />
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Revisión de Cumplimiento"
        message={`¿Estás seguro de que deseas registrar esta revisión como ${registro.resultado === "aprobado" ? "Aprobado" : "Rechazado"}?`}
        confirmText="Sí, Guardar"
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
    </div>
  );
}
