"use client";

import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import { clientesService } from "@/services/clientes/clientes.service";
import { ClienteListResponse } from "@/types/api.types";
import {
  Building,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  AlertCircle,
  Search,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { ConfirmModal, ErrorModal, SuccessModal } from "@/components/modals";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";

export default function AccesoClientesPage() {
  const router = useRouter();
  const { loading: authLoading } = useContext(AuthContext);

  const [clientes, setClientes] = useState<ClienteListResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razonSocialInput, setRazonSocialInput] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [mostrarRazonSocialLista, setMostrarRazonSocialLista] = useState(false);
  const razonSocialContainerRef = useRef<HTMLDivElement>(null);

  const [nitInput, setNitInput] = useState("");
  const [nit, setNit] = useState("");
  const [mostrarNitLista, setMostrarNitLista] = useState(false);
  const nitContainerRef = useRef<HTMLDivElement>(null);

  const [estadoAccesoInput, setEstadoAccesoInput] = useState<
    "TODOS" | "HABILITADO" | "DESHABILITADO"
  >("TODOS");
  const [estadoAcceso, setEstadoAcceso] = useState<
    "TODOS" | "HABILITADO" | "DESHABILITADO"
  >("TODOS");
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<ClienteListResponse | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientesService.getAll();
      setClientes(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar los clientes",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchClientes();
  }, [authLoading]);

  const filteredClientes = clientes.filter((cliente) => {
    const matchesRazonSocial =
      razonSocial === "" ||
      (cliente.cli_razon_social ?? "")
        .toLowerCase()
        .includes(razonSocial.toLowerCase());

    const matchesNit =
      nit === "" ||
      (cliente.cli_nro_identificacion ?? "")
        .toLowerCase()
        .includes(nit.toLowerCase());

    const matchesEstadoAcceso =
      estadoAcceso === "TODOS" ||
      (estadoAcceso === "HABILITADO"
        ? cliente.cli_acceso_portal_clientes
        : !cliente.cli_acceso_portal_clientes);

    return matchesRazonSocial && matchesNit && matchesEstadoAcceso;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClientes.length / itemsPerPage),
  );
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Sugerencias de autocompletar — hasta 8 razones sociales / NIT únicos que
  // coincidan con lo escrito, tomados de los clientes ya cargados en memoria
  // (no hace falta pedirle nada al backend).
  const razonSocialSugerencias = useMemo(() => {
    const term = razonSocialInput.trim().toLowerCase();
    if (!term) return [];
    const vistos = new Set<string>();
    const resultado: string[] = [];
    for (const cliente of clientes) {
      const nombre = cliente.cli_razon_social ?? "";
      if (
        nombre.toLowerCase().includes(term) &&
        !vistos.has(nombre) &&
        nombre !== ""
      ) {
        vistos.add(nombre);
        resultado.push(nombre);
        if (resultado.length >= 8) break;
      }
    }
    return resultado;
  }, [clientes, razonSocialInput]);

  const nitSugerencias = useMemo(() => {
    const term = nitInput.trim().toLowerCase();
    if (!term) return [];
    const vistos = new Set<string>();
    const resultado: string[] = [];
    for (const cliente of clientes) {
      const documento = cliente.cli_nro_identificacion ?? "";
      if (
        documento.toLowerCase().includes(term) &&
        !vistos.has(documento) &&
        documento !== ""
      ) {
        vistos.add(documento);
        resultado.push(documento);
        if (resultado.length >= 8) break;
      }
    }
    return resultado;
  }, [clientes, nitInput]);

  // Cierra los desplegables de sugerencias al hacer clic afuera. No basta
  // con onBlur del input: el clic sobre un ítem de la lista dispara blur
  // antes que el click, y el ítem nunca llega a seleccionarse.
  useEffect(() => {
    if (!mostrarRazonSocialLista && !mostrarNitLista) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        mostrarRazonSocialLista &&
        razonSocialContainerRef.current &&
        !razonSocialContainerRef.current.contains(target)
      ) {
        setMostrarRazonSocialLista(false);
      }
      if (
        mostrarNitLista &&
        nitContainerRef.current &&
        !nitContainerRef.current.contains(target)
      ) {
        setMostrarNitLista(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrarRazonSocialLista, mostrarNitLista]);

  const handleBuscar = () => {
    setRazonSocial(razonSocialInput);
    setNit(nitInput);
    setEstadoAcceso(estadoAccesoInput);
    setHasSearched(true);
    setCurrentPage(1);
  };

  const limpiarFiltros = () => {
    setRazonSocialInput("");
    setRazonSocial("");
    setNitInput("");
    setNit("");
    setEstadoAccesoInput("TODOS");
    setEstadoAcceso("TODOS");
    setHasSearched(false);
    setCurrentPage(1);
  };

  const solicitarCambioAcceso = (cliente: ClienteListResponse) => {
    setClienteSeleccionado(cliente);
    setConfirmOpen(true);
  };

  const confirmarCambioAcceso = async () => {
    if (!clienteSeleccionado) return;
    const nuevoValor = !clienteSeleccionado.cli_acceso_portal_clientes;

    try {
      setGuardando(true);
      await clientesService.update(clienteSeleccionado.cli_id, {
        habilitaAcceso: nuevoValor,
      });
      setClientes((prev) =>
        prev.map((c) =>
          c.cli_id === clienteSeleccionado.cli_id
            ? { ...c, cli_acceso_portal_clientes: nuevoValor }
            : c,
        ),
      );
      setConfirmOpen(false);
      setSuccessMessage(
        nuevoValor
          ? `Acceso habilitado para ${clienteSeleccionado.cli_razon_social}.`
          : `Acceso deshabilitado para ${clienteSeleccionado.cli_razon_social}.`,
      );
    } catch (err) {
      setConfirmOpen(false);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el acceso del cliente",
      );
    } finally {
      setGuardando(false);
      setClienteSeleccionado(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeaderCard
          icon={ShieldCheck}
          eyebrow="Parametrización"
          title="Acceso a clientes"
          subtitle="Habilita o deshabilita el ingreso de cada cliente al portal"
          onBack={() => router.push("/parametrizacion/clientes")}
          actions={
            <button
              onClick={fetchClientes}
              className="inline-flex items-center gap-2 rounded-lg bg-white/14 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FilterField
              label="Razón social"
              className="relative"
              ref={razonSocialContainerRef}
            >
              <input
                type="text"
                placeholder="Buscar razón social..."
                value={razonSocialInput}
                onFocus={() => setMostrarRazonSocialLista(true)}
                onChange={(e) => {
                  setRazonSocialInput(e.target.value);
                  setMostrarRazonSocialLista(true);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {mostrarRazonSocialLista && razonSocialSugerencias.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {razonSocialSugerencias.map((nombre) => (
                    <div
                      key={nombre}
                      onClick={() => {
                        setRazonSocialInput(nombre);
                        setMostrarRazonSocialLista(false);
                      }}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                    >
                      {nombre}
                    </div>
                  ))}
                </div>
              )}
            </FilterField>

            <FilterField
              label="NIT / Documento"
              className="relative"
              ref={nitContainerRef}
            >
              <input
                type="text"
                placeholder="Buscar NIT o documento..."
                value={nitInput}
                onFocus={() => setMostrarNitLista(true)}
                onChange={(e) => {
                  setNitInput(e.target.value);
                  setMostrarNitLista(true);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {mostrarNitLista && nitSugerencias.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {nitSugerencias.map((documento) => (
                    <div
                      key={documento}
                      onClick={() => {
                        setNitInput(documento);
                        setMostrarNitLista(false);
                      }}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                    >
                      {documento}
                    </div>
                  ))}
                </div>
              )}
            </FilterField>

            <FilterField label="Estado de acceso" className="md:col-span-2">
              <select
                value={estadoAccesoInput}
                onChange={(e) =>
                  setEstadoAccesoInput(
                    e.target.value as "TODOS" | "HABILITADO" | "DESHABILITADO",
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos</option>
                <option value="HABILITADO">Habilitado</option>
                <option value="DESHABILITADO">Deshabilitado</option>
              </select>
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={limpiarFiltros}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
              >
                Limpiar
              </button>
              <button
                onClick={handleBuscar}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                Buscar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-200 shadow-lg">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-brand-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando clientes...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
            <div className="flex">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={fetchClientes}
                  className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        ) : !hasSearched ? (
          <EmptyStateCard
            icon={Search}
            title="Presiona Buscar para ver los clientes"
            subtitle="Opcionalmente puedes filtrar antes de buscar."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            {filteredClientes.length === 0 ? (
              <EmptyStateCard
                icon={Building}
                title="No se encontraron clientes"
                subtitle="Intenta con otro término de búsqueda"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Documento
                      </th>
                      <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Correo
                      </th>
                      <th className="py-4 px-6 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Acceso al portal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedClientes.map((cliente) => {
                      const habilitado = cliente.cli_acceso_portal_clientes;
                      return (
                        <tr
                          key={cliente.cli_id}
                          className="hover:bg-gray-50 transition"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center mr-4">
                                <Building className="w-5 h-5 text-gray-700" />
                              </div>
                              <div className="font-semibold text-gray-900">
                                {cliente.cli_razon_social}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="font-mono text-sm">
                                {cliente.cli_nro_identificacion || "-"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm">
                                {cliente.cli_correo || "-"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <label className="inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={habilitado}
                                  onChange={() =>
                                    solicitarCambioAcceso(cliente)
                                  }
                                  className="sr-only peer"
                                />
                                <div className="relative w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                              </label>
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                  habilitado
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {habilitado ? (
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                ) : (
                                  <ShieldOff className="w-3.5 h-3.5" />
                                )}
                                {habilitado ? "Habilitado" : "Deshabilitado"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredClientes.length > 0 && (
              <div className="border-t border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600 whitespace-nowrap">
                  <span className="font-semibold">
                    {Math.min(
                      (currentPage - 1) * itemsPerPage + 1,
                      filteredClientes.length,
                    )}
                  </span>
                  {" – "}
                  <span className="font-semibold">
                    {Math.min(currentPage * itemsPerPage, filteredClientes.length)}
                  </span>
                  {" de "}
                  <span className="font-semibold">
                    {filteredClientes.length}
                  </span>
                  {" cliente"}
                  {filteredClientes.length !== 1 ? "s" : ""}
                </div>

                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white transition text-sm font-medium text-gray-700"
                  >
                    ← Anterior
                  </button>
                  <span className="text-sm text-gray-600 px-2">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white transition text-sm font-medium text-gray-700"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title={
          clienteSeleccionado?.cli_acceso_portal_clientes
            ? "Deshabilitar acceso"
            : "Habilitar acceso"
        }
        message={
          clienteSeleccionado?.cli_acceso_portal_clientes
            ? `¿Deseas deshabilitar el acceso al portal de "${clienteSeleccionado?.cli_razon_social}"? No podrá iniciar sesión hasta que se vuelva a habilitar.`
            : `¿Deseas habilitar el acceso al portal de "${clienteSeleccionado?.cli_razon_social}"? Si tiene un correo registrado, se le enviará una contraseña de acceso.`
        }
        confirmText={
          clienteSeleccionado?.cli_acceso_portal_clientes
            ? "Deshabilitar"
            : "Habilitar"
        }
        isDangerous={Boolean(clienteSeleccionado?.cli_acceso_portal_clientes)}
        isLoading={guardando}
        onConfirm={confirmarCambioAcceso}
        onCancel={() => {
          setConfirmOpen(false);
          setClienteSeleccionado(null);
        }}
      />

      <SuccessModal
        isOpen={Boolean(successMessage)}
        title="Acceso actualizado"
        message={successMessage ?? ""}
        onAction={() => setSuccessMessage(null)}
      />

      <ErrorModal
        isOpen={Boolean(errorMessage)}
        message={errorMessage ?? ""}
        onAction={() => setErrorMessage(null)}
      />
    </div>
  );
}
