"use client";

import { Save, Loader } from "lucide-react";

interface OverallProgress {
  totalAnswered: number;
  totalRequired: number;
}

interface OverallDisplayProgress {
  answered: number;
  total: number;
  percent: number;
  usesRequired: boolean;
}

interface ResumenAvanceAccionesProps {
  readOnly: boolean;
  isSaving: boolean;
  overallProgress: OverallProgress;
  overallDisplayProgress: OverallDisplayProgress;
  returnTo?: string | null;
  onGuardar: () => void;
}

export function ResumenAvanceAcciones({
  readOnly,
  isSaving,
  overallProgress,
  overallDisplayProgress,
  returnTo,
  onGuardar,
}: ResumenAvanceAccionesProps) {
  const isCorrecionASC = returnTo?.includes("corregir-formulario-asc") ?? false;
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-gray-900">Resumen del avance</p>
          <p className="text-xs text-gray-600">
            {overallDisplayProgress.usesRequired
              ? `Obligatorias: ${overallProgress.totalAnswered}/${overallProgress.totalRequired}`
              : `Completados: ${overallDisplayProgress.answered}/${overallDisplayProgress.total}`}
          </p>
        </div>

        <div className="w-full md:w-1/2">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overallDisplayProgress.answered >= overallDisplayProgress.total
                  ? "bg-blue-700"
                  : "bg-blue-500"
              }`}
              style={{ width: `${overallDisplayProgress.percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-0.5 text-right">
            {overallDisplayProgress.percent}% completado
          </p>
        </div>

        {!readOnly && (
          <button
            onClick={onGuardar}
            disabled={
              isSaving ||
              overallDisplayProgress.percent < 100
            }
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[#0a4d85] to-[#0e5e9f] px-3 py-1 text-xs font-semibold text-white shadow-md ring-1 ring-[#0a4d85]/30 transition-all duration-200 hover:from-[#084370] hover:to-[#0b548f] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0e5e9f]/40 disabled:cursor-not-allowed disabled:opacity-40 md:ml-2"
          >
            {isSaving ? (
              <Loader className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            {isSaving
              ? "Guardando solicitud..."
              : isCorrecionASC
                ? "Corregir y enviar"
                : "Guardar y Enviar"}
          </button>
        )}
      </div>
    </div>
  );
}
