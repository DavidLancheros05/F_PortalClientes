"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Trash2, Edit2, Plus, MapPin, Power } from "lucide-react";
import UsuarioModal from "./usuarioModal";
import UsuarioCentrosModal from "./UsuarioCentrosModal";
import { usuariosService } from "@/services/usuarios/usuarios.service";
import { rolesService } from "@/services/seguridad/roles.service";

interface Rol {
  rol_id: number;
  rol_nombre: string;
}

interface Usuario {
  usr_id: number;
  usuario_nombre: string;
  usuario_email: string;
  usuario_activo: boolean;
  usuario_created_at: string;
  usuario_updated_at?: string;
  rol: {
    rol_id: number;
    rol_nombre: string;
  };
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
      console.log("[UsuariosPage] Usuarios cargados:", data);
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
      console.log("[UsuariosPage] Roles cargados:", data);
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

  const handleDesactivarUsuario = async (usuarioId: number) => {
    if (!confirm("¿Estás seguro de que deseas desactivar este usuario?")) {
      return;
    }

    try {
      await usuariosService.update(usuarioId, { usuario_activo: false });

      setUsuarios((prev) =>
        prev.map((u) =>
          u.usr_id === usuarioId ? { ...u, usuario_activo: false } : u,
        ),
      );
    } catch (err) {
      console.error("Error:", err);
      alert("Error al desactivar usuario");
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
      alert("Error al activar usuario");
    }
  };

  const handleEliminarUsuario = async (usuarioId: number) => {
    if (!confirm("¿Estás seguro de que deseas ELIMINAR este usuario? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      await usuariosService.delete(usuarioId);
      setUsuarios((prev) => prev.filter((u) => u.usr_id !== usuarioId));
    } catch (err) {
      console.error("Error:", err);
      alert("Error al eliminar usuario");
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


  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-600 mt-1">
            Gestiona los usuarios del sistema
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* New Button */}
        <div className="mb-6">
          <button
            onClick={handleNuevoUsuario}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Nuevo Usuario
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando usuarios...</p>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No hay usuarios registrados</p>
          </div>
        ) : (
          /* Tabla de Usuarios */
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
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
                  {usuarios.map((usuario) => (
                    <tr
                      key={usuario.usr_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {usuario.usuario_nombre}
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
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          {usuario.usuario_activo ? (
                            <>
                              <button
                                onClick={() =>
                                  handleDesactivarUsuario(usuario.usr_id)
                                }
                                title="Desactivar"
                                className="text-orange-600 hover:text-orange-800 transition-colors"
                              >
                                <Power size={18} />
                              </button>
                              <button
                                onClick={() =>
                                  handleEliminarUsuario(usuario.usr_id)
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
          usuarioNombre={currentUsuario.usuario_nombre}
          onClose={() => setCentrosModalOpen(false)}
        />
      )}
    </div>
  );
};

export default UsuariosPage;
