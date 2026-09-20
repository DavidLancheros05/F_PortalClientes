"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search, X } from "lucide-react";
import { AuthContext } from "@/context/AuthContext";
import { clientesService } from "@/services/clientes/clientes.service";
import { cachedRequest } from "@/services/core/requestCache";
import {
  clienteArchivoService,
  type ClienteArchivoDocumento,
} from "@/services/cliente-archivo.service";
import { getArchivoPreviewUrl } from "@/lib/documentos-vigencia.util";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { SuggestField } from "@/components/filters/SuggestField";
import { FilterActions } from "@/components/filters/FilterActions";
import { TableContainer } from "@/components/tables/TableContainer";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";

interface ClienteOpcion {
  cli_id: number;
  cli_razon_social: string;
  cli_nro_identificacion: string;
  ejng_id: number | null;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const fecha = typeof value === "string" ? value.split("T")[0] : value;
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-CO");
}

function getEstadoVigencia(doc: ClienteArchivoDocumento) {
  if (!doc.ca_fecha_vencimiento) {
    return {
      estado: "Sin vigencia",
      className: "bg-slate-100 text-slate-600",
    };
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(doc.ca_fecha_vencimiento.split("T")[0]);
  return vencimiento < hoy
    ? { estado: "Vencido", className: "bg-red-100 text-red-800" }
    : { estado: "Vigente", className: "bg-emerald-100 text-emerald-800" };
}

export default function DocumentosClientePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useContext(AuthContext);
  const esCliente =
    String(user?.rol?.nombre || "").toUpperCase().trim() === "CLIENTE";
  const esEjecutivo =
    String(user?.rol?.nombre || "").toUpperCase().trim() === "EJECUTIVO";

  // Selector de cliente para personal interno — mismo patrón ya usado en
  // /solicitudes/nueva y /solicitudes/mis-documentos.
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteOpcion | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [documentos, setDocumentos] = useState<ClienteArchivoDocumento[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  // Búsqueda por nombre de documento — busquedaDocumentoInput es lo que se
  // escribe, busquedaDocumento es lo aplicado (solo cambia al presionar
  // Buscar/Limpiar), mismo patrón que cartera/page.tsx.
  const [busquedaDocumentoInput, setBusquedaDocumentoInput] = useState("");
  const [busquedaDocumento, setBusquedaDocumento] = useState("");

  const clienteId = esCliente ? user?.cliente_id : clienteSeleccionado?.cli_id;
  const debeElegirCliente = !authLoading && !esCliente && !clienteSeleccionado;

  useEffect(() => {
    if (authLoading || esCliente) return;
    cachedRequest("listado-solicitudes-clientes", () =>
      clientesService.getAll(),
    )
      .then((data: any) => {
        const mapeados = Array.isArray(data)
          ? data.map((item: any) => ({
              cli_id: Number(item.cli_id ?? 0),
              cli_razon_social: String(item.cli_razon_social ?? ""),
              cli_nro_identificacion: String(
                item.cli_nro_identificacion ?? "",
              ),
              ejng_id: item.ejng_id != null ? Number(item.ejng_id) : null,
            }))
          : [];
        setClientes(mapeados.filter((c: ClienteOpcion) => c.cli_id > 0));
      })
      .catch((error) => {
        console.error(
          "[DocumentosClientePage] Error cargando clientes",
          error,
        );
      });
  }, [authLoading, esCliente]);

  useEffect(() => {
    if (!mostrarLista) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(event.target as Node)
      ) {
        setMostrarLista(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrarLista]);

  const clientesFiltrados = clientes
    .filter((c) =>
      esEjecutivo && user?.ejng_id ? c.ejng_id === user.ejng_id : true,
    )
    .filter((c) => {
      if (!busqueda) return true;
      const term = busqueda.toLowerCase();
      return (
        c.cli_razon_social.toLowerCase().includes(term) ||
        c.cli_nro_identificacion.toLowerCase().includes(term)
      );
    });

  useEffect(() => {
    if (authLoading) return;
    if (!clienteId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage("");
    setBusquedaDocumentoInput("");
    setBusquedaDocumento("");
    clienteArchivoService
      .obtenerArchivoCliente(clienteId)
      .then((data) => setDocumentos(data))
      .catch((error) => {
        console.error(
          "[DocumentosClientePage] Error cargando archivo del cliente",
          error,
        );
        setErrorMessage("No se pudo cargar el archivo del cliente.");
      })
      .finally(() => setLoading(false));
  }, [authLoading, clienteId]);

  const handleBuscarDocumento = () => {
    setBusquedaDocumento(busquedaDocumentoInput);
  };

  const handleLimpiarBusquedaDocumento = () => {
    setBusquedaDocumentoInput("");
    setBusquedaDocumento("");
  };

  const documentosFiltrados = busquedaDocumento.trim()
    ? documentos.filter((doc) => {
        const termino = busquedaDocumento.trim().toLowerCase();
        return (
          doc.tdo_nombre?.toLowerCase().includes(termino) ||
          doc.ca_nombre_original?.toLowerCase().includes(termino)
        );
      })
    : documentos;

  // Pool crudo de sugerencias para "Documento" — combina los mismos campos
  // que el filtro de arriba usa (tdo_nombre, ca_nombre_original), tomados
  // de `documentos` (antes de aplicar el filtro de texto).
  const documentoSugerencias = useMemo(
    () => [
      ...documentos.map((doc) => doc.tdo_nombre ?? ""),
      ...documentos.map((doc) => doc.ca_nombre_original ?? ""),
    ],
    [documentos],
  );

  if (debeElegirCliente) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <PageHeaderCard
            icon={FileText}
            eyebrow="Solicitudes"
            title="Documentos Cliente"
            subtitle="Elige el cliente cuyo archivo general quieres ver."
            onBack={() => router.back()}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FilterField
                label="Cliente"
                className="relative md:col-span-2"
                ref={contenedorRef}
              >
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={busqueda}
                  onFocus={() => setMostrarLista(true)}
                  onChange={(event) => {
                    setBusqueda(event.target.value);
                    setMostrarLista(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setMostrarLista(true);
                  }}
                  className="w-full h-9 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {mostrarLista && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-64 overflow-y-auto">
                    {clientesFiltrados.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        Sin resultados
                      </div>
                    ) : (
                      clientesFiltrados.map((cliente) => (
                        <div
                          key={cliente.cli_id}
                          onClick={() => {
                            setClienteSeleccionado(cliente);
                            setBusqueda(cliente.cli_razon_social);
                            setMostrarLista(false);
                          }}
                          className="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                        >
                          <div>{cliente.cli_razon_social}</div>
                          {cliente.cli_nro_identificacion && (
                            <div className="text-[11px] text-gray-500">
                              NIT {cliente.cli_nro_identificacion}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </FilterField>

              <FilterActions className="col-span-full">
                <button
                  onClick={() => {
                    setBusqueda("");
                    setMostrarLista(false);
                  }}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-300 bg-white px-3 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </button>
                <button
                  onClick={() => setMostrarLista(true)}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded text-xs font-semibold text-white bg-brand-600 px-3 hover:bg-brand-700 transition-colors"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
              </FilterActions>
            </div>
          </PageHeaderCard>

          <EmptyStateCard
            icon={Search}
            title="Busca y selecciona un cliente para ver su archivo general."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={FileText}
          eyebrow="Solicitudes"
          title="Documentos Cliente"
          subtitle={
            clienteSeleccionado
              ? `Archivo general de ${clienteSeleccionado.cli_razon_social}.`
              : "Tu archivo general de documentos — reutilizable en tus próximas solicitudes."
          }
          onBack={() => {
            if (clienteSeleccionado) {
              setClienteSeleccionado(null);
              setBusqueda("");
            } else if (esCliente) {
              router.push("/solicitudes/cliente");
            } else {
              router.back();
            }
          }}
        >
          {documentos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SuggestField
                label="Documento"
                className="md:col-span-2"
                placeholder="Buscar documento por nombre..."
                value={busquedaDocumentoInput}
                onChange={setBusquedaDocumentoInput}
                suggestions={documentoSugerencias}
                onEnter={handleBuscarDocumento}
              />
              <FilterActions className="col-span-full">
                <button
                  onClick={handleBuscarDocumento}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded text-xs font-semibold text-white bg-brand-600 px-3 hover:bg-brand-700 transition-colors"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                </button>
                <button
                  onClick={handleLimpiarBusquedaDocumento}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 border border-gray-300 bg-white px-3 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </button>
              </FilterActions>
            </div>
          )}
        </PageHeaderCard>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Cargando archivo...
            </div>
            <div className="divide-y divide-gray-100">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-4 py-4 animate-pulse"
                >
                  <div className="h-4 w-4 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-gray-200" />
                    <div className="h-2 w-1/4 rounded bg-gray-100" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        ) : documentos.length === 0 ? (
          <EmptyStateCard
            icon={FileText}
            title={
              clienteSeleccionado
                ? `${clienteSeleccionado.cli_razon_social} todavía no tiene documentos en su archivo general.`
                : "Todavía no tienes documentos en tu archivo general."
            }
            subtitle="Se llenan automáticamente cuando se aprueba una solicitud en Comité de Crédito 2."
          />
        ) : documentosFiltrados.length === 0 ? (
          <EmptyStateCard
            icon={Search}
            title={`Ningún documento coincide con "${busquedaDocumento}".`}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <TableContainer>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <Th>Documento</Th>
                    <Th>Archivo</Th>
                    <Th>Fecha Emisión</Th>
                    <Th>Estado</Th>
                    <Th>Fecha Vencimiento</Th>
                    <Th>Actualizado</Th>
                  </tr>
                </thead>
                <tbody>
                  {documentosFiltrados.map((doc) => {
                    const estado = getEstadoVigencia(doc);
                    const archivoUrl = getArchivoPreviewUrl({
                      sa_ruta_almacenamiento: doc.ca_ruta_almacenamiento,
                    });

                    return (
                      <Tr key={doc.ca_id} className="align-top">
                        <Td className="min-w-[220px]">
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-brand-600 mt-0.5 flex-shrink-0" />
                            <p className="font-medium text-gray-900 break-words">
                              {doc.tdo_nombre}
                            </p>
                          </div>
                        </Td>

                        <Td className="min-w-[160px]">
                          {archivoUrl ? (
                            <a
                              href={archivoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-brand-600 hover:text-brand-700 break-words"
                            >
                              {doc.ca_nombre_original}
                            </a>
                          ) : (
                            <p className="text-xs text-gray-500 break-words">
                              {doc.ca_nombre_original}
                            </p>
                          )}
                        </Td>

                        <Td className="text-xs whitespace-nowrap">
                          {formatDate(doc.ca_fecha_emision)}
                        </Td>

                        <Td>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${estado.className}`}
                          >
                            {estado.estado}
                          </span>
                        </Td>

                        <Td className="text-xs whitespace-nowrap">
                          {formatDate(doc.ca_fecha_vencimiento)}
                        </Td>

                        <Td className="text-xs whitespace-nowrap">
                          {formatDate(doc.ca_created_at)}
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </table>
            </TableContainer>
          </div>
        )}
      </div>
    </div>
  );
}
