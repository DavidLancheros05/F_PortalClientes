"use client";

import { useEffect, useState } from "react";
import { Eye, Trash2, Upload, Users } from "lucide-react";
import {
  solicitudesService,
  type EvidenciaPersona,
} from "@/services/solicitudes.service";
import {
  LoadingModal,
  SuccessModal,
  ConfirmModal,
  ErrorModal,
} from "@/components/modals";

interface TablaPersonaConEvidenciaProps {
  solicitudId: number;
  fpId: number | null;
  titulo: string;
  columnas: string[];
  filas: Record<string, string>[];
  readOnly?: boolean;
}

/**
 * Tabla de solo lectura de una pregunta tipo TABLA del formulario (fila =
 * persona: representante legal, suplente o accionista), con una columna
 * adicional para que el Oficial de Cumplimiento adjunte un archivo de
 * evidencia por fila — un solo archivo por fila, reemplazable (subir uno
 * nuevo inactiva el anterior en el backend).
 */
export function TablaPersonaConEvidencia({
  solicitudId,
  fpId,
  titulo,
  columnas,
  filas,
  readOnly = false,
}: TablaPersonaConEvidenciaProps) {
  const [evidencias, setEvidencias] = useState<Map<number, EvidenciaPersona>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [subiendoFila, setSubiendoFila] = useState<number | null>(null);
  const [subidoOk, setSubidoOk] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [evidenciaAEliminar, setEvidenciaAEliminar] = useState<
    { filaIndex: number; sepId: number } | null
  >(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = () => {
    if (!fpId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    solicitudesService
      .getEvidenciasPersona(solicitudId, fpId)
      .then((data) => {
        const mapa = new Map<number, EvidenciaPersona>();
        (data || []).forEach((ev) => mapa.set(ev.sep_fila_index, ev));
        setEvidencias(mapa);
      })
      .catch((error) => {
        console.error("Error cargando evidencias de persona:", error);
        setEvidencias(new Map());
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId, fpId]);

  const handleSeleccionarArchivo = async (
    filaIndex: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !fpId) return;

    setSubiendoFila(filaIndex);
    try {
      const evidencia = await solicitudesService.subirEvidenciaPersona(
        solicitudId,
        fpId,
        filaIndex,
        file,
      );
      setEvidencias((prev) => {
        const next = new Map(prev);
        next.set(filaIndex, evidencia);
        return next;
      });
      setSubidoOk(true);
    } catch (error) {
      console.error("Error subiendo evidencia de persona:", error);
      setErrorMessage("No se pudo subir el archivo de evidencia.");
    } finally {
      setSubiendoFila(null);
    }
  };

  const handleEliminar = (filaIndex: number, sepId: number) => {
    setEvidenciaAEliminar({ filaIndex, sepId });
  };

  const handleConfirmEliminar = async () => {
    if (!evidenciaAEliminar) return;
    const { filaIndex, sepId } = evidenciaAEliminar;
    setEliminando(true);
    try {
      await solicitudesService.eliminarEvidenciaPersona(solicitudId, sepId);
      setEvidencias((prev) => {
        const next = new Map(prev);
        next.delete(filaIndex);
        return next;
      });
      setEvidenciaAEliminar(null);
    } catch (error) {
      console.error("Error eliminando evidencia de persona:", error);
      setErrorMessage("No se pudo eliminar el archivo de evidencia.");
      setEvidenciaAEliminar(null);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
        <Users size={16} className="text-blue-600" />
        {titulo}
      </h3>

      {!fpId || filas.length === 0 ? (
        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          Sin datos registrados por el cliente.
        </p>
      ) : loading ? (
        <div className="h-16 rounded-lg bg-gray-100 animate-pulse" />
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columnas.map((columna) => (
                  <th
                    key={columna}
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap"
                  >
                    {columna}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide whitespace-nowrap">
                  Evidencia
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filas.map((fila, filaIndex) => {
                const evidencia = evidencias.get(filaIndex);
                const subiendo = subiendoFila === filaIndex;
                return (
                  <tr key={filaIndex}>
                    {columnas.map((columna) => (
                      <td
                        key={columna}
                        className="px-3 py-2 text-gray-900 whitespace-nowrap"
                      >
                        {fila[columna] || "-"}
                      </td>
                    ))}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {evidencia ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={evidencia.sep_ruta_almacenamiento}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                            title={evidencia.sep_nombre_original}
                          >
                            <Eye size={12} />
                            Ver
                          </a>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() =>
                                handleEliminar(filaIndex, evidencia.sep_id)
                              }
                              title="Eliminar evidencia"
                              className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ) : readOnly ? (
                        <span className="text-xs text-gray-400">Sin evidencia</span>
                      ) : (
                        <label
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 border border-dashed border-blue-300 text-blue-700 rounded-md cursor-pointer hover:bg-blue-50 transition-colors ${
                            subiendo ? "opacity-50 pointer-events-none" : ""
                          }`}
                        >
                          <Upload size={12} />
                          {subiendo ? "Subiendo..." : "Adjuntar"}
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) =>
                              handleSeleccionarArchivo(filaIndex, e)
                            }
                            disabled={subiendo}
                          />
                        </label>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <LoadingModal
        isOpen={subiendoFila !== null}
        message="Subiendo evidencia..."
      />
      <SuccessModal
        isOpen={subidoOk}
        title="Evidencia subida"
        message="El archivo de evidencia quedó adjunto a la fila."
        actionText="Aceptar"
        onAction={() => setSubidoOk(false)}
      />

      <ConfirmModal
        isOpen={evidenciaAEliminar !== null}
        title="Eliminar evidencia"
        message="¿Eliminar esta evidencia? No podrás recuperarla."
        confirmText="Eliminar"
        isDangerous
        isLoading={eliminando}
        onConfirm={handleConfirmEliminar}
        onCancel={() => setEvidenciaAEliminar(null)}
      />

      <ErrorModal
        isOpen={!!errorMessage}
        message={errorMessage || ""}
        onAction={() => setErrorMessage(null)}
      />
    </div>
  );
}
