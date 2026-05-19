"use client";

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import {
  indicadoresService,
  type DashboardData,
  type AreaKPI,
  type SolicitudDetalle,
} from "@/services/indicadores/indicadores.service";
import {
  centrosOperacionService,
  type CentroOperacion,
} from "@/services/centros-operacion/centros-operacion.service";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  BarChart2,
  Search,
  X,
  ChevronRight,
} from "lucide-react";

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  const colors: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500" },
    green: { bg: "bg-green-50", text: "text-green-700", icon: "text-green-500" },
    red: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-500" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-500" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`${c.bg} border rounded-2xl p-5 flex items-center gap-4 shadow-sm`}>
      <div className="p-3 bg-white rounded-xl shadow-sm">
        <Icon className={`w-6 h-6 ${c.icon}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function PctBar({ pct, color }: { pct: number; color: string }) {
  const bg =
    color === "green" ? "bg-green-500" : color === "red" ? "bg-red-400" : "bg-amber-400";
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className={`${bg} h-2 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function DiferenciaBadge({ diferencia }: { diferencia: number }) {
  if (diferencia <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3" />
        {diferencia === 0 ? "Exacto" : `${Math.abs(diferencia)} d antes`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
      <XCircle className="w-3 h-3" />
      +{diferencia} d vencida
    </span>
  );
}

function DetalleModal({
  area,
  fechaDesde,
  fechaHasta,
  coId,
  onClose,
}: {
  area: AreaKPI;
  fechaDesde: string;
  fechaHasta: string;
  coId: string;
  onClose: () => void;
}) {
  const [solicitudes, setSolicitudes] = useState<SolicitudDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | "a_tiempo" | "vencida">("todas");

  useEffect(() => {
    const params: Record<string, string> = { area: area.area };
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    if (coId) params.co_id = coId;
    indicadoresService
      .getDetalleArea(params as any)
      .then(setSolicitudes)
      .finally(() => setLoading(false));
  }, [area.area, fechaDesde, fechaHasta, coId]);

  const filtradas =
    filtro === "todas"
      ? solicitudes
      : solicitudes.filter((s) => s.estado === filtro);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{area.label}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Solicitudes con fecha real registrada — ordenadas de mayor a menor desvío
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2 px-6 py-3 border-b bg-gray-50">
          {(["todas", "a_tiempo", "vencida"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filtro === f
                  ? f === "vencida"
                    ? "bg-red-100 text-red-700"
                    : f === "a_tiempo"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                  : "bg-white border text-gray-500 hover:bg-gray-100"
              }`}
            >
              {f === "todas"
                ? `Todas (${solicitudes.length})`
                : f === "a_tiempo"
                ? `A tiempo (${solicitudes.filter((s) => s.estado === "a_tiempo").length})`
                : `Vencidas (${solicitudes.filter((s) => s.estado === "vencida").length})`}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No hay solicitudes con este filtro
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">N° Solicitud</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Razón social</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">F. envío</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">F. estimada</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">F. real</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Días reales</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Desvío</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtradas.map((s) => (
                  <tr
                    key={s.sol_id}
                    className={`hover:bg-gray-50 transition-colors ${
                      s.estado === "vencida" ? "bg-red-50/30" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-blue-700">
                      {s.numero_solicitud}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate">
                      {s.razon_social || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">{s.fecha_envio}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">{s.fecha_estimada}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center font-medium">{s.fecha_real}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 text-center">{s.dias_reales} d</td>
                    <td className="px-4 py-3 text-center">
                      <DiferenciaBadge diferencia={s.diferencia} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-gray-50 flex justify-between items-center text-xs text-gray-400">
          <span>{filtradas.length} solicitudes mostradas</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IndicadoresPage() {
  const { loading: authLoading } = useContext(AuthContext);
  const [centros, setCentros] = useState<CentroOperacion[]>([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [coId, setCoId] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [areaDetalle, setAreaDetalle] = useState<AreaKPI | null>(null);

  useEffect(() => {
    if (authLoading) return;
    centrosOperacionService.getAll().then(setCentros).catch(() => {});
    buscar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  async function buscar() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      if (coId) params.co_id = coId;
      const res = await indicadoresService.getDashboard(params);
      setData(res);
      setHasSearched(true);
    } catch {
      setError("No se pudieron cargar los indicadores. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const chartAreaData =
    data?.por_area
      .filter((a) => a.total > 0)
      .map((a) => ({
        name: a.label,
        "Días reales": a.dias_promedio_real,
        "Días estimados": a.dias_promedio_estimado,
      })) ?? [];

  const chartMesData =
    data?.por_mes.map((m) => ({
      name: m.mes,
      Total: m.total,
      Aprobadas: m.aprobadas,
      Rechazadas: m.rechazadas,
    })) ?? [];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <BarChart2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard de Indicadores</h1>
            <p className="text-sm text-gray-500">Tiempos de respuesta y cumplimiento por área</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Centro de operación</label>
              <select
                value={coId}
                onChange={(e) => setCoId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {centros.map((c) => (
                  <option key={c.cop_id} value={String(c.cop_id)}>
                    {c.cop_nombre}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={buscar}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
              {loading ? "Consultando..." : "Consultar"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}

        {!loading && hasSearched && data && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Total solicitudes"
                value={data.resumen.total_solicitudes}
                icon={TrendingUp}
                color="blue"
              />
              <KpiCard
                label="Aprobadas"
                value={data.resumen.aprobadas}
                sub={`${
                  data.resumen.total_solicitudes > 0
                    ? Math.round((data.resumen.aprobadas / data.resumen.total_solicitudes) * 100)
                    : 0
                }% del total`}
                icon={CheckCircle}
                color="green"
              />
              <KpiCard
                label="Rechazadas"
                value={data.resumen.rechazadas}
                sub={`${
                  data.resumen.total_solicitudes > 0
                    ? Math.round((data.resumen.rechazadas / data.resumen.total_solicitudes) * 100)
                    : 0
                }% del total`}
                icon={XCircle}
                color="red"
              />
              <KpiCard
                label="Cumplimiento global"
                value={`${data.resumen.pct_a_tiempo_global}%`}
                sub="promedio sobre áreas procesadas"
                icon={Clock}
                color="amber"
              />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border p-5">
                <h2 className="text-base font-semibold text-gray-800 mb-4">
                  Días reales vs estimados por área
                </h2>
                {chartAreaData.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Sin datos en el período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={chartAreaData}
                      margin={{ top: 4, right: 8, left: -10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 11 }} unit=" d" />
                      <Tooltip formatter={(v: number) => [`${v} días`]} />
                      <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Días reales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Días estimados" fill="#d1d5db" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border p-5">
                <h2 className="text-base font-semibold text-gray-800 mb-4">
                  Tendencia mensual (últimos 6 meses)
                </h2>
                {chartMesData.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={chartMesData}
                      margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Total" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Aprobadas" fill="#4ade80" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Rechazadas" fill="#f87171" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Tabla por área — click para ver detalle */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h2 className="text-base font-semibold text-gray-800">Detalle por área</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Haz clic en una fila para ver el listado de solicitudes de esa área
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Área
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Total
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        A tiempo
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Vencidas
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Días prom. real
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Días prom. meta
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Cumplimiento
                      </th>
                      <th className="px-4 py-3 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.por_area
                      .filter((a) => a.total > 0)
                      .map((a: AreaKPI) => (
                        <tr
                          key={a.area}
                          onClick={() => setAreaDetalle(a)}
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{a.label}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 text-right">{a.total}</td>
                          <td className="px-4 py-3 text-sm text-green-600 text-right font-medium">
                            {a.a_tiempo}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-500 text-right font-medium">
                            {a.vencidas}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-600 text-right">
                            {a.dias_promedio_real} d
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">
                            {a.dias_promedio_estimado} d
                          </td>
                          <td className="px-4 py-3 w-36">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-semibold ${
                                  a.pct_cumplimiento >= 80
                                    ? "text-green-600"
                                    : a.pct_cumplimiento >= 50
                                    ? "text-amber-500"
                                    : "text-red-500"
                                }`}
                              >
                                {a.pct_cumplimiento}%
                              </span>
                              <div className="flex-1">
                                <PctBar
                                  pct={a.pct_cumplimiento}
                                  color={
                                    a.pct_cumplimiento >= 80
                                      ? "green"
                                      : a.pct_cumplimiento >= 50
                                      ? "amber"
                                      : "red"
                                  }
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            <ChevronRight className="w-4 h-4" />
                          </td>
                        </tr>
                      ))}
                    {data.por_area.filter((a) => a.total > 0).length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-8 text-center text-gray-400 text-sm"
                        >
                          No hay solicitudes procesadas en el período seleccionado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!loading && !hasSearched && (
          <div className="bg-white rounded-2xl shadow-sm border p-12 text-center text-gray-400">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>
              Aplica los filtros y presiona <strong>Consultar</strong> para ver los indicadores
            </p>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {areaDetalle && (
        <DetalleModal
          area={areaDetalle}
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          coId={coId}
          onClose={() => setAreaDetalle(null)}
        />
      )}
    </div>
  );
}
