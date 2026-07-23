"use client";

import { useForm } from "react-hook-form";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TipoDocumento,
  TipoDocumentoPayload,
} from "@/services/admin/parametrizacion/documentos.types";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { tiposVigenciaService } from "@/services/admin/parametrizacion/tipos-vigencia.service";
import { TipoVigencia } from "@/services/admin/parametrizacion/tipos-vigencia.types";
import {
  formularioPreguntasService,
  FormularioPregunta,
} from "@/services/parametrizacion/formulario-preguntas.service";
import { ConfirmModal } from "@/components/modals";
import PlantillaEditor, { PlantillaEditorHandle } from "./PlantillaEditor";
import RevisionesTable from "./RevisionesTable";
import {
  VARIABLES_FIJAS,
  REGEX_VARIABLE_PLANTILLA,
  construirEtiquetaVariable,
} from "@/lib/plantilla-variables.util";

interface Props {
  editItem?: TipoDocumento;
  onSaved: () => void;
  onCancel: () => void;
}

const TAMAÑOS_LETRA = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24];

export default function DocumentosForm({ editItem, onSaved, onCancel }: Props) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<TipoDocumentoPayload>({
    defaultValues: {
      nombre: "",
      descripcion: "",
      obligatorio: false,
      aplicaFechaEmision: false,
      vigenciaDias: undefined,
      reglaVigencia: "",
      aniosAtrasPermitidos: undefined,
      aplicaZonaFranca: false,
      estado: true,
      tienePlantilla: false,
      tipoPlantilla: "TEXTO",
      plantillaContenido: "",
      formatoCodigo: "",
      formatoCodigoSecundario: "",
      revision: "",
      paginasTotal: undefined,
    },
  });

  const aplicaFechaEmision = watch("aplicaFechaEmision");
  const reglaVigencia = watch("reglaVigencia");
  const tienePlantilla = watch("tienePlantilla");
  const tipoPlantilla = watch("tipoPlantilla");
  const plantillaContenidoWatch = watch("plantillaContenido") || "";
  const anioActual = new Date().getFullYear();

  const [tiposVigencia, setTiposVigencia] = useState<TipoVigencia[]>([]);

  useEffect(() => {
    tiposVigenciaService
      .getAll(true)
      .then(setTiposVigencia)
      .catch((err) => console.error("Error cargando tipos de vigencia:", err));
  }, []);

  // Preguntas del formulario activo, para el selector de variables de la
  // plantilla ("Insertar variable" -> {{pregunta_<fp_id>}}).
  const [preguntasFormulario, setPreguntasFormulario] = useState<
    FormularioPregunta[]
  >([]);
  const [seccionFiltro, setSeccionFiltro] = useState("");
  const [preguntaSeleccionada, setPreguntaSeleccionada] = useState("");
  const [preguntasError, setPreguntasError] = useState("");
  const [cargandoPreguntas, setCargandoPreguntas] = useState(false);
  const [columnaSeleccionada, setColumnaSeleccionada] = useState("");
  const [tamañoLetra, setTamañoLetra] = useState(String(TAMAÑOS_LETRA[0]));
  const plantillaEditorRef = useRef<PlantillaEditorHandle | null>(null);
  // El contenido ya no vive en un <input>/<textarea> real (ver
  // PlantillaEditor, que es un contentEditable con chips de variables) —
  // register() solo declara la regla de validación, el valor se sincroniza
  // a mano con setValue(..., { shouldValidate: true }) desde onChange. La
  // regla usa `validate` (no `required` fijo) porque tienePlantilla/
  // tipoPlantilla se leen del cierre de este render: con `required` fijo,
  // guardar CUALQUIER documento sin plantilla de texto (tienePlantilla
  // apagado, o tipoPlantilla="PDF_SOLICITUD" como F-P3-06, donde
  // plantillaContenido legítimamente viene null de la base) fallaba la
  // validación en silencio — el editor ni se muestra en esos casos, así
  // que no había forma de "completarlo" para que pasara.
  register("plantillaContenido", {
    validate: (value) =>
      !tienePlantilla || tipoPlantilla === "PDF_SOLICITUD" || !!value
        ? true
        : "Campo obligatorio cuando tiene plantilla descargable de tipo texto",
  });

  useEffect(() => {
    if (tienePlantilla && tipoPlantilla !== "PDF_SOLICITUD") {
      setCargandoPreguntas(true);
      setPreguntasError("");
      formularioPreguntasService
        .getFormularioActivo()
        .then(setPreguntasFormulario)
        .catch((err) => {
          console.error("Error cargando preguntas del formulario:", err);
          setPreguntasError(
            "No se pudieron cargar las secciones/preguntas del formulario activo. Recargá la página e intentá de nuevo.",
          );
        })
        .finally(() => setCargandoPreguntas(false));
    }
  }, [tienePlantilla, tipoPlantilla]);

  const secciones = useMemo(() => {
    const vistas = new Map<string, number>();
    for (const p of preguntasFormulario) {
      const nombre = p.seccion_nombre || "Sin sección";
      const orden = p.seccion_orden ?? 0;
      if (!vistas.has(nombre)) vistas.set(nombre, orden);
    }
    return Array.from(vistas.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([nombre]) => nombre);
  }, [preguntasFormulario]);

  const preguntasFiltradas = useMemo(() => {
    return preguntasFormulario.filter(
      (p) => !seccionFiltro || (p.seccion_nombre || "Sin sección") === seccionFiltro,
    );
  }, [preguntasFormulario, seccionFiltro]);

  const preguntaSeleccionadaObj = useMemo(
    () =>
      preguntasFormulario.find(
        (p) => String(p.fp_id) === preguntaSeleccionada,
      ) || null,
    [preguntasFormulario, preguntaSeleccionada],
  );

  const esPreguntaTabla = preguntaSeleccionadaObj?.fp_tipo === "TABLA";

  // Mismo parseo que TablaField.tsx (frontend) — columnas nuevas se
  // guardan como objetos {nombre, tipo, ...}, columnas antiguas como
  // strings planos.
  const columnasTabla = useMemo(() => {
    if (!esPreguntaTabla || !preguntaSeleccionadaObj?.fp_tabla_columnas)
      return [];
    try {
      const parsed = JSON.parse(preguntaSeleccionadaObj.fp_tabla_columnas);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((c) => (typeof c === "string" ? c : c?.nombre))
        .filter((c): c is string => typeof c === "string");
    } catch {
      return [];
    }
  }, [esPreguntaTabla, preguntaSeleccionadaObj]);

  // Traducción legible de TODAS las variables presentes en el texto — tanto
  // las fijas ({{cliente_nombre}}, etc.) como las de pregunta
  // ({{pregunta|<seccionId>|<descripcion>(|col:<columna>)?}}). El placeholder
  // técnico se mantiene tal cual en el contenido guardado (el ID de sección
  // es necesario para que el reemplazo no se rompa al crear una nueva
  // versión del formulario, ver comentario en
  // construirMapaRespuestasPregunta), pero acá mostramos el nombre legible
  // para poder revisar de un vistazo qué variables tiene la plantilla sin
  // leer el código crudo. Ordenadas por orden de aparición en el texto.
  // Sección de origen de cada pregunta del formulario activo, para poder
  // mostrarla junto al nombre de la pregunta en "Usadas en esta plantilla" —
  // mismo nivel de detalle para variables fijas y de pregunta.
  const seccionPorId = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of preguntasFormulario) {
      if (p.seccion_id != null && p.seccion_nombre) {
        mapa.set(String(p.seccion_id), p.seccion_nombre);
      }
    }
    return mapa;
  }, [preguntasFormulario]);

  // Nombre legible actual de cada pregunta con fp_codigo, para traducir
  // los placeholders {{pregunta|cod:...}} en los chips.
  const etiquetaPorCodigo = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of preguntasFormulario) {
      if (p.fp_codigo && !mapa.has(p.fp_codigo)) {
        const seccion = p.seccion_nombre || "";
        mapa.set(
          p.fp_codigo,
          seccion ? `${seccion} › ${p.fp_descripcion}` : p.fp_descripcion,
        );
      }
    }
    return mapa;
  }, [preguntasFormulario]);

  const etiquetaDeVariable = useCallback(
    (placeholder: string) =>
      construirEtiquetaVariable(placeholder, seccionPorId, etiquetaPorCodigo),
    [seccionPorId, etiquetaPorCodigo],
  );

  const variablesUsadas = useMemo(() => {
    const encontradas: { indice: number; etiqueta: string; placeholder: string }[] =
      [];

    const regex = new RegExp(REGEX_VARIABLE_PLANTILLA);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(plantillaContenidoWatch))) {
      encontradas.push({
        indice: match.index,
        etiqueta: etiquetaDeVariable(match[0]),
        placeholder: match[0],
      });
    }

    encontradas.sort((a, b) => a.indice - b.indice);

    const vistas = new Set<string>();
    const resultado: { etiqueta: string; placeholder: string }[] = [];
    for (const item of encontradas) {
      if (!vistas.has(item.etiqueta)) {
        vistas.add(item.etiqueta);
        resultado.push(item);
      }
    }
    return resultado;
  }, [plantillaContenidoWatch, etiquetaDeVariable]);

  const handlePlantillaChange = (valor: string) => {
    setValue("plantillaContenido", valor, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const insertarVariable = (placeholder: string) => {
    plantillaEditorRef.current?.insertarEnCursor(placeholder);
  };

  const aplicarNegrita = () => {
    plantillaEditorRef.current?.aplicarNegrita();
  };

  const aplicarTamaño = () => {
    plantillaEditorRef.current?.aplicarTamaño(Number(tamañoLetra));
  };

  const aplicarVineta = () => {
    plantillaEditorRef.current?.aplicarVineta();
  };

  useEffect(() => {
    if (editItem) {
      reset({
        nombre: editItem.nombre,
        descripcion: editItem.descripcion || "",
        obligatorio: editItem.obligatorio,
        aplicaFechaEmision: editItem.aplicaFechaEmision,
        vigenciaDias: editItem.vigenciaDias ?? undefined,
        reglaVigencia: editItem.reglaVigencia || "",
        aniosAtrasPermitidos: editItem.aniosAtrasPermitidos ?? undefined,
        aplicaZonaFranca: false,
        estado: editItem.estado,
        tienePlantilla: editItem.tienePlantilla ?? false,
        tipoPlantilla: editItem.tipoPlantilla ?? "TEXTO",
        plantillaContenido: editItem.plantillaContenido || "",
        formatoCodigo: editItem.formatoCodigo || "",
        formatoCodigoSecundario: editItem.formatoCodigoSecundario || "",
        revision: editItem.revision || "",
        paginasTotal: editItem.paginasTotal ?? undefined,
      });
    } else {
      reset({
        nombre: "",
        descripcion: "",
        obligatorio: false,
        aplicaFechaEmision: false,
        vigenciaDias: undefined,
        reglaVigencia: "",
        aniosAtrasPermitidos: undefined,
        aplicaZonaFranca: false,
        estado: true,
        tienePlantilla: false,
        tipoPlantilla: "TEXTO",
        plantillaContenido: "",
        formatoCodigo: "",
        formatoCodigoSecundario: "",
        revision: "",
        paginasTotal: undefined,
      });
    }
  }, [editItem, reset]);

  const onSubmit = async (data: TipoDocumentoPayload) => {
    try {
      const payload: TipoDocumentoPayload = {
        ...data,
        aplicaZonaFranca: false,
        reglaVigencia: data.aplicaFechaEmision
          ? data.reglaVigencia || undefined
          : undefined,
        vigenciaDias:
          data.aplicaFechaEmision && data.reglaVigencia === "DIAS"
            ? data.vigenciaDias
            : undefined,
        aniosAtrasPermitidos:
          data.aplicaFechaEmision && data.reglaVigencia === "ANIO"
            ? data.aniosAtrasPermitidos
            : undefined,
        tienePlantilla: data.tienePlantilla || false,
        tipoPlantilla: data.tienePlantilla
          ? data.tipoPlantilla || "TEXTO"
          : undefined,
        plantillaContenido:
          data.tienePlantilla && data.tipoPlantilla !== "PDF_SOLICITUD"
            ? data.plantillaContenido || undefined
            : undefined,
        formatoCodigo: data.tienePlantilla
          ? data.formatoCodigo || undefined
          : undefined,
        formatoCodigoSecundario: data.tienePlantilla
          ? data.formatoCodigoSecundario || undefined
          : undefined,
        revision: data.tienePlantilla
          ? data.revision || undefined
          : undefined,
        paginasTotal: data.tienePlantilla
          ? data.paginasTotal || undefined
          : undefined,
      };

      if (editItem?.tipoDocumentoId) {
        await documentosService.update(editItem.tipoDocumentoId, payload);
      } else {
        await documentosService.create(payload);
      }

      onSaved();
      reset();
    } catch (err) {
      console.error(err);
      setModalState({
        isOpen: true,
        title: "Error",
        message: "Error al guardar tipo de documento",
      });
    }
  };

  // Sin este segundo argumento, cuando la validación de react-hook-form
  // falla, handleSubmit no llama a nada: no hay error en consola, no hay
  // petición de red, no hay ningún indicio — el botón "Actualizar"/"Guardar"
  // parece no hacer nada. Antes pasaba justo esto con plantillaContenido
  // (ver PlantillaEditor.tsx): al no estar atado a un <input>/<textarea>
  // real, un error de validación podía quedar sin mostrarse en pantalla.
  const onInvalid = (erroresFormulario: typeof errors) => {
    const primerError = Object.values(erroresFormulario)[0];
    console.error("Formulario inválido:", erroresFormulario);
    setModalState({
      isOpen: true,
      title: "Revisá el formulario",
      message:
        (primerError as { message?: string })?.message ||
        "Hay campos incompletos o inválidos en el formulario.",
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Nombre del documento
          </label>
          <input
            type="text"
            {...register("nombre", { required: "Campo obligatorio" })}
            placeholder="Ej. Certificado de Cámara y Comercio"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {errors.nombre && (
            <p className="text-red-600 text-xs mt-1">{errors.nombre.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Descripcion del documento
          </label>
          <textarea
            rows={3}
            {...register("descripcion", {
              required: "Campo obligatorio",
              maxLength: {
                value: 500,
                message: "Maximo 500 caracteres",
              },
            })}
            placeholder="Ej. Documento que certifica existencia y representacion legal de la empresa."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {errors.descripcion && (
            <p className="text-red-600 text-xs mt-1">
              {errors.descripcion.message}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              {...register("aplicaFechaEmision")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              Aplica fecha de emisión / vencimiento
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Al adjuntar este documento, se solicitará la fecha y se validará
                su vigencia.
              </span>
            </span>
          </label>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-500">
          Si un documento debe ser obligatorio u opcional se define por
          pregunta en el editor de formularios (campo &quot;Requerida&quot;),
          no aquí — el mismo tipo de documento puede ser obligatorio en una
          pregunta y opcional en otra.
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              {...register("estado")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              Estado activo
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Inactiva el tipo cuando no deba usarse en nuevos formularios.
              </span>
            </span>
          </label>
        </div>

        {aplicaFechaEmision && (
          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-3">
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Regla de vigencia
            </label>

            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                <input
                  type="radio"
                  value=""
                  {...register("reglaVigencia")}
                  className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Sin regla especial
              </label>
              {tiposVigencia.map((tv) => (
                <label
                  key={tv.tipoVigenciaId}
                  className="flex cursor-pointer items-center gap-2 text-xs text-slate-700"
                >
                  <input
                    type="radio"
                    value={tv.codigo}
                    {...register("reglaVigencia")}
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {tv.nombre}
                </label>
              ))}
            </div>

            {reglaVigencia === "DIAS" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tiempo de validez (días)
                </label>
                <input
                  type="number"
                  min={1}
                  {...register("vigenciaDias", {
                    required: "Campo obligatorio para esta regla",
                    min: { value: 1, message: "Debe ser mayor a 0" },
                    valueAsNumber: true,
                  })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {errors.vigenciaDias && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.vigenciaDias.message}
                  </p>
                )}
              </div>
            )}

            {reglaVigencia === "ANIO" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Años hacia atrás permitidos
                </label>
                <input
                  type="number"
                  min={0}
                  {...register("aniosAtrasPermitidos", {
                    required: "Campo obligatorio para esta regla",
                    min: { value: 0, message: "Debe ser 0 o mayor" },
                    valueAsNumber: true,
                  })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {errors.aniosAtrasPermitidos && (
                  <p className="text-red-600 text-xs mt-1">
                    {errors.aniosAtrasPermitidos.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  Con 0, solo se acepta {anioActual}. Con 1, se acepta{" "}
                  {anioActual - 1} o {anioActual}.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <label className="flex cursor-pointer items-start gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              {...register("tienePlantilla")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>
              Tiene plantilla descargable
              <span className="mt-1 block text-xs font-normal text-slate-500">
                El cliente podrá descargar un PDF pre-llenado con datos de su
                solicitud, firmarlo, y volver a subirlo con el mismo control de
                carga de este documento.
              </span>
            </span>
          </label>

          {tienePlantilla && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Tipo de generación
              </label>
              <select
                {...register("tipoPlantilla")}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="TEXTO">Texto con placeholders</option>
                <option value="PDF_SOLICITUD">PDF de la solicitud completa</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                {tipoPlantilla === "PDF_SOLICITUD"
                  ? "El cliente descargará el PDF generado con todos los datos de su solicitud (el mismo que usa Ejecutivo de Negocios), lo firmará y lo volverá a subir aquí."
                  : "Se genera un PDF a partir del texto de abajo, reemplazando los placeholders con los datos de la solicitud."}
              </p>
            </div>
          )}

          {tienePlantilla && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 space-y-3">
              <p className="text-xs font-semibold text-slate-700">
                Encabezado de formato oficial
                {tipoPlantilla !== "PDF_SOLICITUD" && " (opcional)"}
              </p>
              <p className="text-xs text-slate-500">
                {tipoPlantilla === "PDF_SOLICITUD"
                  ? 'Código de FORMATO, código secundario y revisión que se muestran en el encabezado (logo, código, página y revisión) que llevan todas las páginas de este PDF.'
                  : 'Si completas "Páginas totales", el PDF se genera con una tabla de encabezado (logo, código de formato, página y revisión) en vez de la carta simple. Déjalo vacío para seguir usando la carta simple.'}
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Código de formato
                  </label>
                  <input
                    type="text"
                    {...register("formatoCodigo")}
                    placeholder="Ej. F-P3-06"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Código secundario
                  </label>
                  <input
                    type="text"
                    {...register("formatoCodigoSecundario")}
                    placeholder="Ej. B_F-P3-06"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Revisión
                  </label>
                  <input
                    type="text"
                    {...register("revision")}
                    placeholder="Ej. 01"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                {tipoPlantilla !== "PDF_SOLICITUD" && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Páginas totales
                    </label>
                    <input
                      type="number"
                      min={1}
                      {...register("paginasTotal", { valueAsNumber: true })}
                      placeholder="Ej. 3"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {tienePlantilla && (
            <RevisionesTable tipoDocumentoId={editItem?.tipoDocumentoId} />
          )}

          {tienePlantilla && tipoPlantilla !== "PDF_SOLICITUD" && (
            <div className="mt-3">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Contenido de la plantilla
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={aplicarNegrita}
                    title="Selecciona texto arriba y hacé clic acá para ponerlo en negrita"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Negrita
                  </button>
                  <select
                    value={tamañoLetra}
                    onChange={(e) => setTamañoLetra(e.target.value)}
                    title="Tamaño a aplicar con el botón Tamaño"
                    className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {TAMAÑOS_LETRA.map((t) => (
                      <option key={t} value={t}>
                        {t}pt
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={aplicarTamaño}
                    title="Selecciona texto arriba y hacé clic acá para aplicarle el tamaño elegido"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Tamaño
                  </button>
                  <button
                    type="button"
                    onClick={aplicarVineta}
                    title="Ubicá el cursor en una línea y hacé clic acá para agregarle una viñeta (•) al inicio"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    • Viñeta
                  </button>
                </div>
              </div>
              <PlantillaEditor
                ref={plantillaEditorRef}
                value={plantillaContenidoWatch}
                onChange={handlePlantillaChange}
                etiquetaDeVariable={etiquetaDeVariable}
                placeholder={
                  "Cordial Saludo:\n\n{{representante_legal_nombre}}, mayor de edad, identificado con cédula de ciudadanía {{representante_legal_cedula}}, en mi calidad de Representante Legal de la Sociedad {{cliente_nombre}}, con NIT {{cliente_nit}}, me permito manifestar que..."
                }
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Las variables se muestran como etiquetas de color — hacé clic
                en la × para quitar una puntual. Lo que ves acá (negrita,
                tamaño, viñetas) es igual a como se ve en el PDF descargado:
                seleccioná una frase y usá los botones de arriba, o ubicá el
                cursor en una línea y hacé clic en "• Viñeta" para marcarla
                como punto de lista.
              </p>
              {errors.plantillaContenido && (
                <p className="text-red-600 text-xs mt-1">
                  {errors.plantillaContenido.message}
                </p>
              )}

              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 space-y-3">
                <p className="text-xs font-semibold text-slate-700">
                  Insertar variable
                </p>
                <p className="text-[11px] text-slate-500">
                  Hacé clic primero en el texto de arriba, en el punto exacto
                  donde querés que aparezca la variable, y recién después
                  presioná "Insertar" — se inserta justo ahí, no al final ni
                  donde "tendría sentido".
                </p>

                {cargandoPreguntas && (
                  <p className="text-[11px] text-slate-500">
                    Cargando secciones y preguntas del formulario activo...
                  </p>
                )}
                {preguntasError && (
                  <p className="text-[11px] text-red-600">{preguntasError}</p>
                )}

                {variablesUsadas.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-slate-500">
                      Usadas en esta plantilla (clic para volver a insertar):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {variablesUsadas.map(({ etiqueta, placeholder }) => (
                        <button
                          key={etiqueta}
                          type="button"
                          onClick={() => insertarVariable(placeholder)}
                          title={placeholder}
                          className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                        >
                          {etiqueta}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Sección
                    </label>
                    <select
                      value={seccionFiltro}
                      onChange={(e) => {
                        setSeccionFiltro(e.target.value);
                        setPreguntaSeleccionada("");
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Todas las secciones</option>
                      {secciones.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 min-w-55">
                    <label className="mb-1 block text-[11px] font-medium text-slate-600">
                      Pregunta
                    </label>
                    <select
                      value={preguntaSeleccionada}
                      onChange={(e) => {
                        setPreguntaSeleccionada(e.target.value);
                        setColumnaSeleccionada("");
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Selecciona una pregunta...</option>
                      {preguntasFiltradas.map((p) => (
                        <option key={p.fp_id} value={p.fp_id}>
                          {p.fp_descripcion}
                          {p.fp_tipo === "TABLA" ? " (tabla)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {esPreguntaTabla && (
                    <div className="flex-1 min-w-55">
                      <label className="mb-1 block text-[11px] font-medium text-slate-600">
                        Columna (primera fila)
                      </label>
                      <select
                        value={columnaSeleccionada}
                        onChange={(e) => setColumnaSeleccionada(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Selecciona una columna...</option>
                        {columnasTabla.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={
                      !preguntaSeleccionadaObj ||
                      (esPreguntaTabla && !columnaSeleccionada)
                    }
                    onClick={() => {
                      if (!preguntaSeleccionadaObj) return;
                      // Ancla preferida: fp_codigo (estable ante renames y
                      // versiones nuevas). Fallback para preguntas sin
                      // código: sección+texto, el formato legado.
                      const base = preguntaSeleccionadaObj.fp_codigo
                        ? `cod:${preguntaSeleccionadaObj.fp_codigo}`
                        : `${preguntaSeleccionadaObj.seccion_id ?? 0}|${preguntaSeleccionadaObj.fp_descripcion}`;
                      insertarVariable(
                        esPreguntaTabla
                          ? `{{pregunta|${base}|col:${columnaSeleccionada}}}`
                          : `{{pregunta|${base}}}`,
                      );
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Insertar
                  </button>
                </div>
                {esPreguntaTabla && (
                  <p className="text-[11px] text-amber-700">
                    Es una pregunta tipo tabla: la variable toma el valor de
                    esa columna en la primera fila registrada (el mismo
                    criterio que usan hoy las variables de representante
                    legal).
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  Al generar el documento, la variable se reemplaza por la
                  respuesta real de esa pregunta en la solicitud del cliente.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
        >
          {editItem ? "Actualizar" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            onCancel();
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>

      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        confirmText="Aceptar"
        isDangerous={true}
        onConfirm={() => setModalState({ ...modalState, isOpen: false })}
        onCancel={() => setModalState({ ...modalState, isOpen: false })}
      />
    </form>
  );
}
