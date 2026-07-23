"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useFormulario } from "./hooks/useFormulario";
import { useSeccionEditor } from "./hooks/useSeccionEditor";
import { usePreguntaEditor } from "./hooks/usePreguntaEditor";
import { FormularioHeader } from "./components/FormularioHeader";
import { PanelSecciones } from "./components/PanelSecciones";
import { PanelPreguntas } from "./components/PanelPreguntas";

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

  // El backend rechaza cualquier edición de preguntas/opciones de una
  // versión que ya tiene solicitudes asociadas (ver
  // assertVersionSinSolicitudes). Bloqueamos la edición acá también para
  // avisar antes de que el usuario intente guardar, no recién al fallar.
  const versionConSolicitudes = formulario?.tiene_solicitudes === true;
  const noEditable = readonly || versionConSolicitudes;

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
    confirmarEliminarSeccion,
    seccionAEliminar,
    setSeccionAEliminar,
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
    opcionesPreguntaPadre,
    loadingOpcionesPreguntaPadre,
    loadingDocumentosCatalogo,
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
    cargarBasesCatalogo,
    cargarTablasCatalogo,
    cargarColumnasCatalogo,
    guardarPregunta,
    puedeGuardarPregunta,
    iniciarEdicionPregunta,
    eliminarPregunta,
    confirmarEliminarPregunta,
    preguntaAEliminar,
    setPreguntaAEliminar,
    successMessage,
    setSuccessMessage,
    agregarOpcion,
    eliminarOpcion,
    confirmarEliminarOpcion,
    opcionAEliminar,
    setOpcionAEliminar,
    opcionEditandoId,
    opcionEditandoValor,
    setOpcionEditandoValor,
    iniciarEdicionOpcion,
    cancelarEdicionOpcion,
    guardarEdicionOpcion,
    obtenerPreguntasDependientesDeOpcion,
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
    readonly: noEditable,
    cargarDatos,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [columnaCatalogoAbierta, setColumnaCatalogoAbierta] = useState<
    number | null
  >(null);

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
      <FormularioHeader
        formulario={formulario}
        formularioId={formularioId}
        router={router}
        readonly={readonly}
        versionConSolicitudes={versionConSolicitudes}
        version={version}
        formularioEdicionAbierto={formularioEdicionAbierto}
        editorModeUrl={editorModeUrl}
      />

      <div className="h-[60vh] md:h-[65vh] min-h-[30rem] flex gap-2 overflow-hidden mx-auto max-w-7xl">
        <PanelSecciones
          secciones={secciones}
          loading={loading}
          seccionSeleccionada={seccionSeleccionada}
          setSeccionSeleccionada={setSeccionSeleccionada}
          preguntas={preguntas}
          readonly={readonly}
          formularioEdicionAbierto={formularioEdicionAbierto}
          editandoPregunta={editandoPregunta}
          nuevaPregunta={nuevaPregunta}
          sensors={sensors}
          handleSeccionDragEnd={handleSeccionDragEnd}
          nuevaSeccion={nuevaSeccion}
          setNuevaSeccion={setNuevaSeccion}
          editandoSeccion={editandoSeccion}
          setEditandoSeccion={setEditandoSeccion}
          formSeccion={formSeccion}
          setFormSeccion={setFormSeccion}
          guardarSeccion={guardarSeccion}
          iniciarEdicionSeccion={iniciarEdicionSeccion}
          eliminarSeccion={eliminarSeccion}
          cambiarOrdenSeccion={cambiarOrdenSeccion}
          seccionAEliminar={seccionAEliminar}
          setSeccionAEliminar={setSeccionAEliminar}
          confirmarEliminarSeccion={confirmarEliminarSeccion}
        />

        <PanelPreguntas
          navegarSeccion={navegarSeccion}
          indiceSeccion={indiceSeccion}
          seccionActual={seccionActual}
          FORM_PREGUNTA_DEFAULT={FORM_PREGUNTA_DEFAULT}
          seccionSeleccionada={seccionSeleccionada}
          readonly={readonly}
          version={version}
          secciones={secciones}
          preguntas={preguntas}
          loading={loading}
          noEditable={noEditable}
          formularioEdicionAbierto={formularioEdicionAbierto}
          editandoPregunta={editandoPregunta}
          setEditandoPregunta={setEditandoPregunta}
          nuevaPregunta={nuevaPregunta}
          setNuevaPregunta={setNuevaPregunta}
          formPregunta={formPregunta}
          setFormPregunta={setFormPregunta}
          opciones={opciones}
          setOpciones={setOpciones}
          nuevaOpcion={nuevaOpcion}
          setNuevaOpcion={setNuevaOpcion}
          loading_opciones={loading_opciones}
          opcionesNuevas={opcionesNuevas}
          setOpcionesNuevas={setOpcionesNuevas}
          catalogoBases={catalogoBases}
          loadingCatalogoBases={loadingCatalogoBases}
          catalogoTablas={catalogoTablas}
          loadingCatalogoTablas={loadingCatalogoTablas}
          catalogoColumnas={catalogoColumnas}
          loadingCatalogoColumnas={loadingCatalogoColumnas}
          documentosCatalogo={documentosCatalogo}
          opcionesPreguntaPadre={opcionesPreguntaPadre}
          loadingOpcionesPreguntaPadre={loadingOpcionesPreguntaPadre}
          loadingDocumentosCatalogo={loadingDocumentosCatalogo}
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
          cargarBasesCatalogo={cargarBasesCatalogo}
          cargarTablasCatalogo={cargarTablasCatalogo}
          cargarColumnasCatalogo={cargarColumnasCatalogo}
          guardarPregunta={guardarPregunta}
          puedeGuardarPregunta={puedeGuardarPregunta}
          iniciarEdicionPregunta={iniciarEdicionPregunta}
          eliminarPregunta={eliminarPregunta}
          confirmarEliminarPregunta={confirmarEliminarPregunta}
          preguntaAEliminar={preguntaAEliminar}
          setPreguntaAEliminar={setPreguntaAEliminar}
          successMessage={successMessage}
          setSuccessMessage={setSuccessMessage}
          agregarOpcion={agregarOpcion}
          eliminarOpcion={eliminarOpcion}
          confirmarEliminarOpcion={confirmarEliminarOpcion}
          opcionAEliminar={opcionAEliminar}
          setOpcionAEliminar={setOpcionAEliminar}
          opcionEditandoId={opcionEditandoId}
          opcionEditandoValor={opcionEditandoValor}
          setOpcionEditandoValor={setOpcionEditandoValor}
          iniciarEdicionOpcion={iniciarEdicionOpcion}
          cancelarEdicionOpcion={cancelarEdicionOpcion}
          guardarEdicionOpcion={guardarEdicionOpcion}
          obtenerPreguntasDependientesDeOpcion={
            obtenerPreguntasDependientesDeOpcion
          }
          eliminarOpcionNueva={eliminarOpcionNueva}
          cambiarOrdenPregunta={cambiarOrdenPregunta}
          handlePreguntaDragEnd={handlePreguntaDragEnd}
          tiposPregunta={tiposPregunta}
          errorPregunta={errorPregunta}
          setErrorPregunta={setErrorPregunta}
          columnaCatalogoAbierta={columnaCatalogoAbierta}
          setColumnaCatalogoAbierta={setColumnaCatalogoAbierta}
          sensors={sensors}
          preguntasDeSeccion={preguntasDeSeccion}
        />
      </div>
    </div>
  );
}
