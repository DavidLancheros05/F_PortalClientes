"use client";

//HOOKS
import { usePreguntasFormulario } from "@/hooks/usePreguntasFormulario";
import { usePrefillConfiguracion } from "@/hooks/usePrefillConfiguracion";
import { useClienteData } from "@/hooks/useClienteData";
import { useUltimaSolicitud } from "@/hooks/useUltimaSolicitud";
import { useSolicitudEdicion } from "@/hooks/useSolicitudEdicion";
import { useRespuestasFormulario } from "@/hooks/useRespuestasFormulario";

//Componentes
import { SeccionesSidebar } from "./components/SeccionesSidebar";
import { NavegacionSecciones } from "./components/NavegacionSecciones";
import { ResumenAvanceAcciones } from "./components/ResumenAvanceAcciones";
import { PreguntaRenderer } from "./components/PreguntaRenderer";
import type {
  DocumentoCatalogo,
  FormularioPregunta,
  SolicitudFormContentProps,
  Opcion,
  RespuestasState,
  Seccion,
  ValidationRule,
} from "./types";

import { useContext, useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { ErrorModal, LoadingModal } from "@/components/modals";
import { solicitudesService } from "@/services/solicitudes.service";
import {
  maestrosService,
  type Pais,
  type Departamento,
  type Ciudad,
} from "@/services/maestros/maestros.service";
import { TIPOS_PREGUNTA, type TipoPregunta } from "@/constants/tipos-pregunta";
import { ESTADO_SOLICITUD } from "@/constants/estado-solicitud";
import {
  calcularVigenciaDocumento,
  calcularEstadoAnioDocumento,
  getArchivoPreviewUrl as getArchivoPreviewUrlUtil,
} from "@/lib/documentos-vigencia.util";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";

export default function SolicitudFormContent({
  solicitudId,
  readOnly = false,
  returnTo,
}: SolicitudFormContentProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useContext(AuthContext);

  const [seccionSeleccionada, setSeccionSeleccionada] = useState<number | null>(
    null,
  );

  const [isSavingBorrador, setIsSavingBorrador] = useState(false);
  const [isSavingFinal, setIsSavingFinal] = useState(false);
  const [hasNewChanges, setHasNewChanges] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [archivosExistentes, setArchivosExistentes] = useState<
    Record<number, any>
  >({});
  const [documentosCatalogoMap, setDocumentosCatalogoMap] = useState<
    Record<number, DocumentoCatalogo>
  >({});
  const [estadoIdSolicitud, setEstadoIdSolicitud] = useState<number | null>(
    null,
  );
  const isGuardandoRef = useRef(false);
  const lastSavedResponses = useRef<any>({});

  // Estados para datos maestros
  const [paises, setPaises] = useState<Pais[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [formularioVersionObjetivo, setFormularioVersionObjetivo] = useState<
    number | null
  >(null);
  const {
    preguntas,
    paises: paisesFromHook,
    documentosCatalogoMap: documentosCatalogoMapFromHook,
    formulario,
    loading: loadingInitial,
  } = usePreguntasFormulario({
    solicitudId,
    formularioVersionObjetivo,
    setFormularioVersionObjetivo: (version) =>
      setFormularioVersionObjetivo(version),
  });
  const [numeroSolicitud, setNumeroSolicitud] = useState<string | null>(null);
  const { respuestas, setRespuestas, handleInputChange } =
    useRespuestasFormulario({
      preguntas,
    });
  // Obtener datos del cliente. Antes solo se pedía para solicitudes nuevas
  // (!solicitudId) porque el único consumidor era usePrefillConfiguracion,
  // que ya tiene su propio guard !solicitudId — ahora también lo necesita
  // el botón "Descargar plantilla" (DocumentoTablaField), que debe
  // funcionar tanto en una solicitud nueva como al editar una existente.
  const { clienteData: clienteDataRaw } = useClienteData({
    clienteId: user?.cliente_id,
    enabled: !!user?.cliente_id,
  });

  // IMPORTANTE: Memoizar clienteData para evitar loops infinitos
  const clienteData = useMemo(() => {
    // console.log(`[📦 useMemo] clienteData actualizado:`, Object.keys(clienteDataRaw || {}).length);
    return clienteDataRaw || {};
  }, [clienteDataRaw]);

  // Razón social/NIT para rellenar plantillas descargables (botón
  // "Descargar plantilla" en DocumentoTablaField).
  const clienteInfo = useMemo(
    () => ({
      nombre: (clienteData as any)?.cliente_razon_social || "",
      nit: (clienteData as any)?.cliente_nit_documento || "",
    }),
    [clienteData],
  );

  // Nombre/cédula del representante legal principal, tomados de la
  // pregunta tipo TABLA "REPRESENTANTE LEGAL PRINCIPAL Y SUPLENTES" ya
  // respondida en esta solicitud — mismo dato que se usa para rellenar
  // plantillas descargables.
  const representanteLegal = useMemo(() => {
    const preguntaRepLegal = preguntas.find(
      (p) =>
        p.fp_tipo === "TABLA" &&
        /representante legal/i.test(p.fp_descripcion || ""),
    );
    if (!preguntaRepLegal) return null;

    const valorTexto = respuestas[preguntaRepLegal.fp_id]?.valor_texto;
    if (!valorTexto) return null;

    try {
      const filas = JSON.parse(valorTexto);
      if (!Array.isArray(filas) || filas.length === 0) return null;
      const principal = filas[0] as Record<string, string>;
      const nombre =
        principal["Apellidos y Nombre"] || principal["Nombre"] || "";
      const identificacion =
        principal["Identificacion"] || principal["Identificación"] || "";
      if (!nombre && !identificacion) return null;
      return { nombre, identificacion };
    } catch {
      return null;
    }
  }, [preguntas, respuestas]);

  // Obtener última solicitud del cliente
  const {
    ultimaSolicitud,
    noTieneSolicitudes,
    tieneActividad,
    tieneBorrador,
    tienePendiente,
    tieneRevision,
    tieneCompletada,
    puedeCrearNueva,
  } = useUltimaSolicitud({
    clienteId: user?.cliente_id,
    enabled: !solicitudId && !!user?.cliente_id,
  });

  const tieneSolicitudesPrevias = ultimaSolicitud !== null;

  // IMPORTANTE: Memoizar respuestasUltima para evitar loops infinitos en usePrefillConfiguracion
  const respuestasUltima = useMemo(() => {
    return ultimaSolicitud?.respuestas || {};
  }, [ultimaSolicitud?.respuestas]);

  // Precarga basada en configuración de formulario
  const { respuestasPrecargadas } = usePrefillConfiguracion({
    preguntas,
    datosCliente: clienteData || {},
    respuestasUltimaFormulario: respuestasUltima,
    enabled: !solicitudId && preguntas.length > 0,
  });
  useEffect(() => {
    setPaises(Array.isArray(paisesFromHook) ? paisesFromHook : []);
  }, [paisesFromHook]);

  useEffect(() => {
    setDocumentosCatalogoMap(documentosCatalogoMapFromHook || {});
  }, [documentosCatalogoMapFromHook]);
  useEffect(() => {}, [seccionSeleccionada]);

  const { bloqueadoPorRechazoAuxiliar } = useSolicitudEdicion({
    solicitudId,
    preguntas,
    setNumeroSolicitud,
    setFormularioVersionObjetivo,
    setRespuestas,
    setArchivosExistentes,
    setErrorMessage,
    setEstadoId: setEstadoIdSolicitud,
  });

  const [fechaHoraActual, setFechaHoraActual] = useState<Date>(new Date());

  // Aplicar respuestas precargadas basadas en configuración
  useEffect(() => {
    const respuestasCount = respuestasPrecargadas
      ? Object.keys(respuestasPrecargadas).length
      : 0;
    // console.log(`[🔵 EFECTO] Precarga de respuestas - count=${respuestasCount}`);

    if (
      !respuestasPrecargadas ||
      Object.keys(respuestasPrecargadas).length === 0
    ) {
      // console.log(`[⚪ EFECTO] Sin respuestas precargadas`);
      return;
    }

    // console.log(`[✅ EFECTO] Aplicando ${respuestasCount} respuestas precargadas`);
    setRespuestas((prev) => {
      const merged = {
        ...respuestasPrecargadas,
        ...prev, // Preservar cambios manuales del usuario
      };
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respuestasPrecargadas]);

  // EFECTO: Pre-llenar tipo de solicitud basado en si el cliente tiene solicitudes previas
  useEffect(() => {
    // console.log(`[🟣 EFECTO TIPO SOLICITUD] Disparado:`, {
    //   solicitudId,
    //   preguntas: preguntas.length,
    //   ultimaSolicitud: ultimaSolicitud ? { sol_id: ultimaSolicitud.sol_id, sol_estado_id: ultimaSolicitud.sol_estado_id } : null,
    //   tieneSolicitudesPrevias,
    //   fechaDisparo: new Date().toISOString(),
    // });

    if (solicitudId) {
      // console.log(`[⚪ EFECTO] Saltando: estamos editando solicitud`);
      return;
    }

    const tipoSolicitudPregunta = preguntas.find(
      (p) => p.fp_codigo === "TIPO_SOLICITUD",
    );
    if (!tipoSolicitudPregunta) {
      console.log(`[⚠️ EFECTO] No encontrada pregunta 1171`);
      return;
    }

    const opciones = Array.isArray(tipoSolicitudPregunta.opciones)
      ? tipoSolicitudPregunta.opciones
      : [];

    const clienteNuevoOpcion = opciones.find((o) =>
      o.op_descripcion?.toLowerCase().includes("cliente nuevo"),
    );
    const ampliacionCupoOpcion = opciones.find(
      (o) =>
        o.op_descripcion?.toLowerCase().includes("ampliación") ||
        o.op_descripcion?.toLowerCase().includes("ampliacion"),
    );

    if (!clienteNuevoOpcion && !ampliacionCupoOpcion) {
      return;
    }

    // REGLA: Si tiene solicitudes previas → "Ampliación de cupo", sino → "Cliente Nuevo"
    const opcionAUsar = tieneSolicitudesPrevias
      ? ampliacionCupoOpcion
      : clienteNuevoOpcion;

    if (!opcionAUsar) {
      return;
    }

    console.log(`[✨ EFECTO] Preseleccionando:`, {
      tieneSolicitudesPrevias,
      opcion: opcionAUsar.op_descripcion,
      opcionId: opcionAUsar.op_id,
    });

    setRespuestas((prev) => {
      // SIEMPRE sobrescribir el tipo de solicitud cuando ultimaSolicitud cambia
      // (para cambiar de "Cliente Nuevo" a "Ampliación de cupo" cuando llega ultimaSolicitud)
      return {
        ...prev,
        1171: {
          ...prev[1171],
          valor_opcion_id: opcionAUsar.op_id,
        },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntas, ultimaSolicitud, solicitudId]);

  // EFECTO: Autocompletar con la fecha actual las preguntas tipo FECHA
  // marcadas con fp_subtipo = "ACTUAL" (solo al crear, no al editar una
  // solicitud existente, y solo si aún no tienen valor).
  useEffect(() => {
    if (solicitudId) return;

    const preguntasFechaActual = preguntas.filter(
      (p) => p.fp_tipo === "FECHA" && p.fp_subtipo === "ACTUAL",
    );
    if (preguntasFechaActual.length === 0) return;

    const hoy = new Date().toISOString().split("T")[0];

    setRespuestas((prev) => {
      const next = { ...prev };
      let cambio = false;
      preguntasFechaActual.forEach((p) => {
        if (!next[p.fp_id]?.valor_fecha) {
          next[p.fp_id] = { ...next[p.fp_id], valor_fecha: hoy };
          cambio = true;
        }
      });
      return cambio ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntas, solicitudId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setFechaHoraActual(new Date());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const fechaHoraActualFormateada = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(fechaHoraActual),
    [fechaHoraActual],
  );

  const getApiErrorMessage = (
    err: any,
    fallbackMessage: string,
    conflictMessage?: string,
  ) => {
    const status = err?.response?.status;
    if (status === 409) {
      const apiConflictMessage =
        err?.response?.data?.error || err?.response?.data?.message;
      if (typeof apiConflictMessage === "string" && apiConflictMessage.trim()) {
        if (apiConflictMessage.toLowerCase().includes("archivo activo")) {
          return "Ya hay un archivo cargado para este documento. Usa Reemplazar o Eliminar antes de subir otro.";
        }
        return apiConflictMessage;
      }

      return (
        conflictMessage ||
        "Ya hay un archivo cargado para este documento. Usa Reemplazar o Eliminar antes de subir otro."
      );
    }

    return (
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.response?.data?.details ||
      err?.message ||
      fallbackMessage
    );
  };

  const getArchivoPreviewUrl = (archivo: any): string | null =>
    getArchivoPreviewUrlUtil(archivo, solicitudId);

  // Agrupar preguntas por sección
  const secciones: Seccion[] = useMemo(() => {
    const seccionesMap = new Map<number, Seccion>();
    const preguntasSinSeccion: FormularioPregunta[] = [];

    preguntas.forEach((pregunta) => {
      if (pregunta.seccion_id) {
        if (!seccionesMap.has(pregunta.seccion_id)) {
          seccionesMap.set(pregunta.seccion_id, {
            seccion_id: pregunta.seccion_id,
            seccion_nombre:
              pregunta.seccion_nombre || `Sección ${pregunta.seccion_id}`,
            seccion_descripcion: pregunta.seccion_descripcion,
            seccion_orden: pregunta.seccion_orden || 999,
            preguntas: [],
          });
        }
        seccionesMap.get(pregunta.seccion_id)!.preguntas.push(pregunta);
      } else {
        preguntasSinSeccion.push(pregunta);
      }
    });

    return Array.from(seccionesMap.values()).sort(
      (a, b) => a.seccion_orden - b.seccion_orden,
    );
  }, [preguntas]);

  const seccionActual = seccionSeleccionada
    ? secciones.find((s) => s.seccion_id === seccionSeleccionada)
    : secciones[0];
  useEffect(() => {}, [seccionActual]);

  const normalizarTexto = (texto?: string | null) =>
    (texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

  const getOpcionDocumentoFija = (pregunta: FormularioPregunta) => {
    if (pregunta.fp_tipo !== TIPOS_PREGUNTA.DOCUMENTOS_TABLA) {
      return null;
    }

    const opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
    if (opciones.length === 0) {
      return null;
    }

    const documento = pregunta.fp_tipo_documento_id
      ? documentosCatalogoMap[pregunta.fp_tipo_documento_id]
      : null;

    if (!documento) {
      return opciones[0];
    }

    return (
      opciones.find(
        (opcion) =>
          normalizarTexto(opcion.op_descripcion) ===
          normalizarTexto(documento.tdo_nombre),
      ) || opciones[0]
    );
  };

  const getPreguntaFechaAsociada = (pregunta: FormularioPregunta) => {
    if (pregunta.fp_tipo !== TIPOS_PREGUNTA.DOCUMENTOS_TABLA) {
      return null;
    }
    // Buscar en TODAS las preguntas, no solo en la sección actual
    return (
      preguntas.find(
        (p) =>
          p.fp_tipo === "FECHA" && p.fp_pregunta_padre_id === pregunta.fp_id,
      ) || null
    );
  };

  const getNotaDisplay = (pregunta: FormularioPregunta) => {
    const bloques: string[] = [];

    if (pregunta.fp_descripcion?.trim()) {
      bloques.push(pregunta.fp_descripcion.trim());
    }

    if (pregunta.fp_descripcion_adicional?.trim()) {
      bloques.push(pregunta.fp_descripcion_adicional.trim());
    }

    const lineas = bloques
      .join("\n")
      .split("\n")
      .map((linea) => linea.trim())
      .filter(Boolean);

    // La mayoría de las notas reales son un solo párrafo largo, sin saltos
    // de línea (una sola "línea"). Si tratáramos esa única línea como
    // "título" (como se hacía antes), el texto completo quedaría en negrita
    // y sin justificar, y "cuerpo" quedaría vacío. Solo se separa
    // título/subtítulo cuando el autor de la pregunta realmente escribió
    // varias líneas.
    let titulo = "";
    let subtitulo = "";
    let cuerpo = "";

    if (lineas.length === 0) {
      titulo = "Nota";
    } else if (lineas.length === 1) {
      cuerpo = lineas[0];
    } else if (lineas.length === 2) {
      titulo = lineas[0];
      cuerpo = lineas[1];
    } else {
      titulo = lineas[0];
      subtitulo = lineas[1];
      cuerpo = lineas.slice(2).join("\n");
    }

    return { titulo, subtitulo, cuerpo };
  };

  const maestroPreguntaIds = useMemo(() => {
    const normalizar = (texto?: string | null) =>
      (texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

    const esPreguntaSeleccion = (pregunta: FormularioPregunta) =>
      [
        TIPOS_PREGUNTA.SELECT,
        TIPOS_PREGUNTA.SELECT_CONDICIONAL,
        TIPOS_PREGUNTA.SELECT_TABLA,
        TIPOS_PREGUNTA.DOCUMENTOS_TABLA,
      ].includes(pregunta.fp_tipo as any);

    const findByDescripcion = (patrones: RegExp[]) =>
      preguntas.find(
        (p) =>
          esPreguntaSeleccion(p) &&
          patrones.some((patron) => patron.test(normalizar(p.fp_descripcion))),
      )?.fp_id;

    const paisId = findByDescripcion([/\bpais\b/, /\bpais de residencia\b/]);
    const departamentoId = findByDescripcion([
      /\bdepartamento\b/,
      /\bestado\b/,
    ]);
    const ciudadId = findByDescripcion([/\bciudad\b/, /\bmunicipio\b/]);

    if (preguntas.length > 0) {
      const selectPreguntas = preguntas.filter(esPreguntaSeleccion);
      if (selectPreguntas.length === 0) {
        preguntas.slice(0, 10).forEach((p) => {});
      } else {
        selectPreguntas.forEach((p) => {});
      }
    }

    return {
      paisId,
      departamentoId,
      ciudadId,
    };
  }, [preguntas]);

  const indiceSeccionActual = secciones.findIndex(
    (s) => s.seccion_id === seccionSeleccionada,
  );
  const isFirstSection = indiceSeccionActual === 0;
  const isLastSection = indiceSeccionActual === secciones.length - 1;

  // Obtener reglas de validación para una pregunta
  const getValidationRules = (pregunta: FormularioPregunta): ValidationRule => {
    const rules: ValidationRule = {
      required: ![
        TIPOS_PREGUNTA.NOTA,
        TIPOS_PREGUNTA.FECHA_HORA_ACTUAL,
      ].includes(pregunta.fp_tipo as any)
        ? (pregunta.fp_requerida ?? false)
        : false,
    };

    if (pregunta.fp_tipo === "TEXTO") {
      if (pregunta.fp_minimo) rules.minLength = pregunta.fp_minimo;
      if (pregunta.fp_maximo) rules.maxLength = pregunta.fp_maximo;

      // Agregar validación de patrón si existe
      if (pregunta.fp_patron) {
        rules.custom = (value) => {
          if (value && pregunta.fp_patron) {
            const regex = new RegExp(pregunta.fp_patron);
            if (!regex.test(String(value))) {
              if (pregunta.fp_subtipo === "NOMBRE") {
                return "El nombre solo puede contener letras y espacios";
              } else if (pregunta.fp_subtipo === "EMAIL") {
                return "Ingrese un correo electrónico válido";
              } else if (pregunta.fp_subtipo === "TELEFONO") {
                return "Ingrese un número telefónico válido";
              } else if (pregunta.fp_subtipo === "CC") {
                return "El documento solo puede contener números (6-12 dígitos)";
              } else if (pregunta.fp_subtipo === "EDAD") {
                return "La edad debe tener 2 dígitos (ejemplo: 25, 05)";
              } else {
                return "El formato ingresado no es válido";
              }
            }
          }
          return null;
        };
      }
    }

    if (pregunta.fp_tipo === "NUMERO") {
      rules.type = "number";
      if (pregunta.fp_minimo !== undefined && pregunta.fp_minimo !== null) {
        rules.custom = (value) => {
          if (
            value !== undefined &&
            value !== null &&
            Number(value) < pregunta.fp_minimo!
          ) {
            return `El número debe ser mayor o igual a ${pregunta.fp_minimo}`;
          }
          return null;
        };
      }
      if (pregunta.fp_maximo !== undefined && pregunta.fp_maximo !== null) {
        const customMin = rules.custom;
        rules.custom = (value) => {
          if (customMin) {
            const minError = customMin(value);
            if (minError) return minError;
          }
          if (
            value !== undefined &&
            value !== null &&
            Number(value) > pregunta.fp_maximo!
          ) {
            return `El número debe ser menor o igual a ${pregunta.fp_maximo}`;
          }
          return null;
        };
      }
    }

    if (pregunta.fp_tipo === "FECHA") {
      rules.type = "date";
    }

    return rules;
  };

  // Validar campo individual
  const validateField = (fp_id: number, rules: ValidationRule) => {
    const value = respuestas[fp_id];
    let error: string | null = null;

    if (!value || (Object.values(value).every((v) => !v) && rules.required)) {
      error = "Este campo es obligatorio";
    }

    if (
      value !== undefined &&
      value !== null &&
      Object.values(value).some((v) => v)
    ) {
      if (rules.type === "number") {
        const numVal = value.valor_numero;
        if (isNaN(Number(numVal))) {
          error = "Ingrese un número válido";
        }
      }

      if (rules.type === "date") {
        const dateVal = value.valor_fecha;
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(String(dateVal))) {
          error = "Ingrese una fecha válida";
        }
      }

      if (
        rules.minLength &&
        String(value.valor_texto).length < rules.minLength
      ) {
        error = `Mínimo ${rules.minLength} caracteres`;
      }

      if (
        rules.maxLength &&
        String(value.valor_texto).length > rules.maxLength
      ) {
        error = `Máximo ${rules.maxLength} caracteres`;
      }

      if (rules.custom) {
        const valToCheck =
          value.valor_numero ?? value.valor_texto ?? value.valor_fecha;
        error = rules.custom(valToCheck);
      }
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [fp_id]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fp_id];
        return newErrors;
      });
    }
  };

  // Validar sección actual
  const validateCurrentSection = (): boolean => {
    if (!seccionActual) return true;

    const newErrors: Record<number, string> = {};
    let isValid = true;

    seccionActual.preguntas.forEach((pregunta) => {
      if (!shouldShowQuestionForCurrentUser(pregunta)) {
        return;
      }

      const rules = getValidationRules(pregunta);
      let currentValue: string | number | null | undefined | number[] = null;

      if (respuestas[pregunta.fp_id]?.valor_texto !== undefined)
        currentValue = respuestas[pregunta.fp_id].valor_texto;
      else if (respuestas[pregunta.fp_id]?.valor_numero !== undefined)
        currentValue = respuestas[pregunta.fp_id].valor_numero;
      else if (respuestas[pregunta.fp_id]?.valor_fecha !== undefined)
        currentValue = respuestas[pregunta.fp_id].valor_fecha;
      else if (respuestas[pregunta.fp_id]?.valor_opcion_id !== undefined)
        currentValue = respuestas[pregunta.fp_id].valor_opcion_id;

      if (
        rules.required &&
        pregunta.fp_tipo !== TIPOS_PREGUNTA.DOCUMENTOS_TABLA &&
        pregunta.fp_tipo !== TIPOS_PREGUNTA.ARCHIVO &&
        pregunta.fp_tipo !== TIPOS_PREGUNTA.IMAGEN &&
        (currentValue === undefined ||
          currentValue === null ||
          currentValue === "" ||
          (Array.isArray(currentValue) && currentValue.length === 0))
      ) {
        newErrors[pregunta.fp_id] = "Este campo es obligatorio";
        isValid = false;
      }

      if (
        (pregunta.fp_tipo === TIPOS_PREGUNTA.ARCHIVO ||
          pregunta.fp_tipo === TIPOS_PREGUNTA.IMAGEN) &&
        pregunta.fp_requerida
      ) {
        const tieneArchivoNuevo =
          respuestas[pregunta.fp_id]?.archivo instanceof File ||
          Boolean(respuestas[pregunta.fp_id]?.nombre_archivo?.trim());
        const tieneArchivoExistente = Boolean(
          archivosExistentes[pregunta.fp_id],
        );

        if (!tieneArchivoNuevo && !tieneArchivoExistente) {
          newErrors[pregunta.fp_id] = "Este campo es obligatorio";
          isValid = false;
        }
      }

      if (pregunta.fp_tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA) {
        const documento = pregunta.fp_tipo_documento_id
          ? documentosCatalogoMap[pregunta.fp_tipo_documento_id]
          : null;
        const requiereFecha = documento?.tdo_vigencia_dias != null;

        if (requiereFecha) {
          const preguntaFechaHija = preguntas.find(
            (p) =>
              p.fp_tipo === "FECHA" &&
              p.fp_pregunta_padre_id === pregunta.fp_id,
          );
          const fechaEmision =
            archivosExistentes[pregunta.fp_id]?.sd_fecha_emision ||
            (preguntaFechaHija
              ? respuestas[preguntaFechaHija.fp_id]?.valor_fecha
              : respuestas[pregunta.fp_id]?.valor_fecha);

          if (!fechaEmision) {
            newErrors[pregunta.fp_id] =
              "Debes indicar la fecha de emisión del documento";
            isValid = false;
          }
        }

        if (pregunta.fp_requerida) {
          const tieneArchivoNuevo =
            respuestas[pregunta.fp_id]?.archivo instanceof File;
          const tieneArchivoExistente = Boolean(
            archivosExistentes[pregunta.fp_id],
          );

          if (!tieneArchivoNuevo && !tieneArchivoExistente) {
            newErrors[pregunta.fp_id] = "Debes cargar el archivo del documento";
            isValid = false;
          }
        }
      }

      if (
        currentValue !== undefined &&
        currentValue !== null &&
        currentValue !== ""
      ) {
        if (rules.type === "number" && isNaN(Number(currentValue))) {
          newErrors[pregunta.fp_id] = "Ingrese un número válido";
          isValid = false;
        }

        if (rules.type === "date") {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(String(currentValue))) {
            newErrors[pregunta.fp_id] = "Ingrese una fecha válida";
            isValid = false;
          }
        }

        if (rules.minLength && String(currentValue).length < rules.minLength) {
          newErrors[pregunta.fp_id] = `Mínimo ${rules.minLength} caracteres`;
          isValid = false;
        }

        if (rules.maxLength && String(currentValue).length > rules.maxLength) {
          newErrors[pregunta.fp_id] = `Máximo ${rules.maxLength} caracteres`;
          isValid = false;
        }

        if (rules.custom) {
          const customError = rules.custom(currentValue);
          if (customError) {
            newErrors[pregunta.fp_id] = customError;
            isValid = false;
          }
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Cargar departamentos según país seleccionado
  useEffect(() => {
    if (maestroPreguntaIds.paisId == null) {
      setDepartamentos([]);
      return;
    }

    const paisPregunta = preguntas.find(
      (p) => p.fp_id === maestroPreguntaIds.paisId,
    );
    const paisRespuesta = respuestas[maestroPreguntaIds.paisId];
    const paisSeleccionado =
      paisPregunta?.fp_tipo === "SELECT_TABLA"
        ? paisRespuesta?.valor_numero
        : paisRespuesta?.valor_opcion_id;

    if (!paisSeleccionado) {
      setDepartamentos([]);
      return;
    }

    maestrosService
      .getDepartamentos(Number(paisSeleccionado))
      .then(setDepartamentos)
      .catch((err) => console.error("Error cargando departamentos:", err));
  }, [
    maestroPreguntaIds,
    preguntas,
    respuestas[maestroPreguntaIds.paisId ?? -1]?.valor_numero,
    respuestas[maestroPreguntaIds.paisId ?? -1]?.valor_opcion_id,
  ]);

  // Cargar ciudades cuando se selecciona un departamento
  useEffect(() => {
    if (maestroPreguntaIds.departamentoId == null) {
      setCiudades([]);
      return;
    }

    const deptoPregunta = preguntas.find(
      (p) => p.fp_id === maestroPreguntaIds.departamentoId,
    );
    const deptoRespuesta = respuestas[maestroPreguntaIds.departamentoId];
    const deptoSeleccionado =
      deptoPregunta?.fp_tipo === "SELECT_TABLA"
        ? deptoRespuesta?.valor_numero
        : deptoRespuesta?.valor_opcion_id;

    if (!deptoSeleccionado) {
      setCiudades([]);
      return;
    }

    maestrosService
      .getCiudades(Number(deptoSeleccionado))
      .then(setCiudades)
      .catch((err) => console.error("Error cargando ciudades:", err));
  }, [
    maestroPreguntaIds,
    preguntas,
    respuestas[maestroPreguntaIds.departamentoId ?? -1]?.valor_numero,
    respuestas[maestroPreguntaIds.departamentoId ?? -1]?.valor_opcion_id,
  ]);

  // Inicializar seccion seleccionada cuando carguen secciones
  useEffect(() => {
    if (secciones.length > 0 && seccionSeleccionada === null) {
      setSeccionSeleccionada(secciones[0].seccion_id);
    }
  }, [secciones]);

  useEffect(() => {
    setRespuestas((prev) => {
      let changed = false;
      const next: RespuestasState = { ...prev };

      preguntas.forEach((pregunta) => {
        if (pregunta.fp_tipo !== TIPOS_PREGUNTA.DOCUMENTOS_TABLA) {
          return;
        }

        const actual = next[pregunta.fp_id];
        if (
          actual?.valor_opcion_id !== undefined &&
          actual?.valor_opcion_id !== null
        ) {
          return;
        }

        const opcionFija = getOpcionDocumentoFija(pregunta);
        if (!opcionFija) {
          return;
        }

        next[pregunta.fp_id] = {
          ...actual,
          valor_opcion_id: opcionFija.op_id,
        };
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [preguntas]);

  // Determinar si una pregunta debe mostrarse (condiciones)
  const shouldShowQuestion = (pregunta: FormularioPregunta): boolean => {
    const normalize = (value: string | number | null | undefined) =>
      String(value ?? "")
        .trim()
        .toLowerCase();

    const visitados = new Set<number>();

    const check = (actual: FormularioPregunta): boolean => {
      const isFechaHijaDeArchivo =
        actual.fp_tipo === "FECHA" &&
        Boolean(actual.fp_pregunta_padre_id) &&
        preguntas.find((p) => p.fp_id === actual.fp_pregunta_padre_id)
          ?.fp_tipo === TIPOS_PREGUNTA.ARCHIVO;

      if (isFechaHijaDeArchivo) {
        const preguntaArchivo = preguntas.find(
          (p) => p.fp_id === actual.fp_pregunta_padre_id,
        );
        const documentoId = preguntaArchivo?.fp_tipo_documento_id;
        const requiereFechaPorVigencia = documentoId
          ? documentosCatalogoMap[documentoId]?.tdo_vigencia_dias !== null
          : true;

        if (!requiereFechaPorVigencia) {
          return false;
        }
      }

      // Si la pregunta no tiene pregunta padre, siempre se muestra
      if (!actual.fp_pregunta_padre_id) return true;

      if (visitados.has(actual.fp_id)) return false;
      visitados.add(actual.fp_id);

      // Buscar la pregunta padre
      const preguntaPadre = preguntas.find(
        (p) => p.fp_id === actual.fp_pregunta_padre_id,
      );
      if (!preguntaPadre) return false;

      // Si la pregunta padre no se muestra, la hija tampoco
      if (!check(preguntaPadre)) return false;

      // Obtener la respuesta de la pregunta padre
      const respuestaPadre = respuestas[actual.fp_pregunta_padre_id];
      if (!respuestaPadre) {
        const parentId = actual.fp_pregunta_padre_id;
        const parentHasExistingFile =
          preguntaPadre.fp_tipo === "ARCHIVO" &&
          Boolean(archivosExistentes[parentId]);

        if (!parentHasExistingFile) {
          return false;
        }

        return true;
      }

      const valorDisparador = normalize(actual.fp_valor_padre_disparador);
      if (!valorDisparador) return true;

      // Comparar el valor de la respuesta padre con el valor disparador
      if (respuestaPadre.valor_texto) {
        return normalize(respuestaPadre.valor_texto) === valorDisparador;
      }

      if (respuestaPadre.valor_numero !== undefined) {
        return normalize(respuestaPadre.valor_numero) === valorDisparador;
      }

      if (respuestaPadre.valor_fecha) {
        return normalize(respuestaPadre.valor_fecha) === valorDisparador;
      }

      if (respuestaPadre.valor_opcion_id !== undefined) {
        const ids = Array.isArray(respuestaPadre.valor_opcion_id)
          ? respuestaPadre.valor_opcion_id
          : [respuestaPadre.valor_opcion_id];

        const descripciones = ids
          .map((id) => {
            const opcion = preguntaPadre.opciones?.find(
              (o) => String(o.op_id) === String(id),
            );
            return opcion ? opcion.op_descripcion : id;
          })
          .map((value) => normalize(value));

        return descripciones.includes(valorDisparador);
      }

      return false;
    };

    return check(pregunta);
  };

  const isAnswered = (pregunta: FormularioPregunta): boolean => {
    if (pregunta.fp_tipo === TIPOS_PREGUNTA.NOTA) {
      return true;
    }

    if (pregunta.fp_tipo === TIPOS_PREGUNTA.FECHA_HORA_ACTUAL) {
      return true;
    }

    const respuesta = respuestas[pregunta.fp_id];
    const archivoRegistrado = Boolean(archivosExistentes[pregunta.fp_id]);

    if (!respuesta) {
      return [
        TIPOS_PREGUNTA.ARCHIVO,
        TIPOS_PREGUNTA.DOCUMENTOS_TABLA,
        TIPOS_PREGUNTA.IMAGEN,
      ].includes(pregunta.fp_tipo as any)
        ? archivoRegistrado
        : false;
    }

    if (pregunta.fp_tipo === "TEXTO") {
      return Boolean(respuesta.valor_texto?.trim());
    }

    if (pregunta.fp_tipo === "NUMERO") {
      return (
        respuesta.valor_numero !== undefined && respuesta.valor_numero !== null
      );
    }

    if (pregunta.fp_tipo === "FECHA") {
      return Boolean(respuesta.valor_fecha);
    }

    if (pregunta.fp_tipo === TIPOS_PREGUNTA.MULTISELECT) {
      return Array.isArray(respuesta.valor_opcion_id)
        ? respuesta.valor_opcion_id.length > 0
        : false;
    }

    if (
      pregunta.fp_tipo === TIPOS_PREGUNTA.ARCHIVO ||
      pregunta.fp_tipo === TIPOS_PREGUNTA.IMAGEN
    ) {
      return (
        respuesta.archivo instanceof File ||
        Boolean(respuesta.nombre_archivo?.trim()) ||
        archivoRegistrado
      );
    }

    if (pregunta.fp_tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA) {
      const valorOpcion = respuesta.valor_opcion_id as unknown;
      const tieneSeleccionDocumento =
        Boolean(pregunta.fp_tipo_documento_id) ||
        (typeof valorOpcion === "number" && !Number.isNaN(valorOpcion)) ||
        (typeof valorOpcion === "string" && valorOpcion.trim() !== "") ||
        (Array.isArray(valorOpcion) && valorOpcion.length > 0);

      const documento = pregunta.fp_tipo_documento_id
        ? documentosCatalogoMap[pregunta.fp_tipo_documento_id]
        : null;
      const requiereFecha =
        documento?.tdo_vigencia_dias != null ||
        documento?.tdo_regla_vigencia === "ANIO";

      // Buscar fecha en la pregunta hija, en la misma respuesta, o en archivo existente
      let fechaEmisionValor: string | undefined = respuesta.valor_fecha;

      if (!fechaEmisionValor && requiereFecha) {
        const preguntaFechaHija = preguntas.find(
          (p) =>
            p.fp_tipo === "FECHA" && p.fp_pregunta_padre_id === pregunta.fp_id,
        );
        if (preguntaFechaHija) {
          fechaEmisionValor = respuestas[preguntaFechaHija.fp_id]?.valor_fecha;
        }
      }

      // Si aún no hay fecha pero hay archivo existente con fecha, contar como respondido
      if (!fechaEmisionValor && requiereFecha && archivoRegistrado) {
        const archivoExistente = archivosExistentes[pregunta.fp_id];
        fechaEmisionValor = archivoExistente?.sd_fecha_emision;
      }

      const tieneFechaEmision = Boolean(fechaEmisionValor);

      const tieneArchivo =
        respuesta.archivo instanceof File ||
        Boolean(respuesta.nombre_archivo?.trim()) ||
        archivoRegistrado;

      // Si el documento exige año específico y es obligatorio, una fecha
      // fuera del rango permitido no cuenta como respondida (deja el
      // formulario incompleto en vez de mostrar un bloqueo aparte).
      if (
        pregunta.fp_requerida &&
        documento?.tdo_regla_vigencia === "ANIO" &&
        fechaEmisionValor
      ) {
        const estadoAnio = calcularEstadoAnioDocumento(
          fechaEmisionValor,
          documento.tdo_anios_atras_permitidos,
        );
        if (estadoAnio && !estadoAnio.valido) {
          return false;
        }
      }

      if (requiereFecha) {
        return tieneSeleccionDocumento && tieneFechaEmision && tieneArchivo;
      }

      return tieneSeleccionDocumento && tieneArchivo;
    }

    if (pregunta.fp_tipo === TIPOS_PREGUNTA.TABLA) {
      if (!respuesta.valor_texto) return false;
      try {
        const filas = JSON.parse(respuesta.valor_texto);
        if (!Array.isArray(filas)) return false;

        let nombresColumnas: string[] = [];
        try {
          const parsedColumnas = JSON.parse(pregunta.fp_tabla_columnas || "[]");
          nombresColumnas = Array.isArray(parsedColumnas)
            ? parsedColumnas
                .map((c: unknown) =>
                  typeof c === "string"
                    ? c
                    : (c as { nombre?: string })?.nombre,
                )
                .filter((n): n is string => typeof n === "string")
            : [];
        } catch {
          nombresColumnas = [];
        }
        if (nombresColumnas.length === 0 || filas.length === 0) return false;

        // Se considera respondida solo si TODAS las filas están completas
        // (todas sus columnas tienen valor); una fila a medias invalida la pregunta.
        return filas.every(
          (fila) =>
            fila &&
            typeof fila === "object" &&
            nombresColumnas.every(
              (columna) =>
                typeof fila[columna] === "string" &&
                fila[columna].trim() !== "",
            ),
        );
      } catch {
        return false;
      }
    }

    if (pregunta.fp_tipo === "SELECT_TABLA") {
      const valor = respuesta.valor_opcion_id ?? respuesta.valor_numero;
      if (typeof valor === "number") {
        return !Number.isNaN(valor) && valor !== null;
      }
      if (typeof valor === "string") {
        return valor.trim() !== "";
      }
      return false;
    }

    const valorOpcion = respuesta.valor_opcion_id as unknown;

    if (Array.isArray(valorOpcion)) {
      return valorOpcion.length > 0;
    }

    if (typeof valorOpcion === "number") {
      return !Number.isNaN(valorOpcion);
    }

    if (typeof valorOpcion === "string") {
      return valorOpcion.trim() !== "";
    }

    return false;
  };

  const isAdminUser =
    String(user?.rol?.nombre || "")
      .toUpperCase()
      .trim() === "ADMIN" ||
    String(user?.rol?.nombre || "")
      .toUpperCase()
      .trim() === "ADMINISTRACION" ||
    String(user?.rol?.nombre || "")
      .toUpperCase()
      .trim() === "ADMINISTRACIÓN";

  const isClienteUser =
    String(user?.rol?.nombre || "")
      .toUpperCase()
      .trim() === "CLIENTE";

  const getClienteIdForSolicitud = (): number => {
    if (typeof user?.cliente_id === "number" && user.cliente_id > 0) {
      return user.cliente_id;
    }
    return -1;
  };

  const hasValorEnRespuesta = (
    respuesta: RespuestasState[number] | undefined,
  ): boolean => {
    if (!respuesta) return false;

    if (
      typeof respuesta.valor_texto === "string" &&
      respuesta.valor_texto.trim() !== ""
    ) {
      return true;
    }

    if (
      (typeof respuesta.valor_numero === "number" ||
        typeof respuesta.valor_numero === "string") &&
      String(respuesta.valor_numero).trim() !== "" &&
      !Number.isNaN(Number(respuesta.valor_numero))
    ) {
      return true;
    }

    if (
      typeof respuesta.valor_fecha === "string" &&
      respuesta.valor_fecha.trim() !== ""
    ) {
      return true;
    }

    if (Array.isArray(respuesta.valor_opcion_id)) {
      return respuesta.valor_opcion_id.length > 0;
    }

    if (typeof respuesta.valor_opcion_id === "number") {
      return true;
    }

    if (respuesta.archivo instanceof File) {
      return true;
    }

    if (
      typeof respuesta.nombre_archivo === "string" &&
      respuesta.nombre_archivo.trim() !== ""
    ) {
      return true;
    }

    return false;
  };

  const shouldShowQuestionForCurrentUser = (
    pregunta: FormularioPregunta,
  ): boolean => {
    if (!shouldShowQuestion(pregunta)) {
      return false;
    }

    return true;
  };

  const seccionProgress = useMemo(() => {
    const progressMap = new Map<
      number,
      {
        required: number;
        answered: number;
        percent: number;
        visibleTotal: number;
        visibleAnswered: number;
        displayTotal: number;
        displayAnswered: number;
        displayPercent: number;
        usesRequired: boolean;
      }
    >();

    secciones.forEach((seccion) => {
      const visibles = seccion.preguntas.filter(
        shouldShowQuestionForCurrentUser,
      );
      const respondibles = visibles.filter(
        (p) =>
          ![TIPOS_PREGUNTA.NOTA, TIPOS_PREGUNTA.FECHA_HORA_ACTUAL].includes(
            p.fp_tipo as any,
          ),
      );
      const requeridas = respondibles.filter((p) => p.fp_requerida);
      const answered = requeridas.filter(isAnswered).length;
      const required = requeridas.length;
      const percent =
        required === 0 ? 100 : Math.round((answered / required) * 100);

      const visibleTotal = respondibles.length;
      const visibleAnswered = respondibles.filter(isAnswered).length;
      const usesRequired = required > 0;
      const displayTotal = usesRequired ? required : visibleTotal;
      const displayAnswered = usesRequired ? answered : visibleAnswered;
      const displayPercent =
        displayTotal === 0
          ? 100
          : Math.round((displayAnswered / displayTotal) * 100);

      progressMap.set(seccion.seccion_id, {
        required,
        answered,
        percent,
        visibleTotal,
        visibleAnswered,
        displayTotal,
        displayAnswered,
        displayPercent,
        usesRequired,
      });
    });

    return progressMap;
  }, [
    secciones,
    respuestas,
    archivosExistentes,
    documentosCatalogoMap,
    preguntas,
  ]);

  const overallProgress = useMemo(() => {
    let totalRequired = 0;
    let totalAnswered = 0;

    seccionProgress.forEach((value) => {
      totalRequired += value.required;
      totalAnswered += value.answered;
    });

    const percent =
      totalRequired === 0
        ? 100
        : Math.round((totalAnswered / totalRequired) * 100);

    return { totalRequired, totalAnswered, percent };
  }, [seccionProgress]);

  const overallDisplayProgress = useMemo(() => {
    let total = 0;
    let answered = 0;
    let usesRequired = false;

    seccionProgress.forEach((value) => {
      total += value.displayTotal;
      answered += value.displayAnswered;
      if (value.usesRequired) {
        usesRequired = true;
      }
    });

    const percent = total === 0 ? 100 : Math.round((answered / total) * 100);

    return { total, answered, percent, usesRequired };
  }, [seccionProgress]);

  // Determinar si mostrar el campo adicional condicional
  const shouldShowConditionalField = (
    pregunta: FormularioPregunta,
  ): boolean => {
    if (!pregunta.fp_opcion_disparadora || !pregunta.fp_descripcion_adicional) {
      return false;
    }

    const respuestaActual = respuestas[pregunta.fp_id];
    if (!respuestaActual?.valor_opcion_id) {
      return false;
    }

    // Obtener el opción seleccionada
    const opcionSeleccionada = pregunta.opciones?.find(
      (o) => String(o.op_id) === String(respuestaActual.valor_opcion_id),
    );

    return (
      opcionSeleccionada?.op_descripcion === pregunta.fp_opcion_disparadora
    );
  };

  const hasDraftData = useMemo(
    () =>
      Object.values(respuestas).some((respuesta) =>
        hasValorEnRespuesta(respuesta),
      ),
    [respuestas],
  );

  // Inicializar lastSavedResponses cuando se carguen las respuestas
  useEffect(() => {
    if (
      Object.keys(respuestas).length > 0 &&
      Object.keys(lastSavedResponses.current).length === 0
    ) {
      lastSavedResponses.current = JSON.parse(JSON.stringify(respuestas));
      setHasNewChanges(false);
    }
  }, [respuestas, loadingInitial]);

  // Detectar cambios nuevos desde el último guardado
  useEffect(() => {
    const respondAsChanged =
      JSON.stringify(respuestas) !== JSON.stringify(lastSavedResponses.current);
    setHasNewChanges(respondAsChanged);
  }, [respuestas]);

  const handleVolver = () => {
    if (returnTo && returnTo.startsWith("/")) {
      router.push(returnTo);
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/solicitudes/cliente");
  };

  const handleGuardar = async () => {
    // Evitar doble submit
    if (isGuardandoRef.current) {
      // console.log('⚠️ [FRONTEND] Guardando ya en progreso, ignorando clic adicional');
      return;
    }

    isGuardandoRef.current = true;

    // console.log('💾 [FRONTEND] handleGuardar iniciado', { solicitudId, respuestasCount: Object.keys(respuestas).length });

    // Log detallado de respuestas con documentos y fechas
    const respuestasConDocumentos = Object.entries(respuestas).filter(
      ([_, resp]: [string, any]) => resp?.nombre_archivo || resp?.valor_fecha,
    );
    // console.log('📋 [FRONTEND] Respuestas con documentos/fechas:', respuestasConDocumentos);

    // Log de estructura completa de respuestas para debug
    // console.log('📦 [FRONTEND] Estructura completa de respuestas:', JSON.stringify(respuestas, null, 2));

    // Validar última sección antes de guardar
    if (!validateCurrentSection()) {
      setErrorMessage(
        "Por favor, completa los campos requeridos en esta sección",
      );
      isGuardandoRef.current = false;
      return;
    }

    if (!user?.usr_id) {
      setErrorMessage("Error: No se encontró usuario autenticado");
      isGuardandoRef.current = false;
      return;
    }

    // Validar que solicitudId sea válido si estamos editando
    if (solicitudId && isNaN(solicitudId)) {
      setErrorMessage(
        "Error: ID de solicitud inválido. Por favor, intenta acceder de nuevo.",
      );
      isGuardandoRef.current = false;
      return;
    }

    if (overallDisplayProgress.percent < 100) {
      setErrorMessage(
        `El formulario no está 100% completado (${overallDisplayProgress.percent}%). Completa todos los campos requeridos.`,
      );
      isGuardandoRef.current = false;
      return;
    }

    // Validar documentos con vigencia: requieren archivo + fecha
    const documentosConVigencia = preguntas.filter(
      (p) =>
        p.fp_tipo === TIPOS_PREGUNTA.DOCUMENTOS_TABLA && p.fp_tipo_documento_id,
    );

    for (const doc of documentosConVigencia) {
      if (!doc.fp_tipo_documento_id) continue;

      const documento = documentosCatalogoMap?.[doc.fp_tipo_documento_id];
      const tieneVigencia =
        documento?.tdo_vigencia_dias && documento.tdo_vigencia_dias > 0;

      if (tieneVigencia) {
        // Verificar si hay archivo (existente o nuevo)
        const tieneArchivoExistente = !!archivosExistentes[doc.fp_id];
        const tieneArchivoNuevo = !!respuestas[doc.fp_id]?.archivo;
        const tieneArchivo = tieneArchivoExistente || tieneArchivoNuevo;

        // Verificar si hay fecha (en pregunta hija o en la misma respuesta)
        const preguntaFechaHija = preguntas.find(
          (p) => p.fp_tipo === "FECHA" && p.fp_pregunta_padre_id === doc.fp_id,
        );
        const tieneFecha = !!(
          archivosExistentes[doc.fp_id]?.sd_fecha_emision ||
          (preguntaFechaHija
            ? respuestas[preguntaFechaHija.fp_id]?.valor_fecha
            : respuestas[doc.fp_id]?.valor_fecha)
        );

        console.log(`✅ Validando documento ${doc.fp_id}:`, {
          nombre: documento?.tdo_descripcion,
          tieneArchivo,
          tieneFecha,
        });

        if (!tieneArchivo || !tieneFecha) {
          const mensajes: string[] = [];
          if (!tieneArchivo) mensajes.push("archivo");
          if (!tieneFecha) mensajes.push("fecha de emisión");
          setErrorMessage(
            `El documento "${documento?.tdo_descripcion || "RUT"}" requiere ${mensajes.join(" y ")}.`,
          );
          isGuardandoRef.current = false;
          return;
        }
      }
      // La regla de vigencia por año (tdo_regla_vigencia === "ANIO") ya no
      // bloquea aquí con un mensaje aparte: si el documento es obligatorio
      // y la fecha elegida no cae en el año permitido, isAnswered() lo
      // cuenta como "no respondido" y el gate genérico de
      // overallDisplayProgress.percent < 100 (arriba) ya impide guardar.
    }

    setIsSavingFinal(true);
    // console.log('📤 [FRONTEND] Llamando a guardarSolicitudCompleta...');

    // Si es cliente, pasar NULL como usuarioId. Si es admin/ejecutivo, pasar usr_id
    const usuarioId = isClienteUser ? null : user.usr_id;

    // console.log('📤 [FRONTEND] Datos:', {
    //   clienteId: getClienteIdForSolicitud(),
    //   usuarioId: usuarioId,
    //   isClienteUser: isClienteUser,
    //   user: user,
    // });
    try {
      const isReturningToAsc = returnTo?.includes("corregir-formulario-asc");
      const result = await solicitudesService.guardarSolicitudCompleta(
        solicitudId || null,
        respuestas,
        preguntas,
        getClienteIdForSolicitud(),
        usuarioId,
        isReturningToAsc ? { isCorrecionASC: true } : undefined,
      );

      const documentosDiferidosFaltantes =
        (result as any)?.documentosDiferidosFaltantes || [];

      if (documentosDiferidosFaltantes.length > 0) {
        const nombres = documentosDiferidosFaltantes
          .map((d: any) => d.tdo_nombre)
          .join(", ");
        setSuccessMessage(
          `Tu solicitud fue registrada. Aún faltan generar y subir: ${nombres}. Te llevamos a Mis Documentos para continuar.`,
        );
        setTimeout(() => {
          router.replace("/solicitudes/mis-documentos");
        }, 2500);
      } else {
        const redirectUrl = returnTo || "/solicitudes/cliente";
        setSuccessMessage(
          !solicitudId
            ? "Solicitud creada exitosamente. Redirigiendo..."
            : isReturningToAsc
              ? "Solicitud guardada exitosamente. Redirigiendo a solicitudes pendientes de corrección..."
              : "Solicitud guardada exitosamente. Redirigiendo a mis solicitudes...",
        );
        setTimeout(() => {
          router.replace(redirectUrl);
        }, 1200);
      }
    } catch (err) {
      console.error("Error completo:", err);
      const apiMessage = (err as any)?.response?.data?.message;

      if (
        typeof apiMessage === "string" &&
        apiMessage.includes("cliente_id inválido") &&
        !isAdminUser
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setErrorMessage(
          "Tu sesión quedó desactualizada. Por favor inicia sesión nuevamente.",
        );
        setTimeout(() => router.push("/login"), 1000);
        return;
      }

      if (
        typeof apiMessage === "string" &&
        apiMessage.includes("cliente_id inválido") &&
        isAdminUser
      ) {
        setErrorMessage(
          "No se pudo resolver el cliente para este usuario de administración. Verifica la asociación usuario-cliente en configuración.",
        );
        return;
      }

      const errorMsg = getApiErrorMessage(
        err,
        "Error al guardar la solicitud",
        "No se pudo guardar porque el archivo ya existe en el sistema. Sube una versión diferente para continuar.",
      );
      console.error("   Mensaje:", errorMsg);
      setErrorMessage(`Error: ${errorMsg}`);
    } finally {
      setIsSavingFinal(false);
      isGuardandoRef.current = false;
    }
  };

  const handleGuardarParcial = async () => {
    // Evitar doble submit
    if (isGuardandoRef.current) {
      // console.log('⚠️ [FRONTEND] Guardando ya en progreso, ignorando clic adicional');
      return;
    }

    isGuardandoRef.current = true;

    if (!user?.usr_id) {
      setErrorMessage("Error: No se encontró usuario autenticado");
      isGuardandoRef.current = false;
      return;
    }

    // Validar que solicitudId sea válido si estamos editando
    if (solicitudId && isNaN(solicitudId)) {
      setErrorMessage(
        "Error: ID de solicitud inválido. Por favor, intenta acceder de nuevo.",
      );
      isGuardandoRef.current = false;
      return;
    }

    setIsSavingBorrador(true);
    try {
      // Solo se reenvían las respuestas que cambiaron desde el último guardado
      // (no todo el formulario), para no reprocesar campos que no se tocaron.
      const respuestasCambiadas = Object.fromEntries(
        Object.entries(respuestas).filter(
          ([fp_id, respuesta]) =>
            JSON.stringify(respuesta) !==
            JSON.stringify(lastSavedResponses.current[fp_id]),
        ),
      );

      const result = await solicitudesService.guardarBorrador(
        solicitudId,
        respuestasCambiadas,
        preguntas,
        getClienteIdForSolicitud(),
        user.usr_id,
        hasValorEnRespuesta,
      );

      setSuccessMessage(
        solicitudId
          ? `Borrador actualizado con ${result.respuestasGuardadas} respuestas.`
          : `Borrador guardado con ${result.respuestasGuardadas} respuestas.`,
      );

      // Guardar el estado de respuestas y resetear el flag de cambios
      lastSavedResponses.current = JSON.parse(JSON.stringify(respuestas));
      setHasNewChanges(false);

      // Si la solicitud se acaba de crear (veníamos de /solicitudes/nueva sin
      // ID), pasamos a la URL /editar/{id}. Sin esto, el componente sigue
      // creyendo que no existe solicitud y cada "Guardar Borrador" posterior
      // crea una fila nueva en vez de actualizar la ya creada.
      if (!solicitudId && result.solicitudId) {
        const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
        router.replace(`/solicitudes/${result.solicitudId}/editar${query}`);
        return;
      }

      // Limpiar el mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (err) {
      console.error("Error completo:", err);
      const errorMsg = getApiErrorMessage(
        err,
        "Error al guardar el borrador",
        "No se pudo guardar el borrador porque el archivo ya existe en el sistema. Sube una versión diferente para continuar.",
      );
      console.error("   Mensaje:", errorMsg);
      setErrorMessage(`Error: ${errorMsg}`);
    } finally {
      setIsSavingBorrador(false);
      isGuardandoRef.current = false;
    }
  };

  const handleNavegar = (direccion: "siguiente" | "anterior") => {
    // Validar sección actual antes de navegar
    if (!readOnly && !validateCurrentSection()) {
      setErrorMessage(
        "Por favor, completa los campos requeridos en esta sección",
      );
      return;
    }

    setErrorMessage("");
    const indiceActual = secciones.findIndex(
      (s) => s.seccion_id === seccionSeleccionada,
    );
    const nuevoIndice =
      direccion === "siguiente" ? indiceActual + 1 : indiceActual - 1;

    if (nuevoIndice >= 0 && nuevoIndice < secciones.length) {
      console.log(
        `Navegando a sección: ${secciones[nuevoIndice].seccion_nombre}`,
      );
      setSeccionSeleccionada(secciones[nuevoIndice].seccion_id);
    }
  };

  // Restricción: Si hay solicitud activa (BORRADOR, PENDIENTE, REVISIÓN), mostrar mensaje
  if (!solicitudId && tieneActividad && !loadingInitial) {
    const estadoTexto = tieneBorrador
      ? "Borrador"
      : tienePendiente
        ? "Pendiente"
        : "Revisión";
    return (
      <div className="w-full h-[calc(100vh-5.8rem)] px-2 pt-1 pb-1 bg-gray-50 overflow-hidden">
        <div className="w-full h-full bg-white border border-gray-200 rounded-xl shadow p-4 flex flex-col items-center justify-center">
          <div className="max-w-md text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Solicitud en Proceso
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Actualmente tienes una solicitud en estado{" "}
              <span className="font-semibold">{estadoTexto}</span>
              {ultimaSolicitud && (
                <span> ({ultimaSolicitud.sol_numero_solicitud})</span>
              )}
              .
            </p>
            <p className="text-sm text-gray-600 mb-6">
              No puedes crear una nueva solicitud mientras exista una en estos
              estados. Por favor, espera a que se resuelva o cancela la
              solicitud existente.
            </p>
            <button
              onClick={handleVolver}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Solicitud rechazada por ASC: el formulario completo queda bloqueado,
  // solo se corrige desde /solicitudes/mis-documentos (el hook ya disparó
  // el redirect; esto evita el flash del formulario mientras navega).
  if (solicitudId && bloqueadoPorRechazoAuxiliar) {
    return (
      <div className="w-full h-[calc(100vh-5.8rem)] px-2 pt-1 pb-1 bg-gray-50 overflow-hidden">
        <div className="w-full h-full bg-white border border-gray-200 rounded-xl shadow p-4 flex flex-col items-center justify-center">
          <div className="max-w-md text-center">
            <AlertCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Corrige tus documentos
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Esta solicitud fue rechazada por documentos con fecha de emisión
              incorrecta. Ya no puedes editar el formulario completo; te estamos
              redirigiendo a &quot;Mis Documentos&quot; para corregirlos ahí.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // El formulario en sí (secciones/preguntas) es lo único que depende del
  // fetch inicial — el encabezado (título, botón Atrás) se renderiza de
  // inmediato con valores por defecto, y mientras falten datos solo el
  // cuerpo muestra un indicador de carga puntual (mismo patrón que
  // formulario-editor/page.tsx, ver FRONTEND/mejoras/LOADING_UX_AUDIT.md).
  const cargandoFormulario = loadingInitial || secciones.length === 0;

  return (
    <div className="w-full h-[calc(100vh-5.8rem)] px-2 pt-1 pb-1 bg-gray-50 overflow-hidden">
      <div className="w-full h-full bg-white border border-gray-200 rounded-xl shadow p-2 flex flex-col overflow-hidden">
        <div className="mb-1 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
          <div className="relative">
            <button
              type="button"
              onClick={handleVolver}
              className="absolute left-0 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100"
            >
              <ArrowLeft className="h-3 w-3" />
              Atrás
            </button>

            <div className="mx-auto w-full px-8 sm:px-12 text-center">
              <h2 className="text-lg font-bold tracking-tight text-gray-900 leading-tight truncate">
                {formulario?.frm_nombre?.trim() || "Formulario"}
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                {solicitudId
                  ? `${numeroSolicitud || `Solicitud #${solicitudId}`} • ${formulario?.frm_descripcion || "Completa el formulario por secciones"}`
                  : formulario?.frm_descripcion ||
                    "Completa el formulario por secciones"}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                Versión{" "}
                {Number(
                  formularioVersionObjetivo ??
                    formulario?.sol_formulario_version ??
                    formulario?.formulario_version ??
                    1,
                )}
              </p>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="mb-1 p-2 bg-green-50 border border-green-200 text-green-700 rounded text-sm flex items-center gap-2">
            <CheckCircle className="h-3 w-3" />
            {successMessage}
          </div>
        )}

        <ErrorModal
          isOpen={!!errorMessage}
          message={errorMessage}
          onAction={() => setErrorMessage("")}
        />

        <LoadingModal
          isOpen={isSavingBorrador}
          message="Guardando borrador..."
        />

        {cargandoFormulario ? (
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-sm font-semibold mb-1">
                Cargando formulario...
              </h2>
              <p className="text-xs text-gray-600 mb-2">
                {preguntas.length > 0
                  ? `Preparando ${secciones.length} sección(es) con ${preguntas.length} pregunta(s)...`
                  : "Obteniendo preguntas del servidor..."}
              </p>
              {preguntas.length > 0 && secciones.length === 0 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-left text-xs text-yellow-800 max-w-md mx-auto">
                  <p className="font-semibold mb-1">Debug Info:</p>
                  <p>Preguntas recibidas: {preguntas.length}</p>
                  <p>Secciones encontradas: {secciones.length}</p>
                  <p className="mt-1 text-yellow-700">
                    Las preguntas no están asignadas a secciones. Revisa la
                    consola del navegador para más detalles.
                  </p>
                </div>
              )}
              <div className="inline-block mt-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            </div>
          </div>
        ) : (
        <>
        <div className="flex-1 min-h-0 flex gap-2 overflow-hidden">
          <SeccionesSidebar
            secciones={secciones}
            seccionSeleccionada={seccionSeleccionada}
            setSeccionSeleccionada={setSeccionSeleccionada}
            isClienteUser={isClienteUser}
            shouldShowQuestionForCurrentUser={shouldShowQuestionForCurrentUser}
            seccionProgress={seccionProgress}
          />

          {/* PANEL DERECHO - CAMPOS */}
          <div className="w-[77%] flex h-full min-h-0">
            {seccionActual && (
              <div className="w-full h-full bg-white rounded-lg shadow p-3 flex flex-col">
                <div className="mb-2">
                  <h2 className="text-base font-bold">
                    {seccionActual.seccion_nombre}
                  </h2>
                  {seccionActual.seccion_descripcion && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {seccionActual.seccion_descripcion}
                    </p>
                  )}
                </div>

                {/* Preguntas */}
                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {seccionActual.preguntas
                      .filter(shouldShowQuestionForCurrentUser)
                      .map((pregunta) => (
                        <PreguntaRenderer
                          key={pregunta.fp_id}
                          pregunta={pregunta}
                          seccionPreguntas={seccionActual.preguntas}
                          preguntas={preguntas}
                          documentosCatalogoMap={documentosCatalogoMap}
                          respuestas={respuestas}
                          errors={errors}
                          readOnly={
                            readOnly || pregunta.fp_codigo === "TIPO_SOLICITUD"
                          }
                          solicitudId={solicitudId}
                          archivosExistentes={archivosExistentes}
                          maestroPreguntaIds={maestroPreguntaIds}
                          paises={paises}
                          departamentos={departamentos}
                          ciudades={ciudades}
                          fechaHoraActualFormateada={fechaHoraActualFormateada}
                          setRespuestas={setRespuestas}
                          setArchivosExistentes={setArchivosExistentes}
                          setSuccessMessage={setSuccessMessage}
                          setErrorMessage={setErrorMessage}
                          shouldShowQuestionForCurrentUser={
                            shouldShowQuestionForCurrentUser
                          }
                          shouldShowConditionalField={
                            shouldShowConditionalField
                          }
                          getValidationRules={getValidationRules}
                          validateField={validateField}
                          handleInputChange={handleInputChange}
                          getNotaDisplay={getNotaDisplay}
                          getArchivoPreviewUrl={getArchivoPreviewUrl}
                          getOpcionDocumentoFija={getOpcionDocumentoFija}
                          getPreguntaFechaAsociada={getPreguntaFechaAsociada}
                          calcularVigenciaDocumento={calcularVigenciaDocumento}
                          calcularEstadoAnioDocumento={
                            calcularEstadoAnioDocumento
                          }
                          representanteLegal={representanteLegal}
                          clienteInfo={clienteInfo}
                          numeroSolicitud={numeroSolicitud}
                        />
                      ))}
                  </div>
                </div>

                <NavegacionSecciones
                  isFirstSection={isFirstSection}
                  isLastSection={isLastSection}
                  readOnly={readOnly}
                  isSaving={isSavingBorrador}
                  isBlocked={isSavingBorrador || isSavingFinal}
                  hasDraftData={hasNewChanges}
                  estadoId={
                    solicitudId
                      ? (estadoIdSolicitud ?? ESTADO_SOLICITUD.BORRADOR.id)
                      : ESTADO_SOLICITUD.BORRADOR.id
                  }
                  onNavegar={handleNavegar}
                  onGuardarParcial={handleGuardarParcial}
                  returnTo={returnTo}
                />
              </div>
            )}
          </div>
        </div>
        <ResumenAvanceAcciones
          readOnly={readOnly}
          isSaving={isSavingFinal}
          isBlocked={isSavingBorrador || isSavingFinal}
          overallProgress={overallProgress}
          overallDisplayProgress={overallDisplayProgress}
          returnTo={returnTo}
          onGuardar={handleGuardar}
        />
        </>
        )}
      </div>
    </div>
  );
}
