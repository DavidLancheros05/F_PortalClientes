"use client";

import { formularioRespuestasService } from '@/services/formulario-respuestas.service';
import { AlertTriangle, Calendar, CheckCircle, FileText } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

interface ArchivoFieldProps {
  pregunta: any;
  respuestas: Record<number, any>;
  archivosExistentes: Record<number, any>;
  errors: Record<number, string>;
  readOnly: boolean;
  solicitudId?: number;
  hasError?: string;
  preguntaFechaAsociada?: any;
  shouldShowFechaAsociada: boolean;
  handleInputChange: (fp_id: number, value: any, tipo: string) => void;
  validateField: (fp_id: number, rules: any) => void;
  getValidationRules: (pregunta: any) => any;
  getArchivoPreviewUrl: (archivo: any) => string | null;
  setArchivosExistentes: Dispatch<SetStateAction<Record<number, any>>>;
  setSuccessMessage: (value: string) => void;
  setErrorMessage: (value: string) => void;
}

export function ArchivoField({
  pregunta,
  respuestas,
  archivosExistentes,
  errors,
  readOnly,
  solicitudId,
  hasError,
  preguntaFechaAsociada,
  shouldShowFechaAsociada,
  handleInputChange,
  validateField,
  getValidationRules,
  getArchivoPreviewUrl,
  setArchivosExistentes,
  setSuccessMessage,
  setErrorMessage,
}: ArchivoFieldProps) {
  return (
    <div className="space-y-2 rounded-lg border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-2 shadow-sm">
      <div className="flex items-center justify-between gap-1 rounded-lg border border-blue-100 bg-white/80 px-2 py-1">
        <p className="text-xs font-semibold text-blue-900">
          Documento y fecha
        </p>
        <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5">
          Mismo
        </span>
      </div>

      {archivosExistentes[pregunta.fp_id] && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-2 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-tight text-blue-700">
            Documento cargado
          </p>
          <div className="flex items-start justify-between gap-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-1">
                <FileText className="h-3 w-3 text-blue-700 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium text-blue-900 break-words">
                  {archivosExistentes[pregunta.fp_id].nombre_original}
                </p>
              </div>
              <p className="text-xs text-blue-700 mt-0.5">
                {(archivosExistentes[pregunta.fp_id].tamaño_bytes / 1024).toFixed(
                  2,
                )}{" "}
                KB
              </p>
            </div>
          </div>
          <div className="flex gap-1 pt-1 border-t border-blue-200">
            {(() => {
              const archivoExistente = archivosExistentes[pregunta.fp_id];
              const rutaArchivo = getArchivoPreviewUrl(archivoExistente);

              if (!rutaArchivo) return null;

              return (
                <a
                  href={rutaArchivo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 bg-white text-blue-700 rounded-md hover:bg-blue-100 transition-colors font-medium border border-blue-200"
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
                  className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 bg-white text-red-700 rounded-md hover:bg-red-100 transition-colors font-medium border border-red-200"
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
                  className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 bg-white text-slate-700 rounded-md hover:bg-slate-100 transition-colors font-medium border border-slate-300"
                >
                  Cambiar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {respuestas[pregunta.fp_id]?.nombre_archivo &&
        !archivosExistentes[pregunta.fp_id] && (
          <div className="flex items-center justify-between gap-1 p-2 bg-emerald-50/80 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
            <div className="flex items-center gap-1 min-w-0">
              <CheckCircle className="h-3 w-3 flex-shrink-0" />
              <span className="break-words font-medium">
                {respuestas[pregunta.fp_id]?.nombre_archivo}
              </span>
            </div>
            {respuestas[pregunta.fp_id]?.vista_previa_url && (
              <a
                href={respuestas[pregunta.fp_id]?.vista_previa_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 flex-shrink-0 text-xs px-1.5 py-0.5 bg-white text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors font-semibold border border-emerald-200"
              >
                Ver
              </a>
            )}
          </div>
        )}

      {!archivosExistentes[pregunta.fp_id] && (
        <div className="rounded-lg border border-dashed border-blue-200 bg-white p-2">
          <p className="text-xs font-semibold uppercase tracking-tight text-blue-700 mb-1">
            Cargar documento
          </p>
          <input
            id={`file-input-${pregunta.fp_id}`}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleInputChange(pregunta.fp_id, file, "ARCHIVO");
              }
            }}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
            className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
              hasError ? "border-red-500" : "border-blue-200"
            }`}
          />
        </div>
      )}

      {preguntaFechaAsociada && shouldShowFechaAsociada && (
        <div className="mt-1 p-2 bg-blue-50/60 border border-blue-200 rounded-lg">
          <p className="text-xs font-semibold uppercase tracking-tight text-blue-700 mb-1">
            Fecha del documento
          </p>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-blue-900">
            <Calendar className="h-3 w-3" />
            {preguntaFechaAsociada.fp_descripcion}
            {preguntaFechaAsociada.fp_requerida && (
              <span className="text-red-500 ml-0.5">*</span>
            )}
          </label>
          <input
            type="date"
            value={respuestas[preguntaFechaAsociada.fp_id]?.valor_fecha || ""}
            onChange={(e) =>
              handleInputChange(preguntaFechaAsociada.fp_id, e.target.value, "FECHA")
            }
            onBlur={() =>
              validateField(
                preguntaFechaAsociada.fp_id,
                getValidationRules(preguntaFechaAsociada),
              )
            }
            className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors[preguntaFechaAsociada.fp_id]
                ? "border-red-500"
                : "border-gray-300"
            }`}
          />
          <p className="text-xs text-blue-700 mt-1">
            Esta fecha corresponde al documento seleccionado.
          </p>
          {!readOnly && errors[preguntaFechaAsociada.fp_id] && (
            <div className="flex items-center gap-0.5 text-red-500 text-xs mt-1">
              <AlertTriangle className="h-3 w-3" />
              {errors[preguntaFechaAsociada.fp_id]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
