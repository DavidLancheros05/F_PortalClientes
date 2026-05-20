"use client";
import { useEffect, useMemo, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import {
  formularioPreguntasService,
  type Opcion,
} from "@/services/parametrizacion/formulario-preguntas.service";
import {
  maestrosService,
  type DocumentoCatalogo,
} from "@/services/parametrizacion/maestros.service";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import type { FormPreguntaState, Pregunta, Seccion } from "./types";

const FORM_PREGUNTA_DEFAULT: FormPreguntaState = {
  descripcion: "",
  codigo: undefined,
  tipo: TIPOS_PREGUNTA.TEXTO,
  subtipo: "",
  seccion_id: null,
  requerida: false,
  tipo_documento_id: null,
  catalogo_base_datos: "",
  catalogo_tabla: "",
  catalogo_columna: "",
  catalogo_pk_column: "",
  dependiente: false,
  dependencia_seccion_id: null,
  dependencia_pregunta_id: null,
  dependencia_valor: "",
  precarga_fuente: "",
  precarga_campo_cliente: "",
  precarga_base_datos: "",
  precarga_tabla: "",
  precarga_columna: "",
};

type PreguntaEditorDeps = {
  preguntas: Pregunta[];
  setPreguntas: React.Dispatch<React.SetStateAction<Pregunta[]>>;
  preguntasDeSeccion: Pregunta[];
  secciones: Seccion[];
  seccionSeleccionada: number | null;
  formularioIdNumber: number | null;
  version: string | null;
  readonly: boolean;
  cargarDatos: () => Promise<void>;
};

export function usePreguntaEditor({
  preguntas,
  setPreguntas,
  preguntasDeSeccion,
  secciones,
  seccionSeleccionada,
  formularioIdNumber,
  version,
  readonly,
  cargarDatos,
}: PreguntaEditorDeps) {
  const [editandoPregunta, setEditandoPregunta] = useState<number | null>(null);
  const [nuevaPregunta, setNuevaPregunta] = useState(false);
  const [formPregunta, setFormPregunta] = useState<FormPreguntaState>(
    FORM_PREGUNTA_DEFAULT,
  );
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [nuevaOpcion, setNuevaOpcion] = useState("");
  const [loading_opciones, setLoading_opciones] = useState(false);
  const [opcionesNuevas, setOpcionesNuevas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Catalogo state
  const [catalogoBases, setCatalogoBases] = useState<string[]>([]);
  const [catalogoTablas, setCatalogoTablas] = useState<string[]>([]);
  const [catalogoColumnas, setCatalogoColumnas] = useState<string[]>([]);
  const [loadingCatalogoBases, setLoadingCatalogoBases] = useState(false);
  const [loadingCatalogoTablas, setLoadingCatalogoTablas] = useState(false);
  const [loadingCatalogoColumnas, setLoadingCatalogoColumnas] = useState(false);
  const [documentosCatalogo, setDocumentosCatalogo] = useState<
    DocumentoCatalogo[]
  >([]);
  const [loadingDocumentosCatalogo, setLoadingDocumentosCatalogo] =
    useState(false);
  const [filtroBaseDatos, setFiltroBaseDatos] = useState("");
  const [filtroTabla, setFiltroTabla] = useState("");
  const [filtroColumna, setFiltroColumna] = useState("");

  const normalizarFiltro = (value: string) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();

  const basesFiltradas = useMemo(() => {
    const filtro = normalizarFiltro(filtroBaseDatos);
    return catalogoBases.filter(
      (base) => !filtro || normalizarFiltro(String(base)).includes(filtro),
    );
  }, [catalogoBases, filtroBaseDatos]);

  const tablasFiltradas = useMemo(() => {
    const filtro = normalizarFiltro(filtroTabla);
    return catalogoTablas.filter(
      (tabla) => !filtro || normalizarFiltro(String(tabla)).includes(filtro),
    );
  }, [catalogoTablas, filtroTabla]);

  const columnasFiltradas = useMemo(() => {
    const filtro = normalizarFiltro(filtroColumna);
    return catalogoColumnas.filter(
      (columna) =>
        !filtro || normalizarFiltro(String(columna)).includes(filtro),
    );
  }, [catalogoColumnas, filtroColumna]);

  const cargarBasesCatalogo = async () => {
    try {
      setLoadingCatalogoBases(true);
      console.log("⏳ Cargando bases de datos...");
      const data = await maestrosService.getCatalogoBases();
      console.log("✅ Bases cargadas:", data);
      setCatalogoBases(data);
    } catch (error) {
      console.error("❌ Error cargando bases de datos:", error);
      setCatalogoBases([]);
    } finally {
      setLoadingCatalogoBases(false);
    }
  };

  const cargarTablasCatalogo = async (baseDatos: string) => {
    try {
      setLoadingCatalogoTablas(true);
      console.log("⏳ Cargando tablas para base:", baseDatos || "(principal)");
      const data = await maestrosService.getCatalogoTablas(baseDatos);
      console.log("✅ Tablas cargadas:", data);
      setCatalogoTablas(data);
    } catch (error) {
      console.error("❌ Error cargando tablas:", error);
      setCatalogoTablas([]);
    } finally {
      setLoadingCatalogoTablas(false);
    }
  };

  const cargarColumnasCatalogo = async (baseDatos: string, tabla: string) => {
    if (!tabla.trim()) {
      setCatalogoColumnas([]);
      return;
    }
    try {
      setLoadingCatalogoColumnas(true);
      const data = await maestrosService.getCatalogoColumnas(tabla, baseDatos);
      setCatalogoColumnas(data);
    } catch (error) {
      console.error("❌ [EDITOR] Error cargando columnas:", error);
      setCatalogoColumnas([]);
    } finally {
      setLoadingCatalogoColumnas(false);
    }
  };

  const cargarDocumentosCatalogo = async () => {
    try {
      setLoadingDocumentosCatalogo(true);
      const data = await maestrosService.getCatalogoDocumentos();
      setDocumentosCatalogo(data);
    } catch (error) {
      console.error(
        "❌ [EDITOR] Error cargando catálogo de documentos:",
        error,
      );
      setDocumentosCatalogo([]);
    } finally {
      setLoadingDocumentosCatalogo(false);
    }
  };

  useEffect(() => {
    if (
      formPregunta.tipo !== TIPOS_PREGUNTA.SELECT_TABLA ||
      (!nuevaPregunta && !editandoPregunta)
    )
      return;
    cargarBasesCatalogo();
  }, [formPregunta.tipo, nuevaPregunta, editandoPregunta]);

  useEffect(() => {
    if (
      formPregunta.tipo !== TIPOS_PREGUNTA.SELECT_TABLA ||
      (!nuevaPregunta && !editandoPregunta)
    )
      return;
    cargarTablasCatalogo(formPregunta.catalogo_base_datos || "");
  }, [
    formPregunta.tipo,
    formPregunta.catalogo_base_datos,
    nuevaPregunta,
    editandoPregunta,
  ]);

  useEffect(() => {
    if (
      ![TIPOS_PREGUNTA.ARCHIVO, TIPOS_PREGUNTA.DOCUMENTOS_TABLA].includes(
        formPregunta.tipo as any,
      ) ||
      (!nuevaPregunta && !editandoPregunta)
    ) {
      return;
    }
    cargarDocumentosCatalogo();
  }, [formPregunta.tipo, nuevaPregunta, editandoPregunta]);

  useEffect(() => {
    if (!nuevaPregunta && !editandoPregunta) return;
    if (
      !["cliente", "cliente_primero", "ultima_primero"].includes(
        formPregunta.precarga_fuente,
      )
    ) {
      return;
    }
    cargarBasesCatalogo();
  }, [formPregunta.precarga_fuente, nuevaPregunta, editandoPregunta]);

  useEffect(() => {
    if (!nuevaPregunta && !editandoPregunta) return;
    if (
      !["cliente", "cliente_primero", "ultima_primero"].includes(
        formPregunta.precarga_fuente,
      )
    ) {
      setCatalogoTablas([]);
      setCatalogoColumnas([]);
      setFiltroTabla("");
      setFiltroColumna("");
      return;
    }
    if (!formPregunta.precarga_base_datos) {
      setCatalogoTablas([]);
      setCatalogoColumnas([]);
      setFiltroTabla("");
      setFiltroColumna("");
      return;
    }
    cargarTablasCatalogo(formPregunta.precarga_base_datos);
  }, [
    formPregunta.precarga_fuente,
    formPregunta.precarga_base_datos,
    nuevaPregunta,
    editandoPregunta,
  ]);

  useEffect(() => {
    if (!nuevaPregunta && !editandoPregunta) return;
    if (
      !["cliente", "cliente_primero", "ultima_primero"].includes(
        formPregunta.precarga_fuente,
      )
    ) {
      setCatalogoColumnas([]);
      setFiltroColumna("");
      return;
    }
    if (!String(formPregunta.precarga_tabla || "").trim()) {
      setCatalogoColumnas([]);
      setFiltroColumna("");
      return;
    }
    cargarColumnasCatalogo(
      formPregunta.precarga_base_datos || "",
      formPregunta.precarga_tabla || "",
    );
  }, [
    formPregunta.precarga_fuente,
    formPregunta.precarga_base_datos,
    formPregunta.precarga_tabla,
    nuevaPregunta,
    editandoPregunta,
  ]);

  useEffect(() => {
    if (
      formPregunta.tipo !== "SELECT_TABLA" ||
      (!nuevaPregunta && !editandoPregunta)
    )
      return;
    if (!String(formPregunta.catalogo_tabla || "").trim()) {
      setCatalogoColumnas([]);
      setFiltroColumna("");
      setFormPregunta((prev) =>
        prev.catalogo_columna ? { ...prev, catalogo_columna: "" } : prev,
      );
      return;
    }
    cargarColumnasCatalogo(
      formPregunta.catalogo_base_datos || "",
      formPregunta.catalogo_tabla || "",
    );
  }, [
    formPregunta.tipo,
    formPregunta.catalogo_base_datos,
    formPregunta.catalogo_tabla,
    nuevaPregunta,
    editandoPregunta,
  ]);

  const guardarPregunta = async () => {
    const targetSeccionId = formPregunta.seccion_id ?? seccionSeleccionada;
    const requiereDescripcion =
      (formPregunta.tipo as any) !== TIPOS_PREGUNTA.FECHA_HORA_ACTUAL;
    const descripcionNormalizada = formPregunta.descripcion.trim();

    if ((requiereDescripcion && !descripcionNormalizada) || !targetSeccionId) {
      setError(
        requiereDescripcion
          ? "Descripción y sección son requeridos"
          : "Sección es requerida",
      );
      return;
    }

    const descripcionPersistida =
      descripcionNormalizada || "Fecha y hora actual";

    if (
      formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA &&
      !String(formPregunta.catalogo_tabla || "").trim()
    ) {
      setError("Para 'Selección desde tabla' debes indicar la tabla");
      return;
    }
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA &&
      !String(formPregunta.catalogo_columna || "").trim()
    ) {
      setError("Para 'Selección desde tabla' debes indicar la columna a mostrar");
      return;
    }
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA &&
      !String(formPregunta.catalogo_pk_column || "").trim()
    ) {
      setError("Para 'Selección desde tabla' debes indicar la primary key (PK)");
      return;
    }
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA &&
      !formPregunta.tipo_documento_id
    ) {
      setError(
        "Para 'Documentos desde tabla' debes seleccionar un tipo de documento",
      );
      return;
    }
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.ARCHIVO &&
      !formPregunta.tipo_documento_id
    ) {
      setError(
        "Para 'Archivo / Documento' debes seleccionar un tipo de documento",
      );
      return;
    }
    if (!formularioIdNumber) {
      setError("Primero debes crear o seleccionar un formulario válido.");
      return;
    }

    try {
      const preguntaEnEdicion = editandoPregunta
        ? preguntas.find((p) => p.fp_id === editandoPregunta)
        : null;
      const ordenActualEnSeccion = preguntas
        .filter((p) => p.fp_id !== editandoPregunta)
        .filter((p) => p.seccion_id === targetSeccionId)
        .map((p) => p.fp_orden);
      const nuevoOrden =
        ordenActualEnSeccion.length > 0
          ? Math.max(...ordenActualEnSeccion) + 1
          : 1;
      const conservarOrdenActual =
        !!preguntaEnEdicion && preguntaEnEdicion.seccion_id === targetSeccionId;
      const ordenFinal = conservarOrdenActual
        ? preguntaEnEdicion.fp_orden
        : nuevoOrden;

      const payload: any = {
        fp_descripcion: descripcionPersistida,
        fp_tipo: formPregunta.tipo,
        fp_estado: true,
        fp_requerida: [
          TIPOS_PREGUNTA.NOTA,
          TIPOS_PREGUNTA.FECHA_HORA_ACTUAL,
        ].includes(formPregunta.tipo as any)
          ? false
          : formPregunta.requerida,
        fp_orden: ordenFinal,
        seccion_id: targetSeccionId,
        formulario_id: formularioIdNumber,
        fp_version: version ? parseInt(version) : 1,
        fp_catalogo_base_datos:
          formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA
            ? String(formPregunta.catalogo_base_datos || "").trim() || null
            : formPregunta.tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA
              ? null
              : null,
        fp_catalogo_tabla:
          formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA
            ? String(formPregunta.catalogo_tabla || "").trim() || null
            : formPregunta.tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA
              ? "Tipos_documentos"
              : null,
        fp_catalogo_columna:
          formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA
            ? String(formPregunta.catalogo_columna || "").trim() || null
            : formPregunta.tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA
              ? "tdo_nombre"
              : null,
        fp_catalogo_pk_column:
          formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA
            ? String(formPregunta.catalogo_pk_column || "").trim() || null
            : formPregunta.tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA
              ? "tdo_id"
              : null,
        fp_tipo_documento_id: [
          TIPOS_PREGUNTA.ARCHIVO,
          TIPOS_PREGUNTA.DOCUMENTOS_TABLA,
        ].includes(formPregunta.tipo as any)
          ? formPregunta.tipo_documento_id
          : null,
        fp_pregunta_padre_id: formPregunta.dependiente
          ? formPregunta.dependencia_pregunta_id
          : null,
        fp_valor_padre_disparador: formPregunta.dependiente
          ? String(formPregunta.dependencia_valor || "").trim() || null
          : null,
        fp_precarga_fuente:
          String(formPregunta.precarga_fuente || "").trim() || null,
        fp_precarga_campo_cliente:
          String(formPregunta.precarga_campo_cliente || "").trim() || null,
      };

      if (formPregunta.tipo === TIPOS_PREGUNTA.SELECT) {
        payload.fp_subtipo =
          formPregunta.subtipo === "CHECK" ? "CHECK" : "LISTA";
      } else if (preguntaEnEdicion?.fp_tipo === TIPOS_PREGUNTA.SELECT) {
        payload.fp_subtipo = null;
      }

      if (editandoPregunta) {
        await formularioPreguntasService.update(editandoPregunta, payload);
      } else {
        const creada = await formularioPreguntasService.create(payload);

        const documentoSeleccionado = documentosCatalogo.find(
          (doc) => doc.tdo_id === formPregunta.tipo_documento_id,
        );
        const requiereFechaEmision =
          documentoSeleccionado?.tdo_vigencia_dias !== null;

        if (
          formPregunta.tipo === TIPOS_PREGUNTA.ARCHIVO &&
          creada?.fp_id &&
          requiereFechaEmision
        ) {
          const payloadFechaDependiente: any = {
            fp_descripcion: `${descripcionPersistida} - Fecha de emisión`,
            fp_tipo: TIPOS_PREGUNTA.FECHA,
            fp_estado: true,
            fp_requerida: [
              TIPOS_PREGUNTA.NOTA,
              TIPOS_PREGUNTA.FECHA_HORA_ACTUAL,
            ].includes(formPregunta.tipo as any)
              ? false
              : formPregunta.requerida,
            fp_orden: nuevoOrden + 1,
            seccion_id: targetSeccionId,
            formulario_id: formularioIdNumber,
            fp_version: version ? parseInt(version) : 1,
            fp_pregunta_padre_id: creada.fp_id,
            fp_valor_padre_disparador: null,
          };
          await formularioPreguntasService.create(payloadFechaDependiente);
        }

        if (
          creada?.fp_id &&
          [
            TIPOS_PREGUNTA.SELECT,
            TIPOS_PREGUNTA.MULTISELECT,
            TIPOS_PREGUNTA.DOCUMENTOS_TABLA,
          ].includes(formPregunta.tipo as any)
        ) {
          await formularioPreguntasService.syncOpciones(
            creada.fp_id,
            opcionesNuevas,
          );
        }
      }

      setFormPregunta(FORM_PREGUNTA_DEFAULT);
      setEditandoPregunta(null);
      setNuevaPregunta(false);
      setOpcionesNuevas([]);
      setFiltroBaseDatos("");
      setFiltroTabla("");
      setFiltroColumna("");
      setCatalogoColumnas([]);
      await cargarDatos();
    } catch (error) {
      console.error("Error guardando pregunta:", error);
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la pregunta",
      );
    }
  };

  const iniciarEdicionPregunta = async (pregunta: Pregunta) => {
    console.log("🧪 PREGUNTA DESDE BACKEND:", pregunta);

    const preguntaPadre = preguntas.find(
      (p) => p.fp_id === pregunta.fp_pregunta_padre_id,
    );
    setFormPregunta({
      descripcion: pregunta.fp_descripcion,
      tipo: pregunta.fp_tipo,
      subtipo:
        pregunta.fp_tipo === TIPOS_PREGUNTA.SELECT
          ? (pregunta.fp_subtipo ?? "LISTA")
          : "",
      seccion_id: pregunta.seccion_id ?? null,
      requerida: Boolean(pregunta.fp_requerida),
      tipo_documento_id: pregunta.fp_tipo_documento_id ?? null,
      catalogo_base_datos: pregunta.fp_catalogo_base_datos ?? "",
      catalogo_tabla: pregunta.fp_catalogo_tabla ?? "",
      catalogo_columna: pregunta.fp_catalogo_columna ?? "",
      catalogo_pk_column: pregunta.fp_catalogo_pk_column ?? "",
      dependiente: Boolean(pregunta.fp_pregunta_padre_id),
      dependencia_seccion_id: preguntaPadre?.seccion_id ?? null,
      dependencia_pregunta_id: pregunta.fp_pregunta_padre_id ?? null,
      dependencia_valor: pregunta.fp_valor_padre_disparador ?? "",
      precarga_fuente: pregunta.fp_precarga_fuente ?? "",
      precarga_campo_cliente: pregunta.fp_precarga_campo_cliente ?? "",
      precarga_base_datos: "",
      precarga_tabla: "",
      precarga_columna: "",
    });
    setEditandoPregunta(pregunta.fp_id);
    setNuevaPregunta(false);
    setNuevaOpcion("");
    setOpcionesNuevas([]);
    setFiltroBaseDatos(pregunta.fp_catalogo_base_datos ?? "");
    setFiltroTabla(pregunta.fp_catalogo_tabla ?? "");
    setFiltroColumna(pregunta.fp_catalogo_columna ?? "");

    if (
      [
        TIPOS_PREGUNTA.SELECT,
        TIPOS_PREGUNTA.MULTISELECT,
        TIPOS_PREGUNTA.DOCUMENTOS_TABLA,
      ].includes(pregunta.fp_tipo as any) &&
      !readonly
    ) {
      try {
        setLoading_opciones(true);
        const data = await formularioPreguntasService.getOpciones(
          pregunta.fp_id,
        );
        setOpciones(data);
        setOpcionesNuevas(
          data
            .map((item: Opcion) => item.fpo_valor || item.op_descripcion)
            .filter((item: string | undefined): item is string => Boolean(item?.trim())),
        );
        console.log("✅ Opciones cargadas:", data);
      } catch (error) {
        console.error("❌ Error cargando opciones:", error);
      } finally {
        setLoading_opciones(false);
      }
    } else {
      setOpciones([]);
      setOpcionesNuevas([]);
    }
  };

  const agregarOpcion = async () => {
    if (!nuevaOpcion.trim() || !editandoPregunta) {
      if (!nuevaOpcion.trim()) {
        setError("Ingresa una opción válida");
        return;
      }
      setOpcionesNuevas((prev) => [...prev, nuevaOpcion.trim()]);
      setNuevaOpcion("");
      return;
    }
    try {
      const nuevaOp = await formularioPreguntasService.createOpcion(
        editandoPregunta,
        nuevaOpcion,
      );
      setOpciones([...opciones, nuevaOp]);
      setNuevaOpcion("");
      console.log("✅ Opción agregada:", nuevaOp);
    } catch (error) {
      console.error("❌ Error agregando opción:", error);
      setError(error instanceof Error ? error.message : "Error al agregar opción");
    }
  };

  const eliminarOpcion = async (opcionId: number) => {
    if (!editandoPregunta) return;
    if (
      !confirm(
        "¿Estás seguro de que deseas eliminar esta opción? Las respuestas asociadas quedarán sin opción.",
      )
    ) {
      return;
    }
    try {
      await formularioPreguntasService.deleteOpcion(editandoPregunta, opcionId);
      setOpciones(opciones.filter((o) => o.fpo_id !== opcionId));
      console.log("✅ Opción eliminada:", opcionId);
    } catch (error) {
      console.error("❌ Error eliminando opción:", error);
      setError(
        error instanceof Error ? error.message : "Error al eliminar opción",
      );
    }
  };

  const eliminarOpcionNueva = (indice: number) => {
    setOpcionesNuevas((prev) => prev.filter((_, i) => i !== indice));
  };

  const eliminarPregunta = async (preguntaId: number) => {
    if (
      !confirm(
        "¿Estás seguro de que deseas eliminar esta pregunta? Se eliminarán sus respuestas y opciones asociadas.",
      )
    ) {
      return;
    }
    try {
      await formularioPreguntasService.delete(preguntaId);
      if (editandoPregunta === preguntaId) {
        setEditandoPregunta(null);
        setNuevaPregunta(false);
        setOpciones([]);
        setNuevaOpcion("");
      }
      await cargarDatos();
    } catch (error) {
      console.error("Error eliminando pregunta:", error);
      setError(
        error instanceof Error ? error.message : "Error al eliminar pregunta",
      );
    }
  };

  const guardarOrdenPreguntas = async (ordenadas: Pregunta[]) => {
    try {
      await Promise.all(
        ordenadas.map((pregunta) =>
          formularioPreguntasService.update(pregunta.fp_id, {
            fp_descripcion: pregunta.fp_descripcion,
            fp_tipo: pregunta.fp_tipo,
            fp_orden: pregunta.fp_orden,
            seccion_id: pregunta.seccion_id,
            fp_estado: pregunta.fp_estado,
          } as any),
        ),
      );
    } catch (error) {
      console.error("Error guardando orden de preguntas:", error);
    }
  };

  const handlePreguntaDragEnd = async (event: any) => {
    if (readonly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const lista = preguntasDeSeccion;
    const oldIndex = lista.findIndex(
      (p) => `pregunta-${p.fp_id}` === active.id,
    );
    const newIndex = lista.findIndex((p) => `pregunta-${p.fp_id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordenadas = arrayMove(lista, oldIndex, newIndex).map(
      (pregunta, index) => ({
        ...pregunta,
        fp_orden: index + 1,
      }),
    );
    const nuevasPreguntas = preguntas.map((pregunta) => {
      const encontrada = reordenadas.find((p) => p.fp_id === pregunta.fp_id);
      return encontrada
        ? { ...pregunta, fp_orden: encontrada.fp_orden }
        : pregunta;
    });
    setPreguntas(nuevasPreguntas);
    await guardarOrdenPreguntas(reordenadas);
  };

  const cambiarOrdenPregunta = async (
    preguntaId: number,
    direccion: "arriba" | "abajo",
  ) => {
    const index = preguntasDeSeccion.findIndex((p) => p.fp_id === preguntaId);
    if (
      (direccion === "arriba" && index === 0) ||
      (direccion === "abajo" && index === preguntasDeSeccion.length - 1)
    ) {
      return;
    }
    const swapIndex = direccion === "arriba" ? index - 1 : index + 1;
    const preguntaActual = preguntasDeSeccion[index];
    const preguntaSwap = preguntasDeSeccion[swapIndex];
    try {
      await Promise.all([
        formularioPreguntasService.update(preguntaActual.fp_id, {
          fp_descripcion: preguntaActual.fp_descripcion,
          fp_tipo: preguntaActual.fp_tipo,
          fp_orden: preguntaSwap.fp_orden,
          seccion_id: preguntaActual.seccion_id,
          fp_estado: preguntaActual.fp_estado,
        } as any),
        formularioPreguntasService.update(preguntaSwap.fp_id, {
          fp_descripcion: preguntaSwap.fp_descripcion,
          fp_tipo: preguntaSwap.fp_tipo,
          fp_orden: preguntaActual.fp_orden,
          seccion_id: preguntaSwap.seccion_id,
          fp_estado: preguntaSwap.fp_estado,
        } as any),
      ]);
      await cargarDatos();
    } catch (error) {
      console.error("Error cambiando orden de pregunta:", error);
      setError("Error al cambiar orden de pregunta");
    }
  };

  return {
    // Form state
    editandoPregunta,
    setEditandoPregunta,
    nuevaPregunta,
    setNuevaPregunta,
    formPregunta,
    setFormPregunta,
    // Opciones
    opciones,
    setOpciones,
    nuevaOpcion,
    setNuevaOpcion,
    loading_opciones,
    opcionesNuevas,
    setOpcionesNuevas,
    // Catálogo
    catalogoBases,
    catalogoTablas,
    catalogoColumnas,
    loadingCatalogoBases,
    loadingCatalogoTablas,
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
    // Error handling
    error,
    setError,
    // Funciones
    guardarPregunta,
    iniciarEdicionPregunta,
    eliminarPregunta,
    agregarOpcion,
    eliminarOpcion,
    eliminarOpcionNueva,
    cambiarOrdenPregunta,
    guardarOrdenPreguntas,
    handlePreguntaDragEnd,
    FORM_PREGUNTA_DEFAULT,
  };
}
