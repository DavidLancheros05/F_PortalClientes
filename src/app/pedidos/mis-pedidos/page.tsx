 "use client";

import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { cachedRequest } from "@/services/core/requestCache";
import { clientesService } from "@/services/clientes/clientes.service";
import {
  pedidosService,
  type PedidoClienteResponse,
} from "@/services/pedidos/pedidos.service";

// "Cumplido" y "Anulado" no se ofrecen: la consulta de SIESA los excluye.
const ESTADOS_PEDIDO = [
  "En elaboración",
  "Retenido",
  "Aprobado",
  "Comprometido",
  "Comprometido parcial",
];

// Quién ve qué — ver documentacion/Portal Clientes/CONSULTAS/
// listado-pedidos-por-tipo-de-usuario.md:
// - cliente: sus pedidos; Ejecutivo y Cliente se muestran fijos (de su
//   perfil, solo lectura), sin columnas internas.
// - ejecutivo: su cartera; el filtro Cliente busca dentro de ella.
// - interno (sin cartera): debe elegir un cliente antes de Buscar.
type Modo = "cliente" | "ejecutivo" | "interno";

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

function estadoBadge(estado: string) {
  const clase =
    estado === "Comprometido" || estado === "Comprometido parcial"
      ? "bg-amber-100 text-amber-700"
      : "bg-sky-100 text-sky-700";
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${clase}`}>
      {estado}
    </span>
  );
}

interface Columna {
  titulo: string;
  // Valor para el Excel (y para la celda si no hay `celda`).
  valor: (p: PedidoClienteResponse) => string | number | null | undefined;
  celda?: (p: PedidoClienteResponse) => ReactNode;
  soloInternos?: boolean;
}

const texto = (v: string | null | undefined) => v || "-";
const dinero = (v: number | null | undefined) => `$${formatNumero(v)}`;

// Única fuente de columnas para tabla y Excel. `soloInternos` debe coincidir
// con lo que el backend le quita al cliente (CAMPOS_VISIBLES_CLIENTE).
const COLUMNAS: Columna[] = [
  { titulo: "Documento", valor: (p) => p.numeroDocumento, celda: (p) => <span className="font-medium">{p.numeroDocumento}</span> },
  { titulo: "Número", valor: (p) => p.numero },
  { titulo: "Cliente portal", valor: (p) => texto(p.clientePortal), soloInternos: true },
  { titulo: "Cliente SIESA", valor: (p) => texto(p.clienteRazonSocial), soloInternos: true },
  { titulo: "NIT", valor: (p) => texto(p.nit), soloInternos: true },
  { titulo: "Estado", valor: (p) => p.estado, celda: (p) => estadoBadge(p.estado) },
  { titulo: "Fecha creación", valor: (p) => formatFecha(p.fechaCreacion) },
  { titulo: "Fecha entrega", valor: (p) => formatFecha(p.fechaEntrega) },
  { titulo: "Orden de compra", valor: (p) => texto(p.ordenCompra) },
  { titulo: "Ítem", valor: (p) => p.item, soloInternos: true },
  { titulo: "Referencia", valor: (p) => p.referencia },
  { titulo: "Descripción", valor: (p) => p.descripcionItem },
  { titulo: "Cant. pedida", valor: (p) => formatNumero(p.cantidadPedida) },
  { titulo: "Cant. disponible", valor: (p) => formatNumero(p.cantidadDisponibleInsumo), soloInternos: true },
  { titulo: "Cant. remisionada", valor: (p) => formatNumero(p.cantidadRemisionada) },
  { titulo: "Cant. pendiente", valor: (p) => formatNumero(p.cantidadPendiente) },
  { titulo: "Peso pendiente", valor: (p) => formatNumero(p.pesoPendiente), soloInternos: true },
  { titulo: "Volumen pendiente", valor: (p) => formatNumero(p.volumenPendiente), soloInternos: true },
  { titulo: "Ciudad", valor: (p) => p.ciudad },
  { titulo: "Dirección", valor: (p) => p.direccion },
  { titulo: "Precio unitario", valor: (p) => formatNumero(p.precioUnitario), celda: (p) => dinero(p.precioUnitario) },
  { titulo: "Precio por peso", valor: (p) => formatNumero(p.precioPeso), soloInternos: true },
  { titulo: "Plan", valor: (p) => texto(p.plan003), soloInternos: true },
  { titulo: "Vlr. pendiente subtotal", valor: (p) => formatNumero(p.valorPendienteSubtotal), celda: (p) => dinero(p.valorPendienteSubtotal) },
  { titulo: "Vlr. pendiente", valor: (p) => formatNumero(p.valorPendiente), celda: (p) => dinero(p.valorPendiente) },
  { titulo: "Vendedor", valor: (p) => texto(p.vendedor), soloInternos: true },
  { titulo: "Valor neto", valor: (p) => formatNumero(p.valorNeto), celda: (p) => dinero(p.valorNeto) },
  { titulo: "Valor bruto local", valor: (p) => formatNumero(p.valorBrutoLocal), celda: (p) => dinero(p.valorBrutoLocal), soloInternos: true },
  { titulo: "Peso pedida", valor: (p) => formatNumero(p.pesoPedida), soloInternos: true },
  { titulo: "CDV", valor: (p) => texto(p.cdv), soloInternos: true },
  { titulo: "Notas", valor: (p) => texto(p.notas) },
];

interface OpcionCliente {
  clave: string;
  nombre: string;
  detalle: string;
  busqueda: string;
  ejngId?: string | null;
}

interface OpcionEjecutivo {
  id: string;
  nombre: string;
}

export default function MisPedidosPage() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const modo: Modo | null = !user
    ? null
    : user.cliente_id
      ? "cliente"
      : user.ejng_id
        ? "ejecutivo"
        : "interno";

  const [pedidos, setPedidos] = useState<PedidoClienteResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Interno sin cartera: clientes del portal para elegir, y el elegido.
  const [clientesPortal, setClientesPortal] = useState<OpcionCliente[]>([]);
  const [clienteElegido, setClienteElegido] = useState<OpcionCliente | null>(null);

  // Filtro Ejecutivo (primero): el ejecutivo lo ve fijo en sí mismo; el
  // interno elige uno para ver su cartera o acotar la lista de clientes.
  const [ejecutivos, setEjecutivos] = useState<OpcionEjecutivo[]>([]);
  const [ejecutivoElegido, setEjecutivoElegido] = useState<OpcionEjecutivo | null>(null);
  const [ejecutivoInput, setEjecutivoInput] = useState("");

  // Qué se le pidió a SIESA la última vez ("cli:<id>" o "ejng:<id>"): solo
  // se vuelve a consultar si cambia — cada consulta tarda varios segundos.
  const [consultaCargada, setConsultaCargada] = useState<string | null>(null);

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

  async function cargarPedidos(fetchFn: () => Promise<PedidoClienteResponse[]>) {
    try {
      setLoading(true);
      setError(false);
      setPedidos(await fetchFn());
    } catch (err) {
      console.error("Error cargando pedidos:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // Cliente y ejecutivo: sus pedidos se cargan al entrar.
  useEffect(() => {
    if (modo === "cliente") {
      cargarPedidos(() => pedidosService.getPorCliente(user!.cliente_id!));
    } else if (modo === "ejecutivo") {
      cargarPedidos(() => pedidosService.getPorEjecutivo(user!.ejng_id!));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, user?.cliente_id, user?.ejng_id]);

  // Interno sin cartera: lista de clientes del portal para elegir.
  useEffect(() => {
    if (modo !== "interno") return;
    cachedRequest("listado-solicitudes-clientes", () => clientesService.getAll())
      .then((data) =>
        setClientesPortal(
          (data || [])
            .filter((c) => c.cli_id > 0)
            .map((c) => {
              const nit = (c.cli_nro_identificacion || "").trim();
              return {
                clave: String(c.cli_id),
                nombre: c.cli_razon_social,
                detalle: nit ? `NIT ${nit}` : "",
                busqueda: `${c.cli_razon_social} ${nit}`.toLowerCase(),
                ejngId: c.ejng_id != null ? String(c.ejng_id) : null,
              };
            }),
        ),
      )
      .catch((err) => console.error("Error cargando clientes:", err));
  }, [modo]);

  // Cliente: ejecutivo y cliente se muestran fijos, tomados de su perfil.
  const [perfilCliente, setPerfilCliente] = useState<{
    cliente: string;
    ejecutivo: string;
  } | null>(null);
  useEffect(() => {
    if (modo !== "cliente") return;
    clientesService
      .getPerfil()
      .then((perfil) =>
        setPerfilCliente({
          cliente: perfil.cli_razon_social ?? "",
          ejecutivo: perfil.ejecutivo?.nombre ?? "",
        }),
      )
      .catch((err) => console.error("Error cargando perfil del cliente:", err));
  }, [modo]);

  // Ejecutivos de negocio para el primer filtro (el ejecutivo lo ve fijo).
  useEffect(() => {
    if (modo !== "interno" && modo !== "ejecutivo") return;
    clientesService
      .getEjecutivosNegocio()
      .then((data) => {
        const lista = (data || []).map((e) => ({
          id: String(e.ejng_id),
          nombre: e.ejng_nombre,
        }));
        setEjecutivos(lista);
        if (modo === "ejecutivo") {
          const propio = lista.find((e) => e.id === String(user?.ejng_id));
          setEjecutivoInput(propio?.nombre ?? "");
        }
      })
      .catch((err) => console.error("Error cargando ejecutivos:", err));
  }, [modo, user?.ejng_id]);

  useEffect(() => {
    setCurrentPage(1);
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
  ]); // deps: filtros aplicados (los que "Buscar"/"Limpiar" escriben), no los inputs en vivo

  const handleBuscar = () => {
    setHasSearched(true);
    // Interno: el cliente elegido decide qué se consulta (solo se vuelve a
    // pedir a SIESA si cambió o si la anterior falló — la consulta tarda
    // varios segundos).
    // Con cliente → sus pedidos; sin cliente pero con ejecutivo → la cartera
    // completa de ese ejecutivo.
    if (modo === "interno") {
      const ejecutivo = ejecutivoElegido ?? resolverEjecutivoEscrito();
      if (ejecutivo && !ejecutivoElegido) elegirEjecutivo(ejecutivo);
      const cliente = clienteElegido ?? resolverClienteEscrito(ejecutivo);
      if (cliente && !clienteElegido) elegirCliente(cliente);

      const consulta = cliente
        ? `cli:${cliente.clave}`
        : ejecutivo
          ? `ejng:${ejecutivo.id}`
          : null;
      if (!consulta) {
        setPedidos([]);
        setConsultaCargada(null);
      } else if (consulta !== consultaCargada || error) {
        setConsultaCargada(consulta);
        cargarPedidos(() =>
          cliente
            ? pedidosService.getPorCliente(Number(cliente.clave))
            : pedidosService.getPorEjecutivo(Number(ejecutivo!.id)),
        );
      }
    } else if (modo === "ejecutivo") {
      setFiltroCliente(filtroClienteInput);
    }
    setFiltroNumero(filtroNumeroInput);
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
    setClienteElegido(null);
    if (modo === "interno") {
      setEjecutivoElegido(null);
      setEjecutivoInput("");
    }
    setHasSearched(false);
  };

  // Ejecutivo: clientes de su cartera que aparecen en los pedidos, buscables
  // por nombre del portal, nombre en SIESA o NIT (pueden diferir: "DLLS1
  // SAS" en el portal es "ASSOCIATED BRANDS COLOMBIA" en SIESA).
  const clientesCartera = useMemo(() => {
    const porNit = new Map<string, OpcionCliente>();
    pedidos.forEach((p) => {
      const clave = p.nit || p.clienteRazonSocial || "";
      if (!clave || porNit.has(clave)) return;
      const nombre = p.clientePortal || p.clienteRazonSocial || "";
      const siesa =
        p.clienteRazonSocial && p.clienteRazonSocial !== p.clientePortal
          ? ` · SIESA: ${p.clienteRazonSocial}`
          : "";
      porNit.set(clave, {
        clave,
        nombre,
        detalle: `${p.nit ? `NIT ${p.nit}` : ""}${siesa}`,
        busqueda: `${p.clientePortal ?? ""} ${p.clienteRazonSocial ?? ""} ${p.nit ?? ""}`.toLowerCase(),
      });
    });
    return Array.from(porNit.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [pedidos]);

  // Interno: el ejecutivo elegido acota la lista de clientes a su cartera.
  const clientesPortalDelEjecutivo = useMemo(
    () =>
      ejecutivoElegido
        ? clientesPortal.filter((c) => c.ejngId === ejecutivoElegido.id)
        : clientesPortal,
    [clientesPortal, ejecutivoElegido],
  );

  const opcionesCliente =
    modo === "interno" ? clientesPortalDelEjecutivo : clientesCartera;

  const opcionesClienteFiltradas = useMemo(() => {
    const term = filtroClienteInput.trim().toLowerCase();
    const filtradas = term
      ? opcionesCliente.filter((c) => c.busqueda.includes(term))
      : opcionesCliente;
    // La lista de clientes del portal es larga: se muestran los primeros.
    return filtradas.slice(0, 50);
  }, [opcionesCliente, filtroClienteInput]);

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

  const elegirCliente = (opcion: OpcionCliente | null) => {
    setFiltroClienteInput(opcion?.nombre ?? "");
    if (modo === "interno") setClienteElegido(opcion);
    setMostrarClientes(false);
  };

  const [mostrarEjecutivos, setMostrarEjecutivos] = useState(false);
  const ejecutivoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mostrarEjecutivos) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        ejecutivoRef.current &&
        !ejecutivoRef.current.contains(event.target as Node)
      ) {
        setMostrarEjecutivos(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrarEjecutivos]);

  const ejecutivosFiltrados = useMemo(() => {
    const term = ejecutivoInput.trim().toLowerCase();
    return term
      ? ejecutivos.filter((e) => e.nombre.toLowerCase().includes(term))
      : ejecutivos;
  }, [ejecutivos, ejecutivoInput]);

  const elegirEjecutivo = (opcion: OpcionEjecutivo | null) => {
    setEjecutivoInput(opcion?.nombre ?? "");
    setEjecutivoElegido(opcion);
    setMostrarEjecutivos(false);
    // Si el cliente ya elegido no es de este ejecutivo, se suelta.
    if (opcion && clienteElegido && clienteElegido.ejngId !== opcion.id) {
      setClienteElegido(null);
      setFiltroClienteInput("");
    }
  };

  // Interno que escribió sin hacer clic en la lista: se toma la opción si el
  // texto es exactamente su nombre (o NIT), o si solo una coincide.
  const resolverEjecutivoEscrito = (): OpcionEjecutivo | null => {
    const term = ejecutivoInput.trim().toLowerCase();
    if (!term) return null;
    const exacto = ejecutivos.find((e) => e.nombre.toLowerCase() === term);
    if (exacto) return exacto;
    return ejecutivosFiltrados.length === 1 ? ejecutivosFiltrados[0] : null;
  };

  const resolverClienteEscrito = (
    ejecutivo: OpcionEjecutivo | null,
  ): OpcionCliente | null => {
    const term = filtroClienteInput.trim().toLowerCase();
    if (!term) return null;
    const candidatos = ejecutivo
      ? clientesPortal.filter((c) => c.ejngId === ejecutivo.id)
      : clientesPortal;
    const exacto = candidatos.find(
      (c) =>
        c.nombre.toLowerCase() === term ||
        c.detalle.toLowerCase() === `nit ${term}`,
    );
    if (exacto) return exacto;
    const coincidencias = candidatos.filter((c) => c.busqueda.includes(term));
    return coincidencias.length === 1 ? coincidencias[0] : null;
  };

  // Para el mensaje de "sin pedidos" del interno: a quién se consultó.
  const [tipoConsulta, idConsulta] = consultaCargada?.split(":") ?? [];
  const clienteConsultado =
    modo === "interno" && tipoConsulta === "cli"
      ? clientesPortal.find((c) => c.clave === idConsulta)
      : undefined;
  const ejecutivoConsultado =
    modo === "interno" && tipoConsulta === "ejng"
      ? ejecutivos.find((e) => e.id === idConsulta)
      : undefined;

  const pedidosFiltrados = useMemo(() => {
    const numeroBuscado = filtroNumero.trim().toLowerCase();
    const clienteBuscado = filtroCliente.trim().toLowerCase();
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

      // Solo ejecutivo (el interno elige el cliente antes de consultar).
      if (
        clienteBuscado &&
        !`${pedido.clientePortal ?? ""} ${pedido.clienteRazonSocial ?? ""} ${pedido.nit ?? ""}`
          .toLowerCase()
          .includes(clienteBuscado)
      ) {
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

  const columnas = useMemo(
    () => COLUMNAS.filter((c) => modo !== "cliente" || !c.soloInternos),
    [modo],
  );

  const pedidosPaginados = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return pedidosFiltrados.slice(start, start + pageSize);
  }, [pedidosFiltrados, currentPage, pageSize]);

  async function exportarExcel() {
    if (pedidosFiltrados.length === 0) return;

    const XLSX = await import("xlsx");

    const header = columnas.map((c) => c.titulo);
    const data = pedidosFiltrados.map((pedido) =>
      columnas.map((c) => c.valor(pedido) ?? "-"),
    );

    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");

    XLSX.writeFile(wb, `pedidos-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const subtitulo =
    modo === "cliente"
      ? "Consulta y seguimiento de tus pedidos."
      : modo === "ejecutivo"
        ? "Pedidos de los clientes de tu cartera."
        : "Elige un ejecutivo de negocios o un cliente para consultar sus pedidos.";

  let resultado: ReactNode;
  if (!hasSearched) {
    resultado = (
      <EmptyStateCard
        icon={PackageOpen}
        title={
          modo === "interno"
            ? "Elige un ejecutivo o un cliente y presiona Buscar."
            : "Presiona Buscar para ver tus pedidos."
        }
        subtitle={
          modo === "interno"
            ? "Con solo el ejecutivo se trae toda su cartera (puede tardar); con un cliente, solo los de ese cliente."
            : "Opcionalmente puedes filtrar antes de buscar."
        }
      />
    );
  } else if (modo === "interno" && !consultaCargada) {
    const escrito = filtroClienteInput.trim() || ejecutivoInput.trim();
    resultado = (
      <EmptyStateCard
        icon={PackageOpen}
        title="Elige un ejecutivo o un cliente de la lista para buscar pedidos."
        subtitle={
          escrito
            ? `Más de una opción coincide con "${escrito}" (o ninguna): selecciónala en la lista desplegable.`
            : undefined
        }
      />
    );
  } else if (loading) {
    resultado = (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-gray-600">
        {tipoConsulta === "ejng" || modo === "ejecutivo"
          ? "Cargando los pedidos de toda la cartera, puede tardar hasta un minuto..."
          : "Cargando pedidos..."}
      </div>
    );
  } else if (error) {
    resultado = (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-12 text-center text-red-600">
        No se pudieron cargar los pedidos.
      </div>
    );
  } else if (pedidos.length === 0) {
    resultado = (
      <EmptyStateCard
        icon={PackageOpen}
        title={
          clienteConsultado
            ? `${clienteConsultado.nombre} no tiene pedidos abiertos en SIESA.`
            : ejecutivoConsultado
              ? `Ningún cliente de la cartera de ${ejecutivoConsultado.nombre} tiene pedidos abiertos en SIESA.`
              : "No se encontraron pedidos."
        }
        subtitle={
          clienteConsultado
            ? `Se buscó por ${clienteConsultado.detalle || "su NIT (vacío en el portal)"} en los últimos 5 años. Si el NIT del portal no coincide con el de SIESA, no aparecerán.`
            : undefined
        }
      />
    );
  } else if (pedidosFiltrados.length === 0) {
    resultado = (
      <EmptyStateCard
        icon={PackageOpen}
        title="Ningún pedido coincide con los filtros aplicados."
      />
    );
  } else {
    resultado = (
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
                  {columnas.map((c) => (
                    <Th key={c.titulo} className="whitespace-nowrap">
                      {c.titulo}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pedidosPaginados.map((pedido, index) => (
                  <Tr key={`${pedido.numeroDocumento}-${pedido.referencia}-${index}`}>
                    {columnas.map((c) => (
                      <Td key={c.titulo} className="whitespace-nowrap">
                        {c.celda ? c.celda(pedido) : c.valor(pedido)}
                      </Td>
                    ))}
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-[115rem] mx-auto">
        <PageHeaderCard
          icon={Package}
          eyebrow="Pedidos"
          title="Listado de pedidos"
          subtitle={subtitulo}
          onBack={() => router.push("/pedidos")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {modo === "cliente" && (
              <>
                <FilterField label="Ejecutivo de negocios">
                  <input
                    type="text"
                    value={perfilCliente?.ejecutivo || (perfilCliente ? "Sin asignar" : "")}
                    placeholder="Cargando..."
                    disabled
                    title="Tu ejecutivo de negocios asignado"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                  />
                </FilterField>
                <FilterField label="Cliente">
                  <input
                    type="text"
                    value={perfilCliente?.cliente ?? ""}
                    placeholder="Cargando..."
                    disabled
                    title="Solo puedes ver tus propios pedidos"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                  />
                </FilterField>
              </>
            )}
            {modo !== "cliente" && (
              <FilterField
                label="Ejecutivo de negocios"
                className="relative"
                ref={ejecutivoRef}
              >
                <input
                  type="text"
                  placeholder="Buscar ejecutivo..."
                  value={ejecutivoInput}
                  disabled={modo === "ejecutivo"}
                  title={
                    modo === "ejecutivo"
                      ? "Solo puedes ver los pedidos de tu cartera"
                      : undefined
                  }
                  onFocus={() => setMostrarEjecutivos(true)}
                  onChange={(e) => {
                    setEjecutivoInput(e.target.value);
                    setEjecutivoElegido(null);
                    setMostrarEjecutivos(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setMostrarEjecutivos(false);
                      handleBuscar();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
                />
                {modo === "interno" && mostrarEjecutivos && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {ejecutivoInput && (
                      <div
                        onClick={() => elegirEjecutivo(null)}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 text-gray-500"
                      >
                        Quitar selección
                      </div>
                    )}
                    {ejecutivosFiltrados.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Sin resultados
                      </div>
                    ) : (
                      ejecutivosFiltrados.map((ejecutivo) => (
                        <div
                          key={ejecutivo.id}
                          onClick={() => elegirEjecutivo(ejecutivo)}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          {ejecutivo.nombre}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </FilterField>
            )}
            {modo !== "cliente" && (
              <FilterField
                label="Cliente"
                className="relative"
                ref={clienteRef}
              >
                <input
                  type="text"
                  placeholder="Nombre o NIT..."
                  value={filtroClienteInput}
                  onFocus={() => setMostrarClientes(true)}
                  onChange={(e) => {
                    setFiltroClienteInput(e.target.value);
                    // Escribir invalida la elección: hay que volver a
                    // elegir de la lista.
                    if (modo === "interno") setClienteElegido(null);
                    setMostrarClientes(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setMostrarClientes(false);
                      handleBuscar();
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {mostrarClientes && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {filtroClienteInput && (
                      <div
                        onClick={() => elegirCliente(null)}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 text-gray-500"
                      >
                        {modo === "interno" ? "Quitar selección" : "Todos"}
                      </div>
                    )}
                    {opcionesClienteFiltradas.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Sin resultados
                      </div>
                    ) : (
                      opcionesClienteFiltradas.map((cliente) => (
                        <div
                          key={cliente.clave}
                          onClick={() => elegirCliente(cliente)}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            {cliente.nombre}
                          </div>
                          {cliente.detalle && (
                            <div className="text-xs text-gray-500">
                              {cliente.detalle}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </FilterField>
            )}
            <SuggestField
              label="Número de documento"
              placeholder="Ej: PV-00259993"
              value={filtroNumeroInput}
              onChange={setFiltroNumeroInput}
              suggestions={numeroSugerencias}
              onEnter={handleBuscar}
            />
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

        {resultado}
      </div>
    </div>
  );
}
