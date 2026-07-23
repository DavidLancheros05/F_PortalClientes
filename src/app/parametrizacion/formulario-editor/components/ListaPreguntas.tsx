"use client";

import {
  DndContext,
  closestCenter,
  type useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronUp, Edit2, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/modals";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import { SortableItem } from "./SortableItem";
import type { Pregunta } from "../hooks/types";

export interface ListaPreguntasProps {
  sensors: ReturnType<typeof useSensors>;
  handlePreguntaDragEnd: (event: any) => void;
  preguntasDeSeccion: Pregunta[];
  loading: boolean;
  noEditable: boolean;
  formularioEdicionAbierto: boolean;
  setErrorPregunta: (error: string | null) => void;
  iniciarEdicionPregunta: (pregunta: Pregunta) => void;
  eliminarPregunta: (preguntaId: number) => void;
  cambiarOrdenPregunta: (preguntaId: number, direccion: "arriba" | "abajo") => void;
  preguntaAEliminar: number | null;
  setPreguntaAEliminar: (id: number | null) => void;
  confirmarEliminarPregunta: () => void;
}

export function ListaPreguntas({
  sensors,
  handlePreguntaDragEnd,
  preguntasDeSeccion,
  loading,
  noEditable,
  formularioEdicionAbierto,
  setErrorPregunta,
  iniciarEdicionPregunta,
  eliminarPregunta,
  cambiarOrdenPregunta,
  preguntaAEliminar,
  setPreguntaAEliminar,
  confirmarEliminarPregunta,
}: ListaPreguntasProps) {
  return (
    <>
  {/* Lista de preguntas */}
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragEnd={handlePreguntaDragEnd}
  >
    <SortableContext
      items={preguntasDeSeccion.map((p) => `pregunta-${p.fp_id}`)}
      strategy={verticalListSortingStrategy}
    >
      <div className="flex-1 overflow-y-auto space-y-1">
        {loading ? (
          <p className="text-gray-500 text-center py-4 text-xs animate-pulse">
            Cargando preguntas...
          </p>
        ) : preguntasDeSeccion.length === 0 ? (
          <p className="text-gray-500 text-center py-4 text-xs">
            No hay preguntas en esta sección
          </p>
        ) : (
          preguntasDeSeccion.map((pregunta, index) => (
            <SortableItem
              key={pregunta.fp_id}
              id={`pregunta-${pregunta.fp_id}`}
              disabled={noEditable}
            >
              <div
                className={`p-1.5 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md transition-all duration-200 flex items-start justify-between gap-2 ${
                  !pregunta.fp_estado ? "opacity-60 grayscale" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs whitespace-pre-wrap break-words">
                    {pregunta.fp_descripcion}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-0.5 text-xs text-gray-600">
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                      {pregunta.fp_tipo}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs ${pregunta.fp_estado ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                    >
                      {pregunta.fp_estado ? "Activa" : "Inactiva"}
                    </span>
                    {pregunta.fp_requerida && (
                      <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-semibold">
                        📌 Obligatorio
                      </span>
                    )}
                    {pregunta.fp_pregunta_padre_id && (
                      <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs font-semibold">
                        🔗 Dependiente
                      </span>
                    )}
                    {pregunta.fp_precarga_fuente &&
                      pregunta.fp_precarga_fuente !== "" && (
                        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-semibold">
                          📦 Precarga
                        </span>
                      )}
                  </div>

                  {pregunta.fp_tipo === TIPOS_PREGUNTA.TABLA && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs font-semibold text-purple-700">
                        Columnas:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          let columnas: { nombre: string; tipo: string }[] = [];
                          try {
                            const parsed = pregunta.fp_tabla_columnas
                              ? JSON.parse(pregunta.fp_tabla_columnas)
                              : [];
                            columnas = Array.isArray(parsed)
                              ? parsed.map((c: unknown) =>
                                  typeof c === "string"
                                    ? { nombre: c, tipo: "TEXTO" }
                                    : (c as { nombre: string; tipo: string }),
                                )
                              : [];
                          } catch {
                            columnas = [];
                          }
                          return columnas.length > 0 ? (
                            columnas.map((columna, idx) => (
                              <span
                                key={idx}
                                className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs border border-purple-200"
                              >
                                {columna.nombre}
                                {columna.tipo === "SI_NO" && " (Sí/No)"}
                                {columna.tipo === "MONEDA" && " (Dinero)"}
                                {columna.tipo === "NUMERO" && " (Solo números)"}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-500 italic">
                              Sin columnas configuradas
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {[
                    TIPOS_PREGUNTA.SELECT,
                    TIPOS_PREGUNTA.MULTISELECT,
                  ].includes(pregunta.fp_tipo as any) && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs font-semibold text-blue-700">
                        Opciones:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {pregunta.opciones &&
                        pregunta.opciones.length > 0 ? (
                          pregunta.opciones.map((opcion, idx) => (
                            <span
                              key={idx}
                              className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs border border-blue-200"
                            >
                              {opcion.fpo_valor ||
                                opcion.op_descripcion}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 italic">
                            Sin opciones configuradas
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      setErrorPregunta(null);
                      iniciarEdicionPregunta(pregunta);
                    }}
                    disabled={noEditable || formularioEdicionAbierto}
                    className="p-1 text-blue-600 hover:bg-blue-50 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => eliminarPregunta(pregunta.fp_id)}
                    disabled={noEditable || formularioEdicionAbierto}
                    className="p-1 text-red-600 hover:bg-red-50 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() =>
                      cambiarOrdenPregunta(pregunta.fp_id, "arriba")
                    }
                    disabled={
                      noEditable ||
                      index === 0 ||
                      formularioEdicionAbierto
                    }
                    className="p-1 text-gray-600 hover:bg-gray-100 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() =>
                      cambiarOrdenPregunta(pregunta.fp_id, "abajo")
                    }
                    disabled={
                      noEditable ||
                      index === preguntasDeSeccion.length - 1 ||
                      formularioEdicionAbierto
                    }
                    className="p-1 text-gray-600 hover:bg-gray-100 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </SortableItem>
          ))
        )}
      </div>
    </SortableContext>
  </DndContext>

      <ConfirmModal
        isOpen={preguntaAEliminar !== null}
        title="Eliminar pregunta"
        message="¿Estás seguro de que deseas eliminar esta pregunta? Se eliminarán sus respuestas y opciones asociadas."
        confirmText="Eliminar"
        isDangerous
        onConfirm={confirmarEliminarPregunta}
        onCancel={() => setPreguntaAEliminar(null)}
      />
    </>
  );
}
