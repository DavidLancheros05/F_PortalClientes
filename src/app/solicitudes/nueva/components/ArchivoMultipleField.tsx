"use client";

import { formularioRespuestasService } from "@/services/formulario-respuestas.service";
import { ConfirmModal } from "@/components/modals";
import { useUpload } from "@/context/UploadContext";
import { FileText, Upload, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { flushSync } from "react-dom";

interface ArchivoMultipleFieldProps {
  pregunta: any;
  respuestas: Record<number, any>;
  archivosExistentes: Record<number, any>;
  errors: Record<number, string>;
  readOnly: boolean;
  solicitudId?: number;
  hasError?: string;
  setRespuestas: Dispatch<SetStateAction<Record<number, any>>>;
  getArchivoPreviewUrl: (archivo: any) => string | null;
  setArchivosExistentes: Dispatch<SetStateAction<Record<number, any>>>;
  setSuccessMessage: (value: string) => void;
  setErrorMessage: (value: string) => void;
}

// Variante de ArchivoField para preguntas ARCHIVO con fp_maximo > 1 (admiten
// más de un archivo, ej. "Sistema Otro" en ¿Cual Sistema Tiene?). A
// propósito NO reutiliza la lógica de vigencia/reutilización de
// Cliente_archivo de ArchivoField: ese flujo asume un único documento por
// pregunta y mezclarlo con un array habría arriesgado esos casos, que hoy
// funcionan bien. Si en el futuro una pregunta multi-archivo necesita
// vigencia, conviene extraer esa parte a un hook compartido en vez de
// duplicarla acá.
export function ArchivoMultipleField({
  pregunta,
  respuestas,
  archivosExistentes,
  errors,
  readOnly,
  solicitudId,
  hasError,
  setRespuestas,
  getArchivoPreviewUrl,
  setArchivosExistentes,
  setSuccessMessage,
  setErrorMessage,
}: ArchivoMultipleFieldProps) {
  const maximoArchivos = Number(pregunta.fp_maximo) || 1;
  const existentes: any[] = Array.isArray(archivosExistentes[pregunta.fp_id]) ? archivosExistentes[pregunta.fp_id] : [];
  const pendientes: File[] = Array.isArray(respuestas[pregunta.fp_id]?.archivos)
    ? respuestas[pregunta.fp_id].archivos
    : [];
  const totalActual = existentes.length + pendientes.length;
  const alcanzoMaximo = totalActual >= maximoArchivos;

  const agregarArchivo = (file: File) => {
    setRespuestas((prev) => ({
      ...prev,
      [pregunta.fp_id]: {
        ...prev[pregunta.fp_id],
        archivos: [...(prev[pregunta.fp_id]?.archivos || []), file],
      },
    }));
  };

  // Mismo fix que ArchivoField/DocumentoTablaField/ImagenField:
  // setRespuestas dispara un re-render sincrono de todo el formulario, sin
  // esto la pantalla queda "pegada" sin ninguna señal de que algo está
  // pasando.
  const { startLoading, showSuccess } = useUpload();
  const procesarArchivoSeleccionado = (file: File) => {
    flushSync(() => startLoading("Cargando archivo..."));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        agregarArchivo(file);
        window.setTimeout(() => {
          showSuccess({
            title: "Archivo cargado",
            message:
              "El archivo quedó listo en el formulario. Puedes continuar agregando archivos o completando la solicitud.",
          });
        }, 250);
      });
    });
  };

  const EliminarArchivoPendiente = (index: number) => {
    setRespuestas((prev) => {
      const actuales: File[] = prev[pregunta.fp_id]?.archivos || [];
      return {
        ...prev,
        [pregunta.fp_id]: {
          ...prev[pregunta.fp_id],
          archivos: actuales.filter((_, i) => i !== index),
        },
      };
    });
  };

  const [saIdAEliminar, setSaIdAEliminar] = useState<number | null>(null);

  const eliminarArchivoExistente = (saId: number) => {
    setSaIdAEliminar(saId);
  };

  const confirmarEliminarArchivoExistente = async () => {
    if (saIdAEliminar === null) return;
    const saId = saIdAEliminar;
    setSaIdAEliminar(null);
    try {
      await formularioRespuestasService.eliminarArchivoRespuesta(solicitudId!, saId);
      setArchivosExistentes((prev) => {
        const restantes = (Array.isArray(prev[pregunta.fp_id]) ? prev[pregunta.fp_id] : []).filter(
          (a: any) => a.sa_id !== saId,
        );
        const next = { ...prev };
        if (restantes.length > 0) {
          next[pregunta.fp_id] = restantes;
        } else {
          delete next[pregunta.fp_id];
        }
        return next;
      });
      setSuccessMessage("Archivo eliminado");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error eliminando archivo:", err);
      setErrorMessage("Error eliminando archivo");
      setTimeout(() => setErrorMessage(""), 3000);
    }
  };

  const seleccionarArchivo = () => {
    const tempInput = document.createElement("input");
    tempInput.type = "file";
    tempInput.accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls";
    tempInput.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) procesarArchivoSeleccionado(file);
    };
    tempInput.click();
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-slate-900 leading-tight">
            {pregunta.fp_descripcion}
            {pregunta.fp_requerida && <span className="text-red-500 ml-1">*</span>}
          </p>
          <p className="text-xs text-slate-500">
            Puedes subir hasta {maximoArchivos} archivos ({totalActual}/{maximoArchivos})
          </p>
        </div>

        <div className="min-w-0 space-y-2 sm:border-l sm:border-slate-100 sm:pl-3">
          {existentes.map((archivo) => (
            <div key={archivo.sa_id} className="rounded-lg border border-blue-200 bg-blue-50/50 px-2 py-1.5">
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-start gap-1 min-w-0">
                  <FileText className="h-3 w-3 text-blue-700 mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-medium text-blue-900 break-words">{archivo.sa_nombre_original}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {(() => {
                    const rutaArchivo = getArchivoPreviewUrl(archivo);
                    if (!rutaArchivo) return null;
                    return (
                      <a
                        href={rutaArchivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs px-1.5 py-0.5 bg-white text-blue-700 rounded-md hover:bg-blue-100 transition-colors font-medium border border-blue-200">
                        Ver
                      </a>
                    );
                  })()}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => eliminarArchivoExistente(archivo.sa_id)}
                      className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-white text-red-700 rounded-md hover:bg-red-100 transition-colors font-medium border border-red-200">
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {pendientes.map((archivo, index) => (
            <div
              key={`${archivo.name}-${index}`}
              className="flex items-center justify-between gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-emerald-800 text-xs">
              <div className="flex items-center gap-1 min-w-0">
                <FileText className="h-3 w-3 flex-shrink-0" />
                <span className="break-words font-medium">{archivo.name}</span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => EliminarArchivoPendiente(index)}
                  className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-white text-red-700 rounded-md hover:bg-red-100 transition-colors font-medium border border-red-200 flex-shrink-0"
                  title="Eliminar archivo seleccionado (aún no se ha guardado)">
                  <X className="h-3 w-3" />
                  Eliminar
                </button>
              )}
            </div>
          ))}

          {!readOnly && !alcanzoMaximo && (
            <button
              type="button"
              onClick={seleccionarArchivo}
              className={`flex w-full items-center gap-2 rounded-lg border border-dashed px-2.5 py-2 text-xs font-medium transition-colors ${
                hasError
                  ? "border-red-300 bg-red-50/50 text-red-700 hover:bg-red-50"
                  : "border-blue-200 bg-blue-50/40 text-blue-700 hover:bg-blue-50"
              }`}>
              <Upload className="h-3.5 w-3.5 flex-shrink-0" />
              {totalActual === 0 ? "Seleccionar archivo" : "Agregar otro archivo"}
            </button>
          )}

          {errors[pregunta.fp_id] && <p className="text-xs text-red-600">{errors[pregunta.fp_id]}</p>}
        </div>
      </div>

      <ConfirmModal
        isOpen={saIdAEliminar !== null}
        title="Eliminar archivo"
        message="¿Eliminar archivo? No podrás recuperarlo."
        confirmText="Eliminar"
        isDangerous
        onConfirm={confirmarEliminarArchivoExistente}
        onCancel={() => setSaIdAEliminar(null)}
      />
    </div>
  );
}
