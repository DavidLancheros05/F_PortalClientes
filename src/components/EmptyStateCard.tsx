import type { LucideIcon } from "lucide-react";

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}

// Tarjeta centrada para estados "sin buscar" / "sin resultados" de los
// listados — icono en círculo gris en vez de emoji.
export function EmptyStateCard({ icon: Icon, title, subtitle }: EmptyStateCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="h-7 w-7 text-gray-400" strokeWidth={1.75} />
      </div>
      <p className="text-gray-600 mb-2">{title}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}
