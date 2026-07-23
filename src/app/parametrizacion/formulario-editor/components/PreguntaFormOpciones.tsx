"use client";

import { Edit2, Plus, Save, Trash2, X } from "lucide-react";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import type { FormPreguntaState, Opcion, Pregunta } from "../hooks/types";

interface PreguntaFormOpcionesProps {
  formPregunta: FormPreguntaState;
  editandoPregunta: number | null;
  nuevaPregunta: boolean;
  loading_opciones: boolean;
  opciones: Opcion[];
  opcionesNuevas: string[];
  opcionEditandoId: number | null;
  opcionEditandoValor: string;
  setOpcionEditandoValor: (value: string) => void;
  guardarEdicionOpcion: () => void;
  cancelarEdicionOpcion: () => void;
  iniciarEdicionOpcion: (opcion: Opcion) => void;
  eliminarOpcion: (opcionId: number) => void;
  obtenerPreguntasDependientesDeOpcion: (opcionId: number) => Pregunta[];
  eliminarOpcionNueva: (index: number) => void;
  nuevaOpcion: string;
  setNuevaOpcion: (value: string) => void;
  agregarOpcion: () => void;
}

export function PreguntaFormOpciones({
  formPregunta,
  editandoPregunta,
  nuevaPregunta,
  loading_opciones,
  opciones,
  opcionesNuevas,
  opcionEditandoId,
  opcionEditandoValor,
  setOpcionEditandoValor,
  guardarEdicionOpcion,
  cancelarEdicionOpcion,
  iniciarEdicionOpcion,
  eliminarOpcion,
  obtenerPreguntasDependientesDeOpcion,
  eliminarOpcionNueva,
  nuevaOpcion,
  setNuevaOpcion,
  agregarOpcion,
}: PreguntaFormOpcionesProps) {
  return (
    <>
  {/* Opciones SELECT / MULTISELECT */}
  {(editandoPregunta || nuevaPregunta) &&
    (formPregunta.tipo === TIPOS_PREGUNTA.SELECT ||
      formPregunta.tipo === TIPOS_PREGUNTA.MULTISELECT) && (
      <div className="border border-amber-300 bg-amber-50 rounded p-2">
        <h4 className="font-semibold text-xs mb-0.5">
          Opciones de respuesta:
        </h4>
        <p className="text-xs text-amber-800 mb-1">
          {formPregunta.tipo === TIPOS_PREGUNTA.SELECT
            ? "El usuario podra seleccionar solo una opcion."
            : "El usuario podra seleccionar varias opciones."}
        </p>
        {loading_opciones ? (
          <p className="text-xs text-gray-600">
            Cargando opciones...
          </p>
        ) : (
          <>
            {editandoPregunta && opciones.length === 0 && (
              <p className="text-xs text-gray-600 mb-1">
                No hay opciones aún
              </p>
            )}
            {!editandoPregunta && opcionesNuevas.length === 0 && (
              <p className="text-xs text-gray-600 mb-1">
                No hay opciones aún
              </p>
            )}
            {editandoPregunta && opciones.length > 0 && (
              <div className="space-y-1 mb-2">
                {opciones.map((opcion) => {
                  const dependientes =
                    obtenerPreguntasDependientesDeOpcion(
                      opcion.fpo_id,
                    );
                  const enEdicion =
                    opcionEditandoId === opcion.fpo_id;
                  return (
                    <div
                      key={opcion.fpo_id}
                      className="bg-white p-1 rounded border border-gray-200 text-xs"
                    >
                      <div className="flex items-center gap-1">
                        {enEdicion ? (
                          <input
                            type="text"
                            autoFocus
                            value={opcionEditandoValor}
                            onChange={(e) =>
                              setOpcionEditandoValor(
                                e.target.value,
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                guardarEdicionOpcion();
                              if (e.key === "Escape")
                                cancelarEdicionOpcion();
                            }}
                            className="flex-1 border border-amber-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        ) : (
                          <span className="font-medium text-xs flex-1">
                            {opcion.fpo_valor ||
                              opcion.op_descripcion}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-1 rounded ${opcion.fpo_estado ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {opcion.fpo_estado
                            ? "Activa"
                            : "Inactiva"}
                        </span>
                        {enEdicion ? (
                          <>
                            <button
                              onClick={guardarEdicionOpcion}
                              className="p-1 text-green-700 hover:bg-green-50 rounded"
                              title="Guardar"
                            >
                              <Save className="h-3 w-3" />
                            </button>
                            <button
                              onClick={cancelarEdicionOpcion}
                              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                              title="Cancelar"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                iniciarEdicionOpcion(opcion)
                              }
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() =>
                                eliminarOpcion(opcion.fpo_id)
                              }
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                      {dependientes.length > 0 && (
                        <p className="mt-0.5 text-xs text-amber-700">
                          ⚠️ De esta respuesta depende:{" "}
                          {dependientes
                            .map((p) => p.fp_descripcion)
                            .join(", ")}
                          {enEdicion &&
                            " — al guardar, se actualiza automáticamente para que la dependencia no se rompa."}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {!editandoPregunta && opcionesNuevas.length > 0 && (
              <div className="space-y-1 mb-2">
                {opcionesNuevas.map((opcion, index) => (
                  <div
                    key={`${opcion}-${index}`}
                    className="flex items-center gap-1 bg-white p-1 rounded border border-gray-200 text-xs"
                  >
                    <span className="font-medium text-xs flex-1">
                      {opcion}
                    </span>
                    <button
                      onClick={() => eliminarOpcionNueva(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1">
              <label
                htmlFor="nueva-opcion"
                className="block text-xs font-medium text-gray-700"
              >
                Agregar nueva opción
              </label>
              <div className="flex gap-1">
                <input
                  id="nueva-opcion"
                  type="text"
                  placeholder="Ej: Opción 1, Sí, No"
                  value={nuevaOpcion}
                  onChange={(e) => setNuevaOpcion(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") agregarOpcion();
                  }}
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={agregarOpcion}
                  className="px-2 py-1 bg-gradient-to-br from-green-500 to-green-600 text-white rounded hover:shadow-lg hover:from-green-600 hover:to-green-700 hover:scale-105 active:scale-95 text-xs flex items-center gap-0.5 font-semibold transition-all duration-200"
                >
                  <Plus className="h-3 w-3" />
                  Agregar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )}
    </>
  );
}
