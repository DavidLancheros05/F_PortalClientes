"use client";

import type { Dispatch, SetStateAction } from "react";
import { Save, X } from "lucide-react";
import { ConfirmModal } from "@/components/modals";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import { PreguntaFormCamposComunes } from "./PreguntaFormCamposComunes";
import { PreguntaFormSubtipos } from "./PreguntaFormSubtipos";
import { PreguntaFormDependencia } from "./PreguntaFormDependencia";
import { PreguntaFormPrecarga } from "./PreguntaFormPrecarga";
import { PreguntaFormFuenteExterna } from "./PreguntaFormFuenteExterna";
import { PreguntaFormOpciones } from "./PreguntaFormOpciones";
import { PreguntaFormColumnasTabla } from "./PreguntaFormColumnasTabla";
import { PreguntaFormLimiteFilas } from "./PreguntaFormLimiteFilas";
import type {
  DocumentoCatalogo,
  FormPreguntaState,
  Opcion,
  Pregunta,
  Seccion,
  TipoPreguntaCatalogo,
} from "../hooks/types";

export interface PreguntaFormProps {
  nuevaPregunta: boolean;
  editandoPregunta: number | null;
  setNuevaPregunta: (value: boolean) => void;
  setEditandoPregunta: (id: number | null) => void;
  setOpciones: Dispatch<SetStateAction<Opcion[]>>;
  setNuevaOpcion: (value: string) => void;
  setErrorPregunta: (value: string | null) => void;
  errorPregunta: string | null;
  formPregunta: FormPreguntaState;
  setFormPregunta: Dispatch<SetStateAction<FormPreguntaState>>;
  setOpcionesNuevas: Dispatch<SetStateAction<string[]>>;
  guardarPregunta: () => void;
  puedeGuardarPregunta: boolean;
  tiposPregunta: TipoPreguntaCatalogo[];
  secciones: Seccion[];
  preguntas: Pregunta[];
  opcionesPreguntaPadre: Opcion[];
  loadingOpcionesPreguntaPadre: boolean;
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
  filtroLlave: string;
  setFiltroLlave: (value: string) => void;
  llaveFiltrada: string[];
  catalogoBases: string[];
  loadingCatalogoBases: boolean;
  documentosCatalogo: DocumentoCatalogo[];
  loadingDocumentosCatalogo: boolean;
  loading_opciones: boolean;
  opciones: Opcion[];
  opcionesNuevas: string[];
  opcionEditandoId: number | null;
  opcionEditandoValor: string;
  setOpcionEditandoValor: (value: string) => void;
  guardarEdicionOpcion: () => void;
  cancelarEdicionOpcion: () => void;
  iniciarEdicionOpcion: (opcion: Opcion) => void;
  eliminarOpcion: (opcionId: number) => void;
  obtenerPreguntasDependientesDeOpcion: (opcionId: number) => Pregunta[];
  eliminarOpcionNueva: (index: number) => void;
  nuevaOpcion: string;
  agregarOpcion: () => void;
  columnaCatalogoAbierta: number | null;
  setColumnaCatalogoAbierta: (index: number | null) => void;
  cargarBasesCatalogo: () => void;
  cargarTablasCatalogo: (baseDatos: string) => void;
  cargarColumnasCatalogo: (baseDatos: string, tabla: string) => void;
  opcionAEliminar: number | null;
  setOpcionAEliminar: (id: number | null) => void;
  confirmarEliminarOpcion: () => void;
  successMessage: "creada" | "editada" | null;
  setSuccessMessage: (value: "creada" | "editada" | null) => void;
}

