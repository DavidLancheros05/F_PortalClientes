import type { ReactNode } from "react";

// Envuelve la tabla de un listado en un sub-contenedor con margen y borde
// propio, para que no quede pegada a los bordes de la tarjeta de resultados.
export function TableContainer({ children }: { children: ReactNode }) {
  return (
    <div className="m-4 sm:m-5 border border-[#eef1f6] rounded-xl overflow-hidden">
      {children}
    </div>
  );
}
