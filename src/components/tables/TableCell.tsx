import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";

type Align = "left" | "center" | "right";

const alignClass = (align: Align) =>
  align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

interface ThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Opcional: alguna tabla necesita una columna espaciadora sin título
   * (ej. una celda de solo-ícono o "w-8" al final). */
  children?: ReactNode;
  align?: Align;
  /** Fija la columna al borde derecho al hacer scroll horizontal — usar en
   * la columna "Acciones" de tablas anchas. */
  sticky?: boolean;
  /** Padding horizontal reducido (px-2.5 en vez de px-4) para tablas con
   * muchas columnas. Usarlo en TODAS las Th/Td de la tabla. */
  compacta?: boolean;
}

// Encabezado de columna estándar: mismo padding/tipografía en todas las
// tablas del proyecto. Ver documentacion/Portal Clientes/parte visual/tabla-estandar.md.
export function Th({
  children,
  align = "left",
  sticky = false,
  compacta = false,
  className = "",
  ...rest
}: ThProps) {
  return (
    <th
      className={`${compacta ? "px-2.5" : "px-4"} py-2 ${alignClass(align)} text-xs font-semibold text-gray-600 uppercase tracking-wider ${
        sticky ? "sticky right-0 z-10 bg-gray-50" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </th>
  );
}

interface TdProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode;
  align?: Align;
  /** Fija la columna al borde derecho al hacer scroll horizontal — debe
   * usarse junto con `<Tr>` (que ya trae `group` para el hover). */
  sticky?: boolean;
  /** Ver Th.compacta. */
  compacta?: boolean;
}

export function Td({
  children,
  align = "left",
  sticky = false,
  compacta = false,
  className = "",
  ...rest
}: TdProps) {
  return (
    <td
      className={`${compacta ? "px-2.5" : "px-4"} py-2 ${alignClass(align)} text-sm text-gray-600 ${
        sticky ? "sticky right-0 z-10 bg-white group-hover:bg-gray-50" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </td>
  );
}
