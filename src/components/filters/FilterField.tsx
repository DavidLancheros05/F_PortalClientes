import { forwardRef, type ReactNode } from "react";

interface FilterFieldProps {
  label: string;
  className?: string;
  // Muestra el asterisco rojo de campo obligatorio junto al label.
  required?: boolean;
  children: ReactNode;
}

// Envuelve un input/select de una fila de filtros con su label. Reserva
// siempre la misma altura mínima de label (una línea de texto) sin importar
// si el label de al lado es más corto, para que todos los campos de la fila
// (incluida FilterActions) arranquen exactamente en la misma Y — ver
// documentacion/Portal Clientes/parte visual/parte visual.md.
//
// Usa forwardRef porque algunos campos (autocompletar de cliente/ejecutivo)
// necesitan una ref sobre el div contenedor para detectar clics afuera y
// cerrar la lista de sugerencias.
export const FilterField = forwardRef<HTMLDivElement, FilterFieldProps>(
  function FilterField({ label, className, required, children }, ref) {
    return (
      <div ref={ref} className={className}>
        <label className="flex items-end gap-1 min-h-5 mb-1.5 text-xs font-semibold text-gray-600">
          {label}
          {required && <span className="text-[#dc2626]">*</span>}
        </label>
        {children}
      </div>
    );
  },
);
