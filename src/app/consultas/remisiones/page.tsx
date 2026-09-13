"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { Truck, PackageOpen, Search, X } from "lucide-react";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { TableContainer } from "@/components/tables/TableContainer";
import { TablePagination } from "@/components/tables/TablePagination";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import {
  remisionesService,
  type RemisionClienteResponse,
} from "@/services/remisiones/remisiones.service";

const ESTADOS_REMISION = [
  "En elaboracion",
  "Aprobada",
  "Anulada",
  "Contabilizada y no facturada",
  "No contabilizada y facturada",
  "Contabilizada y facturada",
];

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

export default function RemisionesPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [remisiones, setRemisiones] = useState<RemisionClienteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Valores que el usuario está escribiendo (ligados a los inputs).
  const [filtroNumeroInput, setFiltroNumeroInput] = useState("");
  const [filtroEstadoInput, setFiltroEstadoInput] = useState("");
  const [filtroDescripcionInput, setFiltroDescripcionInput] = useState("");
  const [filtroFechaDesdeInput, setFiltroFechaDesdeInput] = useState("");
  const [filtroFechaHastaInput, setFiltroFechaHastaInput] = useState("");

  // Valores realmente aplicados al filtrado — solo cambian al presionar
  // "Buscar" o "Limpiar filtros".
  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDescripcion, setFiltroDescripcion] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!user?.cliente_id) return;

    async function cargarRemisiones() {
      try {
        setLoading(true);
        setError(false);
        const data = await remisionesService.getPorCliente(user!.cliente_id!);
        setRemisiones(data);
      } catch (err) {
        console.error("Error cargando remisiones:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    cargarRemisiones();
  }, [user?.cliente_id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroNumero, filtroEstado, filtroDescripcion, filtroFechaDesde, filtroFechaHasta]);

  const handleBuscar = () => {
    setHasSearched(true);
    setFiltroNumero(filtroNumeroInput);
    setFiltroEstado(filtroEstadoInput);
    setFiltroDescripcion(filtroDescripcionInput);
    setFiltroFechaDesde(filtroFechaDesdeInput);
    setFiltroFechaHasta(filtroFechaHastaInput);
  };

  const limpiarFiltros = () => {
    setFiltroNumeroInput("");
    setFiltroEstadoInput("");
    setFiltroDescripcionInput("");
    setFiltroFechaDesdeInput("");
    setFiltroFechaHastaInput("");
    setFiltroNumero("");
    setFiltroEstado("");
    setFiltroDescripcion("");
    setFiltroFechaDesde("");
    setFiltroFechaHasta("");
    setHasSearched(false);
  };

  const remisionesFiltradas = useMemo(() => {
    const numeroBuscado = filtroNumero.trim().toLowerCase();
    const descripcionBuscada = filtroDescripcion.trim().toLowerCase();
    const desde = filtroFechaDesde ? new Date(filtroFechaDesde) : null;
    const hasta = filtroFechaHasta ? new Date(filtroFechaHasta) : null;

    return remisiones.filter((remision) => {
      if (
        numeroBuscado &&
        !remision.numeroDocumento?.toLowerCase().includes(numeroBuscado)
      ) {
        return false;
      }

      if (filtroEstado && remision.estado !== filtroEstado) {
        return false;
      }

      if (
        descripcionBuscada &&
        !remision.descripcionItem?.toLowerCase().includes(descripcionBuscada) &&
        !remision.referencia?.toLowerCase().includes(descripcionBuscada)
      ) {
        return false;
      }

      const fecha = remision.fecha ? new Date(remision.fecha) : null;

      if (desde && (!fecha || fecha < desde)) {
        return false;
      }

      if (hasta && (!fecha || fecha > hasta)) {
        return false;
      }

      return true;
    });
  }, [
    remisiones,
    filtroNumero,
    filtroEstado,
    filtroDescripcion,
    filtroFechaDesde,
    filtroFechaHasta,
  ]);

  const remisionesPaginadas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return remisionesFiltradas.slice(start, start + pageSize);
  }, [remisionesFiltradas, currentPage, pageSize]);

  async function exportarExcel() {
    if (remisionesFiltradas.length === 0) return;

    const XLSX = await import("xlsx");

    const header = [
      "Documento",
      "Número",
      "Cliente",
      "Estado",
      "Fecha",
      "Pedido",
      "Factura",
      "Orden de compra",
      "Ítem",
      "Referencia",
      "Descripción",
      "Lote",
      "Cantidad",
      "Peso",
      "Volumen",
      "Ciudad",
      "Ciudad envío",
      "Punto de envío",
      "Precio unitario",
      "Precio por peso",
      "Plan",
      "Valor bruto",
      "Valor impuesto",
      "Valor neto",
      "Bodega",
      "Vehículo",
      "Conductor",
      "Ident. conductor",
      "Vendedor",
      "CDV",
      "Notas",
    ];

    const data = remisionesFiltradas.map((remision) => [
      remision.numeroDocumento,
      remision.numero,
      remision.clienteRazonSocial,
      remision.estado,
      formatFecha(remision.fecha),
      remision.pedidoDocumento || "-",
      remision.facturaDocumento || "-",
      remision.ordenCompra || "-",
      remision.item,
      remision.referencia,
      remision.descripcionItem,
      remision.lote || "-",
      formatNumero(remision.cantidad),
      formatNumero(remision.peso),
      formatNumero(remision.volumen),
      remision.ciudad || "-",
      remision.ciudadEnvio || "-",
      remision.descripcionPuntoEnvio || "-",
      formatNumero(remision.precioUnitario),
      formatNumero(remision.precioPeso),
      remision.plan003 || "-",
      formatNumero(remision.valorBruto),
      formatNumero(remision.valorImpuesto),
      formatNumero(remision.valorNeto),
      remision.bodega,
      remision.vehiculo || "-",
      remision.nombreConductor || "-",
      remision.identificacionConductor || "-",
      remision.vendedor,
      remision.cdv || "-",
      remision.notas || remision.notasMovimiento || "-",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Remisiones");

    XLSX.writeFile(wb, `remisiones-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-[115rem] mx-auto">
        <PageHeaderCard
          icon={Truck}
          eyebrow="Consultas"
          title="Remisiones y devoluciones"
          subtitle="Consulta el historial de remisiones y devoluciones asociadas a tu cuenta."
          onBack={() => router.push("/consultas")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <FilterField label="Número de documento">
              <input
                type="text"
                value={filtroNumeroInput}
                onChange={(e) => setFiltroNumeroInput(e.target.value)}
                placeholder="Ej: REM-00184532"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>
            <FilterField label="Estado">
              <select
                value={filtroEstadoInput}
                onChange={(e) => setFiltroEstadoInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                {ESTADOS_REMISION.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
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
            title="Presiona Buscar para ver tus remisiones."
            subtitle="Opcionalmente puedes filtrar antes de buscar."
          />
        ) : loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-gray-600">
            Cargando remisiones...
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-red-600">
            No se pudieron cargar las remisiones.
          </div>
        ) : remisiones.length === 0 ? (
          <EmptyStateCard icon={PackageOpen} title="No se encontraron remisiones." />
        ) : remisionesFiltradas.length === 0 ? (
          <EmptyStateCard
            icon={PackageOpen}
            title="Ninguna remisión coincide con los filtros aplicados."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <ResultsToolbar
              count={remisionesFiltradas.length}
              label={`de ${remisiones.length} remisión(es)`}
              onExport={exportarExcel}
            />
            <TableContainer>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Documento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Pedido</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Factura</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Orden de compra</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ítem</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Referencia</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Lote</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cantidad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Peso</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Volumen</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ciudad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ciudad envío</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Punto de envío</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Precio unitario</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Precio por peso</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Valor bruto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Valor impuesto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Valor neto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Bodega</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Vehículo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Conductor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ident. conductor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Vendedor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">CDV</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {remisionesPaginadas.map((remision, index) => (
                    <tr
                      key={`${remision.numeroDocumento}-${remision.item}-${index}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {remision.numeroDocumento}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.numero}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.clienteRazonSocial}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            remision.estado === "Contabilizada y facturada"
                              ? "bg-green-100 text-green-700"
                              : remision.estado === "Anulada"
                                ? "bg-red-100 text-red-700"
                                : remision.estado === "Contabilizada y no facturada" ||
                                    remision.estado === "No contabilizada y facturada"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {remision.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatFecha(remision.fecha)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.pedidoDocumento || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.facturaDocumento || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.ordenCompra || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.item}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.referencia}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.descripcionItem}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.lote || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(remision.cantidad)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(remision.peso)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(remision.volumen)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.ciudad || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.ciudadEnvio || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.descripcionPuntoEnvio || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(remision.precioUnitario)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(remision.precioPeso)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.plan003 || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(remision.valorBruto)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(remision.valorImpuesto)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(remision.valorNeto)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.bodega}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.vehiculo || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.nombreConductor || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.identificacionConductor || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.vendedor}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.cdv || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{remision.notas || remision.notasMovimiento || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </TableContainer>

            <TablePagination
              page={currentPage}
              pageSize={pageSize}
              totalItems={remisionesFiltradas.length}
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
