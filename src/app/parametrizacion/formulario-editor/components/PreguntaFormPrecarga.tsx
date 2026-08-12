"use client";

import type { Dispatch, SetStateAction } from "react";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import type { FormPreguntaState } from "../hooks/types";

interface PreguntaFormPrecargaProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
  filtroBaseDatos: string;
  setFiltroBaseDatos: (value: string) => void;
  filtroPrecargaTabla: string;
  setFiltroPrecargaTabla: (value: string) => void;
  filtroPrecargaColumna: string;
  setFiltroPrecargaColumna: (value: string) => void;
  basesFiltradas: string[];
  catalogoPrecargaTablas: string[];
  catalogoPrecargaColumnas: string[];
  loadingCatalogoPrecargaTablas: boolean;
  loadingCatalogoPrecargaColumnas: boolean;
}

export function PreguntaFormPrecarga({
  formPregunta,
  setFormPregunta,
  filtroBaseDatos,
  setFiltroBaseDatos,
  filtroPrecargaTabla,
  setFiltroPrecargaTabla,
  filtroPrecargaColumna,
  setFiltroPrecargaColumna,
  basesFiltradas,
  catalogoPrecargaTablas,
  catalogoPrecargaColumnas,
  loadingCatalogoPrecargaTablas,
  loadingCatalogoPrecargaColumnas,
}: PreguntaFormPrecargaProps) {
  return (
    <>
  {/* Precarga */}
  {![TIPOS_PREGUNTA.NOTA, TIPOS_PREGUNTA.FECHA_HORA_ACTUAL].includes(
    formPregunta.tipo as any,
  ) && (
    <div className="space-y-2 p-3 bg-slate-50 border border-gray-200 rounded-xl">
      <div>
        <h4 className="text-[12.5px] font-bold text-gray-800">
          Precarga de datos
        </h4>
        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
          Define de dónde se tomará el valor inicial para esta
          pregunta
        </p>
      </div>

      <div className="pt-1 space-y-1">
        <label className="block text-[13px] font-semibold text-gray-800">
          Fuente de precarga
        </label>
        <select
          value={formPregunta.precarga_fuente}
          onChange={(e) =>
            setFormPregunta({
              ...formPregunta,
              precarga_fuente: e.target.value,
              precarga_campo_cliente:
                e.target.value === ""
                  ? ""
                  : formPregunta.precarga_campo_cliente,
            })
          }
          className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-[13.5px] transition-colors"
        >
          <option value="">Sin precarga</option>
          <option value="cliente">Datos del cliente</option>
          <option value="ultima_solicitud">
            Última solicitud
          </option>
          <option value="cliente_primero">
            Cliente (primero), luego última solicitud
          </option>
          <option value="ultima_primero">
            Última solicitud (primero), luego cliente
          </option>
        </select>
      </div>

      {(formPregunta.precarga_fuente === "cliente" ||
        formPregunta.precarga_fuente === "cliente_primero" ||
        formPregunta.precarga_fuente === "ultima_primero") && (
        <div className="pt-1 space-y-2 bg-white p-2.5 rounded-[9px] border border-gray-200">
          <div className="space-y-1">
            <label className="block text-[13px] font-semibold text-gray-800">
              Base de datos
            </label>
            <input
              type="text"
              placeholder="Filtrar bases de datos..."
              value={filtroBaseDatos}
              onChange={(e) => setFiltroBaseDatos(e.target.value)}
              className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-colors"
            />
            <select
              value={formPregunta.precarga_base_datos || ""}
              onChange={(e) =>
                setFormPregunta({
                  ...formPregunta,
                  precarga_base_datos: e.target.value,
                  precarga_tabla: "",
                  precarga_columna: "",
                })
              }
              className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-[13.5px] transition-colors"
            >
              <option value="">
                Selecciona una base de datos
              </option>
              {basesFiltradas.map((bd) => (
                <option key={bd} value={bd}>
                  {bd}
                </option>
              ))}
            </select>
          </div>

          {formPregunta.precarga_base_datos && (
            <div className="space-y-1">
              <label className="block text-[13px] font-semibold text-gray-800 leading-tight">
                Tabla <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Filtrar tablas..."
                value={filtroPrecargaTabla}
                onChange={(e) => setFiltroPrecargaTabla(e.target.value)}
                className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-colors"
              />
              <select
                value={formPregunta.precarga_tabla || ""}
                onChange={(e) =>
                  setFormPregunta({
                    ...formPregunta,
                    precarga_tabla: e.target.value,
                    precarga_columna: "",
                  })
                }
                className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-[13.5px] transition-colors"
              >
                <option value="">
                  {loadingCatalogoPrecargaTablas
                    ? "Cargando tablas..."
                    : "Selecciona una tabla"}
                </option>
                {catalogoPrecargaTablas
                  .filter((tabla) =>
                    tabla
                      .toLowerCase()
                      .includes(filtroPrecargaTabla.toLowerCase()),
                  )
                  .map((tabla) => (
                    <option key={tabla} value={tabla}>
                      {tabla}
                    </option>
                  ))}
                {!loadingCatalogoPrecargaTablas &&
                  catalogoPrecargaTablas.filter((tabla) =>
                    tabla
                      .toLowerCase()
                      .includes(filtroPrecargaTabla.toLowerCase()),
                  ).length === 0 && (
                    <option disabled>
                      No hay tablas disponibles
                    </option>
                  )}
              </select>
            </div>
          )}

          {formPregunta.precarga_tabla && (
            <div className="space-y-1">
              <label className="block text-[13px] font-semibold text-gray-800 leading-tight">
                Columna <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Filtrar columnas..."
                value={filtroPrecargaColumna}
                onChange={(e) => setFiltroPrecargaColumna(e.target.value)}
                className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-colors"
              />
              <select
                value={formPregunta.precarga_columna || ""}
                onChange={(e) =>
                  setFormPregunta({
                    ...formPregunta,
                    precarga_columna: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-[13.5px] transition-colors"
              >
                <option value="">
                  {loadingCatalogoPrecargaColumnas
                    ? "Cargando columnas..."
                    : "Selecciona una columna"}
                </option>
                {catalogoPrecargaColumnas
                  .filter((columna) =>
                    columna
                      .toLowerCase()
                      .includes(filtroPrecargaColumna.toLowerCase()),
                  )
                  .map((columna) => (
                    <option key={columna} value={columna}>
                      {columna}
                    </option>
                  ))}
                {!loadingCatalogoPrecargaColumnas &&
                  catalogoPrecargaColumnas.filter((columna) =>
                    columna
                      .toLowerCase()
                      .includes(filtroPrecargaColumna.toLowerCase()),
                  ).length === 0 && (
                    <option disabled>
                      No hay columnas disponibles
                    </option>
                  )}
              </select>
            </div>
          )}
        </div>
      )}

      {formPregunta.precarga_fuente && (
        <p className="text-xs text-gray-600 font-medium bg-white px-2.5 py-2 rounded-[9px] border border-gray-200">
          {formPregunta.precarga_fuente === "cliente" &&
            "Llenará automáticamente con datos del cliente actual"}
          {formPregunta.precarga_fuente === "ultima_solicitud" &&
            "Llenará automáticamente con la respuesta de la última solicitud"}
          {formPregunta.precarga_fuente === "cliente_primero" &&
            "Intentará llenar primero con datos del cliente, si no hay valor, usa última solicitud"}
          {formPregunta.precarga_fuente === "ultima_primero" &&
            "Intentará llenar primero con última solicitud, si no hay valor, usa datos del cliente"}
        </p>
      )}
    </div>
  )}
      </>
  );
}
