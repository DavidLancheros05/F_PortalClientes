"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FileText,
  DollarSign,
  Clock,
  Info,
  Briefcase,
  Headphones,
  ShieldCheck,
  Users,
  Award,
} from "lucide-react";
import { PdfIcon } from "@/components/icons/FileIcons";
import { solicitudesService } from "@/services/solicitudes.service";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { variablesPlantillaService } from "@/services/admin/parametrizacion/variables-plantilla.service";
import { ESTADOS } from "@/lib/workflow-labels";
import { formatDate } from "@/lib/date-utils";
import {
  generarPlantillaDocumentoPdf,
  construirMapaRespuestasPregunta,
} from "@/lib/carta-pdf.util";
import { DocumentosCargadosSolicitud } from "@/components/DocumentosCargadosSolicitud";
import { SoportesAnalisis } from "@/components/SoportesAnalisis";
import HistorialSolicitud from "@/components/historial/HistorialSolicitud";
import { useHistorialWorkflow } from "@/hooks/useHistorialWorkflow";
import { useSolicitudCupoSolicitado } from "@/hooks/useSolicitudCupoSolicitado";
import { AmpliacionCupoResumen } from "@/components/solicitudes/AmpliacionCupoResumen";
import { ESTADO_TOKENS } from "@/constants/estado-tokens";
import { WORKFLOW_ETAPA } from "@/constants/workflow-etapas";
import { ErrorModal } from "@/components/modals";

