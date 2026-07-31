"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { solicitudesService } from "@/services/solicitudes.service";
import { ESTADOS } from "@/lib/workflow-labels";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import HistorialSolicitud from "@/components/historial/HistorialSolicitud";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { ConfirmModal, SuccessModal } from "@/components/modals";

interface SolicitudDetalle {
  sol_id: number;
  sol_numero_solicitud: string;
  cliente_nombre: string;
  cliente_nit?: string;
  centro_operacion_nombre?: string;
  sol_estado_id: number;
}

interface RechazoDetalle {
  sol_id: number;
  motivo_rechazo: string | null;
  sol_gestion_rechazo_finalizada: boolean;
  sol_fecha_gestion_rechazo: string | null;
  usuario_gestion_nombre: string | null;
  etapa_rechazo_codigo: string | null;
  etapa_rechazo_nombre: string | null;
  usuario_rechazo_nombre: string | null;
  fecha_rechazo: string | null;
  comentario_rechazo: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RechazoEjecutivoDetallePage() {
  const router = useRouter();
  const params = useParams();
  const solicitudId = Number(params.id);

  const [solicitud, setSolicitud] = useState<SolicitudDetalle | null>(null);
  const [rechazo, setRechazo] = useState<RechazoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const { historial } = useHistorialWorkflow(
    Number.isFinite(solicitudId) ? solicitudId : null,
  );

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [solicitudData, rechazoData] = await Promise.all([
        solicitudesService.getById(solicitudId),
        solicitudesService.getRechazoEjecutivoDetalle(solicitudId),
      ]);
      setSolicitud(solicitudData);
      setRechazo(rechazoData);
    } catch (err) {
      console.error("Error cargando detalle de rechazo:", err);
      setError("Error al cargar los datos de la solicitud");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (solicitudId) {
      cargarDatos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId]);

  const handleFinalizar = async () => {
    try {
      setFinalizando(true);
      await solicitudesService.finalizarGestionRechazo(solicitudId);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      await cargarDatos();
    } catch (err) {
      console.error("Error finalizando gestión de rechazo:", err);
      alert("No se pudo finalizar la gestión");
      setShowConfirmModal(false);
    } finally {
      setFinalizando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-red-50/20 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-3 w-20 bg-gray-200 rounded" />
                <div className="h-8 w-32 bg-gray-200 rounded" />
              </div>
            ) : error || !solicitud ? (
              <p className="text-red-600">
                {error || "No se encontró la solicitud"}
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Solicitud</p>
                  <h1 className="text-3xl font-bold text-red-800">
                    {solicitud.sol_numero_solicitud}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {solicitud.cliente_nombre}
                  </p>
                </div>
                <span className="inline-block px-4 py-2 rounded-lg font-semibold border text-center bg-red-100 text-red-800 border-red-300">
                  {ESTADOS[solicitud.sol_estado_id] || "Rechazada"}
                </span>
              </div>
            )}
          </div>
        </div>

        {!loading && !error && solicitud && rechazo && (
          <>
            {/* Panel de rechazo destacado */}
            <div
              className={`rounded-2xl shadow-lg p-6 border mb-6 ${
                rechazo.sol_gestion_rechazo_finalizada
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                {rechazo.sol_gestion_rechazo_finalizada ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <h2 className="text-lg font-semibold text-gray-900">
                  {rechazo.sol_gestion_rechazo_finalizada
                    ? "Gestión finalizada"
                    : "Rechazo pendiente de gestión"}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">
                    Rechazado en
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {rechazo.etapa_rechazo_nombre || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">
                    Rechazado por
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {rechazo.usuario_rechazo_nombre || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">
                    Fecha de rechazo
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(rechazo.fecha_rechazo)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Motivo</p>
                  <p className="text-sm font-medium text-gray-900">
                    {rechazo.motivo_rechazo || "-"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase">
                    Comentario
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {rechazo.comentario_rechazo || "Sin comentario adicional"}
                  </p>
                </div>
              </div>

              {rechazo.sol_gestion_rechazo_finalizada ? (
                <p className="text-sm text-emerald-800">
                  Finalizada por{" "}
                  <span className="font-semibold">
                    {rechazo.usuario_gestion_nombre || "-"}
                  </span>{" "}
                  el {formatDate(rechazo.sol_fecha_gestion_rechazo)}.
                </p>
              ) : (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  Finalizar gestión
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Datos de la solicitud
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Cliente</p>
                    <p className="text-sm font-medium text-gray-900">
                      {solicitud.cliente_nombre}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">
                      Centro de Operación
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {solicitud.centro_operacion_nombre || "-"}
                    </p>
                  </div>
                </div>
                <DocumentosCargadosSolicitud solicitudId={solicitud.sol_id} />
              </div>
              <div className="lg:col-span-1">
                <HistorialSolicitud historial={historial} />
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Finalizar gestión de rechazo"
        message="¿Confirmas que ya gestionaste el seguimiento con el cliente y quieres marcar esta solicitud como finalizada?"
        confirmText="Sí, finalizar"
        cancelText="Cancelar"
        isLoading={finalizando}
        onConfirm={handleFinalizar}
        onCancel={() => setShowConfirmModal(false)}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        title="Gestión finalizada"
        message="La solicitud quedó marcada como gestionada."
        actionText="Aceptar"
        autoClose={true}
        autoCloseDelay={3000}
        onAction={() => setShowSuccessModal(false)}
      />
    </div>
  );
}
