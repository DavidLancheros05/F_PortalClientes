"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { solicitudesService } from "@/services/solicitudes.service";
import { formularioRespuestasService } from "@/services/formulario-respuestas.service";

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
  setNumeroSolicitud: (value: string | null) => void;
  setFormularioVersionObjetivo: (value: number) => void;
  setRespuestas: Dispatch<SetStateAction<RespuestasState>>;
  setArchivosExistentes: Dispatch<SetStateAction<Record<number, any>>>;
  setErrorMessage: (value: string) => void;
  setEstadoId?: Dispatch<SetStateAction<number | null>>;
}

export function useSolicitudEdicion({
  solicitudId,
  setNumeroSolicitud,
  setFormularioVersionObjetivo,
  setRespuestas,
  setArchivosExistentes,
  setErrorMessage,
  setEstadoId,
}: UseSolicitudEdicionParams) {
  useEffect(() => {
    if (!solicitudId) {
      return;
    }

    const cargarArchivosExistentes = async (solicitud_id: number) => {
      try {
        const data = await formularioRespuestasService.getArchivosExistentes(solicitud_id);
        const mapArchivos: Record<number, any> = {};
        if (Array.isArray(data)) {
          data.forEach((archivo: any) => {
            const fpId = archivo.fr_fp_id ?? archivo.fp_id;
            if (fpId) {
              mapArchivos[fpId] = archivo;
            }
          });
          setArchivosExistentes(mapArchivos);
        } else {
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setArchivosExistentes({});
        } else {
        }
      }
    };

    solicitudesService
      .getById(solicitudId)
      .then((data: any) => {
        setNumeroSolicitud(data?.sol_numero_solicitud || null);
        const versionSolicitud = Number(data?.sol_formulario_version ?? 1);
        setFormularioVersionObjetivo(versionSolicitud);
        if (setEstadoId) {
          setEstadoId(data?.sol_estado_id || null);
        }
      })
      .catch((err) => {
        console.error("Error cargando solicitud:", err);
      });

    solicitudesService
      .getRespuestas(solicitudId)
      .then((data: any[]) => {
        // guardarRespuesta guarda una fila por opción marcada en preguntas
        // MULTISELECT, y el historial puede traer guardados anteriores. Agrupamos
        // por pregunta y nos quedamos solo con el guardado más reciente (incluyendo
        // TODAS sus filas, para no perder opciones al armar el arreglo).
        const filasPorPregunta = new Map<number, any[]>();
        data.forEach((respuesta: any) => {
          const lista = filasPorPregunta.get(respuesta.fr_fp_id) ?? [];
          lista.push(respuesta);
          filasPorPregunta.set(respuesta.fr_fp_id, lista);
        });

        const respuestasMap: RespuestasState = {};

        filasPorPregunta.forEach((filas, fpId) => {
          const conFecha = filas.map((f) => ({
            fila: f,
            tiempo: new Date(f.fr_created_at ?? 0).getTime(),
          }));
          const maxTiempo = Math.max(...conFecha.map((f) => f.tiempo));
          // Tolerancia de 2s: las opciones de un mismo guardado MULTISELECT se
          // insertan en un loop, cada una con su propio GETDATE(), a milisegundos
          // de diferencia entre sí.
          const filasDelUltimoGuardado = conFecha
            .filter((f) => maxTiempo - f.tiempo < 2000)
            .map((f) => f.fila);

          const opcionesIds = filasDelUltimoGuardado
            .map((f) => f.fr_valor_opcion_id)
            .filter((id: any) => id !== null && id !== undefined);

          // Usamos la fila más reciente como base para texto/número/fecha.
          const respuesta = filasDelUltimoGuardado.reduce((latest, f) =>
            new Date(f.fr_created_at ?? 0).getTime() >
            new Date(latest.fr_created_at ?? 0).getTime()
              ? f
              : latest,
          );

          const valorFechaNormalizado =
            typeof respuesta.fr_valor_fecha === "string" &&
            respuesta.fr_valor_fecha.trim() !== ""
              ? respuesta.fr_valor_fecha.slice(0, 10)
              : undefined;

          const valorOpcionCatalogo =
            respuesta.fr_valor_catalogo_id !== null &&
            respuesta.fr_valor_catalogo_id !== undefined
              ? Number(respuesta.fr_valor_catalogo_id)
              : undefined;

          const valor_opcion =
            opcionesIds.length > 1
              ? opcionesIds
              : (opcionesIds[0] ?? valorOpcionCatalogo);

          respuestasMap[fpId] = {
            valor_texto: respuesta.fr_valor_texto || undefined,
            valor_numero: respuesta.fr_valor_numero || undefined,
            valor_fecha: valorFechaNormalizado,
            valor_opcion_id: valor_opcion || undefined,
          };
        });

        setRespuestas(respuestasMap);
      })
      .catch((err) => {
        console.error("Error cargando respuestas:", err);
        setErrorMessage("Error al cargar las respuestas guardadas");
      });

    cargarArchivosExistentes(solicitudId);
  }, [
    solicitudId,
    setArchivosExistentes,
    setErrorMessage,
    setFormularioVersionObjetivo,
    setNumeroSolicitud,
    setRespuestas,
  ]);
}
