"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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

type PanelPreguntasProps = PanelPreguntasOwnProps &
  PreguntaFormProps &
  ListaPreguntasProps;

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
      <div className="w-2/3 min-h-0 bg-white rounded-xl shadow-lg p-3 flex flex-col overflow-hidden border-2 border-gray-100 hover:border-gray-200 transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navegarSeccion("atras")}
              disabled={
                indiceSeccion === 0 ||
                formularioEdicionAbierto ||
                editandoPregunta !== null ||
                nuevaPregunta
              }
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <h2 className="text-xs font-medium text-gray-700">
              {seccionActual?.fs_nombre ||
                seccionActual?.seccion_nombre ||
                "Selecciona una sección"}
            </h2>
            <button
              onClick={() => navegarSeccion("adelante")}
              disabled={
                indiceSeccion === secciones.length - 1 ||
                formularioEdicionAbierto ||
                editandoPregunta !== null ||
                nuevaPregunta
              }
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>
          <button
            onClick={() => {
              setNuevaPregunta(true);
              setEditandoPregunta(null);
              setFormPregunta({
                ...FORM_PREGUNTA_DEFAULT,
                seccion_id: seccionSeleccionada,
              });
              setOpcionesNuevas([]);
              setErrorPregunta(null);
            }}
            disabled={
              readonly || !seccionSeleccionada || formularioEdicionAbierto
            }
            className="flex items-center gap-2 px-3 py-1 bg-gradient-to-br from-blue-500 via-blue-550 to-blue-600 text-white font-semibold text-xs rounded-lg hover:shadow-xl hover:from-blue-600 hover:via-blue-600 hover:to-blue-700 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
          >
            <Plus className="h-3 w-3" />
            Nueva Pregunta
          </button>
        </div>

        {seccionActual?.seccion_descripcion && (
          <p className="text-xs text-gray-600 mb-1">
            {seccionActual.seccion_descripcion}
          </p>
        )}

        {!loading && preguntas.length === 0 && (
          <div className="mb-2 rounded-lg border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 text-xs text-amber-900 font-medium">
            ⚠️ Esta versión (v{version || "1"}) no tiene preguntas
            registradas. Las secciones son globales, pero las preguntas se
            guardan por versión.
          </div>
        )}

        <PreguntaForm {...props} />
        <ListaPreguntas {...props} />
      </div>
    </>
  );
}
