"use client";

import { useContext, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import {
  indicadoresService,
  type SolicitudTimeline,
  type AreaTimeline,
} from "@/services/indicadores/indicadores.service";
import {
  Search,
  FileSearch,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Minus,
} from "lucide-react";

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  PENDIENTE: "Pendiente",
  REVISION: "En revisión",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    APROBADA: "bg-green-100 text-green-700",
    RECHAZADA: "bg-red-100 text-red-700",
    PENDIENTE: "bg-blue-100 text-blue-700",
    REVISION: "bg-amber-100 text-amber-700",
    BORRADOR: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[estado] ?? "bg-gray-100 text-gray-600"}`}>
      {ESTADO_LABELS[estado] ?? estado}
    </span>
  );
}

function AreaBar({ area }: { area: AreaTimeline }) {
  const { dias_meta, dias_reales, procesada, vencida, label, fecha_estimada, fecha_real } = area;

  // Si no hay fechas estimadas, el área no aplica a esta solicitud
  if (!fecha_estimada && !procesada) {
    return (
      <div className="flex items-center gap-4 py-3 border-b last:border-0">
        <div className="w-44 flex-shrink-0">
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
      <div className="w-44 flex-shrink-0">
        <p className={`text-sm font-medium ${procesada ? "text-gray-800" : "text-gray-400"}`}>
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
                    <XCircle className="w-3 h-3" />
                    +{excesoDias} d sobre la meta
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
                  <span className="text-gray-400">· Respondido: {fecha_real}</span>
                )}
              </>
            ) : (
              <span className="text-gray-400">Aún no respondida</span>
            )}
          </div>
          <span className="text-xs text-gray-400">
            Meta: {meta} d
          </span>
        </div>
      </div>

      {/* Icono estado */}
      <div className="w-6 flex-shrink-0">
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

export default function IndicadoresSolicitudPage() {
  const { loading: authLoading } = useContext(AuthContext);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solicitud, setSolicitud] = useState<SolicitudTimeline | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function buscar() {
    const termino = busqueda.trim();
    if (!termino) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setSolicitud(null);
    try {
      const res = await indicadoresService.getSolicitudTimeline({ numero: termino });
      if (!res) {
        setNotFound(true);
      } else {
        setSolicitud(res);
      }
    } catch {
      setError("Error al consultar la solicitud. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") buscar();
  }

  const areasConDatos = solicitud?.areas.filter((a) => a.fecha_estimada || a.procesada) ?? [];
  const areasTotal = areasConDatos.length;
  const areasProcesadas = areasConDatos.filter((a) => a.procesada).length;
  const areasATiempo = areasConDatos.filter((a) => a.procesada && !a.vencida).length;
  const areasVencidas = areasConDatos.filter((a) => a.procesada && a.vencida).length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <FileSearch className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tiempos por Solicitud</h1>
            <p className="text-sm text-gray-500">
              Consulta cuántos días tomó cada área para responder en una solicitud específica
            </p>
          </div>
        </div>

        {/* Buscador */}
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Número de solicitud
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ej: SOL-2026-001"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={buscar}
              disabled={loading || !busqueda.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 px-5 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Not found */}
        {notFound && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <FileSearch className="w-10 h-10 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-700 font-medium">Solicitud no encontrada</p>
            <p className="text-sm text-amber-500 mt-1">
              Verifica el número e intenta de nuevo
            </p>
          </div>
        )}

        {/* Spinner */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Resultado */}
        {!loading && solicitud && (
          <>
            {/* Info solicitud */}
            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Solicitud</p>
                  <h2 className="text-xl font-bold text-gray-900 mt-0.5">
                    {solicitud.numero_solicitud}
                  </h2>
                  <p className="text-gray-600 mt-1">{solicitud.razon_social || "—"}</p>
                  {solicitud.nit && (
                    <p className="text-sm text-gray-400">NIT: {solicitud.nit}</p>
                  )}
                </div>
                <div className="text-right space-y-1.5 flex-shrink-0">
                  <EstadoBadge estado={solicitud.estado} />
                  {solicitud.centro_operacion && (
                    <p className="text-xs text-gray-400">{solicitud.centro_operacion}</p>
                  )}
                  {solicitud.fecha_envio && (
                    <p className="text-xs text-gray-400">Enviada: {solicitud.fecha_envio}</p>
                  )}
                </div>
              </div>

              {/* Mini resumen */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-700">{areasProcesadas}</p>
                  <p className="text-xs text-gray-400">de {areasTotal} áreas procesadas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{areasATiempo}</p>
                  <p className="text-xs text-gray-400">a tiempo</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{areasVencidas}</p>
                  <p className="text-xs text-gray-400">vencidas</p>
                </div>
              </div>
            </div>

            {/* Barras por área */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-800">
                    Tiempos por área
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    La barra llena al 100% representa el tiempo máximo estimado para cada área
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                    A tiempo
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                    Vencida
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-gray-300 inline-block" />
                    Pendiente
                  </span>
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

        {/* Estado inicial */}
        {!loading && !solicitud && !notFound && !error && (
          <div className="bg-white rounded-2xl shadow-sm border p-12 text-center text-gray-400">
            <FileSearch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Ingresa el número de solicitud para ver los tiempos de cada área</p>
          </div>
        )}
      </div>
    </div>
  );
}
