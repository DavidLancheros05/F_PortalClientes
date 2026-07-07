"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  FileText,
  AlertCircle,
  Loader,
  Send,
} from "lucide-react";
import { AuthContext } from "@/context/AuthContext";
import { pqrsService } from "@/services/pqrs.service";
import { StateBadge } from "@/components/pqrs/StateBadge";
import { PQRSTimeline } from "@/components/pqrs/PQRSTimeline";
import { PQRSComments } from "@/components/pqrs/PQRSComments";
import { LoadingModal } from "@/components/modals";

interface PQRSDetalle {
  pqrs_id: number;
  pqrs_numero: string;
  pqrs_titulo: string;
  pqrs_descripcion: string;
  pqrs_fecha_creacion: string;
  pqrs_fecha_cierre?: string;
  solicitante_nombre?: string;
  tipo?: { pt_nombre: string };
  estado: {
    pe_id: number;
    pe_nombre: string;
    pe_codigo?: string;
    pe_color?: string;
  };
  prioridad?: string;
  sla_estado?: string;
  horas_para_vencimiento?: number;
}

interface Comentario {
  pc_id?: number;
  id?: number;
  pc_comentario?: string;
  pc_usuario?: string;
  pc_fecha?: string;
  pc_es_interno?: boolean;
}

interface TimelineEvent {
  id: number;
  tipo_evento?: string;
  fecha_evento?: string;
  mensaje?: string;
  estado_anterior?: string;
  estado_nuevo?: string;
}

interface Estado {
  pe_id: number;
  pe_nombre: string;
  pe_codigo?: string;
  pe_color?: string;
}

