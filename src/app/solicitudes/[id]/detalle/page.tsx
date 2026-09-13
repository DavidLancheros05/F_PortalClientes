"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Building2, FileText, FileSearch, DollarSign, Clock } from "lucide-react";
import { solicitudesService } from "@/services/solicitudes.service";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { ESTADOS } from "@/lib/workflow-labels";
import { generarPlantillaDocumentoPdf } from "@/lib/carta-pdf.util";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import { SoportesAnalisis } from "@/components/SoportesAnalisis";
import HistorialSolicitud from "@/components/historial/HistorialSolicitud";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { useSolicitudCupoSolicitado } from "@/hooks/useSolicitudCupoSolicitado";
import { AmpliacionCupoResumen } from "@/components/solicitudes/AmpliacionCupoResumen";
import { ESTADO_TOKENS } from "@/constants/estado-tokens";
import { WORKFLOW_ETAPA } from "@/constants/workflow-etapas";

interface SolicitudDetalle {
  sol_id: number;
  sol_numero_solicitud: string;
  cliente_nombre: string;
  cliente_nit?: string;
  ejecutivo_nombre?: string;
  usuario_registro?: string;
  usuario_revision?: string;
  centro_operacion_nombre?: string;
  etapa_nombre?: string;
  resultado_nombre?: string;
  sol_fecha_creacion: string;
  sol_estado_id: number;
  cliente_direccion?: string;
  sol_consumo_mensual_proyectado?: number;
  sol_toneladas_proyectadas?: number;
  sol_cupo_aprobado?: number;
  sol_plazo_pago?: number;
  sol_forma_pago?: string;
  sol_observacion_ejn?: string | null;
  sol_es_zona_franca?: boolean;
  sol_formulario_version?: number;
  fecha_aprobacion?: string;
  sol_cupo_solicitado?: number;
  sol_justificacion_ampliacion?: string | null;
  sol_cupo_actual_referencia?: number | null;
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

function formatCurrency(value?: number | null) {
  if (!value) return "-";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}


export default function DetalleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const solicitudId = Number(params.id);

  const [solicitud, setSolicitud] = useState<SolicitudDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [descargandoPdfFormulario, setDescargandoPdfFormulario] = useState(false);
  const { historial } = useHistorialWorkflow(
    Number.isFinite(solicitudId) ? solicitudId : null,
  );
  const {
    loading: loadingCupo,
    solicitaCredito,
    montoSolicitadoTexto,
    formaPagoSolicitada,
    tipoSolicitud,
  } = useSolicitudCupoSolicitado(
    Number.isFinite(solicitudId) ? solicitudId : null,
  );

