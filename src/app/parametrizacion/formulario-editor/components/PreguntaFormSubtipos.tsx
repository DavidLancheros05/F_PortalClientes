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

const CAJA = "space-y-1.5 rounded-xl border border-gray-200 bg-slate-50 p-3";
const TITULO = "text-[12.5px] font-bold text-gray-800";
const FILA =
  "flex items-center gap-1 p-2 bg-white rounded-[9px] border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors";
const FILA_TEXTO = "text-[12.5px] font-medium text-gray-800";

export function PreguntaFormSubtipos({
  formPregunta,
  setFormPregunta,
}: PreguntaFormSubtiposProps) {
  return (
    <>
  {/* Subtipo SELECT */}
  {formPregunta.tipo === TIPOS_PREGUNTA.SELECT && (
    <div className={CAJA}>
      <p className={TITULO}>
        Forma de respuesta para selección única
      </p>
      <label className={FILA}>
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
          className="w-3.5 h-3.5 accent-blue-600"
        />
        <span className={FILA_TEXTO}>
          Lista desplegable
        </span>
      </label>
      <label className={FILA}>
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
          className="w-3.5 h-3.5 accent-blue-600"
        />
        <span className={FILA_TEXTO}>
          Checks visibles (una sola opción)
        </span>
      </label>
    </div>
  )}

  {/* Subtipo NUMERO */}
  {formPregunta.tipo === TIPOS_PREGUNTA.NUMERO && (
    <div className={CAJA}>
      <p className={TITULO}>
        Forma de respuesta numérica
      </p>
      <label className={FILA}>
        <input
          type="radio"
          name="numero-visual-mode"
          checked={
            formPregunta.subtipo !== "MONEDA" &&
            formPregunta.subtipo !== "DIA_MES" &&
            formPregunta.subtipo !== "DURACION_ANIOS_MESES"
          }
          onChange={() =>
            setFormPregunta((prev) => ({
              ...prev,
              subtipo: "",
            }))
          }
          className="w-3.5 h-3.5 accent-blue-600"
        />
        <span className={FILA_TEXTO}>
          Número simple
        </span>
      </label>
      <label className={FILA}>
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
          className="w-3.5 h-3.5 accent-blue-600"
        />
        <span className={FILA_TEXTO}>
          Moneda ($) — formatea con separador de miles
        </span>
      </label>
      <label className={FILA}>
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
          className="w-3.5 h-3.5 accent-blue-600"
        />
        <span className={FILA_TEXTO}>
          Día del mes (1-31) — lista desplegable
        </span>
      </label>
      <label className={FILA}>
        <input
          type="radio"
          name="numero-visual-mode"
          checked={formPregunta.subtipo === "DURACION_ANIOS_MESES"}
          onChange={() =>
            setFormPregunta((prev) => ({
              ...prev,
              subtipo: "DURACION_ANIOS_MESES",
            }))
          }
          className="w-3.5 h-3.5 accent-blue-600"
        />
        <span className={FILA_TEXTO}>
          Duración (años y meses) — dos campos combinados en un solo valor
        </span>
      </label>
    </div>
  )}

  {/* Subtipo FECHA */}
  {formPregunta.tipo === TIPOS_PREGUNTA.FECHA && (
    <div className={CAJA}>
      <p className={TITULO}>
        Forma de respuesta de fecha
      </p>
      <label className={FILA}>
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
          className="w-3.5 h-3.5 accent-blue-600"
        />
        <span className={FILA_TEXTO}>
          Normal — el usuario elige la fecha
        </span>
      </label>
      <label className={FILA}>
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
          className="w-3.5 h-3.5 accent-blue-600"
        />
        <span className={FILA_TEXTO}>
          Autocompletar con la fecha actual — el usuario puede
          corregirla si hace falta
        </span>
      </label>
    </div>
  )}

  {/* Subtipo TEXTO */}
  {formPregunta.tipo === TIPOS_PREGUNTA.TEXTO && (
    <div className={CAJA}>
      <p className={TITULO}>
        Validación de la respuesta
      </p>
      {PRESETS_VALIDACION_TEXTO.map((preset) => (
        <label
          key={preset.valor || "LIBRE"}
          className={FILA}
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
            className="w-3.5 h-3.5 accent-blue-600"
          />
          <span className={FILA_TEXTO}>
            {preset.label}
          </span>
        </label>
      ))}
    </div>
  )}
    </>
  );
}
