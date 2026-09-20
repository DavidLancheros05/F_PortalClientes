"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { Package, PackageOpen, Search, X } from "lucide-react";
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
  pedidosService,
  type PedidoClienteResponse,
} from "@/services/pedidos/pedidos.service";

const ESTADOS_PEDIDO = [
  "En elaboración",
  "Retenido",
  "Aprobado",
  "Comprometido",
  "Comprometido parcial",
  "Cumplido",
  "Anulado",
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

export default function MisPedidosPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [pedidos, setPedidos] = useState<PedidoClienteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Valores que el usuario está escribiendo (ligados a los inputs).
  const [filtroNumeroInput, setFiltroNumeroInput] = useState("");
  const [filtroClienteInput, setFiltroClienteInput] = useState("");
  const [filtroEstadoInput, setFiltroEstadoInput] = useState("");
  const [filtroDescripcionInput, setFiltroDescripcionInput] = useState("");
  const [filtroNumeroPedidoInput, setFiltroNumeroPedidoInput] = useState("");
  const [filtroOrdenCompraInput, setFiltroOrdenCompraInput] = useState("");
  const [filtroReferenciaInput, setFiltroReferenciaInput] = useState("");
  const [filtroFechaDesdeInput, setFiltroFechaDesdeInput] = useState("");
  const [filtroFechaHastaInput, setFiltroFechaHastaInput] = useState("");

  // Valores realmente aplicados al filtrado — solo cambian al presionar
  // "Buscar" o "Limpiar filtros", no en cada tecla (igual que el resto de
  // páginas de listados del portal).
  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDescripcion, setFiltroDescripcion] = useState("");
  const [filtroNumeroPedido, setFiltroNumeroPedido] = useState("");
  const [filtroOrdenCompra, setFiltroOrdenCompra] = useState("");
  const [filtroReferencia, setFiltroReferencia] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!user?.cliente_id && !user?.ejng_id) return;

    async function cargarPedidos() {
      try {
        setLoading(true);
        setError(false);
        const data = user!.cliente_id
          ? await pedidosService.getPorCliente(user!.cliente_id!)
          : await pedidosService.getPorEjecutivo(user!.ejng_id!);
        setPedidos(data);
      } catch (err) {
        console.error("Error cargando pedidos:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    cargarPedidos();
  }, [user?.cliente_id, user?.ejng_id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filtroNumero,
    filtroCliente,
    filtroEstado,
    filtroDescripcion,
    filtroNumeroPedido,
    filtroOrdenCompra,
    filtroReferencia,
    filtroFechaDesde,
    filtroFechaHasta,
  ]); // deps: filtros aplicados (los que "Buscar"/"Limpiar" escriben), no los inputs en vivo

  const handleBuscar = () => {
    setHasSearched(true);
    setFiltroNumero(filtroNumeroInput);
    setFiltroCliente(filtroClienteInput);
    setFiltroEstado(filtroEstadoInput);
    setFiltroDescripcion(filtroDescripcionInput);
    setFiltroNumeroPedido(filtroNumeroPedidoInput);
    setFiltroOrdenCompra(filtroOrdenCompraInput);
    setFiltroReferencia(filtroReferenciaInput);
    setFiltroFechaDesde(filtroFechaDesdeInput);
    setFiltroFechaHasta(filtroFechaHastaInput);
  };

  const limpiarFiltros = () => {
    setFiltroNumeroInput("");
    setFiltroClienteInput("");
    setFiltroEstadoInput("");
    setFiltroDescripcionInput("");
    setFiltroNumeroPedidoInput("");
    setFiltroOrdenCompraInput("");
    setFiltroReferenciaInput("");
    setFiltroFechaDesdeInput("");
    setFiltroFechaHastaInput("");
    setFiltroNumero("");
    setFiltroCliente("");
    setFiltroEstado("");
    setFiltroDescripcion("");
    setFiltroNumeroPedido("");
    setFiltroOrdenCompra("");
    setFiltroReferencia("");
    setFiltroFechaDesde("");
    setFiltroFechaHasta("");
    setHasSearched(false);
  };

  const clientesDisponibles = useMemo(() => {
    const porNombre = new Map<string, string>();
    pedidos.forEach((pedido) => {
      if (pedido.clienteRazonSocial && !porNombre.has(pedido.clienteRazonSocial)) {
        porNombre.set(pedido.clienteRazonSocial, pedido.nit || "");
      }
    });
    return Array.from(porNombre.entries())
      .map(([nombre, nit]) => ({ nombre, nit }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [pedidos]);

  const clientesFiltrados = useMemo(() => {
    const term = filtroClienteInput.trim().toLowerCase();
    if (!term) return clientesDisponibles;
    return clientesDisponibles.filter(
      (c) =>
        c.nombre.toLowerCase().includes(term) ||
        c.nit.toLowerCase().includes(term),
    );
  }, [clientesDisponibles, filtroClienteInput]);

  const [mostrarClientes, setMostrarClientes] = useState(false);
  const clienteRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mostrarClientes) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        clienteRef.current &&
        !clienteRef.current.contains(event.target as Node)
      ) {
        setMostrarClientes(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrarClientes]);

  const pedidosFiltrados = useMemo(() => {
    const numeroBuscado = filtroNumero.trim().toLowerCase();
    const descripcionBuscada = filtroDescripcion.trim().toLowerCase();
    const numeroPedidoBuscado = filtroNumeroPedido.trim().toLowerCase();
    const ordenCompraBuscada = filtroOrdenCompra.trim().toLowerCase();
    const referenciaBuscada = filtroReferencia.trim().toLowerCase();
    const desde = filtroFechaDesde ? new Date(filtroFechaDesde) : null;
    const hasta = filtroFechaHasta ? new Date(filtroFechaHasta) : null;

    return pedidos.filter((pedido) => {
      if (
        numeroBuscado &&
        !pedido.numeroDocumento?.toLowerCase().includes(numeroBuscado)
      ) {
        return false;
      }

      if (filtroCliente && pedido.clienteRazonSocial !== filtroCliente) {
        return false;
      }

      if (filtroEstado && pedido.estado !== filtroEstado) {
        return false;
      }

      if (
        descripcionBuscada &&
        !pedido.descripcionItem?.toLowerCase().includes(descripcionBuscada)
      ) {
        return false;
      }

      if (
        numeroPedidoBuscado &&
        !String(pedido.numero ?? "")
          .toLowerCase()
          .includes(numeroPedidoBuscado)
      ) {
        return false;
      }

      if (
        ordenCompraBuscada &&
        !pedido.ordenCompra?.toLowerCase().includes(ordenCompraBuscada)
      ) {
        return false;
      }

      if (
        referenciaBuscada &&
        !pedido.referencia?.toLowerCase().includes(referenciaBuscada)
      ) {
        return false;
      }

      const fechaCreacion = pedido.fechaCreacion
        ? new Date(pedido.fechaCreacion)
        : null;

      if (desde && (!fechaCreacion || fechaCreacion < desde)) {
        return false;
      }

      if (hasta && (!fechaCreacion || fechaCreacion > hasta)) {
        return false;
      }

      return true;
    });
  }, [
    pedidos,
    filtroNumero,
    filtroCliente,
    filtroEstado,
    filtroDescripcion,
    filtroNumeroPedido,
    filtroOrdenCompra,
    filtroReferencia,
    filtroFechaDesde,
    filtroFechaHasta,
  ]);

  // Pool crudo de sugerencias por campo — SuggestField filtra/deduplica
  // internamente, acá solo se mapea la columna correspondiente.
  const numeroSugerencias = useMemo(
    () => pedidos.map((p) => p.numeroDocumento ?? ""),
    [pedidos],
  );
  const descripcionSugerencias = useMemo(
    () => pedidos.map((p) => p.descripcionItem ?? ""),
    [pedidos],
  );
  const numeroPedidoSugerencias = useMemo(
    () => pedidos.map((p) => String(p.numero ?? "")),
    [pedidos],
  );
  const ordenCompraSugerencias = useMemo(
    () => pedidos.map((p) => p.ordenCompra ?? ""),
    [pedidos],
  );
  const referenciaSugerencias = useMemo(
    () => pedidos.map((p) => p.referencia ?? ""),
    [pedidos],
  );

  const pedidosPaginados = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return pedidosFiltrados.slice(start, start + pageSize);
  }, [pedidosFiltrados, currentPage, pageSize]);

  async function exportarExcel() {
    if (pedidosFiltrados.length === 0) return;

    const XLSX = await import("xlsx");

    const header = [
      "Documento",
      "Número",
      "Cliente",
      "NIT",
      "Estado",
      "Fecha creación",
      "Fecha entrega",
      "Orden de compra",
      "Ítem",
      "Referencia",
      "Descripción",
      "Cant. pedida",
      "Cant. disponible",
      "Cant. remisionada",
      "Cant. pendiente",
      "Peso pendiente",
      "Volumen pendiente",
      "Ciudad",
      "Precio unitario",
      "Precio por peso",
      "Plan",
      "Vlr. pendiente subtotal",
      "Vlr. pendiente",
      "Dirección",
      "Vendedor",
      "Valor neto",
      "Valor bruto local",
      "Peso pedida",
      "CDV",
      "Notas",
    ];

    const data = pedidosFiltrados.map((pedido) => [
      pedido.numeroDocumento,
      pedido.numero,
      pedido.clienteRazonSocial,
      pedido.nit,
      pedido.estado,
      formatFecha(pedido.fechaCreacion),
      formatFecha(pedido.fechaEntrega),
      pedido.ordenCompra || "-",
      pedido.item,
      pedido.referencia,
      pedido.descripcionItem,
      formatNumero(pedido.cantidadPedida),
      formatNumero(pedido.cantidadDisponibleInsumo),
      formatNumero(pedido.cantidadRemisionada),
      formatNumero(pedido.cantidadPendiente),
      formatNumero(pedido.pesoPendiente),
      formatNumero(pedido.volumenPendiente),
      pedido.ciudad,
      formatNumero(pedido.precioUnitario),
      formatNumero(pedido.precioPeso),
      pedido.plan003 || "-",
      formatNumero(pedido.valorPendienteSubtotal),
      formatNumero(pedido.valorPendiente),
      pedido.direccion,
      pedido.vendedor,
      formatNumero(pedido.valorNeto),
      formatNumero(pedido.valorBrutoLocal),
      formatNumero(pedido.pesoPedida),
      pedido.cdv || "-",
      pedido.notas || "-",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");

    XLSX.writeFile(wb, `mis-pedidos-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-[115rem] mx-auto">
        <PageHeaderCard
          icon={Package}
          eyebrow="Pedidos"
          title="Listado de pedidos"
          subtitle="Consulta y seguimiento de los pedidos asociados a tu usuario."
          onBack={() => router.push("/pedidos")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <SuggestField
              label="Número de documento"
              placeholder="Ej: PV-00259993"
              value={filtroNumeroInput}
              onChange={setFiltroNumeroInput}
              suggestions={numeroSugerencias}
              onEnter={handleBuscar}
            />
            <FilterField label="Cliente" className="relative" ref={clienteRef}>
              <input
                type="text"
                placeholder="Nombre o NIT..."
                value={filtroClienteInput}
                onFocus={() => setMostrarClientes(true)}
                onChange={(e) => {
                  setFiltroClienteInput(e.target.value);
                  setMostrarClientes(true);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {mostrarClientes && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {filtroClienteInput && (
                    <div
                      onClick={() => {
                        setFiltroClienteInput("");
                        setMostrarClientes(false);
                      }}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 text-gray-500"
                    >
                      Todos
                    </div>
                  )}
                  {clientesFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Sin resultados
                    </div>
                  ) : (
                    clientesFiltrados.map((cliente) => (
                      <div
                        key={cliente.nombre}
                        onClick={() => {
                          setFiltroClienteInput(cliente.nombre);
                          setMostrarClientes(false);
                        }}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {cliente.nombre}
                        </div>
                        {cliente.nit && (
                          <div className="text-xs text-gray-500">
                            NIT {cliente.nit}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </FilterField>
            <FilterField label="Estado">
              <select
                value={filtroEstadoInput}
                onChange={(e) => setFiltroEstadoInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                {ESTADOS_PEDIDO.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </FilterField>
            <SuggestField
              label="Descripción"
              placeholder="Ej: CAJA CJ 3550"
              value={filtroDescripcionInput}
              onChange={setFiltroDescripcionInput}
              suggestions={descripcionSugerencias}
              onEnter={handleBuscar}
            />
            <SuggestField
              label="Número de pedido"
              placeholder="Ej: 259993"
              value={filtroNumeroPedidoInput}
              onChange={setFiltroNumeroPedidoInput}
              suggestions={numeroPedidoSugerencias}
              onEnter={handleBuscar}
            />
            <SuggestField
              label="Orden de compra"
              placeholder="Ej: 19078"
              value={filtroOrdenCompraInput}
              onChange={setFiltroOrdenCompraInput}
              suggestions={ordenCompraSugerencias}
              onEnter={handleBuscar}
            />
            <SuggestField
              label="Referencia"
              placeholder="Ej: BAR00002571571"
              value={filtroReferenciaInput}
              onChange={setFiltroReferenciaInput}
              suggestions={referenciaSugerencias}
              onEnter={handleBuscar}
            />
            <FilterField label="Fecha creación desde">
              <input
                type="date"
                value={filtroFechaDesdeInput}
                onChange={(e) => setFiltroFechaDesdeInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FilterField>
            <FilterField label="Fecha creación hasta">
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
            title="Presiona Buscar para ver tus pedidos."
            subtitle="Opcionalmente puedes filtrar antes de buscar."
          />
        ) : loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-gray-600">
            Cargando pedidos...
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-red-600">
            No se pudieron cargar los pedidos.
          </div>
        ) : pedidos.length === 0 ? (
          <EmptyStateCard icon={PackageOpen} title="No se encontraron pedidos." />
        ) : pedidosFiltrados.length === 0 ? (
          <EmptyStateCard
            icon={PackageOpen}
            title="Ningún pedido coincide con los filtros aplicados."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <ResultsToolbar
              count={pedidosFiltrados.length}
              label={`de ${pedidos.length} pedido(s)`}
              onExport={exportarExcel}
            />
            <TableContainer>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <Th className="whitespace-nowrap">Documento</Th>
                    <Th className="whitespace-nowrap">Número</Th>
                    <Th className="whitespace-nowrap">Cliente</Th>
                    <Th className="whitespace-nowrap">NIT</Th>
                    <Th className="whitespace-nowrap">Estado</Th>
                    <Th className="whitespace-nowrap">Fecha creación</Th>
                    <Th className="whitespace-nowrap">Fecha entrega</Th>
                    <Th className="whitespace-nowrap">Orden de compra</Th>
                    <Th className="whitespace-nowrap">Ítem</Th>
                    <Th className="whitespace-nowrap">Referencia</Th>
                    <Th className="whitespace-nowrap">Descripción</Th>
                    <Th className="whitespace-nowrap">Cant. pedida</Th>
                    <Th className="whitespace-nowrap">Cant. disponible</Th>
                    <Th className="whitespace-nowrap">Cant. remisionada</Th>
                    <Th className="whitespace-nowrap">Cant. pendiente</Th>
                    <Th className="whitespace-nowrap">Peso pendiente</Th>
                    <Th className="whitespace-nowrap">Volumen pendiente</Th>
                    <Th className="whitespace-nowrap">Ciudad</Th>
                    <Th className="whitespace-nowrap">Precio unitario</Th>
                    <Th className="whitespace-nowrap">Precio por peso</Th>
                    <Th className="whitespace-nowrap">Plan</Th>
                    <Th className="whitespace-nowrap">Vlr. pendiente subtotal</Th>
                    <Th className="whitespace-nowrap">Vlr. pendiente</Th>
                    <Th className="whitespace-nowrap">Dirección</Th>
                    <Th className="whitespace-nowrap">Vendedor</Th>
                    <Th className="whitespace-nowrap">Valor neto</Th>
                    <Th className="whitespace-nowrap">Valor bruto local</Th>
                    <Th className="whitespace-nowrap">Peso pedida</Th>
                    <Th className="whitespace-nowrap">CDV</Th>
                    <Th className="whitespace-nowrap">Notas</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pedidosPaginados.map((pedido, index) => (
                    <Tr
                      key={`${pedido.numeroDocumento}-${pedido.item}-${index}`}
                    >
                      <Td className="whitespace-nowrap font-medium">
                        {pedido.numeroDocumento}
                      </Td>
                      <Td className="whitespace-nowrap">{pedido.numero}</Td>
                      <Td className="whitespace-nowrap">{pedido.clienteRazonSocial}</Td>
                      <Td className="whitespace-nowrap">{pedido.nit}</Td>
                      <Td className="whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            pedido.estado === "Cumplido"
                              ? "bg-green-100 text-green-700"
                              : pedido.estado === "Comprometido" ||
                                  pedido.estado === "Comprometido parcial"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {pedido.estado}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap">{formatFecha(pedido.fechaCreacion)}</Td>
                      <Td className="whitespace-nowrap">{formatFecha(pedido.fechaEntrega)}</Td>
                      <Td className="whitespace-nowrap">{pedido.ordenCompra || "-"}</Td>
                      <Td className="whitespace-nowrap">{pedido.item}</Td>
                      <Td className="whitespace-nowrap">{pedido.referencia}</Td>
                      <Td className="whitespace-nowrap">{pedido.descripcionItem}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(pedido.cantidadPedida)}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(pedido.cantidadDisponibleInsumo)}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(pedido.cantidadRemisionada)}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(pedido.cantidadPendiente)}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(pedido.pesoPendiente)}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(pedido.volumenPendiente)}</Td>
                      <Td className="whitespace-nowrap">{pedido.ciudad}</Td>
                      <Td className="whitespace-nowrap">${formatNumero(pedido.precioUnitario)}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(pedido.precioPeso)}</Td>
                      <Td className="whitespace-nowrap">{pedido.plan003 || "-"}</Td>
                      <Td className="whitespace-nowrap">${formatNumero(pedido.valorPendienteSubtotal)}</Td>
                      <Td className="whitespace-nowrap">${formatNumero(pedido.valorPendiente)}</Td>
                      <Td className="whitespace-nowrap">{pedido.direccion}</Td>
                      <Td className="whitespace-nowrap">{pedido.vendedor}</Td>
                      <Td className="whitespace-nowrap">${formatNumero(pedido.valorNeto)}</Td>
                      <Td className="whitespace-nowrap">${formatNumero(pedido.valorBrutoLocal)}</Td>
                      <Td className="whitespace-nowrap">{formatNumero(pedido.pesoPedida)}</Td>
                      <Td className="whitespace-nowrap">{pedido.cdv || "-"}</Td>
                      <Td className="whitespace-nowrap">{pedido.notas || "-"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </table>
            </div>
            </TableContainer>

            <TablePagination
              page={currentPage}
              pageSize={pageSize}
              totalItems={pedidosFiltrados.length}
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
