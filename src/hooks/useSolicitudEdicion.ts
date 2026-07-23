"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
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
          // guardarRespuesta guarda una fila por opción marcada en preguntas
          // MULTISELECT, y el historial puede traer guardados anteriores. Agrupamos
          // por pregunta y nos quedamos solo con el guardado más reciente (incluyendo
          // TODAS sus filas, para no perder opciones al armar el arreglo).
          const filasPorPregunta = new Map<number, any[]>();
          respuestasDataArray.forEach((respuesta: any) => {
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

            // Para MULTISELECT el valor siempre debe quedar como arreglo, aunque
            // se haya marcado una sola opcion (isAnswered() y el checklist de
            // la UI solo reconocen un MULTISELECT como respondido si es
            // Array.isArray) -- antes se colapsaba a un numero suelto cuando
            // opcionesIds.length era 1, y esas preguntas quedaban contadas
            // como sin responder pese a tener una opcion guardada.
            const valor_opcion = multiselectFpIds.has(fpId)
              ? opcionesIds
              : opcionesIds.length > 1
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
        }
      })
      .catch((err) => {
        console.error("Error cargando respuestas:", err);
        setErrorMessage("Error al cargar los datos de la solicitud");
      });
  }, [solicitudId, preguntas, setErrorMessage, setRespuestas]);

  return { bloqueadoPorRechazoAuxiliar };
}
