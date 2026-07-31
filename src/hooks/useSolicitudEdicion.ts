"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { solicitudesService } from "@/services/solicitudes.service";
import { formularioRespuestasService } from "@/services/formulario-respuestas.service";
import { agruparUltimaRespuestaPorPregunta } from "@/lib/agruparUltimaRespuestaPorPregunta";

type RespuestasState = {
  [fp_id: number]: {
    valor_texto?: string;
    valor_numero?: number;
    valor_fecha?: string;
    valor_opcion_id?: number | number[] | string;
    archivo?: File;
    nombre_archivo?: string;
    vista_previa_url?: string;
  };
};

interface UseSolicitudEdicionParams {
  solicitudId?: number;
  preguntas: Array<{ fp_id: number; fp_tipo: string }>;
  setNumeroSolicitud: (value: string | null) => void;
  setFormularioVersionObjetivo: (value: number) => void;
  setRespuestas: Dispatch<SetStateAction<RespuestasState>>;
  setArchivosExistentes: Dispatch<SetStateAction<Record<number, any>>>;
  setErrorMessage: (value: string) => void;
  setEstadoId?: Dispatch<SetStateAction<number | null>>;
}

export function useSolicitudEdicion({
  solicitudId,
  preguntas,
  setNumeroSolicitud,
  setFormularioVersionObjetivo,
  setRespuestas,
  setArchivosExistentes,
  setErrorMessage,
  setEstadoId,
}: UseSolicitudEdicionParams) {
  const router = useRouter();
  const [bloqueadoPorRechazoAuxiliar, setBloqueadoPorRechazoAuxiliar] =
    useState(false);

  // Resuelve la versión objetivo del formulario (y el número/estado de la
  // solicitud) apenas se conoce el solicitudId, SIN esperar a que las
  // preguntas ya estén cargadas. Antes esto vivía en el mismo efecto que
  // procesa las respuestas (gateado por preguntas.length > 0), lo cual
  // obligaba a usePreguntasFormulario a hacer una primera carga sin filtro
  // de versión (todas las versiones mezcladas) y luego una segunda carga ya
  // filtrada en cuanto llegaba la versión real, duplicando la petición y el
  // mensaje de "Cargando formulario..." en pantalla.
  useEffect(() => {
    if (!solicitudId) {
      return;
    }

    const cargarArchivosExistentes = async (sa_sol_id: number) => {
      try {
        const data =
          await formularioRespuestasService.getArchivosExistentes(sa_sol_id);
        const mapArchivos: Record<number, any> = {};
        if (Array.isArray(data)) {
          data.forEach((archivo: any) => {
            const fpId = archivo.fr_fp_id ?? archivo.fp_id;
            if (fpId) {
              mapArchivos[fpId] = archivo;
            }
          });
          setArchivosExistentes(mapArchivos);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setArchivosExistentes({});
        }
      }
    };

    solicitudesService
      .getById(solicitudId)
      .then((data: any) => {
        // Rechazada por ASC (Pendiente + Etapa ASC + Resultado
        // RECHAZADO): el cliente solo puede corregir desde
        // /solicitudes/mis-documentos, el formulario completo queda
        // bloqueado. Misma condición literal usada en
        // SolicitudesContent.tsx y en el backend.
        const rechazadoPorAuxiliar =
          Number(data?.sol_estado_id) === 2 &&
          Number(data?.sol_etapa_actual_id) === 3 &&
          Number(data?.sol_resultado_etapa_id) === 3;

        if (rechazadoPorAuxiliar) {
          setBloqueadoPorRechazoAuxiliar(true);
          router.replace("/solicitudes/mis-documentos");
          return;
        }

        setNumeroSolicitud(data?.sol_numero_solicitud || null);
        const versionSolicitud = Number(data?.sol_formulario_version ?? 1);
        setFormularioVersionObjetivo(versionSolicitud);
        if (setEstadoId) {
          setEstadoId(data?.sol_estado_id || null);
        }
      })
      .catch((err) => {
        console.error("Error cargando solicitud:", err);
        setErrorMessage("Error al cargar los datos de la solicitud");
      });

    cargarArchivosExistentes(solicitudId);
  }, [
    solicitudId,
    setArchivosExistentes,
    setErrorMessage,
    setFormularioVersionObjetivo,
    setNumeroSolicitud,
    setEstadoId,
    router,
  ]);

  // Carga las respuestas guardadas de la solicitud. Sí necesita esperar a
  // que las preguntas estén disponibles porque usa fp_tipo para saber cuáles
  // son MULTISELECT y armar el valor como arreglo.
  useEffect(() => {
    if (!solicitudId || preguntas.length === 0) {
      return;
    }

    const multiselectFpIds = new Set(
      preguntas
        .filter((p) => p.fp_tipo === "MULTISELECT")
        .map((p) => p.fp_id),
    );

    solicitudesService
      .getRespuestas(solicitudId)
      .then((respuestasData: any[]) => {
        // Procesar datos de respuestas
        const respuestasDataArray = respuestasData || [];
        if (Array.isArray(respuestasDataArray)) {
          setRespuestas(
            agruparUltimaRespuestaPorPregunta(
              respuestasDataArray,
              multiselectFpIds,
            ),
          );
        }
      })
      .catch((err) => {
        console.error("Error cargando respuestas:", err);
        setErrorMessage("Error al cargar los datos de la solicitud");
      });
  }, [solicitudId, preguntas, setErrorMessage, setRespuestas]);

  return { bloqueadoPorRechazoAuxiliar };
}
