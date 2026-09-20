"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Download, FileText, Upload } from "lucide-react";
import {
  misDocumentosService,
  type DocumentoDiferido,
} from "@/services/mis-documentos.service";
import { formularioRespuestasService } from "@/services/formulario-respuestas.service";
import { solicitudesService } from "@/services/solicitudes.service";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import {
  generarPlantillaDocumentoPdf,
  construirMapaRespuestasPregunta,
  construirNombreDescargaPdf,
  descargarPdfBlob,
} from "@/lib/carta-pdf.util";
import { getArchivoPreviewUrl } from "@/lib/documentos-vigencia.util";
import { ErrorModal, LoadingModal, SuccessModal } from "@/components/modals";

async function abrirPdfSolicitud(
  solicitudId: number,
  nombreDocumento: string,
  clienteNombre?: string | null,
  tdoId?: number | null,
) {
  const blob = await solicitudesService.downloadPdf(solicitudId, tdoId);
  descargarPdfBlob(
    blob,
    construirNombreDescargaPdf(nombreDocumento, clienteNombre),
  );
}

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

export const PanelFirmaDocumentos = forwardRef<
  PanelFirmaDocumentosHandle,
  PanelFirmaDocumentosProps
>(function PanelFirmaDocumentos({ solicitudId, onCargado, onEnviado }, ref) {
  const [loading, setLoading] = useState(true);
  const [documentosDiferidos, setDocumentosDiferidos] = useState<
    DocumentoDiferido[]
  >([]);
  const [datosSolicitud, setDatosSolicitud] = useState<{
    cliente_nombre?: string | null;
    cliente_nit?: string | null;
    sol_numero_solicitud?: string;
  }>({});
  const [representanteLegal, setRepresentanteLegal] = useState<{
    nombre: string;
    identificacion: string;
  } | null>(null);
  const [uploadingFpId, setUploadingFpId] = useState<number | null>(null);
  const [generandoPlantillaId, setGenerandoPlantillaId] = useState<
    number | null
  >(null);
  const [enviando, setEnviando] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [enviadoOk, setEnviadoOk] = useState(false);
  const clienteNombre = datosSolicitud.cliente_nombre;
  const clienteNit = datosSolicitud.cliente_nit;
  const numeroSolicitud = datosSolicitud.sol_numero_solicitud;

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await misDocumentosService.getMisDocumentos(solicitudId);
      const diferidos = data.documentosDiferidos || [];
      setDocumentosDiferidos(diferidos);
      setDatosSolicitud({
        cliente_nombre: data.solicitud?.cliente_nombre,
        cliente_nit: data.solicitud?.cliente_nit,
        sol_numero_solicitud: data.solicitud?.sol_numero_solicitud,
      });
      onCargado?.(diferidos);
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

  // El representante legal solo hace falta para las plantillas de tipo TEXTO
  // (para rellenar {{representante_legal_nombre}}, etc). Se pide bajo
  // demanda justo antes de generar una de esas plantillas, no en la carga
  // inicial — requiere reconstruir el formulario completo en el backend, y
  // las de tipo PDF_SOLICITUD ni lo necesitan.
  const obtenerRepresentanteLegal = async () => {
    if (representanteLegal) return representanteLegal;
    try {
      const data =
        await misDocumentosService.getRepresentanteLegal(solicitudId);
      setRepresentanteLegal(data);
      return data;
    } catch (error) {
      console.error(
        "[PanelFirmaDocumentos] Error obteniendo representante legal:",
        error,
      );
      return null;
    }
  };

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
        "[PanelFirmaDocumentos] Error cargando historial de revisiones:",
        error,
      );
      return [];
    }
  };

  const handleGenerarPlantilla = async (doc: DocumentoDiferido) => {
    if (doc.tdo_tipo_plantilla !== "PDF_SOLICITUD" && !doc.tdo_plantilla_contenido)
      return;
    try {
      setGenerandoPlantillaId(doc.tdo_id);
      if (doc.tdo_tipo_plantilla === "PDF_SOLICITUD") {
        await abrirPdfSolicitud(solicitudId, doc.tdo_nombre, clienteNombre, doc.tdo_id);
      } else {
        const repLegal = await obtenerRepresentanteLegal();
        let respuestasPregunta: Record<string, string> | undefined;
        if (/\{\{pregunta\|/.test(doc.tdo_plantilla_contenido!)) {
          const renderizable =
            await solicitudesService.getFormularioRenderizable(solicitudId);
          respuestasPregunta = construirMapaRespuestasPregunta(
            renderizable.preguntas,
          );
        }
        await generarPlantillaDocumentoPdf({
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
        });
      }
    } catch (error) {
      console.error("[PanelFirmaDocumentos] Error generando plantilla:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : `No se pudo generar la plantilla de "${doc.tdo_nombre}".`,
      );
    } finally {
      setGenerandoPlantillaId(null);
    }
  };

  const handleSeleccionarArchivo = async (
    doc: DocumentoDiferido,
    file: File,
  ) => {
    setUploadingFpId(doc.fp_id);
    try {
      await formularioRespuestasService.guardarArchivoRespuesta(
        solicitudId,
        doc.fp_id,
        file,
      );
      await cargar();
    } catch (error) {
      console.error(
        "[PanelFirmaDocumentos] Error subiendo documento diferido:",
        error,
      );
      setErrorMessage(`No se pudo subir "${doc.tdo_nombre}".`);
    } finally {
      setUploadingFpId(null);
    }
  };

  const handleEnviar = async () => {
    try {
      setEnviando(true);
      const resultado =
        await misDocumentosService.verificarDocumentosDiferidos(solicitudId);
      if (resultado.avanzo) {
        setEnviadoOk(true);
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
        "[PanelFirmaDocumentos] Error enviando documentos diferidos:",
        error,
      );
      setErrorMessage("No se pudieron enviar los documentos generados.");
    } finally {
      setEnviando(false);
    }
  };

  useImperativeHandle(ref, () => ({ enviar: handleEnviar }));

  if (loading) {
    return (
      <div className="mb-3 rounded-2xl border border-blue-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="mt-3 h-3 w-1/2 rounded bg-gray-100" />
      </div>
    );
  }

  if (documentosDiferidos.length === 0) return null;

  const documentosDiferidosListos = documentosDiferidos.filter(
    (doc) => doc.yaSubido,
  ).length;

  return (
    <div className="mb-3 rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 rounded-full bg-blue-100 p-3">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-gray-900">
            Documentos pendientes por generar y subir
          </p>
          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
            Antes de que Cartonera revise tu solicitud faltan por generar y
            subir estos documentos: descarga la plantilla, fírmala, y súbela
            aquí mismo.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {documentosDiferidos.map((doc) => {
          const subiendo = uploadingFpId === doc.fp_id;
          const listo = doc.yaSubido;
          const archivoUrl =
            listo && doc.sa_id
              ? getArchivoPreviewUrl({ sa_id: doc.sa_id }, solicitudId)
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
                      className={`text-xs font-medium mt-1 break-words ${listo ? "text-emerald-700" : "text-red-600"}`}
                    >
                      {subiendo
                        ? "Subiendo..."
                        : listo
                          ? `✓ ${doc.sa_nombre_original || "Ya subido anteriormente"}`
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
                        if (file) handleSeleccionarArchivo(doc, file);
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

      <div className="mt-6 border-t border-gray-100 pt-5">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">
            {documentosDiferidosListos} de {documentosDiferidos.length}
          </span>{" "}
          documentos listos.{" "}
          {documentosDiferidosListos === documentosDiferidos.length
            ? 'Ya puedes continuar con el paso "Enviar solicitud" de arriba.'
            : "Sube los que faltan para poder enviar la solicitud."}
        </p>
      </div>

      <LoadingModal isOpen={uploadingFpId !== null} message="Subiendo archivo..." />
      <LoadingModal isOpen={generandoPlantillaId !== null} message="Generando plantilla..." />
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

      <ErrorModal
        isOpen={!!errorMessage}
        message={errorMessage}
        onAction={() => setErrorMessage("")}
      />
    </div>
  );
});
