"use client";

import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
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
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { SuggestField } from "@/components/filters/SuggestField";

export default function AccesoClientesPage() {
  const router = useRouter();
  const { loading: authLoading } = useContext(AuthContext);

  const [clientes, setClientes] = useState<ClienteListResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razonSocialInput, setRazonSocialInput] = useState("");
  const [razonSocial, setRazonSocial] = useState("");

  const [nitInput, setNitInput] = useState("");
  const [nit, setNit] = useState("");

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
        ? cliente.cli_acceso_pc
        : !cliente.cli_acceso_pc);

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

  // Pool crudo de sugerencias por campo — SuggestField filtra/deduplica
  // internamente, acá solo se mapea la columna correspondiente.
  const razonSocialSugerencias = useMemo(
    () => clientes.map((c) => c.cli_razon_social ?? ""),
    [clientes],
  );
  const nitSugerencias = useMemo(
    () => clientes.map((c) => c.cli_nro_identificacion ?? ""),
    [clientes],
  );

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
    const nuevoValor = !clienteSeleccionado.cli_acceso_pc;

    try {
      setGuardando(true);
      await clientesService.update(clienteSeleccionado.cli_id, {
        habilitaAcceso: nuevoValor,
      });
      setClientes((prev) =>
        prev.map((c) =>
          c.cli_id === clienteSeleccionado.cli_id
            ? { ...c, cli_acceso_pc: nuevoValor }
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
            <SuggestField
              label="Razón social"
              placeholder="Buscar razón social..."
              value={razonSocialInput}
              onChange={setRazonSocialInput}
              suggestions={razonSocialSugerencias}
              onEnter={handleBuscar}
            />

            <SuggestField
              label="NIT / Documento"
              placeholder="Buscar NIT o documento..."
              value={nitInput}
              onChange={setNitInput}
              suggestions={nitSugerencias}
              onEnter={handleBuscar}
            />

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
                  <thead className="bg-gray-50">
                    <tr>
                      <Th>Cliente</Th>
                      <Th>Documento</Th>
                      <Th>Correo</Th>
                      <Th>Acceso al portal</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedClientes.map((cliente) => {
                      const habilitado = cliente.cli_acceso_pc;
                      return (
                        <Tr key={cliente.cli_id}>
                          <Td>
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center mr-4">
                                <Building className="w-5 h-5 text-gray-700" />
                              </div>
                              <div className="font-semibold text-gray-900">
                                {cliente.cli_razon_social}
                              </div>
                            </div>
                          </Td>
                          <Td>
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="font-mono text-sm">
                                {cliente.cli_nro_identificacion || "-"}
                              </span>
                            </div>
                          </Td>
                          <Td>
                            <div className="flex items-center">
                              <Mail className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm">
                                {cliente.cli_correo || "-"}
                              </span>
                            </div>
                          </Td>
                          <Td>
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
                          </Td>
                        </Tr>
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
          clienteSeleccionado?.cli_acceso_pc
            ? "Deshabilitar acceso"
            : "Habilitar acceso"
        }
        message={
          clienteSeleccionado?.cli_acceso_pc
            ? `¿Deseas deshabilitar el acceso al portal de "${clienteSeleccionado?.cli_razon_social}"? No podrá iniciar sesión hasta que se vuelva a habilitar.`
            : `¿Deseas habilitar el acceso al portal de "${clienteSeleccionado?.cli_razon_social}"? Si tiene un correo registrado, se le enviará una contraseña de acceso.`
        }
        confirmText={
          clienteSeleccionado?.cli_acceso_pc
            ? "Deshabilitar"
            : "Habilitar"
        }
        isDangerous={Boolean(clienteSeleccionado?.cli_acceso_pc)}
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
