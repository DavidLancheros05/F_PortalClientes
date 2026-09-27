"use client";

import type { ReactNode } from "react";
import { DndContext, closestCenter, type useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ChevronDown, ChevronUp, Edit2, Lock, Trash2 } from "lucide-react";
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
  cambiarOrdenPregunta: (
    preguntaId: number,
    direccion: "arriba" | "abajo",
  ) => void;
  preguntaAEliminar: number | null;
  setPreguntaAEliminar: (id: number | null) => void;
  confirmarEliminarPregunta: () => void;
}

// Etiqueta de atributo de la pregunta: en color si aplica, en gris si no.
function Etiqueta({
  activa,
  color,
  title,
  children,
}: {
  activa: boolean;
  color: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-medium ${
        activa ? color : "bg-white text-slate-300 border-[#eef1f6]"
      }`}
    >
      {children}
    </span>
  );
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
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <p className="text-[#94a3b8] text-center py-4 text-xs animate-pulse">
                Cargando preguntas...
              </p>
            ) : preguntasDeSeccion.length === 0 ? (
              <p className="text-[#94a3b8] text-center py-8 text-sm">
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
                    className={`group relative px-4 py-3 bg-white border border-[#eef1f6] rounded-[14px] hover:border-brand-500/25 hover:bg-[#fafbfd] transition-colors duration-150 flex items-start gap-4 ${
                      !pregunta.fp_estado ? "opacity-60 grayscale" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[13px] leading-snug text-slate-800 whitespace-pre-wrap break-words">
                        {pregunta.fp_descripcion}
                      </p>
                      {pregunta.fp_tipo === TIPOS_PREGUNTA.TABLA && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-semibold text-[#94a3b8] mr-0.5">
                            Columnas:
                          </span>
                          {(() => {
                            let columnas: { nombre: string; tipo: string }[] =
                              [];
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
                                  {columna.tipo === "NUMERO" &&
                                    " (Solo números)"}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-gray-500 italic">
                                Sin columnas configuradas
                              </span>
                            );
                          })()}
                        </div>
                      )}

                      {[
                        TIPOS_PREGUNTA.SELECT,
                        TIPOS_PREGUNTA.MULTISELECT,
                      ].includes(pregunta.fp_tipo as any) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-semibold text-[#94a3b8] mr-0.5">
                            Opciones:
                          </span>
                          {pregunta.opciones && pregunta.opciones.length > 0 ? (
                            pregunta.opciones.map((opcion, idx) => (
                              <span
                                key={idx}
                                className="bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-sky-100"
                              >
                                {opcion.fpo_valor || opcion.op_descripcion}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-500 italic">
                              Sin opciones configuradas
                            </span>
                          )}
                        </div>
                      )}

                      {pregunta.fp_tipo === TIPOS_PREGUNTA.SELECT_TABLA && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px] text-[#94a3b8]">
                          <span className="font-semibold mr-0.5">Tabla:</span>
                          {pregunta.fp_catalogo_tabla ? (
                            <>
                              <span className="bg-teal-50 text-teal-700 border border-teal-100 px-1.5 py-0.5 rounded font-mono font-medium">
                                {pregunta.fp_catalogo_tabla}
                              </span>
                              {pregunta.fp_catalogo_columna && (
                                <>
                                  <span>muestra</span>
                                  <span className="bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-mono">
                                    {pregunta.fp_catalogo_columna}
                                  </span>
                                </>
                              )}
                              {pregunta.fp_catalogo_filtro_pregunta_id && (
                                <>
                                  <span>filtrada por</span>
                                  <span className="bg-violet-50 text-violet-700 border border-violet-100 px-1.5 py-0.5 rounded font-medium">
                                    {preguntasDeSeccion.find(
                                      (p) =>
                                        p.fp_id ===
                                        pregunta.fp_catalogo_filtro_pregunta_id,
                                    )?.fp_descripcion ?? "otra pregunta"}
                                    {pregunta.fp_catalogo_filtro_columna &&
                                      ` (${pregunta.fp_catalogo_filtro_columna})`}
                                  </span>
                                </>
                              )}
                            </>
                          ) : (
                            <span className="italic text-gray-500">
                              Sin tabla configurada
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Columna derecha: siempre las mismas etiquetas en el
                        mismo orden (en gris las que no aplican), así forman
                        columnas alineadas entre preguntas; luego las acciones. */}
                    <div className="flex items-start gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="w-[108px] text-center bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide truncate">
                          {pregunta.fp_tipo}
                        </span>
                        <Etiqueta
                          activa={!!pregunta.fp_estado}
                          color="bg-emerald-50 text-emerald-700 border-emerald-100"
                        >
                          Activa
                        </Etiqueta>
                        <Etiqueta
                          activa={!!pregunta.fp_requerida}
                          color="bg-rose-50 text-rose-700 border-rose-100"
                        >
                          Obligatorio
                        </Etiqueta>
                        <Etiqueta
                          activa={!!pregunta.fp_pregunta_padre_id}
                          color="bg-violet-50 text-violet-700 border-violet-100"
                        >
                          Dependiente
                        </Etiqueta>
                        <Etiqueta
                          activa={!!pregunta.fp_precarga_fuente}
                          color="bg-amber-50 text-amber-700 border-amber-100"
                        >
                          Precarga
                        </Etiqueta>
                        <Etiqueta
                          activa={!!pregunta.fp_protegida}
                          color="bg-slate-200 text-slate-700 border-slate-300"
                          title={
                            !pregunta.fp_protegida
                              ? undefined
                              : pregunta.fp_protegida_motivo === "siesa"
                                ? "Sus datos se envían a SIESA: no se puede cambiar el tipo de input ni eliminarla"
                                : pregunta.fp_protegida_motivo === "flujo_siesa"
                                  ? "Está ligada al flujo del portal y sus datos se envían a SIESA: no se puede cambiar el tipo de input ni eliminarla"
                                  : "Está ligada al flujo interno del portal: no se puede cambiar el tipo de input ni eliminarla"
                          }
                        >
                          <Lock className="h-2.5 w-2.5" />
                          Protegida
                        </Etiqueta>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => {
                            setErrorPregunta(null);
                            iniciarEdicionPregunta(pregunta);
                          }}
                          disabled={noEditable || formularioEdicionAbierto}
                          className="p-1 text-slate-400 hover:text-brand-600 hover:bg-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => eliminarPregunta(pregunta.fp_id)}
                          disabled={
                            noEditable ||
                            formularioEdicionAbierto ||
                            pregunta.fp_protegida
                          }
                          title={
                            pregunta.fp_protegida
                              ? "No se puede eliminar: es una pregunta protegida"
                              : undefined
                          }
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
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
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
