"use client";

import { DndContext, closestCenter, type useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronUp, Edit2, Plus, Save, Trash2, X } from "lucide-react";
import { ConfirmModal, ErrorModal, SuccessModal } from "@/components/modals";
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
  confirmarGuardarSeccion: () => void;
  guardandoSeccion: boolean;
  mostrarConfirmarGuardarSeccion: boolean;
  setMostrarConfirmarGuardarSeccion: (value: boolean) => void;
  successMessageSeccion: "creada" | "editada" | null;
  setSuccessMessageSeccion: (value: "creada" | "editada" | null) => void;
  errorMessageSeccion: string | null;
  setErrorMessageSeccion: (value: string | null) => void;
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
  confirmarGuardarSeccion,
  guardandoSeccion,
  mostrarConfirmarGuardarSeccion,
  setMostrarConfirmarGuardarSeccion,
  successMessageSeccion,
  setSuccessMessageSeccion,
  errorMessageSeccion,
  setErrorMessageSeccion,
  iniciarEdicionSeccion,
  eliminarSeccion,
  cambiarOrdenSeccion,
  seccionAEliminar,
  setSeccionAEliminar,
  confirmarEliminarSeccion,
}: PanelSeccionesProps) {
  const successTituloSeccion = successMessageSeccion === "creada" ? "Sección creada" : "Sección actualizada";
  const successTextoSeccion =
    successMessageSeccion === "creada"
      ? "La sección se creó correctamente."
      : "La sección se actualizó correctamente.";

  return (
    <>
      {/* PANEL IZQUIERDO - SECCIONES */}
      <div className="w-1/3 min-h-0 bg-white rounded-[22px] border border-[#e9ecf2] shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)] p-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-slate-800">
            Secciones <span className="ml-1 text-xs font-semibold text-[#94a3b8]">{secciones.length}</span>
          </h2>
          <button
            onClick={() => {
              setNuevaSeccion(true);
              setEditandoSeccion(null);
              setFormSeccion({ nombre: "", descripcion: "", ocultaEnFormulario: false });
            }}
            disabled={readonly || formularioEdicionAbierto}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-[10px] shadow-[0_4px_12px_rgba(0,61,153,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Nueva
          </button>
        </div>

        {/* Formulario nueva/editar sección */}
        {(nuevaSeccion || editandoSeccion) && (
          <div className="mb-3 p-3 bg-[#fafbfd] border border-brand-500/20 rounded-[14px]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-extrabold text-xs text-brand-600">
                {editandoSeccion ? "Editar sección" : "Nueva sección"}
              </h3>
              <button
                onClick={() => {
                  setNuevaSeccion(false);
                  setEditandoSeccion(null);
                }}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label htmlFor="seccion-nombre" className="block text-[10.5px] font-bold uppercase tracking-wide text-[#94a3b8] mb-1">
                  Nombre de la sección *
                </label>
                <input
                  id="seccion-nombre"
                  type="text"
                  placeholder="Ej: Datos de contacto"
                  value={formSeccion.nombre}
                  onChange={(e) => setFormSeccion({ ...formSeccion, nombre: e.target.value })}
                  className="w-full border border-[#eef1f6] rounded-[10px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="seccion-descripcion" className="block text-[10.5px] font-bold uppercase tracking-wide text-[#94a3b8] mb-1">
                  Descripción (opcional)
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
                  className="w-full border border-[#eef1f6] rounded-[10px] px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none"
                  rows={2}
                />
              </div>
              <label className="flex items-center gap-2 p-2 bg-white rounded-[10px] border border-[#eef1f6] cursor-pointer hover:bg-[#fafbfd] transition-colors">
                <input
                  type="checkbox"
                  checked={formSeccion.ocultaEnFormulario}
                  onChange={(e) =>
                    setFormSeccion({
                      ...formSeccion,
                      ocultaEnFormulario: e.target.checked,
                    })
                  }
                  className="w-3.5 h-3.5 rounded accent-brand-600"
                />
                <span className="text-xs text-slate-700">
                  Ocultar esta sección durante el diligenciamiento (sigue apareciendo en el PDF final)
                </span>
              </label>
              <button
                onClick={guardarSeccion}
                className="w-full px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-[10px] flex items-center justify-center gap-1.5 text-xs font-bold shadow-[0_4px_12px_rgba(0,61,153,0.2)] transition-colors">
                <Save className="h-3.5 w-3.5" />
                Guardar
              </button>
            </div>
          </div>
        )}

        {/* Lista de secciones */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSeccionDragEnd}>
          <SortableContext
            items={secciones.map((s) => `seccion-${s.fs_id || s.fp_fs_id}`)}
            strategy={verticalListSortingStrategy}>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {loading ? (
                <p className="text-[#94a3b8] text-center py-4 text-xs animate-pulse">Cargando secciones...</p>
              ) : (
                secciones.map((seccion, index) => (
                  <SortableItem
                    key={seccion.fs_id || seccion.fp_fs_id}
                    id={`seccion-${seccion.fs_id || seccion.fp_fs_id}`}
                    disabled={readonly}>
                    <div
                      className={`group relative px-3 py-2.5 border rounded-[12px] transition-all duration-200 ${
                        editandoPregunta || nuevaPregunta || formularioEdicionAbierto
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer"
                      } ${
                        (seccion.fs_id || seccion.fp_fs_id) === seccionSeleccionada
                          ? "bg-brand-500/5 border-brand-500/40 shadow-[inset_3px_0_0_var(--brand-600)]"
                          : "bg-white border-[#eef1f6] hover:border-brand-500/25 hover:bg-[#fafbfd]"
                      } ${!(seccion.fs_activo !== false) ? "opacity-60 grayscale" : ""}`}
                      onClick={() => {
                        if (!editandoPregunta && !nuevaPregunta && !formularioEdicionAbierto) {
                          setSeccionSeleccionada((seccion.fs_id ?? seccion.fp_fs_id) || null);
                        }
                      }}>
                      <div className="pr-16">
                        <p
                          className={`font-bold text-[12.5px] leading-snug ${
                            (seccion.fs_id || seccion.fp_fs_id) === seccionSeleccionada ? "text-brand-600" : "text-slate-800"
                          }`}>
                          {seccion.fs_orden || seccion.seccion_orden}. {seccion.fs_nombre || seccion.seccion_nombre}
                        </p>
                        {(seccion.fs_descripcion || seccion.seccion_descripcion) && (
                          <p className="text-[11.5px] text-slate-500 mt-0.5 line-clamp-1">
                            {seccion.fs_descripcion || seccion.seccion_descripcion}
                          </p>
                        )}
                        <p className="mt-1 text-[10.5px] font-semibold text-[#94a3b8]">
                          {preguntas.filter((p) => p.fp_fs_id === (seccion.fs_id ?? seccion.fp_fs_id)).length}{" "}
                          pregunta(s)
                        </p>
                      </div>

                      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            iniciarEdicionSeccion(seccion);
                          }}
                          disabled={readonly || formularioEdicionAbierto}
                          className="p-1 text-slate-400 hover:text-brand-600 hover:bg-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarSeccion(seccion.fs_id ?? seccion.fp_fs_id);
                          }}
                          disabled={readonly || formularioEdicionAbierto}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cambiarOrdenSeccion(seccion.fs_id ?? seccion.fp_fs_id, "arriba");
                          }}
                          disabled={readonly || index === 0 || formularioEdicionAbierto}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cambiarOrdenSeccion(seccion.fs_id ?? seccion.fp_fs_id, "abajo");
                          }}
                          disabled={readonly || index === secciones.length - 1 || formularioEdicionAbierto}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
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

      <ConfirmModal
        isOpen={mostrarConfirmarGuardarSeccion}
        title={editandoSeccion ? "Confirmar edición" : "Confirmar nueva sección"}
        message={editandoSeccion ? "¿Deseas guardar los cambios de esta sección?" : "¿Deseas crear esta sección?"}
        confirmText="Sí, guardar"
        cancelText="Cancelar"
        isLoading={guardandoSeccion}
        onConfirm={confirmarGuardarSeccion}
        onCancel={() => setMostrarConfirmarGuardarSeccion(false)}
      />

      <ErrorModal
        isOpen={!!errorMessageSeccion}
        message={errorMessageSeccion || ""}
        onAction={() => setErrorMessageSeccion(null)}
      />

      <SuccessModal
        isOpen={!!successMessageSeccion}
        title={successTituloSeccion}
        message={successTextoSeccion}
        actionText="Aceptar"
        onAction={() => setSuccessMessageSeccion(null)}
        autoClose
        autoCloseDelay={2500}
      />
    </>
  );
}
