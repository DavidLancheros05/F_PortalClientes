"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { Wallet, PackageOpen, Search, X } from "lucide-react";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { TableContainer } from "@/components/tables/TableContainer";
import { TablePagination } from "@/components/tables/TablePagination";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import {
  carteraService,
  type SaldoClienteResponse,
} from "@/services/cartera/cartera.service";

export default function CarteraPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [saldos, setSaldos] = useState<SaldoClienteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [filtroNumeroInput, setFiltroNumeroInput] = useState("");
  const [soloVencidosInput, setSoloVencidosInput] = useState(false);

  const [filtroNumero, setFiltroNumero] = useState("");
  const [soloVencidos, setSoloVencidos] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!user?.cliente_id) return;

    async function cargarSaldos() {
      try {
        setLoading(true);
        setError(false);
        const data = await carteraService.getPorCliente(user!.cliente_id!);
        setSaldos(data);
      } catch (err) {
        console.error("Error cargando cartera:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    cargarSaldos();
  }, [user?.cliente_id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroNumero, soloVencidos]);

  const handleBuscar = () => {
    setHasSearched(true);
    setFiltroNumero(filtroNumeroInput);
    setSoloVencidos(soloVencidosInput);
  };

  const limpiarFiltros = () => {
    setFiltroNumeroInput("");
    setSoloVencidosInput(false);
    setFiltroNumero("");
    setSoloVencidos(false);
    setHasSearched(false);
  };

  const saldosFiltrados = useMemo(() => {
    const numeroBuscado = filtroNumero.trim().toLowerCase();

    return saldos.filter((saldo) => {
      if (
        numeroBuscado &&
        !saldo.numeroDocumento?.toLowerCase().includes(numeroBuscado)
      ) {
        return false;
      }

      if (soloVencidos && saldo.diasVencidos <= 0) {
        return false;
      }

      return true;
    });
  }, [saldos, filtroNumero, soloVencidos]);

  const saldosPaginados = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return saldosFiltrados.slice(start, start + pageSize);
  }, [saldosFiltrados, currentPage, pageSize]);

  async function exportarExcel() {
    if (saldosFiltrados.length === 0) return;

    const XLSX = await import("xlsx");

    const header = [
      "Documento",
      "Cliente",
      "Auxiliar",
      "Vendedor",
      "C.O.",
      "Cupo de crédito",
      "Fecha documento",
      "Fecha vencimiento",
      "Plazo",
      "Días vencidos",
      "Corriente",
      "Ven. 1-15",
      "Ven. 16-30",
      "Ven. 31-60",
      "Ven. +60",
      "Total",
    ];

    const data = saldosFiltrados.map((saldo) => [
      saldo.numeroDocumento,
      saldo.razonSocialSucursal,
      saldo.auxiliar || "-",
      saldo.vendedor || "-",
      saldo.centroOperacion || "-",
      saldo.cupoCredito || "-",
      saldo.fechaDocumento || "-",
      saldo.fechaVencimiento || "-",
      saldo.plazo ?? "-",
      saldo.diasVencidos,
      saldo.totalCorriente,
      saldo.vencido1a15,
      saldo.vencido16a30,
      saldo.vencido31a60,
      saldo.vencidoMas60,
      saldo.total,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cartera");

    XLSX.writeFile(wb, `cartera-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-[115rem] mx-auto">
        <PageHeaderCard
          icon={Wallet}
          eyebrow="Consultas"
          title="Resumen de saldos de clientes"
          subtitle="Consulta el estado de cartera de tu cuenta (edades de vencimiento)."
          onBack={() => router.push("/consultas")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FilterField label="Número de documento">
              <input
                type="text"
                value={filtroNumeroInput}
                onChange={(e) => setFiltroNumeroInput(e.target.value)}
                placeholder="Ej: FEV-00098211"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>
            <FilterField label="Filtro adicional">
              <div className="flex items-center gap-2 h-9">
                <input
                  id="solo-vencidos"
                  type="checkbox"
                  checked={soloVencidosInput}
                  onChange={(e) => setSoloVencidosInput(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="solo-vencidos" className="text-sm font-medium text-gray-700">
                  Solo documentos vencidos
                </label>
              </div>
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
            title="Presiona Buscar para ver tu cartera."
            subtitle="Opcionalmente puedes filtrar antes de buscar."
          />
        ) : loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-gray-600">
            Cargando cartera...
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-red-600">
            No se pudo cargar la cartera.
          </div>
        ) : saldos.length === 0 ? (
          <EmptyStateCard icon={PackageOpen} title="No se encontraron saldos pendientes." />
        ) : saldosFiltrados.length === 0 ? (
          <EmptyStateCard
            icon={PackageOpen}
            title="Ningún documento coincide con los filtros aplicados."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <ResultsToolbar
              count={saldosFiltrados.length}
              label={`de ${saldos.length} documento(s)`}
              onExport={exportarExcel}
            />
            <TableContainer>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Documento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Auxiliar</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Vendedor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">C.O.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cupo de crédito</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Fecha documento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Fecha vencimiento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Plazo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Días vencidos</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Corriente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ven. 1-15</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ven. 16-30</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ven. 31-60</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ven. +60</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {saldosPaginados.map((saldo, index) => (
                    <tr
                      key={`${saldo.numeroDocumento}-${index}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {saldo.numeroDocumento}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.razonSocialSucursal}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.auxiliar || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.vendedor || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.centroOperacion || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${saldo.cupoCredito || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.fechaDocumento || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.fechaVencimiento || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{saldo.plazo ?? "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            saldo.diasVencidos > 60
                              ? "bg-red-100 text-red-700"
                              : saldo.diasVencidos > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {saldo.diasVencidos}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${saldo.totalCorriente}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${saldo.vencido1a15}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${saldo.vencido16a30}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${saldo.vencido31a60}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${saldo.vencidoMas60}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">${saldo.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </TableContainer>

            <TablePagination
              page={currentPage}
              pageSize={pageSize}
              totalItems={saldosFiltrados.length}
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
