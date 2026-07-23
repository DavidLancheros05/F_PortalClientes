"use client";

import type { Dispatch, SetStateAction } from "react";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import type { FormPreguntaState } from "../hooks/types";

interface PreguntaFormPrecargaProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
  filtroBaseDatos: string;
  setFiltroBaseDatos: (value: string) => void;
  filtroTabla: string;
  setFiltroTabla: (value: string) => void;
  filtroColumna: string;
  setFiltroColumna: (value: string) => void;
  basesFiltradas: string[];
  tablasFiltradas: string[];
  columnasFiltradas: string[];
  catalogoTablas: string[];
  catalogoColumnas: string[];
  loadingCatalogoTablas: boolean;
  loadingCatalogoColumnas: boolean;
}

export function PreguntaFormPrecarga({
  formPregunta,
  setFormPregunta,
  filtroBaseDatos,
  setFiltroBaseDatos,
  filtroTabla,
  setFiltroTabla,
  filtroColumna,
  setFiltroColumna,
  basesFiltradas,
  tablasFiltradas,
  columnasFiltradas,
  catalogoTablas,
  catalogoColumnas,
  loadingCatalogoTablas,
  loadingCatalogoColumnas,
}: PreguntaFormPrecargaProps) {
  return (
    <>
  {/* Precarga */}
  {![TIPOS_PREGUNTA.NOTA, TIPOS_PREGUNTA.FECHA_HORA_ACTUAL].includes(
    formPregunta.tipo as any,
  ) && (
    <div className="space-y-2 p-2 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-l-4 border-amber-400 rounded-md shadow-sm">
      <div>
        <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2">
          <span className="text-sm">📦</span>
          Precarga de datos
        </h4>
        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
          Define de dónde se tomará el valor inicial para esta
          pregunta
        </p>
      </div>

      <div className="pt-1 space-y-1">
        <label className="block text-xs font-semibold text-amber-900 flex items-center gap-1">
          <span className="text-amber-600">↓</span>
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
          className="w-full border border-amber-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:shadow-lg bg-white text-xs transition-all"
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
        <div className="pt-1 space-y-2 bg-white/60 p-2 rounded-md border border-amber-100">
          <div className="space-y-0.5">
            <label className="block text-xs font-semibold text-amber-900 flex items-center gap-1">
              <span className="text-amber-600">🔍</span>
              Base de datos
            </label>
            <input
              type="text"
              placeholder="Filtrar bases de datos..."
              value={filtroBaseDatos}
              onChange={(e) => setFiltroBaseDatos(e.target.value)}
              className="w-full border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white transition-all"
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
              className="w-full border border-amber-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:shadow-lg bg-white text-xs transition-all"
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
            <div className="space-y-0.5">
              <label className="block text-xs font-semibold text-amber-900 leading-tight">
                Tabla <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Filtrar tablas..."
                value={filtroTabla}
                onChange={(e) => setFiltroTabla(e.target.value)}
                className="w-full border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white transition-all"
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
                className="w-full border border-amber-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:shadow-lg bg-white text-xs transition-all"
              >
                <option value="">
                  {loadingCatalogoTablas
                    ? "Cargando tablas..."
                    : "Selecciona una tabla"}
                </option>
                {catalogoTablas
                  .filter((tabla) =>
                    tabla
                      .toLowerCase()
                      .includes(filtroTabla.toLowerCase()),
                  )
                  .map((tabla) => (
                    <option key={tabla} value={tabla}>
                      {tabla}
                    </option>
                  ))}
                {!loadingCatalogoTablas &&
                  catalogoTablas.filter((tabla) =>
                    tabla
                      .toLowerCase()
                      .includes(filtroTabla.toLowerCase()),
                  ).length === 0 && (
                    <option disabled>
                      No hay tablas disponibles
                    </option>
                  )}
              </select>
            </div>
          )}

          {formPregunta.precarga_tabla && (
            <div className="space-y-0.5">
              <label className="block text-xs font-semibold text-amber-900 leading-tight">
                Columna <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Filtrar columnas..."
                value={filtroColumna}
                onChange={(e) => setFiltroColumna(e.target.value)}
                className="w-full border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white transition-all"
              />
              <select
                value={formPregunta.precarga_columna || ""}
                onChange={(e) =>
                  setFormPregunta({
                    ...formPregunta,
                    precarga_columna: e.target.value,
                  })
                }
                className="w-full border border-amber-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:shadow-lg bg-white text-xs transition-all"
              >
                <option value="">
                  {loadingCatalogoColumnas
                    ? "Cargando columnas..."
                    : "Selecciona una columna"}
                </option>
                {catalogoColumnas
                  .filter((columna) =>
                    columna
                      .toLowerCase()
                      .includes(filtroColumna.toLowerCase()),
                  )
                  .map((columna) => (
                    <option key={columna} value={columna}>
                      {columna}
                    </option>
                  ))}
                {!loadingCatalogoColumnas &&
                  catalogoColumnas.filter((columna) =>
                    columna
                      .toLowerCase()
                      .includes(filtroColumna.toLowerCase()),
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
        <p className="text-xs text-amber-700 font-medium bg-white/50 px-3 py-2 rounded-lg border border-amber-100">
          ✓{" "}
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
