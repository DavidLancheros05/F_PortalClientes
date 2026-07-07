"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { motivosRechazoService } from "@/services/admin/parametrizacion/motivos-rechazo.service";
import { ESTADOS, getEstadoBadgeClass } from "@/lib/workflow-labels";
import HistorialSolicitud from "@/components/historial/HistorialSolicitud";
import { ConfirmModal, SuccessModal } from "@/components/modals";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";

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
  sol_observaciones_comercial: string | null;
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
  solicitud_id?: number;
  numero_solicitud?: string;
  cliente_id?: number;
  estado_id?: number;
}

interface MotivoRechazo {
  id: number;
  descripcion: string;
  activo: boolean;
}

interface Documento {
  id: number;
  nombre: string;
  descripcion?: string;
  obligatorio?: boolean;
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
  tipo_documento_id?: number;
  solicitud_id?: number;
  ruta_archivo?: string;
  estado?: boolean;
}

interface GestionState {
  aprobado: boolean | undefined;
  motivo_rechazo_id: number | null;
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
  const [motivos, setMotivos] = useState<MotivoRechazo[]>([]);
  const [historial, setHistorial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gestion, setGestion] = useState<GestionState>({
    aprobado: undefined,
    motivo_rechazo_id: null,
    modo_solucion: null,
    documentos_faltantes: [],
    nuevaFechaReal: null,
    guardando: false,
  });
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    async function cargarDatos() {
      if (!solicitudId) return;

      try {
        setLoading(true);
        const [solicitudData, motivosData, documentosData] = await Promise.all([
          solicitudesService.getById(solicitudId),
          motivosRechazoService.getAll(),
          solicitudesService.getDocumentosRequeridos(solicitudId),
        ]);

        // console.log("[Gestionar] Datos de solicitud recibidos:", solicitudData);
        setSolicitud(solicitudData);
        setMotivos(motivosData);
        setDocumentos(documentosData || []);

        // Cargar historial de forma independiente (opcional)
        try {
          const historialData =
            await solicitudesService.obtenerHistorialWorkflow(solicitudId);
          // console.log("[Gestionar] Historial recibido:", historialData);
          setHistorial(historialData);
        } catch (historialError) {
          // console.wakrn("[Gestionar] Error cargando historial (continuando sin él):", historialError);
          setHistorial(null);
        }
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

    if (!gestion.aprobado && !gestion.motivo_rechazo_id) {
      alert("Selecciona un motivo de rechazo.");
      return;
    }

    if (!gestion.aprobado && !gestion.modo_solucion) {
      alert("Selecciona un modo de solución.");
      return;
    }

    if (
      gestion.motivo_rechazo_id === 1 &&
      gestion.documentos_faltantes.length === 0
    ) {
      alert("Selecciona al menos un documento faltante.");
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
        solicitud.sol_id ?? solicitud.solicitud_id!,
        {
          aprobado: gestion.aprobado === true,
          motivo_rechazo_id: gestion.motivo_rechazo_id || null,
          fecha_estimada_respuesta_comercial:
            solicitud.fecha_estimada_respuesta_comercial,
          fecha_real_respuesta_comercial: fechaReal,
          usuario_modifica: usuarioId,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando solicitud...</p>
        </div>
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
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
    (solicitud as any)?.sol_fecha_estimada_auxiliar_servicio_cliente ||
    (solicitud as any)?.fecha_estimada_auxiliar_servicio_cliente;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft size={20} />
            Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Aprobar o Rechazar Formulario de Solicitud
          </h1>
          <p className="text-gray-600">
            Aprueba o rechaza la solicitud:{" "}
            <span className="font-semibold">
              {solicitud.sol_numero_solicitud || solicitud.numero_solicitud}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario de Gestión - Columna Izquierda (2/3) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {/* Información de la solicitud */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Información de la Solicitud
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Numero Solicitud
                    </p>
                    <p className="font-medium text-gray-900">
                      {solicitud.sol_numero_solicitud ||
                        solicitud.numero_solicitud}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Cliente</p>
                    <p className="font-medium text-gray-900">
                      {solicitud.cliente_nombre}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Centro de Operación
                    </p>
                    <p className="font-medium text-gray-900">
                      {solicitud.centro_operacion_nombre}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Estado</p>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        (solicitud.sol_estado_id ?? solicitud.estado_id) === 1
                          ? "bg-yellow-100 text-yellow-800"
                          : (solicitud.sol_estado_id ?? solicitud.estado_id) ===
                              2
                            ? "bg-blue-100 text-blue-800"
                            : (solicitud.sol_estado_id ??
                                  solicitud.estado_id) === 3
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
                    <p className="text-sm text-gray-600 mb-1">
                      Consumo Proyectado (USD)
                    </p>
                    <p className="font-medium text-gray-900">
                      {solicitud?.sol_consumo_mensual_proyectado ||
                      solicitud?.consumo_mensual_proyectado
                        ? `$${(
                            solicitud?.sol_consumo_mensual_proyectado ||
                            solicitud?.consumo_mensual_proyectado
                          )?.toLocaleString("es-CO", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Fecha Estimada Respuesta
                    </p>
                    <p className="font-medium text-gray-900">
                      {fechaEstimada
                        ? new Date(fechaEstimada).toLocaleDateString("es-CO")
                        : "-"}
                    </p>
                  </div>
                </div>
                {solicitud.observacionesComercial && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Observaciones Ejecutivo
                    </p>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded">
                      {solicitud.observacionesComercial}
                    </p>
                  </div>
                )}
              </div>

              {/* Formulario de decisión */}
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  Registrar Decisión
                </h2>

                {/* Botones Aprobar/Rechazar */}
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Decisión *
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() =>
                        setGestion((prev) => ({
                          ...prev,
                          aprobado: true,
                          motivo_rechazo_id: null,
                          modo_solucion: null,
                          documentos_faltantes: [],
                        }))
                      }
                      className={`px-6 py-3 rounded-lg font-medium border-2 transition-colors ${
                        gestion.aprobado === true
                          ? "bg-green-600 text-white border-green-600"
                          : "border-green-300 text-green-700 hover:bg-green-50"
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
                      className={`px-6 py-3 rounded-lg font-medium border-2 transition-colors ${
                        gestion.aprobado === false
                          ? "bg-red-600 text-white border-red-600"
                          : "border-red-300 text-red-700 hover:bg-red-50"
                      }`}
                    >
                      ✗ Rechazar
                    </button>
                  </div>
                </div>

                {/* Motivo de rechazo (si está rechazada) */}
                {gestion.aprobado === false && (
                  <>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Motivo del Rechazo *
                      </label>
                      <select
                        value={
                          gestion.motivo_rechazo_id
                            ? String(gestion.motivo_rechazo_id)
                            : ""
                        }
                        onChange={(e) =>
                          setGestion((prev) => ({
                            ...prev,
                            motivo_rechazo_id: e.target.value
                              ? Number(e.target.value)
                              : null,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecciona un motivo...</option>
                        {motivos.map((m, index) => (
                          <option key={`motivo-${index}`} value={String(m.id)}>
                            {m.descripcion}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Modo de Solución *
                      </label>
                      <select
                        value={gestion.modo_solucion || ""}
                        onChange={(e) =>
                          setGestion((prev) => ({
                            ...prev,
                            modo_solucion: e.target.value || null,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                    {gestion.motivo_rechazo_id === 1 &&
                      documentos.length > 0 && (
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Documentos con Fecha de Emisión Incorrecta
                          </label>
                          <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            {documentos.map((doc) => (
                              <label
                                key={doc.id}
                                className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded cursor-pointer border border-gray-200"
                              >
                                <input
                                  type="checkbox"
                                  checked={gestion.documentos_faltantes.includes(
                                    doc.id,
                                  )}
                                  onChange={(e) =>
                                    setGestion((prev) => ({
                                      ...prev,
                                      documentos_faltantes: e.target.checked
                                        ? [...prev.documentos_faltantes, doc.id]
                                        : prev.documentos_faltantes.filter(
                                            (id) => id !== doc.id,
                                          ),
                                    }))
                                  }
                                  className="rounded cursor-pointer"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {doc.nombre}
                                  </p>
                                  {doc.descripcion && (
                                    <p className="text-xs text-gray-500 mb-1">
                                      {doc.descripcion}
                                    </p>
                                  )}
                                  <div className="flex gap-4 text-xs text-gray-600">
                                    {doc.fecha_emision ? (
                                      <span className="bg-white px-2 py-1 rounded">
                                        Emisión:{" "}
                                        {new Date(
                                          doc.fecha_emision,
                                        ).toLocaleDateString("es-CO")}
                                      </span>
                                    ) : (
                                      <span className="bg-red-50 text-red-700 px-2 py-1 rounded font-medium">
                                        ⚠️ Sin fecha de emisión
                                      </span>
                                    )}
                                    {doc.fecha_vencimiento && (
                                      <span className="bg-white px-2 py-1 rounded">
                                        Vencimiento:{" "}
                                        {new Date(
                                          doc.fecha_vencimiento,
                                        ).toLocaleDateString("es-CO")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {doc.obligatorio && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded whitespace-nowrap">
                                    Obligatorio
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                  </>
                )}

                {/* Fecha Estimada Respuesta (visualizador) */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Estimada Respuesta
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-900">
                    {fechaEstimada
                      ? new Date(fechaEstimada).toLocaleDateString("es-CO")
                      : "-"}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-4">
                  <button
                    onClick={handleGuardarDecision}
                    disabled={
                      gestion.aprobado === undefined || gestion.guardando
                    }
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {gestion.guardando ? "Guardando..." : "Guardar Decisión"}
                  </button>
                  <button
                    onClick={() => router.back()}
                    disabled={gestion.guardando}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Historial - Columna Derecha (1/3) */}
          <div className="lg:col-span-1">
            {solicitud && historial && (
              <HistorialSolicitud
                historial={(historial?.historial || []).map(
                  (item: any, index: number) => ({
                    historialId: item.historialId || index,
                    etapaNombre: item.etapaNombre || "Etapa desconocida",
                    resultadoNombre: item.resultadoNombre,
                    estadoNombre: item.estadoNombre,
                    fecha: item.fecha,
                    usuarioNombre: item.usuarioNombre || item.nombre,
                  }),
                )}
              />
            )}
          </div>
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
