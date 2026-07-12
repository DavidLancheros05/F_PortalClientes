"use client";
import { solicitudesService } from "@/services/solicitudes.service";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  Search,
} from "lucide-react";

const PAGE_SIZE = 10;

interface DocumentoRow {
  sa_id: number;
  sa_sol_id: number;
  sol_numero_solicitud: string;
  sol_estado_id: number;
  estado_solicitud: string;
  documento_nombre: string | null;
  sa_nombre_original: string;
  sa_tipo_mime: string | null;
  sa_tamaño_bytes: number | null;
  sa_ruta_almacenamiento: string;
  fecha_carga: string;
  sa_fecha_vencimiento: string | null;
  estado_vencimiento: "VIGENTE" | "VENCIDO" | "SIN_VIGENCIA";
  cliente_nombre: string | null;
  centro_operacion_nombre: string | null;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-CO");
}

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "-";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function csvEscape(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function toDateOnlyValue(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed.getTime();
}

function getDiasRestantes(fechaVencimiento?: string | null) {
  const vencTime = toDateOnlyValue(fechaVencimiento);
  if (vencTime === null) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.ceil((vencTime - today.getTime()) / msPorDia);
}

function getBadgeEstadoVencimientoClass(
  estado: DocumentoRow["estado_vencimiento"],
) {
  if (estado === "VENCIDO") return "bg-red-100 text-red-800";
  if (estado === "VIGENTE") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

function getEstadoVencimientoLabel(estado: DocumentoRow["estado_vencimiento"]) {
  if (estado === "VENCIDO") return "Vencido";
  if (estado === "VIGENTE") return "Vigente";
  return "Sin vigencia";
}

function getDiasVencimientoBadge(fechaVencimiento?: string | null) {
  const dias = getDiasRestantes(fechaVencimiento);

  if (dias === null) {
    return {
      label: "Sin vigencia",
      className: "bg-slate-100 text-slate-700",
    };
  }

  if (dias < 0) {
    const diasVencido = Math.abs(dias);
    return {
      label: `Vencido hace ${diasVencido} dia${diasVencido === 1 ? "" : "s"}`,
      className: "bg-red-100 text-red-800",
    };
  }

  if (dias === 0) {
    return {
      label: "Vence hoy",
      className: "bg-amber-100 text-amber-800",
    };
  }

  if (dias <= 7) {
    return {
      label: `Faltan ${dias} dia${dias === 1 ? "" : "s"}`,
      className: "bg-amber-100 text-amber-800",
    };
  }

  return {
    label: `Faltan ${dias} dia${dias === 1 ? "" : "s"}`,
    className: "bg-emerald-100 text-emerald-800",
  };
}

export default function ListadoDocumentosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DocumentoRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const emptyFilters = {
    searchTerm: "",
    estadoVencimiento: "ALL",
    estadoSolicitud: "ALL",
    clienteNombre: "ALL",
    centroNombre: "ALL",
    fechaCargaDesde: "",
    fechaCargaHasta: "",
  };

  const [pendingFilters, setPendingFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await solicitudesService.getDocumentos({ mode: "all" });
      setRows(data);
      setCurrentPage(1);
    } catch (error) {
      console.error("[ListadoDocumentosPage]", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const clientes = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((row) => row.cliente_nombre?.trim() || "")
          .filter((item) => item.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const centros = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((row) => row.centro_operacion_nombre?.trim() || "")
          .filter((item) => item.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const estadosSolicitud = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((row) => row.estado_solicitud?.trim() || "")
          .filter((item) => item.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const search = appliedFilters.searchTerm.trim().toLowerCase();
    const desde = toDateOnlyValue(appliedFilters.fechaCargaDesde);
    const hasta = toDateOnlyValue(appliedFilters.fechaCargaHasta);

    return rows.filter((row) => {
      if (
        appliedFilters.estadoVencimiento !== "ALL" &&
        row.estado_vencimiento !== appliedFilters.estadoVencimiento
      ) {
        return false;
      }

      if (
        appliedFilters.estadoSolicitud !== "ALL" &&
        row.estado_solicitud !== appliedFilters.estadoSolicitud
      ) {
        return false;
      }

      if (
        appliedFilters.clienteNombre !== "ALL" &&
        (row.cliente_nombre || "") !== appliedFilters.clienteNombre
      ) {
        return false;
      }

      if (
        appliedFilters.centroNombre !== "ALL" &&
        (row.centro_operacion_nombre || "") !== appliedFilters.centroNombre
      ) {
        return false;
      }

      const fechaCarga = toDateOnlyValue(row.fecha_carga);
      if (desde !== null && (fechaCarga === null || fechaCarga < desde)) {
        return false;
      }

      if (hasta !== null && (fechaCarga === null || fechaCarga > hasta)) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchable = [
        row.sol_numero_solicitud,
        row.documento_nombre || row.sa_nombre_original,
        row.cliente_nombre || "",
        row.centro_operacion_nombre || "",
        row.estado_solicitud || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(search);
    });
  }, [rows, appliedFilters]);

  const totalPages = useMemo(() => {
    if (filteredRows.length === 0) return 1;
    return Math.ceil(filteredRows.length / PAGE_SIZE);
  }, [filteredRows.length]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startRow =
    filteredRows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(currentPage * PAGE_SIZE, filteredRows.length);

  const limpiarFiltros = () => {
    setPendingFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setCurrentPage(1);
  };

  const aplicarBusqueda = () => {
    setAppliedFilters(pendingFilters);
    setCurrentPage(1);
  };

  const exportarExcelCsv = () => {
    if (filteredRows.length === 0) return;

    const header = [
      "No. solicitud",
      "Estado solicitud",
      "Documento",
      "Cliente",
      "Centro de operacion",
      "Fecha carga",
      "Fecha vencimiento",
      "Dias para vencimiento",
      "Estado documento",
      "Tamano",
      "Ruta archivo",
    ];

    const lines = [
      header.map((item) => csvEscape(item)).join(","),
      ...filteredRows.map((row) => {
        const diasBadge = getDiasVencimientoBadge(row.sa_fecha_vencimiento);
        return [
          row.sol_numero_solicitud,
          row.estado_solicitud || "-",
          row.documento_nombre || row.sa_nombre_original,
          row.cliente_nombre || "-",
          row.centro_operacion_nombre || "-",
          formatDate(row.fecha_carga),
          formatDate(row.sa_fecha_vencimiento),
          diasBadge.label,
          getEstadoVencimientoLabel(row.estado_vencimiento),
          formatBytes(row.sa_tamaño_bytes),
          row.sa_ruta_almacenamiento,
        ]
          .map((item) => csvEscape(item))
          .join(",");
      }),
    ];

    const csvContent = `\uFEFF${lines.join("\n")}`;
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `listado-documentos-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[115rem] mx-auto">
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl p-6 md:p-8">
          <div className="mb-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <button
              onClick={() => router.push("/solicitudes")}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a solicitudes
            </button>
            <p className="text-2xl md:text-3xl font-bold text-blue-800 mb-3 leading-tight">
              Listado de documentos 2
            </p>
            <div className="h-px w-full bg-gradient-to-r from-blue-200 via-blue-300 to-transparent mb-4" />
            <h1 className="text-xl md:text-2xl font-semibold text-gray-800">
              Control de vigencias y estados
            </h1>
            <p className="text-gray-600 mt-1">
              Consulta documentos, revisa dias para vencimiento y exporta
              resultados.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg mb-4">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50/40">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Centro de operacion
                  </label>
                  <select
                    value={pendingFilters.centroNombre}
                    onChange={(event) =>
                      setPendingFilters((prev) => ({
                        ...prev,
                        centroNombre: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Todos</option>
                    {centros.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={pendingFilters.searchTerm}
                      onChange={(event) =>
                        setPendingFilters((prev) => ({
                          ...prev,
                          searchTerm: event.target.value,
                        }))
                      }
                      placeholder="Solicitud, documento, cliente..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Estado solicitud
                  </label>
                  <select
                    value={pendingFilters.estadoSolicitud}
                    onChange={(event) =>
                      setPendingFilters((prev) => ({
                        ...prev,
                        estadoSolicitud: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Todos</option>
                    {estadosSolicitud.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Estado documento
                  </label>
                  <select
                    value={pendingFilters.estadoVencimiento}
                    onChange={(event) =>
                      setPendingFilters((prev) => ({
                        ...prev,
                        estadoVencimiento: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Todos</option>
                    <option value="VIGENTE">Vigente</option>
                    <option value="VENCIDO">Vencido</option>
                    <option value="SIN_VIGENCIA">Sin vigencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Cliente
                  </label>
                  <select
                    value={pendingFilters.clienteNombre}
                    onChange={(event) =>
                      setPendingFilters((prev) => ({
                        ...prev,
                        clienteNombre: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Todos</option>
                    {clientes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Fecha carga desde
                  </label>
                  <input
                    type="date"
                    value={pendingFilters.fechaCargaDesde}
                    onChange={(event) =>
                      setPendingFilters((prev) => ({
                        ...prev,
                        fechaCargaDesde: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Fecha carga hasta
                  </label>
                  <input
                    type="date"
                    value={pendingFilters.fechaCargaHasta}
                    onChange={(event) =>
                      setPendingFilters((prev) => ({
                        ...prev,
                        fechaCargaHasta: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 justify-end">
                <button
                  onClick={aplicarBusqueda}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
                <button
                  onClick={limpiarFiltros}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpiar filtros
                </button>
                <button
                  onClick={cargar}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Actualizar
                </button>
                <button
                  onClick={exportarExcelCsv}
                  disabled={filteredRows.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Exportar a Excel
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-gray-600">Consultando documentos...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-gray-600">
              No hay resultados para los filtros seleccionados.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50/40">
                <h2 className="text-base md:text-lg font-semibold text-slate-800">
                  Resultados del listado
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {filteredRows.length} documento
                  {filteredRows.length !== 1 ? "s" : ""} encontrado
                  {filteredRows.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-100">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Solicitud
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Estado solicitud
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Documento
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Centro
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Fecha carga
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Fecha vencimiento
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Dias para vencimiento
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Estado documento
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Tamano
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-950 uppercase tracking-wider border-b border-blue-200">
                        Archivo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedRows.map((row) => {
                      const diasBadge = getDiasVencimientoBadge(
                        row.sa_fecha_vencimiento,
                      );

                      return (
                        <tr key={row.sa_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                            {row.sol_numero_solicitud}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {row.estado_solicitud || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {row.documento_nombre || row.sa_nombre_original}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {row.cliente_nombre || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {row.centro_operacion_nombre || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(row.fecha_carga)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(row.sa_fecha_vencimiento)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${diasBadge.className}`}
                            >
                              {diasBadge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getBadgeEstadoVencimientoClass(row.estado_vencimiento)}`}
                            >
                              {getEstadoVencimientoLabel(
                                row.estado_vencimiento,
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatBytes(row.sa_tamaño_bytes)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <a
                              href={row.sa_ruta_almacenamiento}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Ver archivo
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Mostrando {startRow} - {endRow} de {filteredRows.length}{" "}
                  resultados
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </button>
                  <span className="text-sm font-semibold text-gray-700 px-2">
                    Pagina {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
