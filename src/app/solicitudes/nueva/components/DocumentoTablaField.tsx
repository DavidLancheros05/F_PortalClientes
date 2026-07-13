"use client";

import { formularioRespuestasService } from "@/services/formulario-respuestas.service";
import { generarPlantillaDocumentoPdf } from "@/lib/carta-pdf.util";
import { solicitudesService } from "@/services/solicitudes.service";
import { CheckCircle, Download, FileText } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { useDocumentoVigencia } from "../hooks/useDocumentoVigencia";
import { CampoFechaVigencia } from "./CampoFechaVigencia";

interface DocumentoTablaFieldProps {
  pregunta: any;
  respuestas: Record<number, any>;
  archivosExistentes: Record<number, any>;
  documentosCatalogoMap: Record<number, any>;
  readOnly: boolean;
  solicitudId?: number;
  hasError?: string;
  rules: any;
  preguntaFechaAsociada?: any;
  handleInputChange: (fp_id: number, value: any, tipo: string) => void;
  setRespuestas: Dispatch<SetStateAction<Record<number, any>>>;
  setArchivosExistentes: Dispatch<SetStateAction<Record<number, any>>>;
  setSuccessMessage: (value: string) => void;
  setErrorMessage: (value: string) => void;
  validateField: (fp_id: number, rules: any) => void;
  getArchivoPreviewUrl: (archivo: any) => string | null;
  getOpcionDocumentoFija: (pregunta: any) => any;
  calcularVigenciaDocumento: (
    fechaEmision?: string,
    vigenciaDias?: number | null,
  ) => { diasRestantes: number; fechaVencimiento: Date } | null;
  calcularEstadoAnioDocumento: (
    fechaEmision?: string,
    aniosAtrasPermitidos?: number | null,
  ) => {
    valido: boolean;
    anioDocumento: number;
    anioMinimo: number;
    anioMaximo: number;
  } | null;
  representanteLegal: { nombre: string; identificacion: string } | null;
  clienteInfo: { nombre: string; nit: string };
  numeroSolicitud: string | null;
}

