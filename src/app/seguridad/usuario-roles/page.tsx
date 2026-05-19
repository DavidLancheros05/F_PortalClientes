"use client";

import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import { usuarioRolesService, type UsuarioRol } from "@/services/usuario-roles/usuario-roles.service";
import { rolesService, type Rol } from "@/services/roles/roles.service";

import {
  Shield,
  Users,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Plus,
  X,
} from "lucide-react";

export default function UsuarioRolesPage() {
  const router = useRouter();
  const { loading: authLoading } = useContext(AuthContext);

  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<number | null>(null);
  const [usuarioRoles, setUsuarioRoles] = useState<UsuarioRol[]>([]);
  const [expandido, setExpandido] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usuariosData, rolesData] = await Promise.all([
        usuarioRolesService.getAllUsuarios(),
        rolesService.getAll(),
      ]);
      setUsuarios(usuariosData);
      setRoles(rolesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  const handleSelectUsuario = async (usuarioId: number) => {
    try {
      setExpandido(usuarioId === expandido ? null : usuarioId);
      if (usuarioId !== expandido) {
        const rolesData = await usuarioRolesService.getByUsuario(usuarioId);
        setUsuarioSeleccionado(usuarioId);
        setUsuarioRoles(rolesData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar roles");
    }
  };

  const handleAssignRole = async (usuarioId: number, rolId: number) => {
    try {
      await usuarioRolesService.assignRole(usuarioId, rolId);
      const rolesData = await usuarioRolesService.getByUsuario(usuarioId);
      setUsuarioRoles(rolesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar rol");
    }
  };

  const handleRemoveRole = async (usuarioId: number, rolId: number) => {
    try {
      await usuarioRolesService.removeRole(usuarioId, rolId);
      const rolesData = await usuarioRolesService.getByUsuario(usuarioId);
      setUsuarioRoles(rolesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al remover rol");
    }
  };

  if (loading && usuarios.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestionar Rol de Usuarios</h1>
              <p className="text-gray-600 mt-2">Asigna roles a usuarios del sistema</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-64 bg-white rounded-2xl shadow-lg">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando usuarios...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestionar Rol de Usuarios</h1>
            </div>
          </div>
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
            <div className="flex">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => fetchData()}
                  className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestionar Rol de Usuarios</h1>
            <p className="text-gray-600 mt-2">Asigna y administra roles para cada usuario</p>
          </div>
          <button
            onClick={() => fetchData()}
            className="flex items-center px-4 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 shadow border border-gray-200 transition"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Actualizar
          </button>
        </div>

        {/* Lista de Usuarios */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {usuarios.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No hay usuarios disponibles
                </h3>
                <p className="text-gray-500">Crea usuarios primero para asignar roles</p>
              </div>
            ) : (
              usuarios.map((usuario) => (
                <div key={usuario.usr_id}>
                  <button
                    onClick={() => handleSelectUsuario(usuario.usr_id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition text-left"
                  >
                    <div className="flex items-center flex-1">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center mr-4">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {usuario.usuario_nombre}
                        </div>
                        <div className="text-sm text-gray-500">
                          {usuario.usuario_correo || `ID: ${usuario.usr_id}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {usuarioRoles.filter(ur => ur.usuarioId === usuario.usr_id).length} roles
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition ${
                          expandido === usuario.usr_id ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Roles del Usuario */}
                  {expandido === usuario.usr_id && (
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4">
                        Roles asignados:
                      </h4>
                      {usuarioRoles.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Sin roles asignados</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                          {usuarioRoles.map((rol) => (
                            <div
                              key={`${rol.usuarioId}-${rol.rolId}`}
                              className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center flex-1">
                                <Shield className="w-4 h-4 text-gray-400 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {rol.rolNombre}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {rol.rolCodigo}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveRole(usuario.usr_id, rol.rolId)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Remover rol"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Roles Disponibles */}
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">
                          Roles disponibles para asignar:
                        </h4>
                        {roles.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">No hay roles disponibles</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {roles
                              .filter(
                                (rol) =>
                                  !usuarioRoles.some((ur) => ur.rolId === rol.rolId)
                              )
                              .map((rol) => (
                                <button
                                  key={rol.rolId}
                                  onClick={() =>
                                    handleAssignRole(usuario.usr_id, rol.rolId)
                                  }
                                  className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition"
                                >
                                  <div className="flex items-center flex-1 text-left">
                                    <Plus className="w-4 h-4 text-blue-600 mr-2" />
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {rol.rolNombre}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {rol.rolCodigo}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
