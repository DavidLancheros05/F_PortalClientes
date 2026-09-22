"use client";

import { useEffect, useState } from "react";
import {
  indicadoresService,
  type SolicitudTimeline,
  type SlaGeneral,
  type AreaTimeline,
} from "@/services/indicadores/indicadores.service";
import { ModalPortal } from "@/components/modals/ModalesGenericos";
import {
  X,
  FileSearch,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Minus,
  Building2,
  Users,
  ListChecks,
  ThumbsUp,
  AlarmClock,
} from "lucide-react";

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  PENDIENTE: "Pendiente",
  REVISION: "En revisión",
  COMPLETADA: "Completada",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

const ESTADO_BADGE_CLASSES: Record<string, string> = {
  APROBADA: "bg-green-100 text-green-700",
  RECHAZADA: "bg-red-100 text-red-700",
  PENDIENTE: "bg-blue-100 text-blue-700",
  REVISION: "bg-amber-100 text-amber-700",
  COMPLETADA: "bg-teal-100 text-teal-700",
  BORRADOR: "bg-gray-100 text-gray-600",
};

const ESTADO_ACCENT_CLASSES: Record<string, string> = {
  APROBADA: "bg-green-500",
  RECHAZADA: "bg-red-500",
  PENDIENTE: "bg-blue-500",
  REVISION: "bg-amber-400",
  COMPLETADA: "bg-teal-500",
  BORRADOR: "bg-gray-300",
};

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ESTADO_BADGE_CLASSES[estado] ?? "bg-gray-100 text-gray-600"}`}>
      {ESTADO_LABELS[estado] ?? estado}
    </span>
  );
}

function ResumenTile({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  color: "gray" | "green" | "red";
}) {
  const colors = {
    gray: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", icon: "text-gray-400" },
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: "text-green-500" },
    red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-600", icon: "text-red-500" },
  }[color];

  return (
    <div className={`flex items-center gap-3 rounded-xl border ${colors.border} ${colors.bg} px-4 py-3`}>
      <Icon className={`w-5 h-5 shrink-0 ${colors.icon}`} />
      <div className="min-w-0">
        <p className={`text-xl font-bold leading-none ${colors.text}`}>{value}</p>
        <p className="text-xs text-gray-400 mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

function SlaGeneralCard({ sla }: { sla: SlaGeneral }) {
  const { dias_meta, dias_reales, procesada, vencida, fecha_estimada, fecha_real } = sla;

  if (!fecha_estimada) return null;

  const meta = dias_meta ?? 1;
  const reales = dias_reales ?? 0;
  const pctBarra = procesada ? Math.min((reales / meta) * 100, 100) : 0;
  const excede = procesada && vencida;
  const excesoDias = excede ? Math.max(reales - meta, 1) : 0;

  const colorBarra = !procesada
    ? "bg-gray-300"
    : excede
      ? "bg-red-500"
      : reales === meta
        ? "bg-amber-400"
        : "bg-emerald-500";

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(30,64,175,0.08)] border border-[#dbe4f5] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#dbe4f5] bg-[#f4f7ff] flex items-center gap-3">
        <div className="p-2.5 bg-brand-600 rounded-xl shrink-0 shadow-sm">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-600 m-0 mb-0.5">
            Tiempo comprometido
          </p>
          <h3 className="text-base font-extrabold text-gray-800">SLA General (Cliente)</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Plazo total comunicado al cliente desde el envío de la solicitud
          </p>
        </div>
      </div>
      <div className="px-5 py-5">
        <div className="relative h-8 bg-[#edf1f7] rounded-full overflow-hidden border border-[#e2e8f0]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorBarra}`}
            style={{ width: `${pctBarra}%` }}
          />
          <div className="absolute right-0 top-0 h-full w-0.5 bg-gray-300" />
          {procesada ? (
            <div className="absolute inset-0 flex items-center px-3">
              <span className="text-xs font-semibold text-white drop-shadow-sm">{reales} d</span>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center px-3">
              <span className="text-xs text-gray-400">En curso</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {procesada ? (
              <>
                {excede ? (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <XCircle className="w-3 h-3" />+{excesoDias} d sobre el SLA general
                  </span>
                ) : reales === meta ? (
                  <span className="flex items-center gap-1 text-amber-500 font-medium">
                    <Clock className="w-3 h-3" />
                    Exacto en el SLA general
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle className="w-3 h-3" />
                    {meta - reales} d antes del SLA general
                  </span>
                )}
                {fecha_real && <span className="text-gray-400">· Resuelta: {fecha_real}</span>}
              </>
            ) : (
              <span className="text-gray-400">Aún no resuelta · meta: {fecha_estimada}</span>
            )}
          </div>
          <span className="text-xs text-gray-400">Meta: {meta} d</span>
        </div>
      </div>
    </div>
  );
}