  const abrirPdfFormulario = async () => {
    try {
      setDescargandoPdfFormulario(true);
      const blob = await solicitudesService.downloadPdf(solicitudId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Error abriendo PDF del formulario:", err);
      alert("No se pudo generar el PDF del formulario. Intenta de nuevo.");
    } finally {
      setDescargandoPdfFormulario(false);
    }
  };

  const abrirCartaPDF = async () => {
    if (!solicitud) return;

    setGenerandoPDF(true);
    try {
      // Fuente única desde 2026-07-27: la Carta de Vinculación es un
      // Tipos_documentos con tdo_origen='CARTA_APROBACION' (antes vivía en
      // param_carta_pdf_vinculacion, tabla aparte que ya no se edita — ver
      // documentacion/mejoras/rediseno-gestionar-comite-credito.md).
      const tipos = await documentosService.getAll();
      const plantillaActiva = tipos.find(
        (t) => t.origen === "CARTA_APROBACION" && t.estado,
      );

      if (!plantillaActiva || !plantillaActiva.plantillaContenido) {
        alert("No hay plantilla de carta activa");
        return;
      }

      // Mismo motor pdf-lib (generarPlantillaDocumentoPdf -> generarCartaPdf,
      // carta-pdf.util.ts) que usa el resto del sistema para plantillas, y su
      // réplica en el backend (common/utils/carta-pdf.util.ts) para el correo
      // real que se envía al aprobar CC2 — antes esta vista previa se armaba
      // a mano con html2pdf.js y quedaba con un formato distinto al de la
      // carta real. Ver "Documentos Cartonera/documentacion/mejoras/
      // unificacion-carta-vinculacion-tipos-documentos.md".
      await generarPlantillaDocumentoPdf({
        tdoNombre: `Aprobación de solicitud de vinculación comercial No. ${solicitud.sol_numero_solicitud}`,
        tdoPlantillaContenido: plantillaActiva.plantillaContenido,
        clienteNombre: solicitud.cliente_nombre,
        numeroSolicitud: solicitud.sol_numero_solicitud,
        encabezadoTipo: plantillaActiva.encabezadoTipo,
        encabezadoImagenUrl: plantillaActiva.encabezadoImagenUrl,
        piePaginaTipo: plantillaActiva.piePaginaTipo,
        piePaginaTexto: plantillaActiva.piePaginaTexto,
        piePaginaImagenUrl: plantillaActiva.piePaginaImagenUrl,
        reemplazosExtra: {
          "{{cupo_aprobado}}": formatCurrency(solicitud.sol_cupo_aprobado),
          "{{forma_pago}}": solicitud.sol_forma_pago || "-",
          "{{plazo}}": solicitud.sol_plazo_pago
            ? `${solicitud.sol_plazo_pago} días`
            : "-",
          "{{fecha_aprobacion}}": formatDate(solicitud.fecha_aprobacion),
          "{{tasa_interes}}": "-",
        },
      });
    } catch (err) {
      console.error("Error generando PDF:", err);
      alert("Error al generar el PDF");
    } finally {
      setGenerandoPDF(false);
    }
  };

  useEffect(() => {
    async function cargarSolicitud() {
      try {
        const data = await solicitudesService.getById(solicitudId);
        setSolicitud(data);
      } catch (err) {
        console.error("Error cargando solicitud:", err);
        setError("Error al cargar los datos de la solicitud");
      } finally {
        setLoading(false);
      }
    }

    if (solicitudId) {
      cargarSolicitud();
    }
  }, [solicitudId]);

  const estadoTokens = ESTADO_TOKENS[solicitud?.sol_estado_id ?? 1] || ESTADO_TOKENS[1];

  // Comentario más reciente que dejó cada área en el historial de workflow.
  // `historial` viene ordenado ascendente por fecha (obtenerHistorial en el
  // backend: ORDER BY swh_fecha ASC) y un mismo etapaCodigo puede repetirse
  // más de una vez (ej. Comité de Crédito 2 aprueba, se rechaza, se vuelve a
  // decidir) — hay que quedarse con la ÚLTIMA entrada de esa etapa, no la
  // primera, para mostrar la decisión vigente y no una vieja. Se usa también
  // para decidir si esa área ya fue alcanzada (sin comentario, la tarjeta de
  // esa área no se muestra).
  const comentarioPorEtapa = (codigo: string) => {
    const entradas = historial.filter((h) => h.etapaCodigo === codigo);
    return entradas.length > 0 ? entradas[entradas.length - 1].comentario : undefined;
  };
  const comentarioASC = comentarioPorEtapa("ASC");
  const comentarioOFC = comentarioPorEtapa("OFC");
  const comentarioCC1 = comentarioPorEtapa("CC1");
  const comentarioCC2 = comentarioPorEtapa("CC2");

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to font-sans text-[#0f172a] p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1240px] mx-auto">
        <div className="bg-white border border-[#e9ecf2] rounded-[22px] overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)]">
          {/* Header */}
          <div className="bg-brand-gradient px-7 py-[22px] flex items-center gap-4">
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
                Detalle de Solicitud
              </h1>
              {solicitud && (
                <p className="text-[12.5px] text-[#c3d5f5] mt-[3px] m-0 truncate">
                  Solicitud{" "}
                  <span className="font-bold text-white">
                    {solicitud.sol_numero_solicitud}
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
          ) : error || !solicitud ? (
            <div className="p-8 text-center">
              <p className="text-red-600">{error || "No se encontró la solicitud"}</p>
            </div>
          ) : (
            <>
              {/* Info block */}
              <div className="px-7 py-[26px] border-b border-[#eef1f6]">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 flex-1 min-w-[280px]">
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
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-1">
                        Estado
                      </p>
                      <span
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-bold px-[11px] py-1 rounded-full"
                        style={{ color: estadoTokens.color, background: estadoTokens.bg }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: estadoTokens.color }} />
                        {ESTADOS[solicitud.sol_estado_id] || "Desconocido"}
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-1">
                        Fecha de Creación
                      </p>
                      <p className="text-sm font-bold text-[#0f172a] m-0">
                        {formatDate(solicitud.sol_fecha_creacion)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-1">
                        Centro de Operación
                      </p>
                      <p className="text-sm font-bold text-[#0f172a] m-0">
                        {solicitud.centro_operacion_nombre || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      onClick={() => router.push(`/solicitudes/${solicitud.sol_id}`)}
                      className="inline-flex items-center gap-2 px-3 py-2 text-[12.5px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-xl hover:bg-cyan-100 transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      Ver Formulario
                    </button>
                    <button
                      onClick={abrirPdfFormulario}
                      disabled={descargandoPdfFormulario}
                      className="inline-flex items-center gap-2 px-3 py-2 text-[12.5px] font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileSearch className="h-4 w-4" />
                      {descargandoPdfFormulario ? "Generando..." : "Ver PDF Formulario"}
                    </button>
                  </div>
                </div>

                {solicitud.sol_cupo_solicitado ? (
                  <AmpliacionCupoResumen
                    cupoActualReferencia={solicitud.sol_cupo_actual_referencia}
                    cupoSolicitado={solicitud.sol_cupo_solicitado}
                    justificacion={solicitud.sol_justificacion_ampliacion}
                    consumoMensualProyectado={solicitud.sol_consumo_mensual_proyectado}
                    toneladasProyectadas={solicitud.sol_toneladas_proyectadas}
                  />
                ) : (
                  <div className="rounded-2xl border border-[#eef1f6] bg-[#fafbfd] p-5">
                    <p className="text-[11px] text-[#94a3b8] mb-0.5">Solicita Cupo</p>
                    <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                      {solicitaCredito
                        ? `Sí — ${montoSolicitadoTexto || "monto no especificado"}${formaPagoSolicitada ? ` · ${formaPagoSolicitada}` : ""}`
                        : "No"}
                    </p>
                  </div>
                )}
              </div>

              {/* Cuerpo: secciones de información */}
              <div className="p-7">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Información General */}
                  <div className="rounded-2xl p-5 border border-[#eef1f6] bg-[#fafbfd]">
                    <h2 className="text-[13.5px] font-extrabold text-[#0f172a] mb-4 flex items-center gap-[9px] tracking-[-0.01em]">
                      <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
                        <FileText size={15} strokeWidth={2.2} className="text-brand-600" />
                      </div>
                      Información General
                    </h2>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] text-[#94a3b8] mb-0.5">Versión Formulario</p>
                        <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                          {solicitud.sol_formulario_version || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#94a3b8] mb-0.5">Zona Franca</p>
                        <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                          {solicitud.sol_es_zona_franca ? "Sí" : "No"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Datos del Cliente */}
                  <div className="rounded-2xl p-5 border border-[#eef1f6] bg-[#fafbfd]">
                    <h2 className="text-[13.5px] font-extrabold text-[#0f172a] mb-4 flex items-center gap-[9px] tracking-[-0.01em]">
                      <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
                        <Building2 size={15} strokeWidth={2.2} className="text-brand-600" />
                      </div>
                      Datos del Cliente
                    </h2>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] text-[#94a3b8] mb-0.5">Razón Social</p>
                        <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                          {solicitud.cliente_nombre || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#94a3b8] mb-0.5">NIT/Documento</p>
                        <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                          {solicitud.cliente_nit || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[#94a3b8] mb-0.5">Dirección</p>
                        <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                          {solicitud.cliente_direccion || "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Gestión por Área — el detalle real de lo que hizo cada
                    área en su etapa, no solo el estado genérico actual. Cada
                    tarjeta solo se muestra si esa área ya fue alcanzada
                    (comentario existente en el historial, o sol_observacion_ejn
                    para el Ejecutivo). Mismo mecanismo que ya usa
                    gestion-comite-credito-2 para "Concepto de etapas previas". */}
                {(solicitud.sol_observacion_ejn ||
                  solicitud.sol_consumo_mensual_proyectado ||
                  solicitud.sol_toneladas_proyectadas ||
                  comentarioASC ||
                  comentarioOFC ||
                  comentarioCC1 ||
                  comentarioCC2) && (
                  <div className="mt-4">
                    <h2 className="text-[13.5px] font-extrabold text-[#0f172a] mb-4 flex items-center gap-[9px] tracking-[-0.01em]">
                      <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
                        <Clock size={15} strokeWidth={2.2} className="text-brand-600" />
                      </div>
                      Gestión por Área
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {(solicitud.sol_observacion_ejn ||
                        solicitud.sol_consumo_mensual_proyectado ||
                        solicitud.sol_toneladas_proyectadas) && (
                        <div className="rounded-2xl p-5 border border-[#eef1f6] bg-[#fafbfd]">
                          <p className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#1d4ed8] mb-3">
                            Ejecutivo de Negocios
                          </p>
                          <p className="text-[11px] text-[#94a3b8] mb-0.5">Ejecutivo</p>
                          <p className="text-[13.5px] font-bold text-[#0f172a] m-0 mb-3">
                            {solicitud.ejecutivo_nombre || "-"}
                          </p>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-[11px] text-[#94a3b8] mb-0.5">Consumo Mensual Proyectado</p>
                              <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                                {formatCurrency(solicitud.sol_consumo_mensual_proyectado)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-[#94a3b8] mb-0.5">Toneladas Proyectadas</p>
                              <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                                {solicitud.sol_toneladas_proyectadas
                                  ? `${solicitud.sol_toneladas_proyectadas.toLocaleString("es-CO")} Ton`
                                  : "-"}
                              </p>
                            </div>
                          </div>
                          <p className="text-[11px] text-[#94a3b8] mb-0.5">Observación</p>
                          <p className="text-[12.5px] text-[#334155] m-0 whitespace-pre-wrap">
                            {solicitud.sol_observacion_ejn || "-"}
                          </p>
                        </div>
                      )}

                      {comentarioASC && (
                        <div className="rounded-2xl p-5 border border-[#eef1f6] bg-[#fafbfd]">
                          <p className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#1d4ed8] mb-3">
                            Auxiliar Servicio al Cliente
                          </p>
                          <p className="text-[12.5px] text-[#334155] m-0 whitespace-pre-wrap">
                            {comentarioASC}
                          </p>
                        </div>
                      )}

                      {comentarioOFC && (
                        <div className="rounded-2xl p-5 border border-[#eef1f6] bg-[#fafbfd] space-y-4">
                          <div>
                            <p className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#1d4ed8] mb-3">
                              Oficial de Cumplimiento
                            </p>
                            <p className="text-[12.5px] text-[#334155] m-0 whitespace-pre-wrap">
                              {comentarioOFC}
                            </p>
                          </div>
                          <SoportesAnalisis
                            solicitudId={solicitud.sol_id}
                            wetId={WORKFLOW_ETAPA.OFC.id}
                            titulo="Soportes de Oficial de Cumplimiento"
                            readOnly
                          />
                        </div>
                      )}

                      {comentarioCC1 && (
                        <div className="rounded-2xl p-5 border border-[#eef1f6] bg-[#fafbfd] space-y-4">
                          <div>
                            <p className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#1d4ed8] mb-3">
                              Comité de Crédito 1
                            </p>
                            <p className="text-[12.5px] text-[#334155] m-0 whitespace-pre-wrap">
                              {comentarioCC1}
                            </p>
                          </div>
                          <SoportesAnalisis
                            solicitudId={solicitud.sol_id}
                            wetId={WORKFLOW_ETAPA.CC1.id}
                            titulo="Soportes de Comité de Crédito 1"
                            readOnly
                          />
                        </div>
                      )}

                      {comentarioCC2 && (
                        <div className="rounded-2xl p-5 border border-[#eef1f6] bg-[#fafbfd]">
                          <p className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#1d4ed8] mb-3">
                            Comité de Crédito 2
                          </p>
                          <p className="text-[12.5px] text-[#334155] m-0 whitespace-pre-wrap">
                            {comentarioCC2}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Condiciones Financieras Aprobadas */}
                {solicitud.sol_cupo_aprobado && (
                  <div className="mt-4 rounded-2xl p-5 border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <h2 className="text-[13.5px] font-extrabold text-[#0f172a] flex items-center gap-[9px] tracking-[-0.01em]">
                        <div className="w-[30px] h-[30px] rounded-[9px] bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <DollarSign size={15} strokeWidth={2.2} className="text-emerald-700" />
                        </div>
                        Condiciones Financieras Aprobadas
                      </h2>
                      <button
                        onClick={abrirCartaPDF}
                        disabled={generandoPDF}
                        className="inline-flex items-center gap-2 px-4 py-2 text-[12.5px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FileText className="h-4 w-4" />
                        {generandoPDF ? "Generando..." : "Ver Carta PDF"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-xl p-4 border border-emerald-200">
                        <p className="text-[11px] text-[#94a3b8] uppercase mb-1">Cupo Aprobado</p>
                        <p className="text-xl font-extrabold text-emerald-700">
                          {formatCurrency(solicitud.sol_cupo_aprobado)}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-emerald-200">
                        <p className="text-[11px] text-[#94a3b8] uppercase mb-1">Plazo de Pago</p>
                        <p className="text-xl font-extrabold text-emerald-700">
                          {solicitud.sol_plazo_pago ? `${solicitud.sol_plazo_pago} días` : "-"}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-emerald-200">
                        <p className="text-[11px] text-[#94a3b8] uppercase mb-1">Forma de Pago</p>
                        <p className="text-lg font-extrabold text-emerald-700">
                          {solicitud.sol_forma_pago || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documentos y respuestas por etapa */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                  <div className="lg:col-span-2 rounded-2xl p-5 border border-[#eef1f6] bg-[#fafbfd]">
                    <DocumentosCargadosSolicitud solicitudId={solicitud.sol_id} />
                  </div>
                  <div className="lg:col-span-1">
                    <HistorialSolicitud historial={historial} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-7 py-5 border-t border-[#eef1f6] flex justify-end">
                <button
                  onClick={() => router.back()}
                  className="px-5 py-2.5 text-[13px] font-bold text-[#374151] bg-white border border-[#e5e7eb] rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
