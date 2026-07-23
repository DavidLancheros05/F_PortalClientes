"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { ESTADOS, getEstadoBadgeClass } from "@/lib/workflow-labels";
import HistorialSolicitud from "@/components/historial/HistorialSolicitud";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import { ConfirmModal, SuccessModal } from "@/components/modals";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSolicitudCupoSolicitado } from "@/hooks/useSolicitudCupoSolicitado";
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
  const [historial, setHistorial] = useState<any>(null);
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
  const [hayDocumentosVencidos, setHayDocumentosVencidos] = useState(false);
  const { solicitaCredito, montoSolicitado } =
    useSolicitudCupoSolicitado(solicitudId);

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

        // console.log("[Gestionar] Datos de solicitud recibidos:", solicitudData);
        setSolicitud(solicitudData);

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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[90%] mx-auto">
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
          {loading ? (
            <div className="h-5 bg-gray-200 rounded w-64 animate-pulse" />
          ) : solicitud ? (
            <p className="text-gray-600">
              Aprueba o rechaza la solicitud:{" "}
              <span className="font-semibold">
                {solicitud.sol_numero_solicitud || solicitud.numero_solicitud}
              </span>
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-12 bg-gray-100 rounded" />
                <div className="h-12 bg-gray-100 rounded" />
                <div className="h-12 bg-gray-100 rounded" />
                <div className="h-12 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
              <div className="h-40 bg-white rounded-lg border border-gray-200" />
            </div>
          </div>
        ) : !solicitud ? (
          <div className="max-w-2xl">
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-600">No se encontró la solicitud</p>
            </div>
          </div>
        ) : (
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
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Solicita Cupo
                    </p>
                    <p className="font-medium text-gray-900">
                      {solicitaCredito
                        ? `Sí — $${(montoSolicitado ?? 0).toLocaleString("es-CO")}`
                        : "No"}
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

              {/* Documentos cargados — se revisan antes de decidir */}
              {solicitud && (
                <div className="p-6 border-b border-gray-200">
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
              )}

              {/* Formulario de decisión */}
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  Registrar Decisión
                </h2>

                {hayDocumentosVencidos && !hayDocumentosMarcados && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
                    Hay documentos vencidos. Marca los que correspondan con
                    "Solicitar cambio" en la tabla de arriba para poder
                    rechazar la solicitud.
                  </p>
                )}
                {hayDocumentosMarcados && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
                    Hay documentos marcados con "Solicitar cambio" — no se
                    puede aprobar hasta resolverlos.
                  </p>
                )}

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
                          modo_solucion: null,
                        }))
                      }
                      disabled={hayProblemasDocumentos}
                      title={
                        hayProblemasDocumentos
                          ? "Hay documentos vencidos o marcados como no corresponde"
                          : undefined
                      }
                      className={`px-6 py-3 rounded-lg font-medium border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
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
                      disabled={!hayDocumentosMarcados}
                      title={
                        !hayDocumentosMarcados
                          ? "Marca al menos un documento con \"Solicitar cambio\" antes de rechazar"
                          : undefined
                      }
                      className={`px-6 py-3 rounded-lg font-medium border-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        gestion.aprobado === false
                          ? "bg-red-600 text-white border-red-600"
                          : "border-red-300 text-red-700 hover:bg-red-50"
                      }`}
                    >
                      ✗ Rechazar
                    </button>
                  </div>
                </div>

                {/* Modo de solución (si está rechazada) */}
                {gestion.aprobado === false && (
                  <>
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
                  </>
                )}

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
          <div className="lg:col-span-1 space-y-6">
            {solicitud && historial && (
              <HistorialSolicitud
                historial={(historial?.historial || []).map(
                  (item: any, index: number) => ({
                    historialId: item.historial_id || item.historialId || index,
                    etapaNombre:
                      item.etapa_nombre ||
                      item.etapaNombre ||
                      "Etapa desconocida",
                    resultadoNombre:
                      item.resultado_nombre || item.resultadoNombre,
                    estadoNombre: item.estado_nombre || item.estadoNombre,
                    fecha: item.fecha,
                    fechaEstimadaInicio:
                      item.fecha_estimada_inicio || item.fechaEstimadaInicio,
                    fechaEstimadaEtapaAnterior:
                      item.fecha_estimada_etapa_anterior ||
                      item.fechaEstimadaEtapaAnterior,
                    usuarioNombre:
                      item.usuarioNombre || item.nombre || item.usuario_nombre,
                  }),
                )}
              />
            )}
          </div>
        </div>
        )}
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
