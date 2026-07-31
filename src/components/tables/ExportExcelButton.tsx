"use client";

import { Download } from "lucide-react";

interface ExportExcelButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

// Botón estándar "Descargar Excel" para listados/tablas del portal —
// outline verde, mismo estilo en todas las pantallas que exportan.
export function ExportExcelButton({
  onClick,
  disabled,
  label = "Descargar Excel",
}: ExportExcelButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg border border-[#a7f3d0] text-[#059669] hover:bg-[#ecfdf5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}
