"use client";

import { formularioRespuestasService } from "@/services/formulario-respuestas.service";
import { LoadingModal } from "@/components/modals";
import { AlertTriangle, CheckCircle, FileText, Upload, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { useDocumentoVigencia } from "../hooks/useDocumentoVigencia";
import { CampoFechaVigencia } from "./CampoFechaVigencia";

interface ArchivoFieldProps {
  pregunta: any;
  respuestas: Record<number, any>;
  archivosExistentes: Record<number, any>;
  documentosCatalogoMap: Record<number, any>;
  errors: Record<number, string>;
  readOnly: boolean;
  solicitudId?: number;
  hasError?: string;
  preguntaFechaAsociada?: any;
  shouldShowFechaAsociada: boolean;
  handleInputChange: (fp_id: number, value: any, tipo: string) => void;
  setRespuestas: Dispatch<SetStateAction<Record<number, any>>>;
  validateField: (fp_id: number, rules: any) => void;
  getValidationRules: (pregunta: any) => any;
  getArchivoPreviewUrl: (archivo: any) => string | null;
  setArchivosExistentes: Dispatch<SetStateAction<Record<number, any>>>;
  setSuccessMessage: (value: string) => void;
  setErrorMessage: (value: string) => void;
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
}

export function ArchivoField({
  pregunta,
  respuestas,
  archivosExistentes,
  documentosCatalogoMap,
  errors,
  readOnly,
  solicitudId,
  hasError,
  preguntaFechaAsociada,
  shouldShowFechaAsociada,
  handleInputChange,
  setRespuestas,
  validateField,
  getValidationRules,
  getArchivoPreviewUrl,
  setArchivosExistentes,
  setSuccessMessage,
  setErrorMessage,
  calcularVigenciaDocumento,
  calcularEstadoAnioDocumento,
}: ArchivoFieldProps) {
  // shouldShowFechaAsociada solo gobierna la rama "pregunta hija" (fecha
  // vinculada manualmente); si no debe mostrarse, se trata como si no
  // existiera para que el hook caiga al criterio de
  // tdo_permite_vencimiento/regla_vigencia.
  const preguntaFechaActiva = shouldShowFechaAsociada
    ? preguntaFechaAsociada
    : undefined;

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
    preguntaFechaAsociada: preguntaFechaActiva,
    setRespuestas,
    calcularVigenciaDocumento,
    calcularEstadoAnioDocumento,
  });

  // handleInputChange("ARCHIVO") es sincrono, pero dispara un re-render de
  // TODO el formulario (puede tener 90+ preguntas) — sin este indicador la
  // pantalla se sentía "pegada" un instante tras elegir el archivo, sin
  // ninguna señal de que algo estaba pasando. flushSync fuerza el commit del
  // modal de inmediato (no depende de que React trate el evento de origen
  // como "discreto"); esperar dos frames con requestAnimationFrame garantiza
  // que ese commit ya se pintó antes de que el trabajo pesado bloquee el
  // hilo principal (ver mismo fix en DocumentoTablaField.tsx).
  const [procesandoArchivo, setProcesandoArchivo] = useState(false);
  const procesarArchivoSeleccionado = (file: File) => {
    flushSync(() => setProcesandoArchivo(true));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        handleInputChange(pregunta.fp_id, file, "ARCHIVO");
        setProcesandoArchivo(false);
      });
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/* Columna izquierda: qué documento es */}
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-semibold text-slate-900 leading-tight">
          {pregunta.fp_descripcion}
          {pregunta.fp_requerida && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </p>
        {documento?.tdo_descripcion && (
          <p className="text-xs text-slate-500 whitespace-pre-wrap break-words leading-relaxed">
            {documento.tdo_descripcion}
          </p>
        )}
      </div>

      {/* Columna derecha: cargar el archivo y su fecha */}
      <div className="min-w-0 space-y-2 sm:border-l sm:border-slate-100 sm:pl-3">
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
                      tempInput.accept =
                        ".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls";
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
          <div className="flex items-center justify-between gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-800 text-xs">
            <div className="flex items-center gap-1 min-w-0">
              <CheckCircle className="h-3 w-3 flex-shrink-0" />
              <span className="break-words font-medium">
                {respuestas[pregunta.fp_id]?.nombre_archivo}
              </span>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  const vistaPreviaUrl =
                    respuestas[pregunta.fp_id]?.vista_previa_url;
                  if (vistaPreviaUrl) {
                    URL.revokeObjectURL(vistaPreviaUrl);
                  }
                  setRespuestas((prev) => {
                    const next = { ...prev };
                    next[pregunta.fp_id] = {
                      ...next[pregunta.fp_id],
                      archivo: undefined,
                      nombre_archivo: undefined,
                      vista_previa_url: undefined,
                    };
                    return next;
                  });
                }}
                className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-white text-red-700 rounded-md hover:bg-red-100 transition-colors font-medium border border-red-200 flex-shrink-0"
                title="Quitar archivo seleccionado (aún no se ha guardado)"
              >
                <X className="h-3 w-3" />
                Quitar
              </button>
            )}
          </div>
        )}

      {!archivosExistentes[pregunta.fp_id] &&
        !respuestas[pregunta.fp_id]?.nombre_archivo &&
        !readOnly && (
        <button
          type="button"
          disabled={procesandoArchivo}
          onClick={() => {
            const tempInput = document.createElement("input");
            tempInput.type = "file";
            tempInput.accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls";
            tempInput.onchange = (event) => {
              const target = event.target as HTMLInputElement;
              const file = target.files?.[0];
              if (file) {
                procesarArchivoSeleccionado(file);
              }
            };
            tempInput.click();
          }}
          className={`flex w-full items-center gap-2 rounded-lg border border-dashed px-2.5 py-2 text-xs font-medium transition-colors disabled:opacity-60 ${
            hasError
              ? "border-red-300 bg-red-50/50 text-red-700 hover:bg-red-50"
              : "border-blue-200 bg-blue-50/40 text-blue-700 hover:bg-blue-50"
          }`}
        >
          <Upload className="h-3.5 w-3.5 flex-shrink-0" />
          Seleccionar archivo
        </button>
      )}

      {mostrarCampoFecha && (
        <>
          <CampoFechaVigencia
            fechaInputValue={fechaInputValue}
            hoy={hoy}
            esReglaAnio={esReglaAnio}
            vigenciaDias={vigenciaDias}
            documento={documento}
            resumenVigencia={resumenVigencia}
            resumenAnio={resumenAnio}
            preguntaFechaAsociada={preguntaFechaActiva}
            readOnly={readOnly}
            hasError={errors[preguntaFechaActiva?.fp_id]}
            onChange={(fecha) => {
              guardarFecha(fecha);
              if (preguntaFechaActiva) {
                validateField(
                  preguntaFechaActiva.fp_id,
                  getValidationRules(preguntaFechaActiva),
                );
              }
            }}
          />
          {!readOnly && preguntaFechaActiva && errors[preguntaFechaActiva.fp_id] && (
            <div className="flex items-center gap-0.5 text-red-500 text-xs mt-1">
              <AlertTriangle className="h-3 w-3" />
              {errors[preguntaFechaActiva.fp_id]}
            </div>
          )}
        </>
      )}
      </div>
    </div>

      <LoadingModal isOpen={procesandoArchivo} message="Cargando archivo..." />
    </div>
  );
}
