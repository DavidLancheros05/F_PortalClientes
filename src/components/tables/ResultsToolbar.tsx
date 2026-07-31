import { ExportExcelButton } from "@/components/tables/ExportExcelButton";

interface ResultsToolbarProps {
  count: number;
  label?: string;
  onExport: () => void;
}

// Barra superior de la tarjeta de resultados: contador "Mostrando N ..." +
// botón de exportar a Excel. Reutilizada en los listados de "gestión".
export function ResultsToolbar({
  count,
  label = "solicitud(es)",
  onExport,
}: ResultsToolbarProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50/40 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-gray-600">
        Mostrando <span className="font-semibold">{count}</span> {label}
      </p>
      <ExportExcelButton onClick={onExport} />
    </div>
  );
}