interface SolicitudDetalle {
  sol_id: number;
  sol_numero_solicitud: string;
  cliente_nombre: string;
  cliente_nit?: string;
  ejecutivo_nombre?: string;
  sol_fecha_real_ejecutivo?: string | null;
  usuario_registro?: string;
  usuario_revision?: string;
  centro_operacion_nombre?: string;
  etapa_nombre?: string;
  resultado_nombre?: string;
  sol_fecha_creacion: string;
  sol_fecha_envio?: string | null;
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

// "Usuario · fecha hora" en gris, para el encabezado de cada tarjeta de
// "Gestión por Área" — quién hizo la gestión y cuándo, mismo tratamiento
// que ya usan las páginas de gestión (ASC/OFC/CC1/CC2) en "Concepto del
// ejecutivo de negocios".
function GestorInfo({
  usuario,
  fecha,
  className = "mb-2",
}: {
  usuario?: string | null;
  fecha?: string | null;
  className?: string;
}) {
  if (!usuario && !fecha) return null;
  const fechaObj = fecha ? new Date(fecha) : null;
  const fechaValida = fechaObj && !Number.isNaN(fechaObj.getTime());
  return (
    <p className={`text-[11px] text-[#94a3b8] m-0 whitespace-nowrap ${className}`}>
      {usuario || "-"}
      {fechaValida && (
        <>
          {` · ${formatDate(fecha)}`}
          <span className="text-[10px] text-[#cbd5e1]">
            {` ${fechaObj!.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}`}
          </span>
        </>
      )}
    </p>
  );
}

// Tarjeta de "Gestión por Área": encabezado con ícono + nombre del área a
// la izquierda y quién/cuándo a la derecha, cuerpo con el contenido propio
// de cada etapa. `span2` la hace ocupar las dos columnas del grid en
// pantallas grandes (se usa en Comité de Crédito 2, que suele traer además
// las condiciones financieras aprobadas).
function AreaCard({
  icon: Icon,
  titulo,
  usuario,
  fecha,
  span2 = false,
  children,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  titulo: string;
  usuario?: string | null;
  fecha?: string | null;
  span2?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#eef1f6] bg-[#fafbfd] overflow-hidden flex flex-col ${
        span2 ? "lg:col-span-2" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#eef1f6] bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
            <Icon size={14} strokeWidth={2.2} className="text-brand-600" />
          </div>
          <p className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-[#1d4ed8] m-0 truncate">
            {titulo}
          </p>
        </div>
        <GestorInfo usuario={usuario} fecha={fecha} className="mb-0 flex-shrink-0" />
      </div>
      <div className="p-4 flex-1 flex flex-col gap-3">{children}</div>
    </div>
  );
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
      const plantillaActiva = tipos.find(
        (t) => t.origen === "CARTA_APROBACION" && t.estado,
      );

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
        const renderizable = await solicitudesService.getFormularioRenderizable(
          solicitudId,
        );
        respuestasPregunta = construirMapaRespuestasPregunta(
          renderizable.preguntas,
        );
      }

      // Variables con tabla/columna de origen configuradas en
      // Parametrización → Variables de Plantilla se resuelven solas (ver
      // resolverParaSolicitud) — se mezclan sobre los reemplazos manuales
      // de abajo, que quedan como respaldo si el catálogo no tiene mapeo
      // para alguna (ej. si se desconfigura por error).
      let reemplazosDinamicos: Record<string, string> = {};
      try {
        reemplazosDinamicos = await variablesPlantillaService.resolverParaSolicitud(
          solicitud.sol_id,
        );
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
        numeroSolicitud: solicitud.sol_numero_solicitud,
        respuestasPregunta,
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

  const estadoTokens = ESTADO_TOKENS[solicitud?.sol_estado_id ?? 1] || ESTADO_TOKENS[1];

  // Comentario más reciente que dejó cada área en el historial de workflow.
  // `historial` viene ordenado ascendente por fecha (obtenerHistorial en el
  // backend: ORDER BY swh_fecha ASC) y un mismo etapaCodigo puede repetirse
  // más de una vez (ej. Comité de Crédito 2 aprueba, se rechaza, se vuelve a
  // decidir) — hay que quedarse con la ÚLTIMA entrada de esa etapa, no la
  // primera, para mostrar la decisión vigente y no una vieja. Se usa también
  // para decidir si esa área ya fue alcanzada (sin comentario, la tarjeta de
  // esa área no se muestra).
  const entradaPorEtapa = (codigo: string) => {
    const entradas = historial.filter((h) => h.etapaCodigo === codigo);
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
                <div className="rounded-2xl p-4 border border-[#eef1f6] bg-[#fafbfd] mb-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <h2 className="text-[13.5px] font-extrabold text-[#0f172a] flex items-center gap-[9px] tracking-[-0.01em] m-0">
                      <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
                        <Info size={15} strokeWidth={2.2} className="text-brand-600" />
                      </div>
                      Información de la Solicitud
                    </h2>
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
                        <PdfIcon />
                        {descargandoPdfFormulario ? "Generando..." : "Ver PDF Formulario"}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3">
                    <div className="sm:pr-6">
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
                    <div className="sm:px-6 sm:border-l sm:border-[#eef1f6]">
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
                    <div className="sm:pl-6 sm:border-l sm:border-[#eef1f6]">
                      <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-1">
                        Fecha de Envío
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-bold text-[#0f172a] m-0">
                          {formatDate(solicitud.sol_fecha_envio)}
                        </p>
                        {(() => {
                          const fecha = solicitud.sol_fecha_envio
                            ? new Date(solicitud.sol_fecha_envio)
                            : null;
                          if (!fecha || Number.isNaN(fecha.getTime())) return null;
                          return (
                            <p className="text-xs text-[#94a3b8] m-0">
                              {fecha.toLocaleTimeString("es-CO", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#eef1f6] my-3" />

                  <div
                    className={`grid grid-cols-1 divide-y divide-[#eef1f6] md:divide-y-0 md:divide-x md:divide-[#eef1f6] ${
                      solicitud.sol_cupo_solicitado ? "" : "md:grid-cols-2"
                    }`}
                  >
                    {/* Datos del Cliente */}
                    <div className="pb-3 md:pb-0 md:pr-6">
                      <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-2 flex items-center gap-1.5">
                        <Building2 size={13} strokeWidth={2.2} className="text-brand-500" />
                        Datos del Cliente
                      </p>
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
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
                      </div>
                    </div>

                    {/* Solicita Cupo */}
                    {!solicitud.sol_cupo_solicitado && (
                      <div className="pt-3 md:pt-0 md:pl-6">
                        <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#94a3b8] mb-2 flex items-center gap-1.5">
                          <DollarSign size={13} strokeWidth={2.2} className="text-brand-500" />
                          Solicita Cupo
                        </p>
                        <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                          {solicitaCredito
                            ? `Sí — ${montoSolicitadoTexto || "monto no especificado"}${formaPagoSolicitada ? ` · ${formaPagoSolicitada}` : ""}`
                            : "No"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {solicitud.sol_cupo_solicitado && (
                  <div className="mt-4">
                    <AmpliacionCupoResumen
                      cupoActualReferencia={solicitud.sol_cupo_actual_referencia}
                      cupoSolicitado={solicitud.sol_cupo_solicitado}
                      justificacion={solicitud.sol_justificacion_ampliacion}
                      consumoMensualProyectado={solicitud.sol_consumo_mensual_proyectado}
                      toneladasProyectadas={solicitud.sol_toneladas_proyectadas}
                    />
                  </div>
                )}
              </div>

              {/* Cuerpo: Gestión por Área */}
              <div className="p-7">
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
                    <h2 className="text-[13.5px] font-extrabold text-[#0f172a] mb-3 flex items-center gap-[9px] tracking-[-0.01em]">
                      <div className="w-[30px] h-[30px] rounded-[9px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0">
                        <Clock size={15} strokeWidth={2.2} className="text-brand-600" />
                      </div>
                      Gestión por Área
                    </h2>
                    <div className="grid grid-cols-1 gap-3">
                      {(solicitud.sol_observacion_ejn ||
                        solicitud.sol_consumo_mensual_proyectado ||
                        solicitud.sol_toneladas_proyectadas) && (
                        <AreaCard
                          icon={Briefcase}
                          titulo="Ejecutivo de Negocios"
                          usuario={solicitud.ejecutivo_nombre}
                          fecha={solicitud.sol_fecha_real_ejecutivo}
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white rounded-lg p-2.5 border border-[#eef1f6]">
                              <p className="text-[10.5px] text-[#94a3b8] uppercase mb-0.5">Consumo Mensual</p>
                              <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                                {formatCurrency(solicitud.sol_consumo_mensual_proyectado)}
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-2.5 border border-[#eef1f6]">
                              <p className="text-[10.5px] text-[#94a3b8] uppercase mb-0.5">Toneladas</p>
                              <p className="text-[13.5px] font-bold text-[#0f172a] m-0">
                                {solicitud.sol_toneladas_proyectadas
                                  ? `${solicitud.sol_toneladas_proyectadas.toLocaleString("es-CO")} Ton`
                                  : "-"}
                              </p>
                            </div>
                          </div>
                          {solicitud.sol_observacion_ejn && (
                            <p className="text-[12.5px] text-[#334155] m-0 whitespace-pre-wrap">
                              {solicitud.sol_observacion_ejn}
                            </p>
                          )}
                        </AreaCard>
                      )}

                      {comentarioASC && (
                        <AreaCard
                          icon={Headphones}
                          titulo="Auxiliar Servicio al Cliente"
                          usuario={entradaASC?.usuarioNombre}
                          fecha={entradaASC?.fecha}
                        >
                          <p className="text-[12.5px] text-[#334155] m-0 whitespace-pre-wrap">
                            {comentarioASC}
                          </p>
                        </AreaCard>
                      )}

                      {comentarioOFC && (
                        <AreaCard
                          icon={ShieldCheck}
                          titulo="Oficial de Cumplimiento"
                          usuario={entradaOFC?.usuarioNombre}
                          fecha={entradaOFC?.fecha}
                        >
                          <p className="text-[12.5px] text-[#334155] m-0 whitespace-pre-wrap">
                            {comentarioOFC}
                          </p>
                          <SoportesAnalisis
                            solicitudId={solicitud.sol_id}
                            wetId={WORKFLOW_ETAPA.OFC.id}
                            titulo="Soportes de Oficial de Cumplimiento"
                            readOnly
                          />
                        </AreaCard>
                      )}

                      {comentarioCC1 && (
                        <AreaCard
                          icon={Users}
                          titulo="Comité de Crédito 1"
                          usuario={entradaCC1?.usuarioNombre}
                          fecha={entradaCC1?.fecha}
                        >
                          <p className="text-[12.5px] text-[#334155] m-0 whitespace-pre-wrap">
                            {comentarioCC1}
                          </p>
                          <SoportesAnalisis
                            solicitudId={solicitud.sol_id}
                            wetId={WORKFLOW_ETAPA.CC1.id}
                            titulo="Soportes de Comité de Crédito 1"
                            readOnly
                          />
                        </AreaCard>
                      )}

                      {comentarioCC2 && (
                        <AreaCard
                          icon={Award}
                          titulo="Comité de Crédito 2"
                          usuario={entradaCC2?.usuarioNombre}
                          fecha={entradaCC2?.fecha}
                          span2={!!solicitud.sol_cupo_aprobado}
                        >
                          <p className="text-[12.5px] text-[#334155] m-0 whitespace-pre-wrap">
                            {comentarioCC2}
                          </p>

                          {/* Condiciones Financieras Aprobadas */}
                          {solicitud.sol_cupo_aprobado && (
                            <div className="rounded-lg p-3 border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
                              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-emerald-800 m-0">
                                  Condiciones Financieras Aprobadas
                                </p>
                                <button
                                  onClick={abrirCartaPDF}
                                  disabled={generandoPDF}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11.5px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  {generandoPDF ? "Generando..." : "Ver Carta PDF"}
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="bg-white rounded-lg p-2.5 border border-emerald-200">
                                  <p className="text-[10.5px] text-[#94a3b8] uppercase mb-0.5">Cupo Aprobado</p>
                                  <p className="text-[15px] font-extrabold text-emerald-700 m-0">
                                    {formatCurrency(solicitud.sol_cupo_aprobado)}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-2.5 border border-emerald-200">
                                  <p className="text-[10.5px] text-[#94a3b8] uppercase mb-0.5">Plazo de Pago</p>
                                  <p className="text-[15px] font-extrabold text-emerald-700 m-0">
                                    {solicitud.sol_plazo_pago ? `${solicitud.sol_plazo_pago} días` : "-"}
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-2.5 border border-emerald-200">
                                  <p className="text-[10.5px] text-[#94a3b8] uppercase mb-0.5">Forma de Pago</p>
                                  <p className="text-[13.5px] font-extrabold text-emerald-700 m-0">
                                    {solicitud.sol_forma_pago || "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </AreaCard>
                      )}
                    </div>
                  </div>
                )}

                {/* Documentos y respuestas por etapa */}
                <div className="rounded-2xl p-5 border border-[#eef1f6] bg-[#fafbfd] mt-4">
                  <DocumentosCargadosSolicitud solicitudId={solicitud.sol_id} />
                </div>

                <div className="mt-4">
                  <HistorialSolicitud historial={historial} />
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

      <ErrorModal
        isOpen={!!actionErrorMessage}
        message={actionErrorMessage || ""}
        onAction={() => setActionErrorMessage(null)}
      />
    </div>
  );
}
