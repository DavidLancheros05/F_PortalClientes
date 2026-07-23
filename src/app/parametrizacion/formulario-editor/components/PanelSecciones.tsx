"use client";

import {
  DndContext,
  closestCenter,
  type useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronUp, Edit2, Plus, Save, Trash2, X } from "lucide-react";
import { ConfirmModal } from "@/components/modals";
import { SortableItem } from "./SortableItem";
import type { Pregunta, Seccion } from "../hooks/types";

interface PanelSeccionesProps {
  secciones: Seccion[];
  loading: boolean;
  seccionSeleccionada: number | null;
  setSeccionSeleccionada: (id: number | null) => void;
  preguntas: Pregunta[];
  readonly: boolean;
  formularioEdicionAbierto: boolean;
  editandoPregunta: number | null;
  nuevaPregunta: boolean;
  sensors: ReturnType<typeof useSensors>;
  handleSeccionDragEnd: (event: any) => void;
  nuevaSeccion: boolean;
  setNuevaSeccion: (value: boolean) => void;
  editandoSeccion: number | null;
  setEditandoSeccion: (id: number | null) => void;
  formSeccion: { nombre: string; descripcion: string; ocultaEnFormulario: boolean };
  setFormSeccion: (value: { nombre: string; descripcion: string; ocultaEnFormulario: boolean }) => void;
  guardarSeccion: () => void;
  iniciarEdicionSeccion: (seccion: Seccion) => void;
  eliminarSeccion: (seccionId: number) => void;
  cambiarOrdenSeccion: (seccionId: number, direccion: "arriba" | "abajo") => void;
  seccionAEliminar: number | null;
  setSeccionAEliminar: (id: number | null) => void;
  confirmarEliminarSeccion: () => void;
}

