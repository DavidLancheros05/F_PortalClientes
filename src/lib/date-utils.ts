// Fecha corta ("dd/mm/aaaa"). "-" si el valor es nulo o inválido.
export function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-CO");
}

// Fecha + hora corta. "-" si el valor es nulo o inválido.
export function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function getTodayBogota(): string {
  const options = {
    timeZone: "America/Bogota",
    year: "numeric" as const,
    month: "2-digit" as const,
    day: "2-digit" as const,
  };
  const formatter = new Intl.DateTimeFormat("es-CO", options);
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}
