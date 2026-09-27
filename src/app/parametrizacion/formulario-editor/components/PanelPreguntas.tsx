"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { PreguntaForm, type PreguntaFormProps } from "./PreguntaForm";
import { ListaPreguntas, type ListaPreguntasProps } from "./ListaPreguntas";
import type { FormPreguntaState, Seccion } from "../hooks/types";

interface PanelPreguntasOwnProps {
  navegarSeccion: (direccion: "atras" | "adelante") => void;
  indiceSeccion: number;
  seccionActual: Seccion | undefined;
  FORM_PREGUNTA_DEFAULT: FormPreguntaState;
  seccionSeleccionada: number | null;
  readonly: boolean;
  version: string | null;
}

type PanelPreguntasProps = PanelPreguntasOwnProps & PreguntaFormProps & ListaPreguntasProps;

export function PanelPreguntas(props: PanelPreguntasProps) {
  const {
    navegarSeccion,
    indiceSeccion,
    seccionActual,
    FORM_PREGUNTA_DEFAULT,
    seccionSeleccionada,
    readonly,
    version,
    secciones,
    formularioEdicionAbierto,
    editandoPregunta,
    nuevaPregunta,
    setNuevaPregunta,
    setEditandoPregunta,
    setFormPregunta,
    setOpcionesNuevas,
    setErrorPregunta,
    loading,
    preguntas,
  } = props;

  return (
    <>
      {/* PANEL DERECHO - PREGUNTAS */}
      <div className="w-2/3 min-h-0 bg-white rounded-[22px] border border-[#e9ecf2] shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.06)] p-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={() => navegarSeccion("atras")}
              disabled={indiceSeccion === 0 || formularioEdicionAbierto || editandoPregunta !== null || nuevaPregunta}
              title="Sección anterior"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-[#f2f5fa] hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-extrabold text-slate-800 truncate">
              {seccionActual?.fs_nombre || seccionActual?.seccion_nombre || "Selecciona una sección"}
              {seccionActual && (
                <span className="ml-2 text-xs font-semibold text-[#94a3b8]">
                  {props.preguntasDeSeccion.length} pregunta(s)
                </span>
              )}
            </h2>
            <button
              title="Sección siguiente"
              onClick={() => navegarSeccion("adelante")}
              disabled={
                indiceSeccion === secciones.length - 1 ||
                formularioEdicionAbierto ||
                editandoPregunta !== null ||
                nuevaPregunta
              }
              className="p-1.5 rounded-lg text-slate-500 hover:bg-[#f2f5fa] hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => {
              setNuevaPregunta(true);
              setEditandoPregunta(null);
              setFormPregunta({
                ...FORM_PREGUNTA_DEFAULT,
                fp_fs_id: seccionSeleccionada,
              });
              setOpcionesNuevas([]);
              setErrorPregunta(null);
            }}
            disabled={readonly || !seccionSeleccionada || formularioEdicionAbierto}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-[10px] shadow-[0_4px_12px_rgba(0,61,153,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-colors flex-shrink-0">
            <Plus className="h-3.5 w-3.5" />
            Nueva pregunta
          </button>
        </div>

        {(seccionActual?.fs_descripcion || seccionActual?.seccion_descripcion) && (
          <p className="text-xs text-slate-500 mb-2 -mt-1 px-1">
            {seccionActual.fs_descripcion || seccionActual.seccion_descripcion}
          </p>
        )}

        {!loading && preguntas.length === 0 && (
          <div className="mb-2 flex items-center gap-2 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Esta versión (v{version || "1"}) no tiene preguntas registradas.
          </div>
        )}

        <PreguntaForm {...props} />
        <ListaPreguntas {...props} />
      </div>
    </>
  );
}
