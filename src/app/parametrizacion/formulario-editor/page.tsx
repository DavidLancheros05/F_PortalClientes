"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import { LoadingModal } from "@/components/modals";
import { useFormulario } from "./hooks/useFormulario";
import { useSeccionEditor } from "./hooks/useSeccionEditor";
import { usePreguntaEditor } from "./hooks/usePreguntaEditor";
import type { Pregunta, TipoPreguntaCatalogo } from "./hooks/types";

type SortableItemProps = {
  id: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
};

const SortableItem = ({
  id,
  children,
  disabled,
  className,
}: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className ?? ""} ${isDragging ? "opacity-70" : ""}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};

const fallbackTipoLabels: Record<Pregunta["fp_tipo"], string> = {
  FECHA_HORA_ACTUAL: "Visualizador fecha y hora actual",
  TEXTO: "Texto",
  NUMERO: "Número",
  FECHA: "Fecha",
  NOTA: "Nota informativa",
  SELECT: "Selección única (solo una opción)",
  SELECT_TABLA: "Selección desde tabla",
  DOCUMENTOS_TABLA: "Documentos desde tabla",
  MULTISELECT: "Selección múltiple (checkbox, varias opciones)",
  ARCHIVO: "Archivo / Documento",
  TABLA: "Tabla",
};

const getTipoLabel = (tipo: TipoPreguntaCatalogo) => {
  if (tipo.fti_codigo === "SELECT") return "Selección única (solo una opción)";
  if (tipo.fti_codigo === "MULTISELECT")
    return "Selección múltiple (checkbox, varias opciones)";
  if (tipo.fti_descripcion?.trim()) return tipo.fti_descripcion;
  return fallbackTipoLabels[tipo.fti_codigo] ?? tipo.fti_codigo;
};

