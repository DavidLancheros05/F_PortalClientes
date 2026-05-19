"use client";

interface StateBadgeProps {
  estado: string | { pe_nombre: string; pe_color?: string };
  className?: string;
}

const ESTADO_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  PENDIENTE: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pendiente" },
  RECIBIDO: { bg: "bg-blue-100", text: "text-blue-800", label: "Recibido" },
  EN_CLASIFICACION: { bg: "bg-purple-100", text: "text-purple-800", label: "En clasificación" },
  ASIGNADO: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Asignado" },
  EN_GESTION: { bg: "bg-cyan-100", text: "text-cyan-800", label: "En gestión" },
  PENDIENTE_CLIENTE: { bg: "bg-orange-100", text: "text-orange-800", label: "Pendiente cliente" },
  EN_REVISION: { bg: "bg-blue-100", text: "text-blue-800", label: "En revisión" },
  RESPONDIDO: { bg: "bg-green-100", text: "text-green-800", label: "Respondido" },
  RESUELTA: { bg: "bg-green-100", text: "text-green-800", label: "Resuelta" },
  CERRADO: { bg: "bg-gray-100", text: "text-gray-800", label: "Cerrado" },
  RECHAZADA: { bg: "bg-red-100", text: "text-red-800", label: "Rechazada" },
  ESCALADO: { bg: "bg-red-100", text: "text-red-800", label: "Escalado" },
};

export function StateBadge({ estado, className = "" }: StateBadgeProps) {
  if (typeof estado === "object" && estado.pe_nombre) {
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white ${className}`}
        style={{ backgroundColor: estado.pe_color || "#6B7280" }}
      >
        <span className="w-2 h-2 rounded-full mr-2 bg-current opacity-60" />
        {estado.pe_nombre}
      </span>
    );
  }

  const estadoStr = typeof estado === "string" ? estado : "PENDIENTE";
  const config = ESTADO_CONFIG[estadoStr] || ESTADO_CONFIG.PENDIENTE;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${className}`}
    >
      <span className="w-2 h-2 rounded-full mr-2 bg-current opacity-60" />
      {config.label}
    </span>
  );
}
