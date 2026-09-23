import { CheckCircle2, Quote } from "lucide-react";
import { formatDate } from "@/lib/date-utils";

export function GestorInfo({
  usuario,
  fecha,
  className = "mb-2",
}: {
  usuario?: string | null;
  fecha?: string | null;
  className?: string;
}) {
  if (!usuario && !fecha) return null;
  const fechaObj = fecha ? new Date(fecha) : null;
  const fechaValida = fechaObj && !Number.isNaN(fechaObj.getTime());
  return (
    <p className={`text-[13px] text-[#94a3b8] m-0 whitespace-nowrap leading-relaxed ${className}`}>
      {usuario || "-"}
      {fechaValida && (
        <>
          {` · ${formatDate(fecha)}`}
          <span className="text-[12px] text-[#cbd5e1]">
            {` ${fechaObj!.toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}`}
          </span>
        </>
      )}
    </p>
  );
}

export function GestionAreaCard({
  icon: Icon,
  titulo,
  usuario,
  fecha,
  span2 = false,
  children,
  sla,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  titulo: string;
  usuario?: string | null;
  fecha?: string | null;
  span2?: boolean;
  sla?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-[#e2e8f0] bg-white overflow-hidden flex flex-col sm:flex-row shadow-[0_1px_3px_rgba(15,23,42,0.05)] hover:shadow-[0_2px_6px_rgba(15,23,42,0.08)] transition-shadow duration-200 ${
        span2 ? "lg:col-span-2" : ""
      }`}>
      <div className="sm:w-[80px] flex-shrink-0 bg-gradient-to-b from-[#f0f4ff] to-[#f8faff] border-b sm:border-b-0 sm:border-r border-[#eef1f6] flex items-center justify-center py-3">
        <div className="w-12 h-12 rounded-xl bg-[#e7edfb] flex items-center justify-center">
          <Icon size={22} strokeWidth={2} className="text-brand-600" />
        </div>
      </div>
      <div className="sm:w-[360px] flex-shrink-0 border-b sm:border-b-0 sm:border-r border-[#eef1f6] px-3.5 py-3 flex flex-row sm:flex-col items-center justify-center sm:items-center gap-2 sm:gap-1">
        <p className="text-[13px] font-extrabold uppercase tracking-[0.05em] text-[#1e40af] m-0 text-center leading-tight">
          {titulo}
        </p>
        <GestorInfo usuario={usuario} fecha={fecha} className="mb-0 text-center hidden sm:block" />
        {sla}
      </div>
      <div className="flex-1 p-3.5 flex flex-col items-center gap-2.5 min-w-0">{children}</div>
    </div>
  );
}

export function SlaBadge({
  area,
}: {
  area: { dias_meta: number | null; dias_reales: number | null; procesada: boolean; vencida: boolean } | undefined;
}) {
  if (!area || !area.dias_meta) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
        area.vencida
          ? "text-red-700 bg-red-50 border border-red-200"
          : area.procesada
            ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
            : "text-amber-700 bg-amber-50 border border-amber-200"
      }`}>
      ⏱ {area.vencida ? "Vencida" : area.procesada ? `${area.dias_reales}d/${area.dias_meta}d` : `${area.dias_meta}d`}
    </span>
  );
}

export function DecisionDisplay({ texto }: { texto: string }) {
  const lineas = texto.split("\n").filter((linea) => linea.trim());
  const campos: { label: string; valor: string; esDecision?: boolean }[] = [];
  const otros: string[] = [];

  for (const linea of lineas) {
    const match = linea.match(/^\s*([^:]+?)\s*:\s*(.+)$/);
    if (match) {
      const label = match[1].trim().toUpperCase();
      campos.push({ label, valor: match[2].trim(), esDecision: label === "DECISIÓN" });
    } else {
      otros.push(linea);
    }
  }

  if (campos.length === 0) {
    return (
      <div className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 flex items-start gap-2">
        <Quote size={14} className="text-[#94a3b8] flex-shrink-0 mt-0.5 rotate-180" />
        <p className="text-[12px] text-[#334155] m-0 whitespace-pre-wrap text-center leading-relaxed italic flex-1">
          {texto}
        </p>
      </div>
    );
  }

  const decision = campos.find((campo) => campo.esDecision);

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      {decision && (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <span className="text-[14px] font-extrabold text-emerald-600 uppercase tracking-[0.06em]">
            {decision.valor}
          </span>
        </div>
      )}
      {campos.filter((campo) => !campo.esDecision).length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {campos
            .filter((campo) => !campo.esDecision)
            .map((campo, index) => (
              <div key={index} className="flex items-center gap-1.5 bg-[#f1f5f9] rounded-full px-3 py-1">
                <span className="text-[9.5px] text-[#94a3b8] uppercase tracking-wider font-semibold">
                  {campo.label}
                </span>
                <span className="text-[11px] font-bold text-[#0f172a]">{campo.valor}</span>
              </div>
            ))}
        </div>
      )}
      {otros.length > 0 && (
        <p className="text-[11px] text-[#64748b] m-0 whitespace-pre-wrap text-center leading-relaxed">
          {otros.join("\n")}
        </p>
      )}
    </div>
  );
}
