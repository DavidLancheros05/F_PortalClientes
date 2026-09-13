import type { ReactNode } from "react";

interface FilterActionsProps {
  className?: string;
  children: ReactNode;
}

// Fila de botones (Buscar/Limpiar, etc.) de un formulario de filtros.
// Siempre va en su propia fila completa, centrada, debajo de los
// FilterField — se usa con className="col-span-full" en el grid contenedor
// para forzar el salto de línea sin importar cuántas columnas tenga el
// grid en cada breakpoint. Ver
// documentacion/Portal Clientes/parte visual/parte visual.md.
export function FilterActions({ className, children }: FilterActionsProps) {
  return (
    <div className={className}>
      <div className="flex justify-center gap-2">{children}</div>
    </div>
  );
}
