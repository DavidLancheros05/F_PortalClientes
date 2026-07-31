"use client";

import { Calendar } from "lucide-react";

interface CampoFechaVigenciaProps {
  fechaInputValue: string;
  hoy: string;
  esReglaAnio: boolean;
  vigenciaDias: number | null;
  documento: any;
  resumenVigencia: { diasRestantes: number; fechaVencimiento: Date } | null;
  resumenAnio: {
    valido: boolean;
    anioDocumento: number;
    anioMinimo: number;
    anioMaximo: number;
  } | null;
  preguntaFechaAsociada?: any;
  readOnly: boolean;
  hasError?: string;
  onChange: (fecha: string) => void;
}

/**
 * Estructura visual única para "fecha de emisión + estado de vigencia" de un
 * documento, usada tanto por ArchivoField como por DocumentoTablaField.
 * Antes cada uno tenía su propia versión con estilos distintos (una con caja
 * y encabezado "Fecha del documento", otra sin caja) — misma información,
 * se veía diferente según el tipo de pregunta.
 *
 * Layout en una sola fila (label + input angosto + resultado como pill) en
 * vez de tres párrafos apilados: mientras no hay fecha se muestra la regla
 * ("Vigencia: 90 días"); una vez elegida, el resultado (vigente/vencido) ya
 * la implica, así que se reemplaza en vez de acumularse debajo.
 */
export function CampoFechaVigencia({
  fechaInputValue,
  hoy,
  esReglaAnio,
  vigenciaDias,
  documento,
  resumenVigencia,
  resumenAnio,
  preguntaFechaAsociada,
  readOnly,
  hasError,
  onChange,
}: CampoFechaVigenciaProps) {
  const reglaTexto = esReglaAnio
    ? documento?.tdo_anios_atras_permitidos === 0
      ? `Debe ser del año ${new Date().getFullYear()}`
      : `Debe ser de ${new Date().getFullYear() - (documento?.tdo_anios_atras_permitidos ?? 0)} a ${new Date().getFullYear()}`
    : `Vigencia: ${vigenciaDias} día${vigenciaDias === 1 ? "" : "s"}`;

  const resumenTexto = esReglaAnio
    ? resumenAnio &&
      (resumenAnio.valido
        ? `Vigente — año ${resumenAnio.anioDocumento}`
        : `Vencido — no es ${
            resumenAnio.anioMinimo === resumenAnio.anioMaximo
              ? `del año ${resumenAnio.anioMaximo}`
              : `de ${resumenAnio.anioMinimo} o ${resumenAnio.anioMaximo}`
          }`)
    : resumenVigencia &&
      (resumenVigencia.diasRestantes >= 0
        ? `Faltan ${resumenVigencia.diasRestantes} día${
            resumenVigencia.diasRestantes === 1 ? "" : "s"
          }`
        : `Vencido hace ${Math.abs(resumenVigencia.diasRestantes)} día${
            Math.abs(resumenVigencia.diasRestantes) === 1 ? "" : "s"
          }`);

  const resumenValido = esReglaAnio
    ? (resumenAnio?.valido ?? true)
    : (resumenVigencia?.diasRestantes ?? 0) >= 0;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
      <label className="flex items-center gap-1 text-xs font-medium text-slate-700">
        <Calendar className="h-3.5 w-3.5 text-slate-400" />
        {preguntaFechaAsociada?.fp_descripcion || "Fecha de emisión"}
        {preguntaFechaAsociada?.fp_requerida && (
          <span className="text-red-500">*</span>
        )}
      </label>
      <input
        type="date"
        value={fechaInputValue}
        min="1900-01-01"
        max={hoy}
        onChange={(e) => onChange(e.target.value)}
        className={`w-36 flex-shrink-0 border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          hasError ? "border-red-500" : "border-gray-300"
        } ${readOnly ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}`}
      />
      {resumenTexto ? (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            resumenValido
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {resumenTexto}
        </span>
      ) : (
        <span className="text-[11px] text-slate-500">{reglaTexto}</span>
      )}
    </div>
  );
}
