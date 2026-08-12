"use client";

import type { Dispatch, SetStateAction } from "react";
import type { FormPreguntaState, Opcion, Pregunta, Seccion } from "../hooks/types";

interface PreguntaFormDependenciaProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
  secciones: Seccion[];
  preguntas: Pregunta[];
  editandoPregunta: number | null;
  opcionesPreguntaPadre: Opcion[];
  loadingOpcionesPreguntaPadre: boolean;
}

export function PreguntaFormDependencia({
  formPregunta,
  setFormPregunta,
  secciones,
  preguntas,
  editandoPregunta,
  opcionesPreguntaPadre,
  loadingOpcionesPreguntaPadre,
}: PreguntaFormDependenciaProps) {
  return (
    <>
  {/* Dependencia */}
  {formPregunta.dependiente && (
    <div className="space-y-1.5 p-3 bg-[#f5f8ff] border border-blue-100 rounded-xl">
      <p className="text-[12.5px] font-bold text-blue-900">
        Comportamiento condicional
      </p>

      <div className="space-y-1">
        <label className="block text-[13px] font-semibold text-blue-900 leading-tight">
          Sección padre <span className="text-red-500">*</span>
        </label>
        <select
          value={formPregunta.dependencia_seccion_id ?? ""}
          onChange={(e) =>
            setFormPregunta({
              ...formPregunta,
              dependencia_seccion_id: e.target.value
                ? parseInt(e.target.value)
                : null,
              dependencia_pregunta_id: null,
            })
          }
          className="w-full border border-blue-100 rounded-[9px] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-[13.5px] transition-colors"
        >
          <option value="">Seleccione sección padre</option>
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

      <div className="space-y-1">
        <label className="block text-[13px] font-semibold text-blue-900 leading-tight">
          Pregunta padre <span className="text-red-500">*</span>
        </label>
        <select
          value={formPregunta.dependencia_pregunta_id ?? ""}
          onChange={(e) =>
            setFormPregunta({
              ...formPregunta,
              dependencia_pregunta_id: e.target.value
                ? parseInt(e.target.value)
                : null,
              dependencia_valor: "",
            })
          }
          className="w-full border border-blue-100 rounded-[9px] px-2.5 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 disabled:bg-gray-100 transition-colors"
          disabled={!formPregunta.dependencia_seccion_id}
        >
          <option value="">Seleccione pregunta padre</option>
          {preguntas
            .filter(
              (p) =>
                p.seccion_id ===
                  formPregunta.dependencia_seccion_id &&
                p.fp_id !== editandoPregunta,
            )
            .map((pregunta) => (
              <option key={pregunta.fp_id} value={pregunta.fp_id}>
                {pregunta.fp_descripcion}
              </option>
            ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-[13px] font-semibold text-blue-900 leading-tight">
          Respuesta que dispara{" "}
          <span className="text-red-500">*</span>
        </label>
        {opcionesPreguntaPadre.length > 0 ? (
          <select
            value={formPregunta.dependencia_valor}
            onChange={(e) =>
              setFormPregunta({
                ...formPregunta,
                dependencia_valor: e.target.value,
              })
            }
            className="w-full border border-blue-100 rounded-[9px] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-[13.5px] transition-colors"
          >
            <option value="">Selecciona una respuesta</option>
            {opcionesPreguntaPadre
              .filter((o) => o.fpo_estado)
              .map((o) => (
                <option
                  key={o.fpo_id}
                  value={o.fpo_valor || o.op_descripcion}
                >
                  {o.fpo_valor || o.op_descripcion}
                </option>
              ))}
          </select>
        ) : (
          <>
            <input
              type="text"
              placeholder={
                loadingOpcionesPreguntaPadre
                  ? "Cargando opciones..."
                  : "Ej: Si, Sí, 1"
              }
              disabled={loadingOpcionesPreguntaPadre}
              value={formPregunta.dependencia_valor}
              onChange={(e) =>
                setFormPregunta({
                  ...formPregunta,
                  dependencia_valor: e.target.value,
                })
              }
              className="w-full border border-blue-100 rounded-[9px] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-[13.5px] transition-colors disabled:bg-gray-100"
            />
            {formPregunta.dependencia_pregunta_id &&
              !loadingOpcionesPreguntaPadre && (
                <p className="text-xs text-gray-500">
                  Esta pregunta padre no tiene opciones fijas —
                  escribe el valor exacto que debe tener su
                  respuesta.
                </p>
              )}
          </>
        )}
        <p className="text-xs text-blue-700 font-medium mt-2">
          Esta pregunta se mostrará cuando la pregunta padre
          tenga este valor
        </p>
      </div>
    </div>
  )}
    </>
  );
}
