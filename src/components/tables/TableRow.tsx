import type { ReactNode, HTMLAttributes } from "react";

interface TrProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
}

// Fila estándar: hover consistente + `group` (necesario para que la
// columna `sticky` de <Td> herede el mismo fondo al pasar el mouse).
export function Tr({ children, className = "", ...rest }: TrProps) {
  return (
    <tr
      className={`group hover:bg-gray-50 transition-colors ${className}`}
      {...rest}
    >
      {children}
    </tr>
  );
}
