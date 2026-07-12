"use client";

import type { ColumnaTabla } from "../hooks/types";

interface ColumnaCatalogoPickerProps {
  columna: ColumnaTabla;
  onChange: (cambios: Partial<ColumnaTabla>) => void;
  onCerrar: () => void;
  catalogoBases: string[];
  catalogoTablas: string[];
  catalogoColumnas: string[];
  basesFiltradas: string[];
  tablasFiltradas: string[];
  columnasFiltradas: string[];
  loadingCatalogoBases: boolean;
  loadingCatalogoTablas: boolean;
  loadingCatalogoColumnas: boolean;
  filtroBaseDatos: string;
  setFiltroBaseDatos: (value: string) => void;
  filtroTabla: string;
  setFiltroTabla: (value: string) => void;
  filtroColumna: string;
  setFiltroColumna: (value: string) => void;
  llaveFiltrada: string[];
  filtroLlave: string;
  setFiltroLlave: (value: string) => void;
  cargarTablasCatalogo: (baseDatos: string) => void;
  cargarColumnasCatalogo: (baseDatos: string, tabla: string) => void;
  columnasCatalogoDisponibles: string[];
}

export function ColumnaCatalogoPicker({
  columna,
  onChange,
  onCerrar,
  catalogoBases,
  catalogoTablas,
  catalogoColumnas,
  basesFiltradas,
  tablasFiltradas,
  columnasFiltradas,
  loadingCatalogoBases,
  loadingCatalogoTablas,
  loadingCatalogoColumnas,
  filtroBaseDatos,
  setFiltroBaseDatos,
  filtroTabla,
  setFiltroTabla,
  filtroColumna,
  setFiltroColumna,
  llaveFiltrada,
  filtroLlave,
  setFiltroLlave,
  cargarTablasCatalogo,
  cargarColumnasCatalogo,
  columnasCatalogoDisponibles,
}: ColumnaCatalogoPickerProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-sky-900">
          🗄️ ¿De qué tabla depende esta columna?
        </p>
        <button
          type="button"
          onClick={onCerrar}
          className="text-xs text-sky-700 underline hover:text-sky-900"
        >
          listo
        </button>
      </div>

      <div className="space-y-0.5">
        <label className="block text-xs font-semibold text-sky-900 leading-tight">
          Base de datos
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar (ej: cli)..."
          value={filtroBaseDatos}
          onChange={(e) => setFiltroBaseDatos(e.target.value)}
          className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
        />
        {(!columna.catalogo_base_datos ||
          filtroBaseDatos !== columna.catalogo_base_datos) && (
          <div className="max-h-28 overflow-y-auto border border-sky-200 rounded bg-white divide-y divide-sky-50">
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
                    onChange({
                      catalogo_base_datos: base,
                      catalogo_tabla: "",
                      catalogo_columna: "",
                    });
                    setFiltroBaseDatos(base);
                    setFiltroTabla("");
                    setFiltroColumna("");
                    cargarTablasCatalogo(base);
                  }}
                  className="block w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-sky-50"
                >
                  {base}
                </button>
              ))}
          </div>
        )}
        {columna.catalogo_base_datos && (
          <p className="text-xs text-gray-500">
            Seleccionada: {columna.catalogo_base_datos}
          </p>
        )}
      </div>

      <div className="space-y-0.5">
        <label className="block text-xs font-semibold text-sky-900 leading-tight">
          Tabla <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar (ej: pais)..."
          value={filtroTabla}
          onChange={(e) => setFiltroTabla(e.target.value)}
          className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
        />
        {(!columna.catalogo_tabla || filtroTabla !== columna.catalogo_tabla) && (
          <div className="max-h-28 overflow-y-auto border border-sky-200 rounded bg-white divide-y divide-sky-50">
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
                    onChange({ catalogo_tabla: tabla, catalogo_columna: "" });
                    setFiltroTabla(tabla);
                    setFiltroColumna("");
                    cargarColumnasCatalogo(columna.catalogo_base_datos || "", tabla);
                  }}
                  className="block w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-sky-50"
                >
                  {tabla}
                </button>
              ))}
          </div>
        )}
        {columna.catalogo_tabla && (
          <p className="text-xs text-sky-700">
            Seleccionada: <strong>{columna.catalogo_tabla}</strong>
          </p>
        )}
      </div>

      <div className="space-y-0.5">
        <label className="block text-xs font-semibold text-sky-900 leading-tight">
          Columna (valores a mostrar) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar..."
          value={filtroColumna}
          onChange={(e) => setFiltroColumna(e.target.value)}
          disabled={!columna.catalogo_tabla}
          className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white disabled:bg-gray-100"
        />
        {(!columna.catalogo_columna ||
          filtroColumna !== columna.catalogo_columna) && (
          <div className="max-h-28 overflow-y-auto border border-sky-200 rounded bg-white divide-y divide-sky-50">
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
              columnasFiltradas.map((col) => (
                <button
                  type="button"
                  key={col}
                  onClick={() => {
                    onChange({ catalogo_columna: col });
                    setFiltroColumna(col);
                  }}
                  className="block w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-sky-50"
                >
                  {col}
                </button>
              ))}
          </div>
        )}
        {columna.catalogo_columna && (
          <p className="text-xs text-sky-700">
            Seleccionada: <strong>{columna.catalogo_columna}</strong>
          </p>
        )}
      </div>

      <div className="space-y-0.5">
        <label className="block text-xs font-semibold text-sky-900 leading-tight">
          Llave (ID) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar..."
          value={filtroLlave}
          onChange={(e) => setFiltroLlave(e.target.value)}
          disabled={!columna.catalogo_tabla}
          className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white disabled:bg-gray-100"
        />
        {(!columna.catalogo_pk_column ||
          filtroLlave !== columna.catalogo_pk_column) && (
          <div className="max-h-28 overflow-y-auto border border-sky-200 rounded bg-white divide-y divide-sky-50">
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
              llaveFiltrada.map((col) => (
                <button
                  type="button"
                  key={col}
                  onClick={() => {
                    onChange({ catalogo_pk_column: col });
                    setFiltroLlave(col);
                  }}
                  className="block w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-sky-50"
                >
                  {col}
                </button>
              ))}
          </div>
        )}
        {columna.catalogo_pk_column && (
          <p className="text-xs text-sky-700">
            Seleccionada: <strong>{columna.catalogo_pk_column}</strong>
          </p>
        )}
      </div>

      {columnasCatalogoDisponibles.length > 0 && (
        <div className="space-y-0.5 border-t border-sky-200 pt-1.5">
          <label className="block text-xs font-semibold text-sky-900 leading-tight">
            ¿Depende de otra columna de esta tabla? (opcional)
          </label>
          <select
            value={columna.catalogo_columna_padre || ""}
            onChange={(e) =>
              onChange({
                catalogo_columna_padre: e.target.value || undefined,
                catalogo_columna_filtro: e.target.value
                  ? columna.catalogo_columna_filtro
                  : undefined,
              })
            }
            className="w-full border border-sky-200 rounded px-2 py-1 text-xs bg-white"
          >
            <option value="">No depende de otra columna</option>
            {columnasCatalogoDisponibles.map((nombre) => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>

          {columna.catalogo_columna_padre && (
            <>
              <label className="block text-xs font-semibold text-sky-900 leading-tight mt-1">
                Columna que relaciona con "{columna.catalogo_columna_padre}"{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={columna.catalogo_columna_filtro || ""}
                onChange={(e) =>
                  onChange({ catalogo_columna_filtro: e.target.value || undefined })
                }
                disabled={!columna.catalogo_tabla}
                className="w-full border border-sky-200 rounded px-2 py-1 text-xs bg-white disabled:bg-gray-100"
              >
                <option value="">
                  Selecciona la columna FK en "{columna.catalogo_tabla || "..."}"
                </option>
                {catalogoColumnas.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Ej: si esta columna es "Departamento" y depende de "Pais", aquí
                eliges la columna de {columna.catalogo_tabla || "la tabla"} que
                guarda el país (ej: pai_id).
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
