import { useEffect, useRef, useState } from "react";
import { formularioPreguntasService } from "@/services/parametrizacion/formulario-preguntas.service";
import { maestrosService } from "@/services/maestros/maestros.service";
import { formularioSeccionesService } from "@/services/parametrizacion/formulario-secciones.service";
import { documentosService } from "@/services/admin/parametrizacion/documentos.service";
import { formulariosService } from "@/services/parametrizacion/formularios.service";
import type {
  FormularioPreguntaResponse,
  FormularioPreguntaOpcion,
} from "@/types/api.types";

// Aliases para compatibilidad
export type FormularioPregunta = FormularioPreguntaResponse;
export type Opcion = FormularioPreguntaOpcion;

export interface DocumentoCatalogo {
  tdo_id: number;
  tdo_nombre: string;
  tdo_descripcion?: string | null;
  tdo_vigencia_dias: number | null;
  tdo_permite_vencimiento?: boolean | null;
  tdo_regla_vigencia?: "DIAS" | "ANIO" | null;
  tdo_anios_atras_permitidos?: number | null;
  tdo_tiene_plantilla?: boolean;
  tdo_plantilla_contenido?: string | null;
  tdo_tipo_plantilla?: "TEXTO" | "PDF_SOLICITUD";
  tdo_formato_codigo?: string | null;
  tdo_formato_codigo_secundario?: string | null;
  tdo_revision?: string | null;
  tdo_paginas_total?: number | null;
}

interface UsePreguntasFormularioProps {
  solicitudId?: number;
  formularioVersionObjetivo: number | null;
  setFormularioVersionObjetivo: (v: number) => void;
}

