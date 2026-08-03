"use client";

import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import { clientesService } from "@/services/clientes/clientes.service";
import { ClienteListResponse } from "@/types/api.types";
import {
  ArrowLeft,
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

export default function AccesoClientesPage() {
  const router = useRouter();
  const { loading: authLoading } = useContext(AuthContext);

  const [clientes, setClientes] = useState<ClienteListResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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
    if (searchTerm === "") return true;
    const term = searchTerm.toLowerCase();
    return (
      (cliente.cli_razon_social ?? "").toLowerCase().includes(term) ||
      (cliente.cli_nro_identificacion ?? "").toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClientes.length / itemsPerPage),
  );
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <button
            onClick={() => router.push("/parametrizacion/clientes")}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver al listado de clientes
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Acceso a Clientes
              </h1>
              <p className="text-gray-600 mt-2">
                Habilita o deshabilita el ingreso de cada cliente al portal
              </p>
            </div>

            <button
              onClick={fetchClientes}
              className="flex items-center px-4 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 shadow border border-gray-200 transition"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Actualizar
            </button>
          </div>

          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por razón social o NIT..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-2xl shadow-lg">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando clientes...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
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
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {filteredClientes.length === 0 ? (
              <div className="text-center py-16">
                <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No se encontraron clientes
                </h3>
                <p className="text-gray-500">
                  Intenta con otro término de búsqueda
                </p>
              </div>
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
