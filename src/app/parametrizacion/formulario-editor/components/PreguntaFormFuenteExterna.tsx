"use client";

import type { Dispatch, SetStateAction } from "react";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import type { DocumentoCatalogo, FormPreguntaState } from "../hooks/types";

interface PreguntaFormFuenteExternaProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
  filtroBaseDatos: string;
  setFiltroBaseDatos: (value: string) => void;
  filtroTabla: string;
  setFiltroTabla: (value: string) => void;
  filtroColumna: string;
  setFiltroColumna: (value: string) => void;
  filtroLlave: string;
  setFiltroLlave: (value: string) => void;
  basesFiltradas: string[];
  tablasFiltradas: string[];
  columnasFiltradas: string[];
  llaveFiltrada: string[];
  catalogoBases: string[];
  catalogoTablas: string[];
  catalogoColumnas: string[];
  loadingCatalogoBases: boolean;
  loadingCatalogoTablas: boolean;
  loadingCatalogoColumnas: boolean;
  documentosCatalogo: DocumentoCatalogo[];
  loadingDocumentosCatalogo: boolean;
  setOpcionesNuevas: (value: string[]) => void;
}

export function PreguntaFormFuenteExterna({
  formPregunta,
  setFormPregunta,
  filtroBaseDatos,
  setFiltroBaseDatos,
  filtroTabla,
  setFiltroTabla,
  filtroColumna,
  setFiltroColumna,
  filtroLlave,
  setFiltroLlave,
  basesFiltradas,
  tablasFiltradas,
  columnasFiltradas,
  llaveFiltrada,
  catalogoBases,
  catalogoTablas,
  catalogoColumnas,
  loadingCatalogoBases,
  loadingCatalogoTablas,
  loadingCatalogoColumnas,
  documentosCatalogo,
  loadingDocumentosCatalogo,
  setOpcionesNuevas,
}: PreguntaFormFuenteExternaProps) {
  return (
    <>
  {/* SELECT_TABLA: catálogo externo */}
  {formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA && (
    <div className="space-y-1.5 p-2 bg-gradient-to-br from-sky-50 to-cyan-50 border-2 border-sky-200 rounded-lg">
      <h4 className="text-xs font-bold text-sky-900">
        🗄️ Configuración de catálogo externo
      </h4>
      <div className="space-y-0.5">
        <label className="block text-xs font-semibold text-sky-900 leading-tight">
          Base de datos
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar (ej: cli)..."
          value={filtroBaseDatos}
          onChange={(e) => setFiltroBaseDatos(e.target.value)}
          className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:shadow-lg bg-white transition-all"
        />
        {(!formPregunta.catalogo_base_datos ||
          filtroBaseDatos !== formPregunta.catalogo_base_datos) && (
          <div className="max-h-32 overflow-y-auto border border-sky-200 rounded bg-white divide-y divide-sky-50">
            {loadingCatalogoBases && (
              <p className="px-2 py-1 text-xs text-gray-500">Cargando bases...</p>
            )}
            {!loadingCatalogoBases && basesFiltradas.length === 0 && (
              <p className="px-2 py-1 text-xs text-gray-500">
                {catalogoBases.length === 0
                  ? "No hay bases disponibles"
                  : "Sin coincidencias para el filtro"}
              </p>
            )}
            {!loadingCatalogoBases &&
              basesFiltradas.map((base) => (
                <button
                  type="button"
                  key={base}
                  onClick={() => {
                    setFormPregunta({
                      ...formPregunta,
                      catalogo_base_datos: base,
                      catalogo_tabla: "",
                      catalogo_columna: "",
                    });
                    setFiltroBaseDatos(base);
                    setFiltroTabla("");
                    setFiltroColumna("");
                  }}
                  className="block w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-sky-50"
                >
                  {base}
                </button>
              ))}
          </div>
        )}
        <p className="text-xs text-gray-500">
          {formPregunta.catalogo_base_datos ? (
            <>
              Seleccionada: <strong>{formPregunta.catalogo_base_datos}</strong>{" "}
              <button
                type="button"
                onClick={() => setFiltroBaseDatos("")}
                className="text-sky-700 underline hover:text-sky-900"
              >
                cambiar
              </button>
            </>
          ) : (
            "Si lo dejas vacío, se usa la base de datos principal."
          )}
        </p>
      </div>

      <div className="space-y-0.5">
        <label className="block text-xs font-semibold text-sky-900 leading-tight">
          Tabla <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar (ej: cli)..."
          value={filtroTabla}
          onChange={(e) => setFiltroTabla(e.target.value)}
          className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:shadow-lg bg-white transition-all"
        />
        {(!formPregunta.catalogo_tabla ||
          filtroTabla !== formPregunta.catalogo_tabla) && (
          <div className="max-h-32 overflow-y-auto border border-sky-200 rounded bg-white divide-y divide-sky-50">
            {loadingCatalogoTablas && (
              <p className="px-2 py-1 text-xs text-gray-500">Cargando tablas...</p>
            )}
            {!loadingCatalogoTablas && tablasFiltradas.length === 0 && (
              <p className="px-2 py-1 text-xs text-gray-500">
                {catalogoTablas.length === 0
                  ? "No hay tablas disponibles"
                  : "Sin coincidencias para el filtro"}
              </p>
            )}
            {!loadingCatalogoTablas &&
              tablasFiltradas.map((tabla) => (
                <button
                  type="button"
                  key={tabla}
                  onClick={() => {
                    setFormPregunta({
                      ...formPregunta,
                      catalogo_tabla: tabla,
                      catalogo_columna: "",
                    });
                    setFiltroTabla(tabla);
                    setFiltroColumna("");
                  }}
                  className="block w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-sky-50"
                >
                  {tabla}
                </button>
              ))}
          </div>
        )}
        {formPregunta.catalogo_tabla && (
          <p className="text-xs text-sky-700">
            Seleccionada: <strong>{formPregunta.catalogo_tabla}</strong>{" "}
            <button
              type="button"
              onClick={() => setFiltroTabla("")}
              className="text-sky-700 underline hover:text-sky-900"
            >
              cambiar
            </button>
          </p>
        )}
      </div>

      <div className="space-y-0.5">
        <label className="block text-xs font-semibold text-sky-900 leading-tight">
          Columna visible <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar..."
          value={filtroColumna}
          onChange={(e) => setFiltroColumna(e.target.value)}
          disabled={!formPregunta.catalogo_tabla}
          className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:shadow-lg bg-white disabled:bg-gray-100 transition-all"
        />
        {(!formPregunta.catalogo_columna ||
          filtroColumna !== formPregunta.catalogo_columna) && (
          <div className="max-h-32 overflow-y-auto border border-sky-200 rounded bg-white divide-y divide-sky-50">
            {loadingCatalogoColumnas && (
              <p className="px-2 py-1 text-xs text-gray-500">Cargando columnas...</p>
            )}
            {!loadingCatalogoColumnas && columnasFiltradas.length === 0 && (
              <p className="px-2 py-1 text-xs text-gray-500">
                {catalogoColumnas.length === 0
                  ? "No hay columnas disponibles"
                  : "Sin coincidencias para el filtro"}
              </p>
            )}
            {!loadingCatalogoColumnas &&
              columnasFiltradas.map((columna) => (
                <button
                  type="button"
                  key={columna}
                  onClick={() => {
                    setFormPregunta({
                      ...formPregunta,
                      catalogo_columna: columna,
                    });
                    setFiltroColumna(columna);
                  }}
                  className="block w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-sky-50"
                >
                  {columna}
                </button>
              ))}
          </div>
        )}
        {formPregunta.catalogo_columna && (
          <p className="text-xs text-sky-700">
            Seleccionada: <strong>{formPregunta.catalogo_columna}</strong>{" "}
            <button
              type="button"
              onClick={() => setFiltroColumna("")}
              className="text-sky-700 underline hover:text-sky-900"
            >
              cambiar
            </button>
          </p>
        )}
      </div>

      <div className="space-y-0.5">
        <label className="block text-xs font-semibold text-sky-900 leading-tight">
          Primary Key (PK) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar..."
          value={filtroLlave}
          onChange={(e) => setFiltroLlave(e.target.value)}
          disabled={!formPregunta.catalogo_tabla}
          className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:shadow-lg bg-white disabled:bg-gray-100 transition-all"
        />
        {(!formPregunta.catalogo_pk_column ||
          filtroLlave !== formPregunta.catalogo_pk_column) && (
          <div className="max-h-32 overflow-y-auto border border-sky-200 rounded bg-white divide-y divide-sky-50">
            {loadingCatalogoColumnas && (
              <p className="px-2 py-1 text-xs text-gray-500">Cargando columnas...</p>
            )}
            {!loadingCatalogoColumnas && llaveFiltrada.length === 0 && (
              <p className="px-2 py-1 text-xs text-gray-500">
                {catalogoColumnas.length === 0
                  ? "No hay columnas disponibles"
                  : "Sin coincidencias para el filtro"}
              </p>
            )}
            {!loadingCatalogoColumnas &&
              llaveFiltrada.map((columna) => (
                <button
                  type="button"
                  key={columna}
                  onClick={() => {
                    setFormPregunta({
                      ...formPregunta,
                      catalogo_pk_column: columna,
                    });
                    setFiltroLlave(columna);
                  }}
                  className="block w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-sky-50"
                >
                  {columna}
                </button>
              ))}
          </div>
        )}
        {formPregunta.catalogo_pk_column && (
          <p className="text-xs text-sky-700">
            Seleccionada: <strong>{formPregunta.catalogo_pk_column}</strong>{" "}
            <button
              type="button"
              onClick={() => setFiltroLlave("")}
              className="text-sky-700 underline hover:text-sky-900"
            >
              cambiar
            </button>
          </p>
        )}
      </div>
    </div>
  )}

  {/* DOCUMENTOS_TABLA */}
  {formPregunta.tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA && (
    <div className="space-y-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded">
      <h4 className="text-xs font-semibold text-emerald-900">
        Configuración automática de documentos
      </h4>
      <p className="text-xs text-emerald-800">
        Selecciona el tipo de documento y la pregunta tomará ese
        nombre automáticamente.
      </p>
      <p className="text-xs text-emerald-700">
        Tabla: <strong>Tipos_documentos</strong> · Columna:{" "}
        <strong>tdo_nombre</strong>
      </p>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">
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
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    <div className="space-y-1.5 p-2 bg-indigo-50 border border-indigo-200 rounded">
      <h4 className="text-xs font-semibold text-indigo-900">
        Configuración de documento parametrizado
      </h4>
      <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">
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
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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
