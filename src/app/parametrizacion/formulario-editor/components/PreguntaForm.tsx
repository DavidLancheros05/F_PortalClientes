"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, Save, X } from "lucide-react";
import { ConfirmModal, ModalPortal } from "@/components/modals";
import { Toast } from "@/components/Toast";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import { fallbackTipoLabels, getTipoLabel } from "../lib/tipo-labels";
import {
  PreguntaFormTipo,
  PreguntaFormDescripcionSeccion,
  PreguntaFormPresentacion,
} from "./PreguntaFormCamposComunes";
import { PreguntaFormSubtipos } from "./PreguntaFormSubtipos";
import { PreguntaFormDependencia } from "./PreguntaFormDependencia";
import { PreguntaFormPrecarga } from "./PreguntaFormPrecarga";
import { PreguntaFormFuenteExterna } from "./PreguntaFormFuenteExterna";
import { PreguntaFormCatalogoExterno } from "./PreguntaFormCatalogoExterno";
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

const EYEBROW_GRUPO =
  "text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400";

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
  confirmarGuardarPregunta: () => void;
  guardandoPregunta: boolean;
  mostrarConfirmarGuardarPregunta: boolean;
  setMostrarConfirmarGuardarPregunta: (value: boolean) => void;
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
  filtroPrecargaTabla: string;
  setFiltroPrecargaTabla: (value: string) => void;
  filtroPrecargaColumna: string;
  setFiltroPrecargaColumna: (value: string) => void;
  catalogoPrecargaTablas: string[];
  catalogoPrecargaColumnas: string[];
  loadingCatalogoPrecargaTablas: boolean;
  loadingCatalogoPrecargaColumnas: boolean;
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
  confirmarGuardarPregunta,
  guardandoPregunta,
  mostrarConfirmarGuardarPregunta,
  setMostrarConfirmarGuardarPregunta,
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
  filtroPrecargaTabla,
  setFiltroPrecargaTabla,
  filtroPrecargaColumna,
  setFiltroPrecargaColumna,
  catalogoPrecargaTablas,
  catalogoPrecargaColumnas,
  loadingCatalogoPrecargaTablas,
  loadingCatalogoPrecargaColumnas,
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
  const [avanzadasAbiertas, setAvanzadasAbiertas] = useState(false);

  // El toast reemplaza el ConfirmModal de "Pregunta creada/editada" — el
  // formulario ya se cierra solo (usePreguntaEditor limpia
  // nuevaPregunta/editandoPregunta al guardar), así que basta con
  // autodesvanecer el aviso.
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [successMessage, setSuccessMessage]);

  const toastMessage =
    successMessage === "creada"
      ? "Pregunta creada correctamente"
      : successMessage === "editada"
        ? "Pregunta actualizada correctamente"
        : null;

  const seccionActual = secciones.find(
    (s) => (s.fs_id || s.seccion_id) === formPregunta.seccion_id,
  );
  const seccionActualNombre =
    seccionActual?.fs_nombre || seccionActual?.seccion_nombre;
  const tipoActualCatalogo = tiposPregunta.find(
    (t) => t.fti_codigo === formPregunta.tipo,
  );
  const tipoActualLabel = tipoActualCatalogo
    ? getTipoLabel(tipoActualCatalogo)
    : fallbackTipoLabels[formPregunta.tipo];

  const cerrarFormulario = () => {
    setNuevaPregunta(false);
    setEditandoPregunta(null);
    setOpciones([]);
    setNuevaOpcion("");
    setErrorPregunta(null);
  };

  return (
    <>
      {/* Formulario nueva/editar pregunta */}
      {(nuevaPregunta || editandoPregunta) && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
              <div
                className="flex-shrink-0 rounded-t-[20px] px-5 py-4 text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #2563eb, #1d4ed8 55%, #3730a3)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {seccionActualNombre && (
                      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-blue-200 truncate">
                        {seccionActualNombre}
                      </p>
                    )}
                    <h3 className="text-[19px] font-bold truncate mt-0.5">
                      {editandoPregunta ? "Editar pregunta" : "Nueva pregunta"}
                    </h3>
                    <p className="text-xs text-[#c7d7fe] mt-0.5 truncate">
                      {tipoActualLabel}
                    </p>
                  </div>
                  <button
                    onClick={cerrarFormulario}
                    className="flex-shrink-0 p-2 rounded-[10px] bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {errorPregunta && (
                <div className="mx-4 mt-3 flex items-start justify-between gap-2 rounded-[9px] border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 flex-shrink-0">
                  <span>{errorPregunta}</span>
                  <button
                    onClick={() => setErrorPregunta(null)}
                    className="text-red-600 hover:bg-red-100 p-0.5 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

          <div className="space-y-4 flex-1 min-h-0 overflow-y-auto px-4 py-3">

        <div className="space-y-4">
          <p className={EYEBROW_GRUPO}>Contenido de la pregunta</p>

          <PreguntaFormTipo
            formPregunta={formPregunta}
            setFormPregunta={setFormPregunta}
            setOpciones={setOpciones}
            setOpcionesNuevas={setOpcionesNuevas}
            tiposPregunta={tiposPregunta}
            editandoPregunta={editandoPregunta}
          />

          <PreguntaFormSubtipos
            formPregunta={formPregunta}
            setFormPregunta={setFormPregunta}
          />

          <PreguntaFormDescripcionSeccion
            formPregunta={formPregunta}
            setFormPregunta={setFormPregunta}
            editandoPregunta={editandoPregunta}
            secciones={secciones}
            preguntas={preguntas}
          />
        </div>

        <div className="h-px bg-slate-100" />

        <div className="space-y-4">
          <p className={EYEBROW_GRUPO}>Presentación y comportamiento</p>

          <PreguntaFormPresentacion
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

          <PreguntaFormCatalogoExterno
            formPregunta={formPregunta}
            setFormPregunta={setFormPregunta}
            editandoPregunta={editandoPregunta}
            nuevaPregunta={nuevaPregunta}
            secciones={secciones}
            preguntas={preguntas}
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
          />

          {![TIPOS_PREGUNTA.NOTA, TIPOS_PREGUNTA.FECHA_HORA_ACTUAL].includes(
            formPregunta.tipo as any,
          ) && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setAvanzadasAbiertas((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-[12.5px] font-bold text-gray-800">
                  Opciones avanzadas · Precarga automática
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-500 transition-transform duration-200 flex-shrink-0 ${
                    avanzadasAbiertas ? "rotate-180" : ""
                  }`}
                />
              </button>
              {avanzadasAbiertas && (
                <div className="p-3 space-y-3 border-t border-gray-200">
                  <PreguntaFormPrecarga
                    formPregunta={formPregunta}
                    setFormPregunta={setFormPregunta}
                    filtroBaseDatos={filtroBaseDatos}
                    setFiltroBaseDatos={setFiltroBaseDatos}
                    filtroPrecargaTabla={filtroPrecargaTabla}
                    setFiltroPrecargaTabla={setFiltroPrecargaTabla}
                    filtroPrecargaColumna={filtroPrecargaColumna}
                    setFiltroPrecargaColumna={setFiltroPrecargaColumna}
                    basesFiltradas={basesFiltradas}
                    catalogoPrecargaTablas={catalogoPrecargaTablas}
                    catalogoPrecargaColumnas={catalogoPrecargaColumnas}
                    loadingCatalogoPrecargaTablas={loadingCatalogoPrecargaTablas}
                    loadingCatalogoPrecargaColumnas={loadingCatalogoPrecargaColumnas}
                  />

                  <PreguntaFormFuenteExterna
                    formPregunta={formPregunta}
                    setFormPregunta={setFormPregunta}
                    documentosCatalogo={documentosCatalogo}
                    loadingDocumentosCatalogo={loadingDocumentosCatalogo}
                    setOpcionesNuevas={setOpcionesNuevas}
                  />
                </div>
              )}
            </div>
          )}

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
              <div className="border border-gray-200 bg-slate-50 rounded-xl p-3 space-y-1.5">
                <h4 className="text-[12.5px] font-bold text-gray-800 mb-0.5">
                  Espacio en blanco para firma manual
                </h4>
                <label className="block text-[13px] font-semibold text-gray-800 leading-tight">
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
                  className="border border-gray-300 rounded-[9px] px-2.5 py-2 text-[13.5px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Alto del espacio en blanco que se dibuja en el PDF para
                  que el cliente firme a mano tras imprimir/descargar. No
                  se pide ningún archivo en el formulario en línea.
                </p>
              </div>
            )}

          {/* Cantidad máxima de archivos, tipo ARCHIVO */}
          {(editandoPregunta || nuevaPregunta) &&
            formPregunta.tipo === TIPOS_PREGUNTA.ARCHIVO && (
              <div className="border border-gray-200 bg-slate-50 rounded-xl p-3 space-y-1.5">
                <h4 className="text-[12.5px] font-bold text-gray-800 mb-0.5">
                  Cantidad de archivos
                </h4>
                <label className="block text-[13px] font-semibold text-gray-800 leading-tight">
                  Máximo de archivos (vacío o 1 = un solo archivo)
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="1"
                  value={formPregunta.archivo_maximo}
                  onChange={(e) =>
                    setFormPregunta({
                      ...formPregunta,
                      archivo_maximo: e.target.value,
                    })
                  }
                  className="border border-gray-300 rounded-[9px] px-2.5 py-2 text-[13.5px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Si pones más de 1, el cliente podrá subir varios archivos
                  para esta pregunta (ej. varios soportes de un mismo
                  documento).
                </p>
              </div>
            )}
        </div>

              </div>

              {/* Botones guardar / cancelar */}
              <div className="flex gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-[20px] flex-shrink-0">
                <button
                  onClick={guardarPregunta}
                  disabled={!puedeGuardarPregunta}
                  title={
                    puedeGuardarPregunta
                      ? undefined
                      : "Completa los campos requeridos para poder guardar"
                  }
                  className="flex-1 px-3 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-150 flex items-center justify-center gap-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5" />
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
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors duration-150 text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
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
      isOpen={mostrarConfirmarGuardarPregunta}
      title={editandoPregunta ? "Confirmar edición" : "Confirmar nueva pregunta"}
      message={
        editandoPregunta
          ? "¿Deseas guardar los cambios de esta pregunta?"
          : "¿Deseas crear esta pregunta?"
      }
      confirmText="Sí, guardar"
      cancelText="Cancelar"
      isLoading={guardandoPregunta}
      onConfirm={confirmarGuardarPregunta}
      onCancel={() => setMostrarConfirmarGuardarPregunta(false)}
    />

    <Toast message={toastMessage} />
    </>
  );
}
