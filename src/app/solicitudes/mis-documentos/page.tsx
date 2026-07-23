"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Upload, Trash2, Download } from "lucide-react";
import {
  misDocumentosService,
  type MiDocumento,
  type MisDocumentosResponse,
  type DocumentoDiferido,
} from "@/services/mis-documentos.service";
import { formularioRespuestasService } from "@/services/formulario-respuestas.service";
import {
  calcularVigenciaDocumento,
  calcularEstadoAnioDocumento,
  getArchivoPreviewUrl,
} from "@/lib/documentos-vigencia.util";
import {
  generarPlantillaDocumentoPdf,
  construirMapaRespuestasPregunta,
} from "@/lib/carta-pdf.util";
import { solicitudesService } from "@/services/solicitudes.service";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { ConfirmModal, LoadingModal, SuccessModal } from "@/components/modals";

async function abrirPdfSolicitud(solicitudId: number) {
  const blob = await solicitudesService.downloadPdf(solicitudId);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const fecha = typeof value === "string" ? value.split("T")[0] : value;
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-CO");
}

function requiereFecha(doc: MiDocumento) {
  return doc.tdo_vigencia_dias != null || doc.tdo_regla_vigencia === "ANIO";
}

function getEstadoVigencia(doc: MiDocumento) {
  const fecha = doc.sd_fecha_emision
    ? doc.sd_fecha_emision.split("T")[0]
    : undefined;

  if (doc.tdo_regla_vigencia === "ANIO") {
    const estado = calcularEstadoAnioDocumento(
      fecha,
      doc.tdo_anios_atras_permitidos,
    );
    if (!estado)
      return {
        estado: "Sin fecha",
        className: "bg-slate-100 text-slate-600",
        vencido: false,
        detalle: "-",
      };
    if (!estado.valido) {
      return {
        estado: "Vencido",
        className: "bg-red-100 text-red-800",
        vencido: true,
        detalle: `Año ${estado.anioDocumento} (fuera de rango permitido)`,
      };
    }

    const { mesesRestantes = 0, diasRestantes = 0 } = estado;
    const partes: string[] = [];
    if (mesesRestantes > 0) {
      partes.push(`${mesesRestantes} mes${mesesRestantes === 1 ? "" : "es"}`);
    }
    if (diasRestantes > 0 || partes.length === 0) {
      partes.push(`${diasRestantes} día${diasRestantes === 1 ? "" : "s"}`);
    }

    return {
      estado: "Vigente",
      className: "bg-emerald-100 text-emerald-800",
      vencido: false,
      detalle: `Año ${estado.anioDocumento} · faltan ${partes.join(" y ")}`,
    };
  }

  if (doc.tdo_vigencia_dias != null) {
    const resumen = calcularVigenciaDocumento(fecha, doc.tdo_vigencia_dias);
    if (!resumen)
      return {
        estado: "Sin fecha",
        className: "bg-slate-100 text-slate-600",
        vencido: false,
        detalle: "-",
      };
    return resumen.diasRestantes >= 0
      ? {
          estado: "Vigente",
          className: "bg-emerald-100 text-emerald-800",
          vencido: false,
          detalle: `Faltan ${resumen.diasRestantes} día${resumen.diasRestantes === 1 ? "" : "s"}`,
        }
      : {
          estado: "Vencido",
          className: "bg-red-100 text-red-800",
          vencido: true,
          detalle: `Vencido hace ${Math.abs(resumen.diasRestantes)} día${Math.abs(resumen.diasRestantes) === 1 ? "" : "s"}`,
        };
  }

  return {
    estado: "Sin vigencia",
    className: "bg-slate-100 text-slate-600",
    vencido: false,
    detalle: "-",
  };
}

function esDocumentoEditable(
  doc: MiDocumento,
  puedeCorregir: boolean,
  rechazadoPorAuxiliar: boolean,
  vencido: boolean,
) {
  if (!puedeCorregir) return false;
  if (!rechazadoPorAuxiliar) return true;
  return doc.sd_requiere_cambio || vencido;
}

