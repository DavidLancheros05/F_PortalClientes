"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import type { FormPreguntaState, Pregunta, Seccion } from "../hooks/types";

interface PreguntaFormLimiteFilasProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
  editandoPregunta: number | null;
  nuevaPregunta: boolean;
  secciones: Seccion[];
  preguntas: Pregunta[];
}

export function PreguntaFormLimiteFilas({
  formPregunta,
  setFormPregunta,
  editandoPregunta,
  nuevaPregunta,
  secciones,
  preguntas,
}: PreguntaFormLimiteFilasProps) {
  return (
    <>
  {/* Límite de filas TABLA */}
  {(editandoPregunta || nuevaPregunta) &&
    formPregunta.tipo === TIPOS_PREGUNTA.TABLA && (
      <div className="border border-indigo-300 bg-indigo-50 rounded p-2 space-y-1.5">
        <h4 className="font-semibold text-xs mb-0.5">
          Límite de filas
        </h4>

        <label className="flex items-center gap-1 p-1.5 bg-white rounded border border-indigo-200 cursor-pointer hover:bg-indigo-100 text-xs">
          <input
            type="radio"
            name="tabla-limite-modo"
            checked={formPregunta.tabla_limite_modo === "SIN_LIMITE"}
            onChange={() =>
              setFormPregunta({
                ...formPregunta,
                tabla_limite_modo: "SIN_LIMITE",
              })
            }
            className="w-4 h-4 accent-indigo-600"
          />
          <span className="font-medium text-gray-800">
            Sin límite
          </span>
        </label>

        <label className="flex items-center gap-1 p-1.5 bg-white rounded border border-indigo-200 cursor-pointer hover:bg-indigo-100 text-xs">
          <input
            type="radio"
            name="tabla-limite-modo"
            checked={formPregunta.tabla_limite_modo === "FIJO"}
            onChange={() =>
              setFormPregunta({
                ...formPregunta,
                tabla_limite_modo: "FIJO",
              })
            }
            className="w-4 h-4 accent-indigo-600"
          />
          <span className="font-medium text-gray-800">
            Número fijo de filas
          </span>
        </label>
        {formPregunta.tabla_limite_modo === "FIJO" && (
          <input
            type="number"
            min={1}
            placeholder="Máximo de filas"
            value={formPregunta.tabla_limite_fijo}
            onChange={(e) =>
              setFormPregunta({
                ...formPregunta,
                tabla_limite_fijo: e.target.value,
              })
            }
            className="ml-5 border border-indigo-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        )}

        <label className="flex items-center gap-1 p-1.5 bg-white rounded border border-indigo-200 cursor-pointer hover:bg-indigo-100 text-xs">
          <input
            type="radio"
            name="tabla-limite-modo"
            checked={formPregunta.tabla_limite_modo === "CONDICIONAL"}
            onChange={() =>
              setFormPregunta({
                ...formPregunta,
                tabla_limite_modo: "CONDICIONAL",
              })
            }
            className="w-4 h-4 accent-indigo-600"
          />
          <span className="font-medium text-gray-800">
            Depende de otra pregunta
          </span>
        </label>

        {formPregunta.tabla_limite_modo === "CONDICIONAL" && (
          <div className="ml-5 space-y-1.5 p-1.5 bg-white rounded border border-indigo-200">
            <div className="space-y-0.5">
              <label className="block text-xs font-semibold text-indigo-900 leading-tight">
                Sección de la pregunta{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formPregunta.tabla_limite_seccion_id ?? ""}
                onChange={(e) =>
                  setFormPregunta({
                    ...formPregunta,
                    tabla_limite_seccion_id: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                    tabla_limite_pregunta_id: null,
                  })
                }
                className="w-full border border-indigo-200 rounded px-2 py-1 text-xs bg-white"
              >
                <option value="">Seleccione sección</option>
                {secciones.map((seccion) => (
                  <option
                    key={seccion.fs_id || seccion.seccion_id}
                    value={seccion.fs_id || seccion.seccion_id}
                  >
                    {seccion.fs_orden || seccion.seccion_orden}.{" "}
                    {seccion.fs_nombre || seccion.seccion_nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-0.5">
              <label className="block text-xs font-semibold text-indigo-900 leading-tight">
                Pregunta que determina el límite{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formPregunta.tabla_limite_pregunta_id ?? ""}
                onChange={(e) =>
                  setFormPregunta({
                    ...formPregunta,
                    tabla_limite_pregunta_id: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                className="w-full border border-indigo-200 rounded px-2 py-1 text-xs bg-white disabled:bg-gray-100"
                disabled={!formPregunta.tabla_limite_seccion_id}
              >
                <option value="">Seleccione pregunta</option>
                {preguntas
                  .filter(
                    (p) =>
                      p.seccion_id ===
                        formPregunta.tabla_limite_seccion_id &&
                      p.fp_id !== editandoPregunta,
                  )
                  .map((p) => (
                    <option key={p.fp_id} value={p.fp_id}>
                      {p.fp_descripcion}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-indigo-900">
                Reglas (valor de la respuesta → límite):
              </p>
              {formPregunta.tabla_limite_reglas.length === 0 && (
                <p className="text-xs text-gray-600">
                  Sin reglas todavía — mientras tanto actúa como sin
                  límite.
                </p>
              )}
              {formPregunta.tabla_limite_reglas.map((regla, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-indigo-50 p-1 rounded border border-indigo-100"
                >
                  <input
                    type="text"
                    placeholder="Ej: No"
                    value={regla.valor}
                    onChange={(e) => {
                      const nuevas = [
                        ...formPregunta.tabla_limite_reglas,
                      ];
                      nuevas[index] = {
                        ...nuevas[index],
                        valor: e.target.value,
                      };
                      setFormPregunta({
                        ...formPregunta,
                        tabla_limite_reglas: nuevas,
                      });
                    }}
                    className="flex-1 border border-indigo-200 rounded px-1 py-0.5 text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Vacío = sin límite"
                    value={regla.limite}
                    onChange={(e) => {
                      const nuevas = [
                        ...formPregunta.tabla_limite_reglas,
                      ];
                      nuevas[index] = {
                        ...nuevas[index],
                        limite: e.target.value,
                      };
                      setFormPregunta({
                        ...formPregunta,
                        tabla_limite_reglas: nuevas,
                      });
                    }}
                    className="w-32 border border-indigo-200 rounded px-1 py-0.5 text-xs"
                  />
                  <button
                    onClick={() => {
                      const nuevas =
                        formPregunta.tabla_limite_reglas.filter(
                          (_, i) => i !== index,
                        );
                      setFormPregunta({
                        ...formPregunta,
                        tabla_limite_reglas: nuevas,
                      });
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setFormPregunta({
                    ...formPregunta,
                    tabla_limite_reglas: [
                      ...formPregunta.tabla_limite_reglas,
                      { valor: "", limite: "" },
                    ],
                  })
                }
                className="px-2 py-1 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded hover:shadow-lg hover:from-indigo-600 hover:to-indigo-700 text-xs flex items-center gap-0.5 font-semibold transition-all duration-200"
              >
                <Plus className="h-3 w-3" />
                Agregar regla
              </button>
              <p className="text-xs text-gray-500">
                Si la respuesta de esa pregunta no coincide con
                ninguna regla, la tabla queda sin límite.
              </p>
            </div>
          </div>
        )}
      </div>
    )}
    </>
  );
}
