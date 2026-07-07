"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface NavegacionSeccionesProps {
  isFirstSection: boolean;
  isLastSection: boolean;
  readOnly: boolean;
  isSaving: boolean;
  hasDraftData: boolean;
  estadoId?: number; // 1=BORRADOR, 2=PENDIENTE, 3=REVISIÓN, 4=COMPLETADA
  returnTo?: string | null;
  onNavegar: (direction: "anterior" | "siguiente") => void;
  onGuardarParcial: () => void;
}

export function NavegacionSecciones({
  isFirstSection,
  isLastSection,
  readOnly,
  isSaving,
  hasDraftData,
  estadoId,
  returnTo,
  onNavegar,
  onGuardarParcial,
}: NavegacionSeccionesProps) {
  const isCorrecionASC = returnTo?.includes("corregir-formulario-asc") ?? false;
  return (
    <div className="flex gap-1 mt-3 border-t pt-2">
      <button
        onClick={() => onNavegar("anterior")}
        disabled={isFirstSection}
        className="flex items-center gap-1 px-2 py-1 text-xs border border-slate-200 rounded-lg bg-slate-100 text-slate-700 font-semibold shadow-sm hover:bg-slate-200 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
      >
        <ChevronLeft className="h-3 w-3" />
        Anterior
      </button>

      <button
        onClick={() => onNavegar("siguiente")}
        disabled={isLastSection}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-lg font-semibold shadow-md hover:bg-blue-700 hover:shadow-lg ring-1 ring-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
      >
        Siguiente
        <ChevronRight className="h-3 w-3" />
      </button>

      {!readOnly && estadoId !== 2 && !isCorrecionASC && (
        <button
          onClick={onGuardarParcial}
          disabled={isSaving || !hasDraftData}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-100 hover:border-slate-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isSaving ? "Guardando..." : "📋 Guardar Borrador"}
        </button>
      )}
    </div>
  );
}
