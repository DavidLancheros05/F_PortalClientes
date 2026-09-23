"use client";

import {
  Briefcase,
  Headphones,
  ShieldCheck,
  Users,
  Award,
  Clock,
} from "lucide-react";
import { WORKFLOW_ETAPA } from "@/constants/workflow-etapas";
import { GestionAreaCard, SlaBadge, DecisionDisplay } from "./GestionAreaCard";
import { SoportesAnalisis } from "@/components/SoportesAnalisis";

/** Código de etapa del workflow (EJN, ASC, OFC, CC1, CC2). */
export type EtapaCodigo = "EJN" | "ASC" | "OFC" | "CC1" | "CC2";

interface EntradaHistorial {
  etapaCodigo?: string;
  comentario?: string | null;
  usuarioNombre?: string | null;
  fecha?: string | null;
}

interface SolicitudBasica {
  sol_id: number;
  ejecutivo_nombre?: string;
  sol_fecha_gest_ejn?: string | null;
  sol_observacion_ejn?: string | null;
  sol_consumo_mensual_proyectado?: number | null;
  sol_toneladas_proyectadas?: number | null;
  sol_cupo_aprobado?: number;
  sol_plazo_pago?: number;
  sol_forma_pago?: string;
  sol_cupo_solicitado?: number | null;
}

interface EtapasPreviasBlockProps {
  /** Solicitud con los campos necesarios para renderizar contenido de cada etapa. */
  solicitud: SolicitudBasica;
  /** Historial de workflow (obtenido de useHistorialWorkflow). */
  historial: EntradaHistorial[];
  /**
   * Etapa actual — solo se muestran las etapas ANTERIORES a esta.
   * Si se omite, se muestran TODAS las etapas alcanzadas (incluida la
   * última), para vistas de solo lectura como el detalle de solicitud.
   */
  etapaActual?: EtapaCodigo;
  /** Mapa de SLA por etapa (resultado de calcularSlaArea). */
  slaMapa?: Record<
    string,
    { dias_meta: number | null; dias_reales: number | null; procesada: boolean; vencida: boolean } | undefined
  >;
  /** Función para abrir las tablas de cumplimiento (solo OFC). */
  onOpenTablasCumplimiento?: () => void;
  /** Función para generar la carta PDF (solo CC2). */
  onGenerarCartaPDF?: () => void;
  /** Estado de carga de la carta PDF (solo CC2). */
  generandoPDF?: boolean;
}

/**
 * Secuencia ordenada del flujo de crédito.
 */
const ETAPA_ORDEN: EtapaCodigo[] = ["EJN", "ASC", "OFC", "CC1", "CC2"];

/**
 * Mapa de configuración por etapa: icono, título, y cómo extraer el
 * contenido del historial / la solicitud.
 */
function buscarEntrada(
  historial: EntradaHistorial[],
  codigo: string,
): EntradaHistorial | undefined {
  const entradas = historial.filter((h) => h.etapaCodigo === codigo);
  return entradas.length > 0 ? entradas[entradas.length - 1] : undefined;
}

/**
 * Bloque de "Etapas previas" reutilizable en todas las páginas de gestión.
 * Muestra tarjetas `GestionAreaCard` de solo lectura para las etapas que
 * ya fueron completadas antes de la etapa actual.
 */
export function EtapasPreviasBlock({
  solicitud,
  historial,
  etapaActual,
  slaMapa,
  onOpenTablasCumplimiento,
  onGenerarCartaPDF,
  generandoPDF,
}: EtapasPreviasBlockProps) {
  const idxActual = etapaActual !== undefined ? ETAPA_ORDEN.indexOf(etapaActual as EtapaCodigo) : ETAPA_ORDEN.length;
  if (etapaActual && idxActual <= 0) return null; // EJN no tiene etapas previas

  const etapasPrevias = ETAPA_ORDEN.slice(0, idxActual);

  const hayContenido = etapasPrevias.some((codigo) => {
    if (codigo === "EJN") {
      return (
        solicitud.sol_observacion_ejn ||
        solicitud.sol_consumo_mensual_proyectado ||
        solicitud.sol_toneladas_proyectadas
      );
    }
    const entrada = buscarEntrada(historial, codigo);
    return !!entrada?.comentario;
  });

  if (!hayContenido) return null;

  return (
    <div className="px-7 py-4">
      <h2 className="text-[14px] font-extrabold text-[#0f172a] mb-4 flex items-center gap-[9px] tracking-[-0.01em]">
        <div className="w-[32px] h-[32px] rounded-[10px] bg-[#e7edfb] flex items-center justify-center flex-shrink-0 shadow-sm">
          <Clock size={16} strokeWidth={2.2} className="text-brand-600" />
        </div>
        Gestión por Área
      </h2>
      <div className="flex flex-col gap-3">
        {etapasPrevias.map((codigo) => {
          if (codigo === "EJN") return renderEJN(solicitud, slaMapa);
          if (codigo === "ASC")
            return renderASC(solicitud, historial, slaMapa);
          if (codigo === "OFC")
            return renderOFC(
              solicitud,
              historial,
              slaMapa,
              onOpenTablasCumplimiento,
            );
          if (codigo === "CC1")
            return renderCC1(solicitud, historial, slaMapa);
          if (codigo === "CC2")
            return renderCC2(
              solicitud,
              historial,
              slaMapa,
              onGenerarCartaPDF,
              generandoPDF,
            );
          return null;
        })}
      </div>
    </div>
  );
}

