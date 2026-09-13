"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { Receipt, PackageOpen, Search, X } from "lucide-react";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { TableContainer } from "@/components/tables/TableContainer";
import { TablePagination } from "@/components/tables/TablePagination";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import {
  facturasService,
  type FacturaClienteResponse,
} from "@/services/facturas/facturas.service";

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

export default function FacturasPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [facturas, setFacturas] = useState<FacturaClienteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [filtroNumeroInput, setFiltroNumeroInput] = useState("");
  const [filtroDescripcionInput, setFiltroDescripcionInput] = useState("");
  const [filtroFechaDesdeInput, setFiltroFechaDesdeInput] = useState("");
  const [filtroFechaHastaInput, setFiltroFechaHastaInput] = useState("");

  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroDescripcion, setFiltroDescripcion] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!user?.cliente_id) return;

    async function cargarFacturas() {
      try {
        setLoading(true);
        setError(false);
        const data = await facturasService.getPorCliente(user!.cliente_id!);
        setFacturas(data);
      } catch (err) {
        console.error("Error cargando facturas:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    cargarFacturas();
  }, [user?.cliente_id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroNumero, filtroDescripcion, filtroFechaDesde, filtroFechaHasta]);

  const handleBuscar = () => {
    setHasSearched(true);
    setFiltroNumero(filtroNumeroInput);
    setFiltroDescripcion(filtroDescripcionInput);
    setFiltroFechaDesde(filtroFechaDesdeInput);
    setFiltroFechaHasta(filtroFechaHastaInput);
  };

  const limpiarFiltros = () => {
    setFiltroNumeroInput("");
    setFiltroDescripcionInput("");
    setFiltroFechaDesdeInput("");
    setFiltroFechaHastaInput("");
    setFiltroNumero("");
    setFiltroDescripcion("");
    setFiltroFechaDesde("");
    setFiltroFechaHasta("");
    setHasSearched(false);
  };

  const facturasFiltradas = useMemo(() => {
    const numeroBuscado = filtroNumero.trim().toLowerCase();
    const descripcionBuscada = filtroDescripcion.trim().toLowerCase();
    const desde = filtroFechaDesde ? new Date(filtroFechaDesde) : null;
    const hasta = filtroFechaHasta ? new Date(filtroFechaHasta) : null;

    return facturas.filter((factura) => {
      if (
        numeroBuscado &&
        !factura.numeroDocumento?.toLowerCase().includes(numeroBuscado)
      ) {
        return false;
      }

      if (
        descripcionBuscada &&
        !factura.descripcionItem?.toLowerCase().includes(descripcionBuscada) &&
        !factura.referencia?.toLowerCase().includes(descripcionBuscada)
      ) {
        return false;
      }

      const fecha = factura.fecha ? new Date(factura.fecha) : null;

      if (desde && (!fecha || fecha < desde)) {
        return false;
      }

      if (hasta && (!fecha || fecha > hasta)) {
        return false;
      }

      return true;
    });
  }, [facturas, filtroNumero, filtroDescripcion, filtroFechaDesde, filtroFechaHasta]);

  const facturasPaginadas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return facturasFiltradas.slice(start, start + pageSize);
  }, [facturasFiltradas, currentPage, pageSize]);

  async function exportarExcel() {
    if (facturasFiltradas.length === 0) return;

    const XLSX = await import("xlsx");

    const header = [
      "Documento",
      "Número",
      "NIT",
      "Cliente",
      "Fecha",
      "Pedido",
      "Remisión",
      "Orden de compra",
      "Ítem",
      "Referencia",
      "Descripción",
      "Cantidad",
      "Peso",
      "Ciudad",
      "Punto de envío",
      "Precio unitario",
      "Precio cliente",
      "Precio por peso",
      "Plan 001",
      "Plan 003",
      "SEC",
      "SSE",
      "Valor subtotal",
      "Valor impuesto",
      "Valor neto",
      "Bodega",
      "Centro operación",
      "Vendedor",
      "Vendedor cliente",
    ];

    const data = facturasFiltradas.map((factura) => [
      factura.numeroDocumento,
      factura.numero,
      factura.nit,
      factura.clienteRazonSocial,
      formatFecha(factura.fecha),
      factura.pedidoDocumento || "-",
      factura.documentoRemision || "-",
      factura.ordenCompra || "-",
      factura.item,
      factura.referencia,
      factura.descripcionItem,
      formatNumero(factura.cantidad),
      formatNumero(factura.peso),
      factura.ciudad || "-",
      factura.descripcionPuntoEnvio || "-",
      formatNumero(factura.precioUnitario),
      formatNumero(factura.precioCliente),
      formatNumero(factura.precioPeso),
      factura.plan001 || "-",
      factura.plan003 || "-",
      factura.sec || "-",
      factura.sse || "-",
      formatNumero(factura.valorSubtotal),
      formatNumero(factura.valorImpuesto),
      formatNumero(factura.valorNeto),
      factura.bodega,
      factura.centroOperacion,
      factura.vendedor,
      factura.vendedorClienteNombre || "-",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturas");

    XLSX.writeFile(wb, `facturas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-[115rem] mx-auto">
        <PageHeaderCard
          icon={Receipt}
          eyebrow="Consultas"
          title="Facturas y notas"
          subtitle="Consulta el historial de facturas y notas asociadas a tu cuenta."
          onBack={() => router.push("/consultas")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FilterField label="Número de documento">
              <input
                type="text"
                value={filtroNumeroInput}
                onChange={(e) => setFiltroNumeroInput(e.target.value)}
                placeholder="Ej: FEV-00098211"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>
            <FilterField label="Referencia o descripción">
              <input
                type="text"
                value={filtroDescripcionInput}
                onChange={(e) => setFiltroDescripcionInput(e.target.value)}
                placeholder="Ej: CAJA CJ 3550"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>
            <FilterField label="Fecha desde">
              <input
                type="date"
                value={filtroFechaDesdeInput}
                onChange={(e) => setFiltroFechaDesdeInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>
            <FilterField label="Fecha hasta">
              <input
                type="date"
                value={filtroFechaHastaInput}
                onChange={(e) => setFiltroFechaHastaInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>
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
            title="Presiona Buscar para ver tus facturas."
            subtitle="Opcionalmente puedes filtrar antes de buscar."
          />
        ) : loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-gray-600">
            Cargando facturas...
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-red-600">
            No se pudieron cargar las facturas.
          </div>
        ) : facturas.length === 0 ? (
          <EmptyStateCard icon={PackageOpen} title="No se encontraron facturas." />
        ) : facturasFiltradas.length === 0 ? (
          <EmptyStateCard
            icon={PackageOpen}
            title="Ninguna factura coincide con los filtros aplicados."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <ResultsToolbar
              count={facturasFiltradas.length}
              label={`de ${facturas.length} factura(s)`}
              onExport={exportarExcel}
            />
            <TableContainer>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Documento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">NIT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Pedido</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Remisión</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Orden de compra</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ítem</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Referencia</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cantidad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Peso</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ciudad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Punto de envío</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Precio unitario</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Precio cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Precio por peso</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Plan 001</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Plan 003</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">SEC</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">SSE</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Valor subtotal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Valor impuesto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Valor neto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Bodega</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Centro operación</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Vendedor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Vendedor cliente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {facturasPaginadas.map((factura, index) => (
                    <tr
                      key={`${factura.numeroDocumento}-${factura.item}-${index}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {factura.numeroDocumento}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.numero}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.nit}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.clienteRazonSocial}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatFecha(factura.fecha)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.pedidoDocumento || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.documentoRemision || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.ordenCompra || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.item}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.referencia}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.descripcionItem}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(factura.cantidad)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(factura.peso)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.ciudad || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.descripcionPuntoEnvio || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(factura.precioUnitario)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(factura.precioCliente)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(factura.precioPeso)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.plan001 || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.plan003 || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.sec || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.sse || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(factura.valorSubtotal)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(factura.valorImpuesto)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(factura.valorNeto)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.bodega}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.centroOperacion}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.vendedor}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{factura.vendedorClienteNombre || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </TableContainer>

            <TablePagination
              page={currentPage}
              pageSize={pageSize}
              totalItems={facturasFiltradas.length}
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