export default function MisDocumentosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Presente solo cuando entra personal interno (no CLIENTE) a corregir
  // documentos en nombre de un cliente — ver corregir-formulario-asc y
  // documentacion/Funcionalidades/modo-solucion-rechazo-asc.md.
  const solicitudIdParam = searchParams.get("solicitudId");
  const modoStaff = Boolean(solicitudIdParam);
  const [loading, setLoading] = useState(true);
  const [solicitud, setSolicitud] =
    useState<MisDocumentosResponse["solicitud"]>(null);
  const [documentos, setDocumentos] = useState<MiDocumento[]>([]);
  const [puedeCorregir, setPuedeCorregir] = useState(false);
  const [rechazadoPorAuxiliar, setRechazadoPorAuxiliar] = useState(false);
  const [documentosDiferidos, setDocumentosDiferidos] =
    useState<DocumentoDiferido[]>([]);
  const [representanteLegal, setRepresentanteLegal] = useState<{
    nombre: string;
    identificacion: string;
  } | null>(null);
  const [uploadingDiferidoFpId, setUploadingDiferidoFpId] = useState<
    number | null
  >(null);
  const [generandoPlantillaId, setGenerandoPlantillaId] = useState<
    number | null
  >(null);
  const [enviandoDiferidos, setEnviandoDiferidos] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState<MiDocumento | null>(
    null,
  );
  // Las fechas de emisión se acumulan en edición y solo se guardan al
  // presionar "Actualizar e informar a Cartonera". Los archivos, en cambio,
  // se suben de inmediato al seleccionarlos (ver handleSeleccionarArchivo) —
  // por eso `huboSubidaSesion` marca que hubo al menos una subida desde la
  // última vez que se informó a Cartonera, para no desactivar el botón.
  const [pendingFechas, setPendingFechas] = useState<Record<number, string>>(
    {},
  );
  const [uploadingSaId, setUploadingSaId] = useState<number | null>(null);
  const [huboSubidaSesion, setHuboSubidaSesion] = useState(false);
  const huboCambios =
    Object.keys(pendingFechas).length > 0 || huboSubidaSesion;
  const [enviando, setEnviando] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [busquedaInput, setBusquedaInput] = useState("");
  const [busqueda, setBusqueda] = useState("");
  // Mientras el panel de "Documentos pendientes por generar y subir" siga
  // visible (documentosDiferidos no vacío — ver comentario en el backend,
  // solicitudes.controller.ts::getMisDocumentos: se muestra hasta que el
  // cliente pulsa "Enviar e informar a Cartonera", aunque ya estén todos
  // subidos), esos mismos documentos también aparecen como archivo real en
  // la tabla de abajo — se ven duplicados en pantalla. Se ocultan de la
  // tabla mientras el panel siga arriba; al enviar, documentosDiferidos
  // queda vacío y pasan a mostrarse solo ahí, sin duplicado.
  const fpIdsDiferidos = new Set(documentosDiferidos.map((d) => d.fp_id));
  const documentosSinDuplicarDiferidos =
    fpIdsDiferidos.size > 0
      ? documentos.filter((doc) => !fpIdsDiferidos.has(doc.fp_id))
      : documentos;
  const documentosFiltrados = busqueda.trim()
    ? documentosSinDuplicarDiferidos.filter((doc) => {
        const termino = busqueda.trim().toLowerCase();
        return (
          doc.tdo_nombre?.toLowerCase().includes(termino) ||
          doc.sa_nombre_original?.toLowerCase().includes(termino)
        );
      })
    : documentosSinDuplicarDiferidos;

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await misDocumentosService.getMisDocumentos(
        solicitudIdParam ? Number(solicitudIdParam) : undefined,
      );
      setSolicitud(data.solicitud);
      setDocumentos(data.documentos);
      setPuedeCorregir(data.puedeCorregir);
      setRechazadoPorAuxiliar(data.rechazadoPorAuxiliar);
      setDocumentosDiferidos(data.documentosDiferidos || []);
    } catch (error) {
      console.error("[MisDocumentosPage] Error cargando:", error);
      setErrorMessage("No se pudieron cargar tus documentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleSeleccionarArchivo = async (doc: MiDocumento, file: File) => {
    if (!solicitud) return;
    setUploadingSaId(doc.sa_id);
    try {
      await formularioRespuestasService.guardarArchivoRespuesta(
        solicitud.sol_id,
        doc.fp_id,
        file,
        pendingFechas[doc.sa_id] ??
          (doc.sd_fecha_emision
            ? doc.sd_fecha_emision.split("T")[0]
            : undefined),
      );
      setHuboSubidaSesion(true);
      await cargar();
    } catch (error) {
      console.error("[MisDocumentosPage] Error subiendo archivo:", error);
      setErrorMessage(
        `No se pudo subir el nuevo archivo de "${doc.tdo_nombre || doc.sa_nombre_original}".`,
      );
    } finally {
      setUploadingSaId(null);
    }
  };

  // El representante legal solo hace falta para las plantillas de tipo TEXTO
  // (para rellenar {{representante_legal_nombre}}, etc). Se pide bajo demanda
  // justo antes de generar una de esas plantillas, no en la carga inicial de
  // la página — requiere reconstruir el formulario completo en el backend,
  // que es la parte más lenta, y las de tipo PDF_SOLICITUD ni lo necesitan.
  const obtenerRepresentanteLegal = async (solicitudId: number) => {
    if (representanteLegal) return representanteLegal;
    try {
      const data = await misDocumentosService.getRepresentanteLegal(solicitudId);
      setRepresentanteLegal(data);
      return data;
    } catch (error) {
      console.error(
        "[MisDocumentosPage] Error obteniendo representante legal:",
        error,
      );
      return null;
    }
  };

  // Historial de revisiones ("CONTROL DE CAMBIOS") del tipo de documento,
  // ya formateado para el generador de PDF — mismo criterio que
  // DocumentoTablaField.tsx al diligenciar el formulario.
  const obtenerRevisionesPdf = async (tdoId: number | null | undefined) => {
    if (!tdoId) return [];
    try {
      const revs = await documentosService.getRevisiones(tdoId);
      return revs.map((r) => ({
        revision: r.revision,
        descripcionCambio: r.descripcionCambio,
        fecha: new Date(`${r.fecha}T00:00:00`).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      }));
    } catch (error) {
      console.error(
        "[MisDocumentosPage] Error cargando historial de revisiones:",
        error,
      );
      return [];
    }
  };

  const handleGenerarPlantillaDocumento = async (doc: MiDocumento) => {
    if (!solicitud) return;
    if (doc.tdo_tipo_plantilla !== "PDF_SOLICITUD" && !doc.tdo_plantilla_contenido) return;
    try {
      setGenerandoPlantillaId(doc.sa_id);
      if (doc.tdo_tipo_plantilla === "PDF_SOLICITUD") {
        await abrirPdfSolicitud(solicitud.sol_id);
      } else {
        const repLegal = await obtenerRepresentanteLegal(solicitud.sol_id);
        let respuestasPregunta: Record<string, string> | undefined;
        if (/\{\{pregunta\|/.test(doc.tdo_plantilla_contenido!)) {
          const renderizable = await solicitudesService.getFormularioRenderizable(
            solicitud.sol_id,
          );
          respuestasPregunta = construirMapaRespuestasPregunta(
            renderizable.preguntas,
          );
        }
        await generarPlantillaDocumentoPdf({
          tdoNombre: doc.tdo_nombre || doc.sa_nombre_original,
          tdoPlantillaContenido: doc.tdo_plantilla_contenido!,
          clienteNombre: solicitud.cliente_nombre,
          clienteNit: solicitud.cliente_nit,
          numeroSolicitud: solicitud.sol_numero_solicitud,
          representanteLegalNombre: repLegal?.nombre,
          representanteLegalCedula: repLegal?.identificacion,
          formatoCodigo: doc.tdo_formato_codigo,
          formatoCodigoSecundario: doc.tdo_formato_codigo_secundario,
          revision: doc.tdo_revision,
          paginasTotal: doc.tdo_paginas_total,
          respuestasPregunta,
          revisiones: await obtenerRevisionesPdf(doc.tdo_id),
        });
      }
    } catch (error) {
      console.error("[MisDocumentosPage] Error generando plantilla:", error);
      // generarPlantillaDocumentoPdf lanza un Error con detalle específico
      // cuando una variable de la plantilla ({{pregunta|...}}) no resuelve
      // (pregunta renombrada/eliminada) — mostrarlo tal cual en vez de un
      // genérico ayuda a diagnosticar sin tener que ver la consola.
      setErrorMessage(
        error instanceof Error
          ? error.message
          : `No se pudo generar la plantilla de "${doc.tdo_nombre}".`,
      );
    } finally {
      setGenerandoPlantillaId(null);
    }
  };

  // Guarda de inmediato, igual que la subida de archivo — antes esta fecha
  // solo se persistía dentro de handleActualizarEInformar, que únicamente
  // corre en el flujo de "rechazado por auxiliar, en corrección". Fuera de
  // ese flujo (el caso normal de esta página) el campo parecía editable
  // pero la fecha se perdía en silencio al recargar. pendingFechas queda
  // como respaldo/retry: si este PATCH llega a fallar, el botón "Actualizar
  // e informar a Cartonera" (cuando aplica) reintenta guardarla.
  const handleCambiarFecha = async (doc: MiDocumento, fecha: string) => {
    if (!solicitud) return;
    setPendingFechas((prev) => ({ ...prev, [doc.sa_id]: fecha }));
    try {
      await formularioRespuestasService.actualizarFechaDocumento(
        solicitud.sol_id,
        doc.fp_id,
        fecha,
      );
      setPendingFechas((prev) => {
        const { [doc.sa_id]: _omit, ...resto } = prev;
        return resto;
      });
      await cargar();
    } catch (error) {
      console.error(
        "[MisDocumentosPage] Error guardando fecha de emisión:",
        error,
      );
      setErrorMessage("No se pudo guardar la fecha de emisión.");
    }
  };

  const handleActualizarEInformar = async () => {
    if (!solicitud) return;
    try {
      setEnviando(true);

      for (const doc of documentos) {
        const fecha = pendingFechas[doc.sa_id];
        if (fecha) {
          await formularioRespuestasService.actualizarFechaDocumento(
            solicitud.sol_id,
            doc.fp_id,
            fecha,
          );
        }
      }

      await misDocumentosService.enviarCorreccion(solicitud.sol_id);

      setPendingFechas({});
      setHuboSubidaSesion(false);
      setShowSuccessModal(true);
      await cargar();
    } catch (error) {
      console.error(
        "[MisDocumentosPage] Error actualizando e informando:",
        error,
      );
      setErrorMessage("No se pudo actualizar e informar a Cartonera.");
    } finally {
      setEnviando(false);
    }
  };

  const handleGenerarPlantilla = async (doc: DocumentoDiferido) => {
    if (!solicitud) return;
    if (doc.tdo_tipo_plantilla !== "PDF_SOLICITUD" && !doc.tdo_plantilla_contenido) return;
    try {
      setGenerandoPlantillaId(doc.tdo_id);
      if (doc.tdo_tipo_plantilla === "PDF_SOLICITUD") {
        await abrirPdfSolicitud(solicitud.sol_id);
      } else {
        const repLegal = await obtenerRepresentanteLegal(solicitud.sol_id);
        let respuestasPregunta: Record<string, string> | undefined;
        if (/\{\{pregunta\|/.test(doc.tdo_plantilla_contenido!)) {
          const renderizable = await solicitudesService.getFormularioRenderizable(
            solicitud.sol_id,
          );
          respuestasPregunta = construirMapaRespuestasPregunta(
            renderizable.preguntas,
          );
        }
        await generarPlantillaDocumentoPdf({
          tdoNombre: doc.tdo_nombre,
          tdoPlantillaContenido: doc.tdo_plantilla_contenido!,
          clienteNombre: solicitud.cliente_nombre,
          clienteNit: solicitud.cliente_nit,
          numeroSolicitud: solicitud.sol_numero_solicitud,
          representanteLegalNombre: repLegal?.nombre,
          representanteLegalCedula: repLegal?.identificacion,
          formatoCodigo: doc.tdo_formato_codigo,
          formatoCodigoSecundario: doc.tdo_formato_codigo_secundario,
          revision: doc.tdo_revision,
          paginasTotal: doc.tdo_paginas_total,
          respuestasPregunta,
          revisiones: await obtenerRevisionesPdf(doc.tdo_id),
        });
      }
    } catch (error) {
      console.error("[MisDocumentosPage] Error generando plantilla:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : `No se pudo generar la plantilla de "${doc.tdo_nombre}".`,
      );
    } finally {
      setGenerandoPlantillaId(null);
    }
  };

  const handleSeleccionarArchivoDiferido = async (
    doc: DocumentoDiferido,
    file: File,
  ) => {
    if (!solicitud) return;
    setUploadingDiferidoFpId(doc.fp_id);
    try {
      await formularioRespuestasService.guardarArchivoRespuesta(
        solicitud.sol_id,
        doc.fp_id,
        file,
      );
      await cargar();
    } catch (error) {
      console.error(
        "[MisDocumentosPage] Error subiendo documento diferido:",
        error,
      );
      setErrorMessage(`No se pudo subir "${doc.tdo_nombre}".`);
    } finally {
      setUploadingDiferidoFpId(null);
    }
  };

  const handleEnviarDocumentosDiferidos = async () => {
    if (!solicitud) return;
    try {
      setEnviandoDiferidos(true);

      const resultado = await misDocumentosService.verificarDocumentosDiferidos(
        solicitud.sol_id,
      );

      if (resultado.avanzo) {
        setShowSuccessModal(true);
      } else if (resultado.documentosDiferidosFaltantes.length > 0) {
        setErrorMessage(
          `Aún faltan por subir: ${resultado.documentosDiferidosFaltantes
            .map((d) => d.tdo_nombre)
            .join(", ")}.`,
        );
      }

      await cargar();
    } catch (error) {
      console.error(
        "[MisDocumentosPage] Error enviando documentos diferidos:",
        error,
      );
      setErrorMessage("No se pudieron enviar los documentos generados.");
    } finally {
      setEnviandoDiferidos(false);
    }
  };

  const handleEliminar = async () => {
    if (!solicitud || !confirmEliminar) return;
    try {
      await formularioRespuestasService.eliminarArchivoRespuesta(
        solicitud.sol_id,
        confirmEliminar.sa_id,
      );
      setConfirmEliminar(null);
      await cargar();
    } catch (error) {
      console.error("[MisDocumentosPage] Error eliminando:", error);
      setErrorMessage("No se pudo eliminar el documento.");
    }
  };

  const documentosDiferidosListos = documentosDiferidos.filter(
    (doc) => doc.yaSubido,
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-0">
      <div className="max-w-[90%] mx-auto mt-2 px-2">
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden m-0">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  modoStaff
                    ? router.push("/solicitudes/corregir-formulario-asc")
                    : router.push("/solicitudes/cliente")
                }
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
                  {modoStaff ? "Documentos de la Solicitud" : "Mis Documentos"}
                </h1>
                <p className="text-xs md:text-sm text-blue-100 truncate">
                  {solicitud
                    ? modoStaff
                      ? `Solicitud ${solicitud.sol_numero_solicitud} — ${solicitud.cliente_nombre ?? "cliente"}. Corrige en su nombre los documentos marcados.`
                      : `Documentos de la solicitud ${solicitud.sol_numero_solicitud}.`
                    : "Consulta el estado de tus documentos y corrígelos si hace falta."}
                </p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6">

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        {!puedeCorregir && solicitud && !loading && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {modoStaff
              ? "Esta solicitud no está en modo de corrección por el auxiliar (etapa/resultado distinto al esperado). Aquí solo puedes consultarla."
              : "Esta solicitud ya no admite cambios de documentos (está en revisión o ya fue resuelta). Aquí solo puedes consultarlos."}
          </div>
        )}

        {rechazadoPorAuxiliar && puedeCorregir && !loading && (
          <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {modoStaff ? (
              <>
                Rechazaste esta solicitud con modo de solución "Auxiliar
                Actualiza". Corrige los documentos marcados como{" "}
                <strong>&quot;Requiere cambio&quot;</strong> (o los que
                aparezcan vencidos) subiendo el archivo correcto en nombre
                del cliente. Los demás documentos solo se pueden consultar.
              </>
            ) : (
              <>
                El auxiliar de servicio al cliente rechazó tu solicitud
                porque algunos documentos tienen la fecha de emisión
                incorrecta. Corrige los documentos marcados como{" "}
                <strong>&quot;Requiere cambio&quot;</strong> (o los que
                aparezcan vencidos). Los demás documentos solo se pueden
                consultar en este momento.
              </>
            )}
          </div>
        )}

        {documentosDiferidos.length > 0 && !loading && (
          <div className="mb-8 rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 rounded-full bg-blue-100 p-3">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-gray-900">
                  Documentos pendientes por generar y subir
                </p>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
                  Tu solicitud fue registrada, pero antes de que la vea
                  Cartonera faltan por generar y subir estos documentos:
                  descarga la plantilla, fírmala, y súbela aquí mismo.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {documentosDiferidos.map((doc) => {
                const subiendo = uploadingDiferidoFpId === doc.fp_id;
                const listo = doc.yaSubido;
                const archivoUrl =
                  listo && doc.sa_id
                    ? getArchivoPreviewUrl(
                        { sa_id: doc.sa_id },
                        solicitud?.sol_id,
                      )
                    : null;
                return (
                  <div
                    key={doc.tdo_id}
                    className={`rounded-xl border p-4 transition-colors ${
                      listo
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-gray-200 bg-gray-50/70"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`flex-shrink-0 rounded-full p-2 mt-0.5 ${listo ? "bg-emerald-100" : "bg-red-100"}`}
                        >
                          <FileText
                            className={`h-4 w-4 ${listo ? "text-emerald-600" : "text-red-600"}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 break-words">
                            {doc.tdo_nombre}
                          </p>
                          <p
                            className={`text-xs font-medium mt-1 ${listo ? "text-emerald-700" : "text-red-600"}`}
                          >
                            {subiendo
                              ? "Subiendo..."
                              : listo
                                ? "✓ Ya subido anteriormente"
                                : "Pendiente: falta generar y subir"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {(doc.tdo_plantilla_contenido ||
                          doc.tdo_tipo_plantilla === "PDF_SOLICITUD") && (
                          <button
                            type="button"
                            onClick={() => handleGenerarPlantilla(doc)}
                            disabled={generandoPlantillaId === doc.tdo_id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-60"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {generandoPlantillaId === doc.tdo_id
                              ? "Generando..."
                              : "Descargar plantilla"}
                          </button>
                        )}
                        {archivoUrl && (
                          <a
                            href={archivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            Ver archivo
                          </a>
                        )}
                        <label
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                            listo
                              ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                              : "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                          }`}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {subiendo
                            ? "Subiendo..."
                            : listo
                              ? "Reemplazar"
                              : "Subir firmado"}
                          <input
                            type="file"
                            accept=".pdf,application/pdf,image/*"
                            className="hidden"
                            disabled={subiendo}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file)
                                handleSeleccionarArchivoDiferido(doc, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">
                  {documentosDiferidosListos} de {documentosDiferidos.length}
                </span>{" "}
                documentos listos para enviar
              </p>
              <button
                onClick={handleEnviarDocumentosDiferidos}
                disabled={
                  enviandoDiferidos ||
                  uploadingDiferidoFpId !== null ||
                  documentosDiferidos.some((doc) => !doc.yaSubido)
                }
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
              >
                {enviandoDiferidos
                  ? "Enviando..."
                  : "Enviar e informar a Cartonera"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Cargando tus documentos...
            </div>
            <div className="divide-y divide-gray-100">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 animate-pulse">
                  <div className="h-4 w-4 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-gray-200" />
                    <div className="h-2 w-1/4 rounded bg-gray-100" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        ) : !solicitud ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            Aún no tienes ninguna solicitud con documentos.
          </div>
        ) : documentos.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
            No hay documentos cargados en esta solicitud.
          </div>
        ) : (
          <>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setBusqueda(busquedaInput);
              }}
              className="mb-3 flex gap-2"
            >
              <input
                type="text"
                value={busquedaInput}
                onChange={(e) => setBusquedaInput(e.target.value)}
                placeholder="Buscar documento por nombre..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Buscar
              </button>
              {busqueda && (
                <button
                  type="button"
                  onClick={() => {
                    setBusquedaInput("");
                    setBusqueda("");
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Limpiar
                </button>
              )}
            </form>

            {documentosFiltrados.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
                {busqueda
                  ? `Ningún documento coincide con "${busqueda}".`
                  : "Todos tus documentos están en la sección de arriba, pendientes por enviar."}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Documento</th>
                      <th className="px-4 py-3">Archivo</th>
                      <th className="px-4 py-3">Fecha Carga</th>
                      <th className="px-4 py-3">Fecha Emisión Doc</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Fecha Vencimiento</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentosFiltrados.map((doc) => {
                  const estado = getEstadoVigencia(doc);
                  const editable = esDocumentoEditable(
                    doc,
                    puedeCorregir,
                    rechazadoPorAuxiliar,
                    estado.vencido,
                  );
                  const archivoUrl = getArchivoPreviewUrl(
                    {
                      sa_id: doc.sa_id,
                      sa_ruta_almacenamiento: doc.sa_ruta_almacenamiento,
                      sa_nombre_guardado: doc.sa_nombre_guardado,
                    },
                    solicitud.sol_id,
                  );

                  return (
                    <tr
                      key={doc.sa_id}
                      className="border-b border-gray-100 last:border-0 align-top"
                    >
                      <td className="px-4 py-3 min-w-[220px]">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="font-medium text-gray-900 break-words">
                            {doc.tdo_nombre || doc.sa_nombre_original}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3 min-w-[160px]">
                        {archivoUrl ? (
                          <a
                            href={archivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 break-words"
                          >
                            {doc.sa_nombre_original}
                          </a>
                        ) : (
                          <p className="text-xs text-gray-500 break-words">
                            {doc.sa_nombre_original}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(doc.fecha_carga)}
                      </td>

                      <td className="px-4 py-3">
                        {requiereFecha(doc) ? (
                          <input
                            type="date"
                            value={
                              pendingFechas[doc.sa_id] ??
                              (doc.sd_fecha_emision
                                ? doc.sd_fecha_emision.split("T")[0]
                                : "")
                            }
                            min="1900-01-01"
                            max={new Date().toISOString().split("T")[0]}
                            disabled={!editable}
                            onChange={(e) =>
                              e.target.value &&
                              handleCambiarFecha(doc, e.target.value)
                            }
                            className="border border-gray-300 rounded-lg px-2 py-1 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${estado.className}`}
                          >
                            {estado.estado}
                          </span>
                          {rechazadoPorAuxiliar && doc.sd_requiere_cambio && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-orange-100 text-orange-800">
                              Requiere cambio
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {estado.detalle}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          {doc.tdo_tiene_plantilla &&
                            (doc.tdo_plantilla_contenido ||
                              doc.tdo_tipo_plantilla === "PDF_SOLICITUD") && (
                            <button
                              type="button"
                              onClick={() => handleGenerarPlantillaDocumento(doc)}
                              disabled={generandoPlantillaId === doc.sa_id}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-800 rounded-md hover:bg-amber-100 transition-colors font-medium border border-amber-200 disabled:opacity-60"
                            >
                              <Download className="h-3 w-3" />
                              {generandoPlantillaId === doc.sa_id
                                ? "Generando..."
                                : "Descargar plantilla"}
                            </button>
                          )}
                          {editable ? (
                            <>
                              <label className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                                <Upload className="h-3.5 w-3.5" />
                                {uploadingSaId === doc.sa_id
                                  ? "Subiendo..."
                                  : "Reemplazar"}
                                <input
                                  type="file"
                                  accept=".pdf,application/pdf,image/*"
                                  className="hidden"
                                  disabled={uploadingSaId === doc.sa_id}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file)
                                      handleSeleccionarArchivo(doc, file);
                                    e.target.value = "";
                                  }}
                                />
                              </label>

                              <button
                                onClick={() => setConfirmEliminar(doc)}
                                className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Eliminar
                              </button>
                            </>
                          ) : (
                            rechazadoPorAuxiliar && (
                              <span className="text-xs text-gray-400">
                                Solo lectura
                              </span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {rechazadoPorAuxiliar &&
          puedeCorregir &&
          !loading &&
          documentos.length > 0 && (
            <div className="sticky bottom-4 mt-6 flex justify-end rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
              <button
                onClick={handleActualizarEInformar}
                disabled={!huboCambios || enviando}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {enviando
                  ? "Actualizando..."
                  : modoStaff
                    ? "Actualizar y devolver a revisión"
                    : "Actualizar e informar a Cartonera"}
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      <LoadingModal
        isOpen={generandoPlantillaId !== null}
        message="Generando plantilla..."
      />

      <LoadingModal
        isOpen={uploadingSaId !== null || uploadingDiferidoFpId !== null}
        message="Subiendo archivo..."
      />

      <SuccessModal
        isOpen={showSuccessModal}
        title="¡Enviado!"
        message={
          modoStaff
            ? "La corrección fue guardada. La solicitud vuelve a la bandeja de Auxiliar Servicio Cliente."
            : "Tu corrección fue enviada. Cartonera revisará los documentos actualizados."
        }
        actionText="Aceptar"
        autoClose={true}
        autoCloseDelay={3000}
        onAction={() => setShowSuccessModal(false)}
      />

      <ConfirmModal
        isOpen={!!confirmEliminar}
        title="Eliminar documento"
        message={`¿Deseas eliminar "${confirmEliminar?.tdo_nombre || confirmEliminar?.sa_nombre_original}"? No podrás recuperarlo.`}
        confirmText="Eliminar"
        isDangerous
        onConfirm={handleEliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  );
}
