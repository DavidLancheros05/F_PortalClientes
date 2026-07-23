"use client";

import type { Dispatch, SetStateAction } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import { ColumnaCatalogoPicker } from "./ColumnaCatalogoPicker";
import type { FormPreguntaState } from "../hooks/types";

interface PreguntaFormColumnasTablaProps {
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
  editandoPregunta: number | null;
  nuevaPregunta: boolean;
  columnaCatalogoAbierta: number | null;
  setColumnaCatalogoAbierta: (index: number | null) => void;
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
  cargarBasesCatalogo: () => void;
  cargarTablasCatalogo: (baseDatos: string) => void;
  cargarColumnasCatalogo: (baseDatos: string, tabla: string) => void;
}

export function PreguntaFormColumnasTabla({
  formPregunta,
  setFormPregunta,
  editandoPregunta,
  nuevaPregunta,
  columnaCatalogoAbierta,
  setColumnaCatalogoAbierta,
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
  cargarBasesCatalogo,
  cargarTablasCatalogo,
  cargarColumnasCatalogo,
}: PreguntaFormColumnasTablaProps) {
  return (
    <>
  {/* Columnas TABLA */}
  {(editandoPregunta || nuevaPregunta) &&
    formPregunta.tipo === TIPOS_PREGUNTA.TABLA && (
      <div className="border border-purple-300 bg-purple-50 rounded p-2">
        <h4 className="font-semibold text-xs mb-0.5">
          Columnas de la tabla:
        </h4>
        <p className="text-xs text-purple-800 mb-1">
          El usuario podrá agregar filas y llenar estas
          columnas en el formulario de solicitud.
        </p>
        {formPregunta.tabla_columnas.length === 0 && (
          <p className="text-xs text-gray-600 mb-1">
            Aún no hay columnas
          </p>
        )}
        {formPregunta.tabla_columnas.length > 0 && (
          <div className="space-y-1 mb-2">
            {formPregunta.tabla_columnas.map(
              (columna, index) => (
                <div
                  key={index}
                  className="bg-white p-1 rounded border border-gray-200 text-xs space-y-1"
                >
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder={`Columna ${index + 1}`}
                      value={columna.nombre}
                      onChange={(e) => {
                        const nuevas = [
                          ...formPregunta.tabla_columnas,
                        ];
                        nuevas[index] = {
                          ...nuevas[index],
                          nombre: e.target.value,
                        };
                        setFormPregunta({
                          ...formPregunta,
                          tabla_columnas: nuevas,
                        });
                      }}
                      className="flex-1 border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <select
                      value={columna.tipo}
                      onChange={(e) => {
                        const nuevoTipo = e.target.value as
                          | "TEXTO"
                          | "NUMERO"
                          | "SI_NO"
                          | "CATALOGO"
                          | "MONEDA";
                        const nuevas = [
                          ...formPregunta.tabla_columnas,
                        ];
                        nuevas[index] = {
                          ...nuevas[index],
                          tipo: nuevoTipo,
                        };
                        setFormPregunta({
                          ...formPregunta,
                          tabla_columnas: nuevas,
                        });
                        if (nuevoTipo === "CATALOGO") {
                          setColumnaCatalogoAbierta(index);
                          setFiltroBaseDatos(
                            nuevas[index].catalogo_base_datos || "",
                          );
                          setFiltroTabla(
                            nuevas[index].catalogo_tabla || "",
                          );
                          setFiltroColumna(
                            nuevas[index].catalogo_columna || "",
                          );
                          setFiltroLlave(
                            nuevas[index].catalogo_pk_column || "",
                          );
                          cargarBasesCatalogo();
                          if (nuevas[index].catalogo_tabla) {
                            cargarTablasCatalogo(
                              nuevas[index].catalogo_base_datos || "",
                            );
                          }
                          if (
                            nuevas[index].catalogo_tabla &&
                            nuevas[index].catalogo_columna
                          ) {
                            cargarColumnasCatalogo(
                              nuevas[index].catalogo_base_datos || "",
                              nuevas[index].catalogo_tabla || "",
                            );
                          }
                        } else {
                          setColumnaCatalogoAbierta(null);
                        }
                      }}
                      className="border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                    >
                      <option value="TEXTO">Texto libre</option>
                      <option value="NUMERO">Solo números</option>
                      <option value="SI_NO">Sí / No</option>
                      <option value="MONEDA">Dinero ($)</option>
                      <option value="CATALOGO">Depende de una tabla</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (index === 0) return;
                        const nuevas = [
                          ...formPregunta.tabla_columnas,
                        ];
                        [nuevas[index - 1], nuevas[index]] = [
                          nuevas[index],
                          nuevas[index - 1],
                        ];
                        setFormPregunta({
                          ...formPregunta,
                          tabla_columnas: nuevas,
                        });
                        setColumnaCatalogoAbierta(null);
                      }}
                      disabled={index === 0}
                      className="p-1 text-purple-700 hover:bg-purple-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          index ===
                          formPregunta.tabla_columnas.length - 1
                        )
                          return;
                        const nuevas = [
                          ...formPregunta.tabla_columnas,
                        ];
                        [nuevas[index], nuevas[index + 1]] = [
                          nuevas[index + 1],
                          nuevas[index],
                        ];
                        setFormPregunta({
                          ...formPregunta,
                          tabla_columnas: nuevas,
                        });
                        setColumnaCatalogoAbierta(null);
                      }}
                      disabled={
                        index ===
                        formPregunta.tabla_columnas.length - 1
                      }
                      className="p-1 text-purple-700 hover:bg-purple-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        const nuevas =
                          formPregunta.tabla_columnas.filter(
                            (_, i) => i !== index,
                          );
                        setFormPregunta({
                          ...formPregunta,
                          tabla_columnas: nuevas,
                        });
                        if (columnaCatalogoAbierta === index) {
                          setColumnaCatalogoAbierta(null);
                        }
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {columna.tipo === "CATALOGO" && (
                    <div className="rounded border border-sky-200 bg-sky-50 p-1.5">
                      {columnaCatalogoAbierta !== index ? (
                        <button
                          type="button"
                          onClick={() => {
                            setColumnaCatalogoAbierta(index);
                            setFiltroBaseDatos(
                              columna.catalogo_base_datos || "",
                            );
                            setFiltroTabla(columna.catalogo_tabla || "");
                            setFiltroColumna(
                              columna.catalogo_columna || "",
                            );
                            setFiltroLlave(
                              columna.catalogo_pk_column || "",
                            );
                            cargarBasesCatalogo();
                            cargarTablasCatalogo(
                              columna.catalogo_base_datos || "",
                            );
                            if (columna.catalogo_tabla) {
                              cargarColumnasCatalogo(
                                columna.catalogo_base_datos || "",
                                columna.catalogo_tabla,
                              );
                            }
                          }}
                          className="text-xs text-sky-700 underline hover:text-sky-900"
                        >
                          {columna.catalogo_tabla
                            ? `Tabla: ${columna.catalogo_tabla} · Columna: ${columna.catalogo_columna || "(sin elegir)"} — cambiar`
                            : "Configurar de qué tabla depende esta columna"}
                        </button>
                      ) : (
                        <ColumnaCatalogoPicker
                          columna={columna}
                          onChange={(cambios) => {
                            const nuevas = [
                              ...formPregunta.tabla_columnas,
                            ];
                            nuevas[index] = {
                              ...nuevas[index],
                              ...cambios,
                            };
                            setFormPregunta({
                              ...formPregunta,
                              tabla_columnas: nuevas,
                            });
                          }}
                          onCerrar={() => setColumnaCatalogoAbierta(null)}
                          catalogoBases={catalogoBases}
                          catalogoTablas={catalogoTablas}
                          catalogoColumnas={catalogoColumnas}
                          basesFiltradas={basesFiltradas}
                          tablasFiltradas={tablasFiltradas}
                          columnasFiltradas={columnasFiltradas}
                          loadingCatalogoBases={loadingCatalogoBases}
                          loadingCatalogoTablas={loadingCatalogoTablas}
                          loadingCatalogoColumnas={loadingCatalogoColumnas}
                          filtroBaseDatos={filtroBaseDatos}
                          setFiltroBaseDatos={setFiltroBaseDatos}
                          filtroTabla={filtroTabla}
                          setFiltroTabla={setFiltroTabla}
                          filtroColumna={filtroColumna}
                          setFiltroColumna={setFiltroColumna}
                          llaveFiltrada={llaveFiltrada}
                          filtroLlave={filtroLlave}
                          setFiltroLlave={setFiltroLlave}
                          cargarTablasCatalogo={cargarTablasCatalogo}
                          cargarColumnasCatalogo={cargarColumnasCatalogo}
                          columnasCatalogoDisponibles={formPregunta.tabla_columnas
                            .filter(
                              (c, i) =>
                                c.tipo === "CATALOGO" &&
                                i !== index &&
                                c.nombre.trim(),
                            )
                            .map((c) => c.nombre)}
                        />
                      )}
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        )}
        <button
          onClick={() =>
            setFormPregunta({
              ...formPregunta,
              tabla_columnas: [
                ...formPregunta.tabla_columnas,
                { nombre: "", tipo: "TEXTO" },
              ],
            })
          }
          className="px-2 py-1 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded hover:shadow-lg hover:from-purple-600 hover:to-purple-700 hover:scale-105 active:scale-95 text-xs flex items-center gap-0.5 font-semibold transition-all duration-200"
        >
          <Plus className="h-3 w-3" />
          Agregar columna
        </button>
      </div>
    )}
    </>
  );
}
