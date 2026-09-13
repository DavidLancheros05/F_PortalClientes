import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

// Tarjeta centrada para estados "sin buscar" / "sin resultados" de los
// listados — icono en círculo gris en vez de emoji. `action` es opcional
// (ej. un botón "Crear el primero") para cuando el vacío es real (0
// registros en el sistema), no solo "sin filtrar todavía".
export function EmptyStateCard({
  icon: Icon,
  title,
  subtitle,
  action,
}: EmptyStateCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="h-7 w-7 text-gray-400" strokeWidth={1.75} />
      </div>
      <p className="text-gray-600 mb-2">{title}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
