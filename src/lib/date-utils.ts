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