export function DocumentoTablaField({
  pregunta,
  respuestas,
  archivosExistentes,
  documentosCatalogoMap,
  readOnly,
  solicitudId,
  hasError,
  rules,
  preguntaFechaAsociada,
  handleInputChange,
  setRespuestas,
  setArchivosExistentes,
  setSuccessMessage,
  setErrorMessage,
  validateField,
  getArchivoPreviewUrl,
  getOpcionDocumentoFija,
  calcularVigenciaDocumento,
  calcularEstadoAnioDocumento,
  representanteLegal,
  clienteInfo,
  numeroSolicitud,
}: DocumentoTablaFieldProps) {
  const opcionFija = getOpcionDocumentoFija(pregunta);
  // El tipo de documento ya queda determinado por fp_tipo_documento_id
  // (el vínculo al catálogo), sin importar si además existe una fila en
  // Formulario_pregunta_opcion. El selector manual solo debe aparecer
  // para preguntas de documento genéricas, sin catálogo vinculado.
  const {
    documento,
    vigenciaDias,
    esReglaAnio,
    fechaInputValue,
    hoy,
    resumenVigencia,
    resumenAnio,
    mostrarCampoFecha,
    guardarFecha,
  } = useDocumentoVigencia({
    pregunta,
    respuestas,
    archivosExistentes,
    documentosCatalogoMap,
    preguntaFechaAsociada,
    setRespuestas,
    calcularVigenciaDocumento,
    calcularEstadoAnioDocumento,
  });
  const tipoDocumentoFijo = opcionFija?.op_descripcion || documento?.tdo_nombre;
  const archivoExistente = archivosExistentes[pregunta.fp_id];

  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);

  const handleDescargarPlantilla = async () => {
    if (documento?.tdo_tipo_plantilla !== "PDF_SOLICITUD" && !documento?.tdo_plantilla_contenido)
      return;
    setDescargandoPlantilla(true);
    try {
      if (documento?.tdo_tipo_plantilla === "PDF_SOLICITUD") {
        if (!solicitudId) return;
        const blob = await solicitudesService.downloadPdf(solicitudId);
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        await generarPlantillaDocumentoPdf({
          tdoNombre: tipoDocumentoFijo || documento!.tdo_nombre,
          tdoPlantillaContenido: documento!.tdo_plantilla_contenido!,
          clienteNombre: clienteInfo?.nombre,
          clienteNit: clienteInfo?.nit,
          numeroSolicitud,
          representanteLegalNombre: representanteLegal?.nombre,
          representanteLegalCedula: representanteLegal?.identificacion,
          formatoCodigo: documento?.tdo_formato_codigo,
          formatoCodigoSecundario: documento?.tdo_formato_codigo_secundario,
          revision: documento?.tdo_revision,
          paginasTotal: documento?.tdo_paginas_total,
        });
      }
    } catch (err) {
      console.error("Error generando plantilla:", err);
      setErrorMessage("Error generando la plantilla descargable");
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setDescargandoPlantilla(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900 leading-tight">
            {tipoDocumentoFijo || pregunta.fp_descripcion}
            {pregunta.fp_requerida && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </p>
          {documento?.tdo_descripcion && (
            <p className="mt-0.5 text-xs text-slate-600 whitespace-pre-wrap break-words leading-relaxed">
              {documento.tdo_descripcion}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="inline-flex items-center gap-0.5 rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-tight text-blue-700">
            <FileText className="h-2.5 w-2.5" />
            PDF
          </span>
          {pregunta.fp_requerida && (
            <span className="rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
              Oblig.
            </span>
          )}
        </div>
      </div>

      {documento?.tdo_tiene_plantilla &&
        (documento?.tdo_plantilla_contenido ||
          documento?.tdo_tipo_plantilla === "PDF_SOLICITUD") && (
        <button
          type="button"
          onClick={handleDescargarPlantilla}
          disabled={descargandoPlantilla}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-800 rounded-md hover:bg-amber-100 transition-colors font-medium border border-amber-200 disabled:opacity-60"
        >
          <Download className="h-3 w-3" />
          {descargandoPlantilla ? "Generando..." : "Descargar plantilla"}
        </button>
      )}

      {!tipoDocumentoFijo && !readOnly && (
        <div className="space-y-0.5">
          <label className="text-xs font-semibold uppercase tracking-tight text-slate-600">
            Tipo de documento
          </label>
          <select
            value={String(respuestas[pregunta.fp_id]?.valor_opcion_id || "")}
            onChange={(e) =>
              handleInputChange(
                pregunta.fp_id,
                Number(e.target.value) || e.target.value,
                "SELECT",
              )
            }
            onBlur={() => validateField(pregunta.fp_id, rules)}
            className={`w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasError ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Selecciona una opción</option>
            {pregunta.opciones?.map((opcion: any) => (
              <option key={opcion.op_id} value={String(opcion.op_id)}>
                {opcion.op_descripcion}
              </option>
            ))}
          </select>
        </div>
      )}

      {archivosExistentes[pregunta.fp_id] && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-2 py-1.5">
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-start gap-1 min-w-0">
              <FileText className="h-3 w-3 text-blue-700 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-medium text-blue-900 break-words">
                {archivosExistentes[pregunta.fp_id].sa_nombre_original}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {(() => {
                const rutaArchivo = getArchivoPreviewUrl(
                  archivosExistentes[pregunta.fp_id],
                );
                if (!rutaArchivo) return null;
                return (
                  <a
                    href={rutaArchivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs px-1.5 py-0.5 bg-white text-blue-700 rounded-md hover:bg-blue-100 transition-colors font-medium border border-blue-200"
                  >
                    Ver
                  </a>
                );
              })()}
              {!readOnly && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("¿Eliminar archivo? No podrás recuperarlo."))
                        return;
                      try {
                        await formularioRespuestasService.eliminarArchivoRespuesta(
                          solicitudId!,
                          archivosExistentes[pregunta.fp_id].sa_id,
                        );
                        setArchivosExistentes((prev) => {
                          const newMap = { ...prev };
                          delete newMap[pregunta.fp_id];
                          return newMap;
                        });
                        setSuccessMessage("Archivo eliminado");
                        setTimeout(() => setSuccessMessage(""), 3000);
                      } catch (err) {
                        console.error("Error eliminando archivo:", err);
                        setErrorMessage("Error eliminando archivo");
                        setTimeout(() => setErrorMessage(""), 3000);
                      }
                    }}
                    className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-white text-red-700 rounded-md hover:bg-red-100 transition-colors font-medium border border-red-200"
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tempInput = document.createElement("input");
                      tempInput.type = "file";
                      tempInput.accept = ".pdf,application/pdf";
                      tempInput.onchange = (event) => {
                        const target = event.target as HTMLInputElement;
                        const file = target.files?.[0];
                        if (file) {
                          handleInputChange(pregunta.fp_id, file, "ARCHIVO");
                        }
                      };
                      tempInput.click();
                    }}
                    className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-white text-slate-700 rounded-md hover:bg-slate-100 transition-colors font-medium border border-slate-300"
                  >
                    Cambiar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {respuestas[pregunta.fp_id]?.nombre_archivo &&
        !archivosExistentes[pregunta.fp_id] && (
          <div className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-800 text-xs">
            <CheckCircle className="h-3 w-3 flex-shrink-0" />
            <span className="break-words font-medium">
              {respuestas[pregunta.fp_id]?.nombre_archivo}
            </span>
          </div>
        )}

      {!archivosExistentes[pregunta.fp_id] && !readOnly && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-tight text-slate-600">
            Cargar archivo
          </p>
          <input
            id={`file-input-doc-${pregunta.fp_id}`}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // console.log('📄 [FRONTEND] Archivo seleccionado:', { fp_id: pregunta.fp_id, nombreArchivo: file?.name, tamaño: file?.size });
              if (file) {
                handleInputChange(pregunta.fp_id, file, "ARCHIVO");
              }
            }}
            accept=".pdf,application/pdf"
            className={`w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
              hasError ? "border-red-500" : "border-blue-200"
            }`}
          />
        </div>
      )}

      {mostrarCampoFecha && (
        <CampoFechaVigencia
          fechaInputValue={fechaInputValue}
          hoy={hoy}
          esReglaAnio={esReglaAnio}
          vigenciaDias={vigenciaDias}
          documento={documento}
          resumenVigencia={resumenVigencia}
          resumenAnio={resumenAnio}
          preguntaFechaAsociada={preguntaFechaAsociada}
          readOnly={readOnly}
          hasError={hasError}
          onChange={guardarFecha}
        />
      )}
    </div>
  );
}
