"use client";

import { ChevronLeft, ChevronRight, Save, Loader } from "lucide-react";

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

interface BarraAccionesFormularioProps {
  readOnly: boolean;
  isFirstSection: boolean;
  isLastSection: boolean;
  isSavingBorrador: boolean;
  isSavingFinal: boolean;
  isBlocked?: boolean;
  hasDraftData: boolean;
  estadoId?: number; // 1=BORRADOR, 2=PENDIENTE, 3=REVISIÓN, 4=COMPLETADA
  overallProgress: OverallProgress;
  overallDisplayProgress: OverallDisplayProgress;
  returnTo?: string | null;
  onNavegar: (direction: "anterior" | "siguiente") => void;
  onGuardarParcial: () => void;
  onGuardar: () => void;
}

export function BarraAccionesFormulario({
  readOnly,
  isFirstSection,
  isLastSection,
  isSavingBorrador,
  isSavingFinal,
  isBlocked = false,
  hasDraftData,
  estadoId,
  overallProgress,
  overallDisplayProgress,
  returnTo,
  onNavegar,
  onGuardarParcial,
  onGuardar,
}: BarraAccionesFormularioProps) {
  const isCorrecionASC = returnTo?.includes("corregir-formulario-asc") ?? false;

  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => onNavegar("anterior")}
            disabled={isFirstSection}
            className="flex items-center gap-1 px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-slate-100 text-slate-700 font-semibold shadow-sm hover:bg-slate-200 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronLeft className="h-3 w-3" />
            Anterior
          </button>

          <button
            onClick={() => onNavegar("siguiente")}
            disabled={isLastSection}
            className="flex items-center gap-1 px-2 py-1 text-[11px] bg-blue-600 text-white rounded-lg font-semibold shadow-md hover:bg-blue-700 hover:shadow-lg ring-1 ring-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            Siguiente
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:flex-1 md:justify-end">
          <div>
            <p className="text-[11px] font-semibold text-gray-900">Resumen del avance</p>
            <p className="text-[11px] text-gray-600">
              {overallDisplayProgress.usesRequired
                ? `Obligatorias: ${overallProgress.totalAnswered}/${overallProgress.totalRequired}`
                : `Completados: ${overallDisplayProgress.answered}/${overallDisplayProgress.total}`}
            </p>
          </div>

          <div className="w-full sm:w-40 md:w-56">
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
            <p className="text-[11px] text-gray-600 mt-0.5 text-right">
              {overallDisplayProgress.percent}% completado
            </p>
          </div>

          <div className="flex items-center gap-1">
            {!readOnly && estadoId !== 2 && !isCorrecionASC && (
              <button
                onClick={onGuardarParcial}
                disabled={isBlocked || !hasDraftData}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-800 shadow-sm hover:bg-slate-100 hover:border-slate-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSavingBorrador ? "Guardando..." : "📋 Guardar Borrador"}
              </button>
            )}

            {!readOnly && (
              <button
                onClick={onGuardar}
                disabled={isBlocked || overallDisplayProgress.percent < 100}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-[#0a4d85] to-[#0e5e9f] px-3 py-1 text-[11px] font-semibold text-white shadow-md ring-1 ring-[#0a4d85]/30 transition-all duration-200 hover:from-[#084370] hover:to-[#0b548f] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0e5e9f]/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSavingFinal ? (
                  <Loader className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                {isSavingFinal
                  ? "Guardando solicitud..."
                  : isCorrecionASC
                    ? "Corregir y Guardar"
                    : "Guardar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
