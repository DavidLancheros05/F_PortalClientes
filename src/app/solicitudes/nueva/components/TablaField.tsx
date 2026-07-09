"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { FormularioPregunta, RespuestasState } from "../types";

interface TablaFieldProps {
  pregunta: FormularioPregunta;
  respuestas: RespuestasState;
  readOnly: boolean;
  handleInputChange: (fp_id: number, value: any, tipo: string) => void;
}

type FilaTabla = Record<string, string>;

function parseColumnas(fp_tabla_columnas?: string | null): string[] {
  if (!fp_tabla_columnas) return [];
  try {
    const parsed = JSON.parse(fp_tabla_columnas);
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

function parseFilas(valorTexto: string | undefined): FilaTabla[] {
  if (!valorTexto) return [];
  try {
    const parsed = JSON.parse(valorTexto);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function TablaField({
  pregunta,
  respuestas,
  readOnly,
  handleInputChange,
}: TablaFieldProps) {
  const columnas = useMemo(
    () => parseColumnas(pregunta.fp_tabla_columnas),
    [pregunta.fp_tabla_columnas],
  );

  const filas = parseFilas(respuestas[pregunta.fp_id]?.valor_texto);
  const filasVisibles = filas.length > 0 ? filas : [{}];

  const todasLasFilasCompletas = filasVisibles.every((fila) =>
    columnas.every((columna) => (fila[columna] || "").trim() !== ""),
  );

  const actualizarFilas = (nuevasFilas: FilaTabla[]) => {
    handleInputChange(pregunta.fp_id, JSON.stringify(nuevasFilas), "TABLA");
  };

  const actualizarCelda = (filaIndex: number, columna: string, valor: string) => {
    const nuevasFilas = filasVisibles.map((fila, idx) =>
      idx === filaIndex ? { ...fila, [columna]: valor } : fila,
    );
    actualizarFilas(nuevasFilas);
  };

  const agregarFila = () => {
    actualizarFilas([...filasVisibles, {}]);
  };

  const eliminarFila = (filaIndex: number) => {
    const nuevasFilas = filasVisibles.filter((_, idx) => idx !== filaIndex);
    actualizarFilas(nuevasFilas.length > 0 ? nuevasFilas : [{}]);
  };

  if (columnas.length === 0) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 shadow-sm">
        Esta pregunta tipo tabla no tiene columnas configuradas.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-md shadow-slate-200/60">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-blue-600 to-blue-700">
              {columnas.map((columna) => (
                <th
                  key={columna}
                  className="px-3 py-2.5 text-left font-semibold text-white tracking-wide first:rounded-tl-2xl"
                >
                  {columna}
                </th>
              ))}
              {!readOnly && (
                <th className="w-9 rounded-tr-2xl px-2 py-2.5"></th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filasVisibles.map((fila, filaIndex) => (
              <tr
                key={filaIndex}
                className="transition-colors hover:bg-blue-50/40"
              >
                {columnas.map((columna) => (
                  <td key={columna} className="p-1">
                    <input
                      type="text"
                      disabled={readOnly}
                      value={fila[columna] || ""}
                      onChange={(e) =>
                        actualizarCelda(filaIndex, columna, e.target.value)
                      }
                      className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-xs text-slate-700 transition-all focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:text-slate-400"
                    />
                  </td>
                ))}
                {!readOnly && (
                  <td className="text-center">
                    <button
                      type="button"
                      onClick={() => eliminarFila(filaIndex)}
                      disabled={filasVisibles.length === 1}
                      className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-1.5">
          <button
            type="button"
            onClick={agregarFila}
            disabled={!todasLasFilasCompletas}
            title={
              todasLasFilasCompletas
                ? undefined
                : "Completa todas las columnas de todas las filas antes de agregar otra"
            }
            className="flex items-center gap-1 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:scale-[1.02] hover:shadow-md hover:from-blue-600 hover:to-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-sm"
          >
            <Plus className="h-3 w-3" />
            Agregar fila
          </button>
          {!todasLasFilasCompletas && (
            <p className="mt-1 text-xs text-amber-700">
              Completa todas las columnas de todas las filas para poder agregar una nueva.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
