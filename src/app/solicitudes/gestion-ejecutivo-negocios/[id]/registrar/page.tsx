"use client";
import { solicitudesService } from "@/services/solicitudes.service";
import { parametrosService } from "@/services/parametros.service";
import HistorialSolicitud from "@/components/historial/HistorialSolicitud";
import { ConfirmModal, SuccessModal, LoadingModal } from "@/components/modals";
import { ESTADOS } from "@/lib/workflow-labels";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  DollarSign,
  MessageSquare,
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
  consumoMensual: number | null;
  consumoMensualDisplay: string;
  observaciones: string;
  guardando: boolean;
}

interface DiasRespuesta {
  [key: string]: number;
}

export default function RegistrarConceptoPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const solicitudId = params?.id ? Number(params.id) : null;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [diasRespuesta, setDiasRespuesta] = useState<DiasRespuesta>({});
  const [registro, setRegistro] = useState<RegistroState>({
    consumoMensual: null,
    consumoMensualDisplay: "",
    observaciones: "",
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

        console.log(
          "[Registrar Concepto] Datos de solicitud recibidos:",
          solicitudData,
        );
        console.log("[Registrar Concepto] Días de respuesta:", dias);
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

  const formatNumberWithThousands = (value: string): string => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) return "";
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseFormattedNumber = (formatted: string): number | null => {
    const cleaned = formatted.replace(/\./g, "");
    return cleaned ? Number(cleaned) : null;
  };

  const handleConsumoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatNumberWithThousands(input);
    const numericValue = parseFormattedNumber(formatted);

    setRegistro((prev) => ({
      ...prev,
      consumoMensualDisplay: formatted,
      consumoMensual: numericValue,
    }));
  };

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

  const handleGuardarConcepto = () => {
    if (!solicitud) return;

    const usuarioId = obtenerUsuarioId();
    if (!usuarioId) {
      alert("No hay usuario autenticado para registrar el concepto.");
      return;
    }

    if (!registro.consumoMensual || registro.consumoMensual <= 0) {
      alert(
        "El consumo mensual proyectado es obligatorio y debe ser mayor a 0.",
      );
      return;
    }

    if (!registro.observaciones.trim()) {
      alert("Las observaciones son obligatorias.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmGuardar = async () => {
    if (!solicitud) return;

    const usuarioId = obtenerUsuarioId();
    if (!usuarioId) return;

    try {
      setRegistro((prev) => ({ ...prev, guardando: true }));

      const ahora = new Date().toISOString();

      await solicitudesService.guardarGestionEjecutivo(
        solicitud.sol_id ?? solicitud.sa_sol_id!,
        {
          consumo_mensual_proyectado: registro.consumoMensual,
          observacionesComercial: registro.observaciones,
          usuario_modifica: usuarioId,
          fecha_real_ejecutivo: ahora,
        },
      );

      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Error al guardar");
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
    (solicitud as any).sol_fecha_estimada_ejecutivo ||
    (solicitud as any).fecha_estimada_ejecutivo;

  const pasos = [
    {
      id: "creada",
      nombre: "Creada",
      estado: "completado" as const,
      fecha: solicitud.sol_fecha_creacion || solicitud.fecha_creacion,
      usuario: solicitud.cliente_nombre || solicitud.usuario_registro,
      dias: diasRespuesta["Creada"] ?? 0,
    },
    {
      id: "concepto",
      nombre: "Concepto",
      estado: "en_curso" as const,
      fecha: new Date().toISOString(),
      usuario: user?.nombre || user?.email || "-",
      dias: diasRespuesta["Concepto"] ?? 1,
    },
    {
      id: "comercial",
      nombre: "Comercial",
      estado: "pendiente" as const,
      dias: diasRespuesta["Comercial"] ?? 2,
    },
    {
      id: "financiera",
      nombre: "Financiera",
      estado: "pendiente" as const,
      dias: diasRespuesta["Financiera"] ?? 1,
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
                  Registrar Concepto Ejecutivo
                </h1>
                <p className="text-xs md:text-sm text-blue-100 truncate">
                  Solicitud:{" "}
                  <span className="font-semibold text-white">
                    {solicitud.sol_numero_solicitud ||
                      solicitud.numero_solicitud}
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
                  {ESTADOS[solicitud.sol_estado_id ?? solicitud.estado_id] ||
                    "Desconocido"}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Fecha Estimada
                </p>
                <p className="font-semibold text-gray-900">
                  {fechaEstimada
                    ? new Date(fechaEstimada).toLocaleDateString("es-CO")
                    : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Contenido en dos columnas */}
          <div className="grid grid-cols-3 gap-6 px-8 py-8">
            {/* Formulario de registro - Izquierda */}
            <div className="col-span-2">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CheckCircle size={24} className="text-blue-600" />
                Registrar Concepto
              </h2>

              <div className="space-y-6">
                {/* Consumo Mensual Proyectado */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <DollarSign size={18} className="text-blue-600" />
                    Consumo Mensual Proyectado (USD) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={registro.consumoMensualDisplay}
                    onChange={handleConsumoChange}
                    placeholder="Ej: 5.000.000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <MessageSquare size={18} className="text-blue-600" />
                    Observaciones *
                  </label>
                  <textarea
                    value={registro.observaciones}
                    onChange={(e) =>
                      setRegistro((prev) => ({
                        ...prev,
                        observaciones: e.target.value,
                      }))
                    }
                    placeholder="Escribe tus observaciones aquí..."
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  />
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleGuardarConcepto}
                    disabled={
                      !registro.consumoMensual ||
                      !registro.observaciones.trim() ||
                      registro.guardando
                    }
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registro.guardando ? "Guardando..." : "Guardar Concepto"}
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
              <HistorialSolicitud
                historial={
                  pasos?.map((item: any, index: number) => ({
                    historialId: index,
                    etapaNombre: item.nombre || "Etapa desconocida",
                    resultadoNombre: item.resultado,
                    estadoNombre: undefined,
                    fecha: item.fecha,
                    usuarioNombre: item.usuario,
                  })) || []
                }
              />
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Confirmar Registro de Concepto"
        message={`¿Estás seguro de que deseas registrar el concepto con un consumo mensual de $${registro.consumoMensual?.toLocaleString("es-CO")}?`}
        confirmText="Sí, Guardar"
        cancelText="Cancelar"
        isLoading={registro.guardando}
        onConfirm={handleConfirmGuardar}
        onCancel={() => setShowConfirmModal(false)}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        title="¡Éxito!"
        message="El concepto fue generado con éxito. Serás redirigido a la lista de solicitudes."
        actionText="Aceptar"
        autoClose={true}
        autoCloseDelay={3000}
        onAction={() => router.push("/solicitudes/gestion-ejecutivo-negocios")}
      />
    </div>
  );
}
