"use client";

import type { Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import type { FormPreguntaState, Pregunta, Seccion } from "../hooks/types";

interface PreguntaFormCatalogoExternoProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
  editandoPregunta: number | null;
  nuevaPregunta: boolean;
  secciones: Seccion[];
  preguntas: Pregunta[];
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
}

// Configuración de catálogo externo (SELECT_TABLA): de dónde salen las
// opciones (tabla/columna/PK) y, anidado como parte de la misma
// configuración, si esas opciones se filtran según la respuesta de otra
// pregunta. Vive fuera del acordeón "Opciones avanzadas · Precarga
// automática" porque no es una precarga — es configuración obligatoria
// para que este tipo de pregunta funcione.
export function PreguntaFormCatalogoExterno({
  formPregunta,
  setFormPregunta,
  editandoPregunta,
  nuevaPregunta,
  secciones,
  preguntas,
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
}: PreguntaFormCatalogoExternoProps) {
  if (formPregunta.tipo !== TIPOS_PREGUNTA.SELECT_TABLA) return null;
  if (!editandoPregunta && !nuevaPregunta) return null;

  // Cuando la lista de sugerencias se muestra (el filtro fue borrado), el
  // valor ya seleccionado se ancla primero para no obligar a buscarlo de
  // nuevo entre todas las opciones.
  const conSeleccionPrimero = (lista: string[], seleccionado: string) => {
    if (!seleccionado || !lista.includes(seleccionado)) return lista;
    return [seleccionado, ...lista.filter((item) => item !== seleccionado)];
  };

  const basesParaMostrar = conSeleccionPrimero(
    basesFiltradas,
    formPregunta.catalogo_base_datos || "",
  );
  const tablasParaMostrar = conSeleccionPrimero(
    tablasFiltradas,
    formPregunta.catalogo_tabla || "",
  );
  const columnasParaMostrar = conSeleccionPrimero(
    columnasFiltradas,
    formPregunta.catalogo_columna || "",
  );
  const llaveParaMostrar = conSeleccionPrimero(
    llaveFiltrada,
    formPregunta.catalogo_pk_column || "",
  );

  return (
    <div className="space-y-1.5 p-3 bg-slate-50 border border-gray-200 rounded-xl">
      <h4 className="text-[12.5px] font-bold text-gray-800">
        Configuración de catálogo externo
      </h4>
      <div className="space-y-1">
        <label className="block text-[13px] font-semibold text-gray-800 leading-tight">
          Base de datos
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar (ej: cli)..."
          value={filtroBaseDatos}
          onChange={(e) => setFiltroBaseDatos(e.target.value)}
          className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-colors"
        />
        {(!formPregunta.catalogo_base_datos ||
          filtroBaseDatos !== formPregunta.catalogo_base_datos) && (
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-[9px] bg-white divide-y divide-gray-100">
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
              basesParaMostrar.map((base) => (
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
                  className="block w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
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
                className="text-gray-700 underline hover:text-gray-900"
              >
                cambiar
              </button>
            </>
          ) : (
            "Si lo dejas vacío, se usa la base de datos principal."
          )}
        </p>
      </div>

      <div className="space-y-1">
        <label className="block text-[13px] font-semibold text-gray-800 leading-tight">
          Tabla <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar (ej: cli)..."
          value={filtroTabla}
          onChange={(e) => setFiltroTabla(e.target.value)}
          className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-colors"
        />
        {(!formPregunta.catalogo_tabla ||
          filtroTabla !== formPregunta.catalogo_tabla) && (
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-[9px] bg-white divide-y divide-gray-100">
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
              tablasParaMostrar.map((tabla) => (
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
                  className="block w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  {tabla}
                </button>
              ))}
          </div>
        )}
        {formPregunta.catalogo_tabla && (
          <p className="text-xs text-gray-600">
            Seleccionada: <strong>{formPregunta.catalogo_tabla}</strong>{" "}
            <button
              type="button"
              onClick={() => setFiltroTabla("")}
              className="text-gray-700 underline hover:text-gray-900"
            >
              cambiar
            </button>
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-[13px] font-semibold text-gray-800 leading-tight">
          Columna visible <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar..."
          value={filtroColumna}
          onChange={(e) => setFiltroColumna(e.target.value)}
          disabled={!formPregunta.catalogo_tabla}
          className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 disabled:bg-gray-100 transition-colors"
        />
        {(!formPregunta.catalogo_columna ||
          filtroColumna !== formPregunta.catalogo_columna) && (
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-[9px] bg-white divide-y divide-gray-100">
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
              columnasParaMostrar.map((columna) => (
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
                  className="block w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  {columna}
                </button>
              ))}
          </div>
        )}
        {formPregunta.catalogo_columna && (
          <p className="text-xs text-gray-600">
            Seleccionada: <strong>{formPregunta.catalogo_columna}</strong>{" "}
            <button
              type="button"
              onClick={() => setFiltroColumna("")}
              className="text-gray-700 underline hover:text-gray-900"
            >
              cambiar
            </button>
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-[13px] font-semibold text-gray-800 leading-tight">
          Primary Key (PK) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="Escribe para filtrar..."
          value={filtroLlave}
          onChange={(e) => setFiltroLlave(e.target.value)}
          disabled={!formPregunta.catalogo_tabla}
          className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 disabled:bg-gray-100 transition-colors"
        />
        {(!formPregunta.catalogo_pk_column ||
          filtroLlave !== formPregunta.catalogo_pk_column) && (
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-[9px] bg-white divide-y divide-gray-100">
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
              llaveParaMostrar.map((columna) => (
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
                  className="block w-full text-left px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  {columna}
                </button>
              ))}
          </div>
        )}
        {formPregunta.catalogo_pk_column && (
          <p className="text-xs text-gray-600">
            Seleccionada: <strong>{formPregunta.catalogo_pk_column}</strong>{" "}
            <button
              type="button"
              onClick={() => setFiltroLlave("")}
              className="text-gray-700 underline hover:text-gray-900"
            >
              cambiar
            </button>
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-[13px] font-semibold text-gray-800 leading-tight">
          Condición fija (opcional)
        </label>
        <select
          value={formPregunta.catalogo_columna_condicion || ""}
          onChange={(e) =>
            setFormPregunta({
              ...formPregunta,
              catalogo_columna_condicion: e.target.value,
            })
          }
          disabled={!formPregunta.catalogo_tabla}
          className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 text-[13.5px] bg-white text-gray-900 disabled:bg-gray-100"
        >
          <option value="">Detectar automáticamente (columna de estado)</option>
          {catalogoColumnas.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>

        <label className="block text-[13px] font-semibold text-gray-800 leading-tight mt-1">
          Valor requerido (obligatorio si eliges columna arriba)
        </label>
        <input
          type="text"
          placeholder="Ej: A, ACTIVE, URBANA..."
          value={formPregunta.catalogo_valor_condicion || ""}
          onChange={(e) =>
            setFormPregunta({
              ...formPregunta,
              catalogo_valor_condicion: e.target.value,
            })
          }
          className="w-full border border-gray-300 rounded-[9px] px-2.5 py-2 text-[13.5px] bg-white text-gray-900"
        />
        <p className="text-xs text-gray-500">
          Solo se muestran filas donde esa columna tenga exactamente ese
          valor — sirve para cualquier condición fija, no solo activo/inactivo
          (ej: tipo = 'URBANA'). Si dejas ambos vacíos, se detecta la columna
          de estado por convención de nombre y se acepta
          'A'/'ACTIVO'/'SI'/'S'/true.
        </p>
      </div>

      {/* Filtro de catálogo — anidado aquí porque solo tiene sentido una vez
          elegida la tabla de arriba: filtra ESAS mismas filas según la
          respuesta de otra pregunta. */}
      <div className="h-px bg-gray-200" />
      <div className="space-y-1.5">
        <h4 className="text-[12.5px] font-bold text-gray-800">
          Filtro de catálogo
        </h4>

        <label className="flex items-center gap-1.5 p-1.5 bg-white rounded-[9px] border border-slate-200 cursor-pointer hover:bg-slate-50 text-xs">
          <input
            type="checkbox"
            checked={formPregunta.catalogo_filtro_dependiente}
            onChange={(e) =>
              setFormPregunta({
                ...formPregunta,
                catalogo_filtro_dependiente: e.target.checked,
              })
            }
            className="w-3.5 h-3.5 accent-blue-600"
          />
          <span className="font-medium text-gray-800">
            Estas opciones dependen de la respuesta de otra pregunta
          </span>
        </label>

        {formPregunta.catalogo_filtro_dependiente && (
          <div className="ml-5 space-y-1.5 p-1.5 bg-white rounded-[9px] border border-slate-200">
            <div className="space-y-0.5">
              <label className="block text-xs font-semibold text-gray-800 leading-tight">
                Sección de la pregunta{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formPregunta.catalogo_filtro_seccion_id ?? ""}
                onChange={(e) =>
                  setFormPregunta({
                    ...formPregunta,
                    catalogo_filtro_seccion_id: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                    catalogo_filtro_pregunta_id: null,
                  })
                }
                className="w-full border border-gray-300 rounded-[9px] px-2 py-1 text-xs bg-white"
              >
                <option value="">Seleccione sección</option>
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

            <div className="space-y-0.5">
              <label className="block text-xs font-semibold text-gray-800 leading-tight">
                Pregunta de la que depende{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formPregunta.catalogo_filtro_pregunta_id ?? ""}
                onChange={(e) =>
                  setFormPregunta({
                    ...formPregunta,
                    catalogo_filtro_pregunta_id: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  })
                }
                className="w-full border border-gray-300 rounded-[9px] px-2 py-1 text-xs bg-white disabled:bg-gray-100"
                disabled={!formPregunta.catalogo_filtro_seccion_id}
              >
                <option value="">Seleccione pregunta</option>
                {preguntas
                  .filter(
                    (p) =>
                      p.seccion_id ===
                        formPregunta.catalogo_filtro_seccion_id &&
                      p.fp_id !== editandoPregunta,
                  )
                  .map((p) => (
                    <option key={p.fp_id} value={p.fp_id}>
                      {p.fp_descripcion}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-0.5">
              <label className="block text-xs font-semibold text-gray-800 leading-tight">
                Columna del catálogo a filtrar{" "}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={formPregunta.catalogo_filtro_columna}
                onChange={(e) =>
                  setFormPregunta({
                    ...formPregunta,
                    catalogo_filtro_columna: e.target.value,
                  })
                }
                disabled={!formPregunta.catalogo_tabla}
                className="w-full border border-gray-300 rounded-[9px] px-2 py-1 text-xs bg-white disabled:bg-gray-100"
              >
                <option value="">Seleccione columna</option>
                {catalogoColumnas.map((columna) => (
                  <option key={columna} value={columna}>
                    {columna}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-800">
                Reglas (respuesta de la pregunta → valor a filtrar):
              </p>
              {formPregunta.catalogo_filtro_reglas.length === 0 && (
                <p className="text-xs text-gray-600">
                  Sin reglas todavía — mientras tanto el catálogo no muestra
                  ninguna opción.
                </p>
              )}
              {formPregunta.catalogo_filtro_reglas.map((regla, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-white p-1 rounded-[9px] border border-slate-200"
                >
                  <input
                    type="text"
                    placeholder="Ej: Si"
                    value={regla.valor}
                    onChange={(e) => {
                      const nuevas = [
                        ...formPregunta.catalogo_filtro_reglas,
                      ];
                      nuevas[index] = {
                        ...nuevas[index],
                        valor: e.target.value,
                      };
                      setFormPregunta({
                        ...formPregunta,
                        catalogo_filtro_reglas: nuevas,
                      });
                    }}
                    className="flex-1 border border-gray-300 rounded-[9px] px-1 py-0.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Ej: CR"
                    value={regla.valor_filtro}
                    onChange={(e) => {
                      const nuevas = [
                        ...formPregunta.catalogo_filtro_reglas,
                      ];
                      nuevas[index] = {
                        ...nuevas[index],
                        valor_filtro: e.target.value,
                      };
                      setFormPregunta({
                        ...formPregunta,
                        catalogo_filtro_reglas: nuevas,
                      });
                    }}
                    className="w-32 border border-gray-300 rounded-[9px] px-1 py-0.5 text-xs"
                  />
                  <button
                    onClick={() => {
                      const nuevas =
                        formPregunta.catalogo_filtro_reglas.filter(
                          (_, i) => i !== index,
                        );
                      setFormPregunta({
                        ...formPregunta,
                        catalogo_filtro_reglas: nuevas,
                      });
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setFormPregunta({
                    ...formPregunta,
                    catalogo_filtro_reglas: [
                      ...formPregunta.catalogo_filtro_reglas,
                      { valor: "", valor_filtro: "" },
                    ],
                  })
                }
                className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs flex items-center gap-0.5 font-semibold transition-colors duration-150"
              >
                <Plus className="h-3 w-3" />
                Agregar regla
              </button>
              <p className="text-xs text-gray-500">
                Si la respuesta actual no coincide con ninguna regla, el
                catálogo queda sin opciones (no se muestra sin filtrar).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
