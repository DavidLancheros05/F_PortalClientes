"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { TipoDocumentoRevision } from "@/services/admin/parametrizacion/documentos.types";

interface Props {
  tipoDocumentoId?: number;
}

const vacia = { revision: "", descripcionCambio: "", fecha: "" };

export default function RevisionesTable({ tipoDocumentoId }: Props) {
  const [revisiones, setRevisiones] = useState<TipoDocumentoRevision[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [nueva, setNueva] = useState(vacia);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!tipoDocumentoId) return;
    setCargando(true);
    setError("");
    documentosService
      .getRevisiones(tipoDocumentoId)
      .then(setRevisiones)
      .catch(() => setError("No se pudo cargar el historial de revisiones."))
      .finally(() => setCargando(false));
  }, [tipoDocumentoId]);

  const agregar = async () => {
    if (!tipoDocumentoId || !nueva.revision || !nueva.descripcionCambio || !nueva.fecha)
      return;
    setGuardando(true);
    try {
      const creada = await documentosService.createRevision(tipoDocumentoId, nueva);
      setRevisiones((prev) => [...prev, creada]);
      setNueva(vacia);
    } catch {
      setError("No se pudo agregar la revisión.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (tdrId: number) => {
    if (!tipoDocumentoId) return;
    try {
      await documentosService.deleteRevision(tipoDocumentoId, tdrId);
      setRevisiones((prev) => prev.filter((r) => r.tdrId !== tdrId));
    } catch {
      setError("No se pudo eliminar la revisión.");
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 space-y-3">
      <p className="text-xs font-semibold text-slate-700">
        Control de cambios (historial de revisiones)
      </p>
      <p className="text-xs text-slate-500">
        Tabla "Revisión / Descripción del Cambio / Fecha" que se imprime una
        sola vez, al final de la última página del PDF.
      </p>

      {!tipoDocumentoId ? (
        <p className="text-xs text-amber-700">
          Guardá el documento primero (botón "Guardar" de más abajo) para
          poder agregar su historial de revisiones.
        </p>
      ) : (
        <>
          {cargando && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando
              revisiones...
            </p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}

          {!cargando && revisiones.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold text-slate-700 w-20">
                      Revisión
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold text-slate-700">
                      Descripción del Cambio
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left font-semibold text-slate-700 w-32">
                      Fecha
                    </th>
                    <th className="border border-slate-200 px-2 py-1 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {revisiones.map((rev) => (
                    <tr key={rev.tdrId}>
                      <td className="border border-slate-200 px-2 py-1">
                        {rev.revision}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {rev.descripcionCambio}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {rev.fecha}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => eliminar(rev.tdrId)}
                          className="text-red-600 hover:bg-red-50 rounded p-0.5"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 md:grid-cols-[80px_1fr_140px_auto] items-end">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Revisión
              </label>
              <input
                type="text"
                value={nueva.revision}
                onChange={(e) => setNueva({ ...nueva, revision: e.target.value })}
                placeholder="Ej. 00"
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Descripción del cambio
              </label>
              <input
                type="text"
                value={nueva.descripcionCambio}
                onChange={(e) =>
                  setNueva({ ...nueva, descripcionCambio: e.target.value })
                }
                placeholder="Ej. Emisión"
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-600">
                Fecha
              </label>
              <input
                type="date"
                value={nueva.fecha}
                onChange={(e) => setNueva({ ...nueva, fecha: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              type="button"
              onClick={agregar}
              disabled={
                guardando || !nueva.revision || !nueva.descripcionCambio || !nueva.fecha
              }
              className="flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
