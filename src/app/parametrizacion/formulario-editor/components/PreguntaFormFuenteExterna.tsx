"use client";

import type { Dispatch, SetStateAction } from "react";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import type { DocumentoCatalogo, FormPreguntaState } from "../hooks/types";

interface PreguntaFormFuenteExternaProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
  documentosCatalogo: DocumentoCatalogo[];
  loadingDocumentosCatalogo: boolean;
  setOpcionesNuevas: (value: string[]) => void;
}

export function PreguntaFormFuenteExterna({
  formPregunta,
  setFormPregunta,
  documentosCatalogo,
  loadingDocumentosCatalogo,
  setOpcionesNuevas,
}: PreguntaFormFuenteExternaProps) {
  return (
    <>
  {/* DOCUMENTOS_TABLA */}
  {formPregunta.tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA && (
    <div className="space-y-1.5 p-3 bg-slate-50 border border-gray-200 rounded-xl">
      <h4 className="text-[12.5px] font-bold text-gray-800">
        Configuración automática de documentos
      </h4>
      <p className="text-xs text-gray-600">
        Selecciona el tipo de documento y la pregunta tomará ese
        nombre automáticamente.
      </p>
      <p className="text-xs text-gray-500">
        Tabla: <strong>Tipos_documentos</strong> · Columna:{" "}
        <strong>tdo_nombre</strong>
      </p>

      <div className="space-y-1">
        <label className="block text-[13px] font-semibold text-gray-800">
          Tipo de documento *
        </label>
        <select
          value={formPregunta.tipo_documento_id ?? ""}
          onChange={(e) => {
            const tipo_documento_id = e.target.value
              ? parseInt(e.target.value)
              : null;
            const documento = documentosCatalogo.find(
              (doc) => doc.tdo_id === tipo_documento_id,
            );
            setFormPregunta((prev) => ({
              ...prev,
              tipo_documento_id,
              descripcion:
                documento?.tdo_nombre || "Nombre del documento",
              catalogo_base_datos: "",
              catalogo_tabla: "Tipos_documentos",
              catalogo_columna: "tdo_nombre",
            }));
            setOpcionesNuevas(
              documento?.tdo_nombre ? [documento.tdo_nombre] : [],
            );
          }}
          className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 text-[13.5px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">
            {loadingDocumentosCatalogo
              ? "Cargando documentos..."
              : "Selecciona un tipo de documento"}
          </option>
          {documentosCatalogo.map((doc) => (
            <option key={doc.tdo_id} value={doc.tdo_id}>
              {doc.tdo_nombre}
            </option>
          ))}
        </select>
      </div>
    </div>
  )}

  {/* ARCHIVO */}
  {formPregunta.tipo === TIPOS_PREGUNTA.ARCHIVO && (
    <div className="space-y-1.5 p-3 bg-slate-50 border border-gray-200 rounded-xl">
      <h4 className="text-[12.5px] font-bold text-gray-800">
        Configuración de documento parametrizado
      </h4>
      <div className="space-y-1">
        <label className="block text-[13px] font-semibold text-gray-800">
          Documento *
        </label>
        <select
          value={formPregunta.tipo_documento_id ?? ""}
          onChange={(e) => {
            const tipo_documento_id = e.target.value
              ? parseInt(e.target.value)
              : null;
            const documento = documentosCatalogo.find(
              (doc) => doc.tdo_id === tipo_documento_id,
            );
            setFormPregunta((prev) => ({
              ...prev,
              tipo_documento_id,
              descripcion:
                documento?.tdo_nombre || prev.descripcion,
            }));
          }}
          className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 text-[13.5px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">
            {loadingDocumentosCatalogo
              ? "Cargando documentos..."
              : "Selecciona un documento"}
          </option>
          {documentosCatalogo.map((doc) => (
            <option key={doc.tdo_id} value={doc.tdo_id}>
              {doc.tdo_nombre}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">
          Si el documento tiene vigencia, se creará
          automáticamente la pregunta de fecha de emisión.
        </p>
      </div>
    </div>
  )}
    </>
  );
}
