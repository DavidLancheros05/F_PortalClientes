"use client";

import type { Dispatch, SetStateAction } from "react";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import type { FormPreguntaState } from "../hooks/types";

interface PreguntaFormSubtiposProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
}

const PRESETS_VALIDACION_TEXTO: {
  valor: string;
  label: string;
  patron: string;
}[] = [
  { valor: "", label: "Texto libre — sin restricción", patron: "" },
  {
    valor: "PARRAFO",
    label: "Texto largo (párrafo) — cuadro grande con scroll, sin restricción",
    patron: "",
  },
  {
    valor: "NOMBRE",
    label: "Solo letras (sin números) — nombres, actividad económica, etc.",
    patron: "^[a-zñáéíóúA-ZÑÁÉÍÓÚ\\s]{3,100}$",
  },
  {
    valor: "EMAIL",
    label: "Correo electrónico",
    patron: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
  },
  {
    valor: "TELEFONO",
    label: "Teléfono",
    patron: "^\\+?[\\d\\s\\-\\(\\)]{7,}$",
  },
  {
    valor: "CC",
    label: "Cédula (solo números, 6-12 dígitos)",
    patron: "^\\d{6,12}$",
  },
  {
    valor: "EDAD",
    label: "Edad (2 dígitos, ej: 25, 05)",
    patron: "^\\d{2}$",
  },
];

