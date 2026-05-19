"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { parametrosService } from "@/services/parametros.service";
import HistorialSolicitud from "@/components/historial/HistorialSolicitud";
import { ConfirmModal, SuccessModal } from "@/components/modals";
import { ESTADOS } from "@/lib/workflow-labels";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { ArrowLeft, FileText, CheckCircle } from "lucide-react";

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
  recomendacion: "aprobado" | "rechazado" | "";
  guardando: boolean;
  // Condiciones Financieras
  cupo: string;
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
  const { historial: historialWorkflow } = useHistorialWorkflow(solicitudId);
  const [registro, setRegistro] = useState<RegistroState>({
    recomendacion: "",
    guardando: false,
    cupo: "",
    plazoPago: "",
    formaPago: "",
    nombreAprueba: user?.usuario_nombre || "",
    fecha: new Date().toISOString().split("T")[0],
    firma: "",
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

        console.log("[Gestión Comité Crédito 2] Datos de solicitud recibidos:", solicitudData);
        console.log("[Gestión Comité Crédito 2] Días de respuesta:", dias);
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
    console.log("[handleGuardarRevision] Iniciando validación...");

    if (!solicitud) {
      console.log("[handleGuardarRevision] No hay solicitud");
      return;
    }

    console.log("[handleGuardarRevision] Recomendación:", registro.recomendacion);
    if (!registro.recomendacion) {
      alert("Debe seleccionar Aprobado o Negado.");
      return;
    }

    // Si es aprobado, validar campos de condiciones financieras
    if (registro.recomendacion === "aprobado") {
      if (!registro.cupo.trim()) {
        alert("El cupo es obligatorio para aprobación.");
        return;
      }
      if (!registro.plazoPago.trim()) {
        alert("El plazo de pago es obligatorio para aprobación.");
        return;
      }
      if (!registro.formaPago.trim()) {
        alert("La forma de pago es obligatoria para aprobación.");
        return;
      }
    }

    setShowConfirmModal(true);
  };

  const handleConfirmGuardarRevision = async () => {
    if (!solicitud) return;

    try {
      setRegistro((prev) => ({ ...prev, guardando: true }));
      console.log("[handleConfirmGuardarRevision] Guardando...");

      const comentario = `DECISIÓN: ${registro.recomendacion.toUpperCase()}\nNOMBRE QUIEN APRUEBA: ${registro.nombreAprueba}\nFECHA: ${registro.fecha}`;

      console.log("[handleConfirmGuardarRevision] Llamando API con solicitud ID:", solicitud.sol_id);

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

      const respuesta = await solicitudesService.guardarConceptoComiteCredito2(
        solicitud.sol_id,
        payloadComite,
      );
      console.log("[handleConfirmGuardarRevision] Respuesta del API:", respuesta);

      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("[handleConfirmGuardarRevision] Error guardando:", error);
      alert("Error al guardar la evaluación: " + (error as any)?.message);
      setShowConfirmModal(false);
    } finally {
      setRegistro((prev) => ({ ...prev, guardando: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando solicitud...</p>
        </div>
      </div>
    );
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

  const fechaEstimada = solicitud.sol_fecha_estimada_respuesta_comercial || solicitud.fecha_estimada_respuesta_comercial;

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
      id: "comite-credito-1",
      nombre: "Comité Crédito 1",
      estado: "completado" as const,
      fecha: new Date().toISOString(),
      usuario: "-",
      dias: diasRespuesta["Comité Crédito 1"] ?? 2,
    },
    {
      id: "comite-credito-2",
      nombre: "Comité Crédito 2",
      estado: "en_curso" as const,
      fecha: new Date().toISOString(),
      usuario: user?.usuario_nombre || user?.email || "-",
      dias: diasRespuesta["Comité Crédito 2"] ?? 2,
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
                  Gestión Comité Crédito 2
                </h1>
                <p className="text-xs md:text-sm text-blue-100 truncate">
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
            {/* Formulario de evaluación - Izquierda */}
            <div className="col-span-2">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle size={24} className="text-blue-600" />
                Decisión Comité Crédito 2
              </h2>

              <div className="space-y-6">
                {/* DECISION */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    DECISIÓN *
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "aprobado", label: "✓ Aprobado", color: "green" },
                      { value: "rechazado", label: "✗ Negado", color: "red" },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <input
                          type="radio"
                          name="recomendacion"
                          value={option.value}
                          checked={registro.recomendacion === option.value}
                          onChange={(e) =>
                            setRegistro((prev) => ({
                              ...prev,
                              recomendacion: e.target.value as any,
                            }))
                          }
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className={`text-sm font-semibold text-${option.color}-900`}>
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Condiciones Financieras - Solo si es aprobado */}
                {registro.recomendacion === "aprobado" && (
                  <div className="border-t-2 border-green-300 pt-6">
                    <h3 className="text-lg font-bold text-green-800 mb-6 flex items-center gap-2">
                      <CheckCircle size={22} className="text-green-600" />
                      Condiciones Financieras (Aprobado)
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {/* Cupo */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Cupo ($) *
                        </label>
                        <input
                          type="number"
                          value={registro.cupo}
                          onChange={(e) =>
                            setRegistro((prev) => ({
                              ...prev,
                              cupo: e.target.value,
                            }))
                          }
                          placeholder="Ej: 50000000"
                          className="w-full px-4 py-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50"
                        />
                      </div>

                      {/* Plazo de Pago */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Plazo de Pago (días) *
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
                          className="w-full px-4 py-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50"
                        />
                      </div>

                      {/* Forma de Pago */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Forma de Pago *
                        </label>
                        <input
                          type="text"
                          value={registro.formaPago}
                          onChange={(e) =>
                            setRegistro((prev) => ({
                              ...prev,
                              formaPago: e.target.value,
                            }))
                          }
                          placeholder="Ej: Transferencia"
                          className="w-full px-4 py-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Nombre de quien aprueba */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nombre de quien aprueba
                        </label>
                        <input
                          type="text"
                          value={registro.nombreAprueba}
                          onChange={(e) =>
                            setRegistro((prev) => ({
                              ...prev,
                              nombreAprueba: e.target.value,
                            }))
                          }
                          placeholder="Tu nombre"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>

                      {/* Fecha */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Fecha
                        </label>
                        <input
                          type="date"
                          value={registro.fecha}
                          onChange={(e) =>
                            setRegistro((prev) => ({
                              ...prev,
                              fecha: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                          disabled
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-3">
                      * Estos campos son obligatorios para guardar una aprobación
                    </p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleGuardarRevision}
                    disabled={
                      !registro.recomendacion ||
                      (registro.recomendacion === "aprobado" && (!registro.cupo.trim() || !registro.plazoPago.trim() || !registro.formaPago.trim())) ||
                      registro.guardando
                    }
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registro.guardando ? "Guardando..." : "Guardar Decisión"}
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
        title="Confirmar Evaluación"
        message={`¿Estás seguro de que deseas registrar esta evaluación del Comité Crédito 2 con recomendación: ${registro.recomendacion}?`}
        confirmText="Sí, Guardar"
        cancelText="Cancelar"
        isLoading={registro.guardando}
        onConfirm={handleConfirmGuardarRevision}
        onCancel={() => setShowConfirmModal(false)}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        title="¡Éxito!"
        message="La evaluación del Comité Crédito 2 fue registrada correctamente. Serás redirigido a la lista de solicitudes."
        actionText="Aceptar"
        autoClose={true}
        autoCloseDelay={3000}
        onAction={() => router.push("/solicitudes/gestion-comite-credito-2")}
      />
    </div>
  );
}
