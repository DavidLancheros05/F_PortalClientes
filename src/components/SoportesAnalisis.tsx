"use client";

import { useEffect, useState } from "react";
import { Eye, Paperclip, Trash2, Upload } from "lucide-react";
import { solicitudesService } from "@/services/solicitudes.service";
import { LoadingModal } from "@/components/modals";

interface SoporteAnalisis {
  ssa_id: number;
  ssa_nombre_original: string;
  ssa_ruta_almacenamiento: string;
  ssa_tipo_mime?: string | null;
  ssa_tamano_bytes?: number | null;
  ssa_created_at?: string;
}

interface SoportesAnalisisProps {
  solicitudId: number;
  wetId: number;
  titulo?: string;
  readOnly?: boolean;
}

/**
 * Archivos que sube el personal interno (Oficial de Cumplimiento, etc.)
 * para respaldar su propia revisión — distinto de los documentos del
 * cliente (ver DocumentosCargadosSolicitud): estos se suben, ven y borran
 * desde esta misma pantalla de gestión.
 */
export function SoportesAnalisis({
  solicitudId,
  wetId,
  titulo = "Soportes de análisis",
  readOnly = false,
}: SoportesAnalisisProps) {
  const [soportes, setSoportes] = useState<SoporteAnalisis[]>([]);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  const cargar = () => {
    setLoading(true);
    solicitudesService
      .getSoportesAnalisis(solicitudId, wetId)
      .then((data) => setSoportes(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error("Error cargando soportes de análisis:", error);
        setSoportes([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId, wetId]);

  const handleSeleccionarArchivo = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setSubiendo(true);
    try {
      await solicitudesService.subirSoporteAnalisis(solicitudId, wetId, file);
      cargar();
    } catch (error) {
      console.error("Error subiendo soporte de análisis:", error);
      alert("No se pudo subir el archivo.");
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminar = async (ssaId: number) => {
    if (!confirm("¿Eliminar este soporte? No podrás recuperarlo.")) return;
    try {
      await solicitudesService.eliminarSoporteAnalisis(solicitudId, ssaId);
      setSoportes((prev) => prev.filter((s) => s.ssa_id !== ssaId));
    } catch (error) {
      console.error("Error eliminando soporte de análisis:", error);
      alert("No se pudo eliminar el archivo.");
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <Paperclip size={20} className="text-blue-600" />
        {titulo}
      </h2>

      {!readOnly && (
        <label
          className={`flex items-center justify-center gap-2 border border-dashed border-blue-300 rounded-lg px-4 py-3 text-sm font-medium text-blue-700 cursor-pointer hover:bg-blue-50 transition-colors ${
            subiendo ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <Upload size={16} />
          {subiendo ? "Subiendo..." : "Adjuntar archivo de soporte"}
          <input
            type="file"
            className="hidden"
            onChange={handleSeleccionarArchivo}
            disabled={subiendo}
          />
        </label>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : soportes.length === 0 ? (
        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          Sin soportes adjuntos todavía.
        </p>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {soportes.map((s) => (
            <div
              key={s.ssa_id}
              className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white hover:bg-gray-50"
            >
              <p className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">
                {s.ssa_nombre_original}
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={s.ssa_ruta_almacenamiento}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <Eye size={14} />
                  Ver
                </a>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleEliminar(s.ssa_id)}
                    title="Eliminar soporte"
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <LoadingModal isOpen={subiendo} message="Subiendo archivo de soporte..." />
    </div>
  );
}