/* ── Renderers individuales por etapa ────────────────────────────── */

function renderEJN(
  solicitud: SolicitudBasica,
  slaMapa?: Record<string, { dias_meta: number | null; dias_reales: number | null; procesada: boolean; vencida: boolean } | undefined>,
) {
  const hayDatos =
    solicitud.sol_observacion_ejn ||
    solicitud.sol_consumo_mensual_proyectado ||
    solicitud.sol_toneladas_proyectadas;
  if (!hayDatos) return null;

  return (
    <GestionAreaCard
      key="EJN"
      icon={Briefcase}
      titulo="Ejecutivo de Negocios"
      usuario={solicitud.ejecutivo_nombre}
      fecha={solicitud.sol_fecha_gest_ejn}
      sla={<SlaBadge area={slaMapa?.["EJN"]} />}>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {solicitud.sol_consumo_mensual_proyectado && (
          <div className="flex items-center gap-2 bg-emerald-50 rounded-xl px-3.5 py-2 border border-emerald-200">
            <div>
              <p className="text-[9px] text-emerald-700 uppercase tracking-wider font-semibold m-0">
                Consumo Mensual
              </p>
              <p className="text-[13px] font-extrabold text-emerald-800 m-0 leading-tight">
                ${Number(solicitud.sol_consumo_mensual_proyectado).toLocaleString("es-CO")}
              </p>
            </div>
          </div>
        )}
        {solicitud.sol_toneladas_proyectadas && (
          <div className="flex items-center gap-2 bg-[#f1f5f9] rounded-xl px-3.5 py-2 border border-[#e2e8f0]">
            <div>
              <p className="text-[9px] text-[#64748b] uppercase tracking-wider font-semibold m-0">
                Toneladas
              </p>
              <p className="text-[13px] font-extrabold text-[#0f172a] m-0 leading-tight">
                {Number(solicitud.sol_toneladas_proyectadas).toLocaleString("es-CO")} Ton
              </p>
            </div>
          </div>
        )}
      </div>
      {solicitud.sol_observacion_ejn && (
        <p className="text-[11.5px] text-[#475569] m-0 whitespace-pre-wrap text-center leading-relaxed">
          {solicitud.sol_observacion_ejn}
        </p>
      )}
    </GestionAreaCard>
  );
}

function renderASC(
  solicitud: SolicitudBasica,
  historial: EntradaHistorial[],
  slaMapa?: Record<string, { dias_meta: number | null; dias_reales: number | null; procesada: boolean; vencida: boolean } | undefined>,
) {
  const entrada = buscarEntrada(historial, "ASC");
  if (!entrada?.comentario) return null;

  return (
    <GestionAreaCard
      key="ASC"
      icon={Headphones}
      titulo="Auxiliar Servicio al Cliente"
      usuario={entrada.usuarioNombre}
      fecha={entrada.fecha}
      sla={<SlaBadge area={slaMapa?.["ASC"]} />}>
      <DecisionDisplay texto={entrada.comentario} />
    </GestionAreaCard>
  );
}

