"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Download, Eye, FileText, Upload } from "lucide-react";
import { misDocumentosService, type DocumentoDiferido } from "@/services/mis-documentos.service";
import { formularioRespuestasService } from "@/services/formulario-respuestas.service";
import { solicitudesService } from "@/services/solicitudes.service";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import {
  generarPlantillaDocumentoPdf,
  construirMapaRespuestasPregunta,
  construirNombreDescargaPdf,
} from "@/lib/carta-pdf.util";
import { getArchivoPreviewUrl } from "@/lib/documentos-vigencia.util";
import { ErrorModal, LoadingModal, SuccessModal } from "@/components/modals";
import { useUpload } from "@/context/UploadContext";

export interface PanelFirmaDocumentosHandle {
  // Expuesto para que el paso "Enviar solicitud" del FlujoSolicitud (en la
  // página contenedora) dispare el mismo envío que antes tenía su propio
  // botón acá — evita duplicar el botón "Enviar" en dos lugares del flujo.
  enviar: () => void;
}

interface PanelFirmaDocumentosProps {
  solicitudId: number;
  // Se dispara con cada carga (inicial y tras cada acción) para que la
  // página contenedora sepa si el paso "Firmar documentación" ya quedó
  // completo (lista vacía) o sigue pendiente, sin duplicar el fetch.
  onCargado?: (documentosDiferidos: DocumentoDiferido[]) => void;
  onEnviado: () => void;
}

