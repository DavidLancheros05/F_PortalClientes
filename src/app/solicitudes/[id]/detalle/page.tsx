"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Clock,
  Briefcase,
  Headphones,
  ShieldCheck,
  Users,
  Award,
  CheckCircle2,
  Table,
  X,
} from "lucide-react";
import { solicitudesService } from "@/services/solicitudes.service";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { variablesPlantillaService } from "@/services/admin/parametrizacion/variables-plantilla.service";
import { generarPlantillaDocumentoPdf, construirMapaRespuestasPregunta } from "@/lib/carta-pdf.util";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import { SoportesAnalisis } from "@/components/SoportesAnalisis";
import { TablasCumplimientoModal } from "@/components/TablasCumplimientoModal";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { SolicitudInfoBlock } from "@/components/solicitudes/SolicitudInfoBlock";
import { WORKFLOW_ETAPA } from "@/constants/workflow-etapas";
import { ErrorModal } from "@/components/modals";
import { DecisionDisplay, GestionAreaCard, SlaBadge } from "@/components/solicitudes/GestionAreaCard";

interface SolicitudDetalle {
  sol_id: number;
  sol_numero: string;
  cliente_nombre: string;
  cliente_nit?: string;
  ejecutivo_nombre?: string;
  sol_fecha_gest_ejn?: string | null;
  sol_fecha_est_gest_ejn?: string | null;
  sol_fecha_gest_asc?: string | null;
  sol_fecha_est_gest_asc?: string | null;
  sol_fecha_gest_oc?: string | null;
  sol_fecha_est_gest_oc?: string | null;
  sol_fecha_gest_cc1?: string | null;
  sol_fecha_est_gest_cc1?: string | null;
  sol_fecha_gest_cc2?: string | null;
  sol_fecha_est_gest_cc2?: string | null;
  usuario_registro?: string;
  usuario_revision?: string;
  centro_operacion_nombre?: string;
  etapa_nombre?: string;
  resultado_nombre?: string;
  sol_fecha_creacion: string;
  sol_fecha_envio?: string | null;
  sol_ses_id: number;
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

// Formato largo — solo para el texto de la carta de aprobación en PDF
// ({{fecha_aprobacion}}), donde sí corresponde una fecha formal escrita.
// Para mostrar fechas en pantalla usar el formatDate corto compartido
// (@/lib/date-utils), igual que el resto de la app.
function formatDateLarga(value?: string | null) {
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
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [mostrarTablasCumplimiento, setMostrarTablasCumplimiento] = useState(false);
  const { historial } = useHistorialWorkflow(Number.isFinite(solicitudId) ? solicitudId : null);
  const abrirPdfFormulario = async () => {
    try {
      setDescargandoPdfFormulario(true);
      const blob = await solicitudesService.downloadPdf(solicitudId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Error abriendo PDF del formulario:", err);
      setActionErrorMessage("No se pudo generar el PDF del formulario. Intenta de nuevo.");
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
      const plantillaActiva = tipos.find((t) => t.origen === "CARTA_APROBACION" && t.estado);

      if (!plantillaActiva || !plantillaActiva.plantillaContenido) {
        setActionErrorMessage("No hay plantilla de carta activa");
        return;
      }

      // Si la plantilla activa usa placeholders {{pregunta|...}} (ver
      // GenerarPlantillaModal.tsx), hay que resolverlos con las respuestas
      // reales del formulario de esta solicitud — igual que hace la vista
      // previa de Parametrización → Documentos, o quedan como ancla rota y
      // generarPlantillaDocumentoPdf tira error.
      let respuestasPregunta: Record<string, string> | undefined;
      if (/\{\{pregunta\|/.test(plantillaActiva.plantillaContenido)) {
        const renderizable = await solicitudesService.getFormularioRenderizable(solicitudId);
        respuestasPregunta = construirMapaRespuestasPregunta(renderizable.preguntas);
      }

      // Variables con tabla/columna de origen configuradas en
      // Parametrización → Variables de Plantilla se resuelven solas (ver
      // resolverParaSolicitud) — se mezclan sobre los reemplazos manuales
      // de abajo, que quedan como respaldo si el catálogo no tiene mapeo
      // para alguna (ej. si se desconfigura por error).
      let reemplazosDinamicos: Record<string, string> = {};
      try {
        reemplazosDinamicos = await variablesPlantillaService.resolverParaSolicitud(solicitud.sol_id);
      } catch (err) {
        console.error("Error resolviendo variables con mapeo automático:", err);
      }

      // Mismo motor pdf-lib (generarPlantillaDocumentoPdf -> generarCartaPdf,
      // carta-pdf.util.ts) que usa el resto del sistema para plantillas, y su
      // réplica en el backend (common/utils/carta-pdf.util.ts) para el correo
      // real que se envía al aprobar CC2 — antes esta vista previa se armaba
      // a mano con html2pdf.js y quedaba con un formato distinto al de la
      // carta real. Ver "Documentos Cartonera/documentacion/mejoras/
      // unificacion-carta-vinculacion-tipos-documentos.md".
      await generarPlantillaDocumentoPdf({
        tdoNombre: plantillaActiva.nombre,
        tdoPlantillaContenido: plantillaActiva.plantillaContenido,
        clienteNombre: solicitud.cliente_nombre,
        numeroSolicitud: solicitud.sol_numero,
        respuestasPregunta,
        encabezadoTipo: plantillaActiva.encabezadoTipo,
        encabezadoImagenUrl: plantillaActiva.encabezadoImagenUrl,
        piePaginaTipo: plantillaActiva.piePaginaTipo,
        piePaginaTexto: plantillaActiva.piePaginaTexto,
        piePaginaImagenUrl: plantillaActiva.piePaginaImagenUrl,
        reemplazosExtra: {
          "{{cupo_aprobado}}": formatCurrency(solicitud.sol_cupo_aprobado),
          "{{forma_pago}}": solicitud.sol_forma_pago || "-",
          "{{plazo}}": solicitud.sol_plazo_pago ? `${solicitud.sol_plazo_pago} días` : "-",
          "{{fecha_aprobacion}}": formatDateLarga(solicitud.fecha_aprobacion),
          ...reemplazosDinamicos,
        },
        previsualizar: true,
      });
    } catch (err) {
      console.error("Error generando PDF:", err);
      setActionErrorMessage("Error al generar el PDF");
    } finally {
      setGenerandoPDF(false);
    }
  };

  useEffect(() => {
    if (!solicitudId) return;

    let cancelled = false;

    async function cargarSolicitud() {
      try {
        const data = await solicitudesService.getById(solicitudId);
        if (cancelled) return;
        setSolicitud(data);
      } catch (err) {
        if (cancelled) return;
        console.error("Error cargando solicitud:", err);
        setError("Error al cargar los datos de la solicitud");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    cargarSolicitud();
    return () => {
      cancelled = true;
    };
  }, [solicitudId]);

  // Comentario más reciente que dejó cada área en el historial de workflow.
  // `historial` viene ordenado ascendente por fecha (obtenerHistorial en el
  // backend: ORDER BY swh_fecha ASC) y un mismo etapaCodigo puede repetirse
  // más de una vez (ej. Comité de Crédito 2 aprueba, se rechaza, se vuelve a
  // decidir) — hay que quedarse con la ÚLTIMA entrada de esa etapa, no la
  // primera, para mostrar la decisión vigente y no una vieja. Se usa también
  // para decidir si esa área ya fue alcanzada (sin comentario, la tarjeta de
  // esa área no se muestra).
  const entradaPorEtapa = (codigo: string) => {
    const entradas = historial.filter((h) => h?.etapaCodigo === codigo);
    return entradas.length > 0 ? entradas[entradas.length - 1] : undefined;
  };
  const entradaASC = entradaPorEtapa("ASC");
  const entradaOFC = entradaPorEtapa("OFC");
  const entradaCC1 = entradaPorEtapa("CC1");
  const entradaCC2 = entradaPorEtapa("CC2");
  const comentarioASC = entradaASC?.comentario;
  const comentarioOFC = entradaOFC?.comentario;
  const comentarioCC1 = entradaCC1?.comentario;
  const comentarioCC2 = entradaCC2?.comentario;

  const slaCalendarDate = (value: string | Date, dateOnly = false) => {
    const raw = value instanceof Date ? value.toISOString() : value;
    if (dateOnly && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  // Helper para obtener SLA de un área (incremental: vs área anterior)
  const slaArea = (areaCodigo: string) => {
    if (!solicitud) return undefined;
    const orden = ["EJN", "ASC", "OFC", "CC1", "CC2"] as const;
    const mapa: Record<string, { estimada: string | null | undefined; real: string | null | undefined }> = {
      EJN: { estimada: solicitud.sol_fecha_est_gest_ejn, real: solicitud.sol_fecha_gest_ejn },
      ASC: { estimada: solicitud.sol_fecha_est_gest_asc, real: solicitud.sol_fecha_gest_asc },
      OFC: {
        estimada: solicitud.sol_fecha_est_gest_oc,
        real: solicitud.sol_fecha_gest_oc,
      },
      CC1: { estimada: solicitud.sol_fecha_est_gest_cc1, real: solicitud.sol_fecha_gest_cc1 },
      CC2: { estimada: solicitud.sol_fecha_est_gest_cc2, real: solicitud.sol_fecha_gest_cc2 },
    };
    const idx = orden.indexOf(areaCodigo as (typeof orden)[number]);
    if (idx < 0) return undefined;
    const d = mapa[areaCodigo];
    if (!d?.estimada) return undefined;
    // Base = fecha estimada del área anterior (o fecha de envío si es la primera)
    const anterior = idx > 0 ? mapa[orden[idx - 1]] : null;
    const baseEstimada = anterior?.estimada
      ? new Date(anterior.estimada)
      : solicitud.sol_fecha_envio
        ? new Date(solicitud.sol_fecha_envio)
        : null;
    const baseReal = anterior?.real
      ? new Date(anterior.real)
      : solicitud.sol_fecha_envio
        ? new Date(solicitud.sol_fecha_envio)
        : null;
    if (!baseEstimada) return undefined;
    const est = new Date(d.estimada);
    const real = d.real ? new Date(d.real) : null;
    const diasMeta = Math.max(0, Math.ceil((est.getTime() - baseEstimada.getTime()) / 86400000));
    const procesada = !!real;
    const realCalendarDate = real ? slaCalendarDate(real) : null;
    const estimatedCalendarDate = slaCalendarDate(est, true);
    const vencida =
      procesada &&
      !!baseReal &&
      !!realCalendarDate &&
      !!estimatedCalendarDate &&
      realCalendarDate > estimatedCalendarDate;
    const diasReales =
      procesada && baseReal ? Math.max(0, Math.ceil((real!.getTime() - baseReal.getTime()) / 86400000)) : null;
    return { dias_meta: diasMeta, dias_reales: diasReales, procesada, vencida };
  };

  // SLA global: total desde envío hasta la última área
  const slaGlobal = (() => {
    if (!solicitud) return null;
    const ultimaEst = solicitud.sol_fecha_est_gest_cc2;
    const ultimaReal = solicitud.sol_fecha_gest_cc2;
    const envio = solicitud.sol_fecha_envio;
    if (!envio || !ultimaEst) return null;
    const envioDate = new Date(envio);
    const estDate = new Date(ultimaEst);
    const realDate = ultimaReal ? new Date(ultimaReal) : null;
    const diasMeta = Math.max(0, Math.ceil((estDate.getTime() - envioDate.getTime()) / 86400000));
    const procesada = !!realDate;
    const realCalendarDate = realDate ? slaCalendarDate(realDate) : null;
    const estimatedCalendarDate = slaCalendarDate(estDate, true);
    const vencida =
      procesada && !!realCalendarDate && !!estimatedCalendarDate && realCalendarDate > estimatedCalendarDate;
    const diasReales = procesada
      ? Math.max(0, Math.ceil((realDate!.getTime() - envioDate.getTime()) / 86400000))
      : null;
    return { dias_meta: diasMeta, dias_reales: diasReales, procesada, vencida };
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to font-sans text-[#0f172a] p-3 sm:p-4 lg:p-8">
      <div className="max-w-[1240px] mx-auto">
        <div className="bg-white border border-[#e9ecf2] rounded-[22px] overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)]">
          {/* Header */}
          <div className="bg-brand-gradient px-4 sm:px-7 py-[18px] sm:py-[22px] flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="w-[34px] h-[34px] rounded-[10px] bg-white/[0.14] hover:bg-white/[0.26] flex items-center justify-center text-white flex-shrink-0 transition-colors">
              <ArrowLeft size={15} strokeWidth={2.3} />
            </button>
            <div className="w-[42px] h-[42px] rounded-xl bg-white/[0.16] flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[19px] font-extrabold text-white tracking-[-0.01em] m-0">Detalle de Solicitud</h1>
              {solicitud && (
                <p className="text-[12.5px] text-[#c3d5f5] mt-[3px] m-0 truncate">
                  Solicitud <span className="font-bold text-white">{solicitud.sol_numero}</span>
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
              <SolicitudInfoBlock
                solicitud={solicitud}
                slaGlobal={slaGlobal}
                containerClassName="px-4 sm:px-6 py-4 sm:py-5 border-b border-[#eef1f6]"
                onOpenPdf={abrirPdfFormulario}
                pdfLoading={descargandoPdfFormulario}
              />

              {/* Cuerpo: Gestión por Área */}
              <div className="px-4 sm:px-6 py-4 sm:py-5">
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
                    <h2 className="text-[14px] font-extrabold text-[#0f172a] mb-4 flex items-center gap-[9px] tracking-[-0.01em]">
                      <div className="w-[32px] h-[32px] rounded-[10px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Clock size={16} strokeWidth={2.2} className="text-brand-600" />
                      </div>
                      Gestión por Área
                    </h2>
                    <div className="flex flex-col gap-3">
                      {(solicitud.sol_observacion_ejn ||
                        solicitud.sol_consumo_mensual_proyectado ||
                        solicitud.sol_toneladas_proyectadas) && (
                        <GestionAreaCard
                          icon={Briefcase}
                          titulo="Ejecutivo de Negocios"
                          usuario={solicitud.ejecutivo_nombre}
                          fecha={solicitud.sol_fecha_gest_ejn}
                          sla={<SlaBadge area={slaArea("EJN")} />}>
                          <div className="flex flex-wrap items-center justify-center gap-3">
                            <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3.5 py-2 border border-emerald-200">
                              <DollarSign size={14} strokeWidth={2.5} className="text-emerald-600 flex-shrink-0" />
                              <div>
                                <p className="text-[9px] text-emerald-700 uppercase tracking-wider font-semibold m-0">
                                  Consumo Mensual
                                </p>
                                <p className="text-[13px] font-extrabold text-emerald-800 m-0 leading-tight">
                                  {formatCurrency(solicitud.sol_consumo_mensual_proyectado)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-[#f1f5f9] rounded-xl px-3.5 py-2 border border-[#e2e8f0]">
                              <div>
                                <p className="text-[9px] text-[#64748b] uppercase tracking-wider font-semibold m-0">
                                  Toneladas
                                </p>
                                <p className="text-[13px] font-extrabold text-[#0f172a] m-0 leading-tight">
                                  {solicitud.sol_toneladas_proyectadas
                                    ? `${solicitud.sol_toneladas_proyectadas.toLocaleString("es-CO")} Ton`
                                    : "-"}
                                </p>
                              </div>
                            </div>
                          </div>
                          {solicitud.sol_observacion_ejn && (
                            <p className="text-[11.5px] text-[#475569] m-0 whitespace-pre-wrap text-center leading-relaxed">
                              {solicitud.sol_observacion_ejn}
                            </p>
                          )}
                        </GestionAreaCard>
                      )}

                      {comentarioASC && (
                        <GestionAreaCard
                          icon={Headphones}
                          titulo="Auxiliar Servicio al Cliente"
                          usuario={entradaASC?.usuarioNombre}
                          fecha={entradaASC?.fecha}
                          sla={<SlaBadge area={slaArea("ASC")} />}>
                          <DecisionDisplay texto={comentarioASC} />
                        </GestionAreaCard>
                      )}

                      {comentarioOFC && (
                        <GestionAreaCard
                          icon={ShieldCheck}
                          titulo="Oficial de Cumplimiento"
                          usuario={entradaOFC?.usuarioNombre}
                          fecha={entradaOFC?.fecha}
                          sla={<SlaBadge area={slaArea("OFC")} />}>
                          <DecisionDisplay texto={comentarioOFC} />
                          <SoportesAnalisis
                            solicitudId={solicitud.sol_id}
                            wetId={WORKFLOW_ETAPA.OFC.id}
                            titulo="Soportes de Oficial de Cumplimiento"
                            readOnly
                          />
                          <button
                            onClick={() => setMostrarTablasCumplimiento(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-md hover:bg-brand-100 transition-colors">
                            <Table className="h-3 w-3" />
                            Ver tablas de cumplimiento
                          </button>
                        </GestionAreaCard>
                      )}

                      {comentarioCC1 && (
                        <GestionAreaCard
                          icon={Users}
                          titulo="Comité de Crédito 1"
                          usuario={entradaCC1?.usuarioNombre}
                          fecha={entradaCC1?.fecha}
                          sla={<SlaBadge area={slaArea("CC1")} />}>
                          <DecisionDisplay texto={comentarioCC1} />
                          <SoportesAnalisis
                            solicitudId={solicitud.sol_id}
                            wetId={WORKFLOW_ETAPA.CC1.id}
                            titulo="Soportes de Comité de Crédito 1"
                            readOnly
                          />
                        </GestionAreaCard>
                      )}

                      {comentarioCC2 && (
                        <GestionAreaCard
                          icon={Award}
                          titulo="Comité de Crédito 2"
                          usuario={entradaCC2?.usuarioNombre}
                          fecha={entradaCC2?.fecha}
                          span2={!!solicitud.sol_cupo_aprobado}
                          sla={<SlaBadge area={slaArea("CC2")} />}>
                          <DecisionDisplay texto={comentarioCC2} />

                          {/* Condiciones Financieras Aprobadas */}
                          {solicitud.sol_cupo_aprobado && (
                            <div className="rounded-lg p-3.5 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 w-full">
                              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                <p className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-emerald-800 m-0">
                                  Condiciones Financieras Aprobadas
                                </p>
                                <button
                                  onClick={abrirCartaPDF}
                                  disabled={generandoPDF}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10.5px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-all hover:shadow disabled:opacity-50 disabled:cursor-not-allowed">
                                  <FileText className="h-3 w-3" />
                                  {generandoPDF ? "Generando..." : "Carta PDF"}
                                </button>
                              </div>

                              {/* Cupo aprobado - protagonista */}
                              <div className="flex items-center justify-center gap-2.5 bg-white rounded-xl px-4 py-3 border border-emerald-200 mb-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                  <DollarSign size={18} strokeWidth={2.5} className="text-emerald-600" />
                                </div>
                                <div className="text-center">
                                  <p className="text-[9px] text-emerald-700 uppercase tracking-wider font-semibold m-0">
                                    Cupo Aprobado
                                  </p>
                                  <p className="text-[18px] font-extrabold text-emerald-700 m-0 leading-tight">
                                    {formatCurrency(solicitud.sol_cupo_aprobado)}
                                  </p>
                                </div>
                              </div>

                              {/* Plazo y forma de pago */}
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                <div className="flex items-center gap-1.5 bg-white/80 rounded-full px-3 py-1 border border-emerald-200">
                                  <span className="text-[9.5px] text-[#94a3b8] uppercase tracking-wider font-semibold">
                                    Plazo
                                  </span>
                                  <span className="text-[11px] font-extrabold text-emerald-700">
                                    {solicitud.sol_plazo_pago ? `${solicitud.sol_plazo_pago} días` : "-"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white/80 rounded-full px-3 py-1 border border-emerald-200">
                                  <span className="text-[9.5px] text-[#94a3b8] uppercase tracking-wider font-semibold">
                                    Forma de Pago
                                  </span>
                                  <span className="text-[11px] font-extrabold text-emerald-700">
                                    {solicitud.sol_forma_pago || "-"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </GestionAreaCard>
                      )}
                    </div>
                  </div>
                )}

                {/* Documentos y respuestas por etapa */}
                <div className="rounded-2xl p-5 border border-[#e2e8f0] bg-white mt-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                  <DocumentosCargadosSolicitud solicitudId={solicitud.sol_id} />
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-[#eef1f6] flex justify-end">
                <button
                  onClick={() => router.back()}
                  className="px-5 py-2.5 text-[13px] font-bold text-[#374151] bg-white border border-[#e5e7eb] rounded-xl hover:bg-gray-50 transition-colors">
                  Cerrar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ErrorModal
        isOpen={!!actionErrorMessage}
        message={actionErrorMessage || ""}
        onAction={() => setActionErrorMessage(null)}
      />

      {mostrarTablasCumplimiento && solicitud && (
        <TablasCumplimientoModal solicitudId={solicitud.sol_id} onClose={() => setMostrarTablasCumplimiento(false)} />
      )}

    </div>
  );
}
