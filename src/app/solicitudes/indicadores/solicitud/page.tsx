"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import {
  indicadoresService,
  type SolicitudTimeline,
  type SolicitudSlaListado,
  type AreaTimeline,
  type SlaGeneral,
} from "@/services/indicadores/indicadores.service";
import { ModalPortal } from "@/components/modals/ModalesGenericos";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import {
  Search,
  X,
  Eye,
  FileSearch,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Minus,
  Building2,
  Users,
  Calendar,
  MapPin,
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

const SLA_FILTROS = [
  { value: "", label: "Todas" },
  { value: "a_tiempo", label: "A tiempo" },
  { value: "en_riesgo", label: "En riesgo" },
  { value: "vencida", label: "Vencidas" },
] as const;

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ESTADO_BADGE_CLASSES[estado] ?? "bg-gray-100 text-gray-600"}`}
    >
      {ESTADO_LABELS[estado] ?? estado}
    </span>
  );
}

// % de cumplimiento del SLA general de la solicitud: 100 = a tiempo (o en
// curso sin vencer todavía), decrece linealmente con los días de atraso
// una vez se vence (ver indicadores.service.ts::calcularSlaListado).
function PctSlaBadge({
  pct,
  enRiesgo,
}: {
  pct: number;
  enRiesgo: boolean;
}) {
  const color =
    pct < 50
      ? "bg-red-100 text-red-700"
      : pct < 80
        ? "bg-amber-100 text-amber-700"
        : "bg-green-100 text-green-700";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}
      title={enRiesgo ? "En riesgo de vencer" : undefined}
    >
      {enRiesgo && <AlertTriangle className="w-3 h-3" />}
      {pct}%
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

// SLA general: el plazo total que se le comunica al cliente desde que
// envía la solicitud (fecha estimada de la última etapa, encadenada con
// días hábiles/festivos), a diferencia del SLA por cargo de abajo, que es
// interno y sirve para ver qué área específica incumple.
function SlaGeneralCard({ sla }: { sla: SlaGeneral }) {
  const { dias_meta, dias_reales, procesada, vencida, fecha_estimada, fecha_real } = sla;

  if (!fecha_estimada) {
    return null;
  }

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
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="px-5 py-4 border-b bg-[#eef3ff] flex items-center gap-3">
        <div className="p-2 bg-brand-600/10 rounded-xl shrink-0">
          <Building2 className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-800">
            SLA General (Cliente)
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Plazo total comunicado al cliente desde el envío de la solicitud
          </p>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="relative h-7 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorBarra}`}
            style={{ width: `${pctBarra}%` }}
          />
          <div className="absolute right-0 top-0 h-full w-0.5 bg-gray-300" />
          {procesada ? (
            <div className="absolute inset-0 flex items-center px-3">
              <span className="text-xs font-semibold text-white drop-shadow-sm">
                {reales} d
              </span>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center px-3">
              <span className="text-xs text-gray-400">En curso</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-xs">
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
                {fecha_real && (
                  <span className="text-gray-400">· Resuelta: {fecha_real}</span>
                )}
              </>
            ) : (
              <span className="text-gray-400">
                Aún no resuelta · meta: {fecha_estimada}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">Meta: {meta} d</span>
        </div>
      </div>
    </div>
  );
}

