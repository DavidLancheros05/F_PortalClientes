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
import type {
  ColumnaTabla,
  FormPreguntaState,
  Pregunta,
  ReglaLimiteTabla,
  Seccion,
} from "./types";

const FORM_PREGUNTA_DEFAULT: FormPreguntaState = {
  descripcion: "",
  codigo: undefined,
  tipo: TIPOS_PREGUNTA.TEXTO,
  subtipo: "",
  patron: "",
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
  tabla_columnas: [],
  ancho_completo: false,
  tabla_limite_modo: "SIN_LIMITE",
  tabla_limite_fijo: "",
  tabla_limite_seccion_id: null,
  tabla_limite_pregunta_id: null,
  tabla_limite_reglas: [],
  oculto_en_formulario: false,
  espacio_lineas: "",
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
  const [successMessage, setSuccessMessage] = useState<"creada" | "editada" | null>(null);
  const [opcionAEliminar, setOpcionAEliminar] = useState<number | null>(null);
  const [preguntaAEliminar, setPreguntaAEliminar] = useState<number | null>(
    null,
  );
  const [opcionEditandoId, setOpcionEditandoId] = useState<number | null>(null);
  const [opcionEditandoValor, setOpcionEditandoValor] = useState("");
  const [opcionesPreguntaPadre, setOpcionesPreguntaPadre] = useState<Opcion[]>(
    [],
  );
  const [loadingOpcionesPreguntaPadre, setLoadingOpcionesPreguntaPadre] =
    useState(false);

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
  const [filtroLlave, setFiltroLlave] = useState("");

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

  const llaveFiltrada = useMemo(() => {
    const filtro = normalizarFiltro(filtroLlave);
    return catalogoColumnas.filter(
      (columna) =>
        !filtro || normalizarFiltro(String(columna)).includes(filtro),
    );
  }, [catalogoColumnas, filtroLlave]);

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

  // Si la "pregunta padre" de una dependencia es de opciones fijas
  // (SELECT/MULTISELECT/SELECT_CONDICIONAL), cargamos sus opciones reales
  // para que "Respuesta que dispara" sea un selector, no texto libre.
  useEffect(() => {
    if (
      !formPregunta.dependiente ||
      !formPregunta.dependencia_pregunta_id ||
      (!nuevaPregunta && !editandoPregunta)
    ) {
      setOpcionesPreguntaPadre([]);
      return;
    }
    const preguntaPadre = preguntas.find(
      (p) => p.fp_id === formPregunta.dependencia_pregunta_id,
    );
    const esDeOpciones = [
      TIPOS_PREGUNTA.SELECT,
      TIPOS_PREGUNTA.MULTISELECT,
      TIPOS_PREGUNTA.SELECT_CONDICIONAL,
    ].includes(preguntaPadre?.fp_tipo as any);
    if (!esDeOpciones) {
      setOpcionesPreguntaPadre([]);
      return;
    }
    setLoadingOpcionesPreguntaPadre(true);
    formularioPreguntasService
      .getOpciones(formPregunta.dependencia_pregunta_id)
      .then((data) => setOpcionesPreguntaPadre(data))
      .catch((error) => {
        console.error(
          "❌ Error cargando opciones de la pregunta padre:",
          error,
        );
        setOpcionesPreguntaPadre([]);
      })
      .finally(() => setLoadingOpcionesPreguntaPadre(false));
  }, [
    formPregunta.dependiente,
    formPregunta.dependencia_pregunta_id,
    nuevaPregunta,
    editandoPregunta,
    preguntas,
  ]);

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

  // Espeja las validaciones de guardarPregunta, pero sin efectos secundarios
  // (no llama a setError), para poder deshabilitar el botón "Guardar" mientras
  // el formulario no esté en un estado guardable.
  const puedeGuardarPregunta = useMemo(() => {
    const targetSeccionId = formPregunta.seccion_id ?? seccionSeleccionada;
    const requiereDescripcion =
      (formPregunta.tipo as any) !== TIPOS_PREGUNTA.FECHA_HORA_ACTUAL;
    const descripcionNormalizada = formPregunta.descripcion.trim();

    if ((requiereDescripcion && !descripcionNormalizada) || !targetSeccionId) {
      return false;
    }
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA &&
      !String(formPregunta.catalogo_tabla || "").trim()
    ) {
      return false;
    }
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA &&
      !String(formPregunta.catalogo_columna || "").trim()
    ) {
      return false;
    }
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA &&
      !String(formPregunta.catalogo_pk_column || "").trim()
    ) {
      return false;
    }
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA &&
      !formPregunta.tipo_documento_id
    ) {
      return false;
    }
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.ARCHIVO &&
      !formPregunta.tipo_documento_id
    ) {
      return false;
    }
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.TABLA &&
      formPregunta.tabla_columnas.filter((c) => c.nombre.trim()).length === 0
    ) {
      return false;
    }
    if (!formularioIdNumber) {
      return false;
    }
    return true;
  }, [formPregunta, seccionSeleccionada, formularioIdNumber]);

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
      setError(
        "Para 'Selección desde tabla' debes indicar la columna a mostrar",
      );
      return;
    }
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA &&
      !String(formPregunta.catalogo_pk_column || "").trim()
    ) {
      setError(
        "Para 'Selección desde tabla' debes indicar la primary key (PK)",
      );
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
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.TABLA &&
      formPregunta.tabla_columnas.filter((c) => c.nombre.trim()).length === 0
    ) {
      setError("Para 'Pregunta tipo tabla' debes agregar al menos una columna");
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
        fp_tabla_columnas:
          formPregunta.tipo === TIPOS_PREGUNTA.TABLA
            ? JSON.stringify(
                formPregunta.tabla_columnas
                  .map((c) => ({
                    nombre: c.nombre.trim(),
                    tipo: c.tipo,
                    ...(c.tipo === "CATALOGO"
                      ? {
                          catalogo_base_datos:
                            c.catalogo_base_datos || undefined,
                          catalogo_tabla: c.catalogo_tabla || undefined,
                          catalogo_columna: c.catalogo_columna || undefined,
                          catalogo_pk_column: c.catalogo_pk_column || undefined,
                          catalogo_columna_padre:
                            c.catalogo_columna_padre || undefined,
                          catalogo_columna_filtro: c.catalogo_columna_padre
                            ? c.catalogo_columna_filtro || undefined
                            : undefined,
                        }
                      : {}),
                  }))
                  .filter((c) => Boolean(c.nombre)),
              )
            : null,
        fp_ancho_completo: formPregunta.ancho_completo,
        fp_oculto_en_formulario: formPregunta.oculto_en_formulario,
        ...(formPregunta.tipo === TIPOS_PREGUNTA.TABLA
          ? {
              fp_maximo:
                formPregunta.tabla_limite_modo === "FIJO" &&
                formPregunta.tabla_limite_fijo.trim()
                  ? parseInt(formPregunta.tabla_limite_fijo, 10)
                  : null,
              fp_tabla_limite_modo: formPregunta.tabla_limite_modo,
              fp_tabla_limite_pregunta_id:
                formPregunta.tabla_limite_modo === "CONDICIONAL"
                  ? formPregunta.tabla_limite_pregunta_id
                  : null,
              fp_tabla_limite_reglas:
                formPregunta.tabla_limite_modo === "CONDICIONAL"
                  ? JSON.stringify(
                      formPregunta.tabla_limite_reglas
                        .map((r) => ({
                          valor: r.valor.trim(),
                          limite: r.limite.trim()
                            ? parseInt(r.limite, 10)
                            : null,
                        }))
                        .filter((r) => Boolean(r.valor)),
                    )
                  : null,
            }
          : {}),
        ...(formPregunta.tipo === TIPOS_PREGUNTA.ESPACIO_FIRMA
          ? {
              fp_maximo: formPregunta.espacio_lineas.trim()
                ? parseInt(formPregunta.espacio_lineas, 10)
                : 5,
            }
          : {}),
      };

      if (formPregunta.tipo === TIPOS_PREGUNTA.SELECT) {
        payload.fp_subtipo =
          formPregunta.subtipo === "CHECK" ? "CHECK" : "LISTA";
      } else if (
        formPregunta.tipo === TIPOS_PREGUNTA.NUMERO ||
        formPregunta.tipo === TIPOS_PREGUNTA.FECHA
      ) {
        payload.fp_subtipo = formPregunta.subtipo || null;
      } else if (formPregunta.tipo === TIPOS_PREGUNTA.TEXTO) {
        payload.fp_subtipo = formPregunta.subtipo || null;
        payload.fp_patron = formPregunta.subtipo
          ? formPregunta.patron || null
          : null;
      } else if (
        preguntaEnEdicion?.fp_tipo === TIPOS_PREGUNTA.SELECT ||
        preguntaEnEdicion?.fp_tipo === TIPOS_PREGUNTA.NUMERO ||
        preguntaEnEdicion?.fp_tipo === TIPOS_PREGUNTA.FECHA ||
        preguntaEnEdicion?.fp_tipo === TIPOS_PREGUNTA.TEXTO
      ) {
        payload.fp_subtipo = null;
        payload.fp_patron = null;
      }

      if (editandoPregunta) {
        await formularioPreguntasService.update(editandoPregunta, payload);
        // Actualizar el estado local en lugar de recargar todo
        setPreguntas((prev) =>
          prev.map((p) =>
            p.fp_id === editandoPregunta
              ? { ...p, ...payload, fp_descripcion: descripcionPersistida }
              : p,
          ),
        );
        setSuccessMessage("editada");
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

        // Agregar la nueva pregunta al estado local
        if (creada) {
          setPreguntas((prev) => [...prev, creada]);
          setSuccessMessage("creada");
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
          : pregunta.fp_tipo === TIPOS_PREGUNTA.NUMERO ||
              pregunta.fp_tipo === TIPOS_PREGUNTA.FECHA ||
              pregunta.fp_tipo === TIPOS_PREGUNTA.TEXTO
            ? (pregunta.fp_subtipo ?? "")
            : "",
      patron:
        pregunta.fp_tipo === TIPOS_PREGUNTA.TEXTO
          ? (pregunta.fp_patron ?? "")
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
      tabla_columnas: (() => {
        if (!pregunta.fp_tabla_columnas) return [];
        try {
          const parsed = JSON.parse(pregunta.fp_tabla_columnas);
          if (!Array.isArray(parsed)) return [];
          // Compatibilidad con columnas antiguas guardadas como string plano
          return parsed.map((c: unknown): ColumnaTabla => {
            if (typeof c === "string") return { nombre: c, tipo: "TEXTO" };
            const col = c as ColumnaTabla;
            return {
              nombre: col.nombre,
              tipo: col.tipo || "TEXTO",
              catalogo_base_datos: col.catalogo_base_datos,
              catalogo_tabla: col.catalogo_tabla,
              catalogo_columna: col.catalogo_columna,
              catalogo_pk_column: col.catalogo_pk_column,
              catalogo_columna_padre: col.catalogo_columna_padre,
              catalogo_columna_filtro: col.catalogo_columna_filtro,
            };
          });
        } catch {
          return [];
        }
      })(),
      ancho_completo: Boolean(pregunta.fp_ancho_completo),
      oculto_en_formulario: Boolean(pregunta.fp_oculto_en_formulario),
      tabla_limite_modo:
        (pregunta.fp_tabla_limite_modo as
          | "SIN_LIMITE"
          | "FIJO"
          | "CONDICIONAL") || "SIN_LIMITE",
      tabla_limite_fijo:
        pregunta.fp_tabla_limite_modo === "FIJO" && pregunta.fp_maximo != null
          ? String(pregunta.fp_maximo)
          : "",
      espacio_lineas:
        pregunta.fp_tipo === TIPOS_PREGUNTA.ESPACIO_FIRMA &&
        pregunta.fp_maximo != null
          ? String(pregunta.fp_maximo)
          : "",
      tabla_limite_seccion_id:
        preguntas.find((p) => p.fp_id === pregunta.fp_tabla_limite_pregunta_id)
          ?.seccion_id ?? null,
      tabla_limite_pregunta_id: pregunta.fp_tabla_limite_pregunta_id ?? null,
      tabla_limite_reglas: (() => {
        if (!pregunta.fp_tabla_limite_reglas) return [];
        try {
          const parsed = JSON.parse(pregunta.fp_tabla_limite_reglas);
          if (!Array.isArray(parsed)) return [];
          return parsed.map(
            (r: {
              valor?: string;
              limite?: number | null;
            }): ReglaLimiteTabla => ({
              valor: String(r.valor ?? ""),
              limite: r.limite != null ? String(r.limite) : "",
            }),
          );
        } catch {
          return [];
        }
      })(),
    });
    setEditandoPregunta(pregunta.fp_id);
    setNuevaPregunta(false);
    setNuevaOpcion("");
    setOpcionesNuevas([]);
    setFiltroBaseDatos(pregunta.fp_catalogo_base_datos ?? "");
    setFiltroTabla(pregunta.fp_catalogo_tabla ?? "");
    setFiltroColumna(pregunta.fp_catalogo_columna ?? "");
    setFiltroLlave(pregunta.fp_catalogo_pk_column ?? "");

    if (
      [TIPOS_PREGUNTA.SELECT, TIPOS_PREGUNTA.MULTISELECT].includes(
        pregunta.fp_tipo as any,
      ) &&
      Array.isArray(pregunta.opciones)
    ) {
      // El listado de preguntas ya trae las opciones precargadas (endpoint
      // "completo" batched), asi que no hace falta otra llamada de red aqui.
      setOpciones(pregunta.opciones);
      setOpcionesNuevas(
        pregunta.opciones
          .map((item: Opcion) => item.fpo_valor || item.op_descripcion)
          .filter((item: string | undefined): item is string =>
            Boolean(item?.trim()),
          ),
      );
    } else if (
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
            .filter((item: string | undefined): item is string =>
              Boolean(item?.trim()),
            ),
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
      setError(
        error instanceof Error ? error.message : "Error al agregar opción",
      );
    }
  };

  // Preguntas que se muestran/ocultan según que esta opción sea la respuesta
  // seleccionada en `editandoPregunta` (fp_pregunta_padre_id + fp_valor_padre_disparador).
  const obtenerPreguntasDependientesDeOpcion = (fpoId: number): Pregunta[] => {
    if (!editandoPregunta) return [];
    const opcion = opciones.find((o) => o.fpo_id === fpoId);
    const valorOpcion = (opcion?.fpo_valor || opcion?.op_descripcion || "")
      .trim()
      .toLowerCase();
    if (!valorOpcion) return [];
    return preguntas.filter(
      (p) =>
        p.fp_pregunta_padre_id === editandoPregunta &&
        (p.fp_valor_padre_disparador || "").trim().toLowerCase() ===
          valorOpcion,
    );
  };

  const iniciarEdicionOpcion = (opcion: Opcion) => {
    setOpcionEditandoId(opcion.fpo_id);
    setOpcionEditandoValor(opcion.fpo_valor || opcion.op_descripcion || "");
  };

  const cancelarEdicionOpcion = () => {
    setOpcionEditandoId(null);
    setOpcionEditandoValor("");
  };

  const guardarEdicionOpcion = async () => {
    if (!editandoPregunta || opcionEditandoId === null) return;
    const valorNuevo = opcionEditandoValor.trim();
    if (!valorNuevo) {
      setError("El valor de la opción no puede quedar vacío");
      return;
    }
    const opcionActual = opciones.find((o) => o.fpo_id === opcionEditandoId);
    const valorAnterior = (
      opcionActual?.fpo_valor ||
      opcionActual?.op_descripcion ||
      ""
    ).trim();

    try {
      const actualizada = await formularioPreguntasService.updateOpcion(
        editandoPregunta,
        opcionEditandoId,
        { fpo_valor: valorNuevo },
      );
      setOpciones(
        opciones.map((o) =>
          o.fpo_id === opcionEditandoId
            ? { ...o, ...actualizada, fpo_valor: valorNuevo }
            : o,
        ),
      );

      // Si esta opción es el valor que dispara alguna pregunta dependiente,
      // le actualizamos el texto también para que la dependencia no se rompa.
      if (
        valorAnterior &&
        valorAnterior.toLowerCase() !== valorNuevo.toLowerCase()
      ) {
        const dependientes = preguntas.filter(
          (p) =>
            p.fp_pregunta_padre_id === editandoPregunta &&
            (p.fp_valor_padre_disparador || "").trim().toLowerCase() ===
              valorAnterior.toLowerCase(),
        );
        if (dependientes.length > 0) {
          await Promise.all(
            dependientes.map((p) =>
              formularioPreguntasService.update(p.fp_id, {
                fp_valor_padre_disparador: valorNuevo,
              } as any),
            ),
          );
          // Actualizar el estado local en lugar de recargar todo
          setPreguntas((prev) =>
            prev.map((p) =>
              dependientes.some((d) => d.fp_id === p.fp_id)
                ? {
                    ...p,
                    fp_valor_padre_disparador: valorNuevo,
                  }
                : p,
            ),
          );
        }
      }

      setOpcionEditandoId(null);
      setOpcionEditandoValor("");
    } catch (error) {
      console.error("❌ Error editando opción:", error);
      setError(
        error instanceof Error ? error.message : "Error al editar opción",
      );
    }
  };

  const eliminarOpcion = (opcionId: number) => {
    if (!editandoPregunta) return;
    const dependientes = obtenerPreguntasDependientesDeOpcion(opcionId);
    if (dependientes.length > 0) {
      setError(
        `No puedes eliminar esta opción: la(s) pregunta(s) "${dependientes
          .map((p) => p.fp_descripcion)
          .join(
            '", "',
          )}" dependen de ella. Primero cambia o quita esa dependencia (sección "Dependiente de otra pregunta") y luego elimina la opción.`,
      );
      return;
    }
    setOpcionAEliminar(opcionId);
  };

  const confirmarEliminarOpcion = async () => {
    if (!editandoPregunta || opcionAEliminar === null) return;
    const opcionId = opcionAEliminar;
    setOpcionAEliminar(null);
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

  const eliminarPregunta = (preguntaId: number) => {
    setPreguntaAEliminar(preguntaId);
  };

  const confirmarEliminarPregunta = async () => {
    if (preguntaAEliminar === null) return;
    const preguntaId = preguntaAEliminar;
    setPreguntaAEliminar(null);
    try {
      await formularioPreguntasService.delete(preguntaId);
      if (editandoPregunta === preguntaId) {
        setEditandoPregunta(null);
        setNuevaPregunta(false);
        setOpciones([]);
        setNuevaOpcion("");
      }
      // Actualizar el estado local en lugar de recargar todo
      setPreguntas((prev) => prev.filter((p) => p.fp_id !== preguntaId));
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
      setError(
        error instanceof Error
          ? error.message
          : "Error al guardar el orden de las preguntas",
      );
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
      // Actualizar el estado local intercambiando órdenes
      setPreguntas((prev) =>
        prev.map((p) => {
          if (p.fp_id === preguntaActual.fp_id) {
            return { ...p, fp_orden: preguntaSwap.fp_orden };
          }
          if (p.fp_id === preguntaSwap.fp_id) {
            return { ...p, fp_orden: preguntaActual.fp_orden };
          }
          return p;
        }),
      );
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
    cargarBasesCatalogo,
    cargarTablasCatalogo,
    cargarColumnasCatalogo,
    documentosCatalogo,
    loadingDocumentosCatalogo,
    opcionesPreguntaPadre,
    loadingOpcionesPreguntaPadre,
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
    // Error handling
    error,
    setError,
    // Funciones
    guardarPregunta,
    puedeGuardarPregunta,
    iniciarEdicionPregunta,
    eliminarPregunta,
    confirmarEliminarPregunta,
    preguntaAEliminar,
    setPreguntaAEliminar,
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
    guardarOrdenPreguntas,
    handlePreguntaDragEnd,
    FORM_PREGUNTA_DEFAULT,
    successMessage,
    setSuccessMessage,
  };
}