export function PanelSecciones({
  secciones,
  loading,
  seccionSeleccionada,
  setSeccionSeleccionada,
  preguntas,
  readonly,
  formularioEdicionAbierto,
  editandoPregunta,
  nuevaPregunta,
  sensors,
  handleSeccionDragEnd,
  nuevaSeccion,
  setNuevaSeccion,
  editandoSeccion,
  setEditandoSeccion,
  formSeccion,
  setFormSeccion,
  guardarSeccion,
  iniciarEdicionSeccion,
  eliminarSeccion,
  cambiarOrdenSeccion,
  seccionAEliminar,
  setSeccionAEliminar,
  confirmarEliminarSeccion,
}: PanelSeccionesProps) {
  return (
    <>
  {/* PANEL IZQUIERDO - SECCIONES */}
  <div className="w-1/3 min-h-0 bg-white rounded-xl shadow-lg p-3 flex flex-col overflow-hidden border-2 border-gray-100 hover:border-gray-200 transition-all duration-200">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold text-gray-900">📑 Secciones</h2>
      <button
        onClick={() => {
          setNuevaSeccion(true);
          setEditandoSeccion(null);
          setFormSeccion({ nombre: "", descripcion: "", ocultaEnFormulario: false });
        }}
        disabled={readonly || formularioEdicionAbierto}
        className="flex items-center gap-1 px-2 py-1 bg-gradient-to-br from-emerald-500 via-emerald-550 to-emerald-600 text-white font-medium text-xs rounded-lg hover:shadow-xl hover:from-emerald-600 hover:via-emerald-600 hover:to-emerald-700 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
      >
        <Plus className="h-3 w-3" />
        Nueva
      </button>
    </div>

    {/* Formulario nueva/editar sección */}
    {(nuevaSeccion || editandoSeccion) && (
      <div className="mb-2 p-2 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-xs text-emerald-900">
            {editandoSeccion ? "✏️ Editar Sección" : "✨ Nueva Sección"}
          </h3>
          <button
            onClick={() => {
              setNuevaSeccion(false);
              setEditandoSeccion(null);
            }}
            className="text-emerald-600 hover:bg-emerald-100 p-0.5 rounded-lg transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-1.5">
          <div>
            <label
              htmlFor="seccion-nombre"
              className="block text-xs font-semibold text-emerald-900 mb-1"
            >
              Nombre de la sección <span className="text-red-500">*</span>
            </label>
            <input
              id="seccion-nombre"
              type="text"
              placeholder="Ej: Datos de contacto"
              value={formSeccion.nombre}
              onChange={(e) =>
                setFormSeccion({ ...formSeccion, nombre: e.target.value })
              }
              className="w-full border border-emerald-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:shadow-lg bg-white transition-all"
            />
          </div>
          <div>
            <label
              htmlFor="seccion-descripcion"
              className="block text-xs font-semibold text-emerald-900 mb-1"
            >
              Descripción{" "}
              <span className="text-emerald-600 text-xs font-normal">
                (opcional)
              </span>
            </label>
            <textarea
              id="seccion-descripcion"
              placeholder="Ej: Información para contactar al cliente..."
              value={formSeccion.descripcion}
              onChange={(e) =>
                setFormSeccion({
                  ...formSeccion,
                  descripcion: e.target.value,
                })
              }
              className="w-full border border-emerald-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:shadow-lg bg-white transition-all resize-none"
              rows={2}
            />
          </div>
          <label className="flex items-center gap-1.5 p-1.5 bg-white rounded-lg border border-emerald-200 cursor-pointer hover:bg-emerald-50 transition-colors">
            <input
              type="checkbox"
              checked={formSeccion.ocultaEnFormulario}
              onChange={(e) =>
                setFormSeccion({
                  ...formSeccion,
                  ocultaEnFormulario: e.target.checked,
                })
              }
              className="w-3.5 h-3.5 rounded accent-emerald-600"
            />
            <span className="text-xs font-medium text-gray-800">
              Ocultar esta sección durante el diligenciamiento (sigue
              apareciendo en el PDF final)
            </span>
          </label>
          <button
            onClick={guardarSeccion}
            className="w-full px-2 py-1 bg-gradient-to-br from-emerald-500 via-emerald-550 to-emerald-600 text-white rounded hover:shadow-xl hover:from-emerald-600 hover:via-emerald-600 hover:to-emerald-700 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1 text-xs font-semibold transition-all duration-200"
          >
            <Save className="h-3 w-3" />
            Guardar
          </button>
        </div>
      </div>
    )}

    {/* Lista de secciones */}
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleSeccionDragEnd}
    >
      <SortableContext
        items={secciones.map((s) => `seccion-${s.fs_id || s.seccion_id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto space-y-1">
          {loading ? (
            <p className="text-gray-500 text-center py-4 text-xs animate-pulse">
              Cargando secciones...
            </p>
          ) : (
          secciones.map((seccion, index) => (
            <SortableItem
              key={seccion.fs_id || seccion.seccion_id}
              id={`seccion-${seccion.fs_id || seccion.seccion_id}`}
              disabled={readonly}
            >
              <div
                className={`p-1.5 border-2 rounded-lg transition-all duration-200 ${
                  editandoPregunta ||
                  nuevaPregunta ||
                  formularioEdicionAbierto
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                } ${
                  (seccion.fs_id || seccion.seccion_id) ===
                  seccionSeleccionada
                    ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-500 shadow-lg"
                    : "border-gray-200 hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30 bg-white"
                } ${
                  !(seccion.fs_activo !== false)
                    ? "opacity-60 grayscale"
                    : ""
                }`}
                onClick={() => {
                  if (
                    !editandoPregunta &&
                    !nuevaPregunta &&
                    !formularioEdicionAbierto
                  ) {
                    setSeccionSeleccionada(
                      (seccion.fs_id ?? seccion.seccion_id) || null,
                    );
                  }
                }}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-gray-900">
                      {seccion.fs_orden || seccion.seccion_orden}.{" "}
                      {seccion.fs_nombre || seccion.seccion_nombre}
                    </p>
                    {seccion.fs_descripcion ||
                      (seccion.seccion_descripcion && (
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                          {seccion.fs_descripcion ||
                            seccion.seccion_descripcion}
                        </p>
                      ))}
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">
                      <span className="inline-block bg-gray-100 px-1.5 py-0.5 rounded-full text-xs">
                        {
                          preguntas.filter(
                            (p) =>
                              p.seccion_id ===
                              (seccion.fs_id ?? seccion.seccion_id),
                          ).length
                        }{" "}
                        pregunta(s)
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-0.5 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        iniciarEdicionSeccion(seccion);
                      }}
                      disabled={readonly || formularioEdicionAbierto}
                      className="p-1 text-blue-600 hover:bg-blue-100 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarSeccion(seccion.fs_id ?? seccion.seccion_id);
                      }}
                      disabled={readonly || formularioEdicionAbierto}
                      className="p-1 text-red-600 hover:bg-red-100 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cambiarOrdenSeccion(seccion.fs_id ?? seccion.seccion_id, "arriba");
                      }}
                      disabled={
                        readonly ||
                        index === 0 ||
                        formularioEdicionAbierto
                      }
                      className="p-1 text-gray-600 hover:bg-gray-200 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cambiarOrdenSeccion(seccion.fs_id ?? seccion.seccion_id, "abajo");
                      }}
                      disabled={
                        readonly ||
                        index === secciones.length - 1 ||
                        formularioEdicionAbierto
                      }
                      className="p-1 text-gray-600 hover:bg-gray-200 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                    >
                      <ChevronDown className="h-3 w-3" />
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
  </div>

      <ConfirmModal
        isOpen={seccionAEliminar !== null}
        title="Eliminar sección"
        message="¿Estás seguro de que deseas eliminar esta sección? Se eliminarán sus preguntas y respuestas asociadas."
        confirmText="Eliminar"
        isDangerous
        onConfirm={confirmarEliminarSeccion}
        onCancel={() => setSeccionAEliminar(null)}
      />
    </>
  );
}
