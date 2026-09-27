// Respuestas de preguntas TABLA: un JSON con un objeto por fila. Cada celda
// se guarda bajo el `codigo` de su columna (estable ante renombrados de la
// etiqueta), no bajo su `nombre` visible. Las respuestas viejas pueden venir
// por nombre, así que toda lectura acepta ambas claves: `codigo` primero,
// `nombre` de respaldo. Mismo criterio que el backend
// (src/common/utils/tabla-respuesta.util.ts).

export type ColumnaConClave = { nombre: string; codigo?: string };

type Fila = Record<string, unknown>;

export function claveColumna(columna: ColumnaConClave): string {
  return columna.codigo || columna.nombre;
}

export function valorCelda(fila: Fila | null | undefined, columna: ColumnaConClave): unknown {
  if (!fila) return undefined;
  if (columna.codigo && fila[columna.codigo] !== undefined) return fila[columna.codigo];
  return fila[columna.nombre];
}

// Filas por codigo. Las claves que no corresponden a ninguna columna se
// conservan tal cual para no perder datos.
export function normalizarFilas<T extends Fila>(filas: T[], columnas: ColumnaConClave[]): Record<string, string>[] {
  const conocidas = new Set<string>();
  columnas.forEach((c) => {
    conocidas.add(c.nombre);
    if (c.codigo) conocidas.add(c.codigo);
  });
  return filas.map((fila) => {
    const salida: Record<string, string> = {};
    columnas.forEach((c) => {
      const v = valorCelda(fila, c);
      if (v !== undefined) salida[claveColumna(c)] = v as string;
    });
    Object.entries(fila ?? {}).forEach(([k, v]) => {
      if (!conocidas.has(k)) salida[k] = v as string;
    });
    return salida;
  });
}