function AreaBar({ area }: { area: AreaTimeline }) {
  const {
    dias_meta,
    dias_reales,
    procesada,
    vencida,
    label,
    fecha_estimada,
    fecha_real,
  } = area;

  // Si no hay fechas estimadas, el área no aplica a esta solicitud
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

  // pct de la barra: días reales / días meta * 100 (puede superar 100%)
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
    <div className="flex items-center gap-4 py-3 border-b last:border-0">
      {/* Nombre área */}
      <div className="w-44 shrink-0">
        <p
          className={`text-sm font-medium ${procesada ? "text-gray-800" : "text-gray-400"}`}
        >
          {label}
        </p>
        {fecha_estimada && (
          <p className="text-xs text-gray-400 mt-0.5">Meta: {fecha_estimada}</p>
        )}
      </div>

      {/* Barra + números */}
      <div className="flex-1">
        <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
          {/* Barra de progreso */}
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorBarra}`}
            style={{ width: `${pctBarra}%` }}
          />
          {/* Línea de meta al 100% */}
          <div className="absolute right-0 top-0 h-full w-0.5 bg-gray-300" />
          {/* Texto dentro o fuera de la barra */}
          {procesada && (
            <div className="absolute inset-0 flex items-center px-3">
              <span className="text-xs font-semibold text-white drop-shadow-sm">
                {reales} d
              </span>
            </div>
          )}
          {!procesada && fecha_estimada && (
            <div className="absolute inset-0 flex items-center px-3">
              <span className="text-xs text-gray-400">Pendiente</span>
            </div>
          )}
        </div>

        {/* Leyenda debajo */}
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
                {fecha_real && (
                  <span className="text-gray-400">
                    · Respondido: {fecha_real}
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-400">Aún no respondida</span>
            )}
          </div>
          <span className="text-xs text-gray-400">Meta: {meta} d</span>
        </div>
      </div>

      {/* Icono estado */}
      <div className="w-6 shrink-0">
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

// Modal "Ver SLA" de una solicitud puntual: reusa el mismo detalle
// (SLA General + SLA por Cargo) que antes vivía a página completa, ahora
// como acción desde la fila del listado.
function VerSlaModal({
  numero,
  onClose,
}: {
  numero: string;
  onClose: () => void;
}) {
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

  const areasConDatos =
    solicitud?.areas.filter((a) => a.fecha_estimada || a.procesada) ?? [];
  const areasTotal = areasConDatos.length;
  const areasProcesadas = areasConDatos.filter((a) => a.procesada).length;
  const areasATiempo = areasConDatos.filter(
    (a) => a.procesada && !a.vencida,
  ).length;
  const areasVencidas = areasConDatos.filter(
    (a) => a.procesada && a.vencida,
  ).length;

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-[22px] shadow-[0_20px_50px_rgba(15,23,42,0.15)] w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
          <div className="bg-brand-gradient rounded-t-[22px] overflow-hidden px-7 py-[22px] flex items-center gap-4 flex-shrink-0">
            <div className="w-[42px] h-[42px] rounded-xl bg-white/16 flex items-center justify-center flex-shrink-0">
              <FileSearch size={20} className="text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[19px] font-extrabold text-white tracking-[-0.01em] m-0 truncate">
                SLA — {numero}
              </h2>
              <p className="text-[12.5px] text-[#c3d5f5] mt-[3px] m-0 truncate">
                SLA General (Cliente) y SLA por Cargo (Interno)
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-[34px] h-[34px] rounded-[10px] bg-white/14 hover:bg-white/20 flex items-center justify-center text-white flex-shrink-0 transition-colors"
            >
              <X size={16} strokeWidth={2.3} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-7 space-y-4 bg-gray-50">
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
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div
                  className={`h-1.5 ${ESTADO_ACCENT_CLASSES[solicitud.estado] ?? "bg-gray-300"}`}
                />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide">
                        Solicitud
                      </p>
                      <h3 className="text-xl font-bold text-gray-900 mt-0.5">
                        {solicitud.numero_solicitud}
                      </h3>
                      <p className="text-gray-600 mt-1">
                        {solicitud.razon_social || "—"}
                      </p>
                      {solicitud.nit && (
                        <p className="text-sm text-gray-400">
                          NIT: {solicitud.nit}
                        </p>
                      )}
                    </div>
                    <div className="text-right space-y-1.5 shrink-0">
                      <EstadoBadge estado={solicitud.estado} />
                      {solicitud.centro_operacion && (
                        <p className="flex items-center justify-end gap-1 text-xs text-gray-400">
                          <MapPin className="w-3 h-3" />
                          {solicitud.centro_operacion}
                        </p>
                      )}
                      {solicitud.fecha_envio && (
                        <p className="flex items-center justify-end gap-1 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          Enviada: {solicitud.fecha_envio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t">
                    <ResumenTile
                      icon={ListChecks}
                      value={areasProcesadas}
                      label={`de ${areasTotal} áreas procesadas`}
                      color="gray"
                    />
                    <ResumenTile
                      icon={ThumbsUp}
                      value={areasATiempo}
                      label="a tiempo"
                      color="green"
                    />
                    <ResumenTile
                      icon={AlarmClock}
                      value={areasVencidas}
                      label="vencidas"
                      color="red"
                    />
                  </div>
                </div>
              </div>

              <SlaGeneralCard sla={solicitud.sla_general} />

              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-xl shrink-0">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">
                      SLA por Cargo (Interno)
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      La barra llena al 100% representa el tiempo máximo
                      estimado para cada área
                    </p>
                  </div>
                </div>
                <div className="px-5 py-2 divide-y divide-gray-50">
                  {solicitud.areas.map((area) => (
                    <AreaBar key={area.area} area={area} />
                  ))}
                </div>
              </div>
            </>
          )}
          </div>

          <div className="flex gap-3 justify-end px-7 py-5 border-t border-[#eef1f6] flex-shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export default function IndicadoresSolicitudPage() {
  const router = useRouter();
  const { loading: authLoading } = useContext(AuthContext);
  const [numero, setNumero] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [estado, setEstado] = useState("");
  const [sla, setSla] = useState<"" | "a_tiempo" | "en_riesgo" | "vencida">("");
  const [listado, setListado] = useState<SolicitudSlaListado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalNumero, setModalNumero] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  async function buscar() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (numero.trim()) params.numero = numero.trim();
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      if (estado) params.estado = estado;
      if (sla) params.sla = sla;
      const res = await indicadoresService.getListadoSla(params);
      setListado(res);
    } catch {
      setError("Error al consultar el listado de SLA. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") buscar();
  }

  function limpiarFiltros() {
    setNumero("");
    setFechaDesde("");
    setFechaHasta("");
    setEstado("");
    setSla("");
    setError(null);
    buscar();
  }

  async function exportarExcel() {
    if (listado.length === 0) return;

    const XLSX = await import("xlsx");

    const header = [
      "N° Solicitud",
      "Cliente",
      "Fecha envío",
      "Estado",
      "Fecha estimada SLA general",
      "Fecha real SLA general",
      "Días meta",
      "Días reales",
      "% SLA",
      "Vencida",
      "En riesgo",
    ];

    const data = listado.map((s) => [
      s.numero_solicitud,
      s.razon_social || "-",
      s.fecha_envio,
      ESTADO_LABELS[s.estado] ?? s.estado,
      s.sla_general.fecha_estimada || "-",
      s.sla_general.fecha_real || "-",
      s.sla_general.dias_meta ?? "-",
      s.sla_general.dias_reales ?? "-",
      s.pct_cumplimiento,
      s.sla_general.vencida ? "Sí" : "No",
      s.en_riesgo ? "Sí" : "No",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SLA por solicitud");

    XLSX.writeFile(
      wb,
      `sla-por-solicitud-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={FileSearch}
          eyebrow="Indicadores"
          title="SLA por Solicitud"
          subtitle="Busca y filtra el cumplimiento del SLA general de cada solicitud"
          onBack={() => router.push("/solicitudes/indicadores")}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <FilterField label="Número de solicitud">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ej: SOL-2026-001"
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </FilterField>
            <FilterField label="Fecha desde">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>
            <FilterField label="Fecha hasta">
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>
            <FilterField label="Estado">
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todos</option>
                {Object.entries(ESTADO_LABELS).map(([codigo, label]) => (
                  <option key={codigo} value={codigo}>
                    {label}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="SLA">
              <select
                value={sla}
                onChange={(e) => setSla(e.target.value as typeof sla)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {SLA_FILTROS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={buscar}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="h-4 w-4" />
                {loading ? "Buscando..." : "Buscar"}
              </button>
              <button
                onClick={limpiarFiltros}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Limpiar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        <div className="space-y-4 mt-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-10">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin" />
            </div>
          )}

          {!loading && !error && listado.length === 0 && (
            <EmptyStateCard
              icon={FileSearch}
              title="No hay solicitudes para estos filtros"
              subtitle="Ajusta la búsqueda e intenta de nuevo"
            />
          )}

          {!loading && listado.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <ResultsToolbar
                count={listado.length}
                label="solicitud(es)"
                onExport={exportarExcel}
              />
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <Th>N° Solicitud</Th>
                      <Th>Cliente</Th>
                      <Th align="center">F. envío</Th>
                      <Th align="center">Estado</Th>
                      <Th align="center">% SLA</Th>
                      <Th align="center" sticky>
                        Acciones
                      </Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listado.map((s) => (
                      <Tr
                        key={s.sol_id}
                        className={s.sla_general.vencida ? "bg-red-50" : ""}
                      >
                        <Td className="font-medium text-brand-600">
                          {s.numero_solicitud}
                        </Td>
                        <Td className="max-w-[250px] truncate">
                          {s.razon_social || "—"}
                        </Td>
                        <Td align="center">{s.fecha_envio}</Td>
                        <Td align="center">
                          <EstadoBadge estado={s.estado} />
                        </Td>
                        <Td align="center">
                          <PctSlaBadge
                            pct={s.pct_cumplimiento}
                            enRiesgo={s.en_riesgo}
                          />
                        </Td>
                        <Td align="center" sticky>
                          <button
                            onClick={() => setModalNumero(s.numero_solicitud)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-700 bg-brand-600/10 hover:bg-brand-600/20 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver SLA
                          </button>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalNumero && (
        <VerSlaModal
          numero={modalNumero}
          onClose={() => setModalNumero(null)}
        />
      )}
    </div>
  );
}
