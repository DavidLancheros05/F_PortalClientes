"use client";

import type { Dispatch, SetStateAction } from "react";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import { fallbackTipoLabels, getTipoLabel } from "../lib/tipo-labels";
import type { FormPreguntaState, Opcion, Pregunta, Seccion, TipoPreguntaCatalogo } from "../hooks/types";

interface PreguntaFormCamposComunesProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
  setOpciones: Dispatch<SetStateAction<Opcion[]>>;
  setOpcionesNuevas: Dispatch<SetStateAction<string[]>>;
  tiposPregunta: TipoPreguntaCatalogo[];
  editandoPregunta: number | null;
  secciones: Seccion[];
  preguntas: Pregunta[];
}

export function PreguntaFormCamposComunes({
  formPregunta,
  setFormPregunta,
  setOpciones,
  setOpcionesNuevas,
  tiposPregunta,
  editandoPregunta,
  secciones,
  preguntas,
}: PreguntaFormCamposComunesProps) {
  return (
    <>
  {/* Tipo */}
  <div className="space-y-0.5">
    <label className="block text-xs font-semibold text-blue-900 leading-tight">
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
      className="w-full border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:shadow-lg bg-white text-gray-800 text-xs transition-all"
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

  {/* Descripción */}
  {formPregunta.tipo !== TIPOS_PREGUNTA.FECHA_HORA_ACTUAL && (
    <div className="space-y-0.5">
      <label className="block text-xs font-semibold text-blue-900">
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
          className="w-full border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:shadow-lg bg-white text-xs transition-all resize-y max-h-64 overflow-y-auto"
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
          className="w-full border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:shadow-lg bg-white disabled:bg-gray-100 text-xs transition-all"
        />
      )}
    </div>
  )}

  {/* Sección */}
  <div className="space-y-2">
    <label className="block text-xs font-semibold text-blue-900">
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
      className="w-full border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:shadow-lg bg-white text-xs transition-all"
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
      <p className="text-xs text-blue-600 font-medium">
        La sección se define por la pestaña activa al crear una
        pregunta, pero puedes cambiarla aquí si quieres.
      </p>
    ) : (
      formPregunta.seccion_id !==
        preguntas.find((p) => p.fp_id === editandoPregunta)
          ?.seccion_id && (
        <p className="text-xs text-amber-700 font-medium">
          ⚠️ Al guardar, esta pregunta se moverá a la sección
          seleccionada (quedará al final de esa sección).
        </p>
      )
    )}
  </div>

  {/* Ancho completo */}
  <label className="flex items-center gap-1 p-2 bg-white rounded-lg border-2 border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors text-xs">
    <input
      type="checkbox"
      checked={formPregunta.ancho_completo}
      onChange={(e) =>
        setFormPregunta({
          ...formPregunta,
          ancho_completo: e.target.checked,
        })
      }
      className="w-5 h-5 rounded accent-blue-600"
    />
    <span className="text-xs font-semibold text-gray-800">
      Ocupar todo el ancho (sin dividir en columnas)
    </span>
  </label>

  {/* Ocultar en formulario */}
  <label className="flex items-center gap-1 p-2 bg-white rounded-lg border-2 border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors text-xs">
    <input
      type="checkbox"
      checked={formPregunta.oculto_en_formulario}
      onChange={(e) =>
        setFormPregunta({
          ...formPregunta,
          oculto_en_formulario: e.target.checked,
        })
      }
      className="w-5 h-5 rounded accent-blue-600"
    />
    <span className="text-xs font-semibold text-gray-800">
      Ocultar durante el diligenciamiento (sigue apareciendo en
      el PDF final)
    </span>
  </label>

  {/* Obligatorio / Dependiente */}
  {![TIPOS_PREGUNTA.NOTA, TIPOS_PREGUNTA.FECHA_HORA_ACTUAL].includes(
    formPregunta.tipo as any,
  ) ? (
    <>
      <label className="flex items-center gap-1 p-2 bg-white rounded-lg border-2 border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors text-xs">
        <input
          type="checkbox"
          checked={formPregunta.requerida}
          onChange={(e) =>
            setFormPregunta({
              ...formPregunta,
              requerida: e.target.checked,
            })
          }
          className="w-5 h-5 rounded accent-blue-600"
        />
        <span className="text-xs font-semibold text-gray-800">
          Campo obligatorio
        </span>
      </label>

      <label className="flex items-center gap-1 p-2 bg-white rounded-lg border-2 border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors text-xs">
        <input
          type="checkbox"
          checked={formPregunta.dependiente}
          onChange={(e) =>
            setFormPregunta({
              ...formPregunta,
              dependiente: e.target.checked,
              dependencia_seccion_id: e.target.checked
                ? formPregunta.dependencia_seccion_id
                : null,
              dependencia_pregunta_id: e.target.checked
                ? formPregunta.dependencia_pregunta_id
                : null,
              dependencia_valor: e.target.checked
                ? formPregunta.dependencia_valor
                : "",
            })
          }
          className="w-5 h-5 rounded accent-blue-600"
        />
        <span className="text-xs font-semibold text-gray-800">
          Dependiente de otra pregunta
        </span>
      </label>
    </>
  ) : (
    <div className="rounded-lg border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 text-xs text-blue-900 font-medium">
      ℹ️ Este tipo es informativo o visualizador. No solicita
      respuesta y no cuenta como campo obligatorio.
    </div>
  )}
    </>
  );
}
