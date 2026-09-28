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
  const formularioId = searchParams.get("frs_id");
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
    confirmarGuardarSeccion,
    guardandoSeccion,
    mostrarConfirmarGuardarSeccion,
    setMostrarConfirmarGuardarSeccion,
    successMessageSeccion,
    setSuccessMessageSeccion,
    errorMessageSeccion,
    setErrorMessageSeccion,
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
    // Las secciones son de cada versión (igual que las preguntas): con
    // solicitudes asociadas el backend también las bloquea.
    readonly: noEditable,
    formularioIdNumber,
    version,
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
    hayCambiosOpcionesPendientes,
    estadoPendienteOpcion,
    setOpcionesNuevas,
    catalogoTablas,
    loadingCatalogoTablas,
    catalogoColumnas,
    loadingCatalogoColumnas,
    documentosCatalogo,
    opcionesPreguntaPadre,
    loadingOpcionesPreguntaPadre,
    loadingDocumentosCatalogo,
    filtroTabla,
    setFiltroTabla,
    filtroColumna,
    setFiltroColumna,
    filtroLlave,
    setFiltroLlave,
    tablasFiltradas,
    columnasFiltradas,
    llaveFiltrada,
    cargarTablasCatalogo,
    cargarColumnasCatalogo,
    guardarPregunta,
    confirmarGuardarPregunta,
    guardandoPregunta,
    mostrarConfirmarGuardarPregunta,
    setMostrarConfirmarGuardarPregunta,
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [columnaCatalogoAbierta, setColumnaCatalogoAbierta] = useState<number | null>(null);

  const seccionActual = secciones.find((s) => (s.fs_id || s.fp_fs_id) === seccionSeleccionada);
  const indiceSeccion = secciones.findIndex((s) => (s.fs_id || s.fp_fs_id) === seccionSeleccionada);
  const editorUrlParams = new URLSearchParams();
  if (formularioId) editorUrlParams.set("frs_id", formularioId);
  if (version) editorUrlParams.set("version", version);
  const editorModeUrl = `/parametrizacion/formulario-editor${
    editorUrlParams.toString() ? `?${editorUrlParams.toString()}` : ""
  }`;
  const seccionFormAbierto = nuevaSeccion || editandoSeccion !== null;
  const preguntaFormAbierto = nuevaPregunta || editandoPregunta !== null;
  const formularioEdicionAbierto = seccionFormAbierto || preguntaFormAbierto;

  // Alto: 3.75rem = alto real del header de la app (60px); con 7rem quedaba
  // una franja vacía abajo y el editor no llegaba al final de la ventana.
  return (
    <div className="w-full h-[calc(100dvh-3.75rem)] p-3 bg-gradient-to-b from-page-from to-page-to overflow-hidden">
      {/* Sin gap: PageHeaderCard ya trae su propio margen inferior. */}
      <div className="mx-auto max-w-400 h-full flex flex-col">
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

        <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
          <PanelSecciones
            secciones={secciones}
            loading={loading}
            seccionSeleccionada={seccionSeleccionada}
            setSeccionSeleccionada={setSeccionSeleccionada}
            preguntas={preguntas}
            readonly={noEditable}
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
            confirmarGuardarSeccion={confirmarGuardarSeccion}
            guardandoSeccion={guardandoSeccion}
            mostrarConfirmarGuardarSeccion={mostrarConfirmarGuardarSeccion}
            setMostrarConfirmarGuardarSeccion={setMostrarConfirmarGuardarSeccion}
            successMessageSeccion={successMessageSeccion}
            setSuccessMessageSeccion={setSuccessMessageSeccion}
            errorMessageSeccion={errorMessageSeccion}
            setErrorMessageSeccion={setErrorMessageSeccion}
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
            hayCambiosOpcionesPendientes={hayCambiosOpcionesPendientes}
            estadoPendienteOpcion={estadoPendienteOpcion}
            setOpcionesNuevas={setOpcionesNuevas}
            catalogoTablas={catalogoTablas}
            loadingCatalogoTablas={loadingCatalogoTablas}
            catalogoColumnas={catalogoColumnas}
            loadingCatalogoColumnas={loadingCatalogoColumnas}
            documentosCatalogo={documentosCatalogo}
            opcionesPreguntaPadre={opcionesPreguntaPadre}
            loadingOpcionesPreguntaPadre={loadingOpcionesPreguntaPadre}
            loadingDocumentosCatalogo={loadingDocumentosCatalogo}
            filtroTabla={filtroTabla}
            setFiltroTabla={setFiltroTabla}
            filtroColumna={filtroColumna}
            setFiltroColumna={setFiltroColumna}
            filtroLlave={filtroLlave}
            setFiltroLlave={setFiltroLlave}
            tablasFiltradas={tablasFiltradas}
            columnasFiltradas={columnasFiltradas}
            llaveFiltrada={llaveFiltrada}
            cargarTablasCatalogo={cargarTablasCatalogo}
            cargarColumnasCatalogo={cargarColumnasCatalogo}
            guardarPregunta={guardarPregunta}
            confirmarGuardarPregunta={confirmarGuardarPregunta}
            guardandoPregunta={guardandoPregunta}
            mostrarConfirmarGuardarPregunta={mostrarConfirmarGuardarPregunta}
            setMostrarConfirmarGuardarPregunta={setMostrarConfirmarGuardarPregunta}
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
            obtenerPreguntasDependientesDeOpcion={obtenerPreguntasDependientesDeOpcion}
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
    </div>
  );
}
