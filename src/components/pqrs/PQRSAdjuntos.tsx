"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Paperclip, Download, Loader, File as FileIcon } from "lucide-react";

interface Adjunto {
  pa_id: number;
  pa_nombre_original: string;
  pa_ruta?: string;
  pa_mime_type?: string;
  pa_tamano?: number;
  pa_fecha?: string;
}

interface PQRSAdjuntosProps {
  adjuntos: Adjunto[];
  pqrsEstado: string | { pe_id: number; pe_nombre: string; pe_codigo?: string };
  onSubirAdjunto: (file: File) => Promise<void>;
}

const MAX_TAMANO_BYTES = 10 * 1024 * 1024; // 10 MB

function formatearTamano(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PQRSAdjuntos({
  adjuntos,
  pqrsEstado,
  onSubirAdjunto,
}: PQRSAdjuntosProps) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getEstadoCodigo = () => {
    if (typeof pqrsEstado === "string") return pqrsEstado.toUpperCase();
    return (pqrsEstado?.pe_codigo || pqrsEstado?.pe_nombre || "").toUpperCase();
  };

  const cerrada = getEstadoCodigo() === "CERRADA" || getEstadoCodigo() === "CERRADO";

  const formatFecha = (fecha?: string) => {
    if (!fecha) return "";
    try {
      return format(new Date(fecha), "PPp", { locale: es });
    } catch {
      return fecha;
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_TAMANO_BYTES) {
      setError("El archivo supera el tamaño máximo permitido (10 MB).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    try {
      setError(null);
      setSubiendo(true);
      await onSubirAdjunto(file);
    } catch (err) {
      console.error("Error subiendo adjunto:", err);
      setError("No se pudo subir el archivo. Intenta de nuevo.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {adjuntos && adjuntos.length > 0 ? (
          adjuntos.map((adjunto) => (
            <div
              key={adjunto.pa_id}
              className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <FileIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {adjunto.pa_nombre_original}
                </p>
                <p className="text-xs text-gray-500">
                  {formatearTamano(adjunto.pa_tamano)}
                  {adjunto.pa_fecha && ` · ${formatFecha(adjunto.pa_fecha)}`}
                </p>
              </div>
              {adjunto.pa_ruta && (
                <a
                  href={adjunto.pa_ruta}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </a>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No hay archivos adjuntos aún</p>
          </div>
        )}
      </div>

      {!cerrada ? (
        <div className="pt-6 border-t border-gray-200">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Adjuntar archivo
          </label>
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              onChange={handleFileChange}
              disabled={subiendo}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            {subiendo && (
              <Loader className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Tamaño máximo: 10 MB.
          </p>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>
      ) : (
        <div className="pt-6 border-t border-gray-200">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-semibold">
              Esta PQRS está cerrada y no acepta más adjuntos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