export function PreguntaFormSubtipos({
  formPregunta,
  setFormPregunta,
}: PreguntaFormSubtiposProps) {
  return (
    <>
  {/* Subtipo SELECT */}
  {formPregunta.tipo === TIPOS_PREGUNTA.SELECT && (
    <div className="space-y-1.5 rounded-lg border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-2">
      <p className="text-xs font-semibold text-sky-900">
        🎨 Forma de respuesta para selección única
      </p>
      <label className="flex items-center gap-1 p-2 bg-white rounded-lg border border-sky-200 cursor-pointer hover:bg-sky-50 transition-colors text-xs">
        <input
          type="radio"
          name="select-visual-mode"
          checked={(formPregunta.subtipo || "LISTA") !== "CHECK"}
          onChange={() =>
            setFormPregunta((prev) => ({
              ...prev,
              subtipo: "LISTA",
            }))
          }
          className="w-4 h-4 accent-sky-600"
        />
        <span className="text-xs font-medium text-gray-800">
          Lista desplegable
        </span>
      </label>
      <label className="flex items-center gap-1 p-2 bg-white rounded-lg border border-sky-200 cursor-pointer hover:bg-sky-50 transition-colors text-xs">
        <input
          type="radio"
          name="select-visual-mode"
          checked={formPregunta.subtipo === "CHECK"}
          onChange={() =>
            setFormPregunta((prev) => ({
              ...prev,
              subtipo: "CHECK",
            }))
          }
          className="w-4 h-4 accent-sky-600"
        />
        <span className="text-xs font-medium text-gray-800">
          Checks visibles (una sola opción)
        </span>
      </label>
    </div>
  )}

  {/* Subtipo NUMERO */}
  {formPregunta.tipo === TIPOS_PREGUNTA.NUMERO && (
    <div className="space-y-1.5 rounded-lg border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-2">
      <p className="text-xs font-semibold text-sky-900">
        🔢 Forma de respuesta numérica
      </p>
      <label className="flex items-center gap-1 p-2 bg-white rounded-lg border border-sky-200 cursor-pointer hover:bg-sky-50 transition-colors text-xs">
        <input
          type="radio"
          name="numero-visual-mode"
          checked={
            formPregunta.subtipo !== "MONEDA" &&
            formPregunta.subtipo !== "DIA_MES"
          }
          onChange={() =>
            setFormPregunta((prev) => ({
              ...prev,
              subtipo: "",
            }))
          }
          className="w-4 h-4 accent-sky-600"
        />
        <span className="text-xs font-medium text-gray-800">
          Número simple
        </span>
      </label>
      <label className="flex items-center gap-1 p-2 bg-white rounded-lg border border-sky-200 cursor-pointer hover:bg-sky-50 transition-colors text-xs">
        <input
          type="radio"
          name="numero-visual-mode"
          checked={formPregunta.subtipo === "MONEDA"}
          onChange={() =>
            setFormPregunta((prev) => ({
              ...prev,
              subtipo: "MONEDA",
            }))
          }
          className="w-4 h-4 accent-sky-600"
        />
        <span className="text-xs font-medium text-gray-800">
          Moneda ($) — formatea con separador de miles
        </span>
      </label>
      <label className="flex items-center gap-1 p-2 bg-white rounded-lg border border-sky-200 cursor-pointer hover:bg-sky-50 transition-colors text-xs">
        <input
          type="radio"
          name="numero-visual-mode"
          checked={formPregunta.subtipo === "DIA_MES"}
          onChange={() =>
            setFormPregunta((prev) => ({
              ...prev,
              subtipo: "DIA_MES",
            }))
          }
          className="w-4 h-4 accent-sky-600"
        />
        <span className="text-xs font-medium text-gray-800">
          Día del mes (1-31) — lista desplegable
        </span>
      </label>
    </div>
  )}

  {/* Subtipo FECHA */}
  {formPregunta.tipo === TIPOS_PREGUNTA.FECHA && (
    <div className="space-y-1.5 rounded-lg border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-2">
      <p className="text-xs font-semibold text-sky-900">
        📅 Forma de respuesta de fecha
      </p>
      <label className="flex items-center gap-1 p-2 bg-white rounded-lg border border-sky-200 cursor-pointer hover:bg-sky-50 transition-colors text-xs">
        <input
          type="radio"
          name="fecha-visual-mode"
          checked={formPregunta.subtipo !== "ACTUAL"}
          onChange={() =>
            setFormPregunta((prev) => ({
              ...prev,
              subtipo: "",
            }))
          }
          className="w-4 h-4 accent-sky-600"
        />
        <span className="text-xs font-medium text-gray-800">
          Normal — el usuario elige la fecha
        </span>
      </label>
      <label className="flex items-center gap-1 p-2 bg-white rounded-lg border border-sky-200 cursor-pointer hover:bg-sky-50 transition-colors text-xs">
        <input
          type="radio"
          name="fecha-visual-mode"
          checked={formPregunta.subtipo === "ACTUAL"}
          onChange={() =>
            setFormPregunta((prev) => ({
              ...prev,
              subtipo: "ACTUAL",
            }))
          }
          className="w-4 h-4 accent-sky-600"
        />
        <span className="text-xs font-medium text-gray-800">
          Autocompletar con la fecha actual — el usuario puede
          corregirla si hace falta
        </span>
      </label>
    </div>
  )}

  {/* Subtipo TEXTO */}
  {formPregunta.tipo === TIPOS_PREGUNTA.TEXTO && (
    <div className="space-y-1.5 rounded-lg border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-2">
      <p className="text-xs font-semibold text-sky-900">
        ✅ Validación de la respuesta
      </p>
      {PRESETS_VALIDACION_TEXTO.map((preset) => (
        <label
          key={preset.valor || "LIBRE"}
          className="flex items-center gap-1 p-2 bg-white rounded-lg border border-sky-200 cursor-pointer hover:bg-sky-50 transition-colors text-xs"
        >
          <input
            type="radio"
            name="texto-validacion-mode"
            checked={(formPregunta.subtipo || "") === preset.valor}
            onChange={() =>
              setFormPregunta((prev) => ({
                ...prev,
                subtipo: preset.valor,
                patron: preset.patron,
              }))
            }
            className="w-4 h-4 accent-sky-600"
          />
          <span className="text-xs font-medium text-gray-800">
            {preset.label}
          </span>
        </label>
      ))}
    </div>
  )}
    </>
  );
}
