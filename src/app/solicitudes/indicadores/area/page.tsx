"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import {
  indicadoresService,
  type AreaKPI,
  type SolicitudDetalle,
} from "@/services/indicadores/indicadores.service";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Search,
  X,
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
      <XCircle className="w-3 h-3" />+{diferencia} d vencida
    </span>
  );
}

export default function IndicadoresAreaPage() {
  const router = useRouter();
  const { loading: authLoading } = useContext(AuthContext);
  const [areas, setAreas] = useState<AreaKPI[]>([]);
  const [areaSeleccionada, setAreaSeleccionada] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [solicitudes, setSolicitudes] = useState<SolicitudDetalle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "a_tiempo" | "vencida">(
    "todas",
  );

  useEffect(() => {
    if (authLoading) return;
    cargarAreas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  async function cargarAreas() {
    setLoadingAreas(true);
    try {
      const params: Record<string, string> = {};
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
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

  function limpiarFiltros() {
    setFechaDesde("");
    setFechaHasta("");
    setAreaSeleccionada("");
    setSolicitudes([]);
    setFiltro("todas");
    setError(null);
  }

  const filtradas =
    filtro === "todas"
      ? solicitudes
      : solicitudes.filter((s) => s.estado === filtro);

  const areaInfo = areas.find((a) => a.area === areaSeleccionada);

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
          icon={BarChart3}
          eyebrow="Indicadores"
          title="Tiempos por Área"
          subtitle="Consulta cuántos días tomó cada área en diferentes solicitudes"
          onBack={() => router.push("/solicitudes/indicadores")}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FilterField label="Área">
              <select
                value={areaSeleccionada}
                onChange={(e) => setAreaSeleccionada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecciona un área...</option>
                {areas.map((a) => (
                  <option key={a.area} value={a.area}>
                    {a.label} ({a.total})
                  </option>
                ))}
              </select>
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

            <FilterActions className="col-span-full">
              <button
                onClick={aplicarFiltros}
                disabled={loadingAreas}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {loadingAreas ? "Aplicando..." : "Aplicar fechas"}
              </button>
              <button
                onClick={buscar}
                disabled={loading || !areaSeleccionada}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="h-4 w-4" />
                {loading ? "Buscando..." : "Buscar"}
              </button>
              <button
                onClick={limpiarFiltros}
                disabled={loading || loadingAreas}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Limpiar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        <div className="space-y-4 mt-4">
          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Info del área seleccionada */}
          {areaInfo && solicitudes.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-gray-500 text-sm mb-1">
                  Solicitudes procesadas
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {areaInfo.total}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-gray-500 text-sm mb-1">A tiempo</p>
                <p className="text-3xl font-bold text-green-600">
                  {areaInfo.a_tiempo}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-gray-500 text-sm mb-1">Vencidas</p>
                <p className="text-3xl font-bold text-red-600">
                  {areaInfo.vencidas}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-gray-500 text-sm mb-1">Cumplimiento</p>
                <p className="text-3xl font-bold text-brand-600">
                  {areaInfo.pct_cumplimiento}%
                </p>
              </div>
            </div>
          )}

          {/* Spinner */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-600 rounded-full animate-spin" />
            </div>
          )}

          {/* Resultado - Tabla */}
          {!loading && solicitudes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-800 mb-3">
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
                      <Th>N° Solicitud</Th>
                      <Th>Razón social</Th>
                      <Th align="center">F. envío</Th>
                      <Th align="center">F. estimada</Th>
                      <Th align="center">F. real</Th>
                      <Th align="center">Días reales</Th>
                      <Th align="center">Desvío</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtradas.map((s) => (
                      <Tr
                        key={s.sol_id}
                        className={s.estado === "vencida" ? "bg-red-50" : ""}
                      >
                        <Td className="font-medium text-brand-600">
                          {s.numero_solicitud}
                        </Td>
                        <Td className="max-w-[250px] truncate">
                          {s.razon_social || "—"}
                        </Td>
                        <Td align="center">{s.fecha_envio}</Td>
                        <Td align="center">{s.fecha_estimada}</Td>
                        <Td align="center" className="text-gray-900 font-medium">
                          {s.fecha_real}
                        </Td>
                        <Td align="center" className="text-brand-600 font-medium">
                          {s.dias_reales} d
                        </Td>
                        <Td align="center">
                          <DiferenciaBadge diferencia={s.diferencia} />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                {filtradas.length} solicitud{filtradas.length !== 1 ? "es" : ""}{" "}
                mostrada{filtradas.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}

          {/* Estado inicial */}
          {!loading && solicitudes.length === 0 && areaSeleccionada && (
            <EmptyStateCard
              icon={BarChart3}
              title='Presiona "Buscar" para ver los datos de esta área'
            />
          )}
        </div>
      </div>
    </div>
  );
}
