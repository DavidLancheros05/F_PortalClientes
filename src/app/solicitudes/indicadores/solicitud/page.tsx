"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { VerSlaModal } from "@/components/solicitudes/VerSlaModal";
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

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ESTADO_BADGE_CLASSES[estado] ?? "bg-gray-100 text-gray-600"}`}
    >
      {ESTADO_LABELS[estado] ?? estado}
    </span>
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
