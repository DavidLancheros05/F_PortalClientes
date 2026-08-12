"use client";

import type { Dispatch, SetStateAction } from "react";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import { fallbackTipoLabels, getTipoLabel } from "../lib/tipo-labels";
import type { FormPreguntaState, Opcion, Pregunta, Seccion, TipoPreguntaCatalogo } from "../hooks/types";

interface SwitchFieldProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function SwitchField({ label, description, checked, onChange }: SwitchFieldProps) {
  return (
    <div className="flex items-start justify-between gap-2 p-2 rounded-[9px] border border-gray-200 bg-white hover:border-gray-300 transition-colors">
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-gray-800 leading-tight">{label}</p>
        {description && (
          <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
          checked ? "bg-blue-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-150 ${
            checked ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </div>
  );
}

interface AnchoColumnasFieldProps {
  value: 1 | 2 | 3;
  onChange: (value: 1 | 2 | 3) => void;
}

function AnchoColumnasField({ value, onChange }: AnchoColumnasFieldProps) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-[9px] border border-gray-200 bg-white hover:border-gray-300 transition-colors">
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-gray-800 leading-tight">
          Ancho de la pregunta
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
          Columnas que ocupa (de 3 por fila)
        </p>
      </div>
      <div className="flex flex-shrink-0 rounded-[7px] border border-gray-200 overflow-hidden">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={`w-7 h-6 text-[11px] font-semibold transition-colors ${
              value === n
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            } ${n !== 1 ? "border-l border-gray-200" : ""}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

interface PreguntaFormTipoProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
  setOpciones: Dispatch<SetStateAction<Opcion[]>>;
  setOpcionesNuevas: Dispatch<SetStateAction<string[]>>;
  tiposPregunta: TipoPreguntaCatalogo[];
  editandoPregunta: number | null;
}

export function PreguntaFormTipo({
  formPregunta,
  setFormPregunta,
  setOpciones,
  setOpcionesNuevas,
  tiposPregunta,
  editandoPregunta,
}: PreguntaFormTipoProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[13px] font-semibold text-gray-800 leading-tight">
        Tipo de input <span className="text-red-500">*</span>
      </label>
      <select
        value={formPregunta.tipo}
        onChange={(e) => {
          const tipo = e.target.value as Pregunta["fp_tipo"];
          setOpciones([]);
          setOpcionesNuevas([]);
          setFormPregunta((prev) => {
            if (tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA) {
              return {
                ...prev,
                tipo,
                subtipo: "",
                patron: "",
                tipo_documento_id: null,
                descripcion: "Nombre del documento",
                catalogo_base_datos: "",
                catalogo_tabla: "Tipos_documentos",
                catalogo_columna: "tdo_nombre",
                catalogo_pk_column: "tdo_id",
              };
            }
            if (tipo === TIPOS_PREGUNTA.ARCHIVO) {
              return {
                ...prev,
                tipo,
                subtipo: "",
                patron: "",
                catalogo_base_datos: "",
                catalogo_tabla: "",
                catalogo_columna: "",
                catalogo_pk_column: "",
              };
            }
            if (
              [
                TIPOS_PREGUNTA.NOTA,
                TIPOS_PREGUNTA.FECHA_HORA_ACTUAL,
              ].includes(tipo as any)
            ) {
              return {
                ...prev,
                tipo,
                subtipo: "",
                patron: "",
                requerida: false,
                dependiente: false,
                dependencia_seccion_id: null,
                dependencia_pregunta_id: null,
                dependencia_valor: "",
                tipo_documento_id: null,
                catalogo_base_datos: "",
                catalogo_tabla: "",
                catalogo_columna: "",
                catalogo_pk_column: "",
              };
            }
            if (tipo !== TIPOS_PREGUNTA.SELECT_TABLA) {
              return {
                ...prev,
                tipo,
                subtipo:
                  tipo === TIPOS_PREGUNTA.SELECT
                    ? prev.subtipo || "LISTA"
                    : tipo === TIPOS_PREGUNTA.NUMERO
                      ? ["MONEDA", "DIA_MES"].includes(
                          prev.subtipo,
                        )
                        ? prev.subtipo
                        : ""
                      : tipo === TIPOS_PREGUNTA.FECHA
                        ? ["ACTUAL"].includes(prev.subtipo)
                          ? prev.subtipo
                          : ""
                        : "",
                patron: "",
                tipo_documento_id: null,
                catalogo_base_datos: "",
                catalogo_tabla: "",
                catalogo_columna: "",
                catalogo_pk_column: "",
              };
            }
            return {
              ...prev,
              tipo,
              subtipo: "",
              patron: "",
              tipo_documento_id: null,
              catalogo_base_datos: "",
              catalogo_tabla: "",
              catalogo_columna: "",
              catalogo_pk_column: "",
            };
          });
        }}
        className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-[13.5px] transition-colors"
      >
        {(() => {
          const tiposActivos = tiposPregunta.filter(
            (t) => t.fti_estado,
          );
          const tiposBase = editandoPregunta
            ? tiposPregunta
            : tiposActivos.length > 0
              ? tiposActivos
              : tiposPregunta;
          const codigosBase = new Set(
            tiposBase.map((t) => t.fti_codigo),
          );
          const codigosFallback: Pregunta["fp_tipo"][] = [
            TIPOS_PREGUNTA.FECHA_HORA_ACTUAL,
            TIPOS_PREGUNTA.TEXTO,
            TIPOS_PREGUNTA.NUMERO,
            TIPOS_PREGUNTA.FECHA,
            TIPOS_PREGUNTA.NOTA,
            TIPOS_PREGUNTA.SELECT,
            TIPOS_PREGUNTA.SELECT_TABLA,
            TIPOS_PREGUNTA.DOCUMENTOS_TABLA,
            TIPOS_PREGUNTA.MULTISELECT,
            TIPOS_PREGUNTA.ARCHIVO,
            TIPOS_PREGUNTA.TABLA,
            TIPOS_PREGUNTA.IMAGEN,
          ];
          const faltantes = codigosFallback.filter(
            (codigo) => !codigosBase.has(codigo),
          );
          if (tiposBase.length === 0) {
            return codigosFallback.map((codigo) => (
              <option key={codigo} value={codigo}>
                {fallbackTipoLabels[codigo]}
              </option>
            ));
          }
          return (
            <>
              {tiposBase.map((tipoPregunta) => (
                <option
                  key={tipoPregunta.fti_id}
                  value={tipoPregunta.fti_codigo}
                >
                  {getTipoLabel(tipoPregunta)}
                </option>
              ))}
              {faltantes.map((codigo) => (
                <option key={`fallback-${codigo}`} value={codigo}>
                  {fallbackTipoLabels[codigo]}
                </option>
              ))}
            </>
          );
        })()}
      </select>
    </div>
  );
}

interface PreguntaFormDescripcionSeccionProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
  editandoPregunta: number | null;
  secciones: Seccion[];
  preguntas: Pregunta[];
}

export function PreguntaFormDescripcionSeccion({
  formPregunta,
  setFormPregunta,
  editandoPregunta,
  secciones,
  preguntas,
}: PreguntaFormDescripcionSeccionProps) {
  return (
    <>
      {/* Descripción */}
      {formPregunta.tipo !== TIPOS_PREGUNTA.FECHA_HORA_ACTUAL && (
        <div className="space-y-1">
          <label className="block text-[13px] font-semibold text-gray-800">
            Pregunta <span className="text-red-500">*</span>
          </label>
          {formPregunta.tipo === TIPOS_PREGUNTA.NOTA ? (
            <textarea
              placeholder="Ej: Los recursos con los cuales realizo operaciones de comercio exterior provienen de..."
              value={formPregunta.descripcion}
              onChange={(e) =>
                setFormPregunta({
                  ...formPregunta,
                  descripcion: e.target.value,
                })
              }
              rows={6}
              className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-[13.5px] transition-colors resize-y max-h-64 overflow-y-auto"
            />
          ) : (
            <input
              type="text"
              placeholder={
                formPregunta.tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA
                  ? "Se completa con el nombre del documento"
                  : "Ej: ¿Cuál es tu nombre completo?"
              }
              value={formPregunta.descripcion}
              onChange={(e) =>
                setFormPregunta({
                  ...formPregunta,
                  descripcion: e.target.value,
                })
              }
              disabled={
                formPregunta.tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA
              }
              className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 text-gray-900 text-[13.5px] transition-colors"
            />
          )}
        </div>
      )}

      {/* Sección */}
      <div className="space-y-1.5">
        <label className="block text-[13px] font-semibold text-gray-800">
          Sección <span className="text-red-500">*</span>
        </label>
        <select
          value={formPregunta.seccion_id ?? ""}
          onChange={(e) => {
            setFormPregunta({
              ...formPregunta,
              seccion_id: e.target.value
                ? parseInt(e.target.value)
                : null,
            });
          }}
          className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-[13.5px] transition-colors"
        >
          <option value="">Selecciona una sección</option>
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
        {!editandoPregunta ? (
          <p className="text-xs text-gray-500 font-medium">
            La sección se define por la pestaña activa al crear una
            pregunta, pero puedes cambiarla aquí si quieres.
          </p>
        ) : (
          formPregunta.seccion_id !==
            preguntas.find((p) => p.fp_id === editandoPregunta)
              ?.seccion_id && (
            <p className="text-xs text-amber-700 font-medium">
              Al guardar, esta pregunta se moverá a la sección
              seleccionada (quedará al final de esa sección).
            </p>
          )
        )}
      </div>
    </>
  );
}

interface PreguntaFormPresentacionProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
}

export function PreguntaFormPresentacion({
  formPregunta,
  setFormPregunta,
}: PreguntaFormPresentacionProps) {
  const esInformativa = [
    TIPOS_PREGUNTA.NOTA,
    TIPOS_PREGUNTA.FECHA_HORA_ACTUAL,
  ].includes(formPregunta.tipo as any);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <AnchoColumnasField
          value={formPregunta.ancho_columnas}
          onChange={(value) =>
            setFormPregunta({ ...formPregunta, ancho_columnas: value })
          }
        />
        <SwitchField
          label="Ocultar en diligenciamiento"
          description="Sigue apareciendo en el PDF final"
          checked={formPregunta.oculto_en_formulario}
          onChange={(value) =>
            setFormPregunta({ ...formPregunta, oculto_en_formulario: value })
          }
        />
        {!esInformativa && (
          <>
            <SwitchField
              label="Campo obligatorio"
              checked={formPregunta.requerida}
              onChange={(value) =>
                setFormPregunta({ ...formPregunta, requerida: value })
              }
            />
            <SwitchField
              label="Dependiente de otra pregunta"
              checked={formPregunta.dependiente}
              onChange={(value) =>
                setFormPregunta({
                  ...formPregunta,
                  dependiente: value,
                  dependencia_seccion_id: value
                    ? formPregunta.dependencia_seccion_id
                    : null,
                  dependencia_pregunta_id: value
                    ? formPregunta.dependencia_pregunta_id
                    : null,
                  dependencia_valor: value
                    ? formPregunta.dependencia_valor
                    : "",
                })
              }
            />
          </>
        )}
      </div>

      {esInformativa && (
        <div className="mt-2 rounded-[9px] border border-gray-200 bg-slate-50 px-2.5 py-2 text-xs text-gray-600 font-medium">
          ℹ️ Este tipo es informativo o visualizador. No solicita
          respuesta y no cuenta como campo obligatorio.
        </div>
      )}
    </>
  );
}
