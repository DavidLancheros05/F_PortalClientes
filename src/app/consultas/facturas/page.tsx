"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { Receipt, PackageOpen, Search, X } from "lucide-react";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { TableContainer } from "@/components/tables/TableContainer";
import { TablePagination } from "@/components/tables/TablePagination";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { SuggestField } from "@/components/filters/SuggestField";
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

  const numeroSugerencias = useMemo(
    () => facturas.map((f) => f.numeroDocumento ?? ""),
    [facturas],
  );
  const descripcionSugerencias = useMemo(
    () => [
      ...facturas.map((f) => f.descripcionItem ?? ""),
      ...facturas.map((f) => f.referencia ?? ""),
    ],
    [facturas],
  );

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
            <SuggestField
              label="Número de documento"
              placeholder="Ej: FEV-00098211"
              value={filtroNumeroInput}
              onChange={setFiltroNumeroInput}
              suggestions={numeroSugerencias}
              onEnter={handleBuscar}
            />
            <SuggestField
              label="Referencia o descripción"
              placeholder="Ej: CAJA CJ 3550"
              value={filtroDescripcionInput}
              onChange={setFiltroDescripcionInput}
              suggestions={descripcionSugerencias}
              onEnter={handleBuscar}
            />
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
                    <Th className="whitespace-nowrap">Documento</Th>
                    <Th className="whitespace-nowrap">Número</Th>
                    <Th className="whitespace-nowrap">NIT</Th>
                    <Th className="whitespace-nowrap">Cliente</Th>
                    <Th className="whitespace-nowrap">Fecha</Th>
                    <Th className="whitespace-nowrap">Pedido</Th>
                    <Th className="whitespace-nowrap">Remisión</Th>
                    <Th className="whitespace-nowrap">Orden de compra</Th>
                    <Th className="whitespace-nowrap">Ítem</Th>
                    <Th className="whitespace-nowrap">Referencia</Th>
                    <Th className="whitespace-nowrap">Descripción</Th>
                    <Th className="whitespace-nowrap">Cantidad</Th>
                    <Th className="whitespace-nowrap">Peso</Th>
                    <Th className="whitespace-nowrap">Ciudad</Th>
                    <Th className="whitespace-nowrap">Punto de envío</Th>
                    <Th className="whitespace-nowrap">Precio unitario</Th>
                    <Th className="whitespace-nowrap">Precio cliente</Th>
                    <Th className="whitespace-nowrap">Precio por peso</Th>
                    <Th className="whitespace-nowrap">Plan 001</Th>
                    <Th className="whitespace-nowrap">Plan 003</Th>
                    <Th className="whitespace-nowrap">SEC</Th>
                    <Th className="whitespace-nowrap">SSE</Th>
                    <Th className="whitespace-nowrap">Valor subtotal</Th>
                    <Th className="whitespace-nowrap">Valor impuesto</Th>
                    <Th className="whitespace-nowrap">Valor neto</Th>
                    <Th className="whitespace-nowrap">Bodega</Th>
                    <Th className="whitespace-nowrap">Centro operación</Th>
                    <Th className="whitespace-nowrap">Vendedor</Th>
                    <Th className="whitespace-nowrap">Vendedor cliente</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {facturasPaginadas.map((factura, index) => (
                    <Tr
                      key={`${factura.numeroDocumento}-${factura.item}-${index}`}
                    >
                      <Td className="whitespace-nowrap font-medium">
                        {factura.numeroDocumento}
                      </Td>
                      <Td className="whitespace-nowrap">{factura.numero}</Td>
                      <Td className="whitespace-nowrap">{factura.nit}</Td>
                      <Td className="whitespace-nowrap">{factura.clienteRazonSocial}</Td>
                      <Td className="whitespace-nowrap">{formatFecha(factura.fecha)}</Td>
                      <Td className="whitespace-nowrap">{factura.pedidoDocumento || "-"}</Td>
                      <Td className="whitespace-nowrap">{factura.documentoRemision || "-"}</Td>
                      <Td className="whitespace-nowrap">{factura.ordenCompra || "-"}</Td>
                      <Td className="whitespace-nowrap">{factura.item}</Td>
                      <Td className="whitespace-nowrap">{factura.referencia}</Td>
                      <Td className="whitespace-nowrap">{factura.descripcionItem}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(factura.cantidad)}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(factura.peso)}</Td>
                      <Td className="whitespace-nowrap">{factura.ciudad || "-"}</Td>
                      <Td className="whitespace-nowrap">{factura.descripcionPuntoEnvio || "-"}</Td>
                      <Td className="whitespace-nowrap">${formatNumero(factura.precioUnitario)}</Td>
                      <Td className="whitespace-nowrap">${formatNumero(factura.precioCliente)}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(factura.precioPeso)}</Td>
                      <Td className="whitespace-nowrap">{factura.plan001 || "-"}</Td>
                      <Td className="whitespace-nowrap">{factura.plan003 || "-"}</Td>
                      <Td className="whitespace-nowrap">{factura.sec || "-"}</Td>
                      <Td className="whitespace-nowrap">{factura.sse || "-"}</Td>
                      <Td className="whitespace-nowrap">${formatNumero(factura.valorSubtotal)}</Td>
                      <Td className="whitespace-nowrap">${formatNumero(factura.valorImpuesto)}</Td>
                      <Td className="whitespace-nowrap">${formatNumero(factura.valorNeto)}</Td>
                      <Td className="whitespace-nowrap">{factura.bodega}</Td>
                      <Td className="whitespace-nowrap">{factura.centroOperacion}</Td>
                      <Td className="whitespace-nowrap">{factura.vendedor}</Td>
                      <Td className="whitespace-nowrap">{factura.vendedorClienteNombre || "-"}</Td>
                    </Tr>
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