function renderOFC(
  solicitud: SolicitudBasica,
  historial: EntradaHistorial[],
  slaMapa?: Record<string, { dias_meta: number | null; dias_reales: number | null; procesada: boolean; vencida: boolean } | undefined>,
  onOpenTablasCumplimiento?: () => void,
) {
  const entrada = buscarEntrada(historial, "OFC");
  if (!entrada?.comentario) return null;

  return (
    <GestionAreaCard
      key="OFC"
      icon={ShieldCheck}
      titulo="Oficial de Cumplimiento"
      usuario={entrada.usuarioNombre}
      fecha={entrada.fecha}
      sla={<SlaBadge area={slaMapa?.["OFC"]} />}>
      <DecisionDisplay texto={entrada.comentario} />
      <SoportesAnalisis
        solicitudId={solicitud.sol_id}
        wetId={WORKFLOW_ETAPA.OFC.id}
        titulo="Soportes de Oficial de Cumplimiento"
        readOnly
      />
      {onOpenTablasCumplimiento && (
        <button
          onClick={onOpenTablasCumplimiento}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-md hover:bg-brand-100 transition-colors">
          Ver tablas de cumplimiento
        </button>
      )}
    </GestionAreaCard>
  );
}

function renderCC1(
  solicitud: SolicitudBasica,
  historial: EntradaHistorial[],
  slaMapa?: Record<string, { dias_meta: number | null; dias_reales: number | null; procesada: boolean; vencida: boolean } | undefined>,
) {
  const entrada = buscarEntrada(historial, "CC1");
  if (!entrada?.comentario) return null;

  return (
    <GestionAreaCard
      key="CC1"
      icon={Users}
      titulo="Comité de Crédito 1"
      usuario={entrada.usuarioNombre}
      fecha={entrada.fecha}
      sla={<SlaBadge area={slaMapa?.["CC1"]} />}>
      <DecisionDisplay texto={entrada.comentario} />
      <SoportesAnalisis
        solicitudId={solicitud.sol_id}
        wetId={WORKFLOW_ETAPA.CC1.id}
        titulo="Soportes de Comité de Crédito 1"
        readOnly
      />
    </GestionAreaCard>
  );
}

function renderCC2(
  solicitud: SolicitudBasica,
  historial: EntradaHistorial[],
  slaMapa?: Record<string, { dias_meta: number | null; dias_reales: number | null; procesada: boolean; vencida: boolean } | undefined>,
  onGenerarCartaPDF?: () => void,
  generandoPDF?: boolean,
) {
  const entrada = buscarEntrada(historial, "CC2");
  if (!entrada?.comentario) return null;

  return (
    <GestionAreaCard
      key="CC2"
      icon={Award}
      titulo="Comité de Crédito 2"
      usuario={entrada.usuarioNombre}
      fecha={entrada.fecha}
      span2={!!solicitud.sol_cupo_aprobado}
      sla={<SlaBadge area={slaMapa?.["CC2"]} />}>
      <DecisionDisplay texto={entrada.comentario} />

      {solicitud.sol_cupo_aprobado && (
        <div className="rounded-lg p-3.5 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 w-full">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-emerald-800 m-0">
              Condiciones Financieras Aprobadas
            </p>
            {onGenerarCartaPDF && (
              <button
                onClick={onGenerarCartaPDF}
                disabled={generandoPDF}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10.5px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition-all hover:shadow disabled:opacity-50 disabled:cursor-not-allowed">
                {generandoPDF ? "Generando..." : "Carta PDF"}
              </button>
            )}
          </div>
          <div className="flex items-center justify-center gap-2.5 bg-white rounded-xl px-4 py-3 border border-emerald-200 mb-3">
            <div className="text-center">
              <p className="text-[9px] text-emerald-700 uppercase tracking-wider font-semibold m-0">
                Cupo Aprobado
              </p>
              <p className="text-[18px] font-extrabold text-emerald-700 m-0 leading-tight">
                ${Number(solicitud.sol_cupo_aprobado).toLocaleString("es-CO")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/80 rounded-full px-3 py-1 border border-emerald-200">
              <span className="text-[9.5px] text-[#94a3b8] uppercase tracking-wider font-semibold">
                Plazo
              </span>
              <span className="text-[11px] font-extrabold text-emerald-700">
                {solicitud.sol_plazo_pago ? `${solicitud.sol_plazo_pago} días` : "-"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/80 rounded-full px-3 py-1 border border-emerald-200">
              <span className="text-[9.5px] text-[#94a3b8] uppercase tracking-wider font-semibold">
                Forma de Pago
              </span>
              <span className="text-[11px] font-extrabold text-emerald-700">
                {solicitud.sol_forma_pago || "-"}
              </span>
            </div>
          </div>
        </div>
      )}
    </GestionAreaCard>
  );
}
