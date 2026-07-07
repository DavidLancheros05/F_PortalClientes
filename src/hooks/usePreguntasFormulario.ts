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
    return Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
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

        // Obtener la última versión disponible de las preguntas
        const versionsAvailable = (data as FormularioPregunta[])
          .map((p) => Number(p.fp_version ?? 1))
          .filter((v, i, arr) => arr.indexOf(v) === i); // valores únicos
        const latestVersion = Math.max(...versionsAvailable, 1);

        const versionObjetivo = solicitudId
          ? formularioVersionObjetivo
          : latestVersion;

        if (!solicitudId && versionObjetivo) {
          setFormularioVersionObjetivo(versionObjetivo);
        }

        const activas = (data as FormularioPregunta[])
          .filter(
            (p) =>
              p.fp_estado &&
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