export function PreguntaForm({
  nuevaPregunta,
  editandoPregunta,
  setNuevaPregunta,
  setEditandoPregunta,
  setOpciones,
  setNuevaOpcion,
  setErrorPregunta,
  errorPregunta,
  formPregunta,
  setFormPregunta,
  setOpcionesNuevas,
  guardarPregunta,
  puedeGuardarPregunta,
  tiposPregunta,
  secciones,
  preguntas,
  opcionesPreguntaPadre,
  loadingOpcionesPreguntaPadre,
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
  filtroLlave,
  setFiltroLlave,
  llaveFiltrada,
  catalogoBases,
  loadingCatalogoBases,
  documentosCatalogo,
  loadingDocumentosCatalogo,
  loading_opciones,
  opciones,
  opcionesNuevas,
  opcionEditandoId,
  opcionEditandoValor,
  setOpcionEditandoValor,
  guardarEdicionOpcion,
  cancelarEdicionOpcion,
  iniciarEdicionOpcion,
  eliminarOpcion,
  obtenerPreguntasDependientesDeOpcion,
  eliminarOpcionNueva,
  nuevaOpcion,
  agregarOpcion,
  columnaCatalogoAbierta,
  setColumnaCatalogoAbierta,
  cargarBasesCatalogo,
  cargarTablasCatalogo,
  cargarColumnasCatalogo,
  opcionAEliminar,
  setOpcionAEliminar,
  confirmarEliminarOpcion,
  successMessage,
  setSuccessMessage,
}: PreguntaFormProps) {
  return (
    <>
      {/* Formulario nueva/editar pregunta */}
      {(nuevaPregunta || editandoPregunta) && (
        <div className="mb-2 p-2 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 border-2 border-blue-300 rounded-lg flex flex-col max-h-[85vh] min-h-0 shadow-md">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-xs text-blue-900">
              {editandoPregunta
                ? "✏️ Editar Pregunta"
                : "✨ Nueva Pregunta"}
            </h3>
            <button
              onClick={() => {
                setNuevaPregunta(false);
                setEditandoPregunta(null);
                setOpciones([]);
                setNuevaOpcion("");
                setErrorPregunta(null);
              }}
              className="text-blue-600 hover:bg-blue-100 p-0.5 rounded-lg transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
      
          {errorPregunta && (
            <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border-2 border-red-300 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-800">
              <span>⚠️ {errorPregunta}</span>
              <button
                onClick={() => setErrorPregunta(null)}
                className="text-red-600 hover:bg-red-100 p-0.5 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
      
          <div className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-1">

        <PreguntaFormCamposComunes
          formPregunta={formPregunta}
          setFormPregunta={setFormPregunta}
          setOpciones={setOpciones}
          setOpcionesNuevas={setOpcionesNuevas}
          tiposPregunta={tiposPregunta}
          editandoPregunta={editandoPregunta}
          secciones={secciones}
          preguntas={preguntas}
        />

        <PreguntaFormSubtipos
          formPregunta={formPregunta}
          setFormPregunta={setFormPregunta}
        />

        {formPregunta.dependiente && (
          <PreguntaFormDependencia
            formPregunta={formPregunta}
            setFormPregunta={setFormPregunta}
            secciones={secciones}
            preguntas={preguntas}
            editandoPregunta={editandoPregunta}
            opcionesPreguntaPadre={opcionesPreguntaPadre}
            loadingOpcionesPreguntaPadre={loadingOpcionesPreguntaPadre}
          />
        )}

        {![TIPOS_PREGUNTA.NOTA, TIPOS_PREGUNTA.FECHA_HORA_ACTUAL].includes(
          formPregunta.tipo as any,
        ) && (
          <PreguntaFormPrecarga
            formPregunta={formPregunta}
            setFormPregunta={setFormPregunta}
            filtroBaseDatos={filtroBaseDatos}
            setFiltroBaseDatos={setFiltroBaseDatos}
            filtroTabla={filtroTabla}
            setFiltroTabla={setFiltroTabla}
            filtroColumna={filtroColumna}
            setFiltroColumna={setFiltroColumna}
            basesFiltradas={basesFiltradas}
            tablasFiltradas={tablasFiltradas}
            columnasFiltradas={columnasFiltradas}
            catalogoTablas={catalogoTablas}
            catalogoColumnas={catalogoColumnas}
            loadingCatalogoTablas={loadingCatalogoTablas}
            loadingCatalogoColumnas={loadingCatalogoColumnas}
          />
        )}

        <PreguntaFormFuenteExterna
          formPregunta={formPregunta}
          setFormPregunta={setFormPregunta}
          filtroBaseDatos={filtroBaseDatos}
          setFiltroBaseDatos={setFiltroBaseDatos}
          filtroTabla={filtroTabla}
          setFiltroTabla={setFiltroTabla}
          filtroColumna={filtroColumna}
          setFiltroColumna={setFiltroColumna}
          filtroLlave={filtroLlave}
          setFiltroLlave={setFiltroLlave}
          basesFiltradas={basesFiltradas}
          tablasFiltradas={tablasFiltradas}
          columnasFiltradas={columnasFiltradas}
          llaveFiltrada={llaveFiltrada}
          catalogoBases={catalogoBases}
          catalogoTablas={catalogoTablas}
          catalogoColumnas={catalogoColumnas}
          loadingCatalogoBases={loadingCatalogoBases}
          loadingCatalogoTablas={loadingCatalogoTablas}
          loadingCatalogoColumnas={loadingCatalogoColumnas}
          documentosCatalogo={documentosCatalogo}
          loadingDocumentosCatalogo={loadingDocumentosCatalogo}
          setOpcionesNuevas={setOpcionesNuevas}
        />

        {(editandoPregunta || nuevaPregunta) &&
          (formPregunta.tipo === TIPOS_PREGUNTA.SELECT ||
            formPregunta.tipo === TIPOS_PREGUNTA.MULTISELECT) && (
            <PreguntaFormOpciones
              formPregunta={formPregunta}
              editandoPregunta={editandoPregunta}
              nuevaPregunta={nuevaPregunta}
              loading_opciones={loading_opciones}
              opciones={opciones}
              opcionesNuevas={opcionesNuevas}
              opcionEditandoId={opcionEditandoId}
              opcionEditandoValor={opcionEditandoValor}
              setOpcionEditandoValor={setOpcionEditandoValor}
              guardarEdicionOpcion={guardarEdicionOpcion}
              cancelarEdicionOpcion={cancelarEdicionOpcion}
              iniciarEdicionOpcion={iniciarEdicionOpcion}
              eliminarOpcion={eliminarOpcion}
              obtenerPreguntasDependientesDeOpcion={obtenerPreguntasDependientesDeOpcion}
              eliminarOpcionNueva={eliminarOpcionNueva}
              nuevaOpcion={nuevaOpcion}
              setNuevaOpcion={setNuevaOpcion}
              agregarOpcion={agregarOpcion}
            />
          )}

        {(editandoPregunta || nuevaPregunta) &&
          formPregunta.tipo === TIPOS_PREGUNTA.TABLA && (
            <>
              <PreguntaFormColumnasTabla
                formPregunta={formPregunta}
                setFormPregunta={setFormPregunta}
                editandoPregunta={editandoPregunta}
                nuevaPregunta={nuevaPregunta}
                columnaCatalogoAbierta={columnaCatalogoAbierta}
                setColumnaCatalogoAbierta={setColumnaCatalogoAbierta}
                filtroBaseDatos={filtroBaseDatos}
                setFiltroBaseDatos={setFiltroBaseDatos}
                filtroTabla={filtroTabla}
                setFiltroTabla={setFiltroTabla}
                filtroColumna={filtroColumna}
                setFiltroColumna={setFiltroColumna}
                filtroLlave={filtroLlave}
                setFiltroLlave={setFiltroLlave}
                basesFiltradas={basesFiltradas}
                tablasFiltradas={tablasFiltradas}
                columnasFiltradas={columnasFiltradas}
                llaveFiltrada={llaveFiltrada}
                catalogoBases={catalogoBases}
                catalogoTablas={catalogoTablas}
                catalogoColumnas={catalogoColumnas}
                loadingCatalogoBases={loadingCatalogoBases}
                loadingCatalogoTablas={loadingCatalogoTablas}
                loadingCatalogoColumnas={loadingCatalogoColumnas}
                cargarBasesCatalogo={cargarBasesCatalogo}
                cargarTablasCatalogo={cargarTablasCatalogo}
                cargarColumnasCatalogo={cargarColumnasCatalogo}
              />
              <PreguntaFormLimiteFilas
                formPregunta={formPregunta}
                setFormPregunta={setFormPregunta}
                editandoPregunta={editandoPregunta}
                nuevaPregunta={nuevaPregunta}
                secciones={secciones}
                preguntas={preguntas}
              />
            </>
          )}

            {/* Número de líneas ESPACIO_FIRMA */}
            {(editandoPregunta || nuevaPregunta) &&
              formPregunta.tipo === TIPOS_PREGUNTA.ESPACIO_FIRMA && (
                <div className="border border-indigo-300 bg-indigo-50 rounded p-2 space-y-1.5">
                  <h4 className="font-semibold text-xs mb-0.5">
                    Espacio en blanco para firma manual
                  </h4>
                  <label className="block text-xs font-semibold text-indigo-900 leading-tight">
                    Número de líneas
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="5"
                    value={formPregunta.espacio_lineas}
                    onChange={(e) =>
                      setFormPregunta({
                        ...formPregunta,
                        espacio_lineas: e.target.value,
                      })
                    }
                    className="border border-indigo-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500">
                    Alto del espacio en blanco que se dibuja en el PDF para
                    que el cliente firme a mano tras imprimir/descargar. No
                    se pide ningún archivo en el formulario en línea.
                  </p>
                </div>
              )}
      
            {/* Botones guardar / cancelar */}
            <div className="sticky bottom-0 z-10 flex gap-1 pt-1 border-t border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <button
                onClick={guardarPregunta}
                disabled={!puedeGuardarPregunta}
                title={
                  puedeGuardarPregunta
                    ? undefined
                    : "Completa los campos requeridos para poder guardar"
                }
                className="flex-1 px-2 py-1 bg-gradient-to-br from-blue-600 to-blue-700 text-white font-semibold rounded hover:shadow-lg hover:from-blue-700 hover:to-blue-800 hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-0.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-sm"
              >
                <Save className="h-3 w-3" />
                Guardar
              </button>
              <button
                onClick={() => {
                  setNuevaPregunta(false);
                  setEditandoPregunta(null);
                  setOpciones([]);
                  setOpcionesNuevas([]);
                  setNuevaOpcion("");
                  setErrorPregunta(null);
                }}
                className="px-2 py-1 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 hover:border-gray-400 hover:shadow-md transition-all duration-200 text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
    )}

    <ConfirmModal
      isOpen={opcionAEliminar !== null}
      title="Eliminar opción"
      message="¿Estás seguro de que deseas eliminar esta opción? Las respuestas asociadas quedarán sin opción."
      confirmText="Eliminar"
      isDangerous
      onConfirm={confirmarEliminarOpcion}
      onCancel={() => setOpcionAEliminar(null)}
    />
    
    <ConfirmModal
      isOpen={successMessage !== null}
      title={successMessage === "creada" ? "✅ Pregunta creada" : "✅ Pregunta editada"}
      message={
        successMessage === "creada"
          ? "La pregunta ha sido creada exitosamente."
          : "La pregunta ha sido editada exitosamente."
      }
      confirmText="Aceptar"
      isDangerous={false}
      onConfirm={() => setSuccessMessage(null)}
      onCancel={() => setSuccessMessage(null)}
    />
    </>
  );
}
