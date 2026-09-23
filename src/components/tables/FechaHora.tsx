interface FechaHoraProps {
  value?: string | Date | null;
  /** Para columnas SQL `date` (sin hora): muestra solo la fecha y la
   * formatea en UTC — el driver las entrega como medianoche UTC y en hora
   * local de Colombia se correrían un día para atrás. */
  soloFecha?: boolean;
  /** Texto cuando no hay valor o es inválido. */
  vacio?: string;
}

const formatoFecha: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

// Fecha arriba y hora abajo en gris más pequeño (23/09/2026 · 04:21 p.m.).
// Pensado para celdas de tabla (<Td>), pero sirve en cualquier parte.
// La hora se convierte igual que formatDateTime de lib/date-utils.ts (hora
// local del navegador), para que no cambie la hora que ya se mostraba.
export function FechaHora({ value, soloFecha = false, vacio = "-" }: FechaHoraProps) {
  if (!value) return <span className="text-gray-400">{vacio}</span>;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return <span className="text-gray-400">{vacio}</span>;

  const fecha = date.toLocaleDateString(
    "es-CO",
    soloFecha ? { ...formatoFecha, timeZone: "UTC" } : formatoFecha,
  );

  if (soloFecha) {
    return <span className="whitespace-nowrap text-gray-800">{fecha}</span>;
  }

  // es-CO da "04:21 p. m." (con espacios no separables) → "04:21 p.m."
  const hora = date
    .toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })
    .replace(/\s*([ap])\.\s*m\./i, " $1.m.");

  return (
    <span className="inline-flex flex-col leading-tight whitespace-nowrap">
      <span className="text-gray-800">{fecha}</span>
      <span className="text-xs text-gray-400">{hora}</span>
    </span>
  );
}