export default function GestionarPQRSPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useContext(AuthContext);
  const pqrsId = parseInt(params.id as string);

  const [pqrs, setPqrs] = useState<PQRSDetalle | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [historial, setHistorial] = useState<TimelineEvent[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "comentarios">(
    "timeline",
  );
  const [selectedEstadoId, setSelectedEstadoId] = useState<number | null>(null);
  const [respuestaComentario, setRespuestaComentario] = useState("");
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  useEffect(() => {
    loadPQRSDetails();
    loadEstados();
  }, [pqrsId, user]);

  useEffect(() => {
    if (pqrs?.estado?.pe_id) {
      setSelectedEstadoId(pqrs.estado.pe_id);
    }
  }, [pqrs]);

  const loadPQRSDetails = async () => {
    if (!user || !pqrsId) return;
    try {
      setLoading(true);
      setError(null);
      const [pqrsData, comentariosData, historialData] = await Promise.all([
        pqrsService.getById(pqrsId),
        pqrsService.getComentarios(pqrsId),
        pqrsService.getHistorial(pqrsId),
      ]);
      setPqrs(pqrsData);

      const comentariosConNombres = Array.isArray(comentariosData)
        ? comentariosData.map((c: any) => ({
            ...c,
            pc_usuario:
              c.usuario?.nombre ||
              c.cliente?.cli_razon_social ||
              c.pc_usuario ||
              "Usuario",
          }))
        : [];

      setComentarios(comentariosConNombres);
      setHistorial(Array.isArray(historialData) ? historialData : []);
    } catch (err) {
      console.error("Error cargando detalles:", err);
      setError("No se pudieron cargar los detalles de la PQRS");
    } finally {
      setLoading(false);
    }
  };

  const loadEstados = async () => {
    try {
      const data = await pqrsService.getEstados();
      setEstados(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando estados:", err);
    }
  };

  const handleCambiarEstado = async () => {
    if (!selectedEstadoId || !pqrs) return;

    try {
      setCambiandoEstado(true);
      await pqrsService.cambiarEstado(pqrsId, {
        pqrs_pe_id: selectedEstadoId as number,
        comentario: respuestaComentario,
      });

      if (respuestaComentario) {
        await pqrsService.addComentario(pqrsId, respuestaComentario, false);
      }

      setRespuestaComentario("");
      await loadPQRSDetails();
    } catch (err) {
      console.error("Error cambiando estado:", err);
      setError("No se pudo cambiar el estado de la PQRS");
    } finally {
      setCambiandoEstado(false);
    }
  };

  const handleAddComentario = async (comentario: string) => {
    try {
      await pqrsService.addComentario(pqrsId, comentario, false);
      await loadPQRSDetails();
    } catch (err) {
      console.error("Error añadiendo comentario:", err);
      setError("No se pudo enviar el comentario");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  if (loading) {
    return <LoadingModal isOpen message="Cargando detalles..." />;
  }

  if (!pqrs || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
            <button
              onClick={() => router.push("/pqrs/bandeja")}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Error al cargar
              </h3>
              <p className="text-red-700 mb-4">
                {error || "No se encontró la PQRS"}
              </p>
              <button
                onClick={() => router.push("/pqrs/bandeja")}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Volver a Bandeja
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <button
            onClick={() => router.push("/pqrs/bandeja")}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna izquierda - Detalles */}
            <div className="lg:col-span-2">
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                      {pqrs.pqrs_titulo}
                    </h1>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {pqrs.pqrs_numero}
                    </p>
                  </div>
                  <StateBadge
                    estado={pqrs.estado}
                    className="whitespace-nowrap"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                      Fecha de creacion
                    </p>
                    <p className="text-sm text-gray-900 font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {formatDate(pqrs.pqrs_fecha_creacion)}
                    </p>
                  </div>

                  {pqrs.tipo && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                        Tipo
                      </p>
                      <p className="text-sm text-gray-900 font-medium">
                        {pqrs.tipo.pt_nombre}
                      </p>
                    </div>
                  )}

                  {pqrs.prioridad && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                        Prioridad
                      </p>
                      <p className="text-sm text-gray-900 font-medium">
                        {pqrs.prioridad}
                      </p>
                    </div>
                  )}

                  {pqrs.horas_para_vencimiento !== undefined && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                        Horas para vencimiento
                      </p>
                      <p className="text-sm text-gray-900 font-medium">
                        {pqrs.horas_para_vencimiento}h
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                    Descripcion
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {pqrs.pqrs_descripcion}
                  </p>
                </div>
              </div>

              <div className="border-b border-gray-200 mb-6">
                <div className="flex gap-8">
                  <button
                    onClick={() => setActiveTab("timeline")}
                    className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                      activeTab === "timeline"
                        ? "text-blue-600 border-blue-600"
                        : "text-gray-600 hover:text-gray-900 border-transparent"
                    }`}
                  >
                    <Clock className="h-4 w-4 inline mr-2" />
                    Timeline
                  </button>
                  <button
                    onClick={() => setActiveTab("comentarios")}
                    className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors relative ${
                      activeTab === "comentarios"
                        ? "text-blue-600 border-blue-600"
                        : "text-gray-600 hover:text-gray-900 border-transparent"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 inline mr-2" />
                    Comentarios
                    {comentarios.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                        {comentarios.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {activeTab === "timeline" && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
                  <PQRSTimeline eventos={historial} />
                </div>
              )}

              {activeTab === "comentarios" && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
                  <PQRSComments
                    comentarios={comentarios}
                    pqrsEstado={pqrs.estado}
                    pqrsId={pqrsId}
                    onAddComentario={handleAddComentario}
                    usuarioNombre={user?.nombre}
                  />
                </div>
              )}

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Columna derecha - Panel de Gestión */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-6 sticky top-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Cambiar Estado
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nuevo estado
                    </label>
                    <select
                      value={selectedEstadoId ?? ""}
                      onChange={(e) =>
                        setSelectedEstadoId(
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar estado...</option>
                      {estados.map((est) => (
                        <option key={est.pe_id} value={est.pe_id}>
                          {est.pe_nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Comentario (opcional)
                    </label>
                    <textarea
                      value={respuestaComentario}
                      onChange={(e) => setRespuestaComentario(e.target.value)}
                      placeholder="Agregar un comentario sobre el cambio de estado..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={4}
                    />
                  </div>

                  <button
                    onClick={handleCambiarEstado}
                    disabled={
                      !selectedEstadoId ||
                      cambiandoEstado
                    }
                    className={`w-full py-2 px-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all ${
                      !selectedEstadoId ||
                      cambiandoEstado
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 active:scale-95"
                    }`}
                  >
                    {cambiandoEstado ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Cambiar Estado
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
