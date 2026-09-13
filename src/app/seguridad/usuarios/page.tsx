"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Trash2, Edit2, Plus, MapPin, Power, Search, X, Users } from "lucide-react";
import UsuarioModal from "./usuarioModal";
import UsuarioCentrosModal from "./UsuarioCentrosModal";
import {
  usuariosService,
  type Usuario,
} from "@/services/usuarios/usuarios.service";
import { rolesService } from "@/services/seguridad/roles.service";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { FilterField } from "@/components/filters/FilterField";
import { FilterActions } from "@/components/filters/FilterActions";
import { ConfirmModal, ErrorModal } from "@/components/modals";

interface Rol {
  rol_id: number;
  rol_nombre: string;
}

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
  const [rolFiltro, setRolFiltro] = useState<number | "">("");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activo" | "inactivo">(
    "todos",
  );

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
  };

  const handleLimpiarFiltros = () => {
    setSearchInput("");
    setSearchTerm("");
    setRolFiltro("");
    setEstadoFiltro("todos");
  };

  const usuariosFiltrados = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return usuarios.filter((usuario) => {
      const matchSearch =
        !term ||
        usuario.nombre?.toLowerCase().includes(term) ||
        usuario.usuario_email?.toLowerCase().includes(term);

      const matchRol = !rolFiltro || usuario.rol?.rol_id === rolFiltro;

      const matchEstado =
        estadoFiltro === "todos" ||
        (estadoFiltro === "activo" && usuario.usuario_activo) ||
        (estadoFiltro === "inactivo" && !usuario.usuario_activo);

      return matchSearch && matchRol && matchEstado;
    });
  }, [usuarios, searchTerm, rolFiltro, estadoFiltro]);

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FilterField label="Buscar" className="md:col-span-2">
              <input
                type="text"
                placeholder="Nombre o email"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </FilterField>

            <FilterField label="Rol">
              <select
                value={rolFiltro}
                onChange={(e) =>
                  setRolFiltro(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Todos</option>
                {roles.map((rol) => (
                  <option key={rol.rol_id} value={rol.rol_id}>
                    {rol.rol_nombre}
                  </option>
                ))}
              </select>
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Creado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usuariosFiltrados.map((usuario) => (
                    <tr
                      key={usuario.usr_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {usuario.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {usuario.usuario_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {usuario.rol?.rol_nombre || "Desconocido"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {usuario.usuario_activo ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            Activo
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(usuario.usuario_created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-3">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    </div>
  );
};

export default UsuariosPage;
