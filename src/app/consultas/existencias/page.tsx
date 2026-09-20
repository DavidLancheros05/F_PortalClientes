"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { Warehouse, PackageOpen, Search, X } from "lucide-react";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { TableContainer } from "@/components/tables/TableContainer";
import { TablePagination } from "@/components/tables/TablePagination";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { SuggestField } from "@/components/filters/SuggestField";
import { FilterActions } from "@/components/filters/FilterActions";
import {
  existenciasService,
  type ExistenciaClienteResponse,
} from "@/services/existencias/existencias.service";

function formatNumero(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "-";
  return valor.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatFecha(valor: string | null | undefined) {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleDateString("es-CO");
}

export default function ExistenciasPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [existencias, setExistencias] = useState<ExistenciaClienteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [filtroItemInput, setFiltroItemInput] = useState("");
  const [filtroBodegaInput, setFiltroBodegaInput] = useState("");
  const [filtroUbicacionInput, setFiltroUbicacionInput] = useState("");

  const [filtroItem, setFiltroItem] = useState("");
  const [filtroBodega, setFiltroBodega] = useState("");
  const [filtroUbicacion, setFiltroUbicacion] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!user?.cliente_id) return;

    async function cargarExistencias() {
      try {
        setLoading(true);
        setError(false);
        const data = await existenciasService.getPorCliente(user!.cliente_id!);
        setExistencias(data);
      } catch (err) {
        console.error("Error cargando existencias:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    cargarExistencias();
  }, [user?.cliente_id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroItem, filtroBodega, filtroUbicacion]);

  const handleBuscar = () => {
    setHasSearched(true);
    setFiltroItem(filtroItemInput);
    setFiltroBodega(filtroBodegaInput);
    setFiltroUbicacion(filtroUbicacionInput);
  };

  const limpiarFiltros = () => {
    setFiltroItemInput("");
    setFiltroBodegaInput("");
    setFiltroUbicacionInput("");
    setFiltroItem("");
    setFiltroBodega("");
    setFiltroUbicacion("");
    setHasSearched(false);
  };

  const existenciasFiltradas = useMemo(() => {
    const itemBuscado = filtroItem.trim().toLowerCase();
    const bodegaBuscada = filtroBodega.trim().toLowerCase();
    const ubicacionBuscada = filtroUbicacion.trim().toLowerCase();

    return existencias.filter((existencia) => {
      if (
        itemBuscado &&
        !existencia.item?.toLowerCase().includes(itemBuscado) &&
        !existencia.referencia?.toLowerCase().includes(itemBuscado) &&
        !existencia.descripcionItem?.toLowerCase().includes(itemBuscado)
      ) {
        return false;
      }

      if (
        bodegaBuscada &&
        !existencia.bodega?.toLowerCase().includes(bodegaBuscada)
      ) {
        return false;
      }

      if (
        ubicacionBuscada &&
        !existencia.ubicacion?.toLowerCase().includes(ubicacionBuscada)
      ) {
        return false;
      }

      return true;
    });
  }, [existencias, filtroItem, filtroBodega, filtroUbicacion]);

  const itemSugerencias = useMemo(
    () => [
      ...existencias.map((e) => e.item ?? ""),
      ...existencias.map((e) => e.referencia ?? ""),
      ...existencias.map((e) => e.descripcionItem ?? ""),
    ],
    [existencias],
  );
  const bodegaSugerencias = useMemo(
    () => existencias.map((e) => e.bodega ?? ""),
    [existencias],
  );
  const ubicacionSugerencias = useMemo(
    () => existencias.map((e) => e.ubicacion ?? ""),
    [existencias],
  );

  const existenciasPaginadas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return existenciasFiltradas.slice(start, start + pageSize);
  }, [existenciasFiltradas, currentPage, pageSize]);

  async function exportarExcel() {
    if (existenciasFiltradas.length === 0) return;

    const XLSX = await import("xlsx");

    const header = [
      "Ítem",
      "Referencia",
      "Descripción",
      "Cliente",
      "Lote",
      "Bodega",
      "Ubicación",
      "Existencia",
      "Disponible",
      "Peso",
      "Volumen",
      "Fecha lote",
      "Última entrada",
      "Ejecutivo",
    ];

    const data = existenciasFiltradas.map((existencia) => [
      existencia.item,
      existencia.referencia,
      existencia.descripcionItem,
      existencia.cliente,
      existencia.lote || "-",
      existencia.bodega,
      existencia.ubicacion || "-",
      formatNumero(existencia.cantidadExistencia),
      formatNumero(existencia.cantidadDisponible),
      formatNumero(existencia.peso),
      formatNumero(existencia.volumen),
      formatFecha(existencia.fechaLote),
      formatFecha(existencia.fechaUltimaEntrada),
      existencia.ejecutivoNegocio || "-",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Existencias");

    XLSX.writeFile(wb, `existencias-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-[115rem] mx-auto">
        <PageHeaderCard
          icon={Warehouse}
          eyebrow="Consultas"
          title="Existencia a la fecha por bodega"
          subtitle="Consulta el inventario disponible de tus ítems por bodega."
          onBack={() => router.push("/consultas")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SuggestField
              label="Ítem, referencia o descripción"
              placeholder="Ej: CAJA CJ 3550"
              value={filtroItemInput}
              onChange={setFiltroItemInput}
              suggestions={itemSugerencias}
              onEnter={handleBuscar}
            />
            <SuggestField
              label="Bodega"
              placeholder="Ej: 01"
              value={filtroBodegaInput}
              onChange={setFiltroBodegaInput}
              suggestions={bodegaSugerencias}
              onEnter={handleBuscar}
            />
            <SuggestField
              label="Ubicación"
              placeholder="Ej: A-01-03"
              value={filtroUbicacionInput}
              onChange={setFiltroUbicacionInput}
              suggestions={ubicacionSugerencias}
              onEnter={handleBuscar}
            />
            <FilterActions className="col-span-full">
              <button
                onClick={limpiarFiltros}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
              >
                <X className="h-4 w-4" />
                Limpiar filtros
              </button>
              <button
                onClick={handleBuscar}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {!hasSearched ? (
          <EmptyStateCard
            icon={PackageOpen}
            title="Presiona Buscar para ver las existencias."
            subtitle="Opcionalmente puedes filtrar antes de buscar."
          />
        ) : loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-gray-600">
            Cargando existencias...
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-red-600">
            No se pudieron cargar las existencias.
          </div>
        ) : existencias.length === 0 ? (
          <EmptyStateCard icon={PackageOpen} title="No se encontraron existencias." />
        ) : existenciasFiltradas.length === 0 ? (
          <EmptyStateCard
            icon={PackageOpen}
            title="Ninguna existencia coincide con los filtros aplicados."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <ResultsToolbar
              count={existenciasFiltradas.length}
              label={`de ${existencias.length} registro(s)`}
              onExport={exportarExcel}
            />
            <TableContainer>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <Th className="whitespace-nowrap">Ítem</Th>
                    <Th className="whitespace-nowrap">Referencia</Th>
                    <Th className="whitespace-nowrap">Descripción</Th>
                    <Th className="whitespace-nowrap">Cliente</Th>
                    <Th className="whitespace-nowrap">Lote</Th>
                    <Th className="whitespace-nowrap">Bodega</Th>
                    <Th className="whitespace-nowrap">Ubicación</Th>
                    <Th className="whitespace-nowrap">Existencia</Th>
                    <Th className="whitespace-nowrap">Disponible</Th>
                    <Th className="whitespace-nowrap">Peso</Th>
                    <Th className="whitespace-nowrap">Volumen</Th>
                    <Th className="whitespace-nowrap">Fecha lote</Th>
                    <Th className="whitespace-nowrap">Última entrada</Th>
                    <Th className="whitespace-nowrap">Ejecutivo</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {existenciasPaginadas.map((existencia, index) => (
                    <Tr
                      key={`${existencia.item}-${existencia.lote}-${existencia.bodega}-${index}`}
                    >
                      <Td className="whitespace-nowrap font-medium">
                        {existencia.item}
                      </Td>
                      <Td className="whitespace-nowrap">{existencia.referencia}</Td>
                      <Td className="whitespace-nowrap">{existencia.descripcionItem}</Td>
                      <Td className="whitespace-nowrap">{existencia.cliente}</Td>
                      <Td className="whitespace-nowrap">{existencia.lote || "-"}</Td>
                      <Td className="whitespace-nowrap">{existencia.bodega}</Td>
                      <Td className="whitespace-nowrap">{existencia.ubicacion || "-"}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(existencia.cantidadExistencia)}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(existencia.cantidadDisponible)}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(existencia.peso)}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(existencia.volumen)}</Td>
                      <Td className="whitespace-nowrap">{formatFecha(existencia.fechaLote)}</Td>
                      <Td className="whitespace-nowrap">{formatFecha(existencia.fechaUltimaEntrada)}</Td>
                      <Td className="whitespace-nowrap">{existencia.ejecutivoNegocio || "-"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </table>
            </div>
            </TableContainer>

            <TablePagination
              page={currentPage}
              pageSize={pageSize}
              totalItems={existenciasFiltradas.length}
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