export const PanelFirmaDocumentos = forwardRef<PanelFirmaDocumentosHandle, PanelFirmaDocumentosProps>(
  function PanelFirmaDocumentos({ solicitudId, onCargado, onEnviado }, ref) {
    const [loading, setLoading] = useState(true);
    const [documentosDiferidos, setDocumentosDiferidos] = useState<DocumentoDiferido[]>([]);
    const [datosSolicitud, setDatosSolicitud] = useState<{
      cliente_nombre?: string | null;
      cliente_nit?: string | null;
      sol_numero?: string;
    }>({});
    const [representanteLegal, setRepresentanteLegal] = useState<{
      nombre: string;
      identificacion: string;
    } | null>(null);
    const { startLoading, showSuccess, showError, clear } = useUpload();
    const [generandoDocumentos, setGenerandoDocumentos] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [yaEnviado, setYaEnviado] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [enviadoOk, setEnviadoOk] = useState(false);
    const clienteNombre = datosSolicitud.cliente_nombre;
    const clienteNit = datosSolicitud.cliente_nit;
    const numeroSolicitud = datosSolicitud.sol_numero;

    const cargar = async () => {
      try {
        setLoading(true);
        const data = await misDocumentosService.getMisDocumentos(solicitudId);
        const solicitudYaEnviada =
          Number(data.solicitud?.sol_ses_id) === 2 &&
          data.solicitud?.etapa_codigo === "EJN" &&
          data.solicitud?.resultado_codigo === "PENDIENTE";
        setYaEnviado(solicitudYaEnviada);
        const documentosGeneradosGuardados: DocumentoDiferido[] = data.documentos
          .filter(
            (doc) =>
              doc.tdo_id != null &&
              doc.tdo_nombre != null &&
              doc.tdo_tiene_plantilla &&
              (doc.tdo_plantilla_contenido || doc.tdo_tipo_plantilla === "PDF_SOLICITUD"),
          )
          .map((doc) => ({
            tdo_id: doc.tdo_id!,
            tdo_nombre: doc.tdo_nombre!,
            tdo_plantilla_contenido: doc.tdo_plantilla_contenido,
            tdo_tipo_plantilla: doc.tdo_tipo_plantilla!,
            tdo_formato_codigo: doc.tdo_formato_codigo,
            tdo_formato_codigo_secundario: doc.tdo_formato_codigo_secundario,
            tdo_revision: doc.tdo_revision,
            tdo_paginas_total: doc.tdo_paginas_total,
            tdo_encabezado_tipo: doc.tdo_encabezado_tipo,
            tdo_encabezado_imagen_url: doc.tdo_encabezado_imagen_url,
            tdo_pie_pagina_tipo: doc.tdo_pie_pagina_tipo,
            tdo_pie_pagina_texto: doc.tdo_pie_pagina_texto,
            tdo_pie_pagina_imagen_url: doc.tdo_pie_pagina_imagen_url,
            fp_id: doc.fp_id,
            yaSubido: true,
            sa_id: doc.sa_id,
            sa_nombre_original: doc.sa_nombre_original,
          }));
        const documentosPorTipo = new Map<number, DocumentoDiferido>();
        [...documentosGeneradosGuardados, ...(data.documentosDiferidos || [])].forEach((doc) => {
          documentosPorTipo.set(doc.tdo_id, doc);
        });
        const diferidos = Array.from(documentosPorTipo.values());
        setDocumentosDiferidos(diferidos);
        setDatosSolicitud({
          cliente_nombre: data.solicitud?.cliente_nombre,
          cliente_nit: data.solicitud?.cliente_nit,
          sol_numero: data.solicitud?.sol_numero,
        });
        onCargado?.(solicitudYaEnviada ? [] : diferidos);
      } catch (error) {
        console.error("[PanelFirmaDocumentos] Error cargando:", error);
        setErrorMessage("No se pudieron cargar los documentos pendientes.");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      cargar();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [solicitudId]);

    const obtenerRepresentanteLegal = async () => {
      if (representanteLegal) return representanteLegal;
      const data = await misDocumentosService.getRepresentanteLegal(solicitudId);
      setRepresentanteLegal(data);
      return data;
    };

    const obtenerRevisionesPdf = async (tdoId: number) => {
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
    };

    const generarYGuardarDocumentos = async () => {
      const documentosPorGenerar = documentosDiferidos.filter(
        (doc) => !doc.yaSubido && (doc.tdo_plantilla_contenido || doc.tdo_tipo_plantilla === "PDF_SOLICITUD"),
      );
      if (documentosPorGenerar.length === 0) return;

      const eliminarDocumentosGenerados = async () => {
        const archivosActuales = await formularioRespuestasService.getArchivosExistentes(solicitudId);
        const fpIdsGenerados = new Set(documentosPorGenerar.map((doc) => doc.fp_id));
        const archivosParaEliminar = archivosActuales.filter((archivo: any) =>
          fpIdsGenerados.has(Number(archivo.fp_id ?? archivo.fr_fp_id)),
        );

        await Promise.all(
          archivosParaEliminar.map((archivo: any) =>
            formularioRespuestasService.eliminarArchivoRespuesta(solicitudId, Number(archivo.sa_id)),
          ),
        );
      };

      setGenerandoDocumentos(true);
      startLoading("Generando documentos...");
      try {
        const repLegal = await obtenerRepresentanteLegal();
        for (const doc of documentosPorGenerar) {
          let archivo: File;
          if (doc.tdo_tipo_plantilla === "PDF_SOLICITUD") {
            const blob = await solicitudesService.downloadPdf(solicitudId, doc.tdo_id);
            archivo = new File([blob], construirNombreDescargaPdf(doc.tdo_nombre, clienteNombre, numeroSolicitud), {
              type: "application/pdf",
            });
          } else {
            let respuestasPregunta: Record<string, string> | undefined;
            if (/\{\{pregunta\|/.test(doc.tdo_plantilla_contenido!)) {
              const renderizable = await solicitudesService.getFormularioRenderizable(solicitudId);
              respuestasPregunta = construirMapaRespuestasPregunta(renderizable.preguntas);
            }
            archivo = await generarPlantillaDocumentoPdf({
              tdoNombre: doc.tdo_nombre,
              tdoPlantillaContenido: doc.tdo_plantilla_contenido!,
              clienteNombre,
              clienteNit,
              numeroSolicitud,
              representanteLegalNombre: repLegal?.nombre,
              representanteLegalCedula: repLegal?.identificacion,
              formatoCodigo: doc.tdo_formato_codigo,
              formatoCodigoSecundario: doc.tdo_formato_codigo_secundario,
              revision: doc.tdo_revision,
              paginasTotal: doc.tdo_paginas_total,
              respuestasPregunta,
              revisiones: await obtenerRevisionesPdf(doc.tdo_id),
              encabezadoTipo: doc.tdo_encabezado_tipo,
              encabezadoImagenUrl: doc.tdo_encabezado_imagen_url,
              piePaginaTipo: doc.tdo_pie_pagina_tipo,
              piePaginaTexto: doc.tdo_pie_pagina_texto,
              piePaginaImagenUrl: doc.tdo_pie_pagina_imagen_url,
              descargar: false,
            });
          }
          await formularioRespuestasService.guardarArchivoRespuesta(solicitudId, doc.fp_id, archivo);
        }
        showSuccess({
          title: "Documentos generados",
          message: "Los documentos fueron generados y guardados. Ahora puedes firmarlos y subirlos.",
        });
        await cargar();
      } catch (error) {
        console.error("[PanelFirmaDocumentos] Error generando documentos:", error);
        try {
          await eliminarDocumentosGenerados();
        } catch (rollbackError) {
          console.error("[PanelFirmaDocumentos] No se pudo deshacer la generación parcial:", rollbackError);
        }
        showError({
          title: "No se pudieron generar los documentos",
          message: "No se guardaron todos los documentos. La generación fue deshecha; intenta nuevamente.",
        });
      } finally {
        setGenerandoDocumentos(false);
      }
    };

    const handleSeleccionarArchivo = async (doc: DocumentoDiferido, file: File) => {
      startLoading("Subiendo archivo...");
      try {
        await formularioRespuestasService.guardarArchivoRespuesta(solicitudId, doc.fp_id, file);
        showSuccess({
          title: "Archivo subido",
          message: `"${doc.tdo_nombre}" quedó listo para continuar.`,
        });
        await cargar();
      } catch (error) {
        console.error("[PanelFirmaDocumentos] Error subiendo documento diferido:", error);
        setErrorMessage(`No se pudo subir "${doc.tdo_nombre}".`);
        showError({
          title: "No se pudo subir el archivo",
          message: `No se pudo subir "${doc.tdo_nombre}".`,
        });
      }
    };

    const handleEnviar = async () => {
      if (yaEnviado) return;
      startLoading("Enviando documentos a Cartonera...");
      try {
        setEnviando(true);
        const resultado = await misDocumentosService.verificarDocumentosDiferidos(solicitudId);
        if (resultado.avanzo) {
          setYaEnviado(true);
          onCargado?.([]);
          setEnviadoOk(true);
          return;
        }

        if (resultado.documentosDiferidosFaltantes.length > 0) {
          setErrorMessage(
            `Aún faltan por subir: ${resultado.documentosDiferidosFaltantes.map((d) => d.tdo_nombre).join(", ")}.`,
          );
        }
        await cargar();
      } catch (error) {
        console.error("[PanelFirmaDocumentos] Error enviando documentos diferidos:", error);
        setErrorMessage("No se pudieron enviar los documentos generados.");
      } finally {
        clear();
        setEnviando(false);
      }
    };

    useImperativeHandle(ref, () => ({ enviar: handleEnviar }));

    if (loading) {
      return (
        <div className="mb-3 rounded-2xl border border-brand-600/20 bg-white p-6 shadow-sm animate-pulse">
          <div className="h-4 w-2/3 rounded bg-gray-200" />
          <div className="mt-3 h-3 w-1/2 rounded bg-gray-100" />
        </div>
      );
    }

    // Una solicitud ya enviada no debe volver a mostrar el panel de firmas.
    // Se conserva montado únicamente mientras el modal de éxito espera la
    // confirmación explícita del usuario.
    if (yaEnviado && !enviadoOk) return null;
    if (documentosDiferidos.length === 0) return null;

    const documentosDiferidosListos = documentosDiferidos.filter((doc) => doc.yaSubido).length;
    const esDocumentoGenerado = (doc: DocumentoDiferido) =>
      Boolean(doc.tdo_plantilla_contenido) || doc.tdo_tipo_plantilla === "PDF_SOLICITUD";
    const documentosGenerados = documentosDiferidos.filter((doc) => esDocumentoGenerado(doc) && doc.yaSubido);
    const documentosParaFirmar = documentosDiferidos.filter((doc) => !esDocumentoGenerado(doc));
    const documentosPorGenerar = documentosDiferidos.filter((doc) => esDocumentoGenerado(doc) && !doc.yaSubido);
    const firmasPendientes = documentosParaFirmar.filter((doc) => !doc.yaSubido);
    const hayDocumentosGenerados = documentosGenerados.length > 0;

    const renderDocumento = (doc: DocumentoDiferido) => {
      const listo = doc.yaSubido;
      const esGenerado = esDocumentoGenerado(doc);
      const archivoUrl = listo && doc.sa_id ? getArchivoPreviewUrl({ sa_id: doc.sa_id }, solicitudId) : null;

      return (
        <div
          key={doc.tdo_id}
          className={`rounded-xl border p-4 transition-colors ${
            listo ? "border-emerald-200 bg-emerald-50/40" : "border-gray-200 bg-gray-50/70"
          }`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className={`mt-0.5 shrink-0 rounded-full p-2 ${listo ? "bg-emerald-100" : "bg-red-100"}`}>
                <FileText className={`h-4 w-4 ${listo ? "text-emerald-600" : "text-red-600"}`} />
              </div>
              <div className="min-w-0">
                <p className="wrap-break-word text-sm font-semibold text-gray-900">{doc.tdo_nombre}</p>
                <p
                  className={`mt-1 break-all text-xs font-medium ${listo ? "text-emerald-700" : "text-red-600"}`}>
                  {esGenerado
                    ? listo
                      ? "Documento generado y guardado"
                      : "Pendiente: generar documento"
                    : listo
                      ? `✓ ${doc.sa_nombre_original || "Firma subida"}`
                      : "Pendiente: falta subir la firma"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:justify-end">
              {archivoUrl && esGenerado && (
                <a
                  href={archivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir PDF generado: ${doc.tdo_nombre}`}
                  title="Abrir PDF generado"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 transition-colors hover:bg-red-100">
                  <FileText className="h-3.5 w-3.5 text-red-600" />
                  Ver documento generado
                </a>
              )}
              {archivoUrl && !esGenerado && (
                <a
                  href={archivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ver archivo: ${doc.tdo_nombre}`}
                  title="Ver archivo"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-brand-600 transition-colors hover:bg-gray-50 hover:text-brand-700">
                  <Eye className="h-4 w-4" />
                </a>
              )}
              {!esGenerado && (
                <label
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    listo
                      ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      : "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
                  }`}>
                  <Upload className="h-3.5 w-3.5" />
                  {listo ? "Reemplazar" : "Subir firmado"}
                  <input
                    type="file"
                    accept=".pdf,application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSeleccionarArchivo(doc, file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="mb-3 rounded-2xl border border-brand-600/20 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-full bg-brand-600/10 p-3">
            <FileText className="h-5 w-5 text-brand-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-gray-900">Documentos generados y firmas pendientes</p>
            <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
              Primero genera y guarda los documentos. Después, firma los documentos y sube aquí únicamente la versión
              firmada.
            </p>
          </div>
        </div>

        {documentosPorGenerar.length > 0 && (
          <button
            type="button"
            onClick={generarYGuardarDocumentos}
            disabled={generandoDocumentos}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Download className="h-4 w-4" />
            {generandoDocumentos ? "Generando documentos..." : "Generar documentos"}
          </button>
        )}

        {hayDocumentosGenerados && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Documentos generados</h3>
            {documentosGenerados.map(renderDocumento)}
          </div>
        )}

        {hayDocumentosGenerados && documentosParaFirmar.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Documentos pendientes de firma</h3>
            {documentosParaFirmar.map(renderDocumento)}
          </div>
        )}

        <div className="mt-6 border-t border-gray-100 pt-5">
          <p className="text-sm text-gray-600">
            {!hayDocumentosGenerados
              ? "Primero genera y guarda los documentos. Después, firma los documentos y sube únicamente las versiones firmadas."
              : documentosPorGenerar.length > 0
                ? `Hay ${documentosPorGenerar.length} documento${documentosPorGenerar.length === 1 ? "" : "s"} pendiente${documentosPorGenerar.length === 1 ? "" : "s"} por generar.`
                : documentosDiferidosListos === documentosDiferidos.length
                  ? 'Todos los documentos están listos. Ya puedes continuar con el paso "Enviar solicitud" de arriba.'
                  : yaEnviado
                    ? "Solicitud enviada a Cartonera."
                    : `${firmasPendientes.length} documento${firmasPendientes.length === 1 ? "" : "s"} pendiente${firmasPendientes.length === 1 ? "" : "s"} de firma. Firma y sube únicamente las versiones firmadas.`}
          </p>
        </div>

        <LoadingModal isOpen={enviando} message="Enviando documentos a Cartonera..." />

        <SuccessModal
          isOpen={enviadoOk}
          title="¡Documentos enviados!"
          message="Tu solicitud fue enviada a Cartonera para revisión."
          actionText="Aceptar"
          onAction={() => {
            setEnviadoOk(false);
            onEnviado();
          }}
        />

        <ErrorModal isOpen={!!errorMessage} message={errorMessage} onAction={() => setErrorMessage("")} />
      </div>
    );
  },
);
