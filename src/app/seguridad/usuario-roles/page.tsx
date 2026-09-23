"use client";

import { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import { usuarioRolesService, type UsuarioRol } from "@/services/usuario-roles/usuario-roles.service";
import { rolesService, type Rol } from "@/services/seguridad/roles.service";
import { PageHeaderCard } from "@/components/PageHeaderCard";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { SuggestField } from "@/components/filters/SuggestField";
import { FilterActions } from "@/components/filters/FilterActions";
import { ConfirmModal, ErrorModal } from "@/components/modals";

import { Shield, Users, Loader2, AlertCircle, RefreshCw, ChevronDown, Plus, X, Search } from "lucide-react";

export default function UsuarioRolesPage() {
  const { loading: authLoading } = useContext(AuthContext);

  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<number | null>(null);
  const [usuarioRoles, setUsuarioRoles] = useState<UsuarioRol[]>([]);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{
    usuarioId: number;
    rolId: number;
    rolNombre: string;
  } | null>(null);

  // Filtros — un campo por criterio (nombre, correo, usuario) en vez de un
  // único cuadro combinado, para poder acotar por uno solo sin que los tres
  // compartan el mismo término de búsqueda.
  const [nombreInput, setNombreInput] = useState("");
  const [correoInput, setCorreoInput] = useState("");
  const [usuarioInput, setUsuarioInput] = useState("");
  const [nombreTerm, setNombreTerm] = useState("");
  const [correoTerm, setCorreoTerm] = useState("");
  const [usuarioTerm, setUsuarioTerm] = useState("");
  // Tabla oculta hasta el primer clic en Buscar — mismo patrón que
  // cartera/mis-pqrs/clientes-acceso. "Limpiar" también la oculta de nuevo.
  const [hasSearched, setHasSearched] = useState(false);

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

  const handleBuscar = () => {
    setNombreTerm(nombreInput.trim());
    setCorreoTerm(correoInput.trim());
    setUsuarioTerm(usuarioInput.trim());
    setHasSearched(true);
  };
  const handleLimpiarFiltros = () => {
    setNombreInput("");
    setCorreoInput("");
    setUsuarioInput("");
    setNombreTerm("");
    setCorreoTerm("");
    setUsuarioTerm("");
    setHasSearched(false);
  };

  const usuariosFiltrados = useMemo(() => {
    const nombre = nombreTerm.toLowerCase();
    const correo = correoTerm.toLowerCase();
    const usuarioLogin = usuarioTerm.toLowerCase();
    if (!nombre && !correo && !usuarioLogin) return usuarios;

    return usuarios.filter((usuario) => {
      const cumpleNombre = nombre ? usuario.nombre?.toLowerCase().includes(nombre) : true;
      const cumpleCorreo = correo ? usuario.usuario_correo?.toLowerCase().includes(correo) : true;
      const cumpleUsuario = usuarioLogin ? usuario.usuario_login?.toLowerCase().includes(usuarioLogin) : true;
      return cumpleNombre && cumpleCorreo && cumpleUsuario;
    });
  }, [usuarios, nombreTerm, correoTerm, usuarioTerm]);

  // Pool crudo de sugerencias por campo — SuggestField filtra/deduplica/
  // limita internamente, acá solo se mapea la columna correspondiente.
  const nombreSugerencias = useMemo(() => usuarios.map((u) => u.nombre ?? ""), [usuarios]);
  const correoSugerencias = useMemo(() => usuarios.map((u) => u.usuario_correo ?? ""), [usuarios]);
  const usuarioSugerencias = useMemo(() => usuarios.map((u) => u.usuario_login ?? ""), [usuarios]);

  const handleSelectUsuario = async (usuarioId: number) => {
    try {
      setExpandido(usuarioId === expandido ? null : usuarioId);
      if (usuarioId !== expandido) {
        const rolesData = await usuarioRolesService.getByUsuario(usuarioId);
        setUsuarioSeleccionado(usuarioId);
        setUsuarioRoles(rolesData);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al cargar roles");
    }
  };

  const handleAssignRole = async (usuarioId: number, rolId: number) => {
    try {
      await usuarioRolesService.assignRole(usuarioId, rolId);
      const rolesData = await usuarioRolesService.getByUsuario(usuarioId);
      setUsuarioRoles(rolesData);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al asignar rol");
    }
  };

  const performRemoveRole = async () => {
    if (!confirmRemove) return;
    const { usuarioId, rolId } = confirmRemove;
    try {
      await usuarioRolesService.removeRole(usuarioId, rolId);
      const rolesData = await usuarioRolesService.getByUsuario(usuarioId);
      setUsuarioRoles(rolesData);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al remover rol");
    } finally {
      setConfirmRemove(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-page-from to-page-to p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeaderCard
          icon={Users}
          eyebrow="Seguridad"
          title="Gestionar Rol de Usuarios"
          subtitle="Asigna y administra roles para cada usuario"
          actions={
            <button
              onClick={() => fetchData()}
              className="inline-flex items-center gap-2 rounded-lg bg-white/14 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20">
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          }>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SuggestField
              label="Nombre"
              placeholder="Buscar por nombre..."
              value={nombreInput}
              onChange={setNombreInput}
              suggestions={nombreSugerencias}
              onEnter={handleBuscar}
            />

            <SuggestField
              label="Correo"
              placeholder="Buscar por correo..."
              value={correoInput}
              onChange={setCorreoInput}
              suggestions={correoSugerencias}
              onEnter={handleBuscar}
            />

            <SuggestField
              label="Usuario"
              placeholder="Buscar por usuario..."
              value={usuarioInput}
              onChange={setUsuarioInput}
              suggestions={usuarioSugerencias}
              onEnter={handleBuscar}
            />

            <FilterActions className="col-span-full">
              <button
                onClick={handleLimpiarFiltros}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white">
                <X className="h-4 w-4" />
                Limpiar
              </button>
              <button
                onClick={handleBuscar}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors">
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </FilterActions>
          </div>
        </PageHeaderCard>

        {loading && usuarios.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-2xl shadow-lg">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando usuarios...</p>
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
                  onClick={() => fetchData()}
                  className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        ) : usuarios.length === 0 ? (
          <EmptyStateCard
            icon={Users}
            title="No hay usuarios disponibles"
            subtitle="Crea usuarios primero para asignar roles"
          />
        ) : !hasSearched ? (
          <EmptyStateCard
            icon={Search}
            title="Presiona Buscar para ver los usuarios."
            subtitle="Opcionalmente puedes filtrar antes de buscar."
          />
        ) : usuariosFiltrados.length === 0 ? (
          <EmptyStateCard icon={Users} title="Ningún usuario coincide con los filtros" />
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="divide-y divide-gray-200">
              {usuariosFiltrados.map((usuario) => (
                <div key={usuario.usr_id}>
                  <button
                    onClick={() => handleSelectUsuario(usuario.usr_id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition text-left">
                    <div className="flex items-center flex-1">
                      <div className="h-10 w-10 rounded-lg bg-[#eef3ff] flex items-center justify-center mr-4">
                        <Users className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{usuario.nombre}</div>
                        <div className="text-sm text-gray-500">
                          {usuario.usuario_correo || usuario.usuario_login || "Sin correo registrado"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-[#eef3ff] text-brand-700 rounded-full text-xs font-medium">
                        {usuarioRoles.filter((ur) => ur.usuarioId === usuario.usr_id).length} roles
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
                      <h4 className="text-sm font-semibold text-gray-900 mb-4">Roles asignados:</h4>
                      {usuarioRoles.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Sin roles asignados</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                          {usuarioRoles.map((rol) => (
                            <div
                              key={`${rol.usuarioId}-${rol.rolId}`}
                              className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                              <div className="flex items-center flex-1">
                                <Shield className="w-4 h-4 text-gray-400 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{rol.rolNombre}</div>
                                  <div className="text-xs text-gray-500">{rol.rolCodigo}</div>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  setConfirmRemove({
                                    usuarioId: usuario.usr_id,
                                    rolId: rol.rolId,
                                    rolNombre: rol.rolNombre,
                                  })
                                }
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Remover rol">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Roles Disponibles */}
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Roles disponibles para asignar:</h4>
                        {roles.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">No hay roles disponibles</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {roles
                              .filter((rol) => !usuarioRoles.some((ur) => ur.rolId === rol.rolId))
                              .map((rol) => (
                                <button
                                  key={rol.rolId}
                                  onClick={() => handleAssignRole(usuario.usr_id, rol.rolId)}
                                  className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:bg-[#eef3ff] hover:border-[#b9d0f7] transition">
                                  <div className="flex items-center flex-1 text-left">
                                    <Plus className="w-4 h-4 text-brand-600 mr-2" />
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{rol.rolNombre}</div>
                                      <div className="text-xs text-gray-500">{rol.rolCodigo}</div>
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
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmRemove !== null}
        title="Eliminar rol"
        message={`¿Deseas Eliminar el rol "${confirmRemove?.rolNombre}" a este usuario?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDangerous
        onConfirm={performRemoveRole}
        onCancel={() => setConfirmRemove(null)}
      />

      <ErrorModal isOpen={!!actionError} message={actionError} onAction={() => setActionError("")} />
    </div>
  );
}
