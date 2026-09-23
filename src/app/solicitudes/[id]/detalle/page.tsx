"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { solicitudesService } from "@/services/solicitudes.service";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { variablesPlantillaService } from "@/services/admin/parametrizacion/variables-plantilla.service";
import { generarPlantillaDocumentoPdf, construirMapaRespuestasPregunta } from "@/lib/carta-pdf.util";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import { TablasCumplimientoModal } from "@/components/TablasCumplimientoModal";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { SolicitudInfoBlock } from "@/components/solicitudes/SolicitudInfoBlock";
import { EtapasPreviasBlock } from "@/components/solicitudes/EtapasPreviasBlock";
import { ErrorModal } from "@/components/modals";

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

  const slaMapaCompleto = {
    EJN: slaArea("EJN"),
    ASC: slaArea("ASC"),
    OFC: slaArea("OFC"),
    CC1: slaArea("CC1"),
    CC2: slaArea("CC2"),
  };

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

              {/* Gestión por Área — se omite etapaActual para que
                  EtapasPreviasBlock muestre TODAS las etapas alcanzadas,
                  incluida la última (CC2), a diferencia de las páginas de
                  gestión que solo muestran las etapas ANTERIORES a la que
                  se está gestionando. */}
              <EtapasPreviasBlock
                solicitud={solicitud}
                historial={historial}
                slaMapa={slaMapaCompleto}
                onOpenTablasCumplimiento={() => setMostrarTablasCumplimiento(true)}
                onGenerarCartaPDF={abrirCartaPDF}
                generandoPDF={generandoPDF}
              />

              {/* Documentos y respuestas por etapa */}
              <div className="px-4 sm:px-6 py-4 sm:py-5">
                <div className="rounded-2xl p-5 border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
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
