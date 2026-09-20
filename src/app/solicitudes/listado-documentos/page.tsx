"use client";
import { solicitudesService } from "@/services/solicitudes.service";

import { useEffect, useMemo, useState } from "react";
import { FileText, PackageOpen, Search, X } from "lucide-react";
import { PdfIcon } from "@/components/icons/FileIcons";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { SuggestField } from "@/components/filters/SuggestField";
import { ClienteFilterField, type ClienteFilterOption } from "@/components/filters/ClienteFilterField";
import { EjecutivoFilterField, type EjecutivoFilterOption } from "@/components/filters/EjecutivoFilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { clientesService } from "@/services/clientes/clientes.service";
import { cachedRequest } from "@/services/core/requestCache";
import { TipoSolicitudBadge } from "@/components/badges/TipoSolicitudBadge";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { TableContainer } from "@/components/tables/TableContainer";
import { TablePagination } from "@/components/tables/TablePagination";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";

interface DocumentoRow {
  sa_id: number;
  sa_sol_id: number;
  sol_numero_solicitud: string;
  sol_estado_id: number;
  estado_solicitud: string;
  sol_fecha_envio: string | null;
  documento_nombre: string | null;
  sa_nombre_original: string;
  sa_tipo_mime: string | null;
  sa_tamaño_bytes: number | null;
  sa_ruta_almacenamiento: string;
  fecha_carga: string;
  sa_fecha_emision: string | null;
  sa_fecha_vencimiento: string | null;
  estado_vencimiento: "VIGENTE" | "VENCIDO" | "SIN_VIGENCIA";
  cliente_id: number | null;
  cliente_nombre: string | null;
  ejecutivo_id: number | null;
  ejecutivo_nombre: string | null;
  es_ampliacion_cupo: boolean | number | null;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-CO");
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

function getBadgeEstadoVencimientoClass(estado: DocumentoRow["estado_vencimiento"]) {
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
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DocumentoRow[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [clientes, setClientes] = useState<ClienteFilterOption[]>([]);

  const emptyFilters = {
    documentoNombre: "",
    solicitudNumero: "",
    estadoVencimiento: "ALL",
    estadoSolicitud: "ALL",
    tipoSolicitud: "ALL",
    clienteId: "",
    ejecutivoId: "",
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
    cachedRequest("listado-solicitudes-clientes", () => clientesService.getAll())
      .then((data) => setClientes(Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error("[ListadoDocumentosPage] Error cargando clientes", error);
      });
  }, []);

  const solicitudes = useMemo(() => {
    return Array.from(
      new Set(rows.map((row) => row.sol_numero_solicitud?.trim() || "").filter((item) => item.length > 0)),
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [rows]);

  const estadosSolicitud = useMemo(() => {
    return Array.from(
      new Set(rows.map((row) => row.estado_solicitud?.trim() || "").filter((item) => item.length > 0)),
    ).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const ejecutivos: EjecutivoFilterOption[] = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => {
      if (row.ejecutivo_id !== null && row.ejecutivo_nombre) {
        map.set(String(row.ejecutivo_id), row.ejecutivo_nombre);
      }
    });
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [rows]);

  // Pool crudo de sugerencias para el filtro de "Documento" — nombres tal
  // como aparecen en la columna, tomados de `rows` (antes de aplicar el
  // filtro).
  const documentosSugerencias = useMemo(
    () => rows.map((row) => row.documento_nombre || row.sa_nombre_original || ""),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const documentoBuscado = appliedFilters.documentoNombre.trim().toLowerCase();
    const solicitudBuscada = appliedFilters.solicitudNumero.trim().toLowerCase();
    const desde = toDateOnlyValue(appliedFilters.fechaCargaDesde);
    const hasta = toDateOnlyValue(appliedFilters.fechaCargaHasta);

    return rows.filter((row) => {
      if (solicitudBuscada && !(row.sol_numero_solicitud || "").toLowerCase().includes(solicitudBuscada)) {
        return false;
      }

      if (appliedFilters.estadoVencimiento !== "ALL" && row.estado_vencimiento !== appliedFilters.estadoVencimiento) {
        return false;
      }

      if (appliedFilters.estadoSolicitud !== "ALL" && row.estado_solicitud !== appliedFilters.estadoSolicitud) {
        return false;
      }

      if (appliedFilters.tipoSolicitud !== "ALL") {
        const esAmpliacion = !!row.es_ampliacion_cupo;
        if (appliedFilters.tipoSolicitud === "AMPLIACION" && !esAmpliacion) {
          return false;
        }
        if (appliedFilters.tipoSolicitud === "NUEVO" && esAmpliacion) {
          return false;
        }
      }

      if (appliedFilters.clienteId && String(row.cliente_id ?? "") !== appliedFilters.clienteId) {
        return false;
      }

      if (appliedFilters.ejecutivoId && String(row.ejecutivo_id ?? "") !== appliedFilters.ejecutivoId) {
        return false;
      }

      const fechaCarga = toDateOnlyValue(row.fecha_carga);
      if (desde !== null && (fechaCarga === null || fechaCarga < desde)) {
        return false;
      }

      if (hasta !== null && (fechaCarga === null || fechaCarga > hasta)) {
        return false;
      }

      if (
        documentoBuscado &&
        !(row.documento_nombre || row.sa_nombre_original || "").toLowerCase().includes(documentoBuscado)
      ) {
        return false;
      }

      return true;
    });
  }, [rows, appliedFilters]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters, pageSize]);

  const limpiarFiltros = () => {
    setPendingFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setCurrentPage(1);
    setHasSearched(false);
  };

  const aplicarBusqueda = () => {
    setAppliedFilters(pendingFilters);
    setCurrentPage(1);
    setHasSearched(true);
  };

  const exportarExcelCsv = () => {
    if (filteredRows.length === 0) return;

    const header = [
      "No. solicitud",
      "Tipo solicitud",
      "Estado solicitud",
      "Fecha envio solicitud",
      "Documento",
      "Cliente",
      "Ejecutivo",
      "Fecha emision",
      "Fecha vencimiento",
      "Dias para vencimiento",
      "Estado documento",
      "Ruta archivo",
    ];

    const lines = [
      header.map((item) => csvEscape(item)).join(","),
      ...filteredRows.map((row) => {
        const diasBadge = getDiasVencimientoBadge(row.sa_fecha_vencimiento);
        const tipoLabel = row.es_ampliacion_cupo ? "Ampliación de Cupo" : "Cliente Nuevo";
        return [
          row.sol_numero_solicitud,
          tipoLabel,
          row.estado_solicitud || "-",
          formatDate(row.sol_fecha_envio),
          row.documento_nombre || row.sa_nombre_original,
          row.cliente_nombre || "-",
          row.ejecutivo_nombre || "-",
          formatDate(row.sa_fecha_emision),
          formatDate(row.sa_fecha_vencimiento),
          diasBadge.label,
          getEstadoVencimientoLabel(row.estado_vencimiento),
          row.sa_ruta_almacenamiento,
        ]
          .map((item) => csvEscape(item))
          .join(",");
      }),
    ];

    const csvContent = `﻿${lines.join("\n")}`;
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `listado-documentos-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to px-4 sm:px-6 lg:px-8 pt-3 pb-4 sm:pb-6 lg:pb-8">
      <div className="max-w-[115rem] mx-auto">
        <PageHeaderCard
          icon={FileText}
          eyebrow="Solicitudes"
          title="Listado de documentos"
          subtitle="Consulta y filtra los documentos cargados en todas las solicitudes.">
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-4 gap-y-3">
            <SuggestField
              label="No. de solicitud"
              placeholder="Ej: 40"
              value={pendingFilters.solicitudNumero}
              onChange={(value) =>
                setPendingFilters((prev) => ({
                  ...prev,
                  solicitudNumero: value,
                }))
              }
              suggestions={solicitudes}
              onEnter={aplicarBusqueda}
            />

            <SuggestField
              label="Nombre Documento"
              placeholder="Nombre del documento..."
              value={pendingFilters.documentoNombre}
              onChange={(value) => setPendingFilters((prev) => ({ ...prev, documentoNombre: value }))}
              suggestions={documentosSugerencias}
              onEnter={aplicarBusqueda}
            />

            <FilterField label="Estado solicitud">
              <select
                value={pendingFilters.estadoSolicitud}
                onChange={(event) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    estadoSolicitud: event.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ALL">Todos</option>
                {estadosSolicitud.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Tipo solicitud">
              <select
                value={pendingFilters.tipoSolicitud}
                onChange={(event) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    tipoSolicitud: event.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ALL">Todos</option>
                <option value="AMPLIACION">Ampliación de Cupo</option>
                <option value="NUEVO">Cliente Nuevo</option>
              </select>
            </FilterField>

            <FilterField label="Estado documento">
              <select
                value={pendingFilters.estadoVencimiento}
                onChange={(event) =>
                  setPendingFilters((prev) => ({
                    ...prev,
                    estadoVencimiento: event.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ALL">Todos</option>
                <option value="VIGENTE">Vigente</option>
                <option value="VENCIDO">Vencido</option>
                <option value="SIN_VIGENCIA">Sin vigencia</option>
              </select>
            </FilterField>

            <ClienteFilterField
              clientes={clientes}
              value={pendingFilters.clienteId}
              onChange={(cliId) => setPendingFilters((prev) => ({ ...prev, clienteId: cliId }))}
            />

            <EjecutivoFilterField
              ejecutivos={ejecutivos}
              value={pendingFilters.ejecutivoId}
              onChange={(ejId) => setPendingFilters((prev) => ({ ...prev, ejecutivoId: ejId }))}
            />

            <FilterField label="Fecha carga desde">
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
            </FilterField>

            <FilterField label="Fecha carga hasta">
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
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={limpiarFiltros}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white">
                <X className="h-4 w-4" />
                Limpiar filtros
              </button>
              <button
                onClick={aplicarBusqueda}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors">
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-gray-600">
            Consultando documentos...
          </div>
        ) : !hasSearched ? (
          <EmptyStateCard icon={Search} title="Ajusta los filtros que necesites y presiona Buscar." />
        ) : filteredRows.length === 0 ? (
          <EmptyStateCard icon={PackageOpen} title="No hay resultados para los filtros seleccionados." />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <ResultsToolbar
              count={filteredRows.length}
              label={`documento${filteredRows.length !== 1 ? "s" : ""} encontrado${filteredRows.length !== 1 ? "s" : ""}`}
              onExport={exportarExcelCsv}
            />
            <TableContainer>
              <div className="overflow-x-auto overflow-y-auto max-h-112 pr-2">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-20">
                    <tr>
                      <Th className="whitespace-nowrap">Solicitud</Th>
                      <Th className="whitespace-nowrap">Tipo solicitud</Th>
                      <Th className="whitespace-nowrap">Estado solicitud</Th>
                      <Th className="max-w-28">Fecha envío solicitud</Th>
                      <Th className="whitespace-nowrap">Nombre Documento</Th>
                      <Th className="whitespace-nowrap">Cliente</Th>
                      <Th className="whitespace-nowrap">Ejecutivo</Th>
                      <Th className="whitespace-nowrap">Fecha emisión</Th>
                      <Th className="whitespace-nowrap">Fecha vencimiento</Th>
                      <Th className="max-w-24">Dias para vencimiento</Th>
                      <Th className="max-w-24">Estado documento</Th>
                      <Th align="center" sticky className="z-30">
                        Acciones
                      </Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedRows.map((row) => {
                      const diasBadge = getDiasVencimientoBadge(row.sa_fecha_vencimiento);

                      return (
                        <Tr key={row.sa_id}>
                          <Td className="font-medium whitespace-nowrap">{row.sol_numero_solicitud}</Td>
                          <Td className="whitespace-nowrap">
                            <TipoSolicitudBadge esAmpliacionCupo={row.es_ampliacion_cupo} />
                          </Td>
                          <Td className="whitespace-nowrap">{row.estado_solicitud || "-"}</Td>
                          <Td className="whitespace-nowrap">{formatDate(row.sol_fecha_envio)}</Td>
                          <Td>{row.documento_nombre || row.sa_nombre_original}</Td>
                          <Td className="whitespace-nowrap">{row.cliente_nombre || "-"}</Td>
                          <Td className="whitespace-nowrap">{row.ejecutivo_nombre || "-"}</Td>
                          <Td className="whitespace-nowrap">{formatDate(row.sa_fecha_emision)}</Td>
                          <Td className="whitespace-nowrap">{formatDate(row.sa_fecha_vencimiento)}</Td>
                          <Td className="whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${diasBadge.className}`}>
                              {diasBadge.label}
                            </span>
                          </Td>
                          <Td className="whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getBadgeEstadoVencimientoClass(row.estado_vencimiento)}`}>
                              {getEstadoVencimientoLabel(row.estado_vencimiento)}
                            </span>
                          </Td>
                          <Td sticky className="text-center">
                            <a
                              href={row.sa_ruta_almacenamiento}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Ver ${row.documento_nombre || row.sa_nombre_original}`}
                              className="inline-flex items-center text-brand-600 hover:text-brand-700">
                              <PdfIcon />
                            </a>
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TableContainer>

            <TablePagination
              page={currentPage}
              pageSize={pageSize}
              totalItems={filteredRows.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
