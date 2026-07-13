"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

interface UseDocumentoVigenciaParams {
  pregunta: any;
  respuestas: Record<number, any>;
  archivosExistentes: Record<number, any>;
  documentosCatalogoMap: Record<number, any>;
  preguntaFechaAsociada?: any;
  setRespuestas: Dispatch<SetStateAction<Record<number, any>>>;
  calcularVigenciaDocumento: (
    fechaEmision?: string,
    vigenciaDias?: number | null,
  ) => { diasRestantes: number; fechaVencimiento: Date } | null;
  calcularEstadoAnioDocumento: (
    fechaEmision?: string,
    aniosAtrasPermitidos?: number | null,
  ) => {
    valido: boolean;
    anioDocumento: number;
    anioMinimo: number;
    anioMaximo: number;
  } | null;
}

/**
 * Lógica de fecha de emisión / vigencia de un documento, compartida entre
 * ArchivoField y DocumentoTablaField. Antes vivía duplicada en ambos
 * componentes y se desincronizaba entre sí (ver bug de "Estados GYP" sin
 * fecha de vencimiento) — un solo lugar para calcular y guardar la fecha.
 */
export function useDocumentoVigencia({
  pregunta,
  respuestas,
  archivosExistentes,
  documentosCatalogoMap,
  preguntaFechaAsociada,
  setRespuestas,
  calcularVigenciaDocumento,
  calcularEstadoAnioDocumento,
}: UseDocumentoVigenciaParams) {
  const documento = pregunta.fp_tipo_documento_id
    ? documentosCatalogoMap[pregunta.fp_tipo_documento_id]
    : null;
  const vigenciaDias = documento?.tdo_vigencia_dias ?? null;
  const esReglaAnio = documento?.tdo_regla_vigencia === "ANIO";
  const archivoExistente = archivosExistentes[pregunta.fp_id];

  const calcularFechaFormato = () => {
    let fecha =
      (preguntaFechaAsociada
        ? respuestas[preguntaFechaAsociada.fp_id]?.valor_fecha
        : null) ||
      respuestas[pregunta.fp_id]?.valor_fecha ||
      archivoExistente?.sd_fecha_emision ||
      "";

    if (fecha && typeof fecha === "string" && fecha.includes("T")) {
      fecha = fecha.split("T")[0];
    }
    return fecha;
  };

  const fechaFormato = calcularFechaFormato();
  const [fechaInputValue, setFechaInputValue] = useState<string>(fechaFormato);

  // Sincronizar estado local cuando cambian las fuentes de fecha
  useEffect(() => {
    setFechaInputValue(fechaFormato);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    archivoExistente?.sd_fecha_emision,
    preguntaFechaAsociada?.fp_id,
    respuestas[preguntaFechaAsociada?.fp_id]?.valor_fecha,
    respuestas[pregunta.fp_id]?.valor_fecha,
  ]);

  const hoy = new Date().toISOString().split("T")[0];
  const resumenVigencia = calcularVigenciaDocumento(fechaInputValue, vigenciaDias);
  const resumenAnio = calcularEstadoAnioDocumento(
    fechaInputValue,
    documento?.tdo_anios_atras_permitidos,
  );

  const mostrarCampoFecha =
    Boolean(preguntaFechaAsociada || documento?.tdo_permite_vencimiento) &&
    (vigenciaDias !== null || esReglaAnio);

  const guardarFecha = (fechaSeleccionada: string) => {
    setFechaInputValue(fechaSeleccionada);

    if (preguntaFechaAsociada) {
      setRespuestas((prev: any) => ({
        ...prev,
        [preguntaFechaAsociada.fp_id]: {
          ...prev[preguntaFechaAsociada.fp_id],
          valor_fecha: fechaSeleccionada,
        },
      }));
    } else {
      setRespuestas((prev: any) => ({
        ...prev,
        [pregunta.fp_id]: {
          ...prev[pregunta.fp_id],
          valor_fecha: fechaSeleccionada,
        },
      }));
    }
  };

  return {
    documento,
    vigenciaDias,
    esReglaAnio,
    fechaInputValue,
    hoy,
    resumenVigencia,
    resumenAnio,
    mostrarCampoFecha,
    guardarFecha,
  };
}
