"use client";

import { useState } from "react";
import { Building2, DollarSign, FileText, Info } from "lucide-react";
import { PdfIcon } from "@/components/icons/FileIcons";
import { formatDate } from "@/lib/date-utils";
import { DiasRestantesBadge } from "@/components/badges/DiasRestantesBadge";
import { VerSlaModal } from "@/components/solicitudes/VerSlaModal";

export interface SolicitudInfoCardSla {
  dias_meta: number;
  dias_reales: number | null;
  procesada: boolean;
  vencida: boolean;
}

function slaCalendarDate(value: string | Date, dateOnly = false) {
  const raw = value instanceof Date ? value.toISOString() : value;
  if (dateOnly && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function construirSlaGlobal(
  fechaEnvio?: string | null,
  fechaEstimada?: string | null,
  fechaReal?: string | null,
): SolicitudInfoCardSla | null {
  if (!fechaEnvio || !fechaEstimada) return null;
  const envio = new Date(fechaEnvio);
  const estimada = new Date(fechaEstimada);
  if (Number.isNaN(envio.getTime()) || Number.isNaN(estimada.getTime())) return null;
  const real = fechaReal ? new Date(fechaReal) : null;
  const procesada = !!real && !Number.isNaN(real.getTime());
  const diasMeta = Math.max(0, Math.ceil((estimada.getTime() - envio.getTime()) / 86400000));
  const diasReales = procesada ? Math.max(0, Math.ceil((real!.getTime() - envio.getTime()) / 86400000)) : null;
  const realCalendarDate = real ? slaCalendarDate(real) : null;
  const estimatedCalendarDate = slaCalendarDate(estimada, true);
  return {
    dias_meta: diasMeta,
    dias_reales: diasReales,
    procesada,
    vencida: procesada && !!realCalendarDate && !!estimatedCalendarDate && realCalendarDate > estimatedCalendarDate,
  };
}

interface SolicitudInfoCardProps {
  tipoSolicitud: string;
  loadingTipoSolicitud?: boolean;
  estadoLabel: string;
  estadoColor: string;
  estadoBackground: string;
  numeroSolicitud?: string;
  estadoId?: number;
  fechaEnvio?: string | null;
  fechaEstimada?: string | null;
  slaGlobal?: SolicitudInfoCardSla | null;
  onShowSla?: () => void;
  onOpenFormulario?: () => void;
  onOpenPdf?: () => void;
  pdfLoading?: boolean;
  clienteNombre: string;
  clienteNit?: string | null;
  solicitaCredito: boolean | null;
  montoSolicitado?: string | null;
  formaPagoSolicitada?: string | null;
  mostrarCredito?: boolean;
}

export function SolicitudInfoCard({
  tipoSolicitud,
  loadingTipoSolicitud = false,
  estadoLabel,
  estadoColor,
  estadoBackground,
  numeroSolicitud,
  fechaEnvio,
  fechaEstimada,
  slaGlobal,
  onShowSla,
  onOpenFormulario,
  onOpenPdf,
  pdfLoading = false,
  clienteNombre,
  clienteNit,
  solicitaCredito,
  montoSolicitado,
  formaPagoSolicitada,
  mostrarCredito = true,
}: SolicitudInfoCardProps) {
  const [showSlaModal, setShowSlaModal] = useState(false);
  const abrirSla = onShowSla || (numeroSolicitud ? () => setShowSlaModal(true) : undefined);

  return (
    <>
      <div className="rounded-xl border border-[#e2e8f0] bg-white mb-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] flex flex-col sm:flex-row overflow-hidden">
        <div className="sm:w-[80px] flex-shrink-0 bg-gradient-to-b from-[#f0f4ff] to-[#f8faff] border-b sm:border-b-0 sm:border-r border-[#eef1f6] flex items-center justify-center py-3">
          <div className="w-12 h-12 rounded-xl bg-[#e7edfb] flex items-center justify-center">
            <Info size={22} strokeWidth={2} className="text-brand-600" />
          </div>
        </div>

        <div className="sm:w-[360px] flex-shrink-0 border-b sm:border-b-0 sm:border-r border-[#eef1f6] px-3.5 py-3 flex flex-row sm:flex-col items-center justify-center sm:items-center gap-2 sm:gap-1.5">
          <p className="text-xs font-extrabold uppercase tracking-[0.05em] text-[#1e40af] m-0 text-center leading-tight">
            Información de la Solicitud
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                tipoSolicitud === "Ampliación de Cupo" ? "text-emerald-800 bg-emerald-100" : "text-blue-800 bg-blue-100"
              }`}>
              {loadingTipoSolicitud ? "..." : tipoSolicitud}
            </span>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ color: estadoColor, background: estadoBackground }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: estadoColor }} />
              {estadoLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded-full">
              📅 Envío: {formatDate(fechaEnvio)}
            </span>
            {fechaEstimada && !slaGlobal && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#64748b] bg-[#f8fafc] px-2 py-0.5 rounded-full border border-[#e2e8f0]">
                SLA: {formatDate(fechaEstimada)}
                <DiasRestantesBadge fecha={fechaEstimada} />
              </span>
            )}
            {slaGlobal && slaGlobal.dias_meta > 0 && (
              <button
                onClick={abrirSla}
                disabled={!abrirSla}
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 disabled:cursor-default ${
                  slaGlobal.vencida
                    ? "text-red-700 bg-red-50"
                    : slaGlobal.procesada
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-amber-700 bg-amber-50"
                }`}>
                ⏱ SLA:{" "}
                {slaGlobal.vencida
                  ? "Vencida"
                  : slaGlobal.procesada
                    ? `${slaGlobal.dias_reales}d / ${slaGlobal.dias_meta}d`
                    : `${slaGlobal.dias_meta}d total`}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {onOpenPdf && (
              <button
                onClick={onOpenPdf}
                disabled={pdfLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <PdfIcon />
                {pdfLoading ? "..." : "PDF"}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            <div className="flex items-center gap-2">
              <Building2 size={13} strokeWidth={2.2} className="text-brand-500 flex-shrink-0" />
              <div>
                <div>
                  <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider font-semibold">Cliente: </span>
                  <span className="text-[12px] font-bold text-[#0f172a]">{clienteNombre || "-"}</span>
                </div>
                {clienteNit && <div className="text-[11px] text-[#64748b] mt-0.5">NIT: {clienteNit}</div>}
              </div>
            </div>

            <button
              onClick={onOpenFormulario}
              disabled={!onOpenFormulario}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg hover:bg-cyan-100 transition-colors">
              <FileText className="h-3.5 w-3.5" />
              Formulario
            </button>

            {mostrarCredito && tipoSolicitud !== "Ampliación de Cupo" && (
              <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3.5 py-2 border border-emerald-200">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <DollarSign size={14} strokeWidth={2.5} className="text-emerald-600" />
                </div>
                <div className="flex items-center justify-between gap-4 min-w-0 flex-1">
                  <div>
                    <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider font-semibold">
                      Cupo de Crédito
                    </span>
                    <p className="text-[14px] font-extrabold text-emerald-700 m-0 leading-tight">
                      {solicitaCredito ? montoSolicitado || "monto no especificado" : "No solicita"}
                    </p>
                  </div>
                  {solicitaCredito && formaPagoSolicitada && (
                    <span className="text-[10px] text-[#64748b] font-semibold text-right whitespace-nowrap">
                      {formaPagoSolicitada}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {!onShowSla && showSlaModal && numeroSolicitud && (
        <VerSlaModal numero={numeroSolicitud} onClose={() => setShowSlaModal(false)} />
      )}
    </>
  );
}
