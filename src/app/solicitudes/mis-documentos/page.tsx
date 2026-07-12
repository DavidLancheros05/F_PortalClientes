"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { generarPlantillaDocumentoPdf } from "@/lib/carta-pdf.util";
import { solicitudesService } from "@/services/solicitudes.service";
import { ConfirmModal, SuccessModal } from "@/components/modals";

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
        label: "Sin fecha",
        className: "bg-slate-100 text-slate-600",
        vencido: false,
      };
    if (!estado.valido) {
      return {
        label: "Vencido",
        className: "bg-red-100 text-red-800",
        vencido: true,
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
      label: `Vigente (${estado.anioDocumento}) · faltan ${partes.join(" y ")}`,
      className: "bg-emerald-100 text-emerald-800",
      vencido: false,
    };
  }

  if (doc.tdo_vigencia_dias != null) {
    const resumen = calcularVigenciaDocumento(fecha, doc.tdo_vigencia_dias);
    if (!resumen)
      return {
        label: "Sin fecha",
        className: "bg-slate-100 text-slate-600",
        vencido: false,
      };
    return resumen.diasRestantes >= 0
      ? {
          label: `Faltan ${resumen.diasRestantes} día${resumen.diasRestantes === 1 ? "" : "s"}`,
          className: "bg-emerald-100 text-emerald-800",
          vencido: false,
        }
      : {
          label: `Vencido hace ${Math.abs(resumen.diasRestantes)} día${Math.abs(resumen.diasRestantes) === 1 ? "" : "s"}`,
          className: "bg-red-100 text-red-800",
          vencido: true,
        };
  }

  return {
    label: "Sin vigencia",
    className: "bg-slate-100 text-slate-600",
    vencido: false,
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

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await misDocumentosService.getMisDocumentos();
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

  const handleGenerarPlantillaDocumento = async (doc: MiDocumento) => {
    if (!solicitud) return;
    if (doc.tdo_tipo_plantilla !== "PDF_SOLICITUD" && !doc.tdo_plantilla_contenido) return;
    try {
      setGenerandoPlantillaId(doc.sa_id);
      if (doc.tdo_tipo_plantilla === "PDF_SOLICITUD") {
        await abrirPdfSolicitud(solicitud.sol_id);
      } else {
        const repLegal = await obtenerRepresentanteLegal(solicitud.sol_id);
        await generarPlantillaDocumentoPdf({
          tdoNombre: doc.tdo_nombre || doc.sa_nombre_original,
          tdoPlantillaContenido: doc.tdo_plantilla_contenido!,
          clienteNombre: solicitud.cliente_nombre,
          clienteNit: solicitud.cliente_nit,
          numeroSolicitud: solicitud.sol_numero_solicitud,
          representanteLegalNombre: repLegal?.nombre,
          representanteLegalCedula: repLegal?.identificacion,
        });
      }
    } catch (error) {
      console.error("[MisDocumentosPage] Error generando plantilla:", error);
      setErrorMessage(
        `No se pudo generar la plantilla de "${doc.tdo_nombre}".`,
      );
    } finally {
      setGenerandoPlantillaId(null);
    }
  };

  const handleCambiarFecha = (doc: MiDocumento, fecha: string) => {
    setPendingFechas((prev) => ({ ...prev, [doc.sa_id]: fecha }));
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
        await generarPlantillaDocumentoPdf({
          tdoNombre: doc.tdo_nombre,
          tdoPlantillaContenido: doc.tdo_plantilla_contenido!,
          clienteNombre: solicitud.cliente_nombre,
          clienteNit: solicitud.cliente_nit,
          numeroSolicitud: solicitud.sol_numero_solicitud,
          representanteLegalNombre: repLegal?.nombre,
          representanteLegalCedula: repLegal?.identificacion,
        });
      }
    } catch (error) {
      console.error("[MisDocumentosPage] Error generando plantilla:", error);
      setErrorMessage(`No se pudo generar la plantilla de "${doc.tdo_nombre}".`);
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/solicitudes/cliente")}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft size={16} />
            Volver a mis solicitudes
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Mis Documentos</h1>
          <p className="text-gray-600 mt-2">
            {solicitud
              ? `Documentos de la solicitud ${solicitud.sol_numero_solicitud}.`
              : "Consulta el estado de tus documentos y corrígelos si hace falta."}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        {!puedeCorregir && solicitud && !loading && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Esta solicitud ya no admite cambios de documentos (está en revisión
            o ya fue resuelta). Aquí solo puedes consultarlos.
          </div>
        )}

        {rechazadoPorAuxiliar && puedeCorregir && !loading && (
          <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            El auxiliar de servicio al cliente rechazó tu solicitud porque
            algunos documentos tienen la fecha de emisión incorrecta. Corrige
            los documentos marcados como{" "}
            <strong>&quot;Requiere cambio&quot;</strong> (o los que aparezcan
            vencidos). Los demás documentos solo se pueden consultar en este
            momento.
          </div>
        )}

        {documentosDiferidos.length > 0 && !loading && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900 mb-1">
              Tu solicitud fue registrada, pero antes de que la vea Cartonera
              faltan por generar y subir estos documentos: descarga la
              plantilla, fírmala, y súbela aquí mismo.
            </p>
            <p className="text-xs font-semibold text-blue-800 mb-3">
              {documentosDiferidos.filter((doc) => doc.yaSubido).length} de{" "}
              {documentosDiferidos.length} documentos listos para enviar
            </p>
            <div className="space-y-2">
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
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 p-3 transition-colors ${
                      listo
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-red-300 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText
                        className={`h-4 w-4 flex-shrink-0 ${listo ? "text-emerald-600" : "text-red-600"}`}
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-900 break-words block">
                          {doc.tdo_nombre}
                        </span>
                        <span
                          className={`text-xs font-semibold ${listo ? "text-emerald-700" : "text-red-700"}`}
                        >
                          {subiendo
                            ? "Subiendo..."
                            : listo
                              ? "Ya subido anteriormente"
                              : "Pendiente: falta generar y subir"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {(doc.tdo_plantilla_contenido ||
                        doc.tdo_tipo_plantilla === "PDF_SOLICITUD") && (
                        <button
                          type="button"
                          onClick={() => handleGenerarPlantilla(doc)}
                          disabled={generandoPlantillaId === doc.tdo_id}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-800 rounded-md hover:bg-amber-100 transition-colors font-medium border border-amber-200 disabled:opacity-60"
                        >
                          <Download className="h-3 w-3" />
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
                      <label className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                        <Upload className="h-3.5 w-3.5" />
                        {subiendo ? "Subiendo..." : listo ? "Reemplazar" : "Subir firmado"}
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
                );
              })}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleEnviarDocumentosDiferidos}
                disabled={
                  enviandoDiferidos ||
                  uploadingDiferidoFpId !== null ||
                  documentosDiferidos.some((doc) => !doc.yaSubido)
                }
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none transition-colors"
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
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Vigencia</th>
                  <th className="px-4 py-3">Fecha de emisión</th>
                  <th className="px-4 py-3">Archivo</th>
                  <th className="px-4 py-3">Acciones</th>
                  <th className="px-4 py-3">Cargado el</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((doc) => {
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
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 break-words">
                              {doc.tdo_nombre || doc.sa_nombre_original}
                            </p>
                            <p className="text-xs text-gray-500 break-words">
                              {doc.sa_nombre_original}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${estado.className}`}
                          >
                            {estado.label}
                          </span>
                          {rechazadoPorAuxiliar && doc.sd_requiere_cambio && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-orange-100 text-orange-800">
                              Requiere cambio
                            </span>
                          )}
                        </div>
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
                        {archivoUrl ? (
                          <a
                            href={archivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            Ver archivo
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
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

                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(doc.fecha_carga)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                {enviando ? "Actualizando..." : "Actualizar e informar a Cartonera"}
              </button>
            </div>
          )}
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        title="¡Enviado!"
        message="Tu corrección fue enviada. Cartonera revisará los documentos actualizados."
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
