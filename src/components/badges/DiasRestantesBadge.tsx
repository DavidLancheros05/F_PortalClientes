// Calcula días de calendario entre hoy y una fecha objetivo (negativo si ya
// venció). Usado en los listados de "gestión" (EJN, ASC, OFC, CC1, CC2) para
// mostrar cuánto falta para el SLA de cada etapa.
export function calcularDiasRestantes(fecha?: string | null): number | null {
  if (!fecha) return null;
  const hoy = new Date();
  const objetivo = new Date(fecha);
  const diffMs = objetivo.setHours(0, 0, 0, 0) - hoy.setHours(0, 0, 0, 0);
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getDiasRestantesDisplay(diasRestantes: number | null): {
  text: string;
  className: string;
} {
  if (diasRestantes === null) {
    return {
      text: "-",
      className: "bg-slate-100 text-slate-600",
    };
  }

  if (diasRestantes < 0) {
    const diasVencidos = Math.abs(diasRestantes);
    return {
      text: `Vencido hace ${diasVencidos} día${diasVencidos === 1 ? "" : "s"}`,
      className: "bg-red-100 text-red-700",
    };
  }

  if (diasRestantes === 0) {
    return {
      text: "Vence hoy",
      className: "bg-amber-100 text-amber-800",
    };
  }

  if (diasRestantes <= 3) {
    return {
      text: `${diasRestantes} día${diasRestantes === 1 ? "" : "s"}`,
      className: "bg-amber-100 text-amber-800",
    };
  }

  return {
    text: `${diasRestantes} día${diasRestantes === 1 ? "" : "s"}`,
    className: "bg-emerald-100 text-emerald-700",
  };
}

export function DiasRestantesBadge({ fecha }: { fecha?: string | null }) {
  const diasRestantes = calcularDiasRestantes(fecha);
  const { text, className } = getDiasRestantesDisplay(diasRestantes);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {text}
    </span>
  );
}
