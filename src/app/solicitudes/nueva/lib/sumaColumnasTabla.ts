// Columnas NUMERO de una pregunta TABLA con `suma_total` configurado (ej.
// "% Participación" de accionistas = 100): la suma de la columna en todas
// las filas debe dar exactamente ese valor. Compartido entre el cálculo de
// "pregunta respondida" (progreso), la validación de sección y el aviso
// que muestra TablaField.

type ColumnaConSuma = { nombre: string; tipo?: string; suma_total?: unknown };

export type DescuadreSumaColumna = { columna: string; suma: number; esperado: number };

export function calcularDescuadresSuma(
  columnas: ColumnaConSuma[],
  filas: Array<Record<string, unknown> | null | undefined>,
): DescuadreSumaColumna[] {
  return columnas
    .filter((c) => c.tipo === "NUMERO" && typeof c.suma_total === "number")
    .map((c) => {
      const suma = filas.reduce((acc, fila) => {
        const numero = Number(String(fila?.[c.nombre] ?? "").trim());
        return Number.isFinite(numero) ? acc + numero : acc;
      }, 0);
      return { columna: c.nombre, suma, esperado: c.suma_total as number };
    })
    // Tolerancia para decimales (ej. 33.33 + 33.33 + 33.34).
    .filter((d) => Math.abs(d.suma - d.esperado) > 0.001);
}

export function formatearSuma(valor: number): string {
  return Number(valor.toFixed(2)).toString();
}
