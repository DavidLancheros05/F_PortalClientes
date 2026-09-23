"use client";

import { formularioRespuestasService } from "@/services/formulario-respuestas.service";
import { ConfirmModal } from "@/components/modals";
import { useUpload } from "@/context/UploadContext";
import { ImageOff } from "lucide-react";
import { useState } from "react";
import { flushSync } from "react-dom";

interface ImagenFieldProps {
  pregunta: any;
  respuestas: Record<number, any>;
  archivosExistentes: Record<number, any>;
  hasError?: string;
  readOnly: boolean;
  solicitudId?: number;
  handleInputChange: (fp_id: number, value: any, tipo: string) => void;
  getArchivoPreviewUrl: (archivo: any) => string | null;
  setArchivosExistentes: (updater: (prev: Record<number, any>) => Record<number, any>) => void;
  setSuccessMessage: (value: string) => void;
  setErrorMessage: (value: string) => void;
}

export function ImagenField({
  pregunta,
  respuestas,
  archivosExistentes,
  hasError,
  readOnly,
  solicitudId,
  handleInputChange,
  getArchivoPreviewUrl,
  setArchivosExistentes,
  setSuccessMessage,
  setErrorMessage,
}: ImagenFieldProps) {
  const archivoExistente = archivosExistentes[pregunta.fp_id];
  const rutaExistente = archivoExistente ? getArchivoPreviewUrl(archivoExistente) : null;
  const previaNueva = respuestas[pregunta.fp_id]?.vista_previa_url;
  const imagenAMostrar = rutaExistente || (!archivoExistente ? previaNueva : null);

  // Mismo fix que ArchivoField/DocumentoTablaField: handleInputChange("ARCHIVO")
  // es sincrono y dispara un re-render de todo el formulario, sin esto la
  // pantalla queda "pegada" sin ninguna señal de que algo está pasando.
  const { startLoading, showSuccess } = useUpload();
  const procesarArchivoSeleccionado = (file: File) => {
    flushSync(() => startLoading("Cargando imagen..."));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        handleInputChange(pregunta.fp_id, file, "ARCHIVO");
        window.setTimeout(() => {
          showSuccess({
            title: "Imagen cargada",
            message: "La imagen quedó lista en el formulario. Puedes continuar completando la solicitud.",
          });
        }, 250);
      });
    });
  };

  const [confirmarEliminarImagen, setConfirmarEliminarImagen] = useState(false);
  const handleEliminarImagen = async () => {
    setConfirmarEliminarImagen(false);
    try {
      await formularioRespuestasService.eliminarArchivoRespuesta(solicitudId!, archivoExistente.sa_id);
      setArchivosExistentes((prev) => {
        const newMap = { ...prev };
        delete newMap[pregunta.fp_id];
        return newMap;
      });
      setSuccessMessage("Imagen eliminada");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error eliminando imagen:", err);
      setErrorMessage("Error eliminando imagen");
      setTimeout(() => setErrorMessage(""), 3000);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-brand-600/10 bg-gradient-to-br from-white to-brand-600/5 p-2 shadow-sm">
      {imagenAMostrar ? (
        <div className="rounded-lg border border-brand-600/20 bg-brand-600/5 p-2 space-y-2">
          <div className="flex items-center justify-center rounded-lg border border-brand-600/10 bg-white p-2">
            <img
              src={imagenAMostrar}
              alt={pregunta.fp_descripcion}
              className="max-h-40 max-w-full object-contain rounded"
            />
          </div>
          {!readOnly && (
            <div className="flex gap-1 pt-1 border-t border-brand-600/20">
              {archivoExistente && (
                <button
                  type="button"
                  onClick={() => setConfirmarEliminarImagen(true)}
                  className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 bg-white text-red-700 rounded-md hover:bg-red-100 transition-colors font-medium border border-red-200">
                  Eliminar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const tempInput = document.createElement("input");
                  tempInput.type = "file";
                  tempInput.accept = "image/*";
                  tempInput.onchange = (event) => {
                    const target = event.target as HTMLInputElement;
                    const file = target.files?.[0];
                    if (file) {
                      procesarArchivoSeleccionado(file);
                    }
                  };
                  tempInput.click();
                }}
                className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 bg-white text-slate-700 rounded-md hover:bg-slate-100 transition-colors font-medium border border-slate-300">
                Cambiar imagen
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-brand-600/20 bg-white p-3">
          <div className="flex flex-col items-center justify-center gap-1 text-center mb-2">
            <ImageOff className="h-5 w-5 text-brand-600/30" />
            <p className="text-xs font-semibold uppercase tracking-tight text-brand-600">Cargar imagen</p>
          </div>
          <input
            id={`imagen-input-${pregunta.fp_id}`}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                procesarArchivoSeleccionado(file);
              }
            }}
            accept="image/*"
            className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-brand-600/5 file:text-brand-600 hover:file:bg-brand-600/10 ${
              hasError ? "border-red-500" : "border-brand-600/20"
            }`}
          />
        </div>
      )}

      <ConfirmModal
        isOpen={confirmarEliminarImagen}
        title="Eliminar imagen"
        message="¿Eliminar imagen? No podrás recuperarla."
        confirmText="Eliminar"
        isDangerous
        onConfirm={handleEliminarImagen}
        onCancel={() => setConfirmarEliminarImagen(false)}
      />
    </div>
  );
}