export function usePreguntasFormulario({
  solicitudId,
  formularioVersionObjetivo,
  setFormularioVersionObjetivo,
}: UsePreguntasFormularioProps) {
  const [preguntas, setPreguntas] = useState<FormularioPregunta[]>([]);
  const [paises, setPaises] = useState<any[]>([]);
  const [documentosCatalogoMap, setDocumentosCatalogoMap] = useState<
    Record<number, DocumentoCatalogo>
  >({});
  const [formulario, setFormulario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const cargaInicialListaHecha = useRef(false);
  const requestIdRef = useRef(0);

  // =========================
  // Helpers (internos del hook)
  // =========================

  const cargarOpcionesCatalogoTabla = async (
    pregunta: FormularioPregunta,
  ): Promise<Opcion[]> => {
    if (!pregunta.fp_catalogo_tabla) {
      return Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
    }
    try {
      return await maestrosService.getCatalogo(
        pregunta.fp_catalogo_tabla,
        pregunta.fp_catalogo_base_datos,
        pregunta.fp_catalogo_columna,
        pregunta.fp_catalogo_pk_column,
      );
    } catch (error) {
      console.error(
        `Error cargando catálogo externo para pregunta ${pregunta.fp_id}:`,
        error,
      );
      return [];
    }
  };

  const cargarOpcionesDocumentosTabla = async (
    fp_id: number,
  ): Promise<Opcion[]> => {
    try {
      const response = await formularioPreguntasService.getOpciones(fp_id);
      return Array.isArray(response)
        ? response.map((opt: any) => ({
            op_id: opt.fpo_id || opt.op_id,
            op_descripcion: opt.fpo_valor || opt.op_descripcion,
          }))
        : [];
    } catch (error) {
      console.error(`Error cargando opciones para pregunta ${fp_id}:`, error);
      return [];
    }
  };

  // =========================
  // Carga principal
  // =========================
  useEffect(() => {
    // Al crear una solicitud nueva (!solicitudId), este efecto calcula la
    // versión objetivo y la guarda con setFormularioVersionObjetivo, lo cual
    // dispara este mismo efecto de nuevo (está en el arreglo de dependencias)
    // y duplica todas las peticiones. Como para "nueva solicitud" la versión
    // no vuelve a cambiar por fuera, evitamos recargar una segunda vez.
    if (!solicitudId && cargaInicialListaHecha.current) {
      return;
    }

    // Al editar una solicitud existente, la versión objetivo la resuelve
    // useSolicitudEdicion consultando la solicitud (llega un instante
    // después del primer render). Si dispararamos la carga antes de
    // conocerla, traeríamos preguntas de TODAS las versiones mezcladas y
    // luego, en cuanto llegara la versión real, tendríamos que repetir toda
    // la carga ya filtrada — duplicando la petición y el mensaje de carga
    // en pantalla. Mejor esperar a que la versión esté resuelta.
    if (solicitudId && formularioVersionObjetivo == null) {
      return;
    }

    // Evitar condición de carrera: si este efecto vuelve a ejecutarse antes
    // de que la petición anterior resuelva (p.ej. al llegar formularioVersionObjetivo
    // después del primer render), descartamos la respuesta obsoleta para que no
    // sobrescriba con datos de todas las versiones la lista ya filtrada correctamente.
    const currentRequestId = ++requestIdRef.current;

    setLoading(true);

    Promise.all([
      formularioPreguntasService.getAll(),
      maestrosService.getPaises(),
      formulariosService.getFormularioActivo(),
      documentosService.getAll().catch(() => []),
      formularioSeccionesService.getAll().catch(() => []),
    ])
      .then(async ([data, paisesData, formularioData, documentosData, seccionesData]) => {
        const seccionesMap: Record<number, { seccion_nombre: string; seccion_descripcion: string | null; seccion_orden: number }> = {};
        (seccionesData as any[]).forEach((s) => {
          if (s.seccion_id != null) {
            seccionesMap[s.seccion_id] = {
              seccion_nombre: s.seccion_nombre ?? `Sección ${s.seccion_id}`,
              seccion_descripcion: s.seccion_descripcion ?? null,
              seccion_orden: s.seccion_orden ?? 999,
            };
          }
        });

        // Última versión que existe entre las preguntas (puede incluir
        // borradores de versión aún no publicados) — se usa solo como
        // último recurso si no se puede resolver la versión activa oficial.
        const versionsAvailable = (data as FormularioPregunta[])
          .map((p) => Number(p.fp_version ?? 1))
          .filter((v, i, arr) => arr.indexOf(v) === i); // valores únicos
        const latestVersion = Math.max(...versionsAvailable, 1);

        // Versión activa oficial (formularios.frm_version_activa, la misma
        // que el backend usa en solicitudes.service.ts al crear la
        // solicitud). Antes se usaba `latestVersion` acá, que es la versión
        // MÁS ALTA que exista entre las preguntas aunque no esté publicada
        // — si alguien deja un borrador de una versión nueva a medio armar
        // (ej. v10) sin activarla, el cliente terminaba diligenciando y
        // guardando contra esa v10, mientras el backend etiquetaba la
        // solicitud con la v9 activa. Al reabrir para editar, la pantalla
        // vuelve a cargar preguntas de la v9 (la que quedó en
        // sol_formulario_version) y ningún fp_id de lo ya guardado
        // coincide, así que el formulario se ve completamente vacío pese a
        // que las respuestas sí están en la base de datos.
        const versionActivaOficial = Number(
          (formularioData as any)?.formulario_version ?? NaN,
        );

        const versionObjetivo = solicitudId
          ? formularioVersionObjetivo
          : Number.isFinite(versionActivaOficial)
            ? versionActivaOficial
            : latestVersion;

        if (!solicitudId && versionObjetivo) {
          setFormularioVersionObjetivo(versionObjetivo);
        }

        const activas = (data as FormularioPregunta[])
          .filter(
            (p) =>
              p.fp_estado &&
              !p.fp_oculto_en_formulario &&
              !p.seccion_oculta_en_formulario &&
              (versionObjetivo
                ? Number(p.fp_version ?? 1) === Number(versionObjetivo)
                : true),
          )
          .map((p) => {
            const sec = p.seccion_id != null ? seccionesMap[p.seccion_id] : null;
            if (!sec) return p;
            return {
              ...p,
              seccion_nombre: p.seccion_nombre || sec.seccion_nombre,
              seccion_descripcion: p.seccion_descripcion ?? sec.seccion_descripcion,
              seccion_orden: p.seccion_orden ?? sec.seccion_orden,
            };
          })
          .sort((a, b) => a.fp_orden - b.fp_orden);

        // 🔥 cargar catálogos dinámicos
        const activasConCatalogo = await Promise.all(
          activas.map(async (pregunta) => {
            if (
              !["SELECT_TABLA", "DOCUMENTOS_TABLA"].includes(pregunta.fp_tipo)
            ) {
              return pregunta;
            }

            try {
              const opciones =
                pregunta.fp_tipo === "DOCUMENTOS_TABLA"
                  ? await cargarOpcionesDocumentosTabla(pregunta.fp_id)
                  : await cargarOpcionesCatalogoTabla(pregunta);

              return { ...pregunta, opciones };
            } catch {
              return { ...pregunta, opciones: [] };
            }
          }),
        );

        // map documentos - normalizar nombres de propiedades
        const documentosMap: Record<number, DocumentoCatalogo> = {};
        (documentosData || []).forEach((item: any) => {
          // Normalizar: el servicio retorna tipoDocumentoId, pero esperamos tdo_id
          const id = item?.tdo_id ?? item?.tipoDocumentoId;
          if (id) {
            documentosMap[id] = {
              tdo_id: id,
              tdo_nombre: item?.tdo_nombre ?? item?.nombre,
              tdo_descripcion: item?.tdo_descripcion ?? item?.descripcion,
              tdo_vigencia_dias: item?.tdo_vigencia_dias ?? item?.vigenciaDias,
              tdo_permite_vencimiento: item?.tdo_permite_vencimiento ?? item?.aplicaFechaEmision,
              tdo_regla_vigencia: item?.tdo_regla_vigencia ?? item?.reglaVigencia ?? null,
              tdo_anios_atras_permitidos:
                item?.tdo_anios_atras_permitidos ?? item?.aniosAtrasPermitidos ?? null,
              tdo_tiene_plantilla:
                item?.tdo_tiene_plantilla ?? item?.tienePlantilla ?? false,
              tdo_plantilla_contenido:
                item?.tdo_plantilla_contenido ?? item?.plantillaContenido ?? null,
              tdo_tipo_plantilla:
                item?.tdo_tipo_plantilla ?? item?.tipoPlantilla ?? "TEXTO",
              tdo_formato_codigo:
                item?.tdo_formato_codigo ?? item?.formatoCodigo ?? null,
              tdo_formato_codigo_secundario:
                item?.tdo_formato_codigo_secundario ??
                item?.formatoCodigoSecundario ??
                null,
              tdo_revision: item?.tdo_revision ?? item?.revision ?? null,
              tdo_paginas_total:
                item?.tdo_paginas_total ?? item?.paginasTotal ?? null,
            };
          }
        });

        if (requestIdRef.current !== currentRequestId) {
          // Ya hay una ejecución más nueva de este efecto; descartar esta respuesta obsoleta.
          return;
        }

        setPreguntas(activasConCatalogo);
        setPaises(Array.isArray(paisesData) ? paisesData : []);
        setDocumentosCatalogoMap(documentosMap);
        setFormulario(formularioData);
      })
      .catch((err) => {
        console.error("❌ Error cargando formulario:", err);
      })
      .finally(() => {
        if (!solicitudId) cargaInicialListaHecha.current = true;
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      });
  }, [solicitudId, formularioVersionObjetivo]);

  return {
    preguntas,
    paises,
    documentosCatalogoMap,
    formulario,
    loading,
  };
}