export default function FormularioEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const formularioId = searchParams.get("formulario_id");
  const version = searchParams.get("version");
  const readonly = searchParams.get("readonly") === "true";

  // Si no hay formularioId, redirigir a la lista de formularios
  useEffect(() => {
    if (!formularioId) {
      router.push("/parametrizacion/formularios");
    }
  }, [formularioId, router]);

  const {
    formulario,
    formularioIdNumber,
    secciones,
    setSecciones,
    preguntas,
    setPreguntas,
    tiposPregunta,
    seccionSeleccionada,
    setSeccionSeleccionada,
    loading,
    cargarDatos,
    preguntasDeSeccion,
    navegarSeccion,
  } = useFormulario(formularioId, version);

  const {
    editandoSeccion,
    setEditandoSeccion,
    nuevaSeccion,
    setNuevaSeccion,
    formSeccion,
    setFormSeccion,
    guardarSeccion,
    iniciarEdicionSeccion,
    eliminarSeccion,
    cambiarOrdenSeccion,
    handleSeccionDragEnd,
  } = useSeccionEditor({
    secciones,
    setSecciones,
    seccionSeleccionada,
    setSeccionSeleccionada,
    cargarDatos,
    readonly,
  });

  const {
    editandoPregunta,
    setEditandoPregunta,
    nuevaPregunta,
    setNuevaPregunta,
    formPregunta,
    setFormPregunta,
    opciones,
    setOpciones,
    nuevaOpcion,
    setNuevaOpcion,
    loading_opciones,
    opcionesNuevas,
    setOpcionesNuevas,
    catalogoBases,
    loadingCatalogoBases,
    catalogoTablas,
    loadingCatalogoTablas,
    catalogoColumnas,
    loadingCatalogoColumnas,
    documentosCatalogo,
    loadingDocumentosCatalogo,
    filtroBaseDatos,
    setFiltroBaseDatos,
    filtroTabla,
    setFiltroTabla,
    filtroColumna,
    setFiltroColumna,
    basesFiltradas,
    tablasFiltradas,
    columnasFiltradas,
    guardarPregunta,
    iniciarEdicionPregunta,
    eliminarPregunta,
    agregarOpcion,
    eliminarOpcion,
    eliminarOpcionNueva,
    cambiarOrdenPregunta,
    handlePreguntaDragEnd,
    FORM_PREGUNTA_DEFAULT,
    error: errorPregunta,
    setError: setErrorPregunta,
  } = usePreguntaEditor({
    preguntas,
    setPreguntas,
    preguntasDeSeccion,
    secciones,
    seccionSeleccionada,
    formularioIdNumber,
    version,
    readonly,
    cargarDatos,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  if (loading) {
    return <LoadingModal isOpen message="Cargando formulario..." />;
  }

  const seccionActual = secciones.find(
    (s) => (s.fs_id || s.seccion_id) === seccionSeleccionada,
  );
  const indiceSeccion = secciones.findIndex(
    (s) => (s.fs_id || s.seccion_id) === seccionSeleccionada,
  );
  const editorUrlParams = new URLSearchParams();
  if (formularioId) editorUrlParams.set("formulario_id", formularioId);
  if (version) editorUrlParams.set("version", version);
  const editorModeUrl = `/parametrizacion/formulario-editor${
    editorUrlParams.toString() ? `?${editorUrlParams.toString()}` : ""
  }`;
  const seccionFormAbierto = nuevaSeccion || editandoSeccion !== null;
  const preguntaFormAbierto = nuevaPregunta || editandoPregunta !== null;
  const formularioEdicionAbierto = seccionFormAbierto || preguntaFormAbierto;

  return (
    <div className="w-full h-[calc(100vh-7rem)] p-2 bg-gradient-to-br from-slate-50 to-slate-100 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      {formulario && (
        <div className="mb-1 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-xl shadow-2xl p-3 text-white mx-auto max-w-7xl border border-blue-400/30">
          <div className="flex items-start justify-center gap-3">
            <div className="flex-1 text-center">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() =>
                    router.push(
                      `/parametrizacion/formularios/${formularioId}/versiones`,
                    )
                  }
                  className="p-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h1 className="text-lg font-bold">
                    {formulario?.frm_nombre || formulario?.formulario_nombre}
                    {readonly && (
                      <span className="ml-2 text-xs font-normal text-blue-100 bg-blue-900/30 px-2 py-0.5 rounded-full inline-block">
                        Solo lectura
                      </span>
                    )}
                  </h1>
                </div>
              </div>
              <p className="text-blue-100 mb-1 text-xs">
                {formulario?.frm_descripcion ||
                  formulario?.formulario_descripcion}
              </p>
              <div className="flex items-center gap-2 text-xs text-blue-100">
                <span className="inline-block bg-white/20 px-3 py-1 rounded-lg font-medium">
                  v{version || "1"}
                </span>
                {!readonly && (
                  <p className="text-xs text-blue-50 opacity-90 ml-2">
                    Los cambios se guardan en esta versión
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {!readonly && formularioId && (
                <button
                  onClick={() =>
                    router.push(
                      `/parametrizacion/formularios/${formularioId}/nueva-version`,
                    )
                  }
                  disabled={formularioEdicionAbierto}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200 shadow-md"
                >
                  <Plus className="h-5 w-5" />
                  Nueva versión
                </button>
              )}

              {readonly && formularioId && (
                <button
                  onClick={() => router.push(editorModeUrl)}
                  className="flex items-center gap-2 px-5 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md"
                >
                  <Edit2 className="h-5 w-5" />
                  Ir a edición
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!formulario && (
        <h1 className="text-lg font-bold mb-2 text-gray-900">
          Editor de Formulario
        </h1>
      )}

      <div className="h-[60vh] md:h-[65vh] min-h-[30rem] flex gap-2 overflow-hidden mx-auto max-w-7xl">
        {/* PANEL IZQUIERDO - SECCIONES */}
        <div className="w-1/3 min-h-0 bg-white rounded-xl shadow-lg p-3 flex flex-col overflow-hidden border-2 border-gray-100 hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">📑 Secciones</h2>
            <button
              onClick={() => {
                setNuevaSeccion(true);
                setEditandoSeccion(null);
                setFormSeccion({ nombre: "", descripcion: "" });
              }}
              disabled={readonly || formularioEdicionAbierto}
              className="flex items-center gap-1 px-2 py-1 bg-gradient-to-br from-emerald-500 via-emerald-550 to-emerald-600 text-white font-medium text-xs rounded-lg hover:shadow-xl hover:from-emerald-600 hover:via-emerald-600 hover:to-emerald-700 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
            >
              <Plus className="h-3 w-3" />
              Nueva
            </button>
          </div>

          {/* Formulario nueva/editar sección */}
          {(nuevaSeccion || editandoSeccion) && (
            <div className="mb-2 p-2 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-xs text-emerald-900">
                  {editandoSeccion ? "✏️ Editar Sección" : "✨ Nueva Sección"}
                </h3>
                <button
                  onClick={() => {
                    setNuevaSeccion(false);
                    setEditandoSeccion(null);
                  }}
                  className="text-emerald-600 hover:bg-emerald-100 p-0.5 rounded-lg transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-1.5">
                <div>
                  <label
                    htmlFor="seccion-nombre"
                    className="block text-xs font-semibold text-emerald-900 mb-1"
                  >
                    Nombre de la sección <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="seccion-nombre"
                    type="text"
                    placeholder="Ej: Datos de contacto"
                    value={formSeccion.nombre}
                    onChange={(e) =>
                      setFormSeccion({ ...formSeccion, nombre: e.target.value })
                    }
                    className="w-full border border-emerald-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:shadow-lg bg-white transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="seccion-descripcion"
                    className="block text-xs font-semibold text-emerald-900 mb-1"
                  >
                    Descripción{" "}
                    <span className="text-emerald-600 text-xs font-normal">
                      (opcional)
                    </span>
                  </label>
                  <textarea
                    id="seccion-descripcion"
                    placeholder="Ej: Información para contactar al cliente..."
                    value={formSeccion.descripcion}
                    onChange={(e) =>
                      setFormSeccion({
                        ...formSeccion,
                        descripcion: e.target.value,
                      })
                    }
                    className="w-full border border-emerald-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:shadow-lg bg-white transition-all resize-none"
                    rows={2}
                  />
                </div>
                <button
                  onClick={guardarSeccion}
                  className="w-full px-2 py-1 bg-gradient-to-br from-emerald-500 via-emerald-550 to-emerald-600 text-white rounded hover:shadow-xl hover:from-emerald-600 hover:via-emerald-600 hover:to-emerald-700 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1 text-xs font-semibold transition-all duration-200"
                >
                  <Save className="h-3 w-3" />
                  Guardar
                </button>
              </div>
            </div>
          )}

          {/* Lista de secciones */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSeccionDragEnd}
          >
            <SortableContext
              items={secciones.map((s) => `seccion-${s.fs_id || s.seccion_id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex-1 overflow-y-auto space-y-1">
                {secciones.map((seccion, index) => (
                  <SortableItem
                    key={seccion.fs_id || seccion.seccion_id}
                    id={`seccion-${seccion.fs_id || seccion.seccion_id}`}
                    disabled={readonly}
                  >
                    <div
                      className={`p-1.5 border-2 rounded-lg transition-all duration-200 ${
                        editandoPregunta ||
                        nuevaPregunta ||
                        formularioEdicionAbierto
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer"
                      } ${
                        (seccion.fs_id || seccion.seccion_id) ===
                        seccionSeleccionada
                          ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-500 shadow-lg"
                          : "border-gray-200 hover:border-blue-300 hover:shadow-md hover:bg-blue-50/30 bg-white"
                      } ${
                        !(seccion.fs_activo !== false)
                          ? "opacity-60 grayscale"
                          : ""
                      }`}
                      onClick={() => {
                        if (
                          !editandoPregunta &&
                          !nuevaPregunta &&
                          !formularioEdicionAbierto
                        ) {
                          setSeccionSeleccionada(
                            (seccion.fs_id ?? seccion.seccion_id) || null,
                          );
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs text-gray-900">
                            {seccion.fs_orden || seccion.seccion_orden}.{" "}
                            {seccion.fs_nombre || seccion.seccion_nombre}
                          </p>
                          {seccion.fs_descripcion ||
                            (seccion.seccion_descripcion && (
                              <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                                {seccion.fs_descripcion ||
                                  seccion.seccion_descripcion}
                              </p>
                            ))}
                          <p className="text-xs text-gray-500 mt-0.5 font-medium">
                            <span className="inline-block bg-gray-100 px-1.5 py-0.5 rounded-full text-xs">
                              {
                                preguntas.filter(
                                  (p) =>
                                    p.seccion_id ===
                                    (seccion.fs_id ?? seccion.seccion_id),
                                ).length
                              }{" "}
                              pregunta(s)
                            </span>
                          </p>
                        </div>

                        <div className="flex gap-0.5 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              iniciarEdicionSeccion(seccion);
                            }}
                            disabled={readonly || formularioEdicionAbierto}
                            className="p-1 text-blue-600 hover:bg-blue-100 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              eliminarSeccion(seccion.fs_id ?? seccion.seccion_id);
                            }}
                            disabled={readonly || formularioEdicionAbierto}
                            className="p-1 text-red-600 hover:bg-red-100 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarOrdenSeccion(seccion.fs_id ?? seccion.seccion_id, "arriba");
                            }}
                            disabled={
                              readonly ||
                              index === 0 ||
                              formularioEdicionAbierto
                            }
                            className="p-1 text-gray-600 hover:bg-gray-200 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarOrdenSeccion(seccion.fs_id ?? seccion.seccion_id, "abajo");
                            }}
                            disabled={
                              readonly ||
                              index === secciones.length - 1 ||
                              formularioEdicionAbierto
                            }
                            className="p-1 text-gray-600 hover:bg-gray-200 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* PANEL DERECHO - PREGUNTAS */}
        <div className="w-2/3 min-h-0 bg-white rounded-xl shadow-lg p-3 flex flex-col overflow-hidden border-2 border-gray-100 hover:border-gray-200 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => navegarSeccion("atras")}
                disabled={
                  indiceSeccion === 0 ||
                  formularioEdicionAbierto ||
                  editandoPregunta ||
                  nuevaPregunta
                }
                className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <h2 className="text-xs font-medium text-gray-700">
                {seccionActual?.fs_nombre ||
                  seccionActual?.seccion_nombre ||
                  "Selecciona una sección"}
              </h2>
              <button
                onClick={() => navegarSeccion("adelante")}
                disabled={
                  indiceSeccion === secciones.length - 1 ||
                  formularioEdicionAbierto ||
                  editandoPregunta ||
                  nuevaPregunta
                }
                className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <button
              onClick={() => {
                setNuevaPregunta(true);
                setEditandoPregunta(null);
                setFormPregunta({
                  ...FORM_PREGUNTA_DEFAULT,
                  seccion_id: seccionSeleccionada,
                });
                setOpcionesNuevas([]);
                setErrorPregunta(null);
              }}
              disabled={
                readonly || !seccionSeleccionada || formularioEdicionAbierto
              }
              className="flex items-center gap-2 px-3 py-1 bg-gradient-to-br from-blue-500 via-blue-550 to-blue-600 text-white font-semibold text-xs rounded-lg hover:shadow-xl hover:from-blue-600 hover:via-blue-600 hover:to-blue-700 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
            >
              <Plus className="h-3 w-3" />
              Nueva Pregunta
            </button>
          </div>

          {seccionActual?.seccion_descripcion && (
            <p className="text-xs text-gray-600 mb-1">
              {seccionActual.seccion_descripcion}
            </p>
          )}

          {preguntas.length === 0 && (
            <div className="mb-2 rounded-lg border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 text-xs text-amber-900 font-medium">
              ⚠️ Esta versión (v{version || "1"}) no tiene preguntas
              registradas. Las secciones son globales, pero las preguntas se
              guardan por versión.
            </div>
          )}

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
                                : "",
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
                  </div>
                )}

                {/* Sección */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-blue-900">
                    Sección <span className="text-red-500">*</span>
                  </label>
                  {editandoPregunta ? (
                    <div className="w-full border border-blue-200 rounded px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium">
                      {secciones.find(
                        (s) =>
                          (s.fs_id || s.seccion_id) === formPregunta.seccion_id,
                      )?.fs_nombre ||
                        secciones.find(
                          (s) =>
                            (s.fs_id || s.seccion_id) ===
                            formPregunta.seccion_id,
                        )?.seccion_nombre ||
                        "No asignada"}
                    </div>
                  ) : (
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
                  )}
                  {!editandoPregunta && (
                    <p className="text-xs text-blue-600 font-medium">
                      La sección se define por la pestaña activa al crear una
                      pregunta.
                    </p>
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

                {/* Subtipo SELECT */}
                {formPregunta.tipo === TIPOS_PREGUNTA.SELECT && (
                  <div className="space-y-1.5 rounded-lg border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-2">
                    <p className="text-xs font-semibold text-sky-900">
                      🎨 Forma de respuesta para selección única
                    </p>
                    <label className="flex items-center gap-1 p-2 bg-white rounded-lg border border-sky-200 cursor-pointer hover:bg-sky-50 transition-colors text-xs">
                      <input
                        type="radio"
                        name="select-visual-mode"
                        checked={(formPregunta.subtipo || "LISTA") !== "CHECK"}
                        onChange={() =>
                          setFormPregunta((prev) => ({
                            ...prev,
                            subtipo: "LISTA",
                          }))
                        }
                        className="w-4 h-4 accent-sky-600"
                      />
                      <span className="text-xs font-medium text-gray-800">
                        Lista desplegable
                      </span>
                    </label>
                    <label className="flex items-center gap-1 p-2 bg-white rounded-lg border border-sky-200 cursor-pointer hover:bg-sky-50 transition-colors text-xs">
                      <input
                        type="radio"
                        name="select-visual-mode"
                        checked={formPregunta.subtipo === "CHECK"}
                        onChange={() =>
                          setFormPregunta((prev) => ({
                            ...prev,
                            subtipo: "CHECK",
                          }))
                        }
                        className="w-4 h-4 accent-sky-600"
                      />
                      <span className="text-xs font-medium text-gray-800">
                        Checks visibles (una sola opción)
                      </span>
                    </label>
                  </div>
                )}

                {/* Dependencia */}
                {formPregunta.dependiente && (
                  <div className="space-y-1.5 p-2 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg">
                    <div className="space-y-0.5">
                      <label className="block text-xs font-semibold text-amber-900 leading-tight">
                        Sección padre <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formPregunta.dependencia_seccion_id ?? ""}
                        onChange={(e) =>
                          setFormPregunta({
                            ...formPregunta,
                            dependencia_seccion_id: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                            dependencia_pregunta_id: null,
                          })
                        }
                        className="w-full border border-amber-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:shadow-lg bg-white text-xs transition-all"
                      >
                        <option value="">Seleccione sección padre</option>
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
                      <label className="block text-xs font-semibold text-amber-900 leading-tight">
                        Pregunta padre <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formPregunta.dependencia_pregunta_id ?? ""}
                        onChange={(e) =>
                          setFormPregunta({
                            ...formPregunta,
                            dependencia_pregunta_id: e.target.value
                              ? parseInt(e.target.value)
                              : null,
                          })
                        }
                        className="w-full border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white disabled:bg-gray-100 transition-all"
                        disabled={!formPregunta.dependencia_seccion_id}
                      >
                        <option value="">Seleccione pregunta padre</option>
                        {preguntas
                          .filter(
                            (p) =>
                              p.seccion_id ===
                                formPregunta.dependencia_seccion_id &&
                              p.fp_id !== editandoPregunta,
                          )
                          .map((pregunta) => (
                            <option key={pregunta.fp_id} value={pregunta.fp_id}>
                              {pregunta.fp_descripcion}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="space-y-0.5">
                      <label className="block text-xs font-semibold text-amber-900 leading-tight">
                        Respuesta que dispara{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Si, Sí, 1"
                        value={formPregunta.dependencia_valor}
                        onChange={(e) =>
                          setFormPregunta({
                            ...formPregunta,
                            dependencia_valor: e.target.value,
                          })
                        }
                        className="w-full border border-amber-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:shadow-lg bg-white text-xs transition-all"
                      />
                      <p className="text-xs text-amber-700 font-medium mt-2">
                        ℹ️ Esta pregunta se mostrará cuando la pregunta padre
                        tenga este valor
                      </p>
                    </div>
                  </div>
                )}

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
                        placeholder="Filtrar bases de datos..."
                        value={filtroBaseDatos}
                        onChange={(e) => setFiltroBaseDatos(e.target.value)}
                        className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:shadow-lg bg-white transition-all"
                      />
                      <select
                        value={formPregunta.catalogo_base_datos}
                        onChange={(e) =>
                          setFormPregunta({
                            ...formPregunta,
                            catalogo_base_datos: e.target.value,
                            catalogo_tabla: "",
                            catalogo_columna: "",
                          })
                        }
                        className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white transition-all"
                      >
                        <option value="">
                          Base principal (
                          {loadingCatalogoBases ? "cargando..." : "seleccionar"}
                          )
                        </option>
                        {basesFiltradas.map((base) => (
                          <option key={base} value={base}>
                            {base}
                          </option>
                        ))}
                        {!loadingCatalogoBases &&
                          catalogoBases.length > 0 &&
                          basesFiltradas.length === 0 && (
                            <option value="" disabled>
                              Sin coincidencias para el filtro
                            </option>
                          )}
                      </select>
                      <p className="text-xs text-gray-500">
                        Si lo dejas vacío, se usa la base de datos principal.
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <label className="block text-xs font-semibold text-sky-900 leading-tight">
                        Tabla <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Filtrar tablas..."
                        value={filtroTabla}
                        onChange={(e) => setFiltroTabla(e.target.value)}
                        className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:shadow-lg bg-white transition-all"
                      />
                      <select
                        value={formPregunta.catalogo_tabla}
                        onChange={(e) =>
                          setFormPregunta({
                            ...formPregunta,
                            catalogo_tabla: e.target.value,
                            catalogo_columna: "",
                          })
                        }
                        className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white transition-all"
                      >
                        <option value="">
                          {loadingCatalogoTablas
                            ? "Cargando tablas..."
                            : "Selecciona una tabla"}
                        </option>
                        {tablasFiltradas.map((tabla) => (
                          <option key={tabla} value={tabla}>
                            {tabla}
                          </option>
                        ))}
                        {!loadingCatalogoTablas &&
                          catalogoTablas.length > 0 &&
                          tablasFiltradas.length === 0 && (
                            <option value="" disabled>
                              Sin coincidencias para el filtro
                            </option>
                          )}
                      </select>
                    </div>

                    <div className="space-y-0.5">
                      <label className="block text-xs font-semibold text-sky-900 leading-tight">
                        Columna visible <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Filtrar columnas..."
                        value={filtroColumna}
                        onChange={(e) => setFiltroColumna(e.target.value)}
                        className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:shadow-lg bg-white transition-all"
                      />
                      <select
                        value={formPregunta.catalogo_columna}
                        onChange={(e) =>
                          setFormPregunta({
                            ...formPregunta,
                            catalogo_columna: e.target.value,
                          })
                        }
                        className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white disabled:bg-gray-100 transition-all"
                        disabled={!formPregunta.catalogo_tabla}
                      >
                        <option value="">
                          {loadingCatalogoColumnas
                            ? "Cargando columnas..."
                            : "Selecciona una columna"}
                        </option>
                        {columnasFiltradas.map((columna) => (
                          <option key={columna} value={columna}>
                            {columna}
                          </option>
                        ))}
                        {!loadingCatalogoColumnas &&
                          catalogoColumnas.length > 0 &&
                          columnasFiltradas.length === 0 && (
                            <option value="" disabled>
                              Sin coincidencias para el filtro
                            </option>
                          )}
                      </select>
                    </div>

                    <div className="space-y-0.5">
                      <label className="block text-xs font-semibold text-sky-900 leading-tight">
                        Primary Key (PK) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Filtrar columnas..."
                        value={filtroColumna}
                        onChange={(e) => setFiltroColumna(e.target.value)}
                        className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:shadow-lg bg-white transition-all"
                      />
                      <select
                        value={formPregunta.catalogo_pk_column}
                        onChange={(e) =>
                          setFormPregunta({
                            ...formPregunta,
                            catalogo_pk_column: e.target.value,
                          })
                        }
                        className="w-full border border-sky-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white disabled:bg-gray-100 transition-all"
                        disabled={!formPregunta.catalogo_tabla}
                      >
                        <option value="">
                          {loadingCatalogoColumnas
                            ? "Cargando columnas..."
                            : "Selecciona la primary key"}
                        </option>
                        {columnasFiltradas.map((columna) => (
                          <option key={columna} value={columna}>
                            {columna}
                          </option>
                        ))}
                        {!loadingCatalogoColumnas &&
                          catalogoColumnas.length > 0 &&
                          columnasFiltradas.length === 0 && (
                            <option value="" disabled>
                              Sin coincidencias para el filtro
                            </option>
                          )}
                      </select>
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

                {/* Opciones SELECT / MULTISELECT */}
                {(editandoPregunta || nuevaPregunta) &&
                  (formPregunta.tipo === TIPOS_PREGUNTA.SELECT ||
                    formPregunta.tipo === TIPOS_PREGUNTA.MULTISELECT) && (
                    <div className="border border-amber-300 bg-amber-50 rounded p-2">
                      <h4 className="font-semibold text-xs mb-0.5">
                        Opciones de respuesta:
                      </h4>
                      <p className="text-xs text-amber-800 mb-1">
                        {formPregunta.tipo === TIPOS_PREGUNTA.SELECT
                          ? "El usuario podra seleccionar solo una opcion."
                          : "El usuario podra seleccionar varias opciones."}
                      </p>
                      {loading_opciones ? (
                        <p className="text-xs text-gray-600">
                          Cargando opciones...
                        </p>
                      ) : (
                        <>
                          {editandoPregunta && opciones.length === 0 && (
                            <p className="text-xs text-gray-600 mb-1">
                              No hay opciones aún
                            </p>
                          )}
                          {!editandoPregunta && opcionesNuevas.length === 0 && (
                            <p className="text-xs text-gray-600 mb-1">
                              No hay opciones aún
                            </p>
                          )}
                          {editandoPregunta && opciones.length > 0 && (
                            <div className="space-y-1 mb-2">
                              {opciones.map((opcion) => (
                                <div
                                  key={opcion.fpo_id}
                                  className="flex items-center gap-1 bg-white p-1 rounded border border-gray-200 text-xs"
                                >
                                  <span className="font-medium text-xs flex-1">
                                    {opcion.fpo_valor || opcion.op_descripcion}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${opcion.fpo_estado ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                  >
                                    {opcion.fpo_estado ? "Activa" : "Inactiva"}
                                  </span>
                                  <button
                                    onClick={() =>
                                      eliminarOpcion(opcion.fpo_id)
                                    }
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          {!editandoPregunta && opcionesNuevas.length > 0 && (
                            <div className="space-y-1 mb-2">
                              {opcionesNuevas.map((opcion, index) => (
                                <div
                                  key={`${opcion}-${index}`}
                                  className="flex items-center gap-1 bg-white p-1 rounded border border-gray-200 text-xs"
                                >
                                  <span className="font-medium text-xs flex-1">
                                    {opcion}
                                  </span>
                                  <button
                                    onClick={() => eliminarOpcionNueva(index)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="space-y-1">
                            <label
                              htmlFor="nueva-opcion"
                              className="block text-xs font-medium text-gray-700"
                            >
                              Agregar nueva opción
                            </label>
                            <div className="flex gap-1">
                              <input
                                id="nueva-opcion"
                                type="text"
                                placeholder="Ej: Opción 1, Sí, No"
                                value={nuevaOpcion}
                                onChange={(e) => setNuevaOpcion(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") agregarOpcion();
                                }}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                              <button
                                onClick={agregarOpcion}
                                className="px-2 py-1 bg-gradient-to-br from-green-500 to-green-600 text-white rounded hover:shadow-lg hover:from-green-600 hover:to-green-700 hover:scale-105 active:scale-95 text-xs flex items-center gap-0.5 font-semibold transition-all duration-200"
                              >
                                <Plus className="h-3 w-3" />
                                Agregar
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

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
                                className="flex items-center gap-1 bg-white p-1 rounded border border-gray-200 text-xs"
                              >
                                <input
                                  type="text"
                                  placeholder={`Columna ${index + 1}`}
                                  value={columna}
                                  onChange={(e) => {
                                    const nuevas = [
                                      ...formPregunta.tabla_columnas,
                                    ];
                                    nuevas[index] = e.target.value;
                                    setFormPregunta({
                                      ...formPregunta,
                                      tabla_columnas: nuevas,
                                    });
                                  }}
                                  className="flex-1 border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
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
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
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
                              "",
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

                {/* Botones guardar / cancelar */}
                <div className="sticky bottom-0 z-10 flex gap-1 pt-1 border-t border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <button
                    onClick={guardarPregunta}
                    className="flex-1 px-2 py-1 bg-gradient-to-br from-blue-600 to-blue-700 text-white font-semibold rounded hover:shadow-lg hover:from-blue-700 hover:to-blue-800 hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-0.5 text-xs"
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

          {/* Lista de preguntas */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handlePreguntaDragEnd}
          >
            <SortableContext
              items={preguntasDeSeccion.map((p) => `pregunta-${p.fp_id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex-1 overflow-y-auto space-y-1">
                {preguntasDeSeccion.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 text-xs">
                    No hay preguntas en esta sección
                  </p>
                ) : (
                  preguntasDeSeccion.map((pregunta, index) => (
                    <SortableItem
                      key={pregunta.fp_id}
                      id={`pregunta-${pregunta.fp_id}`}
                      disabled={readonly}
                    >
                      <div
                        className={`p-1.5 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md transition-all duration-200 flex items-start justify-between gap-2 ${
                          !pregunta.fp_estado ? "opacity-60 grayscale" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs">
                            {pregunta.fp_descripcion}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-0.5 text-xs text-gray-600">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                              {pregunta.fp_tipo}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs ${pregunta.fp_estado ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                            >
                              {pregunta.fp_estado ? "Activa" : "Inactiva"}
                            </span>
                            {pregunta.fp_requerida && (
                              <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-semibold">
                                📌 Obligatorio
                              </span>
                            )}
                            {pregunta.fp_pregunta_padre_id && (
                              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs font-semibold">
                                🔗 Dependiente
                              </span>
                            )}
                            {pregunta.fp_precarga_fuente &&
                              pregunta.fp_precarga_fuente !== "" && (
                                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-semibold">
                                  📦 Precarga
                                </span>
                              )}
                          </div>

                          {pregunta.fp_tipo === TIPOS_PREGUNTA.TABLA && (
                            <div className="mt-1 space-y-0.5">
                              <p className="text-xs font-semibold text-purple-700">
                                Columnas:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  let columnas: string[] = [];
                                  try {
                                    const parsed = pregunta.fp_tabla_columnas
                                      ? JSON.parse(pregunta.fp_tabla_columnas)
                                      : [];
                                    columnas = Array.isArray(parsed)
                                      ? parsed
                                      : [];
                                  } catch {
                                    columnas = [];
                                  }
                                  return columnas.length > 0 ? (
                                    columnas.map((columna, idx) => (
                                      <span
                                        key={idx}
                                        className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs border border-purple-200"
                                      >
                                        {columna}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-gray-500 italic">
                                      Sin columnas configuradas
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {[
                            TIPOS_PREGUNTA.SELECT,
                            TIPOS_PREGUNTA.MULTISELECT,
                          ].includes(pregunta.fp_tipo as any) && (
                            <div className="mt-1 space-y-0.5">
                              <p className="text-xs font-semibold text-blue-700">
                                Opciones:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {pregunta.opciones &&
                                pregunta.opciones.length > 0 ? (
                                  pregunta.opciones.map((opcion, idx) => (
                                    <span
                                      key={idx}
                                      className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs border border-blue-200"
                                    >
                                      {opcion.fpo_valor ||
                                        opcion.op_descripcion}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-500 italic">
                                    Sin opciones configuradas
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => {
                              setErrorPregunta(null);
                              iniciarEdicionPregunta(pregunta);
                            }}
                            disabled={readonly || formularioEdicionAbierto}
                            className="p-1 text-blue-600 hover:bg-blue-50 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => eliminarPregunta(pregunta.fp_id)}
                            disabled={readonly || formularioEdicionAbierto}
                            className="p-1 text-red-600 hover:bg-red-50 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() =>
                              cambiarOrdenPregunta(pregunta.fp_id, "arriba")
                            }
                            disabled={
                              readonly ||
                              index === 0 ||
                              formularioEdicionAbierto
                            }
                            className="p-1 text-gray-600 hover:bg-gray-100 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() =>
                              cambiarOrdenPregunta(pregunta.fp_id, "abajo")
                            }
                            disabled={
                              readonly ||
                              index === preguntasDeSeccion.length - 1 ||
                              formularioEdicionAbierto
                            }
                            className="p-1 text-gray-600 hover:bg-gray-100 hover:shadow-sm hover:scale-110 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-200"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </SortableItem>
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
