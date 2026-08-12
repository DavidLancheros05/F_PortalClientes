"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Search } from "lucide-react";
import { AuthContext } from "@/context/AuthContext";
import { clientesService } from "@/services/clientes/clientes.service";
import { cachedRequest } from "@/services/core/requestCache";
import {
  clienteArchivoService,
  type ClienteArchivoDocumento,
} from "@/services/cliente-archivo.service";
import { getArchivoPreviewUrl } from "@/lib/documentos-vigencia.util";

interface ClienteOpcion {
  cli_id: number;
  cli_razon_social: string;
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
    .filter((c) =>
      busqueda
        ? c.cli_razon_social.toLowerCase().includes(busqueda.toLowerCase())
        : true,
    );

  useEffect(() => {
    if (authLoading) return;
    if (!clienteId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage("");
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

  if (debeElegirCliente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-0">
        <div className="max-w-[90%] mx-auto mt-2 px-2">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg m-0">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/solicitudes/cliente")}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-100 hover:text-white transition-colors flex-shrink-0"
                >
                  <ArrowLeft size={16} />
                  Volver
                </button>
                <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                  <FileText className="text-white" size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg md:text-xl font-bold text-white">
                    Documentos Cliente
                  </h1>
                  <p className="text-xs md:text-sm text-blue-100 truncate">
                    Elige el cliente cuyo archivo general quieres ver.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-8 py-10 flex flex-col items-center">
              <div className="w-full max-w-md" ref={contenedorRef}>
                <Search className="h-10 w-10 text-blue-600 mx-auto mb-4" />
                <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">
                  ¿De qué cliente es el archivo?
                </h2>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={busqueda}
                    onFocus={() => setMostrarLista(true)}
                    onChange={(event) => {
                      setBusqueda(event.target.value);
                      setMostrarLista(true);
                    }}
                    className="w-full h-10 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {mostrarLista && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-64 overflow-y-auto">
                      {clientesFiltrados.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
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
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100"
                          >
                            {cliente.cli_razon_social}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50/30 to-gray-50 p-0">
      <div className="max-w-[90%] mx-auto mt-2 px-2">
        <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden m-0">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (clienteSeleccionado) {
                    setClienteSeleccionado(null);
                    setBusqueda("");
                  } else {
                    router.push("/solicitudes/cliente");
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-100 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeft size={16} />
                Volver
              </button>
              <div className="bg-white/20 rounded-full p-2 flex-shrink-0">
                <FileText className="text-white" size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-white">
                  Documentos Cliente
                </h1>
                <p className="text-xs md:text-sm text-blue-100 truncate">
                  {clienteSeleccionado
                    ? `Archivo general de ${clienteSeleccionado.cli_razon_social}.`
                    : "Tu archivo general de documentos — reutilizable en tus próximas solicitudes."}
                </p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            {errorMessage && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {errorMessage}
              </div>
            )}

            {loading ? (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
                {clienteSeleccionado
                  ? `${clienteSeleccionado.cli_razon_social} todavía no tiene documentos en su archivo general — se llenan automáticamente cuando se le aprueba una solicitud en Comité de Crédito 2.`
                  : "Todavía no tienes documentos en tu archivo general — se llenan automáticamente cuando se te aprueba una solicitud en Comité de Crédito 2."}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Documento</th>
                      <th className="px-4 py-3">Archivo</th>
                      <th className="px-4 py-3">Fecha Emisión</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Fecha Vencimiento</th>
                      <th className="px-4 py-3">Actualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentos.map((doc) => {
                      const estado = getEstadoVigencia(doc);
                      const archivoUrl = getArchivoPreviewUrl({
                        sa_ruta_almacenamiento: doc.ca_ruta_almacenamiento,
                      });

                      return (
                        <tr
                          key={doc.ca_id}
                          className="border-b border-gray-100 last:border-0 align-top"
                        >
                          <td className="px-4 py-3 min-w-[220px]">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <p className="font-medium text-gray-900 break-words">
                                {doc.tdo_nombre}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-3 min-w-[160px]">
                            {archivoUrl ? (
                              <a
                                href={archivoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 break-words"
                              >
                                {doc.ca_nombre_original}
                              </a>
                            ) : (
                              <p className="text-xs text-gray-500 break-words">
                                {doc.ca_nombre_original}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                            {formatDate(doc.ca_fecha_emision)}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${estado.className}`}
                            >
                              {estado.estado}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                            {formatDate(doc.ca_fecha_vencimiento)}
                          </td>

                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(doc.ca_created_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
