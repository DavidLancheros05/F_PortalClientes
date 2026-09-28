"use client";
import { useEffect, useMemo, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { formularioPreguntasService, type Opcion } from "@/services/parametrizacion/formulario-preguntas.service";
import { maestrosService, type DocumentoCatalogo } from "@/services/parametrizacion/maestros.service";
import { TIPOS_PREGUNTA } from "@/constants/tipos-pregunta";
import type {
  ColumnaTabla,
  FormPreguntaState,
  Pregunta,
  ReglaFiltroCatalogo,
  ReglaLimiteTabla,
  Seccion,
} from "./types";

// Arreglos tipados explícitamente como Pregunta["fp_tipo"][]: sin la
// anotación, TS infiere el tipo unión angosto de los literales listados y
// .includes() rechaza cualquier valor del tipo completo (más amplio) que no
// esté en esa lista puntual — de ahí salían los `as any` de más abajo.
const TIPOS_CON_OPCIONES_FIJAS: Pregunta["fp_tipo"][] = [
  TIPOS_PREGUNTA.SELECT,
  TIPOS_PREGUNTA.MULTISELECT,
];
const TIPOS_CATALOGO_DOCUMENTOS: Pregunta["fp_tipo"][] = [TIPOS_PREGUNTA.ARCHIVO, TIPOS_PREGUNTA.DOCUMENTOS_TABLA];
const TIPOS_SIN_REQUERIDA: Pregunta["fp_tipo"][] = [TIPOS_PREGUNTA.NOTA, TIPOS_PREGUNTA.FECHA_HORA_ACTUAL];
const TIPOS_CON_SINCRONIZACION_OPCIONES: Pregunta["fp_tipo"][] = [
  TIPOS_PREGUNTA.SELECT,
  TIPOS_PREGUNTA.MULTISELECT,
  TIPOS_PREGUNTA.DOCUMENTOS_TABLA,
];
const TIPOS_SELECT_MULTISELECT: Pregunta["fp_tipo"][] = [TIPOS_PREGUNTA.SELECT, TIPOS_PREGUNTA.MULTISELECT];

const FORM_PREGUNTA_DEFAULT: FormPreguntaState = {
  descripcion: "",
  codigo: undefined,
  tipo: TIPOS_PREGUNTA.TEXTO,
  subtipo: "",
  patron: "",
  fp_fs_id: null,
  requerida: false,
  tipo_documento_id: null,
  catalogo_tabla: "",
  catalogo_columna: "",
  catalogo_pk_column: "",
  catalogo_columna_condicion: "",
  catalogo_valor_condicion: "",
  dependiente: false,
  dependencia_fp_fs_id: null,
  dependencia_pregunta_id: null,
  dependencia_valor: "",
  precarga_fuente: "",
  precarga_campo_cliente: "",
  tabla_columnas: [],
  ancho_columnas: 1,
  tabla_limite_modo: "SIN_LIMITE",
  tabla_limite_fijo: "",
  tabla_limite_fp_fs_id: null,
  tabla_limite_pregunta_id: null,
  tabla_limite_reglas: [],
  catalogo_filtro_dependiente: false,
  catalogo_filtro_fp_fs_id: null,
  catalogo_filtro_pregunta_id: null,
  catalogo_filtro_columna: "",
  catalogo_filtro_reglas: [],
  oculto_en_formulario: false,
  espacio_lineas: "",
  archivo_maximo: "",
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
  const [formPregunta, setFormPregunta] = useState<FormPreguntaState>(FORM_PREGUNTA_DEFAULT);
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  // Al editar una pregunta, `opciones` es la copia de trabajo y esta la foto
  // de cómo estaban en la BD al abrir. Agregar/renombrar/eliminar solo toca
  // la copia; al dar "Guardar" se manda la diferencia (aplicarCambiosOpciones)
  // y "Cancelar" la descarta. Antes cada clic llamaba al backend.
  const [opcionesOriginales, setOpcionesOriginales] = useState<Opcion[]>([]);
  const [nuevaOpcion, setNuevaOpcion] = useState("");
  const [loading_opciones, setLoading_opciones] = useState(false);
  const [opcionesNuevas, setOpcionesNuevas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<"creada" | "editada" | null>(null);
  const [guardandoPregunta, setGuardandoPregunta] = useState(false);
  const [mostrarConfirmarGuardarPregunta, setMostrarConfirmarGuardarPregunta] = useState(false);
  const [opcionAEliminar, setOpcionAEliminar] = useState<number | null>(null);
  const [preguntaAEliminar, setPreguntaAEliminar] = useState<number | null>(null);
  const [opcionEditandoId, setOpcionEditandoId] = useState<number | null>(null);
  const [opcionEditandoValor, setOpcionEditandoValor] = useState("");
  const [opcionesPreguntaPadre, setOpcionesPreguntaPadre] = useState<Opcion[]>([]);
  const [loadingOpcionesPreguntaPadre, setLoadingOpcionesPreguntaPadre] = useState(false);

  // Catalogo state. Los catálogos siempre se leen de la base actual: el
  // editor no ofrece elegir base de datos (un nombre quemado rompió
  // /maestros/catalogo al cambiar de servidor; el backend guarda NULL).
  const [catalogoTablas, setCatalogoTablas] = useState<string[]>([]);
  const [catalogoColumnas, setCatalogoColumnas] = useState<string[]>([]);
  const [loadingCatalogoTablas, setLoadingCatalogoTablas] = useState(false);
  const [loadingCatalogoColumnas, setLoadingCatalogoColumnas] = useState(false);
  const [documentosCatalogo, setDocumentosCatalogo] = useState<DocumentoCatalogo[]>([]);
  const [loadingDocumentosCatalogo, setLoadingDocumentosCatalogo] = useState(false);
  const [filtroTabla, setFiltroTabla] = useState("");
  const [filtroColumna, setFiltroColumna] = useState("");
  const [filtroLlave, setFiltroLlave] = useState("");

  const normalizarFiltro = (value: string) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();

  const tablasFiltradas = useMemo(() => {
    const filtro = normalizarFiltro(filtroTabla);
    return catalogoTablas.filter((tabla) => !filtro || normalizarFiltro(String(tabla)).includes(filtro));
  }, [catalogoTablas, filtroTabla]);

  const columnasFiltradas = useMemo(() => {
    const filtro = normalizarFiltro(filtroColumna);
    return catalogoColumnas.filter((columna) => !filtro || normalizarFiltro(String(columna)).includes(filtro));
  }, [catalogoColumnas, filtroColumna]);

  const llaveFiltrada = useMemo(() => {
    const filtro = normalizarFiltro(filtroLlave);
    return catalogoColumnas.filter((columna) => !filtro || normalizarFiltro(String(columna)).includes(filtro));
  }, [catalogoColumnas, filtroLlave]);

  const cargarTablasCatalogo = async () => {
    try {
      setLoadingCatalogoTablas(true);
      const data = await maestrosService.getCatalogoTablas();
      setCatalogoTablas(data);
    } catch (error) {
      console.error("❌ Error cargando tablas:", error);
      setCatalogoTablas([]);
    } finally {
      setLoadingCatalogoTablas(false);
    }
  };

  const cargarColumnasCatalogo = async (tabla: string) => {
    if (!tabla.trim()) {
      setCatalogoColumnas([]);
      return;
    }
    try {
      setLoadingCatalogoColumnas(true);
      const data = await maestrosService.getCatalogoColumnas(tabla);
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
      console.error("❌ [EDITOR] Error cargando catálogo de documentos:", error);
      setDocumentosCatalogo([]);
    } finally {
      setLoadingDocumentosCatalogo(false);
    }
  };

  // Si la "pregunta padre" de una dependencia es de opciones fijas
  // (SELECT/MULTISELECT), cargamos sus opciones reales
  // para que "Respuesta que dispara" sea un selector, no texto libre.
  useEffect(() => {
    if (!formPregunta.dependiente || !formPregunta.dependencia_pregunta_id || (!nuevaPregunta && !editandoPregunta)) {
      setOpcionesPreguntaPadre([]);
      return;
    }
    const preguntaPadre = preguntas.find((p) => p.fp_id === formPregunta.dependencia_pregunta_id);
    const esDeOpciones = Boolean(preguntaPadre && TIPOS_CON_OPCIONES_FIJAS.includes(preguntaPadre.fp_tipo));
    if (!esDeOpciones) {
      setOpcionesPreguntaPadre([]);
      return;
    }
    setLoadingOpcionesPreguntaPadre(true);
    formularioPreguntasService
      .getOpciones(formPregunta.dependencia_pregunta_id)
      .then((data) => setOpcionesPreguntaPadre(data))
      .catch((error) => {
        console.error("❌ Error cargando opciones de la pregunta padre:", error);
        setOpcionesPreguntaPadre([]);
      })
      .finally(() => setLoadingOpcionesPreguntaPadre(false));
  }, [formPregunta.dependiente, formPregunta.dependencia_pregunta_id, nuevaPregunta, editandoPregunta, preguntas]);

  useEffect(() => {
    if (formPregunta.tipo !== TIPOS_PREGUNTA.SELECT_TABLA || (!nuevaPregunta && !editandoPregunta)) return;
    cargarTablasCatalogo();
  }, [formPregunta.tipo, nuevaPregunta, editandoPregunta]);

  useEffect(() => {
    if (!TIPOS_CATALOGO_DOCUMENTOS.includes(formPregunta.tipo) || (!nuevaPregunta && !editandoPregunta)) {
      return;
    }
    cargarDocumentosCatalogo();
  }, [formPregunta.tipo, nuevaPregunta, editandoPregunta]);

  useEffect(() => {
    if (formPregunta.tipo !== "SELECT_TABLA" || (!nuevaPregunta && !editandoPregunta)) return;
    if (!String(formPregunta.catalogo_tabla || "").trim()) {
      setCatalogoColumnas([]);
      setFiltroColumna("");
      setFormPregunta((prev) => (prev.catalogo_columna ? { ...prev, catalogo_columna: "" } : prev));
      return;
    }
    cargarColumnasCatalogo(formPregunta.catalogo_tabla || "");
  }, [
    formPregunta.tipo,
    formPregunta.catalogo_tabla,
    nuevaPregunta,
    editandoPregunta,
  ]);

  // Espeja las validaciones de guardarPregunta, pero sin efectos secundarios
  // (no llama a setError), para poder deshabilitar el botón "Guardar" mientras
  // el formulario no esté en un estado guardable.
  const puedeGuardarPregunta = useMemo(() => {
    const targetSeccionId = formPregunta.fp_fs_id ?? seccionSeleccionada;
    const requiereDescripcion = formPregunta.tipo !== TIPOS_PREGUNTA.FECHA_HORA_ACTUAL;
    const descripcionNormalizada = formPregunta.descripcion.trim();

    if ((requiereDescripcion && !descripcionNormalizada) || !targetSeccionId) {
      return false;
    }
    if (formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA && !String(formPregunta.catalogo_tabla || "").trim()) {
      return false;
    }
    if (formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA && !String(formPregunta.catalogo_columna || "").trim()) {
      return false;
    }
    if (formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA && !String(formPregunta.catalogo_pk_column || "").trim()) {
      return false;
    }
    if (formPregunta.tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA && !formPregunta.tipo_documento_id) {
      return false;
    }
    if (formPregunta.tipo === TIPOS_PREGUNTA.ARCHIVO && !formPregunta.tipo_documento_id) {
      return false;
    }
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.TABLA &&
      formPregunta.tabla_columnas.filter((c) => c.nombre.trim()).length === 0
    ) {
      return false;
    }
    if (
      TIPOS_SELECT_MULTISELECT.includes(formPregunta.tipo) &&
      (editandoPregunta
        ? opciones.filter((o) => o.fpo_estado).length === 0
        : opcionesNuevas.filter((v) => v.trim()).length === 0)
    ) {
      return false;
    }
    if (!formularioIdNumber) {
      return false;
    }
    return true;
  }, [formPregunta, seccionSeleccionada, formularioIdNumber, editandoPregunta, opciones, opcionesNuevas]);

  const textoOpcion = (o: Opcion | undefined) => (o?.fpo_valor || o?.op_descripcion || "").trim();

  // Opciones agregadas en esta edición: id temporal negativo hasta guardar.
  const cambiosOpciones = useMemo(() => {
    const originalesPorId = new Map(opcionesOriginales.map((o) => [o.fpo_id, o]));
    const idsActuales = new Set(opciones.map((o) => o.fpo_id));
    return {
      crear: opciones.filter((o) => o.fpo_id < 0).map(textoOpcion),
      renombrar: opciones
        .filter((o) => o.fpo_id > 0 && originalesPorId.has(o.fpo_id))
        .filter((o) => textoOpcion(o) !== textoOpcion(originalesPorId.get(o.fpo_id)))
        .map((o) => ({ fpo_id: o.fpo_id, fpo_valor: textoOpcion(o) })),
      eliminar: opcionesOriginales.filter((o) => !idsActuales.has(o.fpo_id)).map((o) => o.fpo_id),
    };
  }, [opciones, opcionesOriginales]);

  const hayCambiosOpcionesPendientes =
    !!editandoPregunta &&
    TIPOS_SELECT_MULTISELECT.includes(formPregunta.tipo) &&
    (cambiosOpciones.crear.length > 0 ||
      cambiosOpciones.renombrar.length > 0 ||
      cambiosOpciones.eliminar.length > 0);

  const estadoPendienteOpcion = (opcion: Opcion): "nueva" | "modificada" | null => {
    if (opcion.fpo_id < 0) return "nueva";
    const original = opcionesOriginales.find((o) => o.fpo_id === opcion.fpo_id);
    return original && textoOpcion(original) !== textoOpcion(opcion) ? "modificada" : null;
  };

  const guardarPregunta = () => {
    const targetSeccionId = formPregunta.fp_fs_id ?? seccionSeleccionada;
    const requiereDescripcion = formPregunta.tipo !== TIPOS_PREGUNTA.FECHA_HORA_ACTUAL;
    const descripcionNormalizada = formPregunta.descripcion.trim();

    if ((requiereDescripcion && !descripcionNormalizada) || !targetSeccionId) {
      setError(requiereDescripcion ? "Descripción y sección son requeridos" : "Sección es requerida");
      return;
    }

    if (formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA && !String(formPregunta.catalogo_tabla || "").trim()) {
      setError("Para 'Selección desde tabla' debes indicar la tabla");
      return;
    }
    if (formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA && !String(formPregunta.catalogo_columna || "").trim()) {
      setError("Para 'Selección desde tabla' debes indicar la columna a mostrar");
      return;
    }
    if (formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA && !String(formPregunta.catalogo_pk_column || "").trim()) {
      setError("Para 'Selección desde tabla' debes indicar la primary key (PK)");
      return;
    }
    if (formPregunta.tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA && !formPregunta.tipo_documento_id) {
      setError("Para 'Documentos desde tabla' debes seleccionar un tipo de documento");
      return;
    }
    if (formPregunta.tipo === TIPOS_PREGUNTA.ARCHIVO && !formPregunta.tipo_documento_id) {
      setError("Para 'Archivo / Documento' debes seleccionar un tipo de documento");
      return;
    }
    if (
      formPregunta.tipo === TIPOS_PREGUNTA.TABLA &&
      formPregunta.tabla_columnas.filter((c) => c.nombre.trim()).length === 0
    ) {
      setError("Para 'Pregunta tipo tabla' debes agregar al menos una columna");
      return;
    }
    if (
      TIPOS_SELECT_MULTISELECT.includes(formPregunta.tipo) &&
      (editandoPregunta
        ? opciones.filter((o) => o.fpo_estado).length === 0
        : opcionesNuevas.filter((v) => v.trim()).length === 0)
    ) {
      setError("Para preguntas de selección debes agregar al menos una opción de respuesta");
      return;
    }
    if (!formularioIdNumber) {
      setError("Primero debes crear o seleccionar un formulario válido.");
      return;
    }

    setMostrarConfirmarGuardarPregunta(true);
  };

  const confirmarGuardarPregunta = async () => {
    const targetSeccionId = formPregunta.fp_fs_id ?? seccionSeleccionada;
    const descripcionPersistida = formPregunta.descripcion.trim() || "Fecha y hora actual";

    setGuardandoPregunta(true);
    try {
      const preguntaEnEdicion = editandoPregunta ? preguntas.find((p) => p.fp_id === editandoPregunta) : null;
      const ordenActualEnSeccion = preguntas
        .filter((p) => p.fp_id !== editandoPregunta)
        .filter((p) => p.fp_fs_id === targetSeccionId)
        .map((p) => p.fp_orden);
      const nuevoOrden = ordenActualEnSeccion.length > 0 ? Math.max(...ordenActualEnSeccion) + 1 : 1;
      const conservarOrdenActual = !!preguntaEnEdicion && preguntaEnEdicion.fp_fs_id === targetSeccionId;
      const ordenFinal = conservarOrdenActual ? preguntaEnEdicion.fp_orden : nuevoOrden;

      const payload: any = {
        fp_descripcion: descripcionPersistida,
        fp_tipo: formPregunta.tipo,
        fp_estado: true,
        fp_requerida: TIPOS_SIN_REQUERIDA.includes(formPregunta.tipo) ? false : formPregunta.requerida,
        fp_orden: ordenFinal,
        fp_fs_id: targetSeccionId,
        frs_id: formularioIdNumber,
        fv_numero: version ? parseInt(version) : 1,
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
        fp_catalogo_columna_condicion:
          formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA
            ? String(formPregunta.catalogo_columna_condicion || "").trim() || null
            : null,
        fp_catalogo_valor_condicion:
          formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA
            ? String(formPregunta.catalogo_valor_condicion || "").trim() || null
            : null,
        fp_tdo_id: TIPOS_CATALOGO_DOCUMENTOS.includes(formPregunta.tipo) ? formPregunta.tipo_documento_id : null,
        fp_pregunta_padre_id: formPregunta.dependiente ? formPregunta.dependencia_pregunta_id : null,
        fp_valor_padre_disparador: formPregunta.dependiente
          ? String(formPregunta.dependencia_valor || "").trim() || null
          : null,
        fp_precarga_fuente: String(formPregunta.precarga_fuente || "").trim() || null,
        fp_precarga_campo_cliente: String(formPregunta.precarga_campo_cliente || "").trim() || null,
        fp_tabla_columnas:
          formPregunta.tipo === TIPOS_PREGUNTA.TABLA
            ? JSON.stringify(
                formPregunta.tabla_columnas
                  .map((c) => ({
                    nombre: c.nombre.trim(),
                    // Se preserva tal cual llegó (nunca se genera ni edita
                    // acá) — si se omite, se pierde en cada guardado y
                    // ClienteDatosNormalizadosService pierde su ancla
                    // estable para esta columna.
                    codigo: c.codigo,
                    tipo: c.tipo,
                    ...(c.tipo === "CATALOGO"
                      ? {
                          catalogo_tabla: c.catalogo_tabla || undefined,
                          catalogo_columna: c.catalogo_columna || undefined,
                          catalogo_pk_column: c.catalogo_pk_column || undefined,
                          catalogo_columna_padre: c.catalogo_columna_padre || undefined,
                          catalogo_columna_filtro: c.catalogo_columna_padre
                            ? c.catalogo_columna_filtro || undefined
                            : undefined,
                          catalogo_columna_condicion: c.catalogo_columna_condicion || undefined,
                          catalogo_valor_condicion: c.catalogo_valor_condicion || undefined,
                        }
                      : {}),
                    ...(c.tipo === "NUMERO" ? { minimo: c.minimo, maximo: c.maximo, suma_total: c.suma_total } : {}),
                  }))
                  .filter((c) => Boolean(c.nombre)),
              )
            : null,
        fp_ancho_columnas: formPregunta.ancho_columnas,
        fp_oculto_en_formulario: formPregunta.oculto_en_formulario,
        ...(formPregunta.tipo === TIPOS_PREGUNTA.SELECT_TABLA
          ? {
              fp_catalogo_filtro_columna: formPregunta.catalogo_filtro_dependiente
                ? String(formPregunta.catalogo_filtro_columna || "").trim() || null
                : null,
              fp_catalogo_filtro_pregunta_id: formPregunta.catalogo_filtro_dependiente
                ? formPregunta.catalogo_filtro_pregunta_id
                : null,
              fp_catalogo_filtro_reglas: formPregunta.catalogo_filtro_dependiente
                ? JSON.stringify(
                    formPregunta.catalogo_filtro_reglas
                      .map((r) => ({
                        valor: r.valor.trim(),
                        valor_filtro: r.valor_filtro.trim(),
                      }))
                      .filter((r) => Boolean(r.valor) && Boolean(r.valor_filtro)),
                  )
                : null,
            }
          : {}),
        ...(formPregunta.tipo === TIPOS_PREGUNTA.TABLA
          ? {
              fp_maximo:
                formPregunta.tabla_limite_modo === "FIJO" && formPregunta.tabla_limite_fijo.trim()
                  ? parseInt(formPregunta.tabla_limite_fijo, 10)
                  : null,
              fp_tabla_limite_modo: formPregunta.tabla_limite_modo,
              fp_tabla_limite_pregunta_id:
                formPregunta.tabla_limite_modo === "CONDICIONAL" ? formPregunta.tabla_limite_pregunta_id : null,
              fp_tabla_limite_reglas:
                formPregunta.tabla_limite_modo === "CONDICIONAL"
                  ? JSON.stringify(
                      formPregunta.tabla_limite_reglas
                        .map((r) => ({
                          valor: r.valor.trim(),
                          limite: r.limite.trim() ? parseInt(r.limite, 10) : null,
                        }))
                        .filter((r) => Boolean(r.valor)),
                    )
                  : null,
            }
          : {}),
        ...(formPregunta.tipo === TIPOS_PREGUNTA.ESPACIO_FIRMA
          ? {
              fp_maximo: formPregunta.espacio_lineas.trim() ? parseInt(formPregunta.espacio_lineas, 10) : 5,
            }
          : {}),
        ...(formPregunta.tipo === TIPOS_PREGUNTA.ARCHIVO
          ? {
              fp_maximo:
                formPregunta.archivo_maximo.trim() && parseInt(formPregunta.archivo_maximo, 10) > 1
                  ? parseInt(formPregunta.archivo_maximo, 10)
                  : null,
            }
          : {}),
      };

      if (formPregunta.tipo === TIPOS_PREGUNTA.SELECT) {
        payload.fp_subtipo = formPregunta.subtipo === "CHECK" ? "CHECK" : "LISTA";
      } else if (formPregunta.tipo === TIPOS_PREGUNTA.NUMERO || formPregunta.tipo === TIPOS_PREGUNTA.FECHA) {
        payload.fp_subtipo = formPregunta.subtipo || null;
      } else if (formPregunta.tipo === TIPOS_PREGUNTA.TEXTO) {
        payload.fp_subtipo = formPregunta.subtipo || null;
        payload.fp_patron = formPregunta.subtipo ? formPregunta.patron || null : null;
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

        // Las opciones van después de la pregunta: si fallan, el modal sigue
        // abierto con los cambios en memoria y "Guardar" se puede reintentar
        // (actualizar la pregunta otra vez no hace daño).
        let opcionesGuardadas: Opcion[] | null = null;
        if (hayCambiosOpcionesPendientes) {
          opcionesGuardadas = await formularioPreguntasService.aplicarCambiosOpciones(
            editandoPregunta,
            cambiosOpciones,
          );
        }

        // Textos de opción renombrados: el backend ya actualizó
        // fp_valor_padre_disparador de las dependientes; se refleja aquí.
        const renombres = new Map(
          cambiosOpciones.renombrar.map((r) => [
            textoOpcion(opcionesOriginales.find((o) => o.fpo_id === r.fpo_id)).toLowerCase(),
            r.fpo_valor,
          ]),
        );

        // Actualizar el estado local en lugar de recargar todo
        setPreguntas((prev) =>
          prev.map((p) => {
            if (p.fp_id === editandoPregunta) {
              return {
                ...p,
                ...payload,
                fp_descripcion: descripcionPersistida,
                ...(opcionesGuardadas ? { opciones: opcionesGuardadas } : {}),
                // El backend desactiva las opciones si la pregunta deja de
                // ser de un tipo con opciones.
                ...(TIPOS_CON_SINCRONIZACION_OPCIONES.includes(formPregunta.tipo) ? {} : { opciones: [] }),
              };
            }
            const valorNuevo =
              opcionesGuardadas && p.fp_pregunta_padre_id === editandoPregunta
                ? renombres.get((p.fp_valor_padre_disparador || "").trim().toLowerCase())
                : undefined;
            return valorNuevo ? { ...p, fp_valor_padre_disparador: valorNuevo } : p;
          }),
        );
        setSuccessMessage("editada");
      } else {
        const creada = await formularioPreguntasService.create(payload);

        const documentoSeleccionado = documentosCatalogo.find((doc) => doc.tdo_id === formPregunta.tipo_documento_id);
        const requiereFechaEmision = documentoSeleccionado?.tdo_vigencia_dias !== null;

        if (formPregunta.tipo === TIPOS_PREGUNTA.ARCHIVO && creada?.fp_id && requiereFechaEmision) {
          const payloadFechaDependiente: any = {
            fp_descripcion: `${descripcionPersistida} - Fecha de emisión`,
            fp_tipo: TIPOS_PREGUNTA.FECHA,
            fp_estado: true,
            fp_requerida: TIPOS_SIN_REQUERIDA.includes(formPregunta.tipo) ? false : formPregunta.requerida,
            fp_orden: nuevoOrden + 1,
            fp_fs_id: targetSeccionId,
            frs_id: formularioIdNumber,
            fv_numero: version ? parseInt(version) : 1,
            fp_pregunta_padre_id: creada.fp_id,
            fp_valor_padre_disparador: null,
          };
          await formularioPreguntasService.create(payloadFechaDependiente);
        }

        let opcionesCreadas: Opcion[] = [];
        if (creada?.fp_id && TIPOS_CON_SINCRONIZACION_OPCIONES.includes(formPregunta.tipo)) {
          await formularioPreguntasService.syncOpciones(creada.fp_id, opcionesNuevas);
          // syncOpciones no devuelve las opciones creadas — sin este fetch,
          // la pregunta quedaba en el estado local con el `creada` de antes
          // de sincronizar opciones (sin `opciones`), mostrando "Sin
          // opciones configuradas" en la lista hasta refrescar la página
          // aunque sí se hubieran guardado en el backend.
          opcionesCreadas = await formularioPreguntasService.getOpciones(creada.fp_id);
        }

        // Agregar la nueva pregunta al estado local
        if (creada) {
          setPreguntas((prev) => [...prev, { ...creada, opciones: opcionesCreadas }]);
          setSuccessMessage("creada");
        }
      }

      setFormPregunta(FORM_PREGUNTA_DEFAULT);
      setEditandoPregunta(null);
      setNuevaPregunta(false);
      setOpcionesNuevas([]);
      setOpciones([]);
      setOpcionesOriginales([]);
      setFiltroTabla("");
      setFiltroColumna("");
      setCatalogoColumnas([]);
      setMostrarConfirmarGuardarPregunta(false);
    } catch (error) {
      console.error("Error guardando pregunta:", error);
      setError(error instanceof Error ? error.message : "No se pudo guardar la pregunta");
      setMostrarConfirmarGuardarPregunta(false);
    } finally {
      setGuardandoPregunta(false);
    }
  };

  const iniciarEdicionPregunta = async (pregunta: Pregunta) => {
    const preguntaPadre = preguntas.find((p) => p.fp_id === pregunta.fp_pregunta_padre_id);
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
      patron: pregunta.fp_tipo === TIPOS_PREGUNTA.TEXTO ? (pregunta.fp_patron ?? "") : "",
      fp_fs_id: pregunta.fp_fs_id ?? null,
      requerida: Boolean(pregunta.fp_requerida),
      tipo_documento_id: pregunta.fp_tdo_id ?? null,
      catalogo_tabla: pregunta.fp_catalogo_tabla ?? "",
      catalogo_columna: pregunta.fp_catalogo_columna ?? "",
      catalogo_pk_column: pregunta.fp_catalogo_pk_column ?? "",
      catalogo_columna_condicion: pregunta.fp_catalogo_columna_condicion ?? "",
      catalogo_valor_condicion: pregunta.fp_catalogo_valor_condicion ?? "",
      dependiente: Boolean(pregunta.fp_pregunta_padre_id),
      dependencia_fp_fs_id: preguntaPadre?.fp_fs_id ?? null,
      dependencia_pregunta_id: pregunta.fp_pregunta_padre_id ?? null,
      dependencia_valor: pregunta.fp_valor_padre_disparador ?? "",
      precarga_fuente: pregunta.fp_precarga_fuente ?? "",
      precarga_campo_cliente: pregunta.fp_precarga_campo_cliente ?? "",
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
              codigo: col.codigo,
              tipo: col.tipo || "TEXTO",
              catalogo_tabla: col.catalogo_tabla,
              catalogo_columna: col.catalogo_columna,
              catalogo_pk_column: col.catalogo_pk_column,
              catalogo_columna_padre: col.catalogo_columna_padre,
              catalogo_columna_filtro: col.catalogo_columna_filtro,
              catalogo_columna_condicion: col.catalogo_columna_condicion,
              catalogo_valor_condicion: col.catalogo_valor_condicion,
              minimo: col.minimo,
              maximo: col.maximo,
              suma_total: col.suma_total,
            };
          });
        } catch {
          return [];
        }
      })(),
      ancho_columnas: (pregunta.fp_ancho_columnas === 2 || pregunta.fp_ancho_columnas === 3
        ? pregunta.fp_ancho_columnas
        : 1) as 1 | 2 | 3,
      oculto_en_formulario: Boolean(pregunta.fp_oculto_en_formulario),
      tabla_limite_modo: (pregunta.fp_tabla_limite_modo as "SIN_LIMITE" | "FIJO" | "CONDICIONAL") || "SIN_LIMITE",
      tabla_limite_fijo:
        pregunta.fp_tabla_limite_modo === "FIJO" && pregunta.fp_maximo != null ? String(pregunta.fp_maximo) : "",
      espacio_lineas:
        pregunta.fp_tipo === TIPOS_PREGUNTA.ESPACIO_FIRMA && pregunta.fp_maximo != null
          ? String(pregunta.fp_maximo)
          : "",
      archivo_maximo:
        pregunta.fp_tipo === TIPOS_PREGUNTA.ARCHIVO && pregunta.fp_maximo != null ? String(pregunta.fp_maximo) : "",
      tabla_limite_fp_fs_id: preguntas.find((p) => p.fp_id === pregunta.fp_tabla_limite_pregunta_id)?.fp_fs_id ?? null,
      tabla_limite_pregunta_id: pregunta.fp_tabla_limite_pregunta_id ?? null,
      tabla_limite_reglas: (() => {
        if (!pregunta.fp_tabla_limite_reglas) return [];
        try {
          const parsed = JSON.parse(pregunta.fp_tabla_limite_reglas);
          if (!Array.isArray(parsed)) return [];
          return parsed.map(
            (r: { valor?: string; limite?: number | null }): ReglaLimiteTabla => ({
              valor: String(r.valor ?? ""),
              limite: r.limite != null ? String(r.limite) : "",
            }),
          );
        } catch {
          return [];
        }
      })(),
      catalogo_filtro_dependiente: Boolean(pregunta.fp_catalogo_filtro_pregunta_id),
      catalogo_filtro_fp_fs_id:
        preguntas.find((p) => p.fp_id === pregunta.fp_catalogo_filtro_pregunta_id)?.fp_fs_id ?? null,
      catalogo_filtro_pregunta_id: pregunta.fp_catalogo_filtro_pregunta_id ?? null,
      catalogo_filtro_columna: pregunta.fp_catalogo_filtro_columna ?? "",
      catalogo_filtro_reglas: (() => {
        if (!pregunta.fp_catalogo_filtro_reglas) return [];
        try {
          const parsed = JSON.parse(pregunta.fp_catalogo_filtro_reglas);
          if (!Array.isArray(parsed)) return [];
          return parsed.map(
            (r: { valor?: string; valor_filtro?: string }): ReglaFiltroCatalogo => ({
              valor: String(r.valor ?? ""),
              valor_filtro: String(r.valor_filtro ?? ""),
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
    setFiltroTabla(pregunta.fp_catalogo_tabla ?? "");
    setFiltroColumna(pregunta.fp_catalogo_columna ?? "");
    setFiltroLlave(pregunta.fp_catalogo_pk_column ?? "");

    if (TIPOS_SELECT_MULTISELECT.includes(pregunta.fp_tipo) && Array.isArray(pregunta.opciones)) {
      // El listado de preguntas ya trae las opciones precargadas (endpoint
      // "completo" batched), asi que no hace falta otra llamada de red aqui.
      setOpciones(pregunta.opciones);
      setOpcionesOriginales(pregunta.opciones);
      setOpcionesNuevas(
        pregunta.opciones
          .map((item: Opcion) => item.fpo_valor || item.op_descripcion)
          .filter((item: string | undefined): item is string => Boolean(item?.trim())),
      );
    } else if (TIPOS_CON_SINCRONIZACION_OPCIONES.includes(pregunta.fp_tipo) && !readonly) {
      try {
        setLoading_opciones(true);
        const data = await formularioPreguntasService.getOpciones(pregunta.fp_id);
        setOpciones(data);
        setOpcionesOriginales(data);
        setOpcionesNuevas(
          data
            .map((item: Opcion) => item.fpo_valor || item.op_descripcion)
            .filter((item: string | undefined): item is string => Boolean(item?.trim())),
        );
      } catch (error) {
        console.error("❌ Error cargando opciones:", error);
      } finally {
        setLoading_opciones(false);
      }
    } else {
      setOpciones([]);
      setOpcionesOriginales([]);
      setOpcionesNuevas([]);
    }
  };

  const existeOpcionConTexto = (texto: string, excluirId?: number) =>
    opciones.some((o) => o.fpo_id !== excluirId && textoOpcion(o).toLowerCase() === texto.toLowerCase());

  const agregarOpcion = () => {
    const valor = nuevaOpcion.trim();
    if (!valor) {
      setError("Ingresa una opción válida");
      return;
    }
    if (!editandoPregunta) {
      setOpcionesNuevas((prev) => [...prev, valor]);
      setNuevaOpcion("");
      return;
    }
    if (existeOpcionConTexto(valor)) {
      setError(`Ya existe la opción "${valor}"`);
      return;
    }
    // Solo en memoria: se crea en la BD al dar "Guardar".
    const idTemporal = Math.min(0, ...opciones.map((o) => o.fpo_id)) - 1;
    setOpciones([...opciones, { fpo_id: idTemporal, fpo_valor: valor, fpo_estado: true }]);
    setNuevaOpcion("");
  };

  // Preguntas que se muestran/ocultan según que esta opción sea la respuesta
  // seleccionada en `editandoPregunta` (fp_pregunta_padre_id + fp_valor_padre_disparador).
  // Se compara con el texto guardado en la BD: un renombre aún sin guardar
  // no cambia fp_valor_padre_disparador de las dependientes.
  const obtenerPreguntasDependientesDeOpcion = (fpoId: number): Pregunta[] => {
    if (!editandoPregunta || fpoId < 0) return [];
    const valorOpcion = textoOpcion(opcionesOriginales.find((o) => o.fpo_id === fpoId)).toLowerCase();
    if (!valorOpcion) return [];
    return preguntas.filter(
      (p) =>
        p.fp_pregunta_padre_id === editandoPregunta &&
        (p.fp_valor_padre_disparador || "").trim().toLowerCase() === valorOpcion,
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

  // Solo en memoria. Al guardar, el backend renombra la opción (conserva
  // fpo_id y fpo_codigo) y actualiza el texto en las preguntas dependientes.
  const guardarEdicionOpcion = () => {
    if (!editandoPregunta || opcionEditandoId === null) return;
    const valorNuevo = opcionEditandoValor.trim();
    if (!valorNuevo) {
      setError("El valor de la opción no puede quedar vacío");
      return;
    }
    if (existeOpcionConTexto(valorNuevo, opcionEditandoId)) {
      setError(`Ya existe la opción "${valorNuevo}"`);
      return;
    }
    setOpciones(opciones.map((o) => (o.fpo_id === opcionEditandoId ? { ...o, fpo_valor: valorNuevo } : o)));
    setOpcionEditandoId(null);
    setOpcionEditandoValor("");
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
          )}" dependen de ella. Primero cambia o quita esa dependencia (interruptor "Mostrar solo según otra pregunta") y luego elimina la opción.`,
      );
      return;
    }
    // Una opción agregada en esta misma edición se quita sin preguntar.
    if (opcionId < 0) {
      setOpciones(opciones.filter((o) => o.fpo_id !== opcionId));
      return;
    }
    setOpcionAEliminar(opcionId);
  };

  // Solo en memoria: se desactiva en la BD (fpo_estado = false) al guardar.
  const confirmarEliminarOpcion = () => {
    if (!editandoPregunta || opcionAEliminar === null) return;
    const opcionId = opcionAEliminar;
    setOpcionAEliminar(null);
    setOpciones(opciones.filter((o) => o.fpo_id !== opcionId));
    if (opcionEditandoId === opcionId) cancelarEdicionOpcion();
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
        setOpcionesOriginales([]);
        setNuevaOpcion("");
      }
      // Actualizar el estado local en lugar de recargar todo
      setPreguntas((prev) => prev.filter((p) => p.fp_id !== preguntaId));
    } catch (error) {
      console.error("Error eliminando pregunta:", error);
      setError(error instanceof Error ? error.message : "Error al eliminar pregunta");
    }
  };

  // Mueve en pantalla y guarda el orden de toda la sección en una sola
  // transacción. Si falla, se vuelve al orden anterior (antes se mandaba un
  // PUT por pregunta en paralelo y un fallo dejaba la BD a medias).
  const aplicarOrdenSeccion = async (reordenadas: Pregunta[]) => {
    const fsId = reordenadas[0]?.fp_fs_id;
    if (!fsId) return;
    const ordenPorId = new Map(reordenadas.map((p, index) => [p.fp_id, index + 1]));
    const anteriores = preguntas;
    setPreguntas((prev) =>
      prev.map((p) => (ordenPorId.has(p.fp_id) ? { ...p, fp_orden: ordenPorId.get(p.fp_id)! } : p)),
    );
    try {
      await formularioPreguntasService.reordenar(
        fsId,
        reordenadas.map((p) => p.fp_id),
      );
    } catch (error) {
      console.error("Error guardando orden de preguntas:", error);
      setPreguntas(anteriores);
      setError(error instanceof Error ? error.message : "Error al guardar el orden de las preguntas");
    }
  };

  const handlePreguntaDragEnd = async (event: any) => {
    if (readonly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const lista = preguntasDeSeccion;
    const oldIndex = lista.findIndex((p) => `pregunta-${p.fp_id}` === active.id);
    const newIndex = lista.findIndex((p) => `pregunta-${p.fp_id}` === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    await aplicarOrdenSeccion(arrayMove(lista, oldIndex, newIndex));
  };

  const cambiarOrdenPregunta = async (preguntaId: number, direccion: "arriba" | "abajo") => {
    if (readonly) return;
    const index = preguntasDeSeccion.findIndex((p) => p.fp_id === preguntaId);
    if (
      index === -1 ||
      (direccion === "arriba" && index === 0) ||
      (direccion === "abajo" && index === preguntasDeSeccion.length - 1)
    ) {
      return;
    }
    const swapIndex = direccion === "arriba" ? index - 1 : index + 1;
    await aplicarOrdenSeccion(arrayMove(preguntasDeSeccion, index, swapIndex));
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
    hayCambiosOpcionesPendientes,
    estadoPendienteOpcion,
    setOpcionesNuevas,
    // Catálogo
    catalogoTablas,
    catalogoColumnas,
    loadingCatalogoTablas,
    loadingCatalogoColumnas,
    cargarTablasCatalogo,
    cargarColumnasCatalogo,
    documentosCatalogo,
    loadingDocumentosCatalogo,
    opcionesPreguntaPadre,
    loadingOpcionesPreguntaPadre,
    filtroTabla,
    setFiltroTabla,
    filtroColumna,
    setFiltroColumna,
    filtroLlave,
    setFiltroLlave,
    tablasFiltradas,
    columnasFiltradas,
    llaveFiltrada,
    // Error handling
    error,
    setError,
    // Funciones
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
    successMessage,
    setSuccessMessage,
  };
}
