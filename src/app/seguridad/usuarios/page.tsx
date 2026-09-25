"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Trash2, Edit2, Plus, MapPin, Power, Search, X, Users, ShieldOff } from "lucide-react";
import UsuarioModal from "./usuarioModal";
import UsuarioCentrosModal from "./UsuarioCentrosModal";
import {
  usuariosService,
  type Usuario,
} from "@/services/usuarios/usuarios.service";
import { rolesService, type Rol } from "@/services/seguridad/roles.service";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { Th, Td } from "@/components/tables/TableCell";
import { Tr } from "@/components/tables/TableRow";
import { ResultsToolbar } from "@/components/tables/ResultsToolbar";
import { TableContainer } from "@/components/tables/TableContainer";
import { TablePagination } from "@/components/tables/TablePagination";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { SuggestField } from "@/components/filters/SuggestField";
import { ConfirmModal, ErrorModal } from "@/components/modals";
import { formatMinutosRestantes } from "@/lib/bloqueo-login.util";

const UsuariosPage = () => {
  const searchParams = useSearchParams();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [centrosModalOpen, setCentrosModalOpen] = useState(false);
  const [currentUsuario, setCurrentUsuario] = useState<Usuario | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Confirmaciones y errores de acciones (reemplaza confirm()/alert() nativos)
  const [confirmDesactivarId, setConfirmDesactivarId] = useState<number | null>(null);
  const [confirmEliminarId, setConfirmEliminarId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  // Filtros
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  // Autocompletar de nombre de usuario: el input (borrador) alimenta las
  // sugerencias mientras se escribe; el filtro aplicado recién se actualiza
  // al elegir una sugerencia o al pulsar Buscar (mismo patrón que
  // parametrizacion/clientes/acceso).
  const [usuarioLoginInput, setUsuarioLoginInput] = useState("");
  const [usuarioLoginFiltro, setUsuarioLoginFiltro] = useState("");
  const [mostrarUsuarioLista, setMostrarUsuarioLista] = useState(false);
  const usuarioContainerRef = useRef<HTMLDivElement>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activo" | "inactivo">(
    "todos",
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [modalSinDatosOpen, setModalSinDatosOpen] = useState(false);

  // Cargar usuarios y roles al inicio
  useEffect(() => {
    loadUsuarios();
    loadRoles();
  }, []);

  // Abrir modal de crear usuario si viene de /crear-usuarios
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setCurrentUsuario(null);
      setIsNew(true);
      setModalOpen(true);
    }
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const data = await usuariosService.getAll();
      setUsuarios(data);
      setError(null);
    } catch (err) {
      console.error("[UsuariosPage] Error:", err);
      setError("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await rolesService.getAll();
      setRoles(data);
    } catch (err) {
      console.error("[UsuariosPage] Error cargando roles:", err);
    }
  };

  const handleNuevoUsuario = () => {
    setCurrentUsuario(null);
    setIsNew(true);
    setModalOpen(true);
  };

  const handleEditarUsuario = (usuario: Usuario) => {
    setCurrentUsuario(usuario);
    setIsNew(false);
    setModalOpen(true);
  };

  const handleGestionarCentros = (usuario: Usuario) => {
    setCurrentUsuario(usuario);
    setCentrosModalOpen(true);
  };

  const performDesactivar = async (usuarioId: number) => {
    try {
      await usuariosService.update(usuarioId, { usuario_activo: false });
      setUsuarios((prev) =>
        prev.map((u) =>
          u.usr_id === usuarioId ? { ...u, usuario_activo: false } : u,
        ),
      );
    } catch (err) {
      console.error("Error:", err);
      setActionError("Error al desactivar usuario");
    } finally {
      setConfirmDesactivarId(null);
    }
  };

  const handleActivarUsuario = async (usuarioId: number) => {
    try {
      await usuariosService.update(usuarioId, { usuario_activo: true });
      setUsuarios((prev) =>
        prev.map((u) =>
          u.usr_id === usuarioId ? { ...u, usuario_activo: true } : u,
        ),
      );
    } catch (err) {
      console.error("Error:", err);
      setActionError("Error al activar usuario");
    }
  };

  const performEliminar = async (usuarioId: number) => {
    try {
      await usuariosService.delete(usuarioId);
      setUsuarios((prev) => prev.filter((u) => u.usr_id !== usuarioId));
    } catch (err) {
      console.error("Error:", err);
      setActionError("Error al eliminar usuario");
    } finally {
      setConfirmEliminarId(null);
    }
  };

  const handleModalClose = (reloadNeeded: boolean) => {
    setModalOpen(false);
    setCurrentUsuario(null);
    if (reloadNeeded) {
      loadUsuarios();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("es-CO");
    } catch {
      return "-";
    }
  };

  const handleBuscar = () => {
    setSearchTerm(searchInput.trim());
    setUsuarioLoginFiltro(usuarioLoginInput.trim());
    setMostrarUsuarioLista(false);
    setCurrentPage(1);
  };

  const handleLimpiarFiltros = () => {
    setSearchInput("");
    setSearchTerm("");
    setUsuarioLoginInput("");
    setUsuarioLoginFiltro("");
    setEstadoFiltro("todos");
    setCurrentPage(1);
  };

  // Sugerencias de autocompletar — hasta 8 nombres de usuario únicos que
  // coincidan con lo escrito, de los usuarios ya cargados en memoria.
  const usuarioLoginSugerencias = useMemo(() => {
    const term = usuarioLoginInput.trim().toLowerCase();
    if (!term) return [];
    const vistos = new Set<string>();
    const resultado: string[] = [];
    for (const usuario of usuarios) {
      const login = usuario.usuario_login ?? "";
      if (login.toLowerCase().includes(term) && login !== "" && !vistos.has(login)) {
        vistos.add(login);
        resultado.push(login);
        if (resultado.length >= 8) break;
      }
    }
    return resultado;
  }, [usuarios, usuarioLoginInput]);

  // Cierra el desplegable de sugerencias al hacer clic afuera. No basta con
  // onBlur del input: el clic sobre un ítem de la lista dispara blur antes
  // que el click, y el ítem nunca llega a seleccionarse.
  useEffect(() => {
    if (!mostrarUsuarioLista) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        usuarioContainerRef.current &&
        !usuarioContainerRef.current.contains(target)
      ) {
        setMostrarUsuarioLista(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mostrarUsuarioLista]);

  const usuariosFiltrados = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const loginTerm = usuarioLoginFiltro.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const matchSearch =
        !term ||
        usuario.nombre?.toLowerCase().includes(term) ||
        usuario.usuario_email?.toLowerCase().includes(term);

      const matchLogin =
        !loginTerm || usuario.usuario_login?.toLowerCase().includes(loginTerm);

      const matchEstado =
        estadoFiltro === "todos" ||
        (estadoFiltro === "activo" && usuario.usuario_activo) ||
        (estadoFiltro === "inactivo" && !usuario.usuario_activo);

      return matchSearch && matchLogin && matchEstado;
    });
  }, [usuarios, searchTerm, usuarioLoginFiltro, estadoFiltro]);

  // Pool crudo de sugerencias para "Nombre o email" — combina ambas
  // columnas ya que el filtro real (matchSearch) también busca en las dos.
  const searchSugerencias = useMemo(
    () => usuarios.flatMap((u) => [u.nombre ?? "", u.usuario_email ?? ""]),
    [usuarios],
  );

  const usuariosPaginados = useMemo(
    () =>
      usuariosFiltrados.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
      ),
    [usuariosFiltrados, currentPage, itemsPerPage],
  );

  const handleDownloadExcel = async () => {
    if (usuariosFiltrados.length === 0) {
      setModalSinDatosOpen(true);
      return;
    }

    const XLSX = await import("xlsx");

    const datos = usuariosFiltrados.map((usuario) => ({
      Nombre: usuario.nombre,
      Usuario: usuario.usuario_login || "-",
      Email: usuario.usuario_email,
      Estado: usuario.usuario_activo ? "Activo" : "Inactivo",
      Creado: formatDate(usuario.usuario_created_at),
    }));

    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");

    worksheet["!cols"] = [
      { wch: 30 },
      { wch: 18 },
      { wch: 30 },
      { wch: 10 },
      { wch: 14 },
    ];

    XLSX.writeFile(
      workbook,
      `Usuarios_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={Users}
          eyebrow="Seguridad"
          title="Usuarios"
          subtitle="Gestiona los usuarios del sistema"
          actions={
            <button
              onClick={handleNuevoUsuario}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-[#eef3ff]"
            >
              <Plus className="h-4 w-4" />
              Nuevo Usuario
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SuggestField
              label="Nombre o email"
              placeholder="Buscar..."
              value={searchInput}
              onChange={setSearchInput}
              suggestions={searchSugerencias}
              onEnter={handleBuscar}
            />

            <FilterField
              label="Usuario"
              className="relative"
              ref={usuarioContainerRef}
            >
              <input
                type="text"
                placeholder="Nombre de usuario"
                value={usuarioLoginInput}
                onFocus={() => setMostrarUsuarioLista(true)}
                onChange={(e) => {
                  setUsuarioLoginInput(e.target.value);
                  setMostrarUsuarioLista(true);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {mostrarUsuarioLista && usuarioLoginSugerencias.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {usuarioLoginSugerencias.map((login) => (
                    <div
                      key={login}
                      onClick={() => {
                        setUsuarioLoginInput(login);
                        setUsuarioLoginFiltro(login);
                        setMostrarUsuarioLista(false);
                      }}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                    >
                      {login}
                    </div>
                  ))}
                </div>
              )}
            </FilterField>

            <FilterField label="Estado">
              <select
                value={estadoFiltro}
                onChange={(e) =>
                  setEstadoFiltro(
                    e.target.value as "todos" | "activo" | "inactivo",
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="todos">Todos</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </FilterField>

            <FilterActions className="col-span-full">
              <button
                onClick={handleLimpiarFiltros}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
              >
                <X className="h-4 w-4" />
                Limpiar
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

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando usuarios...</p>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <EmptyStateCard
            icon={Users}
            title={
              usuarios.length === 0
                ? "No hay usuarios registrados"
                : "Ningún usuario coincide con los filtros"
            }
          />
        ) : (
          /* Tabla de Usuarios */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <ResultsToolbar
              count={usuariosFiltrados.length}
              label="usuario(s)"
              onExport={handleDownloadExcel}
            />
            <TableContainer>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <Th>Nombre</Th>
                    <Th>Usuario</Th>
                    <Th>Email</Th>
                    <Th>Estado</Th>
                    <Th>Bloqueo</Th>
                    <Th>Creado</Th>
                    <Th sticky align="right">
                      Acciones
                    </Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usuariosPaginados.map((usuario) => (
                    <Tr key={usuario.usr_id}>
                      <Td className="whitespace-nowrap font-medium text-gray-900">
                        {usuario.nombre}
                      </Td>
                      <Td className="whitespace-nowrap font-mono">
                        {usuario.usuario_login || "-"}
                      </Td>
                      <Td className="whitespace-nowrap">
                        {usuario.usuario_email}
                      </Td>
                      <Td className="whitespace-nowrap">
                        {usuario.usuario_activo ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            Activo
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                            Inactivo
                          </span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap">
                        {/* Solo informativo: el bloqueo es temporal y se
                            levanta solo (o con "¿Olvidaste tu contraseña?"),
                            ver Login permisos/bloqueo-temporal-login.md. */}
                        {usuario.usr_bloqueado ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700"
                            title="Bloqueo temporal por intentos fallidos"
                          >
                            <ShieldOff className="w-3.5 h-3.5" />
                            Bloqueado · {formatMinutosRestantes(usuario.usr_bloqueo_min_restantes)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {usuario.usr_intentos_login ?? 0} intentos fallidos
                          </span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap">
                        {formatDate(usuario.usuario_created_at)}
                      </Td>
                      <Td sticky align="right" className="whitespace-nowrap">
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() => handleGestionarCentros(usuario)}
                            title="Gestionar Centros"
                            className="text-green-600 hover:text-green-800 transition-colors"
                          >
                            <MapPin size={18} />
                          </button>
                          <button
                            onClick={() => handleEditarUsuario(usuario)}
                            title="Editar"
                            className="text-brand-600 hover:text-brand-700 transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          {usuario.usuario_activo ? (
                            <>
                              <button
                                onClick={() =>
                                  setConfirmDesactivarId(usuario.usr_id)
                                }
                                title="Desactivar"
                                className="text-orange-600 hover:text-orange-800 transition-colors"
                              >
                                <Power size={18} />
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmEliminarId(usuario.usr_id)
                                }
                                title="Eliminar"
                                className="text-red-600 hover:text-red-800 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() =>
                                handleActivarUsuario(usuario.usr_id)
                              }
                              title="Activar"
                              className="text-green-600 hover:text-green-800 transition-colors"
                            >
                              <Power size={18} />
                            </button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
            <TablePagination
              page={currentPage}
              pageSize={itemsPerPage}
              totalItems={usuariosFiltrados.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Modal de Usuario */}
      {modalOpen && (
        <UsuarioModal
          usuario={currentUsuario}
          isNew={isNew}
          roles={roles}
          onClose={handleModalClose}
        />
      )}

      {/* Modal de Centros */}
      {centrosModalOpen && currentUsuario && (
        <UsuarioCentrosModal
          usuarioId={currentUsuario.usr_id}
          usuarioNombre={currentUsuario.nombre}
          onClose={() => setCentrosModalOpen(false)}
        />
      )}

      <ConfirmModal
        isOpen={confirmDesactivarId !== null}
        title="Desactivar usuario"
        message="¿Estás seguro de que deseas desactivar este usuario?"
        confirmText="Desactivar"
        cancelText="Cancelar"
        isDangerous
        onConfirm={() => {
          if (confirmDesactivarId) performDesactivar(confirmDesactivarId);
        }}
        onCancel={() => setConfirmDesactivarId(null)}
      />

      <ConfirmModal
        isOpen={confirmEliminarId !== null}
        title="Eliminar usuario"
        message="¿Estás seguro de que deseas ELIMINAR este usuario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDangerous
        onConfirm={() => {
          if (confirmEliminarId) performEliminar(confirmEliminarId);
        }}
        onCancel={() => setConfirmEliminarId(null)}
      />

      <ErrorModal
        isOpen={!!actionError}
        message={actionError}
        onAction={() => setActionError("")}
      />

      <ConfirmModal
        isOpen={modalSinDatosOpen}
        title="Sin datos para descargar"
        message="No hay usuarios para descargar con los filtros actuales."
        confirmText="Aceptar"
        isDangerous={false}
        onConfirm={() => setModalSinDatosOpen(false)}
        onCancel={() => setModalSinDatosOpen(false)}
      />
    </div>
  );
};

export default UsuariosPage;
