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
  return (
    <div className="space-y-1 border-t border-slate-200 pt-1">
      <label className="flex items-center gap-1 text-xs font-medium text-slate-800">
        <Calendar className="h-3 w-3" />
        {preguntaFechaAsociada?.fp_descripcion || "Fecha de emisión"}
        {preguntaFechaAsociada?.fp_requerida && (
          <span className="text-red-500 ml-0.5">*</span>
        )}
      </label>
      <input
        type="date"
        value={fechaInputValue}
        min="1900-01-01"
        max={hoy}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          hasError ? "border-red-500" : "border-gray-300"
        } ${readOnly ? "bg-gray-100 text-gray-600 cursor-not-allowed" : ""}`}
      />
      {esReglaAnio ? (
        <>
          <p className="text-xs text-slate-600">
            {documento?.tdo_anios_atras_permitidos === 0
              ? `Debe ser del año ${new Date().getFullYear()}.`
              : `Debe ser de ${new Date().getFullYear() - (documento?.tdo_anios_atras_permitidos ?? 0)} a ${new Date().getFullYear()}.`}
          </p>
          {resumenAnio && (
            <p
              className={`text-xs mt-1 font-medium ${
                resumenAnio.valido ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {resumenAnio.valido
                ? `Vigente — es del año ${resumenAnio.anioDocumento}.`
                : `Documento vencido — no es ${
                    resumenAnio.anioMinimo === resumenAnio.anioMaximo
                      ? `del año ${resumenAnio.anioMaximo}`
                      : `de ${resumenAnio.anioMinimo} o ${resumenAnio.anioMaximo}`
                  }.`}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-slate-600">
            Vigencia: {vigenciaDias} día{vigenciaDias === 1 ? "" : "s"}
          </p>
          {resumenVigencia && (
            <p
              className={`text-xs mt-1 font-medium ${
                resumenVigencia.diasRestantes >= 0
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            >
              {resumenVigencia.diasRestantes >= 0
                ? `Faltan ${resumenVigencia.diasRestantes} día${
                    resumenVigencia.diasRestantes === 1 ? "" : "s"
                  } para que venza.`
                : `Vencido hace ${Math.abs(resumenVigencia.diasRestantes)} día${
                    Math.abs(resumenVigencia.diasRestantes) === 1 ? "" : "s"
                  }.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
