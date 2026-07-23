"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
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

  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDescripcion, setFiltroDescripcion] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  useEffect(() => {
    if (!user?.cliente_id) return;

    async function cargarPedidos() {
      try {
        setLoading(true);
        setError(false);
        const data = await pedidosService.getPorCliente(user!.cliente_id!);
        setPedidos(data);
      } catch (err) {
        console.error("Error cargando pedidos:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    cargarPedidos();
  }, [user?.cliente_id]);

  const limpiarFiltros = () => {
    setFiltroNumero("");
    setFiltroEstado("");
    setFiltroDescripcion("");
    setFiltroFechaDesde("");
    setFiltroFechaHasta("");
  };

  const pedidosFiltrados = useMemo(() => {
    const numeroBuscado = filtroNumero.trim().toLowerCase();
    const descripcionBuscada = filtroDescripcion.trim().toLowerCase();
    const desde = filtroFechaDesde ? new Date(filtroFechaDesde) : null;
    const hasta = filtroFechaHasta ? new Date(filtroFechaHasta) : null;

    return pedidos.filter((pedido) => {
      if (
        numeroBuscado &&
        !pedido.numeroDocumento?.toLowerCase().includes(numeroBuscado)
      ) {
        return false;
      }

      if (filtroEstado && pedido.estado !== filtroEstado) {
        return false;
      }

      if (
        descripcionBuscada &&
        !pedido.descripcionItem?.toLowerCase().includes(descripcionBuscada) &&
        !pedido.referencia?.toLowerCase().includes(descripcionBuscada)
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
    filtroEstado,
    filtroDescripcion,
    filtroFechaDesde,
    filtroFechaHasta,
  ]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-full mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/pedidos")}
            className="mb-4 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver a pedidos
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Mis pedidos</h1>
          <p className="text-gray-600 mt-2">
            Consulta y seguimiento de los pedidos asociados a tu usuario.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de documento
              </label>
              <input
                type="text"
                value={filtroNumero}
                onChange={(e) => setFiltroNumero(e.target.value)}
                placeholder="Ej: PV-00259993"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                {ESTADOS_PEDIDO.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referencia o descripción
              </label>
              <input
                type="text"
                value={filtroDescripcion}
                onChange={(e) => setFiltroDescripcion(e.target.value)}
                placeholder="Ej: CAJA CJ 3550"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha creación desde
              </label>
              <input
                type="date"
                value={filtroFechaDesde}
                onChange={(e) => setFiltroFechaDesde(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha creación hasta
              </label>
              <input
                type="date"
                value={filtroFechaHasta}
                onChange={(e) => setFiltroFechaHasta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={limpiarFiltros}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Mis pedidos</h2>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {pedidosFiltrados.length} de {pedidos.length} registros
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-600">
              Cargando pedidos...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              No se pudieron cargar los pedidos.
            </div>
          ) : pedidos.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              No se encontraron pedidos.
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              Ningún pedido coincide con los filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Documento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">NIT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Fecha creación</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Fecha entrega</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Orden de compra</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ítem</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Referencia</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cant. pedida</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cant. disponible</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cant. remisionada</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Cant. pendiente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Peso pendiente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Volumen pendiente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Ciudad</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Precio unitario</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Precio por peso</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Vlr. pendiente subtotal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Vlr. pendiente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Dirección</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Vendedor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Valor neto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Valor bruto local</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Peso pedida</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">CDV</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase whitespace-nowrap">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pedidosFiltrados.map((pedido, index) => (
                    <tr
                      key={`${pedido.numeroDocumento}-${pedido.item}-${index}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                        {pedido.numeroDocumento}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pedido.numero}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pedido.clienteRazonSocial}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pedido.nit}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
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
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatFecha(pedido.fechaCreacion)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatFecha(pedido.fechaEntrega)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pedido.ordenCompra || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pedido.item}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pedido.referencia}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pedido.descripcionItem}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(pedido.cantidadPedida)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(pedido.cantidadDisponibleInsumo)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(pedido.cantidadRemisionada)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(pedido.cantidadPendiente)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(pedido.pesoPendiente)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(pedido.volumenPendiente)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pedido.ciudad}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(pedido.precioUnitario)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(pedido.precioPeso)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pedido.plan003 || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(pedido.valorPendienteSubtotal)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(pedido.valorPendiente)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pedido.direccion}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pedido.vendedor}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(pedido.valorNeto)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">${formatNumero(pedido.valorBrutoLocal)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatNumero(pedido.pesoPedida)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pedido.cdv || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{pedido.notas || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