function AreaBar({ area }: { area: AreaTimeline }) {
  const { dias_meta, dias_reales, procesada, vencida, label, fecha_estimada, fecha_real } = area;

  if (!fecha_estimada && !procesada) {
    return (
      <div className="flex items-center gap-4 py-3 border-b last:border-0">
        <div className="w-44 shrink-0">
          <p className="text-sm font-medium text-gray-400">{label}</p>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full h-6 flex items-center px-3">
            <Minus className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400 ml-1">Sin asignar</span>
          </div>
        </div>
      </div>
    );
  }

  const meta = dias_meta ?? 1;
  const reales = dias_reales ?? 0;
  const pctBarra = procesada ? Math.min((reales / meta) * 100, 100) : 0;
  const excede = procesada && reales > meta;
  const excesoDias = excede ? reales - meta : 0;

  const colorBarra = !procesada
    ? "bg-gray-300"
    : excede
      ? "bg-red-500"
      : reales === meta
        ? "bg-amber-400"
        : "bg-green-500";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-4 border-b border-[#eef1f6] last:border-0">
      <div className="w-full sm:w-44 shrink-0">
        <p className={`text-sm font-medium ${procesada ? "text-gray-800" : "text-gray-400"}`}>{label}</p>
        {fecha_estimada && <p className="text-xs text-gray-400 mt-0.5">Meta: {fecha_estimada}</p>}
      </div>
      <div className="flex-1 w-full min-w-0">
        <div className="relative h-7 bg-[#f1f4f8] rounded-full overflow-hidden border border-[#e5e7eb]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorBarra}`}
            style={{ width: `${pctBarra}%` }}
          />
          <div className="absolute right-0 top-0 h-full w-0.5 bg-gray-300" />
          {procesada && (
            <div className="absolute inset-0 flex items-center px-3">
              <span className="text-xs font-semibold text-white drop-shadow-sm">{reales} d</span>
            </div>
          )}
          {!procesada && fecha_estimada && (
            <div className="absolute inset-0 flex items-center px-3">
              <span className="text-xs text-gray-400">Pendiente</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3 text-xs">
            {procesada ? (
              <>
                {excede ? (
                  <span className="flex items-center gap-1 text-red-600 font-medium">
                    <XCircle className="w-3 h-3" />+{excesoDias} d sobre la meta
                  </span>
                ) : reales === meta ? (
                  <span className="flex items-center gap-1 text-amber-500 font-medium">
                    <Clock className="w-3 h-3" />
                    Exacto en la meta
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle className="w-3 h-3" />
                    {meta - reales} d antes de la meta
                  </span>
                )}
                {fecha_real && <span className="text-gray-400">· Respondido: {fecha_real}</span>}
              </>
            ) : (
              <span className="text-gray-400">Aún no respondida</span>
            )}
          </div>
          <span className="text-xs text-gray-400">Meta: {meta} d</span>
        </div>
      </div>
      <div className="w-6 shrink-0 self-end sm:self-auto">
        {!procesada ? (
          <Clock className="w-4 h-4 text-gray-300" />
        ) : excede ? (
          <XCircle className="w-4 h-4 text-red-500" />
        ) : (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
      </div>
    </div>
  );
}

export function VerSlaModal({ numero, onClose }: { numero: string; onClose: () => void }) {
  const [solicitud, setSolicitud] = useState<SolicitudTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    indicadoresService
      .getSolicitudTimeline({ numero })
      .then((res) => {
        if (!res) setError("Solicitud no encontrada");
        else setSolicitud(res);
      })
      .catch(() => setError("Error al consultar la solicitud"))
      .finally(() => setLoading(false));
  }, [numero]);

  const areasConDatos = solicitud?.areas.filter((a) => a.fecha_estimada || a.procesada) ?? [];
  const areasTotal = areasConDatos.length;
  const areasProcesadas = areasConDatos.filter((a) => a.procesada).length;
  const areasATiempo = areasConDatos.filter((a) => a.procesada && !a.vencida).length;
  const areasVencidas = areasConDatos.filter((a) => a.procesada && a.vencida).length;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-[22px] shadow-[0_24px_70px_rgba(15,23,42,0.22)] w-full max-w-4xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 border border-white/70">
          <div className="bg-brand-gradient rounded-t-[22px] overflow-hidden px-7 py-[22px] flex items-center gap-4 flex-shrink-0">
            <div className="w-[42px] h-[42px] rounded-xl bg-white/16 flex items-center justify-center flex-shrink-0">
              <FileSearch size={20} className="text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[19px] font-extrabold text-white tracking-[-0.01em] m-0 truncate">SLA — {numero}</h2>
              <p className="text-[12.5px] text-[#c3d5f5] mt-[3px] m-0 truncate">
                SLA General (Cliente) y SLA por Cargo (Interno)
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-[34px] h-[34px] rounded-[10px] bg-white/14 hover:bg-white/20 flex items-center justify-center text-white flex-shrink-0 transition-colors">
              <X size={16} strokeWidth={2.3} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-5 bg-[#f7f9fc]">
            {loading && (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin" />
              </div>
            )}

            {!loading && error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {!loading && solicitud && (
              <>
                <div className="bg-white rounded-2xl shadow-[0_6px_20px_rgba(15,23,42,0.06)] border border-[#e5eaf2] overflow-hidden">
                  <div className={`h-1.5 ${ESTADO_ACCENT_CLASSES[solicitud.estado] ?? "bg-gray-300"}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Solicitud</p>
                        <h3 className="text-xl font-bold text-gray-900 mt-0.5">{solicitud.numero_solicitud}</h3>
                        <p className="text-gray-600 mt-1">{solicitud.razon_social || "—"}</p>
                        {solicitud.nit && <p className="text-sm text-gray-400">NIT: {solicitud.nit}</p>}
                      </div>
                      <div className="text-right space-y-1.5 shrink-0">
                        <EstadoBadge estado={solicitud.estado} />
                        {solicitud.fecha_envio && (
                          <p className="text-xs text-gray-400">Enviada: {solicitud.fecha_envio}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-[#eef1f6]">
                      <ResumenTile
                        icon={ListChecks}
                        value={areasProcesadas}
                        label={`de ${areasTotal} áreas procesadas`}
                        color="gray"
                      />
                      <ResumenTile icon={ThumbsUp} value={areasATiempo} label="a tiempo" color="green" />
                      <ResumenTile icon={AlarmClock} value={areasVencidas} label="vencidas" color="red" />
                    </div>
                  </div>
                </div>

                <SlaGeneralCard sla={solicitud.sla_general} />

                <div className="bg-white rounded-2xl shadow-[0_6px_20px_rgba(15,23,42,0.05)] border border-[#e5eaf2] overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#eef1f6] bg-[#fbfcfe] flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-xl shrink-0">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 m-0 mb-0.5">
                        Seguimiento interno
                      </p>
                      <h3 className="text-base font-extrabold text-gray-800">SLA por Cargo (Interno)</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        La barra llena al 100% representa el tiempo máximo estimado para cada área
                      </p>
                    </div>
                  </div>
                  <div className="px-4 sm:px-5 py-2 divide-y divide-[#eef1f6]">
                    {solicitud.areas.map((area) => (
                      <AreaBar key={area.area} area={area} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
