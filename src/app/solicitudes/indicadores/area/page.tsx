"use client";

import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import {
  indicadoresService,
  type AreaKPI,
  type SolicitudDetalle,
} from "@/services/indicadores/indicadores.service";
import {
  centrosOperacionService,
  type CentroOperacion,
} from "@/services/centros-operacion/centros-operacion.service";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  BarChart3,
  Search,
} from "lucide-react";

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

export default function IndicadoresAreaPage() {
  const { loading: authLoading } = useContext(AuthContext);
  const [centros, setCentros] = useState<CentroOperacion[]>([]);
  const [areas, setAreas] = useState<AreaKPI[]>([]);
  const [areaSeleccionada, setAreaSeleccionada] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [coId, setCoId] = useState("");
  const [solicitudes, setSolicitudes] = useState<SolicitudDetalle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "a_tiempo" | "vencida">("todas");

  useEffect(() => {
    if (authLoading) return;
    cargarAreas();
    centrosOperacionService.getAll().then(setCentros).catch(() => {});
  }, [authLoading]);

  async function cargarAreas() {
    setLoadingAreas(true);
    try {
      const params: Record<string, string> = {};
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      if (coId) params.co_id = coId;
      const data = await indicadoresService.getDashboard(params);
      const areasConDatos = data.por_area.filter((a) => a.total > 0);
      setAreas(areasConDatos);
      if (areasConDatos.length > 0 && !areaSeleccionada) {
        setAreaSeleccionada(areasConDatos[0].area);
      }
    } catch {
      setError("No se pudieron cargar las áreas. Intenta de nuevo.");
    } finally {
      setLoadingAreas(false);
    }
  }

  async function buscar() {
    if (!areaSeleccionada) {
      setError("Selecciona un área primero");
      return;
    }
    setLoading(true);
    setError(null);
    setSolicitudes([]);
    try {
      const params: Record<string, string> = { area: areaSeleccionada };
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      if (coId) params.co_id = coId;
      const res = await indicadoresService.getDetalleArea(params as any);
      setSolicitudes(res);
    } catch {
      setError("Error al consultar las solicitudes. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function aplicarFiltros() {
    await cargarAreas();
  }

  const filtradas =
    filtro === "todas"
      ? solicitudes
      : solicitudes.filter((s) => s.estado === filtro);

  const areaInfo = areas.find((a) => a.area === areaSeleccionada);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        {/* Header + Filtros Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900">Tiempos por Área</h1>
            <p className="text-gray-600 text-base mt-1">
              Consulta cuántos días tomó cada área en diferentes solicitudes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Área
              </label>
              <select
                value={areaSeleccionada}
                onChange={(e) => setAreaSeleccionada(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 bg-white"
              >
                <option value="">Selecciona un área...</option>
                {areas.map((a) => (
                  <option key={a.area} value={a.area}>
                    {a.label} ({a.total})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Centro de operación</label>
              <select
                value={coId}
                onChange={(e) => setCoId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 bg-white"
              >
                <option value="">Todos</option>
                {centros.map((c) => (
                  <option key={c.cop_id} value={String(c.cop_id)}>
                    {c.cop_nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={aplicarFiltros}
                disabled={loadingAreas}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:opacity-50 rounded-lg transition-colors"
              >
                {loadingAreas ? "Aplicando..." : "Aplicar"}
              </button>
              <button
                onClick={buscar}
                disabled={loading || !areaSeleccionada}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Info del área seleccionada */}
        {areaInfo && solicitudes.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600 text-sm mb-2">Solicitudes procesadas</p>
              <p className="text-4xl font-bold text-gray-900">{areaInfo.total}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600 text-sm mb-2">A tiempo</p>
              <p className="text-4xl font-bold text-green-600">{areaInfo.a_tiempo}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600 text-sm mb-2">Vencidas</p>
              <p className="text-4xl font-bold text-red-600">{areaInfo.vencidas}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600 text-sm mb-2">Cumplimiento</p>
              <p className="text-4xl font-bold text-blue-600">{areaInfo.pct_cumplimiento}%</p>
            </div>
          </div>
        )}

        {/* Spinner */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Resultado - Tabla */}
        {!loading && solicitudes.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Solicitudes del área {areaInfo?.label}
              </h2>

              {/* Filtros rápidos */}
              <div className="flex gap-2 flex-wrap">
                {(["todas", "a_tiempo", "vencida"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      filtro === f
                        ? f === "vencida"
                          ? "bg-red-100 text-red-700"
                          : f === "a_tiempo"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      N° Solicitud
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Razón social
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      F. envío
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      F. estimada
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      F. real
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      Días reales
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      Desvío
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtradas.map((s) => (
                    <tr
                      key={s.sol_id}
                      className={`hover:bg-gray-50 transition-colors ${
                        s.estado === "vencida" ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-6 py-3 text-sm font-medium text-blue-600">
                        {s.numero_solicitud}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700 max-w-[250px] truncate">
                        {s.razon_social || "—"}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600 text-center">
                        {s.fecha_envio}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600 text-center">
                        {s.fecha_estimada}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-center font-medium">
                        {s.fecha_real}
                      </td>
                      <td className="px-6 py-3 text-sm text-blue-600 text-center font-medium">
                        {s.dias_reales} d
                      </td>
                      <td className="px-6 py-3 text-center">
                        <DiferenciaBadge diferencia={s.diferencia} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
              {filtradas.length} solicitud{filtradas.length !== 1 ? "es" : ""} mostrada{filtradas.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}

        {/* Estado inicial */}
        {!loading && solicitudes.length === 0 && areaSeleccionada && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600 text-base">Presiona "Buscar" para ver los datos de esta área</p>
          </div>
        )}
      </div>
    </div>
  );
}
