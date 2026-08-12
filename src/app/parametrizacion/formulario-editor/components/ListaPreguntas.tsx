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
                className={`group relative p-1.5 border border-gray-200 rounded-md hover:border-gray-300 hover:bg-gray-50 transition-colors duration-150 flex items-start gap-2 ${
                  !pregunta.fp_estado ? "opacity-60 grayscale" : ""
                }`}
              >
                <div className="flex-1 min-w-0 pr-16">
                  <p className="font-medium text-[11px] whitespace-pre-wrap break-words">
                    {pregunta.fp_descripcion}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-0.5 text-[10px] text-gray-600">
                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
                      {pregunta.fp_tipo}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${pregunta.fp_estado ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                    >
                      {pregunta.fp_estado ? "Activa" : "Inactiva"}
                    </span>
                    {pregunta.fp_requerida && (
                      <span className="bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                        Obligatorio
                      </span>
                    )}
                    {pregunta.fp_pregunta_padre_id && (
                      <span className="bg-violet-50 text-violet-700 border border-violet-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                        Dependiente
                      </span>
                    )}
                    {pregunta.fp_precarga_fuente &&
                      pregunta.fp_precarga_fuente !== "" && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          Precarga
                        </span>
                      )}
                  </div>

                  {pregunta.fp_tipo === TIPOS_PREGUNTA.TABLA && (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-[10px] font-semibold text-gray-500">
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
                                className="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-violet-100"
                              >
                                {columna.nombre}
                                {columna.tipo === "SI_NO" && " (Sí/No)"}
                                {columna.tipo === "MONEDA" && " (Dinero)"}
                                {columna.tipo === "NUMERO" && " (Solo números)"}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-500 italic">
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
                      <p className="text-[10px] font-semibold text-gray-500">
                        Opciones:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {pregunta.opciones &&
                        pregunta.opciones.length > 0 ? (
                          pregunta.opciones.map((opcion, idx) => (
                            <span
                              key={idx}
                              className="bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-sky-100"
                            >
                              {opcion.fpo_valor ||
                                opcion.op_descripcion}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-500 italic">
                            Sin opciones configuradas
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
                  <button
                    onClick={() => {
                      setErrorPregunta(null);
                      iniciarEdicionPregunta(pregunta);
                    }}
                    disabled={noEditable || formularioEdicionAbierto}
                    className="p-0.5 text-gray-400 hover:text-blue-600 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => eliminarPregunta(pregunta.fp_id)}
                    disabled={noEditable || formularioEdicionAbierto}
                    className="p-0.5 text-gray-400 hover:text-red-600 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                    className="p-0.5 text-gray-400 hover:text-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                    className="p-0.5 text-gray-400 hover:text-